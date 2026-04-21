from typing import List, Dict

from .sample_service import get_sample_service


VALIDATION_LOGS: List[Dict] = []
AUDIT_LOGS: List[Dict] = []


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

    # Final human-reviewed classification
    sample.material_type = final_material_type

    # Temporary runtime metadata until DB schema is expanded
    sample.decision_source = "HUMAN"
    sample.validation_justification = justification
    sample.validated_by = current_user["full_name"]
    sample.validated_role = current_user["role"]
    sample.validation_approved = approved

    # Optional lifecycle effect:
    # if approved stays in current state unless you want to push forward automatically
    # if not approved, bring it back to Registered
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

    audit_log = {
        "event_type": "VALIDATION",
        "sample_id": sample.sample_id,
        "performed_by": current_user["full_name"],
        "role": current_user["role"],
        "action": "Validated sample classification",
        "justification": justification,
    }
    AUDIT_LOGS.append(audit_log)

    return validation_log