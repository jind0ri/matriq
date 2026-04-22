from sqlalchemy.orm import Session

from ..models import AuditLog


def log_audit_event(
    db: Session,
    user_id: int,
    action: str,
    endpoint: str,
    old_value=None,
    new_value=None,
    sample_id: int = None,
):
    entry = AuditLog(
        user_id=user_id,
        sample_id=sample_id,
        action=action,
        endpoint_accessed=endpoint,
        old_value=old_value if old_value is not None else None,
        new_value=new_value if new_value is not None else None,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


def get_audit_logs_service(db: Session):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()