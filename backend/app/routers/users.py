from fastapi import APIRouter, Depends

from ..config import ROLE_ADMIN
from ..database import fetchall
from ..services.auth_service import require_roles

router = APIRouter(prefix="/api", tags=["Users"])


@router.get("/users")
def list_users(current_user=Depends(require_roles(ROLE_ADMIN))):
    return fetchall(
        """
        SELECT
            user_id,
            username,
            full_name,
            role,
            branch_id,
            is_active
        FROM users
        ORDER BY user_id ASC
        """
    )