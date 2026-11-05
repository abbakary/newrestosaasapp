"""Stock, Transfer, PurchaseOrder, RFQ, CrateLedger, WasteLog models."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    contact = Column(String)
    phone = Column(String)
    terms = Column(String)
    lead_days = Column(Integer, default=2)
    rating = Column(Float, default=4.0)
    categories = Column(JSON, default=[])
    returnable_supported = Column(Boolean, default=False)
    active = Column(Boolean, default=True)


class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    category = Column(String)
    uom = Column(String, default="kg")
    base_unit = Column(String, default="kg")
    purchase_units = Column(JSON, default=[])   # [{name, factor}]
    default_purchase_unit = Column(String)
    last_purchase_unit = Column(String)
    last_purchase_price = Column(Float, default=0)
    on_hand = Column(Float, default=0)
    store_qty = Column(Float, default=0)
    kitchen_qty = Column(Float, default=0)
    bar_qty = Column(Float, default=0)
    par_level = Column(Float, default=0)
    reorder_point = Column(Float, default=0)
    unit_cost = Column(Float, default=0)
    selling_price = Column(Float, nullable=True)
    item_type = Column(String, default="raw_material")      # raw_material|direct_resale
    tracking_mode = Column(String, default="simple_issue")  # direct_link|simple_issue|recipe_bom
    location = Column(String)
    theoretical = Column(Float, default=0)
    menu_id = Column(Integer, nullable=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    returnable = Column(Boolean, default=False)
    crates_on_hand = Column(Integer, default=0)
    empty_bottles_on_hand = Column(Integer, default=0)
    crates_owed_supplier = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier")


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    from_location = Column(String)
    to_location = Column(String)
    items = Column(JSON, default=[])    # [{stockId, name, qty, uom}]
    transferred_by = Column(String)
    accepted_by = Column(String)
    status = Column(String, default="done")     # pending|done
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    supplier_name = Column(String)
    site_id = Column(String)
    status = Column(String, default="pending_approval")     # pending_approval|approved|received|paid
    items = Column(JSON, default=[])    # [{stockId, name, qty, unitPrice, uom}]
    total = Column(Float, default=0)
    notes = Column(Text)
    temp_log = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    received_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    supplier = relationship("Supplier")


class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    title = Column(String)
    status = Column(String, default="open")     # open|closed|converted
    items = Column(JSON, default=[])            # [{stockId, name, qty, uom}]
    bids = Column(JSON, default=[])             # [{supplierId, supplierName, items:[{stockId, unitPrice}], total, notes}]
    selected_bid_index = Column(Integer, nullable=True)
    po_id = Column(String, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class CrateLedger(Base):
    __tablename__ = "crate_ledger"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    stock_id = Column(String, ForeignKey("stock_items.id"))
    stock_name = Column(String)
    type = Column(String)   # received|returned|lost
    qty = Column(Integer, default=0)
    supplier_id = Column(String, nullable=True)
    ref = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    stock_item = relationship("StockItem")


class WasteLog(Base):
    __tablename__ = "waste_log"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    stock_id = Column(String, ForeignKey("stock_items.id"))
    stock_name = Column(String)
    qty = Column(Float, default=0)
    uom = Column(String)
    reason = Column(String)     # spoilage|breakage|expired|theft|other
    cost = Column(Float, default=0)
    location = Column(String)
    recorded_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    stock_item = relationship("StockItem")


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    stock_id = Column(String, ForeignKey("stock_items.id"))
    stock_name = Column(String)
    qty_before = Column(Float, default=0)
    qty_after = Column(Float, default=0)
    delta = Column(Float, default=0)
    location = Column(String)
    reason = Column(String)
    recorded_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    stock_item = relationship("StockItem")
