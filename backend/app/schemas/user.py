from pydantic import BaseModel, EmailStr


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
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