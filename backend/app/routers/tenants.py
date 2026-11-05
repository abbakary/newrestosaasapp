"""Tenants & SaaS management router."""
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.tenant import Tenant, Package, SaasInvoice, SaasLog
from app.models.user import User
from app.models.settings import TenantSettings
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    concept: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    logo_emoji: Optional[str] = None
    package_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    status: Optional[str] = None
    tables_count: Optional[int] = None
    staff_count: Optional[int] = None
    notes: Optional[str] = None

class PackageUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    price_monthly: Optional[float] = None
    price_annual: Optional[float] = None
    popular: Optional[bool] = None
    features: Optional[list] = None
    modules: Optional[list] = None
    limits: Optional[dict] = None

class SaasInvoiceCreate(BaseModel):
    tenant_id: str
    period: str
    amount: float
    due_date: Optional[str] = None
    notes: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    new_password: str


def _tenant_dict(t: Tenant) -> dict:
    return {
        "id": t.id, "name": t.name, "slug": t.slug, "domain": t.domain,
        "concept": t.concept, "package_id": t.package_id,
        "billing_cycle": t.billing_cycle, "status": t.status,
        "is_trial": t.is_trial, "city": t.city, "country": t.country,
        "currency": t.currency, "admin_name": t.admin_name,
        "admin_email": t.admin_email, "admin_phone": t.admin_phone,
        "branches_count": t.branches_count, "tables_count": t.tables_count,
        "staff_count": t.staff_count, "logo_emoji": t.logo_emoji,
        "payment_method": t.payment_method, "monthly_fee": t.monthly_fee,
        "mrr": t.mrr, "notes": t.notes,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "is_active": t.is_active,
    }


# ── Packages ─────────────────────────────────────────────────────────────────

@router.get("/packages")
def list_packages(db: Session = Depends(get_db)):
    pkgs = db.query(Package).filter(Package.active == True).all()
    return [
        {
            "id": p.id, "name": p.name, "tagline": p.tagline,
            "price_monthly": p.price_monthly, "price_annual": p.price_annual,
            "popular": p.popular, "color": p.color, "icon": p.icon,
            "limits": p.limits, "modules": p.modules, "features": p.features,
        }
        for p in pkgs
    ]


@router.put("/packages/{pkg_id}")
def update_package(
    pkg_id: str,
    body: PackageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pkg = db.query(Package).filter(Package.id == pkg_id).first()
    if not pkg:
        raise HTTPException(404, "Package not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(pkg, k, v)
    db.commit()
    return {"ok": True}


# ── Tenants CRUD ─────────────────────────────────────────────────────────────

@router.get("")
def list_tenants(db: Session = Depends(get_db)):
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    return [_tenant_dict(t) for t in tenants]


@router.get("/{tenant_id}")
def get_tenant(tenant_id: str, db: Session = Depends(get_db)):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant not found")
    return _tenant_dict(t)


@router.put("/{tenant_id}")
def update_tenant(
    tenant_id: str,
    body: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()

    _log(db, tenant_id, "TENANT_UPDATED", f"Tenant '{t.name}' updated",
         current_user.name if current_user else "System")
    return _tenant_dict(t)


@router.put("/{tenant_id}/status")
def toggle_tenant_status(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant not found")

    status_map = {
        "active": "suspended", "trial": "suspended",
        "suspended": "active", "overdue": "active",
    }
    t.status = status_map.get(t.status, "suspended")
    db.commit()
    _log(db, tenant_id, "TENANT_STATUS_CHANGED",
         f"Status → {t.status}", current_user.name if current_user else "System")
    return {"id": tenant_id, "status": t.status}


@router.delete("/{tenant_id}")
def delete_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant not found")
    t.is_active = False
    db.commit()
    return {"ok": True}


@router.put("/{tenant_id}/package")
def change_package(
    tenant_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant not found")
    if "package_id" in body:
        t.package_id = body["package_id"]
    if "billing_cycle" in body:
        t.billing_cycle = body["billing_cycle"]
    db.commit()
    return {"ok": True}


@router.post("/{tenant_id}/reset-password")
def reset_admin_password(
    tenant_id: str,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    from app.services.auth import hash_password
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant not found")
    user = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role.in_(["owner", "manager"])
    ).first()
    if not user:
        raise HTTPException(404, "No admin user found for this tenant")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


# ── SaaS Invoices ─────────────────────────────────────────────────────────────

@router.get("/invoices/all")
def list_saas_invoices(db: Session = Depends(get_db)):
    invoices = db.query(SaasInvoice).order_by(SaasInvoice.created_at.desc()).all()
    return [_inv_dict(i) for i in invoices]


@router.post("/invoices", status_code=201)
def create_saas_invoice(body: SaasInvoiceCreate, db: Session = Depends(get_db)):
    inv_id = "sinv_" + uuid.uuid4().hex[:8]
    count = db.query(SaasInvoice).count()
    inv = SaasInvoice(
        id=inv_id,
        tenant_id=body.tenant_id,
        no=f"SINV/{datetime.utcnow().year}/{count + 1:04d}",
        period=body.period,
        amount=body.amount,
        status="unpaid",
        due_date=body.due_date,
        notes=body.notes,
    )
    db.add(inv)
    db.commit()
    return _inv_dict(inv)


@router.put("/invoices/{inv_id}/pay")
def mark_saas_invoice_paid(inv_id: str, db: Session = Depends(get_db)):
    inv = db.query(SaasInvoice).filter(SaasInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.status = "paid"
    inv.paid_date = datetime.utcnow().strftime("%Y-%m-%d")
    db.commit()
    return _inv_dict(inv)


@router.post("/invoices/{inv_id}/refund")
def refund_saas_invoice(inv_id: str, db: Session = Depends(get_db)):
    inv = db.query(SaasInvoice).filter(SaasInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.status = "refunded"
    db.commit()
    return _inv_dict(inv)


# ── Logs ─────────────────────────────────────────────────────────────────────

@router.get("/logs/all")
def list_saas_logs(db: Session = Depends(get_db)):
    logs = db.query(SaasLog).order_by(SaasLog.ts.desc()).limit(200).all()
    return [
        {"id": l.id, "tenant_id": l.tenant_id, "action": l.action,
         "detail": l.detail, "by": l.by,
         "ts": l.ts.isoformat() if l.ts else None}
        for l in logs
    ]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _log(db, tenant_id, action, detail, by="System"):
    db.add(SaasLog(
        id="log_" + uuid.uuid4().hex[:8],
        tenant_id=tenant_id,
        action=action,
        detail=detail,
        by=by,
    ))
    db.flush()


def _inv_dict(inv: SaasInvoice) -> dict:
    return {
        "id": inv.id, "tenant_id": inv.tenant_id, "no": inv.no,
        "period": inv.period, "amount": inv.amount, "status": inv.status,
        "due_date": inv.due_date, "paid_date": inv.paid_date,
        "notes": inv.notes,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }
