from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
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
def list_branches(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_branches_service(db)


@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    branch = get_branch_by_id(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@router.post("/", response_model=BranchResponse)
def create_branch(
    branch: BranchCreate,
    current_user=Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db),
):
    try:
        return create_branch_service(db, branch)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: int,
    branch: BranchUpdate,
    current_user=Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db),
):
    try:
        return update_branch_service(db, branch_id, branch)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(
    branch_id: int,
    current_user=Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db),
):
    try:
        delete_branch_service(db, branch_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))