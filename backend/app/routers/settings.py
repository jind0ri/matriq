from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import ROLE_ADMIN
from ..database import execute, fetchall, fetchone
from ..services.audit_service import log_event
from ..services.auth_service import require_roles

router = APIRouter(prefix="/api/admin", tags=["Admin Settings"])


DEFAULT_SETTINGS = [
    {
        "setting_key": "allow_all_branch_monitoring",
        "label": "Allow All-Branch Read-Only Monitoring",
        "category": "Branch Workflow",
        "value": "true",
        "description": "Users may view all branches for monitoring, while actions remain locked to assigned branch.",
    },
    {
        "setting_key": "lock_non_admin_actions_to_branch",
        "label": "Lock Non-Admin Actions to Assigned Branch",
        "category": "Branch Workflow",
        "value": "true",
        "description": "Non-admin users can only create or update records in their assigned branch.",
    },
    {
        "setting_key": "require_qa_review_before_testing",
        "label": "Require QA Review Before Testing",
        "category": "Laboratory Workflow",
        "value": "true",
        "description": "Samples must pass QA pre-testing review before laboratory testing begins.",
    },
    {
        "setting_key": "require_full_payment_before_release",
        "label": "Require Full Payment Before Release",
        "category": "Laboratory Workflow",
        "value": "true",
        "description": "Official report release requires full payment unless corrected by an administrator.",
    },
    {
        "setting_key": "deactivate_instead_of_delete",
        "label": "Deactivate Instead of Delete Users",
        "category": "Account Rules",
        "value": "true",
        "description": "Accounts are deactivated instead of permanently deleted to preserve historical attribution.",
    },
    {
        "setting_key": "block_inactive_login",
        "label": "Block Inactive Account Login",
        "category": "Account Rules",
        "value": "true",
        "description": "Inactive users cannot log in or continue using protected functions.",
    },
    {
        "setting_key": "preserve_inactive_user_history",
        "label": "Preserve Inactive User History",
        "category": "Account Rules",
        "value": "true",
        "description": "Inactive accounts remain linked to previous sample, validation, payment, and audit records.",
    },
    {
        "setting_key": "audit_logging_enabled",
        "label": "Audit Logging Enabled",
        "category": "Audit Rules",
        "value": "true",
        "description": "System actions are logged for traceability and accountability.",
    },
    {
        "setting_key": "audit_records_read_only",
        "label": "Audit Records Read-Only",
        "category": "Audit Rules",
        "value": "true",
        "description": "Audit records are reviewed by admins but not edited through the normal interface.",
    },
]

ROLE_ROWS = [
    {
        "role": "Administrator",
        "access": "Full system access",
        "branch_rule": "Can manage all branches",
        "notes": "User management, audit review, settings oversight",
    },
    {
        "role": "Lab Technician",
        "access": "Technical workflow",
        "branch_rule": "Actions locked to assigned branch",
        "notes": "Sample monitoring and test data entry",
    },
    {
        "role": "Senior Technician",
        "access": "Technical workflow with review visibility",
        "branch_rule": "Actions locked to assigned branch",
        "notes": "Can monitor assigned branch and view synced records",
    },
    {
        "role": "QA Engineer",
        "access": "Quality review workflow",
        "branch_rule": "Actions locked to assigned branch",
        "notes": "QA validation, review, and release workflow",
    },
    {
        "role": "Accounting Staff",
        "access": "Billing and payment workflow",
        "branch_rule": "Actions locked to assigned branch",
        "notes": "Payment updates, billing queue, and invoice records",
    },
]


class SettingUpdateRequest(BaseModel):
    setting_key: str
    value: str | bool


class BranchUpdateRequest(BaseModel):
    branch_name: str | None = None
    location: str | None = None
    status: str | None = None
    sync_mode: str | None = None


def normalize_bool_text(value: str | bool) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"

    text = str(value).strip().lower()

    if text in {"true", "1", "yes", "on", "active", "enabled"}:
        return "true"

    if text in {"false", "0", "no", "off", "inactive", "disabled"}:
        return "false"

    raise HTTPException(status_code=400, detail="Setting value must be true or false.")


def bool_from_text(value: Any) -> bool:
    return str(value).strip().lower() in {
        "true",
        "1",
        "yes",
        "on",
        "active",
        "enabled",
    }


