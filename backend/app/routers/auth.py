from fastapi import APIRouter, HTTPException
from ..schemas.user import UserLogin, UserResponse
from ..services.auth_service import authenticate_user, create_access_token

router = APIRouter()

@router.post("/login", response_model=UserResponse)
def login(user: UserLogin):
    db_user = authenticate_user(user.username, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": db_user.username, "role": db_user.role})
    return {"access_token": token, "token_type": "bearer"}