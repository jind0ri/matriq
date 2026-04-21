from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Double,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Branch(Base):
    __tablename__ = "branches"

    branch_id = Column(Integer, primary_key=True, index=True)
    branch_name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    status = Column(String, default="Active")

    users = relationship("User", back_populates="branch")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.branch_id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    branch = relationship("Branch", back_populates="users")


class Sample(Base):
    __tablename__ = "samples"

    id = Column(String, primary_key=True, index=True)
    sample_id = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    project_id = Column(String, nullable=False)
    branch_id = Column(String)
    registered_by_user_id = Column(String)
    registered_by_role = Column(String)
    material_type = Column(String, nullable=False)
    ai_predicted_label = Column(String)
    ai_confidence_score = Column(Double)
    model_version = Column(String)
    status = Column(String, nullable=False)
    decision = Column(String, nullable=False)
    notes = Column(Text)
    project_reference = Column(String)
    current_state = Column(String, default="Registered")
    registered_by = Column(Integer, ForeignKey("users.user_id"))
    is_immutable = Column(Boolean, default=False)
    intake_timestamp = Column(DateTime, server_default=func.now())
    image_path = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    sample_id = Column(Integer)
    action = Column(String, nullable=False)
    endpoint_accessed = Column(String)
    old_value = Column(Text)
    new_value = Column(Text)
    timestamp = Column(DateTime, server_default=func.now())


class ManualValidation(Base):
    __tablename__ = "manual_validations"

    validation_id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, unique=True)
    original_ai_label = Column(String, nullable=False)
    corrected_label = Column(String, nullable=False)
    justification = Column(Text, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.user_id"))
    timestamp = Column(DateTime, server_default=func.now())