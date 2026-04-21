from typing import List

from fastapi import APIRouter, Depends

from ..schemas.audit import AuditLogResponse
from ..services.audit_service import get_audit_logs_service
from .auth import require_roles

router = APIRouter()


@router.get("/", response_model=List[AuditLogResponse])
def list_audit_logs(current_user=Depends(require_roles(["Administrator"]))):
    return get_audit_logs_service()