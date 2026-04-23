from sqlalchemy.orm import Session

from ..models import Sample
from .audit_service import log_audit_event


def validate_sample_service(
    db: Session,
    sample_id: str,
    final_material_type: str,
    justification: str,
    approved: bool,
    current_user: dict,
):
    sample = db.query(Sample).filter(Sample.sample_id == sample_id).first()
    if not sample:
        raise ValueError("Sample not found")

    if sample.current_state != "For Review":
        raise ValueError("Sample cannot be validated in its current lifecycle state")

    if not justification or len(justification.strip()) < 5:
        raise ValueError("Justification is required and must be at least 5 characters")

    previous_material_type = sample.material_type
    cleaned_justification = justification.strip()

    sample.material_type = final_material_type
    sample.notes = cleaned_justification

    if approved:
        sample.current_state = "Released"
        sample.status = "Released"
        sample.decision = "Approved"
        sample.is_immutable = True
    else:
        sample.current_state = "In Testing"
        sample.status = "In Testing"
        sample.decision = "Rejected"
        sample.is_immutable = False

    db.commit()
    db.refresh(sample)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="Validated sample classification",
        endpoint=f"/api/validate/{sample_id}",
        new_value=(
            f"material: {previous_material_type} -> {final_material_type}; "
            f"state: {sample.current_state}; "
            f"decision: {sample.decision}"
        ),
    )

    return {
        "sample_id": sample.sample_id,
        "previous_material_type": previous_material_type,
        "final_material_type": final_material_type,
        "decision_source": "HUMAN",
        "justification": cleaned_justification,
        "validated_by": current_user["full_name"],
        "validated_role": current_user["role"],
        "lifecycle_state": sample.current_state,
    }