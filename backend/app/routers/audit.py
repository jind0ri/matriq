from fastapi import APIRouter, Depends

from ..config import ROLE_ADMIN
from ..database import fetchall
from ..services.auth_service import require_roles

router = APIRouter(prefix="/api", tags=["Audit"])


@router.get("/audit-logs")
def get_audit_logs(current_user=Depends(require_roles(ROLE_ADMIN))):
    return fetchall(
        """
        SELECT
            user_id,
            sample_id,
            action,
            endpoint_accessed,
            old_value,
            new_value,
            ip_address,
            timestamp
        FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT 200
        """
    )