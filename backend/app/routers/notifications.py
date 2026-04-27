from fastapi import APIRouter, Depends, HTTPException

from ..database import execute, fetchall, fetchone
from ..services.auth_service import current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
def list_notifications(current_user=Depends(current_user)):
    return fetchall(
        """
        SELECT
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
        FROM notifications
        WHERE recipient_user_id = %s
        ORDER BY created_at DESC
        LIMIT 30
        """,
        (current_user["user_id"],),
    )


@router.get("/unread")
def list_unread_notifications(current_user=Depends(current_user)):
    return fetchall(
        """
        SELECT
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
        FROM notifications
        WHERE recipient_user_id = %s
          AND is_read = FALSE
        ORDER BY created_at DESC
        LIMIT 10
        """,
        (current_user["user_id"],),
    )


@router.get("/unread-count")
def unread_notification_count(current_user=Depends(current_user)):
    row = fetchone(
        """
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE recipient_user_id = %s
          AND is_read = FALSE
        """,
        (current_user["user_id"],),
    )

    return {"count": int(row["count"] if row else 0)}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user=Depends(current_user),
):
    existing = fetchone(
        """
        SELECT notification_id
        FROM notifications
        WHERE notification_id = %s
          AND recipient_user_id = %s
        """,
        (notification_id, current_user["user_id"]),
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Notification not found")

    return execute(
        """
        UPDATE notifications
        SET is_read = TRUE,
            read_at = CURRENT_TIMESTAMP
        WHERE notification_id = %s
          AND recipient_user_id = %s
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
        (notification_id, current_user["user_id"]),
        fetch="one",
    )


@router.patch("/read-all")
def mark_all_notifications_read(current_user=Depends(current_user)):
    execute(
        """
        UPDATE notifications
        SET is_read = TRUE,
            read_at = CURRENT_TIMESTAMP
        WHERE recipient_user_id = %s
          AND is_read = FALSE
        """,
        (current_user["user_id"],),
    )

    return {"success": True}