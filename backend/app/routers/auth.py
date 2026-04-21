from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..schemas.user import TokenResponse, UserLogin, UserPublic
from ..services.auth_service import (
    authenticate_user,
    build_token_payload,
    create_access_token,
    decode_access_token,
)

router = APIRouter()
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    email = payload.get("sub")
    role = payload.get("role")
    user_id = payload.get("user_id")
    full_name = payload.get("full_name")
    branch = payload.get("branch")

    if not email or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    return {
        "user_id": user_id,
        "email": email,
        "full_name": full_name,
        "role": role,
        "branch": branch,
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
def login(user: UserLogin):
    db_user = authenticate_user(user.email, user.password)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    payload = build_token_payload(db_user)
    token = create_access_token(payload)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": db_user["role"],
        "email": db_user["email"],
        "full_name": db_user["full_name"],
    }


@router.get("/me", response_model=UserPublic)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout():
    # Stateless JWT logout placeholder.
    # Later, if you add refresh tokens / blacklist, implement invalidation here.
    return {"message": "Logged out successfully"}