import json
import re
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request

from ..config import ROLE_ACCOUNTING, ROLE_ADMIN, ROLE_QA
from ..database import execute, fetchall, fetchone
from ..services.auth_service import require_roles
from ..services.audit_service import log_event
from ..services.notification_service import notify_role_for_branch
from ..services.sample_service import get_sample

router = APIRouter(prefix="/api/accounting", tags=["Accounting"])


PAYMENT_UNPAID = "Unpaid"
PAYMENT_DOWNPAYMENT = "Downpayment Paid"
PAYMENT_PO = "PO Submitted"
PAYMENT_FULLY_PAID = "Fully Paid"
CLIENT_WALK_IN = "Walk-in"
CLIENT_BILLING = "Accredited Billing Client"

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


def make_json_safe(value):
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, dict):
        return {key: make_json_safe(item) for key, item in value.items()}

    if isinstance(value, list):
        return [make_json_safe(item) for item in value]

    return value


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


def normalize_invoice_amount(value):
    amount = normalize_amount(value, "amount")

    if amount is None:
        return 2500

    if amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be greater than zero")

    return amount


def get_payment_stage(status):
    stage_order = {
        PAYMENT_UNPAID: 0,
        PAYMENT_DOWNPAYMENT: 1,
        PAYMENT_PO: 1,
        PAYMENT_FULLY_PAID: 2,
    }

    return stage_order.get(status, 0)


def user_can_access_branch(current_user, branch_id):
    if current_user["role"] == ROLE_ADMIN:
        return True

    return str(current_user.get("branch_id")) == str(branch_id)


def require_branch_access(current_user, branch_id):
    if not user_can_access_branch(current_user, branch_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this branch.",
        )


def extract_user_id(value):
    if value is None or value == "":
        return None

    text = str(value).strip()

    if text.isdigit():
        return text

    match = re.search(r"\bUser\s+(\d+)\b", text, flags=re.IGNORECASE)
    if match:
        return match.group(1)

    return text


def get_user_name_map():
    rows = fetchall(
        """
        SELECT
            user_id,
            full_name,
            username
        FROM users
        """
    )

    names = {}

    for row in rows:
        user_id = row.get("user_id")
        if user_id is None:
            continue

        display_name = row.get("full_name") or row.get("username") or f"User {user_id}"
        names[str(user_id)] = display_name

    return names


def resolve_user_name(user_id, user_names):
    normalized_id = extract_user_id(user_id)

    if normalized_id is None or normalized_id == "":
        return None

    return user_names.get(str(normalized_id), f"User {normalized_id}")


def get_current_user_display_name(current_user):
    user_names = get_user_name_map()
    user_id = current_user.get("user_id")

    resolved_name = resolve_user_name(user_id, user_names)
    if resolved_name:
        return resolved_name

    return (
        current_user.get("full_name")
        or current_user.get("name")
        or current_user.get("username")
        or f"User {user_id}"
    )


def hydrate_payment_user_names(samples):
    user_names = get_user_name_map()

    hydrated = []

    for sample in samples:
        item = dict(sample)
        metadata = item.get("device_metadata") or {}

        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except Exception:
                metadata = {}

        payment = metadata.get("payment") or {}

        updated_by = payment.get("payment_updated_by")
        updated_by_name = resolve_user_name(updated_by, user_names)

        if updated_by_name:
            payment["payment_updated_by_name"] = updated_by_name
            payment["payment_updated_by_display"] = updated_by_name
            payment["payment_updated_by_full_name"] = updated_by_name

        payment_history = payment.get("payment_history") or []

        for history_item in payment_history:
            history_updated_by = history_item.get("updated_by")
            history_updated_by_name = resolve_user_name(history_updated_by, user_names)

            if history_updated_by_name:
                history_item["updated_by_name"] = history_updated_by_name
                history_item["updated_by_display"] = history_updated_by_name
                history_item["updated_by_full_name"] = history_updated_by_name

        payment["payment_history"] = payment_history
        metadata["payment"] = payment
        item["device_metadata"] = metadata

        hydrated.append(item)

    return hydrated


def get_invoice(invoice_id):
    return fetchone(
        """
        SELECT
            invoice_id,
            sample_id,
            branch_id,
            client_name,
            amount,
            status,
            created_by,
            created_at,
            updated_at,
            paid_at,
            notes
        FROM invoices
        WHERE invoice_id = %s
        """,
        (invoice_id,),
    )


