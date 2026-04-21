from fastapi import APIRouter, HTTPException, Depends
from typing import List

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
    current_user=Depends(require_roles(["Administrator", "Lab Technician"]))
):
    try:
        return create_sample_service(sample)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[SampleResponse])
def list_samples(current_user=Depends(get_current_user)):
    return get_samples_service()


@router.get("/{sample_id}", response_model=SampleResponse)
def get_sample(
    sample_id: int,
    current_user=Depends(get_current_user)
):
    sample = get_sample_service(sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample


@router.put("/{sample_id}", response_model=SampleResponse)
def update_sample(
    sample_id: int,
    sample: SampleCreate,
    current_user=Depends(require_roles(["Administrator", "Lab Technician"]))
):
    try:
        return update_sample_service(sample_id, sample)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{sample_id}/status", response_model=SampleResponse)
def update_sample_status(
    sample_id: int,
    status_update: SampleStatusUpdate,
    current_user=Depends(
        require_roles(["Administrator", "Lab Technician", "QA Engineer"])
    ),
):
    try:
        return update_sample_status_service(
            sample_id=sample_id,
            new_state=status_update.lifecycle_state,
            user_role=current_user["role"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{sample_id}", status_code=204)
def delete_sample(
    sample_id: int,
    current_user=Depends(require_roles(["Administrator"]))
):
    delete_sample_service(sample_id)