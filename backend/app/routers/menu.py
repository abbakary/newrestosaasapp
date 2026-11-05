"""Menu router — CRUD, 86 toggle, quick-add, review."""
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.menu import MenuItem
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/menu", tags=["menu"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class MenuItemCreate(BaseModel):
    name: str
    emoji: Optional[str] = "🍽️"
    price: float
    category: str
    cook_time_mins: Optional[int] = 10
    rating: Optional[float] = 4.5
    station: Optional[str] = "grill"
    allergens: Optional[list] = []
    description: Optional[str] = None
    description_sw: Optional[str] = None
    image_url: Optional[str] = None
    stock_id: Optional[str] = None
    pack_multiplier: Optional[int] = 1
    featured: Optional[bool] = False
    item_type: Optional[str] = "kitchen_simple"
    tracking_mode: Optional[str] = "simple_issue"
    name_sw: Optional[str] = None
    tenant_id: Optional[str] = None

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    cook_time_mins: Optional[int] = None
    station: Optional[str] = None
    allergens: Optional[list] = None
    description: Optional[str] = None
    description_sw: Optional[str] = None
    image_url: Optional[str] = None
    stock_id: Optional[str] = None
    pack_multiplier: Optional[int] = None
    featured: Optional[bool] = None
    available: Optional[bool] = None
    needs_review: Optional[bool] = None
    item_type: Optional[str] = None
    tracking_mode: Optional[str] = None
    name_sw: Optional[str] = None
    rating: Optional[float] = None

class QuickAddRequest(BaseModel):
    name: str
    price: float
    category: str
    station: Optional[str] = "grill"
    emoji: Optional[str] = "🍽️"
    tenant_id: Optional[str] = None


def _item_dict(item: MenuItem) -> dict:
    return {
        "id": item.id, "name": item.name, "name_sw": item.name_sw,
        "emoji": item.emoji, "price": item.price, "category": item.category,
        "cook_time_mins": item.cook_time_mins, "rating": item.rating,
        "station": item.station, "allergens": item.allergens or [],
        "description": item.description, "description_sw": item.description_sw,
        "image_url": item.image_url, "stock_id": item.stock_id,
        "pack_multiplier": item.pack_multiplier, "featured": item.featured,
        "available": item.available, "needs_review": item.needs_review,
        "item_type": item.item_type, "tracking_mode": item.tracking_mode,
        "active": item.active,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("")
def list_menu(
    category: Optional[str] = None,
    available_only: bool = False,
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(MenuItem).filter(MenuItem.active == True)
    if tenant_id:
        q = q.filter(MenuItem.tenant_id == tenant_id)
    if category and category != "All":
        q = q.filter(MenuItem.category == category)
    if available_only:
        q = q.filter(MenuItem.available == True)
    items = q.order_by(MenuItem.category, MenuItem.name).all()
    return [_item_dict(i) for i in items]


@router.get("/{item_id}")
def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.active == True).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    return _item_dict(item)


@router.post("", status_code=201)
def create_menu_item(body: MenuItemCreate, db: Session = Depends(get_db)):
    item = MenuItem(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_dict(item)


@router.put("/{item_id}")
def update_menu_item(item_id: int, body: MenuItemUpdate, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    item.updated_at = datetime.utcnow()
    db.commit()
    return _item_dict(item)


@router.delete("/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    item.active = False
    db.commit()
    return {"ok": True}


@router.put("/{item_id}/availability")
def toggle_86(item_id: int, db: Session = Depends(get_db)):
    """Toggle 86 (out-of-stock) status."""
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    item.available = not item.available
    db.commit()
    return {"id": item.id, "available": item.available}


@router.post("/quick-add", status_code=201)
def quick_add(body: QuickAddRequest, db: Session = Depends(get_db)):
    """Fast-register a menu item marked needs_review=True."""
    item = MenuItem(
        name=body.name,
        emoji=body.emoji,
        price=body.price,
        category=body.category,
        station=body.station,
        needs_review=True,
        available=True,
        tenant_id=body.tenant_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_dict(item)


@router.put("/{item_id}/review")
def review_menu_item(item_id: int, body: MenuItemUpdate, db: Session = Depends(get_db)):
    """Manager approves and enriches a quick-added menu item."""
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    item.needs_review = False
    item.updated_at = datetime.utcnow()
    db.commit()
    return _item_dict(item)
