from pydantic import BaseModel, Field
from typing import Optional


class UserLogin(BaseModel):
    username: str
    password: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: str
    branch_id: Optional[int] = None


class UserPublic(BaseModel):
    user_id: int
    username: str
    full_name: str
    role: str
    branch_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: str
    branch_id: Optional[int] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None