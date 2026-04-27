from __future__ import annotations

from typing import Optional

from ..database import execute, fetchall


def get_active_users_by_role_and_branch(role: str, branch_id):
    if branch_id is None or branch_id == "":
        return []

    return fetchall(
        """
        SELECT
            user_id,
            username,
            full_name,
            role,
            branch_id,
            is_active
        FROM users
        WHERE role = %s
          AND CAST(branch_id AS TEXT) = %s
          AND COALESCE(is_active, TRUE) = TRUE
        """,
        (role, str(branch_id)),
    )


def create_notification(
    recipient_user_id: int,
    title: str,
    message: str,
    notification_type: str = "workflow",
    recipient_role: Optional[str] = None,
    branch_id: Optional[int] = None,
    sample_id: Optional[str] = None,
    action_path: Optional[str] = None,
    created_by: Optional[int] = None,
):
    return execute(
        """
        INSERT INTO notifications (
            recipient_user_id,
            recipient_role,
            branch_id,
            sample_id,
            notification_type,
            title,
            message,
            action_path,
            created_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING
            notification_id,
            recipient_user_id,
            recipient_role,
            branch_id,
            sample_id,
            notification_type,
            title,
            message,
            action_path,
            is_read,
            created_by,
            created_at,
            read_at
        """,
        (
            recipient_user_id,
            recipient_role,
            branch_id,
            sample_id,
            notification_type,
            title,
            message,
            action_path,
            created_by,
        ),
        fetch="one",
    )


def notify_role_for_branch(
    role: str,
    branch_id,
    title: str,
    message: str,
    sample_id: Optional[str] = None,
    action_path: Optional[str] = None,
    notification_type: str = "workflow",
    created_by: Optional[int] = None,
):
    recipients = get_active_users_by_role_and_branch(role, branch_id)
    created = []

    for user in recipients:
        notification = create_notification(
            recipient_user_id=user["user_id"],
            recipient_role=role,
            branch_id=branch_id,
            sample_id=sample_id,
            notification_type=notification_type,
            title=title,
            message=message,
            action_path=action_path,
            created_by=created_by,
        )

        if notification:
            created.append(notification)

    return created