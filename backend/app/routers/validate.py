from fastapi import APIRouter, Depends, HTTPException

from ..schemas.validate import ValidationRequest, ValidationResponse
from ..services.validate_service import validate_sample_service
from .auth import require_roles

router = APIRouter()


@router.post("/{sample_id}", response_model=ValidationResponse)
def validate_sample(
    sample_id: int,
    payload: ValidationRequest,
    current_user=Depends(require_roles(["Senior Technician", "QA Engineer"])),
):
    try:
        return validate_sample_service(
            sample_id=sample_id,
            final_material_type=payload.final_material_type,
            justification=payload.justification,
            approved=payload.approved,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))