def ensure_settings_tables():
    execute(
        """
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            category TEXT NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    execute(
        """
        INSERT INTO branches (branch_id, branch_name, location, status)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (branch_id) DO NOTHING
        """,
        (1, "Matest Marikina", "Marikina", "Active"),
    )

    execute(
        """
        INSERT INTO branches (branch_id, branch_name, location, status)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (branch_id) DO NOTHING
        """,
        (2, "Matest Pateros", "Pateros", "Active"),
    )

    for item in DEFAULT_SETTINGS:
        execute(
            """
            INSERT INTO system_settings (
                setting_key,
                label,
                category,
                value,
                description
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (setting_key) DO NOTHING
            """,
            (
                item["setting_key"],
                item["label"],
                item["category"],
                item["value"],
                item["description"],
            ),
        )

    for branch_id in (1, 2):
        sync_key = f"branch_{branch_id}_sync_mode"

        execute(
            """
            INSERT INTO system_settings (
                setting_key,
                label,
                category,
                value,
                description
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (setting_key) DO NOTHING
            """,
            (
                sync_key,
                f"Branch {branch_id} Sync Mode",
                "Branch Configuration",
                "Cloud-synced",
                "Controls the displayed sync mode for the branch.",
            ),
        )


def get_setting(setting_key: str):
    return fetchone(
        """
        SELECT
            setting_key,
            label,
            category,
            value,
            description,
            updated_at
        FROM system_settings
        WHERE setting_key = %s
        """,
        (setting_key,),
    )


def format_setting(row: dict[str, Any]):
    return {
        "setting_key": row.get("setting_key"),
        "label": row.get("label"),
        "category": row.get("category"),
        "value": row.get("value"),
        "enabled": bool_from_text(row.get("value")),
        "description": row.get("description"),
        "updated_at": row.get("updated_at"),
    }


def format_branch(row: dict[str, Any]):
    branch_id = row.get("branch_id")
    sync_setting = get_setting(f"branch_{branch_id}_sync_mode")

    return {
        "branch_id": branch_id,
        "branch_name": row.get("branch_name"),
        "location": row.get("location"),
        "status": row.get("status") or "Active",
        "scope": "Operational branch",
        "sync_mode": sync_setting.get("value") if sync_setting else "Cloud-synced",
    }


@router.get("/settings")
def get_admin_settings(current_user=Depends(require_roles(ROLE_ADMIN))):
    ensure_settings_tables()

    branches = fetchall(
        """
        SELECT
            branch_id,
            branch_name,
            location,
            status
        FROM branches
        WHERE branch_id IN (1, 2)
        ORDER BY branch_id ASC
        """
    )

    settings = fetchall(
        """
        SELECT
            setting_key,
            label,
            category,
            value,
            description,
            updated_at
        FROM system_settings
        WHERE setting_key NOT LIKE %s
        ORDER BY category ASC, setting_key ASC
        """,
        ("branch_%_sync_mode",),
    )

    return {
        "branches": [format_branch(row) for row in branches],
        "settings": [format_setting(row) for row in settings],
        "roles": ROLE_ROWS,
        "updated_at": datetime.now().isoformat(),
    }


@router.patch("/settings")
def update_admin_setting(
    payload: SettingUpdateRequest,
    current_user=Depends(require_roles(ROLE_ADMIN)),
):
    ensure_settings_tables()

    setting_key = payload.setting_key.strip()
    existing = get_setting(setting_key)

    if not existing:
        raise HTTPException(status_code=404, detail="Setting not found.")

    next_value = normalize_bool_text(payload.value)

    execute(
        """
        UPDATE system_settings
        SET value = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE setting_key = %s
        """,
        (next_value, setting_key),
    )

    updated = get_setting(setting_key)

    log_event(
        action="ADMIN_UPDATE_SYSTEM_SETTING",
        endpoint_accessed="/api/admin/settings",
        user_id=current_user.get("user_id"),
        old_value={
            "setting_key": existing.get("setting_key"),
            "value": existing.get("value"),
        },
        new_value={
            "setting_key": updated.get("setting_key"),
            "value": updated.get("value"),
        },
    )

    return format_setting(updated)


@router.patch("/branches/{branch_id}")
def update_admin_branch(
    branch_id: int,
    payload: BranchUpdateRequest,
    current_user=Depends(require_roles(ROLE_ADMIN)),
):
    ensure_settings_tables()

    existing = fetchone(
        """
        SELECT
            branch_id,
            branch_name,
            location,
            status
        FROM branches
        WHERE branch_id = %s
        """,
        (branch_id,),
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Branch not found.")

    existing_sync_setting = get_setting(f"branch_{branch_id}_sync_mode")
    existing_sync_mode = (
        existing_sync_setting.get("value")
        if existing_sync_setting
        else "Cloud-synced"
    )

    next_branch_name = (
        payload.branch_name.strip()
        if payload.branch_name is not None
        else existing.get("branch_name")
    )

    next_location = (
        payload.location.strip()
        if payload.location is not None
        else existing.get("location")
    )

    next_status = (
        payload.status.strip()
        if payload.status is not None
        else existing.get("status")
    )

    if not next_branch_name:
        raise HTTPException(status_code=400, detail="Branch name is required.")

    if not next_location:
        raise HTTPException(status_code=400, detail="Location is required.")

    if next_status not in {"Active", "Inactive"}:
        raise HTTPException(status_code=400, detail="Status must be Active or Inactive.")

    execute(
        """
        UPDATE branches
        SET branch_name = %s,
            location = %s,
            status = %s
        WHERE branch_id = %s
        """,
        (next_branch_name, next_location, next_status, branch_id),
    )

    if payload.sync_mode is not None:
        sync_mode = payload.sync_mode.strip() or "Cloud-synced"

        execute(
            """
            UPDATE system_settings
            SET value = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE setting_key = %s
            """,
            (sync_mode, f"branch_{branch_id}_sync_mode"),
        )

    updated = fetchone(
        """
        SELECT
            branch_id,
            branch_name,
            location,
            status
        FROM branches
        WHERE branch_id = %s
        """,
        (branch_id,),
    )

    log_event(
        action="ADMIN_UPDATE_BRANCH_SETTING",
        endpoint_accessed=f"/api/admin/branches/{branch_id}",
        user_id=current_user.get("user_id"),
        old_value={
            **existing,
            "sync_mode": existing_sync_mode,
        },
        new_value=format_branch(updated),
    )

    return format_branch(updated)