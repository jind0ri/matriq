from typing import List

from .auth_service import MOCK_USERS, get_user_by_email, get_user_by_id, hash_password
from .branch_service import get_branch_by_name


VALID_ROLES = {
    "administrator",
    "technician",
    "senior_technician",
    "qa_engineer",
    "accounting",
}


def get_users_service() -> List[dict]:
    return [
        {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "branch": user["branch"],
            "is_active": user["is_active"],
        }
        for user in MOCK_USERS
    ]


def create_user_service(user_data) -> dict:
    if user_data.role not in VALID_ROLES:
        raise ValueError("Invalid role")

    if get_user_by_email(user_data.email):
        raise ValueError("User with this email already exists")

    if not get_branch_by_name(user_data.branch):
        raise ValueError("Assigned branch does not exist")

    new_user = {
        "user_id": max([u["user_id"] for u in MOCK_USERS], default=0) + 1,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "branch": user_data.branch,
        "is_active": user_data.is_active,
        "password_hash": hash_password(user_data.password),
    }

    MOCK_USERS.append(new_user)

    return {
        "user_id": new_user["user_id"],
        "email": new_user["email"],
        "full_name": new_user["full_name"],
        "role": new_user["role"],
        "branch": new_user["branch"],
        "is_active": new_user["is_active"],
    }


def update_user_service(user_id: int, user_data) -> dict:
    user = get_user_by_id(user_id)
    if not user:
        raise ValueError("User not found")

    if user_data.role is not None:
        if user_data.role not in VALID_ROLES:
            raise ValueError("Invalid role")
        user["role"] = user_data.role

    if user_data.full_name is not None:
        user["full_name"] = user_data.full_name

    if user_data.branch is not None:
        if not get_branch_by_name(user_data.branch):
            raise ValueError("Assigned branch does not exist")
        user["branch"] = user_data.branch

    if user_data.is_active is not None:
        user["is_active"] = user_data.is_active

    if user_data.password is not None and user_data.password.strip():
        user["password_hash"] = hash_password(user_data.password)

    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "branch": user["branch"],
        "is_active": user["is_active"],
    }


def delete_user_service(user_id: int) -> None:
    user = get_user_by_id(user_id)
    if not user:
        raise ValueError("User not found")

    MOCK_USERS.remove(user)