"""HR router — employees, departments, payroll, payslips, expenses, attendance, leaves, resignations.
Tanzania payroll computation follows zalongwa_om_hr_payroll patterns.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.hr import (
    Department, JobPosition, Employee, SalaryStructure, SalaryRule,
    PayslipBatch, Payslip, EmployeeExpense, Leave, AttendanceRecord, Resignation,
)
from app.models.accounting import JournalEntry, JournalEntryLine, AccountAccount
from app.services.payroll import compute_payslip, build_payroll_journal_entry

router = APIRouter(prefix="/api/hr", tags=["hr"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str
    manager_name: Optional[str] = None
    tenant_id: Optional[str] = None

class JobPositionCreate(BaseModel):
    name: str
    dept_id: Optional[str] = None
    tenant_id: Optional[str] = None

class EmployeeCreate(BaseModel):
    name: str
    emp_no: Optional[str] = None
    job_id: Optional[str] = None
    dept_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    nationality: Optional[str] = "Tanzanian"
    nida: Optional[str] = None
    join_date: Optional[str] = None
    contract_type: Optional[str] = "Permanent"
    wage: Optional[float] = 0
    hra: Optional[float] = 0
    travel: Optional[float] = 0
    meal: Optional[float] = 0
    medical: Optional[float] = 0
    other_allowance: Optional[float] = 0
    bank_name: Optional[str] = None
    account_no: Optional[str] = None
    tin: Optional[str] = None
    nssf_no: Optional[str] = None
    site: Optional[str] = None
    manager_id: Optional[str] = None
    tenant_id: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    dept_id: Optional[str] = None
    job_id: Optional[str] = None
    status: Optional[str] = None
    wage: Optional[float] = None
    hra: Optional[float] = None
    travel: Optional[float] = None
    meal: Optional[float] = None
    medical: Optional[float] = None
    other_allowance: Optional[float] = None
    bank_name: Optional[str] = None
    account_no: Optional[str] = None
    tin: Optional[str] = None
    nssf_no: Optional[str] = None
    site: Optional[str] = None
    manager_id: Optional[str] = None
    contract_type: Optional[str] = None
    photo_url: Optional[str] = None

class ExpenseCreate(BaseModel):
    expense_date: Optional[str] = None
    employee_id: str
    employee_name: Optional[str] = None
    category: str
    description: str
    amount: float
    currency: Optional[str] = "TZS"
    payment_mode: Optional[str] = "own_account"
    ref: Optional[str] = None
    tenant_id: Optional[str] = None

class LeaveCreate(BaseModel):
    employee_id: str
    employee_name: Optional[str] = None
    leave_type: str
    days: float
    date_from: str
    date_to: str
    notes: Optional[str] = None
    tenant_id: Optional[str] = None

class ResignationCreate(BaseModel):
    employee_id: str
    resignation_type: Optional[str] = "resigned"
    reason: str
    expected_revealing_date: str
    notice_period: Optional[int] = 30
    tenant_id: Optional[str] = None

class BatchGenerateRequest(BaseModel):
    period: str     # "2026-11"
    employee_ids: Optional[List[str]] = None    # None = all active
    payment_method: Optional[str] = "bank"
    create_journal_entry: Optional[bool] = True
    tenant_id: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _emp_dict(e: Employee) -> dict:
    return {
        "id": e.id, "name": e.name, "emp_no": e.emp_no,
        "job_id": e.job_id, "dept_id": e.dept_id,
        "phone": e.phone, "email": e.email, "gender": e.gender,
        "dob": e.dob, "nationality": e.nationality, "nida": e.nida,
        "join_date": e.join_date, "contract_type": e.contract_type,
        "status": e.status, "avatar": e.avatar,
        "wage": e.wage, "hra": e.hra, "travel": e.travel,
        "meal": e.meal, "medical": e.medical, "other_allowance": e.other_allowance,
        "bank_name": e.bank_name, "account_no": e.account_no,
        "tin": e.tin, "nssf_no": e.nssf_no, "site": e.site,
        "manager_id": e.manager_id, "photo_url": e.photo_url,
        "resign_date": e.resign_date, "resigned": e.resigned, "fired": e.fired,
        "active": e.active,
    }


def _payslip_dict(p: Payslip) -> dict:
    return {
        "id": p.id, "number": p.number, "name": p.name,
        "employee_id": p.employee_id, "employee_name": p.employee_name,
        "dept_id": p.dept_id, "batch_id": p.batch_id,
        "period": p.period, "date_from": p.date_from, "date_to": p.date_to,
        "state": p.state, "lines": p.lines or [],
        "basic": p.basic, "gross": p.gross, "net": p.net,
        "total_deductions": p.total_deductions,
        "nssf_ee": p.nssf_ee, "paye": p.paye,
        "nssf_er": p.nssf_er, "sdl": p.sdl, "wcf": p.wcf,
        "total_employer_cost": p.total_employer_cost,
        "payment_date": p.payment_date, "payment_method": p.payment_method,
        "journal_entry_id": p.journal_entry_id, "notes": p.notes,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


# ── Departments ────────────────────────────────────────────────────────────────

@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).filter(Department.active == True).all()
    return [
        {"id": d.id, "name": d.name, "manager_name": d.manager_name, "headcount": d.headcount}
        for d in depts
    ]


@router.post("/departments", status_code=201)
def create_department(body: DepartmentCreate, db: Session = Depends(get_db)):
    dept = Department(id="dept_" + uuid.uuid4().hex[:8], **body.model_dump())
    db.add(dept)
    db.commit()
    return {"id": dept.id, "name": dept.name}


@router.put("/departments/{dept_id}")
def update_department(dept_id: str, body: dict, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    for k, v in body.items():
        if hasattr(dept, k):
            setattr(dept, k, v)
    db.commit()
    return {"id": dept.id}


# ── Job Positions ─────────────────────────────────────────────────────────────

@router.get("/job-positions")
def list_job_positions(db: Session = Depends(get_db)):
    jobs = db.query(JobPosition).filter(JobPosition.active == True).all()
    return [{"id": j.id, "name": j.name, "dept_id": j.dept_id} for j in jobs]


@router.post("/job-positions", status_code=201)
def create_job_position(body: JobPositionCreate, db: Session = Depends(get_db)):
    job = JobPosition(id="job_" + uuid.uuid4().hex[:8], **body.model_dump())
    db.add(job)
    db.commit()
    return {"id": job.id, "name": job.name}


# ── Employees ─────────────────────────────────────────────────────────────────

@router.get("/employees")
def list_employees(
    dept_id: Optional[str] = None,
    status: Optional[str] = "active",
    db: Session = Depends(get_db),
):
    q = db.query(Employee).filter(Employee.active == True)
    if dept_id:
        q = q.filter(Employee.dept_id == dept_id)
    if status:
        q = q.filter(Employee.status == status)
    employees = q.order_by(Employee.name).all()
    return [_emp_dict(e) for e in employees]


@router.get("/employees/{emp_id}")
def get_employee(emp_id: str, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return _emp_dict(emp)


@router.post("/employees", status_code=201)
def create_employee(body: EmployeeCreate, db: Session = Depends(get_db)):
    count = db.query(Employee).count()
    emp_no = body.emp_no or f"EMP-{count + 1:03d}"
    emp = Employee(
        id="emp_" + uuid.uuid4().hex[:8],
        emp_no=emp_no,
        avatar=body.name[:2].upper(),
        **body.model_dump(exclude={"emp_no"}),
    )
    emp.emp_no = emp_no
    db.add(emp)
    # Update dept headcount
    if body.dept_id:
        dept = db.query(Department).filter(Department.id == body.dept_id).first()
        if dept:
            dept.headcount = (dept.headcount or 0) + 1
    db.commit()
    return _emp_dict(emp)


@router.put("/employees/{emp_id}")
def update_employee(emp_id: str, body: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(emp, k, v)
    emp.updated_at = datetime.utcnow()
    db.commit()
    return _emp_dict(emp)


@router.delete("/employees/{emp_id}")
def deactivate_employee(emp_id: str, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    emp.active = False
    emp.status = "inactive"
    db.commit()
    return {"ok": True}


@router.get("/employees/{emp_id}/payslip-preview")
def preview_payslip(emp_id: str, db: Session = Depends(get_db)):
    """Compute live payslip breakdown for an employee without saving."""
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return compute_payslip(emp)


# ── Payroll / Payslips ─────────────────────────────────────────────────────────

@router.get("/payslips")
def list_payslips(
    period: Optional[str] = None,
    employee_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Payslip)
    if period:
        q = q.filter(Payslip.period == period)
    if employee_id:
        q = q.filter(Payslip.employee_id == employee_id)
    if batch_id:
        q = q.filter(Payslip.batch_id == batch_id)
    if state:
        q = q.filter(Payslip.state == state)
    payslips = q.order_by(Payslip.created_at.desc()).all()
    return [_payslip_dict(p) for p in payslips]


@router.get("/payslips/{slip_id}")
def get_payslip(slip_id: str, db: Session = Depends(get_db)):
    slip = db.query(Payslip).filter(Payslip.id == slip_id).first()
    if not slip:
        raise HTTPException(404, "Payslip not found")
    return _payslip_dict(slip)


@router.post("/payslips/generate-batch")
def generate_payslip_batch(body: BatchGenerateRequest, db: Session = Depends(get_db)):
    """Generate payslips for all (or selected) active employees for a period.
    Follows hr.payslip.run / compute_sheet() logic from zalongwa_om_hr_payroll.
    """
    year, month = body.period.split("-")
    from calendar import monthrange
    last_day = monthrange(int(year), int(month))[1]
    date_from = f"{year}-{month}-01"
    date_to = f"{year}-{month}-{last_day:02d}"
    month_name = datetime(int(year), int(month), 1).strftime("%B")

    # Create batch
    batch = PayslipBatch(
        id="batch_" + uuid.uuid4().hex[:8],
        tenant_id=body.tenant_id,
        name=f"Payroll - {month_name} {year}",
        period=body.period,
        date_start=date_from,
        date_end=date_to,
        state="draft",
    )
    db.add(batch)
    db.flush()

    # Fetch employees
    emp_q = db.query(Employee).filter(Employee.active == True, Employee.status == "active")
    if body.employee_ids:
        emp_q = emp_q.filter(Employee.id.in_(body.employee_ids))
    employees = emp_q.all()

    created_slips = []
    for emp in employees:
        # Skip if payslip already exists for this period
        existing = db.query(Payslip).filter(
            Payslip.employee_id == emp.id,
            Payslip.period == body.period,
            Payslip.state != "cancel",
        ).first()
        if existing:
            created_slips.append(_payslip_dict(existing))
            continue

        calc = compute_payslip(emp)
        count = db.query(Payslip).count()
        slip_no = f"SLIP/{year}/{emp.emp_no.replace('EMP-', '')}/{month}"

        slip = Payslip(
            id="slip_" + uuid.uuid4().hex[:8],
            tenant_id=body.tenant_id,
            number=slip_no,
            name=f"Salary Slip of {emp.name} for {month_name}-{year}",
            employee_id=emp.id,
            employee_name=emp.name,
            dept_id=emp.dept_id,
            batch_id=batch.id,
            period=body.period,
            date_from=date_from,
            date_to=date_to,
            state="done",
            lines=calc["lines"],
            basic=calc["basic"],
            gross=calc["gross"],
            net=calc["net"],
            total_deductions=calc["total_deductions"],
            nssf_ee=calc["nssf_ee"],
            paye=calc["paye"],
            nssf_er=calc["nssf_er"],
            sdl=calc["sdl"],
            wcf=calc["wcf"],
            total_employer_cost=calc["total_employer_cost"],
            payment_method=body.payment_method or "bank",
            payment_date=date_to,
        )
        db.add(slip)
        created_slips.append(calc)

    # Create payroll journal entry (accounting bridge)
    je_id = None
    if body.create_journal_entry and created_slips:
        je_data = build_payroll_journal_entry(
            [{"gross": s.get("gross", 0), "nssf_ee": s.get("nssf_ee", 0),
              "paye": s.get("paye", 0), "nssf_er": s.get("nssf_er", 0),
              "sdl": s.get("sdl", 0), "wcf": s.get("wcf", 0),
              "net": s.get("net", 0)} for s in created_slips],
            body.period,
        )
        count = db.query(JournalEntry).count()
        je = JournalEntry(
            id="je_" + uuid.uuid4().hex[:8],
            tenant_id=body.tenant_id,
            number=f"JE/{year}/{count + 1:04d}",
            entry_date=date_to,
            journal=je_data["journal"],
            state="posted",
            ref=je_data["ref"],
            source="payroll",
            total_debit=je_data["total_debit"],
            total_credit=je_data["total_credit"],
            posted_at=datetime.utcnow(),
        )
        db.add(je)
        db.flush()
        je_id = je.id

        for ln in je_data["lines"]:
            acc = db.query(AccountAccount).filter(AccountAccount.code == ln["account"]).first()
            db.add(JournalEntryLine(
                id="jel_" + uuid.uuid4().hex[:8],
                entry_id=je.id,
                account_id=acc.id if acc else None,
                account_code=ln["account"],
                account_name=ln["name"],
                partner_name=ln.get("partner", ""),
                debit=ln["debit"],
                credit=ln["credit"],
            ))

    batch.state = "close"
    db.commit()

    return {
        "batch_id": batch.id,
        "batch_name": batch.name,
        "period": body.period,
        "employees_processed": len(employees),
        "journal_entry_id": je_id,
    }


@router.put("/payslips/{slip_id}/confirm")
def confirm_payslip(slip_id: str, db: Session = Depends(get_db)):
    slip = db.query(Payslip).filter(Payslip.id == slip_id).first()
    if not slip:
        raise HTTPException(404, "Payslip not found")
    slip.state = "done"
    db.commit()
    return _payslip_dict(slip)


@router.put("/payslips/{slip_id}/cancel")
def cancel_payslip(slip_id: str, db: Session = Depends(get_db)):
    slip = db.query(Payslip).filter(Payslip.id == slip_id).first()
    if not slip:
        raise HTTPException(404, "Payslip not found")
    slip.state = "cancel"
    db.commit()
    return _payslip_dict(slip)


# ── Payslip Batches ────────────────────────────────────────────────────────────

@router.get("/payslip-batches")
def list_payslip_batches(db: Session = Depends(get_db)):
    batches = db.query(PayslipBatch).order_by(PayslipBatch.created_at.desc()).all()
    return [
        {"id": b.id, "name": b.name, "period": b.period,
         "date_start": b.date_start, "date_end": b.date_end,
         "state": b.state, "count": len(b.payslips) if b.payslips else 0,
         "total_net": sum(s.net or 0 for s in (b.payslips or []))}
        for b in batches
    ]


@router.get("/payroll/salary-summary")
def salary_summary(period: Optional[str] = None, db: Session = Depends(get_db)):
    """Payroll summary across all employees."""
    q = db.query(Payslip).filter(Payslip.state == "done")
    if period:
        q = q.filter(Payslip.period == period)
    slips = q.all()
    return {
        "period": period, "count": len(slips),
        "total_gross": round(sum(s.gross or 0 for s in slips), 2),
        "total_nssf_ee": round(sum(s.nssf_ee or 0 for s in slips), 2),
        "total_paye": round(sum(s.paye or 0 for s in slips), 2),
        "total_net": round(sum(s.net or 0 for s in slips), 2),
        "total_nssf_er": round(sum(s.nssf_er or 0 for s in slips), 2),
        "total_sdl": round(sum(s.sdl or 0 for s in slips), 2),
        "total_wcf": round(sum(s.wcf or 0 for s in slips), 2),
        "total_employer_cost": round(sum(s.total_employer_cost or 0 for s in slips), 2),
    }


# ── Expenses ───────────────────────────────────────────────────────────────────

@router.get("/expenses")
def list_expenses(
    employee_id: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(EmployeeExpense)
    if employee_id:
        q = q.filter(EmployeeExpense.employee_id == employee_id)
    if state:
        q = q.filter(EmployeeExpense.state == state)
    expenses = q.order_by(EmployeeExpense.created_at.desc()).all()
    return [
        {"id": e.id, "expense_date": e.expense_date, "employee_id": e.employee_id,
         "employee_name": e.employee_name, "category": e.category,
         "description": e.description, "amount": e.amount, "currency": e.currency,
         "state": e.state, "payment_mode": e.payment_mode, "ref": e.ref,
         "approved_by": e.approved_by}
        for e in expenses
    ]


@router.post("/expenses", status_code=201)
def create_expense(body: ExpenseCreate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == body.employee_id).first()
    exp = EmployeeExpense(
        id="exp_" + uuid.uuid4().hex[:8],
        employee_name=emp.name if emp else body.employee_name,
        **body.model_dump(),
    )
    db.add(exp)
    db.commit()
    return {"id": exp.id}


@router.put("/expenses/{exp_id}/approve")
def approve_expense(exp_id: str, body: dict, db: Session = Depends(get_db)):
    exp = db.query(EmployeeExpense).filter(EmployeeExpense.id == exp_id).first()
    if not exp:
        raise HTTPException(404, "Expense not found")
    exp.state = "approved"
    exp.approved_by = body.get("approved_by")
    db.commit()
    return {"id": exp.id, "state": exp.state}


@router.put("/expenses/{exp_id}/refuse")
def refuse_expense(exp_id: str, db: Session = Depends(get_db)):
    exp = db.query(EmployeeExpense).filter(EmployeeExpense.id == exp_id).first()
    if not exp:
        raise HTTPException(404, "Expense not found")
    exp.state = "refused"
    db.commit()
    return {"id": exp.id, "state": exp.state}


# ── Attendance ─────────────────────────────────────────────────────────────────

@router.get("/attendance")
def list_attendance(
    employee_id: Optional[str] = None,
    month: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AttendanceRecord)
    if employee_id:
        q = q.filter(AttendanceRecord.employee_id == employee_id)
    if month:
        q = q.filter(AttendanceRecord.work_date.like(f"{month}%"))
    records = q.order_by(AttendanceRecord.work_date.desc()).all()
    return [
        {"id": r.id, "employee_id": r.employee_id, "employee_name": r.employee_name,
         "work_date": r.work_date, "check_in": r.check_in, "check_out": r.check_out,
         "worked_hours": r.worked_hours, "overtime_hours": r.overtime_hours,
         "late_minutes": r.late_minutes, "status": r.status}
        for r in records
    ]


@router.get("/attendance/summary")
def attendance_summary(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Per-employee attendance summary for a month."""
    from sqlalchemy import func as sqlfunc
    q = db.query(
        AttendanceRecord.employee_id,
        AttendanceRecord.employee_name,
        sqlfunc.count(AttendanceRecord.id).label("total_days"),
        sqlfunc.sum(AttendanceRecord.worked_hours).label("worked_hours"),
        sqlfunc.sum(AttendanceRecord.overtime_hours).label("overtime_hours"),
    )
    if month:
        q = q.filter(AttendanceRecord.work_date.like(f"{month}%"))
    rows = q.group_by(AttendanceRecord.employee_id, AttendanceRecord.employee_name).all()
    return [
        {"employee_id": r.employee_id, "employee_name": r.employee_name,
         "worked_days": r.total_days, "worked_hours": round(r.worked_hours or 0, 1),
         "overtime_hours": round(r.overtime_hours or 0, 1)}
        for r in rows
    ]


