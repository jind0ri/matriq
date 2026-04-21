from pydantic import BaseModel, EmailStr
from typing import Optional


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    email: EmailStr
    full_name: str


class UserPublic(BaseModel):
    user_id: int
    email: EmailStr
    full_name: str
    role: str
    branch: str
    is_active: bool


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str
    branch: str
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    branch: Optional[str] = None
    is_active: Optional[bool] = None