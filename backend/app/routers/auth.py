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

    return {
        "user_id": payload["user_id"],
        "username": payload["sub"],
        "full_name": payload["full_name"],
        "role": payload["role"],
        "branch_id": payload.get("branch_id"),
    }


def require_roles(allowed_roles: List[str]):
    def checker(current_user=Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Access denied")
        return current_user

    return checker


@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user.username, user.password)

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    payload = build_token_payload(db_user)

    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    log_audit_event(
        db=db,
        user_id=db_user.user_id,
        action="Login",
        endpoint="/api/auth/login",
        new_value={"username": db_user.username},
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
def refresh(payload: TokenRefreshRequest, db: Session = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)

    new_payload = {
        "sub": decoded["sub"],
        "user_id": decoded["user_id"],
        "role": decoded["role"],
        "branch_id": decoded.get("branch_id"),
        "full_name": decoded["full_name"],
    }

    access = create_access_token(new_payload)
    refresh = create_refresh_token(new_payload)

    log_audit_event(
        db=db,
        user_id=decoded["user_id"],
        action="Refresh token",
        endpoint="/api/auth/refresh",
        new_value={"username": decoded["sub"]},
    )

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "role": decoded["role"],
        "username": decoded["sub"],
        "full_name": decoded["full_name"],
        "branch_id": decoded.get("branch_id"),
    }


@router.post("/logout")
def logout(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="Logout",
        endpoint="/api/auth/logout",
        new_value={"username": current_user["username"]},
    )
    return {"message": "Logged out"}