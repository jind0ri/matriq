from pydantic import BaseModel
from typing import Optional


class SampleCreate(BaseModel):
    material_type: str
    client_name: str


class SampleResponse(BaseModel):
    sample_id: int
    material_type: str
    client_name: str
    lifecycle_state: str

    class Config:
        from_attributes = True


class SampleStatusUpdate(BaseModel):
    lifecycle_state: str
    reason: Optional[str] = None