"""Accounting router — full double-entry accounting.
Covers: Chart of Accounts, Customers, Vendors, Customer Invoices, Vendor Bills,
Payments, Journal Entries, Bank Accounts, and all financial reports.
Follows zalongwa_accounting_pdf_reports & Odoo account.* patterns.
"""
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel

from app.database import get_db
from app.models.accounting import (
    AccountAccount, AccountPartner, Invoice, InvoiceLine,
    AccountPayment, JournalEntry, JournalEntryLine, BankAccount,
)

router = APIRouter(prefix="/api/accounting", tags=["accounting"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: str
    category: Optional[str] = None
    normal_balance: Optional[str] = "debit"
    centralized: Optional[bool] = False
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class PartnerCreate(BaseModel):
    partner_type: str   # customer|vendor
    name: str
    ref: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    type: Optional[str] = "company"
    credit_limit: Optional[float] = 0
    country: Optional[str] = "TZ"
    city: Optional[str] = None
    tin: Optional[str] = None
    vrn: Optional[str] = None
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class InvoiceLineCreate(BaseModel):
    description: str
    account_id: Optional[str] = None
    account_code: Optional[str] = None
    quantity: Optional[float] = 1
    unit_price: float
    tax_rate: Optional[float] = 18.0

class InvoiceCreate(BaseModel):
    move_type: str  # out_invoice|in_invoice|out_refund|in_refund
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    lines: List[InvoiceLineCreate]
    ref: Optional[str] = None
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class InvoiceUpdate(BaseModel):
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    ref: Optional[str] = None
    notes: Optional[str] = None
    state: Optional[str] = None

class PaymentCreate(BaseModel):
    payment_date: Optional[str] = None
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    payment_type: str   # inbound|outbound
    amount: float
    method: Optional[str] = "bank"
    journal: Optional[str] = "Bank"
    ref: Optional[str] = None
    memo: Optional[str] = None
    invoice_id: Optional[str] = None
    tenant_id: Optional[str] = None

class JournalEntryCreate(BaseModel):
    entry_date: Optional[str] = None
    journal: str
    ref: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = "manual"
    lines: List[dict]   # [{account_code, account_name, partner_name, debit, credit, label}]
    tenant_id: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _today() -> str:
    return date.today().isoformat()


def _next_number(db: Session, prefix: str, model, field_name: str = "number") -> str:
    count = db.query(model).count()
    year = datetime.utcnow().year
    return f"{prefix}/{year}/{count + 1:04d}"


def _calc_invoice_totals(lines: list) -> tuple:
    subtotal = sum(l.get("subtotal", l.get("unit_price", 0) * l.get("quantity", 1)) for l in lines)
    tax_amount = sum(l.get("tax_amount", 0) for l in lines)
    total = subtotal + tax_amount
    return round(subtotal, 2), round(tax_amount, 2), round(total, 2)


def _invoice_dict(inv: Invoice) -> dict:
    return {
        "id": inv.id, "number": inv.number, "invoice_date": inv.invoice_date,
        "due_date": inv.due_date, "partner_id": inv.partner_id,
        "partner_name": inv.partner_name, "move_type": inv.move_type,
        "state": inv.state, "currency": inv.currency,
        "subtotal": inv.subtotal, "tax_amount": inv.tax_amount,
        "total": inv.total, "amount_paid": inv.amount_paid,
        "amount_due": inv.amount_due, "ref": inv.ref, "notes": inv.notes,
        "lines": [_line_dict(l) for l in (inv.lines or [])],
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


def _line_dict(l: InvoiceLine) -> dict:
    return {
        "id": l.id, "description": l.description, "account_id": l.account_id,
        "account_code": l.account_code, "quantity": l.quantity,
        "unit_price": l.unit_price, "tax_rate": l.tax_rate,
        "tax_amount": l.tax_amount, "subtotal": l.subtotal, "total": l.total,
    }


def _partner_dict(p: AccountPartner) -> dict:
    return {
        "id": p.id, "partner_type": p.partner_type, "name": p.name,
        "ref": p.ref, "phone": p.phone, "email": p.email, "type": p.type,
        "credit_limit": p.credit_limit, "country": p.country, "city": p.city,
        "balance": p.balance, "overdue_balance": p.overdue_balance,
        "tin": p.tin, "vrn": p.vrn, "notes": p.notes,
    }


# ── Chart of Accounts ─────────────────────────────────────────────────────────

@router.get("/chart-of-accounts")
def list_coa(
    account_type: Optional[str] = None,
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AccountAccount).filter(AccountAccount.active == True)
    if account_type:
        q = q.filter(AccountAccount.account_type == account_type)
    accounts = q.order_by(AccountAccount.code).all()
    return [
        {"id": a.id, "code": a.code, "name": a.name, "account_type": a.account_type,
         "category": a.category, "normal_balance": a.normal_balance,
         "centralized": a.centralized}
        for a in accounts
    ]


@router.post("/chart-of-accounts", status_code=201)
def create_account(body: AccountCreate, db: Session = Depends(get_db)):
    acc = AccountAccount(
        id="acc_" + uuid.uuid4().hex[:8],
        **body.model_dump(),
    )
    db.add(acc)
    db.commit()
    return {"id": acc.id, "code": acc.code, "name": acc.name}


@router.put("/chart-of-accounts/{acc_id}")
def update_account(acc_id: str, body: dict, db: Session = Depends(get_db)):
    acc = db.query(AccountAccount).filter(AccountAccount.id == acc_id).first()
    if not acc:
        raise HTTPException(404, "Account not found")
    for k, v in body.items():
        if hasattr(acc, k):
            setattr(acc, k, v)
    db.commit()
    return {"id": acc.id}


# ── Customers ─────────────────────────────────────────────────────────────────

@router.get("/customers")
def list_customers(search: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(AccountPartner).filter(
        AccountPartner.partner_type == "customer",
        AccountPartner.active == True
    )
    if search:
        q = q.filter(AccountPartner.name.ilike(f"%{search}%"))
    return [_partner_dict(p) for p in q.all()]


@router.post("/customers", status_code=201)
def create_customer(body: PartnerCreate, db: Session = Depends(get_db)):
    body.partner_type = "customer"
    count = db.query(AccountPartner).filter(AccountPartner.partner_type == "customer").count()
    p = AccountPartner(
        id="cust_" + uuid.uuid4().hex[:8],
        ref=f"CUST-{count + 1:03d}",
        **body.model_dump(),
    )
    db.add(p)
    db.commit()
    return _partner_dict(p)


@router.put("/customers/{partner_id}")
def update_customer(partner_id: str, body: dict, db: Session = Depends(get_db)):
    p = db.query(AccountPartner).filter(AccountPartner.id == partner_id).first()
    if not p:
        raise HTTPException(404, "Customer not found")
    for k, v in body.items():
        if hasattr(p, k):
            setattr(p, k, v)
    db.commit()
    return _partner_dict(p)


# ── Vendors ────────────────────────────────────────────────────────────────────

@router.get("/vendors")
def list_vendors(search: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(AccountPartner).filter(
        AccountPartner.partner_type == "vendor",
        AccountPartner.active == True
    )
    if search:
        q = q.filter(AccountPartner.name.ilike(f"%{search}%"))
    return [_partner_dict(p) for p in q.all()]


@router.post("/vendors", status_code=201)
def create_vendor(body: PartnerCreate, db: Session = Depends(get_db)):
    body.partner_type = "vendor"
    count = db.query(AccountPartner).filter(AccountPartner.partner_type == "vendor").count()
    p = AccountPartner(
        id="vend_" + uuid.uuid4().hex[:8],
        ref=f"VEND-{count + 1:03d}",
        **body.model_dump(),
    )
    db.add(p)
    db.commit()
    return _partner_dict(p)


@router.put("/vendors/{partner_id}")
def update_vendor(partner_id: str, body: dict, db: Session = Depends(get_db)):
    p = db.query(AccountPartner).filter(AccountPartner.id == partner_id).first()
    if not p:
        raise HTTPException(404, "Vendor not found")
    for k, v in body.items():
        if hasattr(p, k):
            setattr(p, k, v)
    db.commit()
    return _partner_dict(p)


# ── Customer Invoices ──────────────────────────────────────────────────────────

@router.get("/invoices")
def list_invoices(
    move_type: Optional[str] = None,
    state: Optional[str] = None,
    partner_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Invoice)
    if move_type:
        q = q.filter(Invoice.move_type == move_type)
    else:
        q = q.filter(Invoice.move_type.in_(["out_invoice", "out_refund"]))
    if state:
        q = q.filter(Invoice.state == state)
    if partner_id:
        q = q.filter(Invoice.partner_id == partner_id)
    return [_invoice_dict(i) for i in q.order_by(Invoice.created_at.desc()).all()]


@router.post("/invoices", status_code=201)
def create_invoice(body: InvoiceCreate, db: Session = Depends(get_db)):
    inv_id = "inv_" + uuid.uuid4().hex[:8]
    prefix = "INV" if "out" in body.move_type else "BILL"
    number = _next_number(db, prefix, Invoice)

    # Compute lines
    db_lines = []
    for i, ln in enumerate(body.lines):
        subtotal = round(ln.unit_price * ln.quantity, 2)
        tax_amount = round(subtotal * ln.tax_rate / 100, 2)
        total = subtotal + tax_amount
        acc = None
        if ln.account_code:
            acc = db.query(AccountAccount).filter(AccountAccount.code == ln.account_code).first()
        db_lines.append(InvoiceLine(
            id=f"invl_{uuid.uuid4().hex[:8]}",
            invoice_id=inv_id,
            description=ln.description,
            account_id=acc.id if acc else None,
            account_code=ln.account_code or (acc.code if acc else None),
            quantity=ln.quantity,
            unit_price=ln.unit_price,
            tax_rate=ln.tax_rate,
            tax_amount=tax_amount,
            subtotal=subtotal,
            total=total,
        ))

    subtotal, tax_amount, total = _calc_invoice_totals([
        {"subtotal": l.subtotal, "tax_amount": l.tax_amount} for l in db_lines
    ])

    partner_name = body.partner_name
    if body.partner_id and not partner_name:
        p = db.query(AccountPartner).filter(AccountPartner.id == body.partner_id).first()
        if p:
            partner_name = p.name

    inv = Invoice(
        id=inv_id,
        tenant_id=body.tenant_id,
        number=number,
        invoice_date=body.invoice_date or _today(),
        due_date=body.due_date,
        partner_id=body.partner_id,
        partner_name=partner_name,
        move_type=body.move_type,
        state="draft",
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        amount_paid=0,
        amount_due=total,
        ref=body.ref,
        notes=body.notes,
    )
    db.add(inv)
    for ln in db_lines:
        db.add(ln)

    db.commit()
    db.refresh(inv)
    return _invoice_dict(inv)


@router.get("/invoices/{inv_id}")
def get_invoice(inv_id: str, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return _invoice_dict(inv)


@router.put("/invoices/{inv_id}")
def update_invoice(inv_id: str, body: InvoiceUpdate, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(inv, k, v)
    inv.updated_at = datetime.utcnow()
    db.commit()
    return _invoice_dict(inv)


@router.post("/invoices/{inv_id}/confirm")
def confirm_invoice(inv_id: str, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.state = "open" if inv.amount_due > 0 else "paid"
    # Create journal entry
    je = _create_invoice_je(db, inv)
    inv.journal_entry_id = je.id
    db.commit()
    return _invoice_dict(inv)


@router.post("/invoices/{inv_id}/register-payment")
def register_payment_on_invoice(inv_id: str, body: PaymentCreate, db: Session = Depends(get_db)):
    """Register payment and reconcile against invoice."""
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    pay_id = "pay_" + uuid.uuid4().hex[:8]
    number = _next_number(db, "PAY", AccountPayment)
    payment = AccountPayment(
        id=pay_id,
        tenant_id=body.tenant_id or inv.tenant_id,
        number=number,
        payment_date=body.payment_date or _today(),
        partner_id=body.partner_id or inv.partner_id,
        partner_name=body.partner_name or inv.partner_name,
        payment_type=body.payment_type,
        amount=body.amount,
        method=body.method,
        journal=body.journal,
        ref=body.ref,
        memo=body.memo or f"Payment for {inv.number}",
        state="posted",
        invoice_id=inv_id,
    )
    db.add(payment)

    # Update invoice balances
    inv.amount_paid = (inv.amount_paid or 0) + body.amount
    inv.amount_due = max(0, inv.total - inv.amount_paid)
    if inv.amount_due <= 0:
        inv.state = "paid"

    # Update partner balance
    if inv.partner_id:
        partner = db.query(AccountPartner).filter(AccountPartner.id == inv.partner_id).first()
        if partner:
            partner.balance = max(0, (partner.balance or 0) - body.amount)

    db.commit()
    db.refresh(payment)
    return {"payment_id": payment.id, "invoice_state": inv.state, "amount_due": inv.amount_due}


# ── Vendor Bills ───────────────────────────────────────────────────────────────

@router.get("/bills")
def list_bills(
    state: Optional[str] = None,
    partner_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Invoice).filter(Invoice.move_type.in_(["in_invoice", "in_refund"]))
    if state:
        q = q.filter(Invoice.state == state)
    if partner_id:
        q = q.filter(Invoice.partner_id == partner_id)
    return [_invoice_dict(i) for i in q.order_by(Invoice.created_at.desc()).all()]


@router.post("/bills", status_code=201)
def create_bill(body: InvoiceCreate, db: Session = Depends(get_db)):
    body.move_type = "in_invoice"
    return create_invoice(body, db)


# ── Payments ───────────────────────────────────────────────────────────────────

@router.get("/payments")
def list_payments(
    payment_type: Optional[str] = None,
    partner_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AccountPayment)
    if payment_type:
        q = q.filter(AccountPayment.payment_type == payment_type)
    if partner_id:
        q = q.filter(AccountPayment.partner_id == partner_id)
    payments = q.order_by(AccountPayment.created_at.desc()).all()
    return [_payment_dict(p) for p in payments]


@router.post("/payments", status_code=201)
def create_payment(body: PaymentCreate, db: Session = Depends(get_db)):
    number = _next_number(db, "PAY", AccountPayment)
    payment = AccountPayment(
        id="pay_" + uuid.uuid4().hex[:8],
        number=number,
        **body.model_dump(),
        state="posted",
    )
    db.add(payment)
    # Update partner balance
    if body.partner_id:
        partner = db.query(AccountPartner).filter(AccountPartner.id == body.partner_id).first()
        if partner:
            if body.payment_type == "inbound":
                partner.balance = max(0, (partner.balance or 0) - body.amount)
            else:
                partner.balance = max(0, (partner.balance or 0) - body.amount)
    db.commit()
    db.refresh(payment)
    return _payment_dict(payment)


def _payment_dict(p: AccountPayment) -> dict:
    return {
        "id": p.id, "number": p.number, "payment_date": p.payment_date,
        "partner_id": p.partner_id, "partner_name": p.partner_name,
        "payment_type": p.payment_type, "amount": p.amount, "method": p.method,
        "journal": p.journal, "ref": p.ref, "memo": p.memo, "state": p.state,
        "invoice_id": p.invoice_id,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


# ── Journal Entries ────────────────────────────────────────────────────────────

@router.get("/journal-entries")
def list_journal_entries(
    journal: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(JournalEntry)
    if journal:
        q = q.filter(JournalEntry.journal == journal)
    if state:
        q = q.filter(JournalEntry.state == state)
    entries = q.order_by(JournalEntry.created_at.desc()).limit(200).all()
    return [_je_dict(e) for e in entries]


@router.post("/journal-entries", status_code=201)
def create_journal_entry(body: JournalEntryCreate, db: Session = Depends(get_db)):
    je_id = "je_" + uuid.uuid4().hex[:8]
    number = _next_number(db, "JE", JournalEntry)
    total_debit = sum(l.get("debit", 0) for l in body.lines)
    total_credit = sum(l.get("credit", 0) for l in body.lines)

    je = JournalEntry(
        id=je_id,
        tenant_id=body.tenant_id,
        number=number,
        entry_date=body.entry_date or _today(),
        journal=body.journal,
        state="posted",
        ref=body.ref,
        notes=body.notes,
        source=body.source or "manual",
        total_debit=total_debit,
        total_credit=total_credit,
        posted_at=datetime.utcnow(),
    )
    db.add(je)

    for ln in body.lines:
        acc = db.query(AccountAccount).filter(
            AccountAccount.code == ln.get("account_code")
        ).first()
        db.add(JournalEntryLine(
            id="jel_" + uuid.uuid4().hex[:8],
            entry_id=je_id,
            account_id=acc.id if acc else None,
            account_code=ln.get("account_code"),
            account_name=ln.get("account_name", acc.name if acc else ""),
            partner_name=ln.get("partner_name", ""),
            debit=ln.get("debit", 0),
            credit=ln.get("credit", 0),
            label=ln.get("label", ""),
        ))

    db.commit()
    db.refresh(je)
    return _je_dict(je)


@router.get("/journal-entries/{je_id}")
def get_journal_entry(je_id: str, db: Session = Depends(get_db)):
    je = db.query(JournalEntry).filter(JournalEntry.id == je_id).first()
    if not je:
        raise HTTPException(404, "Journal entry not found")
    return _je_dict(je)


def _je_dict(je: JournalEntry) -> dict:
    return {
        "id": je.id, "number": je.number, "entry_date": je.entry_date,
        "journal": je.journal, "state": je.state, "ref": je.ref,
        "source": je.source, "total_debit": je.total_debit, "total_credit": je.total_credit,
        "lines": [
            {"account_code": l.account_code, "account_name": l.account_name,
             "partner_name": l.partner_name, "debit": l.debit, "credit": l.credit,
             "label": l.label}
            for l in (je.lines or [])
        ],
        "created_at": je.created_at.isoformat() if je.created_at else None,
    }


# ── Bank Accounts ──────────────────────────────────────────────────────────────

@router.get("/bank-accounts")
def list_bank_accounts(db: Session = Depends(get_db)):
    banks = db.query(BankAccount).filter(BankAccount.active == True).all()
    return [
        {"id": b.id, "name": b.name, "bank_name": b.bank_name,
         "account_number": b.account_number, "currency": b.currency,
         "balance": b.balance, "last_sync": b.last_sync}
        for b in banks
    ]


# ── Financial Reports ──────────────────────────────────────────────────────────

@router.get("/reports/general-ledger")
def general_ledger(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Aggregate journal entry lines by account."""
    q = db.query(
        JournalEntryLine.account_code,
        JournalEntryLine.account_name,
        func.sum(JournalEntryLine.debit).label("total_debit"),
        func.sum(JournalEntryLine.credit).label("total_credit"),
    ).join(JournalEntry, JournalEntryLine.entry_id == JournalEntry.id)

    if date_from:
        q = q.filter(JournalEntry.entry_date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.entry_date <= date_to)

    rows = q.group_by(JournalEntryLine.account_code, JournalEntryLine.account_name).all()

    result = []
    for row in rows:
        debit = round(row.total_debit or 0, 2)
        credit = round(row.total_credit or 0, 2)
        # Find normal balance direction from COA
        acc = db.query(AccountAccount).filter(AccountAccount.code == row.account_code).first()
        normal = acc.normal_balance if acc else "debit"
        balance = debit - credit if normal == "debit" else credit - debit
        result.append({
            "code": row.account_code, "name": row.account_name,
            "debit": debit, "credit": credit, "balance": round(balance, 2),
        })

    return sorted(result, key=lambda r: r["code"] or "")


@router.get("/reports/trial-balance")
def trial_balance(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    gl = await_sync(general_ledger, date_from, date_to, db)
    return [
        {**g, "init_balance": g["balance"], "period_debit": g["debit"],
         "period_credit": g["credit"], "end_balance": g["balance"]}
        for g in gl
    ]


def await_sync(fn, *args):
    """Helper to call a sync endpoint function."""
    return fn(*args)


@router.get("/reports/profit-loss")
def profit_loss(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Income Statement."""
    gl = general_ledger(date_from, date_to, db)
    income_types = {"income", "income_other"}
    expense_types = {"expense", "expense_direct_cost", "expense_depreciation"}

    total_income = sum(
        abs(r["balance"]) for r in gl
        if _get_acc_type(db, r["code"]) in income_types
    )
    total_expense = sum(
        abs(r["balance"]) for r in gl
        if _get_acc_type(db, r["code"]) in expense_types
    )
    net_profit = total_income - total_expense

    return {
        "date_from": date_from, "date_to": date_to,
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_profit": round(net_profit, 2),
        "income_lines": [r for r in gl if _get_acc_type(db, r["code"]) in income_types],
        "expense_lines": [r for r in gl if _get_acc_type(db, r["code"]) in expense_types],
    }


@router.get("/reports/balance-sheet")
def balance_sheet(
    as_of: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Balance Sheet as of a given date."""
    gl = general_ledger(date_to=as_of, db=db)

    def _sum_types(types):
        return sum(
            abs(r["balance"]) for r in gl
            if _get_acc_type(db, r["code"]) in types
        )

    assets       = _sum_types({"asset", "asset_current", "asset_non_current", "asset_fixed",
                                "asset_cash", "asset_prepayments", "receivable"})
    liabilities  = _sum_types({"liability", "liability_current", "liability_non_current",
                                "liability_payable", "payable"})
    equity       = _sum_types({"equity", "equity_unaffected"})

    return {
        "as_of": as_of or _today(),
        "total_assets": round(assets, 2),
        "total_liabilities": round(liabilities, 2),
        "total_equity": round(equity, 2),
        "assets": [r for r in gl if _get_acc_type(db, r["code"]) in
                   {"asset", "asset_current", "asset_non_current", "asset_fixed",
                    "asset_cash", "asset_prepayments", "receivable"}],
        "liabilities": [r for r in gl if _get_acc_type(db, r["code"]) in
                        {"liability", "liability_current", "liability_non_current",
                         "liability_payable", "payable"}],
        "equity": [r for r in gl if _get_acc_type(db, r["code"]) in {"equity", "equity_unaffected"}],
    }


@router.get("/reports/cash-flow")
def cash_flow(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Simplified cash flow statement."""
    inbound = db.query(func.sum(AccountPayment.amount)).filter(
        AccountPayment.payment_type == "inbound",
    )
    outbound = db.query(func.sum(AccountPayment.amount)).filter(
        AccountPayment.payment_type == "outbound",
    )
    if date_from:
        inbound = inbound.filter(AccountPayment.payment_date >= date_from)
        outbound = outbound.filter(AccountPayment.payment_date >= date_from)
    if date_to:
        inbound = inbound.filter(AccountPayment.payment_date <= date_to)
        outbound = outbound.filter(AccountPayment.payment_date <= date_to)

    total_in = round(inbound.scalar() or 0, 2)
    total_out = round(outbound.scalar() or 0, 2)
    return {
        "date_from": date_from, "date_to": date_to,
        "total_inflows": total_in,
        "total_outflows": total_out,
        "net_cash_flow": round(total_in - total_out, 2),
    }


@router.get("/reports/tax")
def tax_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """VAT and statutory tax report."""
    # VAT from invoices
    q = db.query(
        func.sum(Invoice.tax_amount).label("total_vat"),
        func.sum(Invoice.subtotal).label("total_net"),
        func.sum(Invoice.total).label("total_gross"),
    ).filter(Invoice.move_type == "out_invoice", Invoice.state.in_(["open", "paid"]))
    if date_from:
        q = q.filter(Invoice.invoice_date >= date_from)
    if date_to:
        q = q.filter(Invoice.invoice_date <= date_to)
    row = q.first()

    return {
        "date_from": date_from, "date_to": date_to,
        "vat_collected": round(row.total_vat or 0, 2),
        "taxable_sales": round(row.total_net or 0, 2),
        "gross_sales": round(row.total_gross or 0, 2),
        "vat_rate": 18.0,
    }


@router.get("/reports/partner-ledger")
def partner_ledger(
    partner_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Invoice).filter(Invoice.state.in_(["open", "paid"]))
    if partner_id:
        q = q.filter(Invoice.partner_id == partner_id)
    if date_from:
        q = q.filter(Invoice.invoice_date >= date_from)
    if date_to:
        q = q.filter(Invoice.invoice_date <= date_to)
    invoices = q.all()
    return [
        {"date": inv.invoice_date, "number": inv.number, "partner": inv.partner_name,
         "debit": inv.total if "out" in inv.move_type else 0,
         "credit": inv.amount_paid or 0, "balance": inv.amount_due}
        for inv in invoices
    ]


@router.get("/reports/aged-receivable")
def aged_receivable(as_of: Optional[str] = None, db: Session = Depends(get_db)):
    """Aged receivables — groups by 0-30, 31-60, 61-90, 90+ days overdue."""
    as_of_date = date.fromisoformat(as_of) if as_of else date.today()
    invoices = db.query(Invoice).filter(
        Invoice.move_type == "out_invoice",
        Invoice.state.in_(["open"]),
        Invoice.amount_due > 0,
    ).all()

    buckets = {"current": 0, "1_30": 0, "31_60": 0, "61_90": 0, "over_90": 0}
    lines = []
    for inv in invoices:
        if not inv.due_date:
            continue
        due = date.fromisoformat(inv.due_date)
        overdue_days = (as_of_date - due).days
        if overdue_days <= 0:
            bucket = "current"
        elif overdue_days <= 30:
            bucket = "1_30"
        elif overdue_days <= 60:
            bucket = "31_60"
        elif overdue_days <= 90:
            bucket = "61_90"
        else:
            bucket = "over_90"
        buckets[bucket] = round(buckets[bucket] + inv.amount_due, 2)
        lines.append({
            "invoice": inv.number, "partner": inv.partner_name,
            "due_date": inv.due_date, "overdue_days": overdue_days,
            "balance": inv.amount_due, "bucket": bucket,
        })

    return {"as_of": as_of_date.isoformat(), "buckets": buckets, "lines": lines}


@router.get("/reports/aged-payable")
def aged_payable(as_of: Optional[str] = None, db: Session = Depends(get_db)):
    as_of_date = date.fromisoformat(as_of) if as_of else date.today()
    bills = db.query(Invoice).filter(
        Invoice.move_type == "in_invoice",
        Invoice.state.in_(["open"]),
        Invoice.amount_due > 0,
    ).all()

    buckets = {"current": 0, "1_30": 0, "31_60": 0, "61_90": 0, "over_90": 0}
    lines = []
    for bill in bills:
        if not bill.due_date:
            continue
        due = date.fromisoformat(bill.due_date)
        overdue_days = (as_of_date - due).days
        if overdue_days <= 0:
            bucket = "current"
        elif overdue_days <= 30:
            bucket = "1_30"
        elif overdue_days <= 60:
            bucket = "31_60"
        elif overdue_days <= 90:
            bucket = "61_90"
        else:
            bucket = "over_90"
        buckets[bucket] = round(buckets[bucket] + bill.amount_due, 2)
        lines.append({
            "bill": bill.number, "vendor": bill.partner_name,
            "due_date": bill.due_date, "overdue_days": overdue_days,
            "balance": bill.amount_due, "bucket": bucket,
        })

    return {"as_of": as_of_date.isoformat(), "buckets": buckets, "lines": lines}


# ── Private helpers ────────────────────────────────────────────────────────────

def _get_acc_type(db: Session, code: Optional[str]) -> str:
    if not code:
        return ""
    acc = db.query(AccountAccount).filter(AccountAccount.code == code).first()
    return acc.account_type if acc else ""


def _create_invoice_je(db: Session, inv: Invoice) -> JournalEntry:
    """Create double-entry journal entry for a confirmed invoice.
    DR Accounts Receivable / CR Revenue (for out_invoice)
    DR Expense / CR Accounts Payable (for in_invoice)
    """
    je_id = "je_" + uuid.uuid4().hex[:8]
    number = _next_number(db, "JE", JournalEntry)
    is_outgoing = inv.move_type in ("out_invoice", "out_refund")

    lines_data = [
        {
            "account_code": "1518" if is_outgoing else "6001",
            "account_name": "Accounts Receivable" if is_outgoing else "Trade Payables",
            "partner_name": inv.partner_name or "",
            "debit": inv.total if is_outgoing else 0,
            "credit": 0 if is_outgoing else inv.total,
            "label": inv.number,
        },
        {
            "account_code": "4001" if is_outgoing else "5001",
            "account_name": "Food & Beverage Revenue" if is_outgoing else "Cost of Goods Sold",
            "partner_name": "",
            "debit": 0 if is_outgoing else inv.subtotal,
            "credit": inv.subtotal if is_outgoing else 0,
            "label": inv.number,
        },
    ]
    if inv.tax_amount:
        lines_data.append({
            "account_code": "6002" if is_outgoing else "6002",
            "account_name": "VAT Payable (18%)",
            "partner_name": "",
            "debit": 0 if is_outgoing else inv.tax_amount,
            "credit": inv.tax_amount if is_outgoing else 0,
            "label": f"VAT on {inv.number}",
        })

    je = JournalEntry(
        id=je_id,
        tenant_id=inv.tenant_id,
        number=number,
        entry_date=inv.invoice_date or _today(),
        journal="Sales Journal" if is_outgoing else "Purchase Journal",
        state="posted",
        ref=inv.number,
        source="invoice",
        total_debit=sum(l["debit"] for l in lines_data),
        total_credit=sum(l["credit"] for l in lines_data),
        posted_at=datetime.utcnow(),
    )
    db.add(je)

    for ln in lines_data:
        acc = db.query(AccountAccount).filter(AccountAccount.code == ln["account_code"]).first()
        db.add(JournalEntryLine(
            id="jel_" + uuid.uuid4().hex[:8],
            entry_id=je_id,
            account_id=acc.id if acc else None,
            account_code=ln["account_code"],
            account_name=ln["account_name"],
            partner_name=ln["partner_name"],
            debit=ln["debit"],
            credit=ln["credit"],
            label=ln["label"],
        ))

    return je
