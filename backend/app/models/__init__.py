"""Import all models so SQLAlchemy Base.metadata.create_all can find all tables."""
from app.models.tenant import Package, Tenant, SaasInvoice, SaasLog  # noqa: F401
from app.models.user import User, Waiter  # noqa: F401
from app.models.menu import MenuItem  # noqa: F401
from app.models.order import Order, CommissionLedger, AuditLog  # noqa: F401
from app.models.inventory import (  # noqa: F401
    Supplier, StockItem, StockTransfer, PurchaseOrder,
    RFQ, CrateLedger, WasteLog, StockAdjustment,
)
from app.models.production import Recipe, BOM, FinishedGood, ProductionOrder, SiteRequisition  # noqa: F401
from app.models.accounting import (  # noqa: F401
    AccountAccount, AccountPartner, Invoice, InvoiceLine,
    AccountPayment, JournalEntry, JournalEntryLine, BankAccount,
)
from app.models.hr import (  # noqa: F401
    Department, JobPosition, Employee, SalaryStructure, SalaryRule,
    PayslipBatch, Payslip, EmployeeExpense, Leave, AttendanceRecord, Resignation,
)
from app.models.settings import TenantSettings, Checklist, Expense  # noqa: F401
