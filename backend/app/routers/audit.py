from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.audit import AuditLogResponse
from ..services.audit_service import get_audit_logs_service
from .auth import require_roles

router = APIRouter()


@router.get("/", response_model=List[AuditLogResponse])
def list_audit_logs(
    current_user=Depends(require_roles(["Administrator"])),
    db: Session = Depends(get_db),
):
    return get_audit_logs_service(db)