from datetime import datetime
from typing import Dict, List, Optional


AUDIT_LOGS: List[Dict] = []


def log_audit_event(
    event_type: str,
    performed_by: str,
    role: str,
    action: str,
    status: str = "SUCCESS",
    details: Optional[str] = None,
):
    entry = {
        "event_type": event_type,
        "performed_by": performed_by,
        "role": role,
        "action": action,
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "details": details,
    }
    AUDIT_LOGS.append(entry)
    return entry


def get_audit_logs_service():
    return AUDIT_LOGS