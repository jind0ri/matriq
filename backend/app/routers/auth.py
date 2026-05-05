from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import os
import secrets

from fastapi import APIRouter, HTTPException, Request
from passlib.context import CryptContext

from ..database import execute, fetchone
from ..schemas import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserLogin,
    UserResponse,
)
from ..services.audit_service import log_event
from ..services.auth_service import authenticate, create_token

try:
    import resend
except Exception:
    resend = None


router = APIRouter(prefix="/api/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


RESET_TOKEN_MINUTES = 30


def ensure_password_reset_table():
    execute(
        """
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def parse_datetime(value):
    if isinstance(value, datetime):
        return value

    text = str(value)

    if text.endswith("Z"):
        text = text[:-1] + "+00:00"

    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return datetime.strptime(text.split(".")[0], "%Y-%m-%d %H:%M:%S")


def get_user_by_email(email: str):
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
        WHERE lower(username) = lower(%s)
        """,
        (email.strip().lower(),),
    )


def send_reset_email(to_email: str, reset_url: str):
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    resend_from_email = os.getenv(
        "RESEND_FROM_EMAIL",
        "Matriq <onboarding@resend.dev>",
    ).strip()

    if not resend_api_key or resend is None:
        print("\n[MATRIQ PASSWORD RESET LINK]")
        print(reset_url)
        print("[END MATRIQ PASSWORD RESET LINK]\n")
        return {"sent": False, "mode": "console"}

    resend.api_key = resend_api_key

    return resend.Emails.send(
        {
            "from": resend_from_email,
            "to": [to_email],
            "subject": "Reset your Matriq password",
            "html": f"""
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Reset your Matriq password</h2>
                    <p>Hello,</p>
                    <p>
                        A password reset was requested for your Matriq account.
                        Click the button below to set a new password.
                    </p>
                    <p>
                        <a
                            href="{reset_url}"
                            style="
                                display: inline-block;
                                padding: 10px 16px;
                                background: #090021;
                                color: #ffffff;
                                text-decoration: none;
                                border-radius: 8px;
                                font-weight: bold;
                            "
                        >
                            Reset Password
                        </a>
                    </p>
                    <p>This link expires in {RESET_TOKEN_MINUTES} minutes.</p>
                    <p>If you did not request this, you may ignore this email.</p>
                </div>
            """,
        }
    )


@router.post("/login", response_model=UserResponse)
def login(user: UserLogin, request: Request):
    auth_user = authenticate(user.email, user.password)

    if not auth_user:
        log_event(
            action="AUTH_LOGIN_FAILED",
            endpoint_accessed="/api/auth/login",
            new_value={"email": user.email},
            ip_address=request.client.host if request.client else None,
        )

        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not auth_user.get("is_active"):
        log_event(
            action="AUTH_LOGIN_BLOCKED_INACTIVE",
            endpoint_accessed="/api/auth/login",
            user_id=auth_user["user_id"],
            new_value={
                "email": auth_user["username"],
                "role": auth_user["role"],
                "reason": "Account deactivated",
            },
            ip_address=request.client.host if request.client else None,
        )

        raise HTTPException(
            status_code=403,
            detail="This account has been deactivated. Please contact the administrator.",
        )
    
    requested_portal = (user.portal or "").strip().lower()

    if requested_portal == "admin" and auth_user["role"] != "Administrator":
        log_event(
            action="AUTH_LOGIN_BLOCKED_WRONG_PORTAL",
            endpoint_accessed="/api/auth/login",
            user_id=auth_user["user_id"],
            new_value={
                "email": auth_user["username"],
                "role": auth_user["role"],
                "portal": requested_portal,
            },
            ip_address=request.client.host if request.client else None,
        )

        raise HTTPException(
            status_code=403,
            detail="This login page is for administrators only.",
        )

    if requested_portal == "employee" and auth_user["role"] == "Administrator":
        log_event(
            action="AUTH_LOGIN_BLOCKED_WRONG_PORTAL",
            endpoint_accessed="/api/auth/login",
            user_id=auth_user["user_id"],
            new_value={
                "email": auth_user["username"],
                "role": auth_user["role"],
                "portal": requested_portal,
            },
            ip_address=request.client.host if request.client else None,
        )

        raise HTTPException(
            status_code=403,
            detail="Administrators must use the admin login page.",
        )

    log_event(
        action="AUTH_LOGIN_SUCCESS",
        endpoint_accessed="/api/auth/login",
        user_id=auth_user["user_id"],
        new_value={
            "email": auth_user["username"],
            "role": auth_user["role"],
            "is_active": bool(auth_user.get("is_active")),
        },
        ip_address=request.client.host if request.client else None,
    )

    return UserResponse(
        access_token=create_token(auth_user),
        role=auth_user["role"],
        name=auth_user["full_name"],
        email=auth_user["username"],
        user_id=auth_user["user_id"],
        branch_id=auth_user.get("branch_id"),
        is_active=bool(auth_user.get("is_active")),
        status="Active" if auth_user.get("is_active") else "Inactive",
        account_status="Active" if auth_user.get("is_active") else "Inactive",
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request):
    ensure_password_reset_table()

    # Always return a generic response to avoid revealing whether an email exists.
    generic_response = {
        "success": True,
        "message": "If this email is registered, a password reset link will be sent shortly.",
    }

    email = payload.email.strip().lower()
    user = get_user_by_email(email)

    log_event(
        action="AUTH_FORGOT_PASSWORD_REQUESTED",
        endpoint_accessed="/api/auth/forgot-password",
        user_id=user.get("user_id") if user else None,
        new_value={"email": email},
        ip_address=request.client.host if request.client else None,
    )

    if not user:
        return generic_response

    if not user.get("is_active"):
        log_event(
            action="AUTH_FORGOT_PASSWORD_BLOCKED_INACTIVE",
            endpoint_accessed="/api/auth/forgot-password",
            user_id=user.get("user_id"),
            new_value={"email": email, "reason": "Account inactive"},
            ip_address=request.client.host if request.client else None,
        )
        return generic_response

    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_MINUTES)

    execute(
        """
        INSERT INTO password_reset_tokens (
            token_hash,
            user_id,
            expires_at,
            used_at
        )
        VALUES (%s, %s, %s, NULL)
        """,
        (token_hash, user["user_id"], expires_at),
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_url = f"{frontend_url}/auth/reset-password?token={raw_token}"

    try:
        send_reset_email(email, reset_url)
    except Exception as exc:
        log_event(
            action="AUTH_PASSWORD_RESET_EMAIL_FAILED",
            endpoint_accessed="/api/auth/forgot-password",
            user_id=user.get("user_id"),
            new_value={"email": email, "error": str(exc)},
            ip_address=request.client.host if request.client else None,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to send password reset email. Please try again later.",
        )

    log_event(
        action="AUTH_PASSWORD_RESET_EMAIL_SENT",
        endpoint_accessed="/api/auth/forgot-password",
        user_id=user.get("user_id"),
        new_value={"email": email},
        ip_address=request.client.host if request.client else None,
    )

    return generic_response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request):
    ensure_password_reset_table()

    if not payload.token or not payload.token.strip():
        raise HTTPException(status_code=400, detail="Reset token is required.")

    if not payload.password or len(payload.password.strip()) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters.",
        )

    token_hash = hash_token(payload.token.strip())

    token_row = fetchone(
        """
        SELECT
            token_hash,
            user_id,
            expires_at,
            used_at
        FROM password_reset_tokens
        WHERE token_hash = %s
        """,
        (token_hash,),
    )

    if not token_row:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if token_row.get("used_at"):
        raise HTTPException(status_code=400, detail="Reset token has already been used.")

    expires_at = parse_datetime(token_row["expires_at"])

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired.")

    user = fetchone(
        """
        SELECT
            user_id,
            username,
            is_active
        FROM users
        WHERE user_id = %s
        """,
        (token_row["user_id"],),
    )

    if not user:
        raise HTTPException(status_code=400, detail="User account no longer exists.")

    if not user.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail="This account has been deactivated. Please contact the administrator.",
        )

    password_hash = pwd_context.hash(payload.password.strip())

    execute(
        """
        UPDATE users
        SET password_hash = %s
        WHERE user_id = %s
        """,
        (password_hash, user["user_id"]),
    )

    execute(
        """
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE token_hash = %s
        """,
        (token_hash,),
    )

    log_event(
        action="AUTH_PASSWORD_RESET_COMPLETED",
        endpoint_accessed="/api/auth/reset-password",
        user_id=user["user_id"],
        new_value={"email": user["username"]},
        ip_address=request.client.host if request.client else None,
    )

    return {
        "success": True,
        "message": "Password has been reset successfully.",
    }