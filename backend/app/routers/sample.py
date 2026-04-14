from fastapi import APIRouter, HTTPException
from typing import List
from ..schemas.sample import SampleCreate, SampleResponse
from ..services.sample_service import (
    create_sample_service,
    get_samples_service,
    get_sample_service,
    update_sample_service,
    delete_sample_service
)

router = APIRouter()

@router.post("/", response_model=SampleResponse)
def create_sample(sample: SampleCreate):
    try:
        return create_sample_service(sample)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[SampleResponse])
def list_samples():
    return get_samples_service()

@router.get("/{sample_id}", response_model=SampleResponse)
def get_sample(sample_id: int):
    sample = get_sample_service(sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample

@router.put("/{sample_id}", response_model=SampleResponse)
def update_sample(sample_id: int, sample: SampleCreate):
    try:
        return update_sample_service(sample_id, sample)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{sample_id}", status_code=204)
def delete_sample(sample_id: int):
    delete_sample_service(sample_id)