def get_sample_for_payment_sync(sample_id):
    return fetchone(
        """
        SELECT
            sample_id,
            branch_id,
            current_state,
            status,
            device_metadata,
            is_immutable
        FROM samples
        WHERE sample_id = %s
        """,
        (sample_id,),
    )


def sync_sample_payment_from_invoice(
    invoice,
    new_invoice_status,
    current_user,
    request,
    notes=None,
):
    sample_id = invoice.get("sample_id")
    sample = get_sample_for_payment_sync(sample_id)

    if not sample:
        raise HTTPException(status_code=404, detail="Linked sample not found")

    require_branch_access(current_user, sample.get("branch_id"))

    metadata = sample.get("device_metadata") or {}

    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except Exception:
            metadata = {}

    payment = metadata.get("payment") or {}

    old_payment_status = payment.get("payment_status") or PAYMENT_UNPAID
    payment_history = payment.get("payment_history") or []

    user_display_name = get_current_user_display_name(current_user)

    if new_invoice_status == "Paid":
        new_payment_status = PAYMENT_FULLY_PAID
        amount_paid = float(invoice.get("amount") or 0)
        balance = 0
        billing_notes = notes or f"Invoice {invoice.get('invoice_id')} marked as paid."
        confirmation_note = f"Invoice {invoice.get('invoice_id')} payment confirmed."

        history_entry = {
            "from_status": old_payment_status,
            "to_status": new_payment_status,
            "amount_paid": amount_paid,
            "balance": balance,
            "billing_notes": billing_notes,
            "confirmation_note": confirmation_note,
            "invoice_id": invoice.get("invoice_id"),
            "updated_by": current_user["user_id"],
            "updated_by_name": user_display_name,
            "updated_by_display": user_display_name,
            "updated_by_full_name": user_display_name,
            "updated_by_role": current_user["role"],
            "updated_at": datetime.now().isoformat(),
        }

        payment_history.append(history_entry)

        payment["payment_status"] = new_payment_status
        payment["amount_paid"] = amount_paid
        payment["balance"] = balance
        payment["billing_notes"] = billing_notes
        payment["confirmation_note"] = confirmation_note
        payment["payment_updated_by"] = current_user["user_id"]
        payment["payment_updated_by_name"] = user_display_name
        payment["payment_updated_by_display"] = user_display_name
        payment["payment_updated_by_full_name"] = user_display_name
        payment["payment_updated_by_role"] = current_user["role"]
        payment["payment_updated_at"] = datetime.now().isoformat()
        payment["payment_history"] = payment_history
        payment["financially_cleared_for_testing"] = True
        payment["financially_cleared_for_release"] = True

    elif new_invoice_status == "Cancelled":
        billing_notes = notes or f"Invoice {invoice.get('invoice_id')} cancelled."

        history_entry = {
            "from_status": old_payment_status,
            "to_status": old_payment_status,
            "amount_paid": payment.get("amount_paid"),
            "balance": payment.get("balance"),
            "billing_notes": billing_notes,
            "confirmation_note": "",
            "invoice_id": invoice.get("invoice_id"),
            "updated_by": current_user["user_id"],
            "updated_by_name": user_display_name,
            "updated_by_display": user_display_name,
            "updated_by_full_name": user_display_name,
            "updated_by_role": current_user["role"],
            "updated_at": datetime.now().isoformat(),
        }

        payment_history.append(history_entry)

        payment["billing_notes"] = billing_notes
        payment["payment_updated_by"] = current_user["user_id"]
        payment["payment_updated_by_name"] = user_display_name
        payment["payment_updated_by_display"] = user_display_name
        payment["payment_updated_by_full_name"] = user_display_name
        payment["payment_updated_by_role"] = current_user["role"]
        payment["payment_updated_at"] = datetime.now().isoformat()
        payment["payment_history"] = payment_history

    else:
        return sample

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
        action="SYNC_SAMPLE_PAYMENT_FROM_INVOICE",
        endpoint_accessed=f"/api/accounting/invoices/{invoice.get('invoice_id')}/status",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        old_value={
            "payment_status": old_payment_status,
        },
        new_value=make_json_safe(
            {
                "invoice_id": invoice.get("invoice_id"),
                "invoice_status": new_invoice_status,
                "payment_status": payment.get("payment_status"),
                "amount_paid": payment.get("amount_paid"),
                "balance": payment.get("balance"),
                "financially_cleared_for_testing": payment.get(
                    "financially_cleared_for_testing"
                ),
                "financially_cleared_for_release": payment.get(
                    "financially_cleared_for_release"
                ),
                "payment_updated_by_name": user_display_name,
            }
        ),
        ip_address=request.client.host if request.client else None,
    )

    return get_sample_for_payment_sync(sample_id)


