from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from ..config import (
    ROLE_ACCOUNTING,
    ROLE_ADMIN,
    ROLE_LAB_TECH,
    ROLE_QA,
    ROLE_SENIOR_TECH,
)
from ..database import execute, fetchone
from ..services.auth_service import require_roles

router = APIRouter(prefix="/api/sync", tags=["Synchronization"])

ALL_ROLES = (
    ROLE_ADMIN,
    ROLE_LAB_TECH,
    ROLE_SENIOR_TECH,
    ROLE_QA,
    ROLE_ACCOUNTING,
)


def now_iso():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def get_branch_name(branch_id):
    if int(branch_id or 0) == 1:
        return "Marikina"

    if int(branch_id or 0) == 2:
        return "Pateros"

    return f"Branch {branch_id}" if branch_id else "Unassigned"


@router.get("/status")
def get_sync_status(current_user=Depends(require_roles(*ALL_ROLES))):
    branch_id = current_user.get("branch_id")

    database_reachable = True
    latest_event = None
    message = (
        "Cloud database reachable. Branch records are synchronized through "
        "the central database."
    )

    try:
        latest_event = fetchone(
            """
            SELECT
                sync_event_id,
                branch_id,
                event_type,
                status,
                pending_queue,
                failed_queue,
                conflicts,
                message,
                created_at
            FROM sync_events
            WHERE branch_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (branch_id,),
        )
    except Exception:
        database_reachable = False
        message = "Unable to read synchronization event log."

    pending_queue = (
        int(latest_event.get("pending_queue", 0)) if latest_event else 0
    )
    failed_queue = (
        int(latest_event.get("failed_queue", 0)) if latest_event else 0
    )
    conflicts = int(latest_event.get("conflicts", 0)) if latest_event else 0

    if not database_reachable:
        status = "offline"
    elif failed_queue > 0 or conflicts > 0:
        status = "warning"
    elif pending_queue > 0:
        status = "pending"
    else:
        status = "active"

    checked_at = now_iso()

    if database_reachable:
        try:
            execute(
                """
                INSERT INTO sync_events (
                    branch_id,
                    event_type,
                    status,
                    pending_queue,
                    failed_queue,
                    conflicts,
                    message
                )
                VALUES (%s, 'status_check', %s, %s, %s, %s, %s)
                """,
                (
                    branch_id,
                    status,
                    pending_queue,
                    failed_queue,
                    conflicts,
                    message,
                ),
            )
        except Exception:
            pass

    return {
        "success": True,
        "status": status,
        "branch_id": branch_id,
        "branch_name": get_branch_name(branch_id),
        "database_reachable": database_reachable,
        "pending_queue": pending_queue,
        "failed_queue": failed_queue,
        "conflicts": conflicts,
        "last_sync_at": checked_at,
        "message": message,
    }