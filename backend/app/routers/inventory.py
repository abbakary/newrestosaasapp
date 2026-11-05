"""Inventory router — stock, suppliers, POs, RFQs, transfers, adjustments, crate ledger."""
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.inventory import (
    StockItem, Supplier, StockTransfer, PurchaseOrder,
    RFQ, CrateLedger, WasteLog, StockAdjustment,
)
from app.models.order import AuditLog

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class StockItemCreate(BaseModel):
    name: str
    category: str
    uom: str
    base_unit: Optional[str] = None
    purchase_units: Optional[list] = []
    default_purchase_unit: Optional[str] = None
    on_hand: Optional[float] = 0
    store_qty: Optional[float] = 0
    kitchen_qty: Optional[float] = 0
    bar_qty: Optional[float] = 0
    par_level: Optional[float] = 0
    reorder_point: Optional[float] = 0
    unit_cost: Optional[float] = 0
    selling_price: Optional[float] = None
    item_type: Optional[str] = "raw_material"
    tracking_mode: Optional[str] = "simple_issue"
    location: Optional[str] = None
    supplier_id: Optional[str] = None
    returnable: Optional[bool] = False
    tenant_id: Optional[str] = None

class StockItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    on_hand: Optional[float] = None
    store_qty: Optional[float] = None
    kitchen_qty: Optional[float] = None
    bar_qty: Optional[float] = None
    par_level: Optional[float] = None
    reorder_point: Optional[float] = None
    unit_cost: Optional[float] = None
    selling_price: Optional[float] = None
    returnable: Optional[bool] = None
    crates_on_hand: Optional[int] = None
    empty_bottles_on_hand: Optional[int] = None
    crates_owed_supplier: Optional[int] = None
    supplier_id: Optional[str] = None
    menu_id: Optional[int] = None

class FastPurchaseRequest(BaseModel):
    stock_id: str
    purchase_unit: str
    qty: float
    unit_price: Optional[float] = None
    location: Optional[str] = "store"    # store|bar|kitchen
    supplier_id: Optional[str] = None
    actor: Optional[str] = "Storekeeper"
    tenant_id: Optional[str] = None

class TransferRequest(BaseModel):
    from_location: str
    to_location: str
    items: List[dict]   # [{stockId, name, qty, uom}]
    transferred_by: Optional[str] = "Storekeeper"
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class POCreate(BaseModel):
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    items: List[dict]   # [{stockId, name, qty, unitPrice, uom}]
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class RFQCreate(BaseModel):
    title: str
    items: List[dict]
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class RFQBid(BaseModel):
    supplier_id: Optional[str] = None
    supplier_name: str
    items: List[dict]   # [{stockId, unitPrice}]
    total: float
    notes: Optional[str] = None

class AdjustmentRequest(BaseModel):
    stock_id: str
    qty_after: float
    location: Optional[str] = "store"
    reason: Optional[str] = "Manual adjustment"
    recorded_by: Optional[str] = "Storekeeper"
    tenant_id: Optional[str] = None

class WasteRequest(BaseModel):
    stock_id: str
    qty: float
    reason: str     # spoilage|breakage|expired|theft|other
    location: Optional[str] = "kitchen"
    recorded_by: Optional[str] = "Storekeeper"
    tenant_id: Optional[str] = None

class CycleCountRequest(BaseModel):
    counts: List[dict]  # [{stockId, counted_qty, location}]
    counted_by: Optional[str] = "Storekeeper"
    tenant_id: Optional[str] = None

