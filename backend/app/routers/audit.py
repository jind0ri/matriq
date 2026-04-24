from fastapi import APIRouter, Depends, HTTPException
from ..services.auth_service import require_roles
from ..config import ROLE_ADMIN
from ..database import fetchall

router = APIRouter()

@router.get("/audit-logs")
def get_audit_logs(current_user=Depends(require_roles(ROLE_ADMIN))):
    rows = fetchall(
        """
        SELECT audit_id, user_id, sample_id, action,
               endpoint_accessed, old_value, new_value,
               ip_address, timestamp
        FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT 200
        """
    )

    return rows