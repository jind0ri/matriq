from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..config import ROLE_QA
from ..services.notification_service import notify_role_for_branch

from ..config import ROLE_ADMIN, ROLE_SENIOR_TECH, ROLE_QA
from ..services.audit_service import log_event
from ..services.auth_service import require_roles
from ..services.sample_service import complete_review, get_review_by_sample_id, get_sample

router = APIRouter(prefix="/api", tags=["Validation"])


class ValidateRequest(BaseModel):
    sample_id: str
    corrected_label: str
    justification: str
    decision: str  # "approve" or "reject"


VALID_LABELS = {
    "Concrete": "Concrete",
    "Soil Aggregates": "Soil Aggregates",
    "Reinforcing Steel Bar": "Reinforcing Steel Bar",
    "concrete": "Concrete",
    "soil_aggregates": "Soil Aggregates",
    "rsb": "Reinforcing Steel Bar",
}


def is_admin_user(current_user):
    return current_user.get("role") == ROLE_ADMIN


def require_sample_branch_access(current_user, sample):
    if is_admin_user(current_user):
        return

    user_branch_id = current_user.get("branch_id")
    sample_branch_id = sample.get("branch_id")

    if user_branch_id is None or user_branch_id == "":
        raise HTTPException(
            status_code=403,
            detail="Your account has no assigned branch.",
        )

    if sample_branch_id is None or sample_branch_id == "":
        raise HTTPException(
            status_code=403,
            detail="This record has no branch assigned.",
        )

    if int(user_branch_id) != int(sample_branch_id):
        raise HTTPException(
            status_code=403,
            detail="You can only validate records from your assigned branch.",
        )


@router.post("/validate")
def validate(
    payload: ValidateRequest,
    request: Request,
    current_user=Depends(require_roles(ROLE_SENIOR_TECH, ROLE_ADMIN)),
):
    corrected = VALID_LABELS.get(payload.corrected_label)

    if not corrected:
        raise HTTPException(
            status_code=400,
            detail="corrected_label must be one of Concrete, Soil Aggregates, or Reinforcing Steel Bar.",
        )

    if not payload.sample_id or not payload.sample_id.strip():
        raise HTTPException(status_code=400, detail="sample_id is required.")

    if not payload.justification or not payload.justification.strip():
        raise HTTPException(status_code=400, detail="justification is required.")

    if payload.decision not in ["approve", "reject"]:
        raise HTTPException(
            status_code=400,
            detail="decision must be 'approve' or 'reject'",
        )

    review = get_review_by_sample_id(payload.sample_id)

    if not review:
        raise HTTPException(status_code=404, detail="Review case not found.")

    if review["status"] == "Completed":
        raise HTTPException(status_code=400, detail="Review case is already completed.")

    sample_item = get_sample(payload.sample_id)

    if not sample_item:
        raise HTTPException(status_code=404, detail="Sample not found.")

    require_sample_branch_access(current_user, sample_item)

    sample = complete_review(
        sample_id=payload.sample_id,
        corrected_label_db=corrected,
        justification=payload.justification.strip(),
        reviewed_by=current_user["user_id"],
        decision=payload.decision,
    )

    if payload.decision == "approve":
        sample_metadata = sample.get("device_metadata") or {}
        payment = sample_metadata.get("payment") or {}
        payment_status = payment.get("payment_status")

        if payment_status in {"Downpayment Paid", "PO Submitted", "Fully Paid"}:
            notify_role_for_branch(
                role=ROLE_QA,
                branch_id=sample_item.get("branch_id"),
                sample_id=payload.sample_id,
                title="Validated Sample Ready for QA",
                message=f"Sample {payload.sample_id} has been validated by Senior Technician and is ready for QA pre-testing approval.",
                action_path="/technical/workflow",
                created_by=current_user["user_id"],
            )

    log_event(
        action="VALIDATION_APPROVED"
        if payload.decision == "approve"
        else "VALIDATION_REJECTED",
        endpoint_accessed="/api/validate",
        user_id=current_user["user_id"],
        sample_id=payload.sample_id,
        new_value={
            "sample_id": payload.sample_id,
            "final_label": corrected,
            "justification": payload.justification.strip(),
            "decision": payload.decision,
            "branch_id": sample_item.get("branch_id"),
        },
        ip_address=request.client.host if request.client else None,
    )

    return {
        "success": True,
        "message": f"Sample {'approved' if payload.decision == 'approve' else 'rejected'} successfully.",
        "sample_id": payload.sample_id,
        "final_label": corrected,
        "decision": payload.decision,
        "sample_registration": sample,
    }