from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel

from ..config import ROLE_ADMIN
from ..database import execute, fetchall, fetchone
from ..services.audit_service import log_event
from ..services.auth_service import require_roles

router = APIRouter(prefix="/api", tags=["Users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ALLOWED_ROLES = {
    "Administrator",
    "Lab Technician",
    "QA Engineer",
    "Senior Technician",
    "Accounting Staff",
}

ALLOWED_BRANCH_IDS = {1, 2}


class UserCreateRequest(BaseModel):
    full_name: str
    username: str
    password: str
    role: str
    branch_id: int
    is_active: bool = True


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    username: str | None = None
    password: str | None = None
    role: str | None = None
    branch_id: int | None = None
    is_active: bool | None = None


class UserStatusRequest(BaseModel):
    is_active: bool


def _normalize_role(role: str) -> str:
    value = str(role or "").strip().lower()

    if value in {"administrator", "admin", "system administrator"}:
        return "Administrator"

    if value in {
        "lab technician",
        "laboratory technician",
        "technical staff",
        "technician",
    }:
        return "Lab Technician"

    if value in {
        "qa engineer",
        "qa staff",
        "quality assurance",
        "quality assurance engineer",
    }:
        return "QA Engineer"

    if value in {"senior technician", "senior tech", "senior engineer"}:
        return "Senior Technician"

    if value in {"accounting staff", "accounting", "accountant"}:
        return "Accounting Staff"

    return str(role or "").strip()


def _validate_role(role: str) -> str:
    normalized = _normalize_role(role)

    if normalized not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed roles: {', '.join(sorted(ALLOWED_ROLES))}.",
        )

    return normalized


def _validate_branch(branch_id: int | None) -> int | None:
    if branch_id is None:
        return None

    normalized = int(branch_id)

    if normalized not in ALLOWED_BRANCH_IDS:
        raise HTTPException(
            status_code=400,
            detail="Invalid branch. Allowed branches are Marikina and Pateros.",
        )

    return normalized


def _hash_password(password: str) -> str:
    if not password or len(password.strip()) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters.",
        )

    return pwd_context.hash(password)


def _format_user(row: dict[str, Any] | None):
    if not row:
        return None

    is_active = bool(row.get("is_active"))

    return {
        "user_id": row.get("user_id"),
        "username": row.get("username"),
        "email": row.get("username"),
        "full_name": row.get("full_name"),
        "name": row.get("full_name"),
        "role": row.get("role"),
        "branch_id": row.get("branch_id"),
        "is_active": is_active,
        "status": "Active" if is_active else "Inactive",
        "account_status": "Active" if is_active else "Inactive",
        "created_at": row.get("created_at"),
    }


def _get_user_or_404(user_id: int):
    row = fetchone(
        """
        SELECT
            user_id,
            username,
            full_name,
            role,
            branch_id,
            is_active,
            created_at
        FROM users
        WHERE user_id = %s
        """,
        (user_id,),
    )

    if not row:
        raise HTTPException(status_code=404, detail="User not found.")

    return row


@router.get("/users")
def list_users(current_user=Depends(require_roles(ROLE_ADMIN))):
    rows = fetchall(
        """
        SELECT
            user_id,
            username,
            full_name,
            role,
            branch_id,
            is_active,
            created_at
        FROM users
        ORDER BY user_id ASC
        """
    )

    return [_format_user(row) for row in rows]


