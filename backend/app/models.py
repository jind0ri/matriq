from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

# ----------------------------
# User model
# ----------------------------
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)

# ----------------------------
# Sample model
# ----------------------------
class Sample(Base):
    __tablename__ = "samples"

    sample_id = Column(Integer, primary_key=True, index=True)
    material_type = Column(String)
    client_name = Column(String)
    intake_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    lifecycle_state = Column(String, default="Registered")
    is_immutable = Column(Boolean, default=False)
    registered_by = Column(Integer, ForeignKey("users.user_id"))

    registered_user = relationship("User")