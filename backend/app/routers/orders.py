"""Orders router — place, status, payment, cancel, assign, KDS."""
import uuid
import math
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.order import Order, CommissionLedger, AuditLog
from app.models.inventory import StockItem
from app.models.menu import MenuItem
from app.models.user import Waiter
from app.models.settings import TenantSettings
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/orders", tags=["orders"])

VALID_STATUSES = ["placed", "accepted", "preparing", "ready", "served", "billreq", "paid", "closed", "cancelled"]


# ── Schemas ───────────────────────────────────────────────────────────────────

class OrderItem(BaseModel):
    id: int            # menu item id
    q: int = 1
    note: Optional[str] = None
    mods: Optional[list] = None

class OrderCreate(BaseModel):
    src: Optional[str] = "TABLE_QR"
    order_type: Optional[str] = "Dine In"
    table: Optional[str] = None
    guests: Optional[int] = 1
    waiter_id: Optional[str] = None
    customer_id: Optional[str] = None
    items: List[OrderItem]
    notes: Optional[str] = None
    online: Optional[bool] = False
    tenant_id: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str
    actor: Optional[str] = "Staff"

class PaymentRequest(BaseModel):
    method: str = "cash"   # cash|card|momo|online|ewallet
    ref: Optional[str] = None
    actor: Optional[str] = "Cashier"
    tender_amount: Optional[float] = None

class CancelRequest(BaseModel):
    reason: str = "Customer request"
    actor: Optional[str] = "Manager"

class AssignRequest(BaseModel):
    waiter_id: str
    actor: Optional[str] = "Cashier"

class DiscountRequest(BaseModel):
    discount_pct: float
    reason: Optional[str] = "Manager Goodwill"
    actor: Optional[str] = "Manager"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calc_totals(order: Order, vat_rate: float = 18.0, vat_inclusive: bool = True) -> dict:
    """Sum order items gross and compute net/tax."""
    items = order.items or []
    gross = sum(i.get("price", 0) * i.get("q", 1) for i in items if not i.get("voided"))
    if order.discount_pct:
        gross = gross * (1 - order.discount_pct / 100)
    if vat_inclusive:
        net = gross / (1 + vat_rate / 100)
        tax = gross - net
    else:
        net = gross
        tax = gross * vat_rate / 100
        gross = gross + tax
    return {"gross": round(gross, 2), "net": round(net, 2), "tax_amount": round(tax, 2)}


def _get_vat(db: Session, tenant_id: Optional[str]) -> TenantSettings:
    if tenant_id:
        ts = db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
        if ts:
            return ts
    return TenantSettings(vat_rate=18.0, vat_inclusive=True, commission_method="percent",
                          commission_rate=5.0, commission_basis="gross", commission_trigger="payment")


def _deduct_stock(db: Session, items: list, tenant_id: Optional[str]):
    """Deduct bar/kitchen stock for direct-link drinks when order is placed."""
    for line in items:
        if line.get("voided"):
            continue
        menu_item = db.query(MenuItem).filter(MenuItem.id == line.get("id")).first()
        if not menu_item or not menu_item.stock_id:
            continue
        if menu_item.tracking_mode != "direct_link":
            continue
        stock = db.query(StockItem).filter(StockItem.id == menu_item.stock_id).first()
        if not stock:
            continue
        deduct_qty = line.get("q", 1) * (menu_item.pack_multiplier or 1)
        stock.bar_qty = max(0, (stock.bar_qty or 0) - deduct_qty)
        stock.on_hand = max(0, (stock.on_hand or 0) - deduct_qty)
        stock.theoretical = max(0, (stock.theoretical or 0) - deduct_qty)


def _post_commission(db: Session, order: Order, ts: TenantSettings, trigger: str):
    """Post commission ledger entry."""
    if not order.waiter_id:
        return
    # Already posted?
    existing = db.query(CommissionLedger).filter(
        CommissionLedger.order_id == order.id,
        CommissionLedger.status != "reversed"
    ).first()
    if existing:
        return

    overrides = ts.commission_overrides or {}
    rate = overrides.get(order.waiter_id, ts.commission_rate or 5)
    base = order.gross if ts.commission_basis == "gross" else order.net
    if ts.commission_method == "fixed":
        amount = ts.commission_fixed or 2000
    else:
        amount = math.floor((base or 0) * rate / 100)

    entry = CommissionLedger(
        id="L_" + uuid.uuid4().hex[:10],
        tenant_id=order.tenant_id,
        order_id=order.id,
        waiter_id=order.waiter_id,
        method=ts.commission_method,
        rate=rate,
        basis=ts.commission_basis,
        eligible_amount=base,
        amount=amount,
        status="pending",
        note=f"{trigger.capitalize()} trigger on order {order.no}",
    )
    db.add(entry)


