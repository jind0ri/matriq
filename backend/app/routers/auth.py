from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.user import (
    PasswordResetRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserLogin,
    UserPublic,
)
from ..services.auth_service import (
    authenticate_user,
    build_token_payload,
    create_access_token,
    create_refresh_token,
    decode_token,
    reset_password_service,
)
from ..services.audit_service import log_audit_event

router = APIRouter()
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    username = payload.get("sub")
    role = payload.get("role")
    user_id = payload.get("user_id")
    full_name = payload.get("full_name")
    branch_id = payload.get("branch_id")

    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    return {
        "user_id": user_id,
        "username": username,
        "full_name": full_name,
        "role": role,
        "branch_id": branch_id,
        "is_active": True,
    }


def require_roles(allowed_roles: List[str]):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return current_user

    return role_checker


@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user.username, user.password)
    if not db_user:
        log_audit_event(
            event_type="AUTH",
            performed_by=user.username,
            role="unknown",
            action="Login attempt",
            status="FAILED",
            details="Invalid credentials",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    payload = build_token_payload(db_user)
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    log_audit_event(
        event_type="AUTH",
        performed_by=db_user.full_name,
        role=db_user.role,
        action="Login",
        status="SUCCESS",
        details=f"username={db_user.username}",
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": db_user.role,
        "username": db_user.username,
        "full_name": db_user.full_name,
        "branch_id": db_user.branch_id,
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: TokenRefreshRequest):
    try:
        decoded = decode_token(payload.refresh_token)
    except ValueError:
        log_audit_event(
            event_type="AUTH",
            performed_by="unknown",
            role="unknown",
            action="Refresh token",
            status="FAILED",
            details="Invalid or expired refresh token",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if decoded.get("type") != "refresh":
        log_audit_event(
            event_type="AUTH",
            performed_by=decoded.get("sub", "unknown"),
            role=decoded.get("role", "unknown"),
            action="Refresh token",
            status="FAILED",
            details="Invalid token type for refresh",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for refresh",
        )

    new_payload = {
        "sub": decoded["sub"],
        "user_id": decoded["user_id"],
        "role": decoded["role"],
        "branch_id": decoded.get("branch_id"),
        "full_name": decoded["full_name"],
    }

    new_access_token = create_access_token(new_payload)
    new_refresh_token = create_refresh_token(new_payload)

    log_audit_event(
        event_type="AUTH",
        performed_by=decoded["full_name"],
        role=decoded["role"],
        action="Refresh token",
        status="SUCCESS",
        details=f"username={decoded['sub']}",
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "role": decoded["role"],
        "username": decoded["sub"],
        "full_name": decoded["full_name"],
        "branch_id": decoded.get("branch_id"),
    }


@router.post("/reset-password")
def reset_password(
    payload: PasswordResetRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = reset_password_service(
            db=db,
            current_user=current_user,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )

        log_audit_event(
            event_type="AUTH",
            performed_by=current_user["full_name"],
            role=current_user["role"],
            action="Password reset",
            status="SUCCESS",
            details=f"username={current_user['username']}",
        )

        return result
    except ValueError as e:
        log_audit_event(
            event_type="AUTH",
            performed_by=current_user["full_name"],
            role=current_user["role"],
            action="Password reset",
            status="FAILED",
            details=str(e),
        )
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=UserPublic)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(current_user=Depends(get_current_user)):
    log_audit_event(
        event_type="AUTH",
        performed_by=current_user["full_name"],
        role=current_user["role"],
        action="Logout",
        status="SUCCESS",
        details=f"username={current_user['username']}",
    )
    return {"message": "Logged out successfully"}