@router.post("/users")
def create_user(
    payload: UserCreateRequest,
    current_user=Depends(require_roles(ROLE_ADMIN)),
):
    username = payload.username.strip().lower()
    full_name = payload.full_name.strip()
    role = _validate_role(payload.role)
    branch_id = _validate_branch(payload.branch_id)
    is_active = bool(payload.is_active)

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required.")

    if not username:
        raise HTTPException(status_code=400, detail="Username or email is required.")

    existing = fetchone(
        """
        SELECT user_id
        FROM users
        WHERE lower(username) = lower(%s)
        """,
        (username,),
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A user with this username or email already exists.",
        )

    password_hash = _hash_password(payload.password)

    try:
        execute(
            """
            INSERT INTO users (
                username,
                password_hash,
                full_name,
                role,
                branch_id,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                username,
                password_hash,
                full_name,
                role,
                branch_id,
                is_active,
            ),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to create user account.",
        ) from exc

    created = fetchone(
        """
        SELECT
            user_id,
            username,
            full_name,
            role,
            branch_id,
            is_active,
            created_at
        FROM users
        WHERE lower(username) = lower(%s)
        """,
        (username,),
    )

    log_event(
        action="ADMIN_CREATE_USER",
        endpoint_accessed="/api/users",
        user_id=current_user.get("user_id"),
        new_value={
            "created_user_id": created.get("user_id") if created else None,
            "username": username,
            "role": role,
            "branch_id": branch_id,
            "is_active": is_active,
        },
    )

    return _format_user(created)


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    current_user=Depends(require_roles(ROLE_ADMIN)),
):
    existing = _get_user_or_404(user_id)

    next_username = (
        payload.username.strip().lower()
        if payload.username is not None
        else existing["username"]
    )

    next_full_name = (
        payload.full_name.strip()
        if payload.full_name is not None
        else existing["full_name"]
    )

    next_role = (
        _validate_role(payload.role)
        if payload.role is not None
        else existing["role"]
    )

    next_branch_id = (
        _validate_branch(payload.branch_id)
        if payload.branch_id is not None
        else existing["branch_id"]
    )

    next_is_active = (
        bool(payload.is_active)
        if payload.is_active is not None
        else bool(existing["is_active"])
    )

    if not next_username:
        raise HTTPException(status_code=400, detail="Username or email is required.")

    if not next_full_name:
        raise HTTPException(status_code=400, detail="Full name is required.")

    duplicate = fetchone(
        """
        SELECT user_id
        FROM users
        WHERE lower(username) = lower(%s)
          AND user_id <> %s
        """,
        (next_username, user_id),
    )

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="A different user already uses this username or email.",
        )

    if payload.password:
        password_hash = _hash_password(payload.password)

        execute(
            """
            UPDATE users
            SET
                username = %s,
                password_hash = %s,
                full_name = %s,
                role = %s,
                branch_id = %s,
                is_active = %s
            WHERE user_id = %s
            """,
            (
                next_username,
                password_hash,
                next_full_name,
                next_role,
                next_branch_id,
                next_is_active,
                user_id,
            ),
        )
    else:
        execute(
            """
            UPDATE users
            SET
                username = %s,
                full_name = %s,
                role = %s,
                branch_id = %s,
                is_active = %s
            WHERE user_id = %s
            """,
            (
                next_username,
                next_full_name,
                next_role,
                next_branch_id,
                next_is_active,
                user_id,
            ),
        )

    updated = _get_user_or_404(user_id)

    log_event(
        action="ADMIN_UPDATE_USER",
        endpoint_accessed=f"/api/users/{user_id}",
        user_id=current_user.get("user_id"),
        old_value={
            "user_id": existing.get("user_id"),
            "username": existing.get("username"),
            "full_name": existing.get("full_name"),
            "role": existing.get("role"),
            "branch_id": existing.get("branch_id"),
            "is_active": bool(existing.get("is_active")),
        },
        new_value={
            "user_id": updated.get("user_id"),
            "username": updated.get("username"),
            "full_name": updated.get("full_name"),
            "role": updated.get("role"),
            "branch_id": updated.get("branch_id"),
            "is_active": bool(updated.get("is_active")),
        },
    )

    return _format_user(updated)


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UserStatusRequest,
    current_user=Depends(require_roles(ROLE_ADMIN)),
):
    existing = _get_user_or_404(user_id)
    next_active = bool(payload.is_active)

    if int(existing["user_id"]) == int(current_user.get("user_id")) and not next_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own administrator account while logged in.",
        )

    execute(
        """
        UPDATE users
        SET is_active = %s
        WHERE user_id = %s
        """,
        (next_active, user_id),
    )

    updated = _get_user_or_404(user_id)

    log_event(
        action="ADMIN_ACTIVATE_USER" if next_active else "ADMIN_DEACTIVATE_USER",
        endpoint_accessed=f"/api/users/{user_id}/status",
        user_id=current_user.get("user_id"),
        old_value={
            "user_id": existing.get("user_id"),
            "username": existing.get("username"),
            "is_active": bool(existing.get("is_active")),
        },
        new_value={
            "user_id": updated.get("user_id"),
            "username": updated.get("username"),
            "is_active": bool(updated.get("is_active")),
        },
    )

    return _format_user(updated)