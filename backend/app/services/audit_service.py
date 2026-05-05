from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path

from ..config import AUDIT_LOG_PATH
from ..database import execute

AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _safe_int(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _safe_sample_id(value):
    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    return text


def log_event(*, action: str, endpoint_accessed: str, user_id=None, sample_id=None, old_value=None, new_value=None, ip_address=None):
    db_user_id = _safe_int(user_id)
    db_sample_id = _safe_sample_id(sample_id)

    execute(
        '''
        INSERT INTO audit_logs (user_id, sample_id, action, endpoint_accessed, old_value, new_value, ip_address, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''',
        (
            db_user_id,
            db_sample_id,
            action,
            endpoint_accessed,
            json.dumps(old_value) if old_value is not None else None,
            json.dumps(new_value) if new_value is not None else None,
            ip_address,
            now_iso(),
        ),
    )

    with Path(AUDIT_LOG_PATH).open("a", encoding="utf-8") as handle:
        handle.write(json.dumps({
            "timestamp": now_iso(),
            "user_id": user_id,
            "sample_id": sample_id,
            "action": action,
            "endpoint_accessed": endpoint_accessed,
            "old_value": old_value,
            "new_value": new_value,
            "ip_address": ip_address,
        }) + "\n")