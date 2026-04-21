from typing import List, Optional


BRANCHES_DB: List[dict] = [
    {
        "branch_id": 1,
        "branch_name": "Marikina",
        "location": "Marikina City",
        "sample_prefix": "MRS",
        "allow_registration": True,
        "allow_release": True,
        "is_active": True,
    },
    {
        "branch_id": 2,
        "branch_name": "Pateros",
        "location": "Pateros",
        "sample_prefix": "PRS",
        "allow_registration": True,
        "allow_release": True,
        "is_active": True,
    },
]


def get_branches_service() -> List[dict]:
    return BRANCHES_DB


def get_branch_by_id(branch_id: int) -> Optional[dict]:
    for branch in BRANCHES_DB:
        if branch["branch_id"] == branch_id:
            return branch
    return None


def get_branch_by_name(branch_name: str) -> Optional[dict]:
    for branch in BRANCHES_DB:
        if branch["branch_name"].lower() == branch_name.lower():
            return branch
    return None


def create_branch_service(branch_data) -> dict:
    if get_branch_by_name(branch_data.branch_name):
        raise ValueError("Branch already exists")

    new_branch = {
        "branch_id": max([b["branch_id"] for b in BRANCHES_DB], default=0) + 1,
        "branch_name": branch_data.branch_name,
        "location": branch_data.location,
        "sample_prefix": branch_data.sample_prefix,
        "allow_registration": branch_data.allow_registration,
        "allow_release": branch_data.allow_release,
        "is_active": branch_data.is_active,
    }

    BRANCHES_DB.append(new_branch)
    return new_branch


def update_branch_service(branch_id: int, branch_data) -> dict:
    branch = get_branch_by_id(branch_id)
    if not branch:
        raise ValueError("Branch not found")

    if branch_data.branch_name is not None:
        existing = get_branch_by_name(branch_data.branch_name)
        if existing and existing["branch_id"] != branch_id:
            raise ValueError("Another branch already uses this name")
        branch["branch_name"] = branch_data.branch_name

    if branch_data.location is not None:
        branch["location"] = branch_data.location

    if branch_data.sample_prefix is not None:
        branch["sample_prefix"] = branch_data.sample_prefix

    if branch_data.allow_registration is not None:
        branch["allow_registration"] = branch_data.allow_registration

    if branch_data.allow_release is not None:
        branch["allow_release"] = branch_data.allow_release

    if branch_data.is_active is not None:
        branch["is_active"] = branch_data.is_active

    return branch


def delete_branch_service(branch_id: int) -> None:
    branch = get_branch_by_id(branch_id)
    if not branch:
        raise ValueError("Branch not found")

    BRANCHES_DB.remove(branch)