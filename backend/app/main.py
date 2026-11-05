"""RestoERP FastAPI Backend — Main application entry point."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings as app_settings
from app.database import engine, Base, SessionLocal
from app.models import *  # registers all models with Base

# Import all routers
from app.routers import (
    auth, tenants, menu, orders, inventory,
    production, accounting, hr, analytics,
)
from app.routers import settings as settings_router


# ── Create tables ─────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Seed data on startup ──────────────────────────────────────────────────────
def _seed():
    from app.seed.seed_data import run as seed_run
    db = SessionLocal()
    try:
        seed_run(db)
    except Exception as e:
        print(f"Seed warning: {e}")
        db.rollback()
    finally:
        db.close()

_seed()


# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=app_settings.APP_TITLE,
    version=app_settings.APP_VERSION,
    description=(
        "RestoERP Cloud Backend API — Full double-entry accounting, "
        "Tanzania HR/Payroll, multi-tenant SaaS POS, Inventory & Production."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"Unhandled error: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# ── Include routers ───────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(menu.router)
app.include_router(orders.router)
app.include_router(inventory.router)
app.include_router(production.router)
app.include_router(accounting.router)
app.include_router(hr.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)


# ── Health & root ─────────────────────────────────────────────────────────────
@app.get("/", tags=["root"])
def root():
    return {
        "app": app_settings.APP_TITLE,
        "version": app_settings.APP_VERSION,
        "status": "running",
        "docs": "/api/docs",
    }


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "version": app_settings.APP_VERSION}
