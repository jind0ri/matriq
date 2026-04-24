from __future__ import annotations
import json
from typing import Any
from uuid import uuid4
from datetime import datetime

from ..database import execute, fetchall, fetchone


def _json_or_text(value: Any):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return value


def _parse_json_field(item: dict, field: str):
    if item.get(field) and isinstance(item[field], str):
        try:
            item[field] = json.loads(item[field])
        except Exception:
            pass


def _make_id() -> str:
    return str(uuid4())


def _make_sample_id(branch_id: int) -> str:
    branch_code_map = {
        1: "MAR",  # Marikina
        2: "PAT",  # Pateros
    }

    prefix = branch_code_map.get(int(branch_id), "BR")
    year = datetime.now().year

    row = fetchone(
        """
        SELECT sample_id
        FROM samples
        WHERE sample_id LIKE %s
        ORDER BY sample_id DESC
        LIMIT 1
        """,
        (f"{prefix}-{year}-%",),
    )

    if row and row.get("sample_id"):
        try:
            last_number = int(row["sample_id"].split("-")[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1

    return f"{prefix}-{year}-{next_number:03d}"


def _sample_projection_query() -> str:
    return """
        SELECT
            s.sample_id,
            s.client_name,
            COALESCE(s.project_reference, s.project_id) AS project_reference,
            s.material_type,
            s.status AS current_state,
            s.branch_id,
            COALESCE(s.registered_by::text, s.registered_by_user_id) AS registered_by,
            s.image_path,
            s.is_immutable,
            s.intake_timestamp,
            s.ai_predicted_label,
            s.ai_confidence_score,
            s.decision,
            s.device_metadata,
            s.created_at AS inference_timestamp,
            s.model_version
        FROM samples s
    """


def find_active_duplicate_sample(
    *,
    client_name: str,
    project_reference: str,
    material_type: str,
    branch_id: int,
):
    return fetchone(
        """
        SELECT sample_id, status AS current_state
        FROM samples
        WHERE lower(client_name) = lower(%s)
          AND lower(COALESCE(project_reference, project_id)) = lower(%s)
          AND lower(material_type) = lower(%s)
          AND branch_id = %s
          AND status NOT IN ('Released', 'Archived')
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (
            client_name.strip(),
            project_reference.strip(),
            material_type.strip(),
            str(branch_id),
        ),
    )


def create_sample_only(
    *,
    client_name: str,
    project_reference: str,
    material_type: str,
    current_state: str,
    branch_id: int,
    registered_by: int,
    registered_by_role: str,
    image_path: str,
    is_immutable: bool,
    ai_predicted_label: str,
    confidence_score: float,
    decision: str,
    model_version: str | None,
    device_metadata: dict,
    original_filename: str | None,
    image_sha256: str | None,
    notes: str | None = None,
):
    return execute(
        """
        INSERT INTO samples (
            id,
            sample_id,
            client_name,
            project_id,
            branch_id,
            registered_by_user_id,
            registered_by_role,
            material_type,
            ai_predicted_label,
            ai_confidence_score,
            model_version,
            status,
            decision,
            device_metadata,
            original_filename,
            image_sha256,
            notes,
            created_at,
            updated_at,
            project_reference,
            current_state,
            registered_by,
            is_immutable,
            intake_timestamp,
            image_path
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s
        )
        RETURNING
            sample_id,
            client_name,
            COALESCE(project_reference, project_id) AS project_reference,
            material_type,
            status AS current_state,
            branch_id,
            COALESCE(registered_by::text, registered_by_user_id) AS registered_by,
            image_path,
            is_immutable,
            intake_timestamp,
            ai_predicted_label,
            ai_confidence_score,
            decision,
            device_metadata,
            created_at AS inference_timestamp,
            model_version
        """,
        (
            _make_id(),
            _make_sample_id(branch_id),
            client_name,
            project_reference,
            str(branch_id),
            str(registered_by),
            registered_by_role,
            material_type,
            ai_predicted_label,
            confidence_score,
            model_version,
            current_state,
            decision,
            _json_or_text(device_metadata),
            original_filename,
            image_sha256,
            notes,
            project_reference,
            current_state,
            registered_by,
            is_immutable,
            image_path,
        ),
        fetch="one",
    )


def attach_inference(
    *,
    sample_id: str,
    ai_predicted_label_db: str,
    confidence_score: float,
    decision_db: str,
    version_id: int | None,
    device_metadata: dict,
):
    execute(
        """
        UPDATE samples
        SET
            ai_predicted_label = %s,
            ai_confidence_score = %s,
            decision = %s,
            device_metadata = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (
            ai_predicted_label_db,
            confidence_score,
            decision_db,
            _json_or_text(device_metadata),
            sample_id,
        ),
    )


def create_sample_with_inference(
    *,
    client_name: str,
    project_reference: str,
    predicted_label_db: str,
    current_state: str,
    branch_id: int,
    registered_by: int,
    registered_by_role: str,
    image_path: str,
    is_immutable: bool,
    ai_predicted_label_db: str,
    confidence_score: float,
    decision_db: str,
    model_version: str | None,
    version_id: int | None,
    device_metadata: dict,
    original_filename: str | None,
    image_sha256: str | None,
    user_id_for_audit: int,
    original_state: str | None = None,
):
    duplicate = find_active_duplicate_sample(
        client_name=client_name,
        project_reference=project_reference,
        material_type=predicted_label_db,
        branch_id=branch_id,
    )

    if duplicate:
        raise ValueError(
            f"Duplicate active sample already exists: {duplicate['sample_id']}"
        )

    return create_sample_only(
        client_name=client_name,
        project_reference=project_reference,
        material_type=predicted_label_db,
        current_state=current_state,
        branch_id=branch_id,
        registered_by=registered_by,
        registered_by_role=registered_by_role,
        image_path=image_path,
        is_immutable=is_immutable,
        ai_predicted_label=ai_predicted_label_db,
        confidence_score=confidence_score,
        decision=decision_db,
        model_version=model_version,
        device_metadata=device_metadata,
        original_filename=original_filename,
        image_sha256=image_sha256,
    )


def list_samples() -> list[dict]:
    rows = fetchall(
        _sample_projection_query()
        + " ORDER BY s.intake_timestamp DESC NULLS LAST, s.created_at DESC"
    )
    for row in rows:
        _parse_json_field(row, "device_metadata")
    return rows


def get_sample(sample_id: str) -> dict | None:
    row = fetchone(_sample_projection_query() + " WHERE s.sample_id = %s", (sample_id,))
    if row:
        _parse_json_field(row, "device_metadata")
    return row


def list_reviews() -> list[dict]:
    rows = fetchall(
        """
        SELECT
            s.sample_id,
            s.client_name,
            COALESCE(s.project_reference, s.project_id) AS project_reference,
            s.branch_id,
            s.status AS current_state,
            s.ai_predicted_label AS predicted_label,
            s.ai_confidence_score AS confidence_score,
            s.decision,
            s.device_metadata,
            s.model_version,
            s.material_type,
            s.notes,
            s.registered_by_user_id,
            s.registered_by_role,
            s.created_at,
            s.image_path
        FROM samples s
        WHERE s.decision = %s
        ORDER BY s.created_at DESC
        """,
        ("Manual-Review",),
    )

    output = []

    for row in rows:
        _parse_json_field(row, "device_metadata")
        confidence = float(row["confidence_score"] or 0)
        status = "Mandatory Override" if confidence < 0.70 else "Pending Review"

        output.append(
            {
                "review_case_id": f"SAMPLE-{row['sample_id']}",
                "sample_id": row["sample_id"],
                "client_name": row["client_name"],
                "project_id": row.get("project_reference"),
                "branch_id": row["branch_id"],
                "predicted_label": row["predicted_label"],
                "confidence_score": confidence,
                "decision": "MANDATORY_OVERRIDE"
                if confidence < 0.70
                else "MANUAL_REVIEW_QUEUE",
                "status": status,
                "out_of_scope": confidence < 0.75,
                "model_version": row.get("model_version"),
                "device_metadata": row.get("device_metadata") or {},
                "corrected_label": None,
                "justification": row.get("notes"),
                "reviewed_by": None,
                "image_path": row.get("image_path"),
            }
        )

    return output


def get_review_by_sample_id(sample_id: str) -> dict | None:
    return next((item for item in list_reviews() if item["sample_id"] == sample_id), None)


def complete_review(
    *,
    sample_id: str,
    corrected_label_db: str,
    justification: str,
    reviewed_by: int,
    decision: str,
):
    sample_before = get_sample(sample_id)

    if not sample_before:
        raise ValueError("Sample not found.")
    
    if decision not in ["approve", "reject"]:
        raise ValueError("Invalid decision")
    
    if decision == "approve":
        new_status = "Registered"
        new_state = "Registered"
        is_immutable = False
        new_decision = "Approved"
    else:
        new_status = "In Testing"
        new_state = "In Testing"
        is_immutable = False
        new_decision = "Rejected"

    execute(
        """
        UPDATE samples
        SET
            material_type = %s,
            status = %s,
            current_state = %s,
            is_immutable = %s,
            notes = %s,
            decision = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (
            corrected_label_db,
            new_status,
            new_state,
            is_immutable,
            justification,
            new_decision,
            sample_id,
        ),
    )

    return get_sample(sample_id)


def dashboard() -> dict:
    samples = list_samples()
    reviews = list_reviews()
    pending_manual = [x for x in reviews if x["status"] == "Pending Review"]
    mandatory = [x for x in reviews if x["status"] == "Mandatory Override"]
    completed = [x for x in reviews if x["status"] == "Completed"]

    return {
        "registered": len(samples),
        "manual_review": len(pending_manual),
        "mandatory_override": len(mandatory),
        "completed_reviews": len(completed),
        "recent_samples": samples[:5],
    }