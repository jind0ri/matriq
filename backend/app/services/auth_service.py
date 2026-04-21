from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from ..config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


MOCK_USERS: List[Dict] = [
    {
        "user_id": 1,
        "email": "admin@matriq.com",
        "full_name": "Admin User",
        "role": "administrator",
        "branch": "Marikina",
        "is_active": True,
        "password_hash": pwd_context.hash("Admin123!"),
    },
    {
        "user_id": 2,
        "email": "technician@matriq.com",
        "full_name": "Tech. Jon",
        "role": "technician",
        "branch": "Marikina",
        "is_active": True,
        "password_hash": pwd_context.hash("Tech123!"),
    },
    {
        "user_id": 3,
        "email": "senior@matriq.com",
        "full_name": "Senior Technician",
        "role": "senior_technician",
        "branch": "Pateros",
        "is_active": True,
        "password_hash": pwd_context.hash("Senior123!"),
    },
    {
        "user_id": 4,
        "email": "qa@matriq.com",
        "full_name": "QA Engineer",
        "role": "qa_engineer",
        "branch": "Pateros",
        "is_active": True,
        "password_hash": pwd_context.hash("Qa12345!"),
    },
    {
        "user_id": 5,
        "email": "accounting@matriq.com",
        "full_name": "Accounting User",
        "role": "accounting",
        "branch": "Marikina",
        "is_active": True,
        "password_hash": pwd_context.hash("Acct123!"),
    },
]


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def get_user_by_email(email: str) -> Optional[Dict]:
    for user in MOCK_USERS:
        if user["email"].lower() == email.lower():
            return user
    return None


def get_user_by_id(user_id: int) -> Optional[Dict]:
    for user in MOCK_USERS:
        if user["user_id"] == user_id:
            return user
    return None


def authenticate_user(email: str, password: str) -> Optional[Dict]:
    user = get_user_by_email(email)
    if not user:
        return None

    if not user["is_active"]:
        return None

    if not verify_password(password, user["password_hash"]):
        return None

    return user


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access",
        }
    )

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "refresh",
        }
    )

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc


def build_token_payload(user: Dict) -> Dict:
    return {
        "sub": user["email"],
        "user_id": user["user_id"],
        "role": user["role"],
        "branch": user["branch"],
        "full_name": user["full_name"],
    }