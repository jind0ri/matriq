from pydantic import BaseModel
from typing import Optional


class SampleCreate(BaseModel):
    client_name: str
    project_id: str
    material_type: str
    notes: Optional[str] = None


class SampleResponse(BaseModel):
    id: str
    sample_id: str
    client_name: str
    project_id: str
    material_type: str
    status: str
    decision: str
    current_state: str
    branch_id: Optional[str] = None
    registered_by: Optional[int] = None
    is_immutable: bool = False
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class SampleStatusUpdate(BaseModel):
    current_state: str
    reason: Optional[str] = None