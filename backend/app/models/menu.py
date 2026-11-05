"""Menu item model."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from app.database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    name_sw = Column(String)            # Swahili name
    emoji = Column(String, default="🍽️")
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)   # Grills|Drinks|Burgers|etc.
    cook_time_mins = Column(Integer, default=10)
    rating = Column(Float, default=4.5)
    station = Column(String, default="grill")   # grill|bar|fry|sides|dessert
    allergens = Column(JSON, default=[])
    description = Column(Text)
    description_sw = Column(Text)
    image_url = Column(String)
    stock_id = Column(String, nullable=True)    # FK to stock item (direct-link drinks)
    pack_multiplier = Column(Integer, default=1)
    featured = Column(Boolean, default=False)
    available = Column(Boolean, default=True)   # False = 86'd
    needs_review = Column(Boolean, default=False)
    item_type = Column(String, default="kitchen_simple")    # direct_resale|kitchen_simple|recipe_dish
    tracking_mode = Column(String, default="simple_issue")  # direct_link|simple_issue|recipe_bom
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
