from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.sample import SampleCreate, SampleResponse, SampleStatusUpdate
from ..services.sample_service import (
    create_sample_service,
    get_samples_service,
    get_sample_service,
    update_sample_service,
    delete_sample_service,
    update_sample_status_service,
)
from .auth import get_current_user, require_roles

router = APIRouter()


@router.post("/", response_model=SampleResponse)
def create_sample(
    sample: SampleCreate,
    current_user=Depends(require_roles(["Administrator", "Lab Technician"])),
    db: Session = Depends(get_db),
):
    try:
        return create_sample_service(db, sample, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[SampleResponse])
def list_samples(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_samples_service(db)


@router.get("/{sample_id}", response_model=SampleResponse)
def get_sample(
    sample_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sample = get_sample_service(db, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample


@router.put("/{sample_id}", response_model=SampleResponse)
def update_sample(
    sample_id: str,
    sample: SampleCreate,
    current_user=Depends(require_roles(["Administrator", "Lab Technician"])),
    db: Session = Depends(get_db),
):
    try:
        return update_sample_service(db, sample_id, sample)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{sample_id}/status", response_model=SampleResponse)
def update_sample_status(
    sample_id: str,
    status_update: SampleStatusUpdate,
    current_user=Depends(
        require_roles(["Administrator", "Lab Technician", "QA Engineer"])
    ),
    db: Session = Depends(get_db),
):
    try:
        return update_sample_status_service(
            db=db,
            sample_id=sample_id,
            new_state=status_update.current_state,
            user_role=current_user["role"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{sample_id}", status_code=204)
def delete_sample(
    sample_id: str,
    current_user=Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db),
):
    try:
        delete_sample_service(db, sample_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))