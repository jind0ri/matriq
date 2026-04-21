from typing import List, Dict

from .sample_service import get_sample_service
from .audit_service import log_audit_event


VALIDATION_LOGS: List[Dict] = []


def validate_sample_service(
    sample_id: int,
    final_material_type: str,
    justification: str,
    approved: bool,
    current_user: dict,
):
    sample = get_sample_service(sample_id)
    if not sample:
        raise ValueError("Sample not found")

    if sample.lifecycle_state not in ["Registered", "In Test", "For Review"]:
        raise ValueError("Sample cannot be validated in its current lifecycle state")

    if not justification or len(justification.strip()) < 5:
        raise ValueError("Justification is required and must be at least 5 characters")

    previous_material_type = sample.material_type

    sample.material_type = final_material_type
    sample.decision_source = "HUMAN"
    sample.validation_justification = justification
    sample.validated_by = current_user["full_name"]
    sample.validated_role = current_user["role"]
    sample.validation_approved = approved

    if not approved:
        sample.lifecycle_state = "Registered"

    validation_log = {
        "sample_id": sample.sample_id,
        "previous_material_type": previous_material_type,
        "final_material_type": final_material_type,
        "decision_source": "HUMAN",
        "justification": justification,
        "validated_by": current_user["full_name"],
        "validated_role": current_user["role"],
        "lifecycle_state": sample.lifecycle_state,
    }
    VALIDATION_LOGS.append(validation_log)

    log_audit_event(
        event_type="VALIDATION",
        performed_by=current_user["full_name"],
        role=current_user["role"],
        action="Validated sample classification",
        status="SUCCESS",
        details=f"sample_id={sample.sample_id}; justification={justification}",
    )

    return validation_log