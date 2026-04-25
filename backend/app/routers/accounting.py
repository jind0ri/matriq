import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from ..config import ROLE_ACCOUNTING, ROLE_ADMIN
from ..database import fetchall
from ..services.auth_service import require_roles
from ..services.audit_service import log_event

router = APIRouter(prefix="/api/accounting", tags=["Accounting"])


PAYMENT_UNPAID = "Unpaid"
PAYMENT_DOWNPAYMENT = "Downpayment Paid"
PAYMENT_PO = "PO Submitted"
PAYMENT_FULLY_PAID = "Fully Paid"

VALID_PAYMENT_STATUSES = {
    PAYMENT_UNPAID,
    PAYMENT_DOWNPAYMENT,
    PAYMENT_PO,
    PAYMENT_FULLY_PAID,
}

INITIAL_PAYMENT_STATUSES = {
    PAYMENT_DOWNPAYMENT,
    PAYMENT_PO,
    PAYMENT_FULLY_PAID,
}


def is_blank(value):
    return value is None or str(value).strip() == ""


def normalize_amount(value, field_name):
    if value is None or value == "":
        return None

    try:
        number = float(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"{field_name} must be numeric")

    if number < 0:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot be negative")

    return number


def get_payment_stage(status):
    stage_order = {
        PAYMENT_UNPAID: 0,
        PAYMENT_DOWNPAYMENT: 1,
        PAYMENT_PO: 1,
        PAYMENT_FULLY_PAID: 2,
    }

    return stage_order.get(status, 0)


@router.get("/dashboard")
def get_accounting_dashboard(
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):
    samples = fetchall(
        """
        SELECT
            sample_id,
            client_name,
            material_type,
            status,
            current_state,
            branch_id,
            decision,
            device_metadata,
            created_at,
            updated_at
        FROM samples
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        """,
    )

    unpaid = 0
    downpayment = 0
    po_submitted = 0
    fully_paid = 0
    financially_cleared_for_release = 0

    for sample in samples:
        metadata = sample.get("device_metadata") or {}
        payment = metadata.get("payment") or {}
        payment_status = payment.get("payment_status") or PAYMENT_UNPAID

        if payment_status == PAYMENT_UNPAID:
          unpaid += 1
        elif payment_status == PAYMENT_DOWNPAYMENT:
          downpayment += 1
        elif payment_status == PAYMENT_PO:
          po_submitted += 1
        elif payment_status == PAYMENT_FULLY_PAID:
          fully_paid += 1

        if (
            sample.get("current_state") == "For Review"
            and payment_status == PAYMENT_FULLY_PAID
            and metadata.get("test_data")
        ):
            financially_cleared_for_release += 1

    return {
        "unpaid_samples": unpaid,
        "downpayment_samples": downpayment,
        "po_submitted_samples": po_submitted,
        "fully_paid_samples": fully_paid,
        "financially_cleared_for_release": financially_cleared_for_release,
        "total_samples": len(samples),
        "recent_samples": samples[:10],
    }


@router.get("/billing")
def get_billing_queue(
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):
    return fetchall(
        """
        SELECT
            sample_id,
            client_name,
            material_type,
            status,
            current_state,
            branch_id,
            decision,
            device_metadata,
            updated_at,
            created_at
        FROM samples
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        """,
    )


@router.get("/invoices")
def get_invoices(
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):
    rows = fetchall(
        """
        SELECT
            sample_id,
            client_name,
            material_type,
            status,
            current_state,
            branch_id,
            device_metadata,
            updated_at
        FROM samples
        WHERE status IN (%s, %s)
           OR current_state IN (%s, %s)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        """,
        ("Released", "Archived", "Released", "Archived"),
    )

    invoices = []

    for index, row in enumerate(rows, start=1):
        metadata = row.get("device_metadata") or {}
        payment = metadata.get("payment") or {}
        payment_status = payment.get("payment_status") or PAYMENT_UNPAID

        is_paid = payment_status == PAYMENT_FULLY_PAID
        amount = payment.get("amount_paid") or 2500

        invoices.append(
            {
                "invoice_id": f"INV-{index:04d}",
                "sample_id": row.get("sample_id"),
                "client_name": row.get("client_name"),
                "material_type": row.get("material_type"),
                "amount": amount,
                "status": "Paid" if is_paid else "Pending",
                "payment_status": payment_status,
                "branch_id": row.get("branch_id"),
                "updated_at": row.get("updated_at"),
            }
        )

    return invoices


