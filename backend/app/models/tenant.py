"""Tenant (SaaS multi-tenant) and Package models."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Package(Base):
    __tablename__ = "packages"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    tagline = Column(String)
    price_monthly = Column(Float, default=0)
    price_annual = Column(Float, default=0)
    popular = Column(Boolean, default=False)
    color = Column(String, default="#1C7A4B")
    icon = Column(String, default="🍽️")
    limits = Column(JSON, default={})        # branches, tables, staffUsers, etc.
    modules = Column(JSON, default=[])
    features = Column(JSON, default=[])
    active = Column(Boolean, default=True)

    tenants = relationship("Tenant", back_populates="package")


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    domain = Column(String)
    concept = Column(String)
    package_id = Column(String, ForeignKey("packages.id"))
    billing_cycle = Column(String, default="monthly")   # monthly | annual
    status = Column(String, default="trial")            # active | trial | overdue | suspended
    is_trial = Column(Boolean, default=True)
    city = Column(String)
    country = Column(String, default="Tanzania")
    currency = Column(String, default="TSh")
    admin_name = Column(String)
    admin_email = Column(String)
    admin_phone = Column(String)
    branches_count = Column(Integer, default=1)
    tables_count = Column(Integer, default=16)
    staff_count = Column(Integer, default=10)
    logo_emoji = Column(String, default="🍽️")
    payment_method = Column(String)
    payment_ref = Column(String)
    monthly_fee = Column(Float, default=0)
    mrr = Column(Float, default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    renewal_date = Column(DateTime)
    is_active = Column(Boolean, default=True)

    package = relationship("Package", back_populates="tenants")
    users = relationship("User", back_populates="tenant")
    saas_invoices = relationship("SaasInvoice", back_populates="tenant")


class SaasInvoice(Base):
    __tablename__ = "saas_invoices"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    no = Column(String, unique=True)
    period = Column(String)         # e.g. "2026-11"
    amount = Column(Float, default=0)
    status = Column(String, default="unpaid")   # unpaid | paid | overdue | refunded
    due_date = Column(String)
    paid_date = Column(String)
    package_name = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="saas_invoices")


class SaasLog(Base):
    __tablename__ = "saas_logs"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True)
    action = Column(String)
    detail = Column(Text)
    by = Column(String)
    ts = Column(DateTime, default=datetime.utcnow)
