from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from ..config import (
    ROLE_ACCOUNTING,
    ROLE_ADMIN,
    ROLE_LAB_TECH,
    ROLE_QA,
    ROLE_SENIOR_TECH,
)
from ..database import execute, fetchall, fetchone
from ..services.audit_service import log_event
from ..services.auth_service import require_roles
from ..services.notification_service import notify_role_for_branch, create_notification
router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

ALL_ROLES = (
    ROLE_ADMIN,
    ROLE_LAB_TECH,
    ROLE_SENIOR_TECH,
    ROLE_QA,
    ROLE_ACCOUNTING,
)

REPORT_TYPES = {
    "Incident",
    "Feedback",
    "Feature Request",
    "Workflow Issue",
    "Bug Report",
}

PRIORITIES = {"Low", "Medium", "High", "Critical"}

STATUSES = {"Open", "In Review", "Resolved", "Archived"}


def normalize_text(value):
    return str(value or "").strip()


def require_choice(value, allowed, field_name):
    if value not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be one of: {', '.join(sorted(allowed))}",
        )

    return value


def get_user_branch_id(current_user):
    branch_id = current_user.get("branch_id")

    if branch_id is None or branch_id == "":
        return None

    return int(branch_id)


@router.post("")
def create_feedback_report(
    payload: dict,
    request: Request,
    current_user=Depends(require_roles(*ALL_ROLES)),
):
    report_type = require_choice(
        normalize_text(payload.get("report_type")) or "Feedback",
        REPORT_TYPES,
        "report_type",
    )

    priority = require_choice(
        normalize_text(payload.get("priority")) or "Medium",
        PRIORITIES,
        "priority",
    )

    module = normalize_text(payload.get("module"))
    title = normalize_text(payload.get("title"))
    description = normalize_text(payload.get("description"))
    related_sample_id = normalize_text(payload.get("related_sample_id")) or None

    if not module:
        raise HTTPException(status_code=400, detail="Module is required.")

    if len(title) < 5:
        raise HTTPException(
            status_code=400,
            detail="Title is required and must be at least 5 characters.",
        )

    if len(description) < 10:
        raise HTTPException(
            status_code=400,
            detail="Description is required and must be at least 10 characters.",
        )

    branch_id = get_user_branch_id(current_user)

    report = execute(
        """
        INSERT INTO feedback_reports (
            submitted_by,
            branch_id,
            role,
            report_type,
            priority,
            module,
            related_sample_id,
            title,
            description,
            status
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Open')
        RETURNING
            feedback_id,
            submitted_by,
            branch_id,
            role,
            report_type,
            priority,
            module,
            related_sample_id,
            title,
            description,
            status,
            admin_notes,
            created_at,
            updated_at,
            resolved_at
        """,
        (
            current_user["user_id"],
            branch_id,
            current_user["role"],
            report_type,
            priority,
            module,
            related_sample_id,
            title,
            description,
        ),
        fetch="one",
    )

    notify_role_for_branch(
        role=ROLE_ADMIN,
        branch_id=branch_id,
        sample_id=related_sample_id,
        title="New Feedback Report Submitted",
        message=f"{current_user['role']} submitted a {report_type.lower()} for {module}.",
        action_path="/admin/feedback",
        created_by=current_user["user_id"],
    )

    log_event(
        action="CREATE_FEEDBACK_REPORT",
        endpoint_accessed="/api/feedback",
        user_id=current_user["user_id"],
        sample_id=None,
        new_value={
            "feedback_id": report.get("feedback_id"),
            "report_type": report_type,
            "priority": priority,
            "module": module,
            "related_sample_id": related_sample_id,
            "branch_id": branch_id,
        },
        ip_address=request.client.host if request.client else None,
    )

    return report


