from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    event_type: str
    performed_by: str
    role: str
    action: str
    status: str
    timestamp: str
    details: str | None = None