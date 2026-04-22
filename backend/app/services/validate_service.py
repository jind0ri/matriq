from sqlalchemy.orm import Session

from ..models import Sample, ManualValidation
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

    if sample.current_state not in ["Registered", "In Test", "For Review"]:
        raise ValueError("Sample cannot be validated in its current lifecycle state")

    if not justification or len(justification.strip()) < 5:
        raise ValueError("Justification is required and must be at least 5 characters")

    previous_material_type = sample.material_type

    # update sample
    sample.material_type = final_material_type

    if not approved:
        sample.current_state = "Registered"

    # save validation record
    validation = ManualValidation(
        sample_id=sample.id,
        original_ai_label=previous_material_type,
        corrected_label=final_material_type,
        justification=justification,
        reviewed_by=current_user["user_id"],
    )

    db.add(validation)

    # update decision source logic
    sample.decision = "Approved" if approved else "Rejected"

    db.commit()
    db.refresh(sample)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="Validated sample classification",
        endpoint="/api/validate",
        new_value=f"{previous_material_type} -> {final_material_type}",
    )

    return {
        "sample_id": sample.sample_id,
        "previous_material_type": previous_material_type,
        "final_material_type": final_material_type,
        "decision_source": "HUMAN",
        "justification": justification,
        "validated_by": current_user["full_name"],
        "validated_role": current_user["role"],
        "lifecycle_state": sample.current_state,
    }