@router.get("/dashboard")
def get_accounting_dashboard(
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):
    if current_user["role"] == ROLE_ADMIN:
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
    else:
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
            WHERE branch_id::text = %s
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
            """,
            (str(current_user.get("branch_id")),),
        )

    samples = hydrate_payment_user_names(samples)

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
    if current_user["role"] == ROLE_ADMIN:
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
                updated_at,
                created_at
            FROM samples
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
            """,
        )
    else:
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
                updated_at,
                created_at
            FROM samples
            WHERE branch_id::text = %s
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
            """,
            (str(current_user.get("branch_id")),),
        )

    return hydrate_payment_user_names(samples)


@router.get("/invoices")
def get_invoices(
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):
    if current_user["role"] == ROLE_ADMIN:
        return fetchall(
            """
            SELECT
                i.invoice_id,
                i.sample_id,
                i.branch_id,
                i.client_name,
                i.amount,
                i.status,
                i.created_by,
                COALESCE(u.full_name, u.username, 'User ' || i.created_by::text) AS created_by_name,
                i.created_at,
                i.updated_at,
                i.paid_at,
                i.notes,
                s.material_type,
                s.current_state
            FROM invoices i
            LEFT JOIN samples s ON s.sample_id = i.sample_id
            LEFT JOIN users u ON u.user_id = i.created_by
            ORDER BY i.updated_at DESC NULLS LAST, i.created_at DESC NULLS LAST
            """,
        )

    return fetchall(
        """
        SELECT
            i.invoice_id,
            i.sample_id,
            i.branch_id,
            i.client_name,
            i.amount,
            i.status,
            i.created_by,
            COALESCE(u.full_name, u.username, 'User ' || i.created_by::text) AS created_by_name,
            i.created_at,
            i.updated_at,
            i.paid_at,
            i.notes,
            s.material_type,
            s.current_state
        FROM invoices i
        LEFT JOIN samples s ON s.sample_id = i.sample_id
        LEFT JOIN users u ON u.user_id = i.created_by
        WHERE i.branch_id = %s
        ORDER BY i.updated_at DESC NULLS LAST, i.created_at DESC NULLS LAST
        """,
        (current_user.get("branch_id"),),
    )


@router.post("/invoices")
def create_invoice(
    payload: dict,
    request: Request,
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):
    sample_id = payload.get("sample_id")
    amount = normalize_invoice_amount(payload.get("amount"))
    notes = (payload.get("notes") or "").strip() or None

    if is_blank(sample_id):
        raise HTTPException(status_code=400, detail="sample_id is required")

    sample = fetchone(
        """
        SELECT
            sample_id,
            client_name,
            branch_id,
            current_state,
            status
        FROM samples
        WHERE sample_id = %s
        """,
        (sample_id,),
    )

    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    require_branch_access(current_user, sample.get("branch_id"))

    if sample.get("current_state") != "Released" and sample.get("status") != "Released":
        raise HTTPException(
            status_code=400,
            detail="Only released samples can be invoiced.",
        )

    existing_invoice = fetchone(
        """
        SELECT invoice_id
        FROM invoices
        WHERE sample_id = %s
          AND status != %s
        LIMIT 1
        """,
        (sample_id, "Cancelled"),
    )

    if existing_invoice:
        raise HTTPException(
            status_code=400,
            detail="An active invoice already exists for this sample.",
        )

    invoice = execute(
        """
        INSERT INTO invoices (
            sample_id,
            branch_id,
            client_name,
            amount,
            status,
            created_by,
            notes
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING
            invoice_id,
            sample_id,
            branch_id,
            client_name,
            amount,
            status,
            created_by,
            created_at,
            updated_at,
            paid_at,
            notes
        """,
        (
            sample.get("sample_id"),
            sample.get("branch_id"),
            sample.get("client_name"),
            amount,
            "Pending",
            current_user["user_id"],
            notes,
        ),
        fetch="one",
    )

    log_event(
        action="CREATE_INVOICE",
        endpoint_accessed="/api/accounting/invoices",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        new_value=make_json_safe(invoice),
        ip_address=request.client.host if request.client else None,
    )

    return make_json_safe(invoice)


@router.patch("/invoices/{invoice_id}/status")
def update_invoice_status(
    invoice_id: str,
    payload: dict,
    request: Request,
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):
    new_status = payload.get("status")
    notes = (payload.get("notes") or "").strip() or None

    if new_status not in {"Pending", "Paid", "Cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid invoice status")

    invoice = get_invoice(invoice_id)

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    require_branch_access(current_user, invoice.get("branch_id"))

    old_status = invoice.get("status")

    if (
        old_status == "Paid"
        and new_status != "Paid"
        and current_user["role"] != ROLE_ADMIN
    ):
        raise HTTPException(
            status_code=400,
            detail="Paid invoices cannot be downgraded by Accounting Staff. Ask an Administrator to perform a correction.",
        )

    updated_invoice = execute(
        """
        UPDATE invoices
        SET status = %s,
            notes = COALESCE(%s, notes),
            paid_at = CASE
                WHEN %s = 'Paid' THEN CURRENT_TIMESTAMP
                WHEN %s != 'Paid' THEN NULL
                ELSE paid_at
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE invoice_id = %s
        RETURNING
            invoice_id,
            sample_id,
            branch_id,
            client_name,
            amount,
            status,
            created_by,
            created_at,
            updated_at,
            paid_at,
            notes
        """,
        (new_status, notes, new_status, new_status, invoice_id),
        fetch="one",
    )

    if new_status in {"Paid", "Cancelled"}:
        sync_sample_payment_from_invoice(
            invoice=updated_invoice,
            new_invoice_status=new_status,
            current_user=current_user,
            request=request,
            notes=notes,
        )

    log_event(
        action="UPDATE_INVOICE_STATUS",
        endpoint_accessed=f"/api/accounting/invoices/{invoice_id}/status",
        user_id=current_user["user_id"],
        sample_id=invoice.get("sample_id"),
        old_value={"status": old_status},
        new_value=make_json_safe({"status": new_status, "notes": notes}),
        ip_address=request.client.host if request.client else None,
    )

    return make_json_safe(updated_invoice)


@router.patch("/samples/{sample_id}/payment")
def update_sample_payment(
    sample_id: str,
    payload: dict,
    request: Request,
    current_user=Depends(require_roles(ROLE_ACCOUNTING, ROLE_ADMIN)),
):

    item = get_sample(sample_id)

    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")
    require_branch_access(current_user, item.get("branch_id"))

    role = current_user["role"]
    current_state = item.get("current_state")
    is_immutable = item.get("is_immutable")

    metadata = item.get("device_metadata") or {}

    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except Exception:
            metadata = {}

    payment = metadata.get("payment") or {}
    client_type = payment.get("client_type") or payload.get("client_type") or CLIENT_WALK_IN
    po_number = (payload.get("po_number") or payment.get("po_number") or "").strip()
    credit_terms_days = payload.get("credit_terms_days") or payment.get("credit_terms_days")

    old_payment_status = payment.get("payment_status") or PAYMENT_UNPAID
    new_payment_status = payload.get("payment_status")
    
    if new_payment_status == old_payment_status:
        raise HTTPException(
        status_code=400,
        detail="Payment status is already set to this value.",
    )
    amount_paid = normalize_amount(payload.get("amount_paid"), "amount_paid")
    balance = normalize_amount(payload.get("balance"), "balance")
    billing_notes = (payload.get("billing_notes") or "").strip()
    confirmation_note = (payload.get("confirmation_note") or "").strip()

    if new_payment_status not in VALID_PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    # Walk-in cannot use PO
    if client_type == CLIENT_WALK_IN and new_payment_status == PAYMENT_PO:
        raise HTTPException(
            status_code=400,
            detail="Walk-in clients cannot submit a purchase order.",
        )

    # PO validation
    if new_payment_status == PAYMENT_PO:
        if client_type != CLIENT_BILLING:
            raise HTTPException(
                status_code=400,
                detail="Only accredited billing clients can submit a purchase order.",
            )

        if is_blank(po_number):
            raise HTTPException(
                status_code=400,
                detail="Purchase order number is required for PO Submitted status.",
            )

        try:
            credit_terms_days = int(credit_terms_days)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Credit terms must be a valid number of days.",
            )

        if credit_terms_days <= 0:
            raise HTTPException(
                status_code=400,
                detail="Credit terms must be greater than zero.",
            )

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

    if (
        old_payment_status == PAYMENT_FULLY_PAID
        and new_payment_status != PAYMENT_FULLY_PAID
        and role != ROLE_ADMIN
    ):
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

    if new_payment_status == PAYMENT_FULLY_PAID and is_blank(confirmation_note):
        raise HTTPException(
            status_code=400,
            detail="Confirmation note is required when marking a sample as Fully Paid.",
        )

    if new_payment_status in INITIAL_PAYMENT_STATUSES and is_blank(billing_notes):
        billing_notes = f"Payment status updated to {new_payment_status}."

    user_display_name = get_current_user_display_name(current_user)

    payment_history = payment.get("payment_history") or []

    history_entry = {
        "from_status": old_payment_status,
        "to_status": new_payment_status,
        "amount_paid": amount_paid,
        "balance": balance,
        "billing_notes": billing_notes,
        "confirmation_note": confirmation_note,
        "updated_by": current_user["user_id"],
        "updated_by_name": user_display_name,
        "updated_by_display": user_display_name,
        "updated_by_full_name": user_display_name,
        "updated_by_role": role,
        "updated_at": datetime.now().isoformat(),
    }

    payment_history.append(history_entry)

    payment["client_type"] = client_type
    payment["po_number"] = po_number if client_type == CLIENT_BILLING else ""
    payment["credit_terms_days"] = (
        credit_terms_days
        if client_type == CLIENT_BILLING and new_payment_status == PAYMENT_PO
        else None
    )
    payment["payment_status"] = new_payment_status
    payment["payment_updated_by"] = current_user["user_id"]
    payment["payment_updated_by_name"] = user_display_name
    payment["payment_updated_by_display"] = user_display_name
    payment["payment_updated_by_full_name"] = user_display_name
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

    payment["financially_cleared_for_testing"] = (
        new_payment_status in {PAYMENT_DOWNPAYMENT, PAYMENT_FULLY_PAID}
        or (
            client_type == CLIENT_BILLING
            and new_payment_status == PAYMENT_PO
            and not is_blank(po_number)
        )
    )

    payment["financially_cleared_for_release"] = (
        new_payment_status == PAYMENT_FULLY_PAID
        or (
            client_type == CLIENT_BILLING
            and new_payment_status == PAYMENT_PO
            and not is_blank(po_number)
            and credit_terms_days
        )
    )

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
    
    updated_sample = get_sample(sample_id)
    updated_metadata = updated_sample.get("device_metadata") or {}
    updated_test_data = updated_metadata.get("test_data")

    if new_payment_status in INITIAL_PAYMENT_STATUSES and current_state == "Registered":
        notify_role_for_branch(
            role=ROLE_QA,
            branch_id=item.get("branch_id"),
            sample_id=sample_id,
            title="Sample Ready for QA Pre-Testing",
            message=f"Sample {sample_id} has payment clearance for testing and is ready for QA pre-testing approval.",
            action_path="/technical/workflow",
            created_by=current_user["user_id"],
        )

    if (
        new_payment_status == PAYMENT_FULLY_PAID
        and current_state == "For Review"
        and updated_test_data
    ):
        notify_role_for_branch(
            role=ROLE_QA,
            branch_id=item.get("branch_id"),
            sample_id=sample_id,
            title="Sample Fully Paid for Release",
            message=f"Sample {sample_id} is now fully paid and ready for QA release review.",
            action_path="/technical/workflow",
            created_by=current_user["user_id"],
        )

    log_event(
        action="UPDATE_PAYMENT_STATUS",
        endpoint_accessed=f"/api/accounting/samples/{sample_id}/payment",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        old_value={
            "payment_status": old_payment_status,
        },
        new_value=make_json_safe(
            {
                "payment_status": new_payment_status,
                "amount_paid": amount_paid,
                "balance": balance,
                "billing_notes": billing_notes,
                "confirmation_note": confirmation_note,
                "financially_cleared_for_testing": payment[
                    "financially_cleared_for_testing"
                ],
                "financially_cleared_for_release": payment[
                    "financially_cleared_for_release"
                ],
                "payment_updated_by_name": user_display_name,
            }
        ),
        ip_address=request.client.host if request.client else None,
    )

    updated_item = get_sample(sample_id)
    hydrated = hydrate_payment_user_names([updated_item])
    return hydrated[0] if hydrated else updated_item