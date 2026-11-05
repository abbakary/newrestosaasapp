"""User and Waiter models."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True)
    role = Column(String, nullable=False)   # superadmin|owner|manager|cashier|waiter|chef|storekeeper|production|customer
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    email = Column(String)
    title = Column(String)
    waiter_id = Column(String, ForeignKey("waiters.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")
    waiter = relationship("Waiter", back_populates="user", foreign_keys=[waiter_id])


class Waiter(Base):
    __tablename__ = "waiters"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    token = Column(String, unique=True, nullable=False)   # short QR token
    active = Column(Boolean, default=True)
    tables = Column(JSON, default=[])
    avatar = Column(String)

    user = relationship("User", back_populates="waiter", foreign_keys=[User.waiter_id])
