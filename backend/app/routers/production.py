"""Production router — BOMs, production orders, finished goods, site requisitions, recipes."""
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.production import BOM, FinishedGood, ProductionOrder, SiteRequisition, Recipe
from app.models.inventory import StockItem

router = APIRouter(prefix="/api/production", tags=["production"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class BOMCreate(BaseModel):
    name: str
    output_fg_id: Optional[str] = None
    output_name: Optional[str] = None
    target_yield: Optional[float] = 1
    uom: Optional[str] = "portion"
    prep_time_mins: Optional[int] = 30
    shelf_life_hours: Optional[int] = 24
    labor_cost: Optional[float] = 0
    overhead_cost: Optional[float] = 0
    allergens: Optional[list] = []
    target_storage: Optional[str] = None
    ingredients: Optional[list] = []   # [{stockId, name, qty, uom}]
    tenant_id: Optional[str] = None

class ProductionOrderCreate(BaseModel):
    bom_id: Optional[str] = None
    product_name: str
    planned_yield: float
    uom: Optional[str] = "portion"
    operator: Optional[str] = None
    labor_cost: Optional[float] = 0
    overhead_cost: Optional[float] = 0
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class SiteRequisitionCreate(BaseModel):
    from_site: Optional[str] = "Central Kitchen"
    to_site: str
    items: List[dict]   # [{fgId, name, qty, uom}]
    tenant_id: Optional[str] = None

class RecipeCreate(BaseModel):
    menu_item_id: int
    ingredients: List[dict]     # [{stockId, qty}]
    tenant_id: Optional[str] = None


# ── Recipes ────────────────────────────────────────────────────────────────────

@router.get("/recipes")
def list_recipes(db: Session = Depends(get_db)):
    recipes = db.query(Recipe).all()
    return [{"id": r.id, "menu_item_id": r.menu_item_id, "ingredients": r.ingredients} for r in recipes]


@router.post("/recipes", status_code=201)
def create_recipe(body: RecipeCreate, db: Session = Depends(get_db)):
    # Upsert: one recipe per menu item
    existing = db.query(Recipe).filter(Recipe.menu_item_id == body.menu_item_id).first()
    if existing:
        existing.ingredients = body.ingredients
        db.commit()
        return {"id": existing.id, "menu_item_id": existing.menu_item_id}
    recipe = Recipe(
        id="rec_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        menu_item_id=body.menu_item_id,
        ingredients=body.ingredients,
    )
    db.add(recipe)
    db.commit()
    return {"id": recipe.id, "menu_item_id": recipe.menu_item_id}


# ── BOMs ───────────────────────────────────────────────────────────────────────

@router.get("/boms")
def list_boms(db: Session = Depends(get_db)):
    boms = db.query(BOM).filter(BOM.active == True).all()
    return [_bom_dict(b) for b in boms]


@router.post("/boms", status_code=201)
def create_bom(body: BOMCreate, db: Session = Depends(get_db)):
    bom = BOM(id="bom_" + uuid.uuid4().hex[:8], **body.model_dump())
    db.add(bom)
    db.commit()
    return _bom_dict(bom)


@router.put("/boms/{bom_id}")
def update_bom(bom_id: str, body: dict, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(404, "BOM not found")
    for k, v in body.items():
        if hasattr(bom, k):
            setattr(bom, k, v)
    db.commit()
    return _bom_dict(bom)


def _bom_dict(b: BOM) -> dict:
    return {
        "id": b.id, "name": b.name, "output_fg_id": b.output_fg_id,
        "output_name": b.output_name, "target_yield": b.target_yield, "uom": b.uom,
        "prep_time_mins": b.prep_time_mins, "shelf_life_hours": b.shelf_life_hours,
        "labor_cost": b.labor_cost, "overhead_cost": b.overhead_cost,
        "allergens": b.allergens, "target_storage": b.target_storage,
        "ingredients": b.ingredients, "active": b.active,
    }


# ── Finished Goods ─────────────────────────────────────────────────────────────

@router.get("/finished-goods")
def list_finished_goods(db: Session = Depends(get_db)):
    fgs = db.query(FinishedGood).all()
    return [
        {"id": f.id, "name": f.name, "bom_id": f.bom_id, "uom": f.uom,
         "on_hand": f.on_hand, "unit_cost": f.unit_cost,
         "shelf_life_hours": f.shelf_life_hours,
         "last_produced": f.last_produced.isoformat() if f.last_produced else None}
        for f in fgs
    ]


# ── Production Orders ─────────────────────────────────────────────────────────

@router.get("/production-orders")
def list_production_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(ProductionOrder)
    if status:
        q = q.filter(ProductionOrder.status == status)
    orders = q.order_by(ProductionOrder.created_at.desc()).all()
    return [_po_dict(p) for p in orders]


@router.post("/production-orders", status_code=201)
def create_production_order(body: ProductionOrderCreate, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.id == body.bom_id).first() if body.bom_id else None
    count = db.query(ProductionOrder).count()
    batch_no = f"WO-{datetime.utcnow().year}-{count + 1:04d}"

    # Calculate materials cost from BOM
    materials_cost = 0.0
    if bom:
        for ing in (bom.ingredients or []):
            stock = db.query(StockItem).filter(StockItem.id == ing.get("stockId")).first()
            if stock:
                materials_cost += float(ing.get("qty", 0)) * float(stock.unit_cost or 0)
        materials_cost *= body.planned_yield / max(bom.target_yield, 1)

    total_cost = materials_cost + (body.labor_cost or 0) + (body.overhead_cost or 0)
    unit_cost = total_cost / body.planned_yield if body.planned_yield else 0

    po = ProductionOrder(
        id="prod_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        batch_no=batch_no,
        bom_id=body.bom_id,
        product_name=body.product_name,
        planned_yield=body.planned_yield,
        uom=body.uom,
        status="planned",
        operator=body.operator,
        labor_cost=body.labor_cost or 0,
        overhead_cost=body.overhead_cost or 0,
        materials_cost=materials_cost,
        total_batch_cost=total_cost,
        unit_cost=unit_cost,
        notes=body.notes,
    )
    db.add(po)
    db.commit()
    return _po_dict(po)


@router.put("/production-orders/{po_id}/start")
def start_production(po_id: str, db: Session = Depends(get_db)):
    po = db.query(ProductionOrder).filter(ProductionOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Production order not found")
    po.status = "in_production"
    po.temp_log = (po.temp_log or []) + [
        {"ts": datetime.utcnow().isoformat(), "event": "Production started"}
    ]
    db.commit()
    return _po_dict(po)


@router.put("/production-orders/{po_id}/complete")
def complete_production(po_id: str, body: dict, db: Session = Depends(get_db)):
    """Complete production: deduct ingredients from kitchen stock, increment finished goods."""
    po = db.query(ProductionOrder).filter(ProductionOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Production order not found")

    actual_yield = float(body.get("actual_yield", po.planned_yield))
    po.actual_yield = actual_yield
    po.status = "completed"
    po.completed_at = datetime.utcnow()
    po.expiry_date = body.get("expiry_date")

    # Calculate yield variance
    if po.planned_yield:
        po.yield_variance_pct = round((actual_yield - po.planned_yield) / po.planned_yield * 100, 2)

    # Deduct ingredients from kitchen stock based on BOM
    bom = db.query(BOM).filter(BOM.id == po.bom_id).first() if po.bom_id else None
    if bom:
        scale = actual_yield / max(bom.target_yield, 1)
        for ing in (bom.ingredients or []):
            stock = db.query(StockItem).filter(StockItem.id == ing.get("stockId")).first()
            if stock:
                qty_used = float(ing.get("qty", 0)) * scale
                stock.kitchen_qty = max(0, (stock.kitchen_qty or 0) - qty_used)
                stock.on_hand = max(0, (stock.on_hand or 0) - qty_used)

        # Increment finished good
        if bom.output_fg_id:
            fg = db.query(FinishedGood).filter(FinishedGood.id == bom.output_fg_id).first()
            if fg:
                fg.on_hand = (fg.on_hand or 0) + actual_yield
                fg.last_produced = datetime.utcnow()
                fg.unit_cost = po.total_batch_cost / actual_yield if actual_yield else 0

    db.commit()
    return _po_dict(po)


def _po_dict(po: ProductionOrder) -> dict:
    return {
        "id": po.id, "batch_no": po.batch_no, "bom_id": po.bom_id,
        "product_name": po.product_name, "planned_yield": po.planned_yield,
        "actual_yield": po.actual_yield, "uom": po.uom, "status": po.status,
        "operator": po.operator, "labor_cost": po.labor_cost,
        "overhead_cost": po.overhead_cost, "materials_cost": po.materials_cost,
        "total_batch_cost": po.total_batch_cost, "unit_cost": po.unit_cost,
        "yield_variance_pct": po.yield_variance_pct,
        "temp_log": po.temp_log, "notes": po.notes, "expiry_date": po.expiry_date,
        "created_at": po.created_at.isoformat() if po.created_at else None,
        "completed_at": po.completed_at.isoformat() if po.completed_at else None,
    }


# ── Site Requisitions ─────────────────────────────────────────────────────────

@router.get("/site-requisitions")
def list_requisitions(db: Session = Depends(get_db)):
    reqs = db.query(SiteRequisition).order_by(SiteRequisition.created_at.desc()).all()
    return [_req_dict(r) for r in reqs]


@router.post("/site-requisitions", status_code=201)
def create_requisition(body: SiteRequisitionCreate, db: Session = Depends(get_db)):
    req = SiteRequisition(
        id="req_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        from_site=body.from_site,
        to_site=body.to_site,
        items=body.items,
        status="pending",
    )
    db.add(req)
    db.commit()
    return _req_dict(req)


@router.put("/site-requisitions/{req_id}/dispatch")
def dispatch_requisition(req_id: str, body: dict, db: Session = Depends(get_db)):
    req = db.query(SiteRequisition).filter(SiteRequisition.id == req_id).first()
    if not req:
        raise HTTPException(404, "Requisition not found")
    req.status = "dispatched"
    req.dispatched_by = body.get("dispatched_by")
    req.dispatched_at = datetime.utcnow()
    req.dispatch_notes = body.get("notes")
    # Deduct from finished goods
    for item in (req.items or []):
        fg = db.query(FinishedGood).filter(FinishedGood.id == item.get("fgId")).first()
        if fg:
            fg.on_hand = max(0, (fg.on_hand or 0) - float(item.get("qty", 0)))
    db.commit()
    return _req_dict(req)


@router.put("/site-requisitions/{req_id}/receive")
def receive_requisition(req_id: str, body: dict, db: Session = Depends(get_db)):
    req = db.query(SiteRequisition).filter(SiteRequisition.id == req_id).first()
    if not req:
        raise HTTPException(404, "Requisition not found")
    req.status = "received"
    req.received_by = body.get("received_by")
    req.received_at = datetime.utcnow()
    req.receive_notes = body.get("notes")
    db.commit()
    return _req_dict(req)


def _req_dict(r: SiteRequisition) -> dict:
    return {
        "id": r.id, "from_site": r.from_site, "to_site": r.to_site,
        "items": r.items, "status": r.status,
        "dispatched_by": r.dispatched_by,
        "received_by": r.received_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "dispatched_at": r.dispatched_at.isoformat() if r.dispatched_at else None,
        "received_at": r.received_at.isoformat() if r.received_at else None,
    }
