"""Shared mixins and imports for all models."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, func
from app.database import Base


def new_id(prefix: str = "") -> str:
    return prefix + uuid.uuid4().hex[:12]


def utcnow():
    return datetime.now(timezone.utc)