# ── Leaves ─────────────────────────────────────────────────────────────────────

@router.get("/leaves")
def list_leaves(
    employee_id: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Leave)
    if employee_id:
        q = q.filter(Leave.employee_id == employee_id)
    if state:
        q = q.filter(Leave.state == state)
    leaves = q.order_by(Leave.created_at.desc()).all()
    return [
        {"id": l.id, "employee_id": l.employee_id, "employee_name": l.employee_name,
         "leave_type": l.leave_type, "days": l.days,
         "date_from": l.date_from, "date_to": l.date_to, "state": l.state,
         "approved_by": l.approved_by, "notes": l.notes}
        for l in leaves
    ]


@router.post("/leaves", status_code=201)
def create_leave(body: LeaveCreate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == body.employee_id).first()
    leave = Leave(
        id="lv_" + uuid.uuid4().hex[:8],
        employee_name=emp.name if emp else body.employee_name,
        **body.model_dump(),
    )
    db.add(leave)
    db.commit()
    return {"id": leave.id}


@router.put("/leaves/{leave_id}/approve")
def approve_leave(leave_id: str, body: dict, db: Session = Depends(get_db)):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(404, "Leave not found")
    leave.state = "approved"
    leave.approved_by = body.get("approved_by")
    db.commit()
    return {"id": leave.id, "state": leave.state}


