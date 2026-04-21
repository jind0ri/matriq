from pydantic import BaseModel
from typing import Optional


class BranchCreate(BaseModel):
    branch_name: str
    location: str
    sample_prefix: str
    allow_registration: bool = True
    allow_release: bool = True
    is_active: bool = True


class BranchUpdate(BaseModel):
    branch_name: Optional[str] = None
    location: Optional[str] = None
    sample_prefix: Optional[str] = None
    allow_registration: Optional[bool] = None
    allow_release: Optional[bool] = None
    is_active: Optional[bool] = None


class BranchResponse(BaseModel):
    branch_id: int
    branch_name: str
    location: str
    sample_prefix: str
    allow_registration: bool
    allow_release: bool
    is_active: bool