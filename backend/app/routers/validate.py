from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..config import ROLE_SENIOR_TECH
from ..services.audit_service import log_event
from ..services.auth_service import require_roles
from ..services.sample_service import complete_review, get_review_by_sample_id

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


@router.post("/validate")
def validate(
    payload: ValidateRequest,
    request: Request,
    current_user=Depends(require_roles(ROLE_SENIOR_TECH)),
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
        raise HTTPException(status_code=400, detail="decision must be 'approve' or 'reject'")

    review = get_review_by_sample_id(payload.sample_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review case not found.")

    if review["status"] == "Completed":
        raise HTTPException(status_code=400, detail="Review case is already completed.")

    sample = complete_review(
        sample_id=payload.sample_id,
        corrected_label_db=corrected,
        justification=payload.justification.strip(),
        reviewed_by=current_user["user_id"],
        decision=payload.decision,
    )

    log_event(
        action="VALIDATION_APPROVED" if payload.decision == "approve" else "VALIDATION_REJECTED",        endpoint_accessed="/api/validate",
        user_id=current_user["user_id"],
        sample_id=None,
        new_value={
            "sample_id": payload.sample_id,
            "final_label": corrected,
            "justification": payload.justification.strip(),
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