@router.get("/mine")
def list_my_feedback_reports(
    current_user=Depends(require_roles(*ALL_ROLES)),
):
    return fetchall(
        """
        SELECT
            feedback_id,
            submitted_by,
            branch_id,
            role,
            report_type,
            priority,
            module,
            related_sample_id,
            title,
            description,
            status,
            admin_notes,
            created_at,
            updated_at,
            resolved_at
        FROM feedback_reports
        WHERE submitted_by = %s
        ORDER BY created_at DESC
        LIMIT 100
        """,
        (current_user["user_id"],),
    )


@router.get("/admin")
def list_all_feedback_reports(
    current_user=Depends(require_roles(ROLE_ADMIN)),
):
    return fetchall(
        """
        SELECT
            fr.feedback_id,
            fr.submitted_by,
            u.full_name AS submitted_by_name,
            u.username AS submitted_by_username,
            fr.branch_id,
            fr.role,
            fr.report_type,
            fr.priority,
            fr.module,
            fr.related_sample_id,
            fr.title,
            fr.description,
            fr.status,
            fr.admin_notes,
            fr.created_at,
            fr.updated_at,
            fr.resolved_at
        FROM feedback_reports fr
        LEFT JOIN users u ON u.user_id = fr.submitted_by
        ORDER BY fr.created_at DESC
        LIMIT 300
        """
    )


@router.patch("/{feedback_id}")
def update_feedback_report(
    feedback_id: int,
    payload: dict,
    request: Request,
    current_user=Depends(require_roles(ROLE_ADMIN)),
):
    existing = fetchone(
        """
        SELECT *
        FROM feedback_reports
        WHERE feedback_id = %s
        """,
        (feedback_id,),
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Feedback report not found.")
    
    admin_branch_id = current_user.get("branch_id")
    feedback_branch_id = existing.get("branch_id")

    if admin_branch_id is not None and admin_branch_id != "":
        if feedback_branch_id is not None and int(feedback_branch_id) != int(admin_branch_id):
            raise HTTPException(
                status_code=403,
                detail="You can view feedback from other branches, but only update feedback from your assigned branch.",
            )

    status = normalize_text(payload.get("status")) or existing.get("status")
    admin_notes = normalize_text(payload.get("admin_notes"))

    require_choice(status, STATUSES, "status")

    resolved_at = existing.get("resolved_at")

    if status == "Resolved" and not resolved_at:
        resolved_at = datetime.now().isoformat()

    if status != "Resolved":
        resolved_at = None

    updated = execute(
        """
        UPDATE feedback_reports
        SET status = %s,
            admin_notes = %s,
            resolved_at = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE feedback_id = %s
        RETURNING
            feedback_id,
            submitted_by,
            branch_id,
            role,
            report_type,
            priority,
            module,
            related_sample_id,
            title,
            description,
            status,
            admin_notes,
            created_at,
            updated_at,
            resolved_at
        """,
        (status, admin_notes or None, resolved_at, feedback_id),
        fetch="one",
    )
    
    if updated.get("submitted_by"):
        create_notification(
            recipient_user_id=updated["submitted_by"],
            recipient_role=updated.get("role"),
            branch_id=updated.get("branch_id"),
            sample_id=updated.get("related_sample_id"),
            notification_type="feedback",
            title="Feedback Report Updated",
            message=(
                f"Your feedback report '{updated.get('title')}' "
                f"was updated to {updated.get('status')}."
            ),
            action_path="/feedback",
            created_by=current_user["user_id"],
    )

    log_event(
        action="UPDATE_FEEDBACK_REPORT",
        endpoint_accessed=f"/api/feedback/{feedback_id}",
        user_id=current_user["user_id"],
        sample_id=None,
        old_value={
            "feedback_id": feedback_id,
            "status": existing.get("status"),
            "admin_notes": existing.get("admin_notes"),
        },
        new_value={
            "feedback_id": feedback_id,
            "status": status,
            "admin_notes": admin_notes,
        },
        ip_address=request.client.host if request.client else None,
    )

    return updated