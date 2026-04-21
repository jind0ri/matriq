from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..schemas.branch import BranchCreate, BranchResponse, BranchUpdate
from ..services.branch_service import (
    create_branch_service,
    delete_branch_service,
    get_branch_by_id,
    get_branches_service,
    update_branch_service,
)
from .auth import get_current_user, require_roles

router = APIRouter()


@router.get("/", response_model=List[BranchResponse])
def list_branches(current_user=Depends(get_current_user)):
    return get_branches_service()


@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(branch_id: int, current_user=Depends(get_current_user)):
    branch = get_branch_by_id(branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@router.post("/", response_model=BranchResponse)
def create_branch(
    branch: BranchCreate,
    current_user=Depends(require_roles(["administrator"])),
):
    try:
        return create_branch_service(branch)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: int,
    branch: BranchUpdate,
    current_user=Depends(require_roles(["administrator"])),
):
    try:
        return update_branch_service(branch_id, branch)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(
    branch_id: int,
    current_user=Depends(require_roles(["administrator"])),
):
    try:
        delete_branch_service(branch_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))