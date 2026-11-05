"""BOM, ProductionOrder, FinishedGood, SiteRequisition, Recipe models."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from app.database import Base


class Recipe(Base):
    """Menu item BOM — maps menu item to ingredient list."""
    __tablename__ = "recipes"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    menu_item_id = Column(Integer, nullable=False)  # FK to menu_items.id
    ingredients = Column(JSON, default=[])          # [{stockId, qty}]


class BOM(Base):
    """Central Kitchen Bill of Materials for batch production."""
    __tablename__ = "boms"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    output_fg_id = Column(String)       # FK to finished_goods.id
    output_name = Column(String)
    target_yield = Column(Float, default=1)
    uom = Column(String, default="portion")
    prep_time_mins = Column(Integer, default=30)
    shelf_life_hours = Column(Integer, default=24)
    labor_cost = Column(Float, default=0)
    overhead_cost = Column(Float, default=0)
    allergens = Column(JSON, default=[])
    target_storage = Column(String)
    ingredients = Column(JSON, default=[])  # [{stockId, name, qty, uom}]
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FinishedGood(Base):
    """Central kitchen pre-made items dispatched to outlets."""
    __tablename__ = "finished_goods"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    bom_id = Column(String, nullable=True)
    uom = Column(String, default="portion")
    on_hand = Column(Float, default=0)
    unit_cost = Column(Float, default=0)
    shelf_life_hours = Column(Integer, default=24)
    last_produced = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProductionOrder(Base):
    """Kitchen work order."""
    __tablename__ = "production_orders"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    batch_no = Column(String)
    bom_id = Column(String, ForeignKey("boms.id"), nullable=True)
    product_name = Column(String)
    planned_yield = Column(Float, default=1)
    actual_yield = Column(Float, nullable=True)
    uom = Column(String, default="portion")
    status = Column(String, default="planned")  # planned|in_production|completed
    operator = Column(String)
    labor_cost = Column(Float, default=0)
    overhead_cost = Column(Float, default=0)
    materials_cost = Column(Float, default=0)
    total_batch_cost = Column(Float, default=0)
    unit_cost = Column(Float, default=0)
    yield_variance_pct = Column(Float, default=0)
    temp_log = Column(JSON, default=[])
    notes = Column(Text)
    expiry_date = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class SiteRequisition(Base):
    """Dispatch of central kitchen batches to outlet sites."""
    __tablename__ = "site_requisitions"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    from_site = Column(String, default="Central Kitchen")
    to_site = Column(String)
    items = Column(JSON, default=[])    # [{fgId, name, qty, uom}]
    status = Column(String, default="pending")  # pending|dispatched|received
    dispatched_by = Column(String)
    received_by = Column(String)
    dispatch_notes = Column(Text)
    receive_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    dispatched_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)
