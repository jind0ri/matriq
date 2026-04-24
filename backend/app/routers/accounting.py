from fastapi import APIRouter, Depends

from ..config import ROLE_ACCOUNTING, ROLE_ADMIN
from ..database import fetchall
from ..services.auth_service import require_roles

router = APIRouter(prefix="/api/accounting", tags=["Accounting"])


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
            created_at,
            updated_at
        FROM samples
        WHERE status IN (%s, %s)
           OR current_state IN (%s, %s)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        """,
        ("Released", "Archived", "Released", "Archived"),
    )

    released = [
        s for s in samples
        if s.get("status") == "Released" or s.get("current_state") == "Released"
    ]

    archived = [
        s for s in samples
        if s.get("status") == "Archived" or s.get("current_state") == "Archived"
    ]

    base_fee = 2500
    outstanding_balance = len(released) * base_fee

    return {
        "released_samples": len(released),
        "paid_samples": len(archived),
        "pending_invoices": len(released),
        "outstanding_balance": outstanding_balance,
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
            updated_at
        FROM samples
        WHERE status = %s
           OR current_state = %s
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        """,
        ("Released", "Released"),
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
        is_paid = row.get("status") == "Archived" or row.get("current_state") == "Archived"

        invoices.append(
            {
                "invoice_id": f"INV-{index:04d}",
                "sample_id": row.get("sample_id"),
                "client_name": row.get("client_name"),
                "material_type": row.get("material_type"),
                "amount": 2500,
                "status": "Paid" if is_paid else "Pending",
                "branch_id": row.get("branch_id"),
                "updated_at": row.get("updated_at"),
            }
        )

    return invoices