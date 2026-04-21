from ..models import Sample
from typing import List

# Temporary in-memory DB placeholder
SAMPLES_DB: List[Sample] = []


def create_sample_service(sample_data):
    for s in SAMPLES_DB:
        if (
            s.client_name == sample_data.client_name
            and s.material_type == sample_data.material_type
        ):
            raise ValueError("Duplicate sample")

    sample_id = len(SAMPLES_DB) + 1
    new_sample = Sample(
        sample_id=sample_id,
        material_type=sample_data.material_type,
        client_name=sample_data.client_name,
        lifecycle_state="Registered",
    )
    SAMPLES_DB.append(new_sample)
    return new_sample


def get_samples_service():
    return SAMPLES_DB


def get_sample_service(sample_id: int):
    for s in SAMPLES_DB:
        if s.sample_id == sample_id:
            return s
    return None


def update_sample_service(sample_id: int, sample_data):
    sample = get_sample_service(sample_id)
    if not sample:
        raise ValueError("Sample not found")

    sample.material_type = sample_data.material_type
    sample.client_name = sample_data.client_name
    return sample


def delete_sample_service(sample_id: int):
    global SAMPLES_DB
    SAMPLES_DB = [s for s in SAMPLES_DB if s.sample_id != sample_id]


def can_transition(role: str, current_state: str, new_state: str) -> bool:
    if role == "Administrator":
        return True

    allowed_transitions = {
        "Lab Technician": {
            "Registered": ["In Test"],
            "In Test": ["For Review"],
        },
        "QA Engineer": {
            "For Review": ["Released", "In Test"],
        },
    }

    role_rules = allowed_transitions.get(role, {})
    next_states = role_rules.get(current_state, [])
    return new_state in next_states


def update_sample_status_service(sample_id: int, new_state: str, user_role: str):
    sample = get_sample_service(sample_id)
    if not sample:
        raise ValueError("Sample not found")

    current_state = sample.lifecycle_state

    valid_states = [
        "Registered",
        "In Test",
        "For Review",
        "Released",
        "Archived",
    ]

    if new_state not in valid_states:
        raise ValueError("Invalid lifecycle state")

    if current_state == "Released" and new_state != "Archived" and user_role != "Administrator":
        raise ValueError("Released samples are immutable unless archived or overridden by admin")

    if current_state == "Archived" and user_role != "Administrator":
        raise ValueError("Archived samples cannot be modified")

    if not can_transition(user_role, current_state, new_state):
        raise ValueError(
            f"Role '{user_role}' cannot transition sample from '{current_state}' to '{new_state}'"
        )

    sample.lifecycle_state = new_state

    if new_state in ["Released", "Archived"]:
        sample.is_immutable = True

    return sample