@router.put("/leaves/{leave_id}/refuse")
def refuse_leave(leave_id: str, db: Session = Depends(get_db)):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(404, "Leave not found")
    leave.state = "refused"
    db.commit()
    return {"id": leave.id, "state": leave.state}


# ── Resignations ────────────────────────────────────────────────────────────────

@router.get("/resignations")
def list_resignations(db: Session = Depends(get_db)):
    res = db.query(Resignation).order_by(Resignation.created_at.desc()).all()
    return [_res_dict(r) for r in res]


@router.post("/resignations", status_code=201)
def create_resignation(body: ResignationCreate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == body.employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    count = db.query(Resignation).count()
    res = Resignation(
        id="res_" + uuid.uuid4().hex[:8],
        name=f"RES/{count + 1:04d}",
        **body.model_dump(),
    )
    db.add(res)
    db.commit()
    return _res_dict(res)


@router.put("/resignations/{res_id}/confirm")
def confirm_resignation(res_id: str, db: Session = Depends(get_db)):
    res = db.query(Resignation).filter(Resignation.id == res_id).first()
    if not res:
        raise HTTPException(404, "Resignation not found")
    res.state = "confirm"
    res.resign_confirm_date = datetime.utcnow().strftime("%Y-%m-%d")
    db.commit()
    return _res_dict(res)


@router.put("/resignations/{res_id}/approve")
def approve_resignation(res_id: str, db: Session = Depends(get_db)):
    res = db.query(Resignation).filter(Resignation.id == res_id).first()
    if not res:
        raise HTTPException(404, "Resignation not found")
    from datetime import date, timedelta
    confirm = date.fromisoformat(res.resign_confirm_date) if res.resign_confirm_date else date.today()
    res.approved_revealing_date = (confirm + timedelta(days=res.notice_period or 30)).isoformat()
    res.state = "approved"

    # Mark employee
    emp = db.query(Employee).filter(Employee.id == res.employee_id).first()
    if emp:
        emp.resigned = res.resignation_type == "resigned"
        emp.fired = res.resignation_type == "fired"
        emp.resign_date = res.approved_revealing_date
        emp.status = "inactive"

    db.commit()
    return _res_dict(res)


@router.put("/resignations/{res_id}/cancel")
def cancel_resignation(res_id: str, db: Session = Depends(get_db)):
    res = db.query(Resignation).filter(Resignation.id == res_id).first()
    if not res:
        raise HTTPException(404, "Resignation not found")
    res.state = "cancel"
    emp = db.query(Employee).filter(Employee.id == res.employee_id).first()
    if emp:
        emp.resigned = False
        emp.fired = False
        emp.status = "active"
    db.commit()
    return _res_dict(res)


def _res_dict(r: Resignation) -> dict:
    return {
        "id": r.id, "name": r.name, "employee_id": r.employee_id,
        "resignation_type": r.resignation_type, "reason": r.reason,
        "expected_revealing_date": r.expected_revealing_date,
        "resign_confirm_date": r.resign_confirm_date,
        "approved_revealing_date": r.approved_revealing_date,
        "notice_period": r.notice_period, "state": r.state,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
