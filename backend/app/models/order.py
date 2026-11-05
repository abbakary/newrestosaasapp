"""Order, OrderItem, CommissionLedger models."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    no = Column(String, unique=True)
    src = Column(String, default="TABLE_QR")    # TABLE_QR|WALKIN_WAITER|POS|ONLINE_ORDER|CASHIER
    order_type = Column(String, default="Dine In")
    table = Column(String)
    guests = Column(Integer, default=1)
    waiter_id = Column(String, ForeignKey("waiters.id"), nullable=True)
    customer_id = Column(String, nullable=True)  # guest session id or user id
    status = Column(String, default="placed")    # placed|accepted|preparing|ready|served|billreq|paid|closed|cancelled
    paid = Column(Boolean, default=False)
    payment_method = Column(String)              # cash|momo|card|online|ewallet
    pay_ref = Column(String)
    gross = Column(Float, default=0)
    net = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    discount_pct = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    discount_reason = Column(String)
    cancel_reason = Column(String)
    online = Column(Boolean, default=False)
    notes = Column(Text)
    log = Column(JSON, default=[])
    items = Column(JSON, default=[])             # [{id, q, note, mods, done, voided}]
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    waiter = relationship("Waiter")


class CommissionLedger(Base):
    __tablename__ = "commission_ledger"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    order_id = Column(String, ForeignKey("orders.id"))
    waiter_id = Column(String, ForeignKey("waiters.id"))
    method = Column(String, default="percent")   # percent|fixed
    rate = Column(Float, default=5)
    basis = Column(String, default="gross")      # gross|net
    eligible_amount = Column(Float, default=0)
    amount = Column(Float, default=0)
    status = Column(String, default="pending")   # pending|approved|paid|reversed
    reversal_of_id = Column(String, nullable=True)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order")
    waiter = relationship("Waiter")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    ts = Column(DateTime, default=datetime.utcnow)
    user = Column(String)
    action = Column(String)
    detail = Column(Text)
