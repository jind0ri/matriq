from fastapi import APIRouter, Depends
from ..database import fetchall
from ..services.auth_service import require_roles
from ..config import ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN

router = APIRouter(prefix="/api/test-codes", tags=["Test Codes"])


@router.get("")
def get_active_test_codes(
    current_user=Depends(require_roles(
        ROLE_LAB_TECH,
        ROLE_SENIOR_TECH,
        ROLE_QA,
        ROLE_ADMIN
    ))
):
    rows = fetchall(
        """
        SELECT
            tc.code,
            tc.name,
            tc.category,
            tc.standard,
            tc.unit_price,
            tc.test_type
        FROM test_codes tc
        JOIN system_active_test_codes sat
            ON tc.code = sat.code
        WHERE sat.is_active = TRUE
        ORDER BY tc.category, tc.code
        """
    )

    return {"test_codes": rows}