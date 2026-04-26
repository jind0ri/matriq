from fastapi import APIRouter, HTTPException, Request

from ..schemas import UserLogin, UserResponse
from ..services.audit_service import log_event
from ..services.auth_service import authenticate, create_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


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