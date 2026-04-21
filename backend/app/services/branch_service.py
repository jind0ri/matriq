from typing import List, Optional

from sqlalchemy.orm import Session

from ..models import Branch


def get_branches_service(db: Session) -> List[Branch]:
    return db.query(Branch).order_by(Branch.branch_id.asc()).all()


def get_branch_by_id(db: Session, branch_id: int) -> Optional[Branch]:
    return db.query(Branch).filter(Branch.branch_id == branch_id).first()


def get_branch_by_name(db: Session, branch_name: str) -> Optional[Branch]:
    return db.query(Branch).filter(Branch.branch_name == branch_name).first()


def create_branch_service(db: Session, branch_data) -> Branch:
    if get_branch_by_name(db, branch_data.branch_name):
        raise ValueError("Branch already exists")

    new_branch = Branch(
        branch_name=branch_data.branch_name,
        location=branch_data.location,
        status="Active" if branch_data.is_active else "Inactive",
    )

    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return new_branch


def update_branch_service(db: Session, branch_id: int, branch_data) -> Branch:
    branch = get_branch_by_id(db, branch_id)
    if not branch:
        raise ValueError("Branch not found")

    if branch_data.branch_name is not None:
        existing = get_branch_by_name(db, branch_data.branch_name)
        if existing and existing.branch_id != branch_id:
            raise ValueError("Another branch already uses this name")
        branch.branch_name = branch_data.branch_name

    if branch_data.location is not None:
        branch.location = branch_data.location

    if branch_data.is_active is not None:
        branch.status = "Active" if branch_data.is_active else "Inactive"

    db.commit()
    db.refresh(branch)
    return branch


def delete_branch_service(db: Session, branch_id: int) -> None:
    branch = get_branch_by_id(db, branch_id)
    if not branch:
        raise ValueError("Branch not found")

    db.delete(branch)
    db.commit()