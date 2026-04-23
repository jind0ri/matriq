from pydantic import BaseModel, Field


class ValidationRequest(BaseModel):
    final_material_type: str = Field(..., min_length=1)
    justification: str = Field(..., min_length=5)
    approved: bool = True


class ValidationResponse(BaseModel):
    sample_id: int
    previous_material_type: str
    final_material_type: str
    decision_source: str
    justification: str
    validated_by: str
    validated_role: str
    lifecycle_state: str