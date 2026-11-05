"""Settings, Checklists, Expenses, Shift models."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from app.database import Base


class TenantSettings(Base):
    __tablename__ = "tenant_settings"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, unique=True, nullable=False)

    # VAT settings
    vat_enabled = Column(Boolean, default=True)
    vat_rate = Column(Float, default=18.0)
    vat_inclusive = Column(Boolean, default=True)
    tax_number = Column(String)
    vrn = Column(String)
    tax_label = Column(String, default="VAT 18%")

    # Commission policy
    commission_method = Column(String, default="percent")   # percent|fixed|tiered
    commission_rate = Column(Float, default=5.0)
    commission_fixed = Column(Float, default=2000)
    commission_basis = Column(String, default="gross")      # gross|net
    commission_trigger = Column(String, default="payment")  # payment|served
    commission_overrides = Column(JSON, default={})         # {waiterId: rate}

    # Kitchen tracking
    kitchen_tracking_mode = Column(String, default="simple")    # simple|recipe

    # Shift
    shift_state = Column(String, default="live_service")    # opening_prep|live_service|day_closed

    # Opening float
    opening_float = Column(Float, default=200000)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Checklist(Base):
    __tablename__ = "checklists"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    checklist_type = Column(String, default="opening")  # opening|closing|haccp
    date = Column(String)
    completed = Column(Boolean, default=False)
    signed_by = Column(String)
    items = Column(JSON, default=[])    # [{text, done}]
    created_at = Column(DateTime, default=datetime.utcnow)


class Expense(Base):
    """Operational expense logged by manager/owner (OPEX)."""
    __tablename__ = "expenses"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    expense_date = Column(DateTime, default=datetime.utcnow)
    category = Column(String)   # utilities|supplies|repairs|marketing|other
    name = Column(String)
    amount = Column(Float, default=0)
    method = Column(String, default="cash")     # cash|bank|mpesa
    ref = Column(String)
    recorded_by = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
