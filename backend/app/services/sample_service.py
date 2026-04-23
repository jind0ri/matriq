import uuid
from typing import Optional

from sqlalchemy.orm import Session

from ..models import Sample


def generate_sample_code(db: Session) -> str:
    count = db.query(Sample).count() + 1
    return f"BRS-2026-{count:03d}"


def create_sample_service(db: Session, sample_data, current_user: dict):
    existing = (
        db.query(Sample)
        .filter(
            Sample.client_name == sample_data.client_name,
            Sample.project_id == sample_data.project_id,
            Sample.material_type == sample_data.material_type,
        )
        .first()
    )
    if existing:
        raise ValueError("Duplicate sample")

    # ✅ AI values (coming from frontend later)
    ai_label = getattr(sample_data, "ai_predicted_label", None)
    ai_conf = getattr(sample_data, "ai_confidence_score", None)
    model_version = getattr(sample_data, "model_version", None)

    # ✅ THRESHOLD (you can tweak this later)
    CONFIDENCE_THRESHOLD = 80

    # ✅ DEFAULT VALUES
    status = "Registered"
    current_state = "Registered"
    decision = "Pending"

    # ✅ AUTO FOR REVIEW LOGIC
    if ai_conf is not None:
        if ai_conf < CONFIDENCE_THRESHOLD:
            status = "For Review"
            current_state = "For Review"
            decision = "Pending Review"

    new_sample = Sample(
        id=str(uuid.uuid4()),
        sample_id=generate_sample_code(db),
        client_name=sample_data.client_name,
        project_id=sample_data.project_id,
        branch_id=str(current_user["branch_id"]) if current_user.get("branch_id") is not None else None,
        registered_by_user_id=str(current_user["user_id"]),
        registered_by_role=current_user["role"],
        material_type=sample_data.material_type,

        # ✅ AI fields
        ai_predicted_label=ai_label,
        ai_confidence_score=ai_conf,
        model_version=model_version,

        # ✅ lifecycle (dynamic now)
        status=status,
        decision=decision,
        current_state=current_state,

        notes=sample_data.notes,
        registered_by=current_user["user_id"],
        is_immutable=False,
    )

    db.add(new_sample)
    db.commit()
    db.refresh(new_sample)
    return new_sample


def get_samples_service(db: Session):
    return db.query(Sample).order_by(Sample.created_at.desc()).all()


def get_sample_service(db: Session, sample_id: str) -> Optional[Sample]:
    return db.query(Sample).filter(Sample.sample_id == sample_id).first()


def update_sample_service(db: Session, sample_id: str, sample_data):
    sample = get_sample_service(db, sample_id)
    if not sample:
        raise ValueError("Sample not found")

    if sample.is_immutable:
        raise ValueError("Sample is immutable and cannot be updated")

    sample.material_type = sample_data.material_type
    sample.client_name = sample_data.client_name
    sample.project_id = sample_data.project_id
    sample.notes = sample_data.notes

    db.commit()
    db.refresh(sample)
    return sample


def delete_sample_service(db: Session, sample_id: str):
    sample = get_sample_service(db, sample_id)
    if not sample:
        raise ValueError("Sample not found")

    db.delete(sample)
    db.commit()


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


def update_sample_status_service(
    db: Session,
    sample_id: str,
    new_state: str,
    user_role: str,
):
    sample = get_sample_service(db, sample_id)
    if not sample:
        raise ValueError("Sample not found")

    current_state = sample.current_state

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

    sample.current_state = new_state
    sample.status = new_state

    if new_state == "Released":
        sample.decision = "Approved"
        sample.is_immutable = True
    elif new_state == "Archived":
        sample.decision = "Archived"
        sample.is_immutable = True
    elif new_state == "In Test":
        sample.decision = "In Progress"
        sample.is_immutable = False
    elif new_state == "For Review":
        sample.decision = "Pending Review"
        sample.is_immutable = False
    else:
        sample.decision = "Pending"
        sample.is_immutable = False

    db.commit()
    db.refresh(sample)
    return sample