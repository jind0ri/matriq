from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib

import jwt
from fastapi import Depends, Header, HTTPException
from passlib.context import CryptContext

from ..config import JWT_ALGORITHM, JWT_SECRET, ROLE_ADMIN, TOKEN_EXPIRE_MINUTES
from ..database import fetchone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _password_matches(raw_password: str, stored_password_hash: str | None) -> bool:
    if not stored_password_hash:
        return False

    # Legacy plain-text support.
    if raw_password == stored_password_hash:
        return True

    # Legacy sha256 support.
    if hashlib.sha256(raw_password.encode("utf-8")).hexdigest() == stored_password_hash:
        return True

    # Bcrypt / pgcrypto-compatible support.
    try:
        if (
            stored_password_hash.startswith("$2a$")
            or stored_password_hash.startswith("$2b$")
            or stored_password_hash.startswith("$2y$")
        ):
            return pwd_context.verify(raw_password, stored_password_hash)
    except Exception:
        pass

    return False


def get_user_by_login_identifier(login_identifier: str):
    return fetchone(
        """
        SELECT
            user_id,
            username,
            password_hash,
            full_name,
            role,
            branch_id,
            is_active
        FROM users
        WHERE lower(username) = lower(%s)
        """,
        (login_identifier,),
    )


def get_user_by_id(user_id: int):
    return fetchone(
        """
        SELECT
            user_id,
            username,
            full_name,
            role,
            branch_id,
            is_active
        FROM users
        WHERE user_id = %s
        """,
        (user_id,),
    )


def authenticate(login_identifier: str, password: str):
    """
    Returns the user only when credentials are valid.

    Important:
    This function does not reject inactive users by returning None.
    The login route checks is_active separately so it can return a clear
    403 deactivated-account response instead of saying invalid credentials.
    """
    user = get_user_by_login_identifier(login_identifier)

    if not user:
        return None

    if not _password_matches(password, user.get("password_hash")):
        return None

    return user


def create_token(user: dict) -> str:
    payload = {
        "sub": user["username"],
        "user_id": user["user_id"],
        "role": user["role"],
        "name": user.get("full_name") or user["username"],
        "branch_id": user.get("branch_id"),
        "is_active": bool(user.get("is_active")),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    db_user = get_user_by_id(payload["user_id"])

    if not db_user:
        raise HTTPException(status_code=401, detail="User account no longer exists.")

    if not db_user.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail="This account has been deactivated. Please contact the administrator.",
        )

    return {
        "email": db_user["username"],
        "username": db_user["username"],
        "user_id": db_user["user_id"],
        "role": db_user["role"],
        "name": db_user.get("full_name") or db_user["username"],
        "branch_id": db_user.get("branch_id"),
        "is_active": bool(db_user.get("is_active")),
        "is_admin": db_user["role"] == ROLE_ADMIN,
    }


def require_roles(*roles):
    def dep(user=Depends(current_user)):
        if roles and user["role"] not in roles:
            raise HTTPException(
                status_code=403,
                detail="User role is not allowed to access this endpoint.",
            )

        return user

    return dep