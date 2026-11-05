"""Seed database with demo data matching frontend constants.
Mirrors: src/data.js, src/data_accounting.js, src/data_hr.js seed entities.
"""
import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from app.services.auth import hash_password
from app.services.payroll import compute_payslip
from app.models.tenant import Package, Tenant, SaasInvoice
from app.models.user import User, Waiter
from app.models.menu import MenuItem
from app.models.inventory import Supplier, StockItem
from app.models.production import Recipe, BOM, FinishedGood
from app.models.accounting import (
    AccountAccount, AccountPartner, Invoice, InvoiceLine,
    AccountPayment, JournalEntry, JournalEntryLine, BankAccount,
)
from app.models.hr import (
    Department, JobPosition, Employee, SalaryStructure, SalaryRule,
    PayslipBatch, Payslip, EmployeeExpense, Leave, AttendanceRecord,
)
from app.models.settings import TenantSettings, Checklist, Expense
from app.models.order import AuditLog


def ds(days_ago: int) -> str:
    return (date.today() - timedelta(days=days_ago)).isoformat()


def run(db: Session):
    """Run all seed functions if DB is empty."""
    if db.query(Package).first():
        return  # Already seeded
    print("Seeding database...")
    _seed_packages(db)
    _seed_tenants(db)
    _seed_users_and_waiters(db)
    _seed_menu(db)
    _seed_suppliers(db)
    _seed_stock(db)
    _seed_recipes(db)
    _seed_boms(db)
    _seed_chart_of_accounts(db)
    _seed_partners(db)
    _seed_invoices(db)
    _seed_payments(db)
    _seed_journal_entries(db)
    _seed_bank_accounts(db)
    _seed_hr(db)
    _seed_settings(db)
    _seed_checklists(db)
    db.commit()
    print("Seeding complete.")


# ── Packages ──────────────────────────────────────────────────────────────────

def _seed_packages(db: Session):
    packages = [
        Package(
            id="pkg_starter",
            name="Starter",
            tagline="Perfect for a single outlet",
            price_monthly=99000,
            price_annual=990000,
            popular=False,
            color="#6b7280",
            icon="🥗",
            limits={"branches": 1, "tables": 10, "staffUsers": 5, "posTerminals": 1,
                    "kdsScreens": 1, "inventoryStorage": "5GB"},
            modules=["pos", "kitchen", "inventory"],
            features=["QR Table Ordering", "KDS", "POS", "Basic Inventory", "2 Waiters"],
        ),
        Package(
            id="pkg_growth",
            name="Growth",
            tagline="For expanding restaurants & lounges",
            price_monthly=249000,
            price_annual=2490000,
            popular=True,
            color="#1C7A4B",
            icon="🍽️",
            limits={"branches": 3, "tables": 30, "staffUsers": 20, "posTerminals": 3,
                    "kdsScreens": 2, "inventoryStorage": "20GB"},
            modules=["pos", "kitchen", "inventory", "production", "accounting", "hr", "manager"],
            features=["All Starter features", "Accounting & Finance", "HR & Payroll",
                      "Production Module", "Multi-Branch", "10 Waiters", "Analytics"],
        ),
        Package(
            id="pkg_enterprise",
            name="Enterprise",
            tagline="Full ERP for large hospitality groups",
            price_monthly=590000,
            price_annual=5900000,
            popular=False,
            color="#875A7B",
            icon="👑",
            limits={"branches": -1, "tables": -1, "staffUsers": -1, "posTerminals": -1,
                    "kdsScreens": -1, "inventoryStorage": "Unlimited"},
            modules=["pos", "kitchen", "inventory", "production", "accounting", "hr",
                     "manager", "hq"],
            features=["All Growth features", "HQ Multi-Branch Console", "Unlimited Branches",
                      "API Access", "Custom Reports", "Dedicated Support", "SLA"],
        ),
    ]
    db.add_all(packages)
    db.flush()


# ── Tenant ────────────────────────────────────────────────────────────────────

def _seed_tenants(db: Session):
    tenant = Tenant(
        id="tenant_safari",
        name="Safari Grill & Lounge",
        slug="safari-grill",
        domain="safari-grill.restoerp.io",
        concept="Dine-in Flame Grill & Lounge",
        package_id="pkg_growth",
        billing_cycle="monthly",
        status="active",
        is_trial=False,
        city="Masaki, Dar es Salaam",
        country="Tanzania",
        currency="TSh",
        admin_name="David Kimani",
        admin_email="david.k@safariholding.tz",
        admin_phone="0718000777",
        branches_count=3,
        tables_count=16,
        staff_count=10,
        logo_emoji="🍽️",
        payment_method="Bank Wire",
        monthly_fee=249000,
        mrr=249000,
        notes="Flagship restaurant group. 3 branches.",
    )
    db.add(tenant)
    # Second demo tenant
    db.add(Tenant(
        id="tenant_kilimanjaro",
        name="Kilimanjaro Cafe & Bakery",
        slug="kilimanjaro-cafe",
        domain="kilimanjaro-cafe.restoerp.io",
        concept="Cafe, Bakery & Light Meals",
        package_id="pkg_starter",
        billing_cycle="monthly",
        status="trial",
        is_trial=True,
        city="Arusha",
        country="Tanzania",
        currency="TSh",
        admin_name="Amina Mwangi",
        admin_email="amina@kilicafe.tz",
        admin_phone="0756112233",
        branches_count=1,
        tables_count=8,
        staff_count=5,
        logo_emoji="☕",
        monthly_fee=99000,
        mrr=99000,
    ))
    db.flush()


# ── Users & Waiters ───────────────────────────────────────────────────────────

def _seed_users_and_waiters(db: Session):
    demo_pw = hash_password("demo")

    # Waiters first (needed for user FK)
    waiters_data = [
        Waiter(id="w1", tenant_id="tenant_safari", name="Amani Juma",
               phone="0713000222", token="amani-7QK2", active=True,
               tables=["T1", "T2", "T3"], avatar="AJ"),
        Waiter(id="w2", tenant_id="tenant_safari", name="Neema Mushi",
               phone="0713000223", token="neema-9LK4", active=True,
               tables=["T4", "T5", "T6"], avatar="NM"),
    ]
    db.add_all(waiters_data)
    db.flush()

    users = [
        User(id="u_super", tenant_id=None, role="superadmin",
             name="Amina Mwamba (System Provider)", phone="0700000000",
             password_hash=demo_pw, title="System SuperAdmin"),
        User(id="u_owner", tenant_id="tenant_safari", role="owner",
             name="David Kimani", phone="0718000777",
             password_hash=demo_pw, title="Group CEO & Owner",
             email="david.k@safariholding.tz"),
        User(id="u_mgr", tenant_id="tenant_safari", role="manager",
             name="Rehema Said", phone="0715000444",
             password_hash=demo_pw, title="General Manager",
             email="rehema.s@safarigrill.tz"),
        User(id="u_cashier", tenant_id="tenant_safari", role="cashier",
             name="Zawadi Ally", phone="0714000333",
             password_hash=demo_pw, title="Head Cashier",
             email="zawadi.a@safarigrill.tz"),
        User(id="u_waiter1", tenant_id="tenant_safari", role="waiter",
             name="Amani Juma", phone="0713000222",
             password_hash=demo_pw, waiter_id="w1"),
        User(id="u_waiter2", tenant_id="tenant_safari", role="waiter",
             name="Neema Mushi", phone="0713000223",
             password_hash=demo_pw, waiter_id="w2"),
        User(id="u_chef", tenant_id="tenant_safari", role="chef",
             name="Chef Baraka Mwalimu", phone="0716000555",
             password_hash=demo_pw, title="Head Chef"),
        User(id="u_store", tenant_id="tenant_safari", role="storekeeper",
             name="Hamisi Bakari", phone="0717000666",
             password_hash=demo_pw, title="Storekeeper"),
        User(id="u_prod", tenant_id="tenant_safari", role="production",
             name="Jaffar Mdee", phone="0719000888",
             password_hash=demo_pw, title="Production Manager"),
    ]
    db.add_all(users)
    db.flush()


