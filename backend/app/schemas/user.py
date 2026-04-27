from pydantic import BaseModel, EmailStr


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    email: EmailStr
    user_id: int
    branch_id: int | None = None

    # Account status returned to frontend for route/session protection.
    is_active: bool = True
    status: str = "Active"
    account_status: str = "Active"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str