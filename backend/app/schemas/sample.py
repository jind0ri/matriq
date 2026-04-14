from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Used when creating a new sample
class SampleCreate(BaseModel):
    material_type: str
    client_name: str
    registered_by: Optional[int]

# Used for API responses
class SampleResponse(BaseModel):
    sample_id: int
    material_type: str
    client_name: str
    intake_timestamp: datetime
    lifecycle_state: str