# ── Menu ──────────────────────────────────────────────────────────────────────

def _seed_menu(db: Session):
    items = [
        MenuItem(id=1, tenant_id="tenant_safari", name="Roasted Chicken", emoji="🍗",
                 price=18000, category="Grills", cook_time_mins=15, rating=4.8,
                 station="grill", allergens=["Garlic"],
                 description="Half chicken roasted with lemon, garlic, rosemary. Served with sauce.",
                 image_url="https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=2, tenant_id="tenant_safari", name="Mishkaki Platter", emoji="🍢",
                 price=16000, category="Grills", cook_time_mins=12, rating=4.7,
                 station="grill", allergens=["Chilli"],
                 description="Tender marinated beef skewers fire-grilled on charcoal.",
                 image_url="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=3, tenant_id="tenant_safari", name="Grilled Tilapia", emoji="🐟",
                 price=22000, category="Grills", cook_time_mins=20, rating=4.6,
                 station="grill", allergens=["Fish"],
                 description="Fresh Lake Victoria tilapia in Swahili coconut-tamarind sauce.",
                 image_url="https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=4, tenant_id="tenant_safari", name="Steakhouse Burger", emoji="🍔",
                 price=15000, category="Burgers", cook_time_mins=10, rating=4.7,
                 station="grill", allergens=["Gluten", "Dairy"],
                 description="200g prime beef patty, mature cheddar, BBQ sauce on brioche.",
                 image_url="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="recipe_dish", tracking_mode="recipe_bom"),
        MenuItem(id=5, tenant_id="tenant_safari", name="Crispy Chicken Burger", emoji="🥪",
                 price=13000, category="Burgers", cook_time_mins=10, rating=4.5,
                 station="fry", allergens=["Gluten", "Dairy"],
                 description="Golden buttermilk fried chicken breast, garlic aioli.",
                 image_url="https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=6, tenant_id="tenant_safari", name="Masala Chips", emoji="🍟",
                 price=6000, category="Snacks", cook_time_mins=8, rating=4.6,
                 station="sides", description="Crispy hand-cut fries in spicy tamarind masala.",
                 image_url="https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=7, tenant_id="tenant_safari", name="Pilau", emoji="🍛",
                 price=9000, category="Grills", cook_time_mins=10, rating=4.8,
                 station="sides", description="Authentic spiced East African basmati rice.",
                 image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=8, tenant_id="tenant_safari", name="Fresh Mango Juice", emoji="🥭",
                 price=4500, category="Drinks", cook_time_mins=3, rating=4.9,
                 station="bar", description="Cold-pressed ripe Kilombero mangoes.",
                 image_url="https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=9, tenant_id="tenant_safari", name="Passion Cooler", emoji="🍹",
                 price=5000, category="Drinks", cook_time_mins=3, rating=4.6,
                 station="bar", description="Fresh passion fruit with mint and lime.",
                 image_url="https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=10, tenant_id="tenant_safari", name="Spiced Chai", emoji="☕",
                 price=2500, category="Drinks", cook_time_mins=4, rating=4.7,
                 station="bar", allergens=["Dairy"],
                 description="Fresh cow milk simmered with cardamom, ginger and tea.",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=11, tenant_id="tenant_safari", name="Chocolate Lava", emoji="🍫",
                 price=8000, category="Desserts", cook_time_mins=9, rating=4.8,
                 station="dessert", allergens=["Gluten", "Dairy", "Eggs"],
                 description="Warm dark chocolate cake with molten centre.",
                 available=True, item_type="kitchen_simple"),
        MenuItem(id=13, tenant_id="tenant_safari", name="Kilimanjaro Mineral Water", emoji="💧",
                 price=2000, category="Drinks", cook_time_mins=1, rating=4.9,
                 station="bar", stock_id="stk_water", pack_multiplier=1,
                 description="500ml chilled mineral water.", available=True,
                 item_type="direct_resale", tracking_mode="direct_link"),
        MenuItem(id=14, tenant_id="tenant_safari", name="Coca-Cola Zero 330ml", emoji="🥤",
                 price=3000, category="Drinks", cook_time_mins=1, rating=4.7,
                 station="bar", allergens=[], stock_id="stk_coke", pack_multiplier=1,
                 description="Cold canned Coca-Cola Zero Sugar.", available=True,
                 item_type="direct_resale", tracking_mode="direct_link"),
        MenuItem(id=15, tenant_id="tenant_safari", name="Safari Premium Lager 500ml", emoji="🍺",
                 price=5000, category="Drinks", cook_time_mins=1, rating=4.8,
                 station="bar", allergens=["Gluten"], stock_id="stk_beer", pack_multiplier=1,
                 description="Tanzania's iconic full-bodied cold lager.", available=True,
                 item_type="direct_resale", tracking_mode="direct_link"),
        MenuItem(id=30, tenant_id="tenant_safari", name="Coca Cola 250ml", emoji="🥤",
                 price=2500, category="Drinks", cook_time_mins=1, rating=4.8,
                 station="bar", allergens=[], stock_id="stk_soda", pack_multiplier=1,
                 description="Chilled classic glass bottle Coca Cola.", available=True,
                 item_type="direct_resale", tracking_mode="direct_link"),
        MenuItem(id=31, tenant_id="tenant_safari", name="Bucket of 6 Beers (Safari)", emoji="🍻",
                 price=27000, category="Drinks", cook_time_mins=1, rating=4.9,
                 station="bar", allergens=["Gluten"], stock_id="stk_beer", pack_multiplier=6,
                 description="Bucket of 6 chilled Safari Premium Lagers on ice.",
                 featured=True, available=True,
                 item_type="direct_resale", tracking_mode="direct_link"),
        MenuItem(id=32, tenant_id="tenant_safari", name="Soda 500ml (Coke/Fanta/Sprite)", emoji="🥤",
                 price=2000, category="Drinks", cook_time_mins=1, rating=4.8,
                 station="bar", allergens=[], stock_id="stk_soda", pack_multiplier=1,
                 description="Chilled 500ml soda bottle.", available=True,
                 item_type="direct_resale", tracking_mode="direct_link"),
        MenuItem(id=34, tenant_id="tenant_safari", name="Castle Lite 330ml", emoji="🍺",
                 price=5000, category="Drinks", cook_time_mins=1, rating=4.8,
                 station="bar", allergens=["Gluten"], stock_id="stk_castle", pack_multiplier=1,
                 description="Extra cold Castle Lite 330ml bottle.", available=True,
                 item_type="direct_resale", tracking_mode="direct_link"),
        MenuItem(id=35, tenant_id="tenant_safari", name="Red Bull Energy Drink", emoji="⚡",
                 price=7000, category="Drinks", cook_time_mins=1, rating=4.8,
                 station="bar", allergens=[], stock_id="stk_redbull", pack_multiplier=1,
                 description="Vitalizes body and mind. 250ml chilled can.", available=True,
                 item_type="direct_resale", tracking_mode="direct_link"),
    ]
    db.add_all(items)
    db.flush()


# ── Suppliers ─────────────────────────────────────────────────────────────────

def _seed_suppliers(db: Session):
    suppliers = [
        Supplier(id="sup_serengeti", name="Serengeti Meats & Poultry",
                 contact="Bakari Hassan", phone="+255 784 112 233",
                 terms="Net 15", lead_days=2, rating=4.5,
                 categories=["Poultry", "Meat", "Seafood"]),
        Supplier(id="sup_coca", name="Coca-Cola Distributors TZ",
                 contact="Salma Omar", phone="+255 715 443 322",
                 terms="COD", lead_days=1, rating=4.8,
                 categories=["Drinks"], returnable_supported=True),
        Supplier(id="sup_farmfresh", name="Farm Fresh Tanzania Ltd",
                 contact="Hassan Mwinyi", phone="+255 754 887 766",
                 terms="Net 7", lead_days=3, rating=4.3,
                 categories=["Produce", "Vegetables"]),
        Supplier(id="sup_kibo", name="Kibo Food & Beverage Supplies",
                 contact="Fatma Juma", phone="+255 716 221 100",
                 terms="Net 30", lead_days=5, rating=4.2,
                 categories=["Dry Goods", "Bakery", "Spices"]),
        Supplier(id="sup_tbl", name="Tanzania Breweries Ltd (TBL)",
                 contact="Oscar Temba", phone="+255 22 211 5000",
                 terms="Net 14", lead_days=2, rating=4.7,
                 categories=["Beer", "Spirits"], returnable_supported=True),
    ]
    db.add_all(suppliers)
    db.flush()


# ── Stock ──────────────────────────────────────────────────────────────────────

def _seed_stock(db: Session):
    items = [
        StockItem(id="stk_chicken", name="Fresh Whole Chicken", category="Poultry",
                  uom="kg", base_unit="kg",
                  purchase_units=[{"name": "Single/Kg", "factor": 1}, {"name": "Box (10kg)", "factor": 10}],
                  default_purchase_unit="Box (10kg)", on_hand=42.5,
                  store_qty=25.0, kitchen_qty=17.5, bar_qty=0, par_level=50,
                  reorder_point=20, unit_cost=8500, item_type="raw_material",
                  tracking_mode="simple_issue", location="Cold Room", theoretical=42.5,
                  supplier_id="sup_serengeti"),
        StockItem(id="stk_beef", name="Prime Beef Tenderloin", category="Meat",
                  uom="kg", base_unit="kg",
                  purchase_units=[{"name": "Single/Kg", "factor": 1}],
                  default_purchase_unit="Single/Kg", on_hand=28.0,
                  store_qty=18.0, kitchen_qty=10.0, bar_qty=0, par_level=35,
                  reorder_point=15, unit_cost=14000, item_type="raw_material",
                  tracking_mode="recipe_bom", location="Meat Freezer", theoretical=28.0,
                  supplier_id="sup_serengeti"),
        StockItem(id="stk_tilapia", name="Fresh Tilapia (Whole)", category="Seafood",
                  uom="pcs", base_unit="pcs",
                  purchase_units=[{"name": "Single", "factor": 1}, {"name": "Crate (25pcs)", "factor": 25}],
                  default_purchase_unit="Crate (25pcs)", on_hand=24,
                  store_qty=16, kitchen_qty=8, bar_qty=0, par_level=30,
                  reorder_point=10, unit_cost=9500, item_type="raw_material",
                  location="Fish Cooler", theoretical=24, supplier_id="sup_serengeti"),
        StockItem(id="stk_potatoes", name="Mbeya Red Potatoes", category="Produce",
                  uom="kg", base_unit="kg",
                  purchase_units=[{"name": "Single/Kg", "factor": 1}, {"name": "Sack (50kg)", "factor": 50}],
                  default_purchase_unit="Sack (50kg)", on_hand=85.0,
                  store_qty=60.0, kitchen_qty=25.0, bar_qty=0, par_level=100,
                  reorder_point=40, unit_cost=1800, item_type="raw_material",
                  location="Dry Store", theoretical=85.0, supplier_id="sup_farmfresh"),
        StockItem(id="stk_rice", name="Kyela Basmati Rice", category="Dry Goods",
                  uom="kg", base_unit="kg",
                  purchase_units=[{"name": "Single/Kg", "factor": 1}, {"name": "Bag (25kg)", "factor": 25}],
                  default_purchase_unit="Bag (25kg)", on_hand=62.0,
                  store_qty=45.0, kitchen_qty=17.0, bar_qty=0, par_level=75,
                  reorder_point=25, unit_cost=3200, item_type="raw_material",
                  location="Dry Store", theoretical=62.0, supplier_id="sup_kibo"),
        # Drinks
        StockItem(id="stk_soda", name="Soda 500ml (Coke/Fanta/Sprite)", category="Drinks",
                  uom="bottles", base_unit="bottle",
                  purchase_units=[{"name": "Single", "factor": 1}, {"name": "Crate", "factor": 24}],
                  default_purchase_unit="Crate", on_hand=144,
                  store_qty=96, kitchen_qty=0, bar_qty=48, par_level=200,
                  reorder_point=48, unit_cost=1000, selling_price=2000,
                  item_type="direct_resale", tracking_mode="direct_link",
                  location="Beverage Store", theoretical=144, menu_id=32,
                  supplier_id="sup_coca", returnable=True,
                  crates_on_hand=6, empty_bottles_on_hand=38, crates_owed_supplier=8),
        StockItem(id="stk_water", name="Kilimanjaro Mineral Water 500ml", category="Drinks",
                  uom="bottles", base_unit="bottle",
                  purchase_units=[{"name": "Single", "factor": 1}, {"name": "Carton", "factor": 12}],
                  default_purchase_unit="Carton", on_hand=120,
                  store_qty=80, kitchen_qty=0, bar_qty=40, par_level=150,
                  reorder_point=40, unit_cost=800, selling_price=2000,
                  item_type="direct_resale", tracking_mode="direct_link",
                  location="Beverage Store", theoretical=120, menu_id=13,
                  supplier_id="sup_coca", returnable=False),
        StockItem(id="stk_beer", name="Safari Premium Lager 500ml", category="Drinks",
                  uom="bottles", base_unit="bottle",
                  purchase_units=[{"name": "Single", "factor": 1}, {"name": "Crate (20)", "factor": 20}],
                  default_purchase_unit="Crate (20)", on_hand=80,
                  store_qty=50, kitchen_qty=0, bar_qty=30, par_level=120,
                  reorder_point=30, unit_cost=2500, selling_price=5000,
                  item_type="direct_resale", tracking_mode="direct_link",
                  location="Bar Chiller", theoretical=80, menu_id=15,
                  supplier_id="sup_tbl", returnable=True,
                  crates_on_hand=4, empty_bottles_on_hand=28, crates_owed_supplier=6),
        StockItem(id="stk_coke", name="Coca-Cola Zero 330ml Can", category="Drinks",
                  uom="cans", base_unit="can",
                  purchase_units=[{"name": "Single", "factor": 1}, {"name": "Carton", "factor": 24}],
                  default_purchase_unit="Carton", on_hand=96,
                  store_qty=60, kitchen_qty=0, bar_qty=36, par_level=120,
                  reorder_point=30, unit_cost=1200, selling_price=3000,
                  item_type="direct_resale", tracking_mode="direct_link",
                  location="Beverage Store", theoretical=96, menu_id=14,
                  supplier_id="sup_coca", returnable=False),
        StockItem(id="stk_castle", name="Castle Lite 330ml", category="Drinks",
                  uom="bottles", base_unit="bottle",
                  purchase_units=[{"name": "Single", "factor": 1}, {"name": "Crate", "factor": 24}],
                  default_purchase_unit="Crate", on_hand=72,
                  store_qty=48, kitchen_qty=0, bar_qty=24, par_level=96,
                  reorder_point=24, unit_cost=2600, selling_price=5000,
                  item_type="direct_resale", tracking_mode="direct_link",
                  location="Bar Chiller", theoretical=72, menu_id=34,
                  supplier_id="sup_tbl", returnable=True,
                  crates_on_hand=3, empty_bottles_on_hand=20, crates_owed_supplier=4),
        StockItem(id="stk_redbull", name="Red Bull Energy Drink 250ml", category="Drinks",
                  uom="cans", base_unit="can",
                  purchase_units=[{"name": "Single", "factor": 1}, {"name": "Carton (24)", "factor": 24}],
                  default_purchase_unit="Carton (24)", on_hand=48,
                  store_qty=30, kitchen_qty=0, bar_qty=18, par_level=60,
                  reorder_point=18, unit_cost=3500, selling_price=7000,
                  item_type="direct_resale", tracking_mode="direct_link",
                  location="Bar Chiller", theoretical=48, menu_id=35,
                  supplier_id="sup_kibo", returnable=False),
        StockItem(id="stk_spices", name="Mixed Spice Blend", category="Dry Goods",
                  uom="kg", base_unit="kg",
                  purchase_units=[{"name": "Single/Kg", "factor": 1}],
                  default_purchase_unit="Single/Kg", on_hand=5.0,
                  store_qty=3.0, kitchen_qty=2.0, bar_qty=0, par_level=8,
                  reorder_point=3, unit_cost=12000, item_type="raw_material",
                  location="Dry Store", theoretical=5.0),
        StockItem(id="stk_oil", name="Sunflower Cooking Oil 1L", category="Dry Goods",
                  uom="litres", base_unit="litre",
                  purchase_units=[{"name": "Litre", "factor": 1}, {"name": "Carton (12L)", "factor": 12}],
                  default_purchase_unit="Carton (12L)", on_hand=14.0,
                  store_qty=10.0, kitchen_qty=4.0, bar_qty=0, par_level=20,
                  reorder_point=8, unit_cost=5500, item_type="raw_material",
                  location="Dry Store", theoretical=14.0),
        StockItem(id="stk_buns", name="Brioche Burger Buns", category="Bakery",
                  uom="pcs", base_unit="pcs",
                  purchase_units=[{"name": "Single", "factor": 1}, {"name": "Tray (12)", "factor": 12}],
                  default_purchase_unit="Tray (12)", on_hand=55,
                  store_qty=30, kitchen_qty=25, bar_qty=0, par_level=80,
                  reorder_point=30, unit_cost=900, item_type="raw_material",
                  location="Kitchen Pass", theoretical=55),
        StockItem(id="stk_cheese", name="Cheddar Cheese Blocks", category="Dairy",
                  uom="kg", base_unit="kg",
                  purchase_units=[{"name": "Single/Kg", "factor": 1}],
                  default_purchase_unit="Single/Kg", on_hand=8.0,
                  store_qty=5.0, kitchen_qty=3.0, bar_qty=0, par_level=12,
                  reorder_point=5, unit_cost=18000, item_type="raw_material",
                  location="Dairy Fridge", theoretical=8.0),
    ]
    db.add_all(items)
    db.flush()


# ── Recipes ────────────────────────────────────────────────────────────────────

def _seed_recipes(db: Session):
    from app.models.production import Recipe
    recipes = [
        Recipe(id="rec_1", tenant_id="tenant_safari", menu_item_id=1,
               ingredients=[{"stockId": "stk_chicken", "qty": 0.5},
                             {"stockId": "stk_spices", "qty": 0.04},
                             {"stockId": "stk_oil", "qty": 0.05}]),
        Recipe(id="rec_2", tenant_id="tenant_safari", menu_item_id=2,
               ingredients=[{"stockId": "stk_beef", "qty": 0.35},
                             {"stockId": "stk_spices", "qty": 0.05}]),
        Recipe(id="rec_3", tenant_id="tenant_safari", menu_item_id=3,
               ingredients=[{"stockId": "stk_tilapia", "qty": 1},
                             {"stockId": "stk_rice", "qty": 0.2},
                             {"stockId": "stk_spices", "qty": 0.03}]),
        Recipe(id="rec_4", tenant_id="tenant_safari", menu_item_id=4,
               ingredients=[{"stockId": "stk_beef", "qty": 0.2},
                             {"stockId": "stk_buns", "qty": 1},
                             {"stockId": "stk_cheese", "qty": 0.05}]),
        Recipe(id="rec_6", tenant_id="tenant_safari", menu_item_id=6,
               ingredients=[{"stockId": "stk_potatoes", "qty": 0.4},
                             {"stockId": "stk_oil", "qty": 0.06}]),
        Recipe(id="rec_7", tenant_id="tenant_safari", menu_item_id=7,
               ingredients=[{"stockId": "stk_rice", "qty": 0.25},
                             {"stockId": "stk_beef", "qty": 0.1},
                             {"stockId": "stk_spices", "qty": 0.03}]),
    ]
    db.add_all(recipes)
    db.flush()


# ── BOMs ───────────────────────────────────────────────────────────────────────

def _seed_boms(db: Session):
    from app.models.production import BOM, FinishedGood
    fg = FinishedGood(id="fg_nyamachoma", tenant_id="tenant_safari",
                      name="Nyama Choma Platter (Central Kitchen)",
                      uom="platter", on_hand=0, unit_cost=25000,
                      shelf_life_hours=6)
    db.add(fg)
    db.flush()
    bom = BOM(
        id="bom_nyamachoma", tenant_id="tenant_safari",
        name="Nyama Choma Mixed Grill Platter",
        output_fg_id="fg_nyamachoma", output_name="Nyama Choma Platter",
        target_yield=4, uom="platter", prep_time_mins=60, shelf_life_hours=6,
        labor_cost=10000, overhead_cost=5000,
        allergens=[],
        target_storage="Warm Hold",
        ingredients=[
            {"stockId": "stk_beef", "name": "Prime Beef", "qty": 1.5, "uom": "kg"},
            {"stockId": "stk_chicken", "name": "Chicken", "qty": 2.0, "uom": "kg"},
            {"stockId": "stk_spices", "name": "Spices", "qty": 0.2, "uom": "kg"},
            {"stockId": "stk_oil", "name": "Oil", "qty": 0.2, "uom": "litre"},
        ],
    )
    db.add(bom)
    db.flush()


# ── Chart of Accounts ──────────────────────────────────────────────────────────

def _seed_chart_of_accounts(db: Session):
    accounts = [
        AccountAccount(id="acc_1001", code="1001", name="Salaries and Wages Expense",
                       account_type="expense", category="Expenses", normal_balance="debit"),
        AccountAccount(id="acc_1002", code="1002", name="Employer NSSF Expense",
                       account_type="expense", category="Expenses", normal_balance="debit"),
        AccountAccount(id="acc_1003", code="1003", name="SDL Expense",
                       account_type="expense", category="Expenses", normal_balance="debit"),
        AccountAccount(id="acc_1004", code="1004", name="WCF Expense",
                       account_type="expense", category="Expenses", normal_balance="debit"),
        AccountAccount(id="acc_1031", code="1031", name="Bank",
                       account_type="asset", category="Bank & Cash", normal_balance="debit"),
        AccountAccount(id="acc_1032", code="1032", name="Bank Suspense Account",
                       account_type="asset", category="Bank & Cash", normal_balance="debit"),
        AccountAccount(id="acc_1033", code="1033", name="Outstanding Receipts",
                       account_type="asset", category="Bank & Cash", normal_balance="debit"),
        AccountAccount(id="acc_1501", code="1501", name="CRDB - Cash on Hand",
                       account_type="asset", category="Bank & Cash", normal_balance="debit"),
        AccountAccount(id="acc_1518", code="1518", name="Accounts Receivable",
                       account_type="receivable", category="Receivables", normal_balance="debit"),
        AccountAccount(id="acc_2001", code="2001", name="PAYE Payable",
                       account_type="liability", category="Tax Payables", normal_balance="credit"),
        AccountAccount(id="acc_2002", code="2002", name="NSSF Payable",
                       account_type="liability", category="Tax Payables", normal_balance="credit"),
        AccountAccount(id="acc_2003", code="2003", name="SDL Payable",
                       account_type="liability", category="Tax Payables", normal_balance="credit"),
        AccountAccount(id="acc_2004", code="2004", name="WCF Payable",
                       account_type="liability", category="Tax Payables", normal_balance="credit"),
        AccountAccount(id="acc_3001", code="3001", name="Share Capital",
                       account_type="equity", category="Equity", normal_balance="credit"),
        AccountAccount(id="acc_3002", code="3002", name="Retained Earnings",
                       account_type="equity", category="Equity", normal_balance="credit"),
        AccountAccount(id="acc_4000", code="4000", name="Sales Revenue",
                       account_type="income", category="Income", normal_balance="credit"),
        AccountAccount(id="acc_4001", code="4001", name="Food & Beverage Revenue",
                       account_type="income", category="Income", normal_balance="credit"),
        AccountAccount(id="acc_5001", code="5001", name="Cost of Goods Sold",
                       account_type="expense", category="COGS", normal_balance="debit"),
        AccountAccount(id="acc_5005", code="5005", name="Water Expenses",
                       account_type="expense", category="Operating Expenses", normal_balance="debit"),
        AccountAccount(id="acc_5006", code="5006", name="Electricity Expenses",
                       account_type="expense", category="Operating Expenses", normal_balance="debit"),
        AccountAccount(id="acc_5007", code="5007", name="Gas & Fuel Expenses",
                       account_type="expense", category="Operating Expenses", normal_balance="debit"),
        AccountAccount(id="acc_5008", code="5008", name="Cleaning & Hygiene",
                       account_type="expense", category="Operating Expenses", normal_balance="debit"),
        AccountAccount(id="acc_6001", code="6001", name="Trade Payables",
                       account_type="payable", category="Payables", normal_balance="credit"),
        AccountAccount(id="acc_6002", code="6002", name="VAT Payable (18%)",
                       account_type="liability", category="Tax Payables", normal_balance="credit"),
        AccountAccount(id="acc_6003", code="6003", name="Other Liabilities",
                       account_type="liability", category="Current Liabilities", normal_balance="credit"),
        AccountAccount(id="acc_7001", code="7001", name="Investments",
                       account_type="asset", category="Non-Current Assets", normal_balance="debit"),
        AccountAccount(id="acc_7002", code="7002", name="Property & Equipment",
                       account_type="asset", category="Non-Current Assets", normal_balance="debit"),
    ]
    db.add_all(accounts)
    db.flush()


# ── Partners ───────────────────────────────────────────────────────────────────

def _seed_partners(db: Session):
    partners = [
        AccountPartner(id="cust_1", partner_type="customer", name="Juma Rashid",
                       ref="CUST-001", phone="+255 712 000 111",
                       email="juma.r@gmail.com", type="individual",
                       city="Dar es Salaam", balance=120000, overdue_balance=45000),
        AccountPartner(id="cust_2", partner_type="customer", name="Safari Holdings Ltd",
                       ref="CUST-002", phone="+255 784 220 330",
                       email="accounts@safariholding.tz", type="company",
                       credit_limit=500000, city="Dar es Salaam",
                       balance=890000, overdue_balance=0),
        AccountPartner(id="cust_3", partner_type="customer", name="Marriott Hotel Dar",
                       ref="CUST-003", phone="+255 22 211 7000",
                       email="procurement@marriott.co.tz", type="company",
                       credit_limit=2000000, city="Dar es Salaam",
                       balance=2400000, overdue_balance=600000),
        AccountPartner(id="cust_4", partner_type="customer", name="Fatima Enterprises",
                       ref="CUST-004", phone="+255 755 441 221",
                       email="fatima@fatima.tz", type="company",
                       credit_limit=300000, city="Arusha",
                       balance=175000, overdue_balance=0),
        AccountPartner(id="cust_5", partner_type="customer", name="Nelson Mandela Event Co.",
                       ref="CUST-005", phone="+255 713 995 004",
                       email="events@nelsonevents.co.tz", type="company",
                       credit_limit=1000000, city="Dar es Salaam",
                       balance=560000, overdue_balance=200000),
        AccountPartner(id="vend_1", partner_type="vendor", name="Serengeti Meats & Poultry",
                       ref="VEND-001", phone="+255 784 112 233",
                       email="bakari@serengeti.tz", type="company",
                       city="Dar es Salaam", balance=422500),
        AccountPartner(id="vend_2", partner_type="vendor", name="Farm Fresh Tanzania Ltd",
                       ref="VEND-002", phone="+255 715 443 322",
                       email="salma@farmfresh.tz", type="company",
                       city="Morogoro", balance=225000, overdue_balance=225000),
        AccountPartner(id="vend_3", partner_type="vendor", name="Kibo Food & Beverage Supplies",
                       ref="VEND-003", phone="+255 754 887 766",
                       email="kibo@kibofood.tz", type="company",
                       city="Dar es Salaam", balance=176000),
        AccountPartner(id="vend_4", partner_type="vendor", name="TANESCO",
                       ref="VEND-004", phone="+255 22 211 6000",
                       email="billing@tanesco.go.tz", type="company",
                       city="Dar es Salaam", balance=180000),
    ]
    db.add_all(partners)
    db.flush()


# ── Invoices ───────────────────────────────────────────────────────────────────

def _seed_invoices(db: Session):
    def make_inv(id_, no, date_, due, partner_id, partner_name, lines_data, state, ref="", notes=""):
        lines_db = []
        subtotal = 0; tax_amt = 0
        for ln in lines_data:
            s = round(ln["qty"] * ln["price"], 2)
            t = round(s * ln.get("tax", 18) / 100, 2)
            subtotal += s; tax_amt += t
            lines_db.append(InvoiceLine(
                id=f"invl_{uuid.uuid4().hex[:6]}",
                invoice_id=id_,
                description=ln["desc"],
                account_code="4001",
                quantity=ln["qty"], unit_price=ln["price"],
                tax_rate=ln.get("tax", 18),
                tax_amount=t, subtotal=s, total=s + t,
            ))
        total = subtotal + tax_amt
        paid = total if state == "paid" else (lines_data[0].get("paid", 0))
        inv = Invoice(
            id=id_, number=no, invoice_date=date_, due_date=due,
            partner_id=partner_id, partner_name=partner_name,
            move_type="out_invoice", state=state, currency="TZS",
            subtotal=round(subtotal, 2), tax_amount=round(tax_amt, 2),
            total=round(total, 2), amount_paid=paid,
            amount_due=round(total - paid, 2), ref=ref, notes=notes,
        )
        return inv, lines_db

    invs = [
        make_inv("inv_001", "INV/2026/0001", ds(30), ds(15), "cust_3", "Marriott Hotel Dar",
                 [{"desc": "Catering Services — Oct 2026", "qty": 1, "price": 1800000},
                  {"desc": "Event Setup & Logistics", "qty": 1, "price": 600000}],
                 "open", ref="MARRIOTT-OCT-2026"),
        make_inv("inv_002", "INV/2026/0002", ds(25), ds(10), "cust_5", "Nelson Mandela Event Co.",
                 [{"desc": "Private Event Dining — 80 Pax", "qty": 80, "price": 35000}],
                 "open", ref="EVENT-NOV2026-01"),
        make_inv("inv_003", "INV/2026/0003", ds(5), ds(-10), "cust_2", "Safari Holdings Ltd",
                 [{"desc": "Corporate Lunch Package — Weekly", "qty": 4, "price": 222500}],
                 "paid", ref="SAFHOLD-OCT2026"),
        make_inv("inv_004", "INV/2026/0004", ds(3), ds(-7), "cust_4", "Fatima Enterprises",
                 [{"desc": "Staff Catering — Oct 2026", "qty": 1, "price": 175000}],
                 "open", ref="FATIMA-NOV26"),
    ]
    # Vendor Bills
    bill_inv = Invoice(
        id="bill_001", number="BILL/2026/0001", invoice_date=ds(28), due_date=ds(13),
        partner_id="vend_1", partner_name="Serengeti Meats & Poultry",
        move_type="in_invoice", state="open", currency="TZS",
        subtotal=422500, tax_amount=0, total=422500, amount_paid=0,
        amount_due=422500, ref="SEREN-INV-881",
    )
    bill_line = InvoiceLine(
        id="bl_001", invoice_id="bill_001",
        description="Meat & Poultry Supply — Oct 2026",
        account_code="5001", quantity=1, unit_price=422500,
        tax_rate=0, tax_amount=0, subtotal=422500, total=422500,
    )

    for inv, lines in invs:
        db.add(inv)
        for l in lines:
            db.add(l)
    db.add(bill_inv)
    db.add(bill_line)
    db.flush()


# ── Payments ───────────────────────────────────────────────────────────────────

def _seed_payments(db: Session):
    payments = [
        AccountPayment(id="pay_001", number="PAY-001", payment_date=ds(3),
                       partner_id="cust_2", partner_name="Safari Holdings Ltd",
                       payment_type="inbound", amount=1050200, method="bank",
                       journal="Bank", ref="SAFHOLD-PAY",
                       memo="INV/2026/0003 full settlement", state="posted",
                       invoice_id="inv_003"),
        AccountPayment(id="pay_002", number="PAY-002", payment_date=ds(25),
                       partner_id="cust_3", partner_name="Marriott Hotel Dar",
                       payment_type="inbound", amount=2232000, method="bank",
                       journal="Bank", ref="MARRIOTT-PAY-1",
                       memo="Partial payment INV/2026/0001", state="posted",
                       invoice_id="inv_001"),
        AccountPayment(id="pay_003", number="PAY-003", payment_date=ds(6),
                       partner_id="vend_1", partner_name="Serengeti Meats & Poultry",
                       payment_type="outbound", amount=422500, method="bank",
                       journal="Bank", ref="SETTLE-PO881",
                       memo="BILL/2026/0001 settlement", state="posted"),
        AccountPayment(id="pay_004", number="PAY-004", payment_date=ds(24),
                       partner_id="vend_4", partner_name="TANESCO",
                       payment_type="outbound", amount=180000, method="bank",
                       journal="Bank", ref="TAN-44129",
                       memo="Electricity bill payment", state="posted"),
        AccountPayment(id="pay_005", number="PAY-005", payment_date=ds(48),
                       partner_name="Oryx Petroleum Tanzania",
                       payment_type="outbound", amount=120000, method="cash",
                       journal="Cash", ref="ORYX-9912",
                       memo="LPG refill - cash", state="posted"),
    ]
    db.add_all(payments)
    db.flush()


# ── Journal Entries ────────────────────────────────────────────────────────────

def _seed_journal_entries(db: Session):
    def make_je(id_, no, date_, journal, ref, lines):
        je = JournalEntry(
            id=id_, number=no, entry_date=date_, journal=journal, state="posted",
            ref=ref, source="manual",
            total_debit=sum(l[2] for l in lines),
            total_credit=sum(l[3] for l in lines),
            posted_at=datetime.utcnow(),
        )
        je_lines = [
            JournalEntryLine(
                id=f"jel_{uuid.uuid4().hex[:6]}", entry_id=id_,
                account_code=l[0], account_name=l[1],
                debit=l[2], credit=l[3], partner_name=l[4] if len(l) > 4 else "",
            )
            for l in lines
        ]
        return je, je_lines

    entries = [
        make_je("je_001", "JE/2026/00001", ds(30), "Sales Journal", "INV/2026/0001",
                [("1518", "Accounts Receivable", 2832000, 0, "Marriott Hotel Dar"),
                 ("4001", "Food & Beverage Revenue", 0, 2400000, ""),
                 ("6002", "VAT Payable (18%)", 0, 432000, "")]),
        make_je("je_002", "JE/2026/00002", ds(28), "Purchase Journal", "BILL/2026/0001",
                [("5001", "Cost of Goods Sold", 422500, 0, ""),
                 ("6001", "Trade Payables", 0, 422500, "Serengeti Meats & Poultry")]),
        make_je("je_003", "JE/2026/00003", ds(24), "Bank", "TAN-44129",
                [("5006", "Electricity Expenses", 180000, 0, ""),
                 ("1031", "Bank", 0, 180000, "TANESCO")]),
        make_je("je_004", "JE/2026/00004", ds(3), "Sales Journal", "INV/2026/0003",
                [("1031", "Bank", 1050200, 0, "Safari Holdings Ltd"),
                 ("1518", "Accounts Receivable", 0, 1050200, "")]),
        make_je("je_005", "JE/2026/00005", ds(0), "Payroll Journal", "PAYROLL-NOV-2026",
                [("1001", "Salaries and Wages Expense", 5186000, 0, ""),
                 ("1002", "Employer NSSF Expense", 518600, 0, ""),
                 ("1003", "SDL Expense", 28000, 0, ""),
                 ("1004", "WCF Expense", 4000, 0, ""),
                 ("1031", "Bank", 0, 5736600, "")]),
    ]
    for je, lines in entries:
        db.add(je)
        for l in lines:
            db.add(l)
    db.flush()


# ── Bank Accounts ──────────────────────────────────────────────────────────────

def _seed_bank_accounts(db: Session):
    banks = [
        BankAccount(id="bank_1", tenant_id="tenant_safari",
                    name="CRDB Business Account", bank_name="CRDB Bank",
                    account_number="0150194874500", currency="TZS",
                    balance=10300200, last_sync=ds(0)),
        BankAccount(id="bank_2", tenant_id="tenant_safari",
                    name="NMB Operational Account", bank_name="NMB Bank",
                    account_number="40310100041", currency="TZS",
                    balance=3450000, last_sync=ds(1)),
    ]
    db.add_all(banks)
    db.flush()


# ── HR ─────────────────────────────────────────────────────────────────────────

def _seed_hr(db: Session):
    depts = [
        Department(id="dept_1", tenant_id="tenant_safari", name="Management",
                   manager_name="David Kimani", headcount=2),
        Department(id="dept_2", tenant_id="tenant_safari", name="Kitchen & Production",
                   manager_name="Chef Baraka", headcount=4),
        Department(id="dept_3", tenant_id="tenant_safari", name="Front of House",
                   manager_name="Rehema Said", headcount=5),
        Department(id="dept_4", tenant_id="tenant_safari", name="Finance & Accounting",
                   manager_name="Zawadi Ally", headcount=2),
        Department(id="dept_5", tenant_id="tenant_safari", name="Stores & Procurement",
                   manager_name="Hamisi Bakari", headcount=2),
    ]
    db.add_all(depts)

    jobs = [
        JobPosition(id="job_1", name="Group CEO & Owner", dept_id="dept_1"),
        JobPosition(id="job_2", name="General Manager", dept_id="dept_1"),
        JobPosition(id="job_3", name="Head Chef", dept_id="dept_2"),
        JobPosition(id="job_4", name="Production Manager", dept_id="dept_2"),
        JobPosition(id="job_5", name="Line Cook", dept_id="dept_2"),
        JobPosition(id="job_6", name="Pastry Chef", dept_id="dept_2"),
        JobPosition(id="job_7", name="Senior Waiter", dept_id="dept_3"),
        JobPosition(id="job_8", name="Floor Waiter", dept_id="dept_3"),
        JobPosition(id="job_9", name="Cashier", dept_id="dept_3"),
        JobPosition(id="job_10", name="Head Cashier", dept_id="dept_4"),
        JobPosition(id="job_11", name="Accounts Assistant", dept_id="dept_4"),
        JobPosition(id="job_12", name="Storekeeper", dept_id="dept_5"),
        JobPosition(id="job_13", name="Procurement Officer", dept_id="dept_5"),
    ]
    db.add_all(jobs)
    db.flush()

    employees = [
        Employee(id="emp_1", tenant_id="tenant_safari", name="David Kimani",
                 emp_no="EMP-001", job_id="job_1", dept_id="dept_1",
                 phone="+255 718 000 777", email="david.k@safariholding.tz",
                 gender="Male", dob="1978-04-15", nationality="Kenyan",
                 nida="KE-78-001234", join_date="2019-01-01",
                 contract_type="Permanent", status="active", avatar="DK",
                 wage=2500000, hra=500000, travel=200000, meal=100000,
                 bank_name="CRDB", account_no="01501000001",
                 tin="TZ-TIN-00001", nssf_no="NSSF-00001", site="Masaki HQ"),
        Employee(id="emp_2", tenant_id="tenant_safari", name="Rehema Said",
                 emp_no="EMP-002", job_id="job_2", dept_id="dept_1",
                 phone="+255 715 000 444", email="rehema.s@safarigrill.tz",
                 gender="Female", dob="1985-09-22", nationality="Tanzanian",
                 nida="TZ-85-009222", join_date="2019-03-01",
                 contract_type="Permanent", status="active", avatar="RS",
                 wage=1800000, hra=360000, travel=150000, meal=80000,
                 bank_name="NMB", account_no="40310100002",
                 tin="TZ-TIN-00002", nssf_no="NSSF-00002", site="Masaki",
                 manager_id="emp_1"),
        Employee(id="emp_3", tenant_id="tenant_safari", name="Chef Baraka Mwalimu",
                 emp_no="EMP-003", job_id="job_3", dept_id="dept_2",
                 phone="+255 716 000 555", email="baraka@safarigrill.tz",
                 gender="Male", dob="1988-11-05", nationality="Tanzanian",
                 nida="TZ-88-011505", join_date="2019-06-01",
                 contract_type="Permanent", status="active", avatar="CB",
                 wage=1400000, hra=280000, travel=100000, meal=60000,
                 bank_name="CRDB", account_no="01501000003",
                 tin="TZ-TIN-00003", nssf_no="NSSF-00003", site="Masaki",
                 manager_id="emp_2"),
        Employee(id="emp_4", tenant_id="tenant_safari", name="Jaffar Mdee",
                 emp_no="EMP-004", job_id="job_4", dept_id="dept_2",
                 phone="+255 719 000 888", email="jaffar.m@safarigrill.tz",
                 gender="Male", dob="1990-02-14", nationality="Tanzanian",
                 nida="TZ-90-002144", join_date="2020-01-15",
                 contract_type="Permanent", status="active", avatar="JM",
                 wage=1200000, hra=240000, travel=100000, meal=60000,
                 bank_name="NMB", account_no="40310100004",
                 tin="TZ-TIN-00004", nssf_no="NSSF-00004", site="Masaki",
                 manager_id="emp_3"),
        Employee(id="emp_5", tenant_id="tenant_safari", name="Amani Juma",
                 emp_no="EMP-005", job_id="job_7", dept_id="dept_3",
                 phone="+255 713 000 222", email="amani.j@safarigrill.tz",
                 gender="Male", dob="1995-07-08", nationality="Tanzanian",
                 nida="TZ-95-007088", join_date="2021-04-01",
                 contract_type="Permanent", status="active", avatar="AJ",
                 wage=650000, hra=130000, travel=50000, meal=30000,
                 bank_name="CRDB", account_no="01501000005",
                 tin="TZ-TIN-00005", nssf_no="NSSF-00005", site="Masaki",
                 manager_id="emp_2"),
        Employee(id="emp_6", tenant_id="tenant_safari", name="Neema Mushi",
                 emp_no="EMP-006", job_id="job_8", dept_id="dept_3",
                 phone="+255 713 000 223", email="neema.m@safarigrill.tz",
                 gender="Female", dob="1997-03-20", nationality="Tanzanian",
                 nida="TZ-97-003200", join_date="2021-08-01",
                 contract_type="Permanent", status="active", avatar="NM",
                 wage=550000, hra=110000, travel=40000, meal=25000,
                 bank_name="NMB", account_no="40310100006",
                 tin="TZ-TIN-00006", nssf_no="NSSF-00006", site="Masaki",
                 manager_id="emp_2"),
        Employee(id="emp_7", tenant_id="tenant_safari", name="Zawadi Ally",
                 emp_no="EMP-007", job_id="job_10", dept_id="dept_4",
                 phone="+255 714 000 333", email="zawadi.a@safarigrill.tz",
                 gender="Female", dob="1992-06-11", nationality="Tanzanian",
                 nida="TZ-92-006110", join_date="2019-07-01",
                 contract_type="Permanent", status="active", avatar="ZA",
                 wage=900000, hra=180000, travel=70000, meal=40000,
                 bank_name="CRDB", account_no="01501000007",
                 tin="TZ-TIN-00007", nssf_no="NSSF-00007", site="Masaki",
                 manager_id="emp_2"),
        Employee(id="emp_8", tenant_id="tenant_safari", name="Hamisi Bakari",
                 emp_no="EMP-008", job_id="job_12", dept_id="dept_5",
                 phone="+255 717 000 666", email="hamisi.b@safarigrill.tz",
                 gender="Male", dob="1991-12-30", nationality="Tanzanian",
                 nida="TZ-91-012300", join_date="2020-03-01",
                 contract_type="Permanent", status="active", avatar="HB",
                 wage=750000, hra=150000, travel=60000, meal=35000,
                 bank_name="NMB", account_no="40310100008",
                 tin="TZ-TIN-00008", nssf_no="NSSF-00008", site="Masaki",
                 manager_id="emp_2"),
        Employee(id="emp_9", tenant_id="tenant_safari", name="Zainab Hassan",
                 emp_no="EMP-009", job_id="job_5", dept_id="dept_2",
                 phone="+255 712 445 221", email="zainab.h@safarigrill.tz",
                 gender="Female", dob="1993-05-17", nationality="Tanzanian",
                 nida="TZ-93-005170", join_date="2022-01-15",
                 contract_type="Permanent", status="active", avatar="ZH",
                 wage=800000, hra=160000, travel=60000, meal=35000,
                 bank_name="CRDB", account_no="01501000009",
                 tin="TZ-TIN-00009", nssf_no="NSSF-00009", site="Masaki",
                 manager_id="emp_3"),
        Employee(id="emp_10", tenant_id="tenant_safari", name="Oscar Temba",
                 emp_no="EMP-010", job_id="job_6", dept_id="dept_2",
                 phone="+255 754 231 009", email="oscar.t@safarigrill.tz",
                 gender="Male", dob="1996-08-29", nationality="Tanzanian",
                 nida="TZ-96-008290", join_date="2022-06-01",
                 contract_type="Fixed Term", status="active", avatar="OT",
                 wage=720000, hra=144000, travel=50000, meal=30000,
                 bank_name="NMB", account_no="40310100010",
                 tin="TZ-TIN-00010", nssf_no="NSSF-00010", site="Masaki",
                 manager_id="emp_3"),
    ]
    db.add_all(employees)
    db.flush()

    # Generate payslips for Nov 2026
    year, month = "2026", "11"
    batch = PayslipBatch(
        id="batch_nov26", tenant_id="tenant_safari",
        name="Payroll - November 2026", period="2026-11",
        date_start="2026-11-01", date_end="2026-11-30", state="close",
    )
    db.add(batch)
    db.flush()

    for emp in employees:
        calc = compute_payslip(emp)
        slip = Payslip(
            id=f"slip_{emp.id}_2026-11",
            tenant_id="tenant_safari",
            number=f"SLIP/2026/{emp.emp_no.replace('EMP-', '')}/11",
            name=f"Salary Slip of {emp.name} for November-2026",
            employee_id=emp.id, employee_name=emp.name,
            dept_id=emp.dept_id, batch_id="batch_nov26",
            period="2026-11", date_from="2026-11-01", date_to="2026-11-30",
            state="done", lines=calc["lines"],
            basic=calc["basic"], gross=calc["gross"], net=calc["net"],
            total_deductions=calc["total_deductions"],
            nssf_ee=calc["nssf_ee"], paye=calc["paye"],
            nssf_er=calc["nssf_er"], sdl=calc["sdl"], wcf=calc["wcf"],
            total_employer_cost=calc["total_employer_cost"],
            payment_date="2026-11-30", payment_method="bank",
        )
        db.add(slip)

    # Sample employee expenses
    db.add(EmployeeExpense(
        id="exp_1", tenant_id="tenant_safari",
        expense_date="2026-11-15", employee_id="emp_5", employee_name="Amani Juma",
        category="transport", description="Uber to catering event", amount=25000,
        currency="TZS", state="approved", payment_mode="own_account",
        approved_by="Rehema Said",
    ))
    db.add(EmployeeExpense(
        id="exp_2", tenant_id="tenant_safari",
        expense_date="2026-11-10", employee_id="emp_7", employee_name="Zawadi Ally",
        category="accommodation", description="Hotel for training seminar in Arusha",
        amount=120000, currency="TZS", state="submitted", payment_mode="own_account",
    ))
    db.flush()


# ── Settings ───────────────────────────────────────────────────────────────────

def _seed_settings(db: Session):
    db.add(TenantSettings(
        id="ts_safari",
        tenant_id="tenant_safari",
        vat_enabled=True, vat_rate=18.0, vat_inclusive=True,
        tax_number="TZ-TIN-SAFARI-001", vrn="40-040001-K",
        tax_label="VAT 18%",
        commission_method="percent", commission_rate=5.0,
        commission_fixed=2000, commission_basis="gross",
        commission_trigger="payment",
        commission_overrides={},
        kitchen_tracking_mode="simple",
        shift_state="live_service",
        opening_float=200000,
    ))
    db.add(TenantSettings(
        id="ts_default",
        tenant_id="default",
        vat_enabled=True, vat_rate=18.0, vat_inclusive=True,
    ))
    db.flush()


# ── Checklists ─────────────────────────────────────────────────────────────────

def _seed_checklists(db: Session):
    today = date.today().isoformat()
    opening_cl = Checklist(
        id="cl_opening_today", tenant_id="tenant_safari",
        title="Opening Checklist", checklist_type="opening", date=today,
        items=[
            {"text": "Check and count opening float cash", "done": True},
            {"text": "Turn on all kitchen equipment", "done": True},
            {"text": "Verify stock levels — bar and kitchen", "done": False},
            {"text": "Confirm staff attendance and assignments", "done": False},
            {"text": "Turn on POS terminals and KDS screens", "done": False},
            {"text": "Check refrigerator temperatures (4°C or below)", "done": True},
        ],
    )
    haccp_cl = Checklist(
        id="cl_haccp_today", tenant_id="tenant_safari",
        title="HACCP Daily Check", checklist_type="haccp", date=today,
        items=[
            {"text": "Cold room temperature 2–4°C ✓", "done": True},
            {"text": "Meat freezer temperature -18°C ✓", "done": True},
            {"text": "Hand wash stations stocked and working", "done": False},
            {"text": "Date labels on all prep containers", "done": False},
            {"text": "Staff food handler certificates valid", "done": True},
        ],
    )
    db.add_all([opening_cl, haccp_cl])
    db.flush()
