"""Settings router — VAT, commission policy, kitchen tracking mode, cash drawer, shift."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.settings import TenantSettings  # noqa — different from app.config.settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class VATSettings(BaseModel):
    vat_enabled: Optional[bool] = None
    vat_rate: Optional[float] = None
    vat_inclusive: Optional[bool] = None
    tax_number: Optional[str] = None
    vrn: Optional[str] = None
    tax_label: Optional[str] = None

class CommissionPolicy(BaseModel):
    commission_method: Optional[str] = None    # percent|fixed|tiered
    commission_rate: Optional[float] = None
    commission_fixed: Optional[float] = None
    commission_basis: Optional[str] = None     # gross|net
    commission_trigger: Optional[str] = None   # payment|served
    commission_overrides: Optional[dict] = None

class KitchenTrackingMode(BaseModel):
    kitchen_tracking_mode: str  # simple|recipe

class ShiftStateUpdate(BaseModel):
    shift_state: str    # opening_prep|live_service|day_closed
    opening_float: Optional[float] = None

class FloatUpdate(BaseModel):
    opening_float: float


def _get_or_create_settings(db: Session, tenant_id: str = "default") -> TenantSettings:
    ts = db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
    if not ts:
        import uuid
        ts = TenantSettings(
            id="ts_" + uuid.uuid4().hex[:8],
            tenant_id=tenant_id,
        )
        db.add(ts)
        db.flush()
    return ts


def _ts_dict(ts: TenantSettings) -> dict:
    return {
        "tenant_id": ts.tenant_id,
        # VAT
        "vat_enabled": ts.vat_enabled,
        "vat_rate": ts.vat_rate,
        "vat_inclusive": ts.vat_inclusive,
        "tax_number": ts.tax_number,
        "vrn": ts.vrn,
        "tax_label": ts.tax_label,
        # Commission
        "commission_method": ts.commission_method,
        "commission_rate": ts.commission_rate,
        "commission_fixed": ts.commission_fixed,
        "commission_basis": ts.commission_basis,
        "commission_trigger": ts.commission_trigger,
        "commission_overrides": ts.commission_overrides or {},
        # Ops
        "kitchen_tracking_mode": ts.kitchen_tracking_mode,
        "shift_state": ts.shift_state,
        "opening_float": ts.opening_float,
    }


@router.get("")
def get_settings(tenant_id: str = "default", db: Session = Depends(get_db)):
    ts = _get_or_create_settings(db, tenant_id)
    db.commit()
    return _ts_dict(ts)


@router.put("/vat")
def update_vat(
    body: VATSettings,
    tenant_id: str = "default",
    db: Session = Depends(get_db),
):
    ts = _get_or_create_settings(db, tenant_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(ts, k, v)
    ts.updated_at = datetime.utcnow()
    db.commit()
    return _ts_dict(ts)


@router.put("/commission-policy")
def update_commission_policy(
    body: CommissionPolicy,
    tenant_id: str = "default",
    db: Session = Depends(get_db),
):
    ts = _get_or_create_settings(db, tenant_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(ts, k, v)
    ts.updated_at = datetime.utcnow()
    db.commit()
    return _ts_dict(ts)


@router.put("/kitchen-tracking-mode")
def update_kitchen_mode(
    body: KitchenTrackingMode,
    tenant_id: str = "default",
    db: Session = Depends(get_db),
):
    ts = _get_or_create_settings(db, tenant_id)
    ts.kitchen_tracking_mode = body.kitchen_tracking_mode
    ts.updated_at = datetime.utcnow()
    db.commit()
    return _ts_dict(ts)


@router.put("/shift")
def update_shift(
    body: ShiftStateUpdate,
    tenant_id: str = "default",
    db: Session = Depends(get_db),
):
    valid = {"opening_prep", "live_service", "day_closed"}
    if body.shift_state not in valid:
        raise HTTPException(400, f"Invalid shift state. Valid: {valid}")
    ts = _get_or_create_settings(db, tenant_id)
    ts.shift_state = body.shift_state
    if body.opening_float is not None:
        ts.opening_float = body.opening_float
    ts.updated_at = datetime.utcnow()
    db.commit()
    return _ts_dict(ts)


@router.put("/cash-drawer/float")
def update_float(
    body: FloatUpdate,
    tenant_id: str = "default",
    db: Session = Depends(get_db),
):
    ts = _get_or_create_settings(db, tenant_id)
    ts.opening_float = body.opening_float
    ts.updated_at = datetime.utcnow()
    db.commit()
    return {"opening_float": ts.opening_float}
