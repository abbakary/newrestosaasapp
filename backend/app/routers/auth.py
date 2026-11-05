"""Auth router: login, register tenant, add staff user."""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, Waiter
from app.models.tenant import Tenant, Package, SaasLog
from app.models.settings import TenantSettings, Checklist
from app.services.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_auth,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Schemas ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    phone: str
    password: str

class TenantRegisterRequest(BaseModel):
    # Step 1 — Admin
    admin_name: str
    admin_phone: str
    admin_email: Optional[str] = None
    admin_password: str
    # Step 2 — Restaurant
    resto_name: str
    slug: Optional[str] = None
    concept: Optional[str] = "Dine-in Restaurant"
    city: Optional[str] = "Dar es Salaam"
    country: Optional[str] = "Tanzania"
    currency: Optional[str] = "TSh"
    logo_emoji: Optional[str] = "🍽️"
    # Step 3 — Package
    package_id: Optional[str] = "pkg_growth"
    billing_cycle: Optional[str] = "monthly"
    # Step 4 — Ops
    branch_name: Optional[str] = "Main Branch"
    tables_count: Optional[int] = 16
    staff_count: Optional[int] = 10
    seed_demo_data: Optional[bool] = True
    # Step 5 — Payment
    payment_choice: Optional[str] = "trial"
    agreed_terms: Optional[bool] = True

class StaffRegisterRequest(BaseModel):
    name: str
    phone: str
    role: str
    password: str = "demo"
    tenant_id: Optional[str] = None
    email: Optional[str] = None


# ── Login ────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Login by phone + password. Returns JWT token and user info."""
    phone = body.phone.replace(" ", "")
    user = db.query(User).filter(User.phone == phone, User.is_active == True).first()

    if not user or not verify_password(body.password, user.password_hash):
        # Allow universal "demo" password for dev/demo purposes
        if body.password != "demo" or not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid phone or password.",
            )

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "role": user.role,
            "name": user.name,
            "phone": user.phone,
            "email": user.email,
            "title": user.title,
            "tenant_id": user.tenant_id,
            "waiter_id": user.waiter_id,
        },
    }


@router.post("/token")
def token_login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2 compatible token endpoint (username = phone)."""
    phone = form.username.replace(" ", "")
    user = db.query(User).filter(User.phone == phone, User.is_active == True).first()
    if not user or not (
        verify_password(form.password, user.password_hash) or form.password == "demo"
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


# ── Register Tenant ──────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register_tenant(body: TenantRegisterRequest, db: Session = Depends(get_db)):
    """Full 5-step tenant self-registration wizard."""
    phone = body.admin_phone.replace(" ", "")

    # Prevent duplicate phones
    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(400, "This phone number is already registered.")

    slug = (body.slug or body.resto_name.lower()
            .replace(" ", "-")
            .replace("&", "and"))[:50]
    # Ensure slug is unique
    if db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = slug + "-" + uuid.uuid4().hex[:4]

    tenant_id = "tenant_" + uuid.uuid4().hex[:10]
    is_trial = body.payment_choice == "trial"

    # Lookup package
    pkg = db.query(Package).filter(Package.id == body.package_id).first()
    monthly_fee = pkg.price_monthly if pkg else 249000

    tenant = Tenant(
        id=tenant_id,
        name=body.resto_name,
        slug=slug,
        domain=f"{slug}.restoerp.io",
        concept=body.concept,
        package_id=body.package_id,
        billing_cycle=body.billing_cycle,
        status="trial" if is_trial else "active",
        is_trial=is_trial,
        city=body.city,
        country=body.country,
        currency=body.currency,
        admin_name=body.admin_name,
        admin_email=body.admin_email or f"{slug}@restoerp.tz",
        admin_phone=phone,
        tables_count=body.tables_count,
        staff_count=body.staff_count,
        logo_emoji=body.logo_emoji,
        payment_method="14-Day Free Trial" if is_trial else body.payment_choice,
        monthly_fee=monthly_fee,
        mrr=monthly_fee,
        notes=f"Registered via Self-Service Wizard. Flagship branch: {body.branch_name}",
    )
    db.add(tenant)

    user_id = "u_" + uuid.uuid4().hex[:10]
    user = User(
        id=user_id,
        tenant_id=tenant_id,
        role="owner",
        name=body.admin_name,
        phone=phone,
        password_hash=hash_password(body.admin_password),
        email=body.admin_email,
        title="Restaurant Owner & CEO",
    )
    db.add(user)

    # Default tenant settings
    ts = TenantSettings(
        id="ts_" + tenant_id,
        tenant_id=tenant_id,
    )
    db.add(ts)

    # Log
    log = SaasLog(
        id="log_" + uuid.uuid4().hex[:8],
        tenant_id=tenant_id,
        action="TENANT_REGISTERED",
        detail=f"New tenant '{body.resto_name}' registered by {body.admin_name}",
        by=body.admin_name,
    )
    db.add(log)

    db.commit()

    token = create_access_token({"sub": user.id, "role": "owner"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "role": "owner",
            "name": user.name,
            "phone": user.phone,
            "tenant_id": tenant_id,
        },
        "tenant": {
            "id": tenant_id,
            "name": body.resto_name,
            "slug": slug,
            "domain": f"{slug}.restoerp.io",
            "status": tenant.status,
        },
    }


# ── Register Staff ───────────────────────────────────────────────────────────

@router.post("/staff", status_code=201)
def register_staff(body: StaffRegisterRequest, db: Session = Depends(get_db)):
    """Quick-register a staff user (waiter, chef, cashier, etc.)."""
    phone = body.phone.replace(" ", "")
    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(400, "This phone number is already registered.")

    valid_roles = {"cashier", "waiter", "chef", "storekeeper", "production", "manager"}
    if body.role not in valid_roles:
        raise HTTPException(400, f"Invalid role. Choose from: {', '.join(valid_roles)}")

    user_id = "u_" + uuid.uuid4().hex[:10]
    user = User(
        id=user_id,
        tenant_id=body.tenant_id,
        role=body.role,
        name=body.name,
        phone=phone,
        password_hash=hash_password(body.password),
        email=body.email,
    )
    db.add(user)

    # If waiter, create waiter record
    waiter = None
    if body.role == "waiter":
        token_str = body.name.lower().split()[0] + "-" + uuid.uuid4().hex[:4].upper()
        waiter = Waiter(
            id="w_" + uuid.uuid4().hex[:8],
            tenant_id=body.tenant_id,
            name=body.name,
            phone=phone,
            token=token_str,
            active=True,
            avatar=body.name[:2].upper(),
        )
        db.add(waiter)
        db.flush()
        user.waiter_id = waiter.id

    db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    resp = {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "role": user.role,
            "name": user.name,
            "phone": user.phone,
            "tenant_id": user.tenant_id,
        },
    }
    if waiter:
        resp["waiter"] = {"id": waiter.id, "token": waiter.token}
    return resp


# ── Me ───────────────────────────────────────────────────────────────────────

@router.get("/me")
def me(current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    tenant = None
    if current_user.tenant_id:
        t = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if t:
            tenant = {"id": t.id, "name": t.name, "slug": t.slug, "status": t.status}
    return {
        "id": current_user.id,
        "role": current_user.role,
        "name": current_user.name,
        "phone": current_user.phone,
        "email": current_user.email,
        "title": current_user.title,
        "tenant_id": current_user.tenant_id,
        "waiter_id": current_user.waiter_id,
        "tenant": tenant,
    }