class CrateReturnRequest(BaseModel):
    stock_id: str
    qty: int
    supplier_id: Optional[str] = None
    ref: Optional[str] = None
    notes: Optional[str] = None
    tenant_id: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _stock_dict(s: StockItem) -> dict:
    return {
        "id": s.id, "name": s.name, "category": s.category, "uom": s.uom,
        "base_unit": s.base_unit, "purchase_units": s.purchase_units or [],
        "default_purchase_unit": s.default_purchase_unit,
        "last_purchase_unit": s.last_purchase_unit,
        "last_purchase_price": s.last_purchase_price,
        "on_hand": s.on_hand, "store_qty": s.store_qty,
        "kitchen_qty": s.kitchen_qty, "bar_qty": s.bar_qty,
        "par_level": s.par_level, "reorder_point": s.reorder_point,
        "unit_cost": s.unit_cost, "selling_price": s.selling_price,
        "item_type": s.item_type, "tracking_mode": s.tracking_mode,
        "location": s.location, "theoretical": s.theoretical,
        "menu_id": s.menu_id, "supplier_id": s.supplier_id,
        "returnable": s.returnable, "crates_on_hand": s.crates_on_hand,
        "empty_bottles_on_hand": s.empty_bottles_on_hand,
        "crates_owed_supplier": s.crates_owed_supplier,
        "active": s.active,
    }


def _get_factor(stock: StockItem, purchase_unit: str) -> float:
    """Get the multiplier factor for a given purchase unit name."""
    for pu in (stock.purchase_units or []):
        if pu.get("name") == purchase_unit:
            return float(pu.get("factor", 1))
    return 1.0


# ── Stock Items ───────────────────────────────────────────────────────────────

