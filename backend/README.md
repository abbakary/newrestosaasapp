# RestoERP Cloud — FastAPI Backend

Full-stack backend for the RestoERP multi-tenant restaurant ERP platform.

## Quick Start

```powershell
cd C:\Users\Administrator\newrestosaasapp\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://localhost:8000/api/docs

## Demo Credentials (all use password: `demo`)

| Role        | Phone        |
|-------------|--------------|
| SuperAdmin  | 0700000000   |
| Owner       | 0718000777   |
| Manager     | 0715000444   |
| Cashier     | 0714000333   |
| Waiter      | 0713000222   |
| Chef        | 0716000555   |
| Storekeeper | 0717000666   |

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, startup seed
│   ├── config.py            # Settings from .env
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── tenant.py        # Packages, Tenants, SaasInvoices
│   │   ├── user.py          # Users, Waiters
│   │   ├── menu.py          # MenuItems
│   │   ├── order.py         # Orders, CommissionLedger, AuditLog
│   │   ├── inventory.py     # Stock, Suppliers, POs, RFQs, Crate/Waste
│   │   ├── production.py    # BOMs, ProductionOrders, FinishedGoods
│   │   ├── accounting.py    # COA, Partners, Invoices, Payments, JEs, Banks
│   │   ├── hr.py            # Employees, Payslips, Expenses, Leaves
│   │   └── settings.py      # TenantSettings, Checklists, Expenses
│   ├── routers/             # FastAPI routers (10 modules)
│   │   ├── auth.py          # Login, tenant register, staff signup
│   │   ├── tenants.py       # SaaS multi-tenant management
│   │   ├── menu.py          # Menu CRUD, 86 toggle, quick-add, review
│   │   ├── orders.py        # POS orders, KDS, payment, commission
│   │   ├── inventory.py     # Stock, transfers, POs, RFQs, adjustments
│   │   ├── production.py    # BOMs, production orders, requisitions
│   │   ├── accounting.py    # Full double-entry, reports
│   │   ├── hr.py            # HR, Tanzania payroll, leaves
│   │   ├── analytics.py     # KPIs, commission, checklists, Z-report
│   │   └── settings.py      # VAT, commission policy, shift, float
│   ├── services/
│   │   ├── auth.py          # JWT, bcrypt, role guards
│   │   └── payroll.py       # Tanzania PAYE engine (TRA 2025/2026)
│   └── seed/
│       └── seed_data.py     # Full demo data matching frontend
├── .env                     # Environment config
├── requirements.txt
└── restosaas.db             # SQLite database (auto-created)
```

## API Modules (172 routes)

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/api/auth` | login, register, staff signup, /me |
| Tenants/SaaS | `/api/tenants` | CRUD, status, packages, invoices |
| Menu | `/api/menu` | CRUD, 86 toggle, quick-add, review |
| Orders | `/api/orders` | place, status, pay, cancel, KDS |
| Inventory | `/api/inventory` | stock, POs, RFQs, transfers, crates |
| Production | `/api/production` | BOMs, work orders, requisitions |
| Accounting | `/api/accounting` | COA, invoices, bills, payments, JEs, reports |
| HR | `/api/hr` | employees, payslips, batch payroll, leaves |
| Analytics | `/api/analytics` | KPIs, commission, checklists, audit log |
| Settings | `/api/settings` | VAT, commission policy, shift, kitchen mode |

## Accounting Reports

- `GET /api/accounting/reports/general-ledger`
- `GET /api/accounting/reports/trial-balance`
- `GET /api/accounting/reports/profit-loss`
- `GET /api/accounting/reports/balance-sheet`
- `GET /api/accounting/reports/cash-flow`
- `GET /api/accounting/reports/tax`
- `GET /api/accounting/reports/partner-ledger`
- `GET /api/accounting/reports/aged-receivable`
- `GET /api/accounting/reports/aged-payable`

## Tanzania Payroll (TRA 2025/2026)

The payroll engine in `app/services/payroll.py` implements:
- Progressive PAYE tax table (0% → 8% → 20% → 25% → 30%)
- NSSF Employee (10% of basic) & Employer (10% of basic)
- SDL — Skills Development Levy (4% of gross)
- WCF — Workers Compensation Fund (0.5% of gross, capped)
- Full payroll journal entry generation (accounting bridge)

Based on patterns from `zalongwa_om_hr_payroll` and `payroll_account` Odoo modules.
