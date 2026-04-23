from pydantic import BaseModel


class ValidationRequest(BaseModel):
    final_material_type: str
    justification: str
    approved: bool


class ValidationResponse(BaseModel):
    sample_id: str
    previous_material_type: str
    final_material_type: str
    decision_source: str
    justification: str
    validated_by: str
    validated_role: str
    lifecycle_state: str