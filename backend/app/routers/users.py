from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..schemas.user import UserCreate, UserPublic, UserUpdate
from ..services.user_service import (
    create_user_service,
    delete_user_service,
    get_users_service,
    update_user_service,
)
from .auth import require_roles

router = APIRouter()


@router.get("/", response_model=List[UserPublic])
def list_users(current_user=Depends(require_roles(["administrator"]))):
    return get_users_service()


@router.post("/", response_model=UserPublic)
def create_user(
    user: UserCreate,
    current_user=Depends(require_roles(["administrator"])),
):
    try:
        return create_user_service(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{user_id}", response_model=UserPublic)
def update_user(
    user_id: int,
    user: UserUpdate,
    current_user=Depends(require_roles(["administrator"])),
):
    try:
        return update_user_service(user_id, user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user=Depends(require_roles(["administrator"])),
):
    try:
        delete_user_service(user_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))