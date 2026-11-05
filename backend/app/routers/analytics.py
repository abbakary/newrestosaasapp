"""Analytics, Manager, HQ router — KPIs, shift, commission, checklists, audit log, expenses."""
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models.order import Order, CommissionLedger, AuditLog
from app.models.settings import Checklist, Expense, TenantSettings
from app.models.hr import Employee
from app.models.inventory import StockItem

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChecklistCreate(BaseModel):
    title: str
    checklist_type: str = "opening"
    date: Optional[str] = None
    items: Optional[list] = []
    tenant_id: Optional[str] = None

class ExpenseCreate(BaseModel):
    category: str
    name: str
    amount: float
    method: Optional[str] = "cash"
    ref: Optional[str] = None
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class CommissionAction(BaseModel):
    waiter_id: Optional[str] = None
    actor: Optional[str] = "Manager"

class ShiftUpdate(BaseModel):
    shift_state: str   # opening_prep|live_service|day_closed
    actor: Optional[str] = "Manager"


# ── Daily KPIs ────────────────────────────────────────────────────────────────

@router.get("/kpis/daily")
def daily_kpis(
    date_str: Optional[str] = None,
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    target_date = date_str or date.today().isoformat()
    next_date = (date.fromisoformat(target_date) + timedelta(days=1)).isoformat()

    q = db.query(Order).filter(
        Order.created_at >= target_date,
        Order.created_at < next_date,
    )
    if tenant_id:
        q = q.filter(Order.tenant_id == tenant_id)
    orders = q.all()

    paid_orders = [o for o in orders if o.paid]
    open_orders = [o for o in orders if o.status in ("placed", "accepted", "preparing", "ready")]
    bill_req = [o for o in orders if o.status == "billreq"]

    gross = sum(o.gross or 0 for o in paid_orders)
    vat = sum(o.tax_amount or 0 for o in paid_orders)
    net = sum(o.net or 0 for o in paid_orders)
    covers = sum(o.guests or 1 for o in paid_orders)
    avg_check = gross / max(len(paid_orders), 1)

    by_method = {}
    for o in paid_orders:
        pm = o.payment_method or "unknown"
        by_method[pm] = by_method.get(pm, 0) + (o.gross or 0)

    commission_cost = db.query(func.sum(CommissionLedger.amount)).filter(
        CommissionLedger.created_at >= target_date,
        CommissionLedger.created_at < next_date,
        CommissionLedger.status != "reversed",
    ).scalar() or 0

    active_staff = db.query(Employee).filter(Employee.status == "active").count()
    low_stock = db.query(StockItem).filter(
        StockItem.active == True,
        StockItem.on_hand <= StockItem.reorder_point,
    ).count()

    return {
        "date": target_date,
        "total_orders": len(orders),
        "paid_orders": len(paid_orders),
        "open_orders": len(open_orders),
        "bill_requested": len(bill_req),
        "gross_revenue": round(gross, 2),
        "net_revenue": round(net, 2),
        "vat_collected": round(vat, 2),
        "covers": covers,
        "avg_check": round(avg_check, 2),
        "payment_breakdown": by_method,
        "commission_cost": round(commission_cost, 2),
        "active_staff": active_staff,
        "low_stock_alerts": low_stock,
    }


@router.get("/kpis/group")
def group_kpis(
    period: Optional[str] = "today",
    db: Session = Depends(get_db),
):
    """Consolidated group KPIs — for HQ view."""
    # Simplified — aggregates all data across all tenants
    today = date.today().isoformat()
    kpis = daily_kpis(date_str=today, db=db)
    return {
        "period": period,
        "branches": 3,
        "total_revenue": kpis["gross_revenue"],
        "total_covers": kpis["covers"],
        "avg_check": kpis["avg_check"],
        "open_orders": kpis["open_orders"],
        "active_staff": kpis["active_staff"],
    }


# ── Commission ────────────────────────────────────────────────────────────────

@router.get("/commission")
def list_commission(
    waiter_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(CommissionLedger)
    if waiter_id:
        q = q.filter(CommissionLedger.waiter_id == waiter_id)
    if status:
        q = q.filter(CommissionLedger.status == status)
    entries = q.order_by(CommissionLedger.created_at.desc()).all()
    return [
        {"id": e.id, "order_id": e.order_id, "waiter_id": e.waiter_id,
         "method": e.method, "rate": e.rate, "basis": e.basis,
         "eligible_amount": e.eligible_amount, "amount": e.amount,
         "status": e.status, "note": e.note,
         "created_at": e.created_at.isoformat() if e.created_at else None}
        for e in entries
    ]


@router.put("/commission/approve")
def approve_commissions(body: CommissionAction, db: Session = Depends(get_db)):
    """Approve pending commissions (optionally for a specific waiter)."""
    q = db.query(CommissionLedger).filter(CommissionLedger.status == "pending")
    if body.waiter_id:
        q = q.filter(CommissionLedger.waiter_id == body.waiter_id)
    entries = q.all()
    for e in entries:
        e.status = "approved"
    db.commit()
    return {"approved": len(entries)}


@router.put("/commission/payout")
def payout_commissions(body: CommissionAction, db: Session = Depends(get_db)):
    """Mark approved commissions as paid out."""
    q = db.query(CommissionLedger).filter(CommissionLedger.status == "approved")
    if body.waiter_id:
        q = q.filter(CommissionLedger.waiter_id == body.waiter_id)
    entries = q.all()
    for e in entries:
        e.status = "paid"
    db.commit()
    total = sum(e.amount for e in entries)
    return {"paid_out": len(entries), "total_amount": round(total, 2)}


# ── Checklists ────────────────────────────────────────────────────────────────

@router.get("/checklists")
def list_checklists(
    checklist_type: Optional[str] = None,
    date_str: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Checklist)
    if checklist_type:
        q = q.filter(Checklist.checklist_type == checklist_type)
    if date_str:
        q = q.filter(Checklist.date == date_str)
    checklists = q.order_by(Checklist.created_at.desc()).all()
    return [_cl_dict(c) for c in checklists]


@router.post("/checklists", status_code=201)
def create_checklist(body: ChecklistCreate, db: Session = Depends(get_db)):
    cl = Checklist(
        id="cl_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        title=body.title,
        checklist_type=body.checklist_type,
        date=body.date or date.today().isoformat(),
        items=body.items or [],
    )
    db.add(cl)
    db.commit()
    return _cl_dict(cl)


@router.put("/checklists/{cl_id}/items/{item_idx}")
def toggle_checklist_item(cl_id: str, item_idx: int, db: Session = Depends(get_db)):
    cl = db.query(Checklist).filter(Checklist.id == cl_id).first()
    if not cl:
        raise HTTPException(404, "Checklist not found")
    items = list(cl.items or [])
    if item_idx >= len(items):
        raise HTTPException(400, "Invalid item index")
    items[item_idx] = {**items[item_idx], "done": not items[item_idx].get("done", False)}
    cl.items = items
    cl.completed = all(i.get("done", False) for i in items)
    db.commit()
    return _cl_dict(cl)


def _cl_dict(c: Checklist) -> dict:
    return {
        "id": c.id, "title": c.title, "checklist_type": c.checklist_type,
        "date": c.date, "completed": c.completed, "signed_by": c.signed_by,
        "items": c.items or [],
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ── Audit Log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log")
def get_audit_log(
    limit: int = 200,
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if tenant_id:
        q = q.filter(AuditLog.tenant_id == tenant_id)
    logs = q.order_by(AuditLog.ts.desc()).limit(limit).all()
    return [
        {"id": l.id, "ts": l.ts.isoformat() if l.ts else None,
         "user": l.user, "action": l.action, "detail": l.detail}
        for l in logs
    ]


# ── OPEX Expenses ─────────────────────────────────────────────────────────────

@router.get("/expenses")
def list_expenses(
    category: Optional[str] = None,
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Expense)
    if category:
        q = q.filter(Expense.category == category)
    if tenant_id:
        q = q.filter(Expense.tenant_id == tenant_id)
    expenses = q.order_by(Expense.created_at.desc()).all()
    return [
        {"id": e.id, "date": e.expense_date.isoformat() if e.expense_date else None,
         "category": e.category, "name": e.name, "amount": e.amount,
         "method": e.method, "ref": e.ref, "recorded_by": e.recorded_by}
        for e in expenses
    ]


@router.post("/expenses", status_code=201)
def create_expense(body: ExpenseCreate, db: Session = Depends(get_db)):
    exp = Expense(
        id="opex_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        expense_date=datetime.utcnow(),
        category=body.category,
        name=body.name,
        amount=body.amount,
        method=body.method,
        ref=body.ref,
        recorded_by=body.recorded_by,
        notes=body.notes,
    )
    db.add(exp)
    db.commit()
    return {"id": exp.id}


# ── Z-Report ──────────────────────────────────────────────────────────────────

@router.post("/z-report")
def generate_z_report(
    date_str: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """End-of-day Z-Report: summarize all paid orders by payment method."""
    kpis = daily_kpis(date_str=date_str, db=db)
    return {
        "report_date": kpis["date"],
        "gross_sales": kpis["gross_revenue"],
        "net_sales": kpis["net_revenue"],
        "vat": kpis["vat_collected"],
        "covers": kpis["covers"],
        "avg_check": kpis["avg_check"],
        "payment_breakdown": kpis["payment_breakdown"],
        "total_orders": kpis["total_orders"],
        "paid_orders": kpis["paid_orders"],
        "commission_cost": kpis["commission_cost"],
        "generated_at": datetime.utcnow().isoformat(),
    }


# ── Branch Benchmarks ─────────────────────────────────────────────────────────

@router.get("/branches")
def branch_benchmarks(db: Session = Depends(get_db)):
    """Multi-site benchmarking for HQ."""
    # Returns the seed branch data with live order totals
    from app.models.order import Order as Ord
    today = date.today().isoformat()
    gross = db.query(func.sum(Ord.gross)).filter(Ord.paid == True).scalar() or 0
    return {
        "branches": [
            {"id": "masaki", "name": "Safari Grill & Lounge · Masaki",
             "type": "Flagship", "revenue": round(gross * 0.55, 2),
             "covers": 240, "avg_check": 28000, "food_cost_pct": 28.5,
             "health_score": 92},
            {"id": "oysterbay", "name": "Safari Grill Express · Oysterbay",
             "type": "Kiosk", "revenue": round(gross * 0.25, 2),
             "covers": 110, "avg_check": 15000, "food_cost_pct": 30.1,
             "health_score": 88},
            {"id": "city", "name": "Safari Grill & Lounge · City Centre",
             "type": "Branch", "revenue": round(gross * 0.20, 2),
             "covers": 180, "avg_check": 22000, "food_cost_pct": 29.0,
             "health_score": 85},
        ]
    }


# ── Staff Leaderboard ─────────────────────────────────────────────────────────

@router.get("/staff/leaderboard")
def staff_leaderboard(db: Session = Depends(get_db)):
    """Cross-site waiter performance leaderboard."""
    from app.models.user import Waiter
    waiters = db.query(Waiter).filter(Waiter.active == True).all()
    result = []
    for w in waiters:
        orders = db.query(Order).filter(Order.waiter_id == w.id, Order.paid == True).all()
        sales = sum(o.gross or 0 for o in orders)
        commission = db.query(func.sum(CommissionLedger.amount)).filter(
            CommissionLedger.waiter_id == w.id,
        ).scalar() or 0
        link_orders = sum(1 for o in orders if o.src in ("TABLE_QR", "WALKIN_WAITER"))
        result.append({
            "waiter_id": w.id, "name": w.name,
            "total_orders": len(orders), "total_sales": round(sales, 2),
            "link_orders": link_orders,
            "commission_earned": round(commission, 2),
        })
    return sorted(result, key=lambda x: x["total_sales"], reverse=True)


# ── Tables Floor Status ───────────────────────────────────────────────────────

@router.get("/tables/status")
def tables_status(db: Session = Depends(get_db)):
    """Current table occupancy for floor plan view."""
    tables = ["T1", "T2", "T3", "T4", "T5", "T6", "Takeaway"]
    result = []
    for t in tables:
        active_order = db.query(Order).filter(
            Order.table == t,
            Order.status.in_(["placed", "accepted", "preparing", "ready", "served", "billreq"]),
            Order.paid == False,
        ).order_by(Order.created_at.desc()).first()
        result.append({
            "table": t,
            "occupied": active_order is not None,
            "order_id": active_order.id if active_order else None,
            "order_no": active_order.no if active_order else None,
            "status": active_order.status if active_order else None,
            "gross": active_order.gross if active_order else None,
            "opened_at": active_order.created_at.isoformat() if active_order else None,
        })
    return result