@router.get("/stock")
def list_stock(
    category: Optional[str] = None,
    low_stock_only: bool = False,
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(StockItem).filter(StockItem.active == True)
    if tenant_id:
        q = q.filter(StockItem.tenant_id == tenant_id)
    if category:
        q = q.filter(StockItem.category == category)
    items = q.order_by(StockItem.category, StockItem.name).all()
    result = [_stock_dict(s) for s in items]
    if low_stock_only:
        result = [s for s in result if s["on_hand"] <= s["reorder_point"]]
    return result


@router.get("/stock/{stock_id}")
def get_stock_item(stock_id: str, db: Session = Depends(get_db)):
    item = db.query(StockItem).filter(StockItem.id == stock_id).first()
    if not item:
        raise HTTPException(404, "Stock item not found")
    return _stock_dict(item)


@router.post("/stock", status_code=201)
def create_stock_item(body: StockItemCreate, db: Session = Depends(get_db)):
    stock_id = "stk_" + uuid.uuid4().hex[:8]
    item = StockItem(
        id=stock_id,
        **body.model_dump(),
        theoretical=body.on_hand or 0,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _stock_dict(item)


@router.put("/stock/{stock_id}")
def update_stock_item(stock_id: str, body: StockItemUpdate, db: Session = Depends(get_db)):
    item = db.query(StockItem).filter(StockItem.id == stock_id).first()
    if not item:
        raise HTTPException(404, "Stock item not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    db.commit()
    return _stock_dict(item)


@router.post("/stock/batch", status_code=201)
def batch_add_stock(items: List[StockItemCreate], db: Session = Depends(get_db)):
    created = []
    for body in items:
        stock_id = "stk_" + uuid.uuid4().hex[:8]
        item = StockItem(id=stock_id, **body.model_dump(), theoretical=body.on_hand or 0)
        db.add(item)
        created.append(stock_id)
    db.commit()
    return {"created": len(created), "ids": created}


# ── Fast Purchase ─────────────────────────────────────────────────────────────

@router.post("/stock/fast-purchase")
def fast_purchase(body: FastPurchaseRequest, db: Session = Depends(get_db)):
    """Receive stock with unit conversion (e.g. 2 Crates × 24 bottles = 48 bottles added)."""
    stock = db.query(StockItem).filter(StockItem.id == body.stock_id).first()
    if not stock:
        raise HTTPException(404, "Stock item not found")

    factor = _get_factor(stock, body.purchase_unit)
    qty_base = body.qty * factor

    loc = (body.location or "store").lower()
    if loc == "bar":
        stock.bar_qty = (stock.bar_qty or 0) + qty_base
    elif loc == "kitchen":
        stock.kitchen_qty = (stock.kitchen_qty or 0) + qty_base
    else:
        stock.store_qty = (stock.store_qty or 0) + qty_base

    stock.on_hand = (stock.store_qty or 0) + (stock.kitchen_qty or 0) + (stock.bar_qty or 0)
    stock.theoretical = stock.on_hand
    stock.last_purchase_unit = body.purchase_unit
    if body.unit_price:
        stock.last_purchase_price = body.unit_price
        stock.unit_cost = round(body.unit_price / factor, 2)

    db.commit()
    return {"stock_id": stock.id, "added_qty": qty_base, "new_on_hand": stock.on_hand}


# ── Transfers ─────────────────────────────────────────────────────────────────

@router.post("/stock/transfer")
def transfer_stock(body: TransferRequest, db: Session = Depends(get_db)):
    for line in body.items:
        stock = db.query(StockItem).filter(StockItem.id == line.get("stockId")).first()
        if not stock:
            continue
        qty = float(line.get("qty", 0))
        from_loc = body.from_location.lower()
        to_loc = body.to_location.lower()

        # Deduct from source
        if "store" in from_loc:
            stock.store_qty = max(0, (stock.store_qty or 0) - qty)
        elif "bar" in from_loc:
            stock.bar_qty = max(0, (stock.bar_qty or 0) - qty)
        elif "kitchen" in from_loc:
            stock.kitchen_qty = max(0, (stock.kitchen_qty or 0) - qty)

        # Add to destination
        if "bar" in to_loc:
            stock.bar_qty = (stock.bar_qty or 0) + qty
        elif "kitchen" in to_loc:
            stock.kitchen_qty = (stock.kitchen_qty or 0) + qty
        else:
            stock.store_qty = (stock.store_qty or 0) + qty

        stock.on_hand = (stock.store_qty or 0) + (stock.kitchen_qty or 0) + (stock.bar_qty or 0)

    transfer = StockTransfer(
        id="txfr_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        from_location=body.from_location,
        to_location=body.to_location,
        items=body.items,
        transferred_by=body.transferred_by,
        notes=body.notes,
        status="done",
    )
    db.add(transfer)
    db.commit()
    return {"id": transfer.id, "status": "done"}


@router.get("/transfers")
def list_transfers(db: Session = Depends(get_db)):
    transfers = db.query(StockTransfer).order_by(StockTransfer.created_at.desc()).limit(100).all()
    return [
        {"id": t.id, "from_location": t.from_location, "to_location": t.to_location,
         "items": t.items, "transferred_by": t.transferred_by, "status": t.status,
         "created_at": t.created_at.isoformat() if t.created_at else None}
        for t in transfers
    ]


# ── Purchase Orders ────────────────────────────────────────────────────────────

@router.get("/purchase-orders")
def list_pos(db: Session = Depends(get_db)):
    pos = db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()
    return [_po_dict(p) for p in pos]


@router.post("/purchase-orders", status_code=201)
def create_po(body: POCreate, db: Session = Depends(get_db)):
    total = sum(i.get("qty", 0) * i.get("unitPrice", 0) for i in body.items)
    po = PurchaseOrder(
        id="po_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        supplier_id=body.supplier_id,
        supplier_name=body.supplier_name,
        status="pending_approval",
        items=body.items,
        total=total,
        notes=body.notes,
    )
    db.add(po)
    db.commit()
    return _po_dict(po)


@router.put("/purchase-orders/{po_id}/approve")
def approve_po(po_id: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "PO not found")
    po.status = "approved"
    db.commit()
    return _po_dict(po)


@router.put("/purchase-orders/{po_id}/receive")
def receive_po(po_id: str, body: dict = None, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "PO not found")
    po.status = "received"
    po.received_at = datetime.utcnow()

    # Update stock quantities
    for line in (po.items or []):
        stock = db.query(StockItem).filter(StockItem.id == line.get("stockId")).first()
        if stock:
            qty = float(line.get("qty", 0))
            stock.store_qty = (stock.store_qty or 0) + qty
            stock.on_hand = (stock.store_qty or 0) + (stock.kitchen_qty or 0) + (stock.bar_qty or 0)
            stock.theoretical = stock.on_hand
            if line.get("unitPrice"):
                stock.last_purchase_price = line["unitPrice"]
                stock.unit_cost = line["unitPrice"]

    db.commit()
    return _po_dict(po)


@router.post("/purchase-orders/{po_id}/pay")
def pay_po(po_id: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "PO not found")
    po.status = "paid"
    po.paid_at = datetime.utcnow()
    db.commit()
    return _po_dict(po)


def _po_dict(po: PurchaseOrder) -> dict:
    return {
        "id": po.id, "supplier_id": po.supplier_id, "supplier_name": po.supplier_name,
        "status": po.status, "items": po.items, "total": po.total, "notes": po.notes,
        "created_at": po.created_at.isoformat() if po.created_at else None,
        "received_at": po.received_at.isoformat() if po.received_at else None,
        "paid_at": po.paid_at.isoformat() if po.paid_at else None,
    }


# ── RFQs ──────────────────────────────────────────────────────────────────────

@router.get("/rfqs")
def list_rfqs(db: Session = Depends(get_db)):
    rfqs = db.query(RFQ).order_by(RFQ.created_at.desc()).all()
    return [_rfq_dict(r) for r in rfqs]


@router.post("/rfqs", status_code=201)
def create_rfq(body: RFQCreate, db: Session = Depends(get_db)):
    rfq = RFQ(
        id="rfq_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        title=body.title,
        items=body.items,
        status="open",
        notes=body.notes,
    )
    db.add(rfq)
    db.commit()
    return _rfq_dict(rfq)


@router.post("/rfqs/{rfq_id}/bids")
def add_rfq_bid(rfq_id: str, body: RFQBid, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(404, "RFQ not found")
    bids = list(rfq.bids or [])
    bids.append(body.model_dump())
    rfq.bids = bids
    db.commit()
    return _rfq_dict(rfq)


@router.post("/rfqs/{rfq_id}/convert")
def convert_rfq_to_po(rfq_id: str, body: dict, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(404, "RFQ not found")
    bid_index = body.get("bid_index", 0)
    bids = rfq.bids or []
    if bid_index >= len(bids):
        raise HTTPException(400, "Invalid bid index")
    bid = bids[bid_index]
    po = PurchaseOrder(
        id="po_" + uuid.uuid4().hex[:8],
        supplier_id=bid.get("supplier_id"),
        supplier_name=bid.get("supplier_name"),
        status="pending_approval",
        items=rfq.items,
        total=bid.get("total", 0),
        notes=f"Converted from RFQ {rfq_id}",
    )
    db.add(po)
    rfq.status = "converted"
    rfq.po_id = po.id
    rfq.selected_bid_index = bid_index
    db.commit()
    return {"rfq_id": rfq_id, "po_id": po.id}


def _rfq_dict(r: RFQ) -> dict:
    return {
        "id": r.id, "title": r.title, "status": r.status,
        "items": r.items, "bids": r.bids, "po_id": r.po_id, "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ── Stock Adjustments / Waste ─────────────────────────────────────────────────

@router.post("/stock/adjustment")
def record_adjustment(body: AdjustmentRequest, db: Session = Depends(get_db)):
    stock = db.query(StockItem).filter(StockItem.id == body.stock_id).first()
    if not stock:
        raise HTTPException(404, "Stock item not found")
    loc = (body.location or "store").lower()
    if "bar" in loc:
        qty_before = stock.bar_qty or 0
        stock.bar_qty = body.qty_after
    elif "kitchen" in loc:
        qty_before = stock.kitchen_qty or 0
        stock.kitchen_qty = body.qty_after
    else:
        qty_before = stock.store_qty or 0
        stock.store_qty = body.qty_after

    delta = body.qty_after - qty_before
    stock.on_hand = (stock.store_qty or 0) + (stock.kitchen_qty or 0) + (stock.bar_qty or 0)

    adj = StockAdjustment(
        id="adj_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        stock_id=body.stock_id,
        stock_name=stock.name,
        qty_before=qty_before,
        qty_after=body.qty_after,
        delta=delta,
        location=body.location,
        reason=body.reason,
        recorded_by=body.recorded_by,
    )
    db.add(adj)
    db.commit()
    return {"stock_id": stock.id, "delta": delta, "new_on_hand": stock.on_hand}


@router.post("/stock/cycle-count")
def cycle_count(body: CycleCountRequest, db: Session = Depends(get_db)):
    results = []
    for count in body.counts:
        stock = db.query(StockItem).filter(StockItem.id == count.get("stockId")).first()
        if not stock:
            continue
        loc = (count.get("location", "store")).lower()
        counted = float(count.get("counted_qty", 0))
        if "bar" in loc:
            before = stock.bar_qty or 0
            stock.bar_qty = counted
        elif "kitchen" in loc:
            before = stock.kitchen_qty or 0
            stock.kitchen_qty = counted
        else:
            before = stock.store_qty or 0
            stock.store_qty = counted

        stock.on_hand = (stock.store_qty or 0) + (stock.kitchen_qty or 0) + (stock.bar_qty or 0)
        results.append({"stockId": stock.id, "delta": counted - before})

    db.commit()
    return {"results": results}


@router.post("/waste-log")
def log_waste(body: WasteRequest, db: Session = Depends(get_db)):
    stock = db.query(StockItem).filter(StockItem.id == body.stock_id).first()
    if not stock:
        raise HTTPException(404, "Stock item not found")
    cost = body.qty * (stock.unit_cost or 0)
    loc = (body.location or "kitchen").lower()
    if "bar" in loc:
        stock.bar_qty = max(0, (stock.bar_qty or 0) - body.qty)
    elif "kitchen" in loc:
        stock.kitchen_qty = max(0, (stock.kitchen_qty or 0) - body.qty)
    else:
        stock.store_qty = max(0, (stock.store_qty or 0) - body.qty)
    stock.on_hand = max(0, (stock.on_hand or 0) - body.qty)

    entry = WasteLog(
        id="wst_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        stock_id=body.stock_id,
        stock_name=stock.name,
        qty=body.qty,
        uom=stock.uom,
        reason=body.reason,
        cost=cost,
        location=body.location,
        recorded_by=body.recorded_by,
    )
    db.add(entry)
    db.commit()
    return {"stock_id": stock.id, "wasted_qty": body.qty, "cost": cost}


# ── Crate Ledger ──────────────────────────────────────────────────────────────

@router.get("/crate-ledger")
def list_crate_ledger(db: Session = Depends(get_db)):
    entries = db.query(CrateLedger).order_by(CrateLedger.created_at.desc()).limit(100).all()
    return [
        {"id": e.id, "stock_id": e.stock_id, "stock_name": e.stock_name,
         "type": e.type, "qty": e.qty, "ref": e.ref, "notes": e.notes,
         "created_at": e.created_at.isoformat() if e.created_at else None}
        for e in entries
    ]


@router.post("/crate-ledger/return")
def return_crates(body: CrateReturnRequest, db: Session = Depends(get_db)):
    stock = db.query(StockItem).filter(StockItem.id == body.stock_id).first()
    if not stock:
        raise HTTPException(404, "Stock item not found")
    stock.crates_owed_supplier = max(0, (stock.crates_owed_supplier or 0) - body.qty)
    entry = CrateLedger(
        id="crt_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        stock_id=body.stock_id,
        stock_name=stock.name,
        type="returned",
        qty=body.qty,
        supplier_id=body.supplier_id,
        ref=body.ref,
        notes=body.notes,
    )
    db.add(entry)
    db.commit()
    return {"stock_id": stock.id, "returned_qty": body.qty}


# ── Suppliers ─────────────────────────────────────────────────────────────────

@router.get("/suppliers")
def list_suppliers(db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).filter(Supplier.active == True).all()
    return [
        {"id": s.id, "name": s.name, "contact": s.contact, "phone": s.phone,
         "terms": s.terms, "lead_days": s.lead_days, "rating": s.rating,
         "categories": s.categories, "returnable_supported": s.returnable_supported}
        for s in suppliers
    ]


@router.post("/suppliers", status_code=201)
def create_supplier(body: dict, db: Session = Depends(get_db)):
    sup = Supplier(id="sup_" + uuid.uuid4().hex[:8], **body)
    db.add(sup)
    db.commit()
    return {"id": sup.id}
