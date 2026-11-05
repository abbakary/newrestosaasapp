"""Full double-entry accounting models.
Follows Odoo chart of accounts structure for Tanzania.
Modules: Chart of Accounts, Customers, Vendors, Invoices, Bills,
         Payments, Journal Entries, Bank Accounts, and all report structures.
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


# ─── Chart of Accounts ────────────────────────────────────────────────────────

class AccountAccount(Base):
    __tablename__ = "account_accounts"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    account_type = Column(String)   # asset|liability|income|expense|equity|receivable|payable
    category = Column(String)       # Bank & Cash|Receivables|Income|COGS|etc.
    normal_balance = Column(String, default="debit")    # debit|credit
    active = Column(Boolean, default=True)
    centralized = Column(Boolean, default=False)    # hide line details in GL (zalongwa pattern)
    notes = Column(Text)

    # Relationships
    invoice_lines = relationship("InvoiceLine", back_populates="account",
                                  foreign_keys="InvoiceLine.account_id")
    journal_lines = relationship("JournalEntryLine", back_populates="account",
                                  foreign_keys="JournalEntryLine.account_id")


# ─── Partners ─────────────────────────────────────────────────────────────────

class AccountPartner(Base):
    """Customer or Vendor."""
    __tablename__ = "account_partners"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    partner_type = Column(String, nullable=False)   # customer|vendor
    name = Column(String, nullable=False)
    ref = Column(String)
    phone = Column(String)
    email = Column(String)
    type = Column(String, default="company")    # company|individual
    credit_limit = Column(Float, default=0)
    country = Column(String, default="TZ")
    city = Column(String)
    balance = Column(Float, default=0)
    overdue_balance = Column(Float, default=0)
    tin = Column(String)
    vrn = Column(String)
    notes = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── Invoices / Bills ─────────────────────────────────────────────────────────

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    number = Column(String, unique=True)
    invoice_date = Column(String)
    due_date = Column(String)
    partner_id = Column(String, ForeignKey("account_partners.id"), nullable=True)
    partner_name = Column(String)
    move_type = Column(String, nullable=False)   # out_invoice|in_invoice|out_refund|in_refund
    state = Column(String, default="draft")      # draft|posted|open|paid|cancelled
    currency = Column(String, default="TZS")
    subtotal = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    amount_paid = Column(Float, default=0)
    amount_due = Column(Float, default=0)
    ref = Column(String)
    notes = Column(Text)
    journal_entry_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    partner = relationship("AccountPartner")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(String, primary_key=True)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False)
    description = Column(String)
    account_id = Column(String, ForeignKey("account_accounts.id"), nullable=True)
    account_code = Column(String)
    quantity = Column(Float, default=1)
    unit_price = Column(Float, default=0)
    tax_rate = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    subtotal = Column(Float, default=0)
    total = Column(Float, default=0)

    invoice = relationship("Invoice", back_populates="lines")
    account = relationship("AccountAccount", back_populates="invoice_lines",
                            foreign_keys=[account_id])


# ─── Payments ─────────────────────────────────────────────────────────────────

class AccountPayment(Base):
    __tablename__ = "account_payments"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    number = Column(String, unique=True)
    payment_date = Column(String)
    partner_id = Column(String, ForeignKey("account_partners.id"), nullable=True)
    partner_name = Column(String)
    payment_type = Column(String)   # inbound|outbound
    amount = Column(Float, default=0)
    method = Column(String, default="bank")     # bank|cash|mobile_money
    journal = Column(String, default="Bank")
    ref = Column(String)
    memo = Column(Text)
    state = Column(String, default="posted")    # draft|posted|reconciled
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=True)
    journal_entry_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    partner = relationship("AccountPartner")
    invoice = relationship("Invoice")


# ─── Journal Entries ──────────────────────────────────────────────────────────

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    number = Column(String, unique=True)
    entry_date = Column(String)
    journal = Column(String)
    state = Column(String, default="posted")    # draft|posted|cancelled
    ref = Column(String)
    notes = Column(Text)
    source = Column(String)     # manual|payroll|invoice|payment|etc.
    total_debit = Column(Float, default=0)
    total_credit = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    posted_at = Column(DateTime, nullable=True)

    lines = relationship("JournalEntryLine", back_populates="entry", cascade="all, delete-orphan")


class JournalEntryLine(Base):
    __tablename__ = "journal_entry_lines"

    id = Column(String, primary_key=True)
    entry_id = Column(String, ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(String, ForeignKey("account_accounts.id"), nullable=True)
    account_code = Column(String)
    account_name = Column(String)
    partner_name = Column(String)
    debit = Column(Float, default=0)
    credit = Column(Float, default=0)
    label = Column(String)
    analytic_account = Column(String)

    entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("AccountAccount", back_populates="journal_lines",
                            foreign_keys=[account_id])


# ─── Bank Accounts ────────────────────────────────────────────────────────────

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    bank_name = Column(String)
    account_number = Column(String)
    currency = Column(String, default="TZS")
    balance = Column(Float, default=0)
    last_sync = Column(String)
    active = Column(Boolean, default=True)