def _audit(db: Session, tenant_id, user, action, detail):
    db.add(AuditLog(
        id="aud_" + uuid.uuid4().hex[:8],
        tenant_id=tenant_id,
        user=user or "System",
        action=action,
        detail=detail,
    ))


def _order_dict(o: Order) -> dict:
    return {
        "id": o.id, "no": o.no, "src": o.src, "order_type": o.order_type,
        "table": o.table, "guests": o.guests, "waiter_id": o.waiter_id,
        "customer_id": o.customer_id, "status": o.status,
        "paid": o.paid, "payment_method": o.payment_method, "pay_ref": o.pay_ref,
        "gross": o.gross, "net": o.net, "tax_amount": o.tax_amount,
        "discount_pct": o.discount_pct, "discount_amount": o.discount_amount,
        "discount_reason": o.discount_reason,
        "cancel_reason": o.cancel_reason,
        "online": o.online, "notes": o.notes, "log": o.log or [],
        "items": o.items or [],
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "paid_at": o.paid_at.isoformat() if o.paid_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def list_orders(
    status: Optional[str] = None,
    waiter_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    table: Optional[str] = None,
    paid: Optional[bool] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(Order).order_by(Order.created_at.desc())
    if status:
        statuses = status.split(",")
        q = q.filter(Order.status.in_(statuses))
    if waiter_id:
        q = q.filter(Order.waiter_id == waiter_id)
    if customer_id:
        q = q.filter(Order.customer_id == customer_id)
    if table:
        q = q.filter(Order.table == table)
    if paid is not None:
        q = q.filter(Order.paid == paid)
    orders = q.limit(limit).all()
    return [_order_dict(o) for o in orders]


@router.post("", status_code=201)
def place_order(body: OrderCreate, db: Session = Depends(get_db)):
    ts = _get_vat(db, body.tenant_id)

    # Fetch menu items to get prices
    enriched_items = []
    for line in body.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == line.id).first()
        price = menu_item.price if menu_item else 0
        enriched_items.append({
            "id": line.id,
            "q": line.q,
            "note": line.note,
            "mods": line.mods,
            "price": price,
            "done": False,
            "voided": False,
        })

    # Sequential order number
    count = db.query(Order).count()
    order_no = "#" + str(1000 + count + 1)
    order_id = "ord_" + uuid.uuid4().hex[:10]

    order = Order(
        id=order_id,
        tenant_id=body.tenant_id,
        no=order_no,
        src=body.src,
        order_type=body.order_type,
        table=body.table,
        guests=body.guests,
        waiter_id=body.waiter_id,
        customer_id=body.customer_id,
        status="placed",
        online=body.online or False,
        notes=body.notes,
        items=enriched_items,
        log=[f"Order placed via {body.src} at {datetime.utcnow().strftime('%H:%M:%S')}"],
    )

    # Calculate totals
    totals = _calc_totals(order, ts.vat_rate or 18, ts.vat_inclusive if ts.vat_inclusive is not None else True)
    order.gross = totals["gross"]
    order.net = totals["net"]
    order.tax_amount = totals["tax_amount"]

    db.add(order)

    # Deduct direct-link drinks from bar stock
    _deduct_stock(db, enriched_items, body.tenant_id)

    _audit(db, body.tenant_id, body.waiter_id or "Customer",
           "ORDER_PLACED", f"Order {order_no} placed for table {body.table}")

    db.commit()
    return _order_dict(order)


@router.get("/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    return _order_dict(order)


@router.put("/{order_id}/status")
def update_status(order_id: str, body: StatusUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Valid: {VALID_STATUSES}")

    order.status = body.status
    order.log = (order.log or []) + [
        f"{body.status.upper()} by {body.actor} at {datetime.utcnow().strftime('%H:%M:%S')}"
    ]

    # Commission on 'served' trigger
    if body.status == "served":
        ts = _get_vat(db, order.tenant_id)
        if ts.commission_trigger == "served":
            _post_commission(db, order, ts, "served")

    _audit(db, order.tenant_id, body.actor, "ORDER_STATUS_CHANGED",
           f"Order {order.no} → {body.status}")
    db.commit()
    return _order_dict(order)


@router.post("/{order_id}/payment")
def settle_payment(order_id: str, body: PaymentRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.paid:
        raise HTTPException(400, "Order is already paid")

    ref = body.ref or (body.method[:3].upper() + uuid.uuid4().hex[:6].upper())
    order.paid = True
    order.payment_method = body.method
    order.pay_ref = ref
    order.status = "paid"
    order.paid_at = datetime.utcnow()
    order.log = (order.log or []) + [
        f"Payment confirmed via {body.method.upper()} by {body.actor}"
    ]

    ts = _get_vat(db, order.tenant_id)
    if ts.commission_trigger == "payment":
        _post_commission(db, order, ts, "payment")

    _audit(db, order.tenant_id, body.actor, "PAYMENT_CONFIRMED",
           f"Order {order.no} paid via {body.method} (TSh {order.gross:,.0f})")
    db.commit()
    return _order_dict(order)


@router.put("/{order_id}/cancel")
def cancel_order(order_id: str, body: CancelRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    order.status = "cancelled"
    order.cancel_reason = body.reason
    order.log = (order.log or []) + [
        f"Cancelled by {body.actor}: {body.reason}"
    ]

    # Reverse any commission
    existing = db.query(CommissionLedger).filter(
        CommissionLedger.order_id == order_id,
        CommissionLedger.status != "reversed"
    ).first()
    if existing:
        existing.status = "reversed"
        rev = CommissionLedger(
            id="REV_" + uuid.uuid4().hex[:8],
            tenant_id=order.tenant_id,
            order_id=order_id,
            waiter_id=existing.waiter_id,
            method=existing.method,
            rate=existing.rate,
            basis=existing.basis,
            eligible_amount=-existing.eligible_amount,
            amount=-existing.amount,
            status="reversed",
            reversal_of_id=existing.id,
            note=f"Reversal: Order {order.no} cancelled ({body.reason})",
        )
        db.add(rev)

    _audit(db, order.tenant_id, body.actor, "ORDER_CANCELLED",
           f"Order {order.no} cancelled: {body.reason}")
    db.commit()
    return _order_dict(order)


@router.put("/{order_id}/waiter")
def assign_waiter(order_id: str, body: AssignRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    waiter = db.query(Waiter).filter(Waiter.id == body.waiter_id).first()
    name = waiter.name if waiter else "Unknown"
    order.waiter_id = body.waiter_id
    order.log = (order.log or []) + [
        f"Assigned to {name} by {body.actor}"
    ]
    db.commit()
    return _order_dict(order)


@router.put("/{order_id}/discount")
def apply_discount(order_id: str, body: DiscountRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    original = order.gross
    order.discount_pct = body.discount_pct
    order.discount_reason = body.reason
    discount_amount = round(original * body.discount_pct / 100, 2)
    order.discount_amount = discount_amount
    order.gross = round(original - discount_amount, 2)
    order.log = (order.log or []) + [
        f"Discount {body.discount_pct}% applied by {body.actor}: {body.reason}"
    ]
    db.commit()
    return _order_dict(order)


# ── KDS Endpoints ─────────────────────────────────────────────────────────────

@router.put("/{order_id}/items/{item_index}/done")
def toggle_item_done(order_id: str, item_index: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    items = list(order.items or [])
    if item_index >= len(items):
        raise HTTPException(400, "Invalid item index")
    items[item_index] = {**items[item_index], "done": not items[item_index].get("done", False)}
    order.items = items
    db.commit()
    return _order_dict(order)


@router.put("/{order_id}/items/{item_index}/void")
def void_item(order_id: str, item_index: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    items = list(order.items or [])
    if item_index >= len(items):
        raise HTTPException(400, "Invalid item index")
    items[item_index] = {**items[item_index], "voided": not items[item_index].get("voided", False)}
    order.items = items
    db.commit()
    return _order_dict(order)


@router.put("/{order_id}/done-all")
def done_all(order_id: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    items = [{**i, "done": True} for i in (order.items or [])]
    order.items = items
    order.status = "ready"
    order.log = (order.log or []) + [f"All items done → READY at {datetime.utcnow().strftime('%H:%M:%S')}"]
    db.commit()
    return _order_dict(order)


@router.put("/{order_id}/reopen")
def reopen_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = "preparing"
    order.log = (order.log or []) + ["Reopened → PREPARING"]
    db.commit()
    return _order_dict(order)


@router.post("/clear-completed")
def clear_completed(db: Session = Depends(get_db)):
    """Archive all paid/closed orders (mark as closed)."""
    updated = db.query(Order).filter(Order.status.in_(["paid", "served", "ready"])).all()
    for o in updated:
        o.status = "closed"
    db.commit()
    return {"cleared": len(updated)}


# ── Waiters ───────────────────────────────────────────────────────────────────

@router.get("/waiters/by-token/{token}")
def get_waiter_by_token(token: str, db: Session = Depends(get_db)):
    waiter = db.query(Waiter).filter(Waiter.token == token, Waiter.active == True).first()
    if not waiter:
        raise HTTPException(404, "Invalid waiter token")
    return {"id": waiter.id, "name": waiter.name, "tables": waiter.tables}


@router.post("/waiters/{waiter_id}/rotate-token")
def rotate_token(waiter_id: str, db: Session = Depends(get_db)):
    waiter = db.query(Waiter).filter(Waiter.id == waiter_id).first()
    if not waiter:
        raise HTTPException(404, "Waiter not found")
    new_token = waiter.name.lower().split()[0] + "-" + uuid.uuid4().hex[:4].upper()
    waiter.token = new_token
    db.commit()
    return {"id": waiter.id, "token": new_token}
