from typing import List

from sqlalchemy.orm import Session

from .auth_service import get_user_by_id, get_user_by_username, hash_password
from .branch_service import get_branch_by_id
from ..models import User


VALID_ROLES = {
    "Administrator",
    "Lab Technician",
    "Senior Technician",
    "QA Engineer",
    "Accounting Staff",
}


def get_users_service(db: Session) -> List[User]:
    return db.query(User).order_by(User.user_id.asc()).all()


def create_user_service(db: Session, user_data) -> User:
    if user_data.role not in VALID_ROLES:
        raise ValueError("Invalid role")

    if get_user_by_username(db, user_data.username):
        raise ValueError("User with this username already exists")

    if user_data.branch_id is not None and not get_branch_by_id(user_data.branch_id):
        raise ValueError("Assigned branch does not exist")

    new_user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        branch_id=user_data.branch_id,
        is_active=user_data.is_active,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def update_user_service(db: Session, user_id: int, user_data) -> User:
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("User not found")

    if user_data.role is not None:
        if user_data.role not in VALID_ROLES:
            raise ValueError("Invalid role")
        user.role = user_data.role

    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    if user_data.branch_id is not None:
        if not get_branch_by_id(user_data.branch_id):
            raise ValueError("Assigned branch does not exist")
        user.branch_id = user_data.branch_id

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    if user_data.password is not None and user_data.password.strip():
        user.password_hash = hash_password(user_data.password)

    db.commit()
    db.refresh(user)
    return user


def delete_user_service(db: Session, user_id: int) -> None:
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("User not found")

    db.delete(user)
    db.commit()