@router.patch("/samples/{sample_id}/payment")
def update_sample_payment(
    sample_id: str,
    payload: dict,
    request: Request,
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):
    from ..database import execute
    from ..services.sample_service import get_sample

    item = get_sample(sample_id)

    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    role = current_user["role"]
    current_state = item.get("current_state")
    is_immutable = item.get("is_immutable")

    metadata = item.get("device_metadata") or {}
    payment = metadata.get("payment") or {}

    old_payment_status = payment.get("payment_status") or PAYMENT_UNPAID
    new_payment_status = payload.get("payment_status")

    amount_paid = normalize_amount(payload.get("amount_paid"), "amount_paid")
    balance = normalize_amount(payload.get("balance"), "balance")
    billing_notes = (payload.get("billing_notes") or "").strip()
    confirmation_note = (payload.get("confirmation_note") or "").strip()

    if new_payment_status not in VALID_PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    if is_immutable and role != ROLE_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Released or archived records are finalized. Only an Administrator can correct payment metadata.",
        )

    if current_state in {"Released", "Archived"} and role != ROLE_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Payment updates after report release require Administrator correction.",
        )

    if old_payment_status == PAYMENT_FULLY_PAID and new_payment_status != PAYMENT_FULLY_PAID and role != ROLE_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Fully Paid records cannot be downgraded by Accounting Staff. Ask an Administrator to perform a correction.",
        )

    old_stage = get_payment_stage(old_payment_status)
    new_stage = get_payment_stage(new_payment_status)

    if new_stage < old_stage and role != ROLE_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Accounting Staff cannot downgrade payment status. Ask an Administrator to perform a correction.",
        )

    if new_payment_status == PAYMENT_FULLY_PAID and len(confirmation_note) < 8:
        raise HTTPException(
            status_code=400,
            detail="Confirmation note is required when marking a sample as Fully Paid.",
        )

    if new_payment_status in INITIAL_PAYMENT_STATUSES and is_blank(billing_notes):
        billing_notes = f"Payment status updated to {new_payment_status}."

    payment_history = payment.get("payment_history") or []

    history_entry = {
        "from_status": old_payment_status,
        "to_status": new_payment_status,
        "amount_paid": amount_paid,
        "balance": balance,
        "billing_notes": billing_notes,
        "confirmation_note": confirmation_note,
        "updated_by": current_user["user_id"],
        "updated_by_role": role,
        "updated_at": datetime.now().isoformat(),
    }

    payment_history.append(history_entry)

    payment["payment_status"] = new_payment_status
    payment["payment_updated_by"] = current_user["user_id"]
    payment["payment_updated_by_role"] = role
    payment["payment_updated_at"] = datetime.now().isoformat()
    payment["payment_history"] = payment_history

    if amount_paid is not None:
        payment["amount_paid"] = amount_paid

    if balance is not None:
        payment["balance"] = balance

    if billing_notes:
        payment["billing_notes"] = billing_notes

    if confirmation_note:
        payment["confirmation_note"] = confirmation_note

    payment["financially_cleared_for_testing"] = new_payment_status in INITIAL_PAYMENT_STATUSES
    payment["financially_cleared_for_release"] = new_payment_status == PAYMENT_FULLY_PAID

    metadata["payment"] = payment

    execute(
        """
        UPDATE samples
        SET device_metadata = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (json.dumps(metadata), sample_id),
    )

    log_event(
        action="UPDATE_PAYMENT_STATUS",
        endpoint_accessed=f"/api/accounting/samples/{sample_id}/payment",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        old_value={
            "payment_status": old_payment_status,
        },
        new_value={
            "payment_status": new_payment_status,
            "amount_paid": amount_paid,
            "balance": balance,
            "billing_notes": billing_notes,
            "confirmation_note": confirmation_note,
            "financially_cleared_for_testing": payment["financially_cleared_for_testing"],
            "financially_cleared_for_release": payment["financially_cleared_for_release"],
        },
        ip_address=request.client.host if request.client else None,
    )

    return get_sample(sample_id)