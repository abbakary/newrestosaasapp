"""HR models: Departments, Job Positions, Employees, Contracts,
Salary Rules, Payslips, Payslip Batches, Expenses, Attendance, Leaves.
Follows zalongwa_om_hr_payroll/payroll_account reference patterns.
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "hr_departments"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    manager_name = Column(String)
    headcount = Column(Integer, default=0)
    active = Column(Boolean, default=True)

    employees = relationship("Employee", back_populates="department",
                              foreign_keys="Employee.dept_id")
    job_positions = relationship("JobPosition", back_populates="department")


class JobPosition(Base):
    __tablename__ = "hr_job_positions"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    dept_id = Column(String, ForeignKey("hr_departments.id"), nullable=True)
    active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="job_positions")
    employees = relationship("Employee", back_populates="job_position")


class Employee(Base):
    __tablename__ = "hr_employees"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    emp_no = Column(String, unique=True)
    job_id = Column(String, ForeignKey("hr_job_positions.id"), nullable=True)
    dept_id = Column(String, ForeignKey("hr_departments.id"), nullable=True)
    phone = Column(String)
    email = Column(String)
    gender = Column(String)
    dob = Column(String)
    nationality = Column(String, default="Tanzanian")
    nida = Column(String)
    join_date = Column(String)
    contract_type = Column(String, default="Permanent")     # Permanent|Fixed Term|Casual
    status = Column(String, default="active")               # active|inactive|resigned|fired
    avatar = Column(String)

    # Salary fields (from hr.version / contract)
    wage = Column(Float, default=0)
    hra = Column(Float, default=0)          # House Rent Allowance
    travel = Column(Float, default=0)       # Travel Allowance
    meal = Column(Float, default=0)         # Meal Allowance
    medical = Column(Float, default=0)      # Medical Allowance
    other_allowance = Column(Float, default=0)

    # Banking / statutory
    bank_name = Column(String)
    account_no = Column(String)
    tin = Column(String)
    nssf_no = Column(String)

    # Employment
    site = Column(String)
    manager_id = Column(String, ForeignKey("hr_employees.id"), nullable=True)
    photo_url = Column(String)

    # Resignation tracking (hr_resignation pattern)
    resign_date = Column(String)
    resigned = Column(Boolean, default=False)
    fired = Column(Boolean, default=False)

    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = relationship("Department", back_populates="employees",
                               foreign_keys=[dept_id])
    job_position = relationship("JobPosition", back_populates="employees")
    manager = relationship("Employee", remote_side="Employee.id", foreign_keys=[manager_id])
    payslips = relationship("Payslip", back_populates="employee")
    expenses = relationship("EmployeeExpense", back_populates="employee")
    leaves = relationship("Leave", back_populates="employee")
    attendance = relationship("AttendanceRecord", back_populates="employee")


class SalaryStructure(Base):
    """hr.payroll.structure equivalent."""
    __tablename__ = "hr_salary_structures"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    code = Column(String)
    notes = Column(Text)
    active = Column(Boolean, default=True)

    rules = relationship("SalaryRule", back_populates="structure",
                          foreign_keys="SalaryRule.structure_id")


class SalaryRule(Base):
    """hr.salary.rule equivalent.
    Tanzania standard structure follows: BASIC → allowances → GROSS → NSSF_EE → PAYE → NET
    + employer contributions: NSSF_ER, SDL, WCF
    """
    __tablename__ = "hr_salary_rules"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    structure_id = Column(String, ForeignKey("hr_salary_structures.id"), nullable=True)
    code = Column(String, nullable=False)   # BASIC|HRA|TRAVEL|GROSS|NSSF_EE|PAYE|NET|NSSF_ER|SDL|WCF
    name = Column(String, nullable=False)
    category = Column(String)               # BASIC|ALW|GROSS|DED|NET|EMP_CONT
    sequence = Column(Integer, default=5)
    rule_type = Column(String, default="earning")   # earning|deduction|net|employer
    amount_select = Column(String, default="fix")   # fix|percentage|code
    amount_fix = Column(Float, default=0)
    amount_percentage = Column(Float, default=0)
    amount_percentage_base = Column(String)     # Python expression e.g. "contract.wage"
    amount_python = Column(Text)                # Python code block for code type
    condition_select = Column(String, default="none")   # none|range|python
    condition_range = Column(String)
    condition_range_min = Column(Float, default=0)
    condition_range_max = Column(Float, default=999999999)
    appears_on_payslip = Column(Boolean, default=True)
    account_debit_code = Column(String)
    account_credit_code = Column(String)
    active = Column(Boolean, default=True)
    notes = Column(Text)

    structure = relationship("SalaryStructure", back_populates="rules",
                              foreign_keys=[structure_id])


class PayslipBatch(Base):
    """hr.payslip.run equivalent."""
    __tablename__ = "hr_payslip_batches"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    period = Column(String)         # "2026-11"
    date_start = Column(String)
    date_end = Column(String)
    state = Column(String, default="draft")     # draft|close
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    payslips = relationship("Payslip", back_populates="batch")


class Payslip(Base):
    """hr.payslip equivalent — Tanzania structure."""
    __tablename__ = "hr_payslips"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    number = Column(String, unique=True)
    name = Column(String)
    employee_id = Column(String, ForeignKey("hr_employees.id"), nullable=False)
    employee_name = Column(String)
    dept_id = Column(String, ForeignKey("hr_departments.id"), nullable=True)
    batch_id = Column(String, ForeignKey("hr_payslip_batches.id"), nullable=True)
    period = Column(String)         # "2026-11"
    date_from = Column(String)
    date_to = Column(String)
    state = Column(String, default="draft")     # draft|verify|done|cancel
    lines = Column(JSON, default=[])
    # Computed totals stored for fast access
    basic = Column(Float, default=0)
    gross = Column(Float, default=0)
    net = Column(Float, default=0)
    total_deductions = Column(Float, default=0)
    nssf_ee = Column(Float, default=0)
    paye = Column(Float, default=0)
    nssf_er = Column(Float, default=0)
    sdl = Column(Float, default=0)
    wcf = Column(Float, default=0)
    total_employer_cost = Column(Float, default=0)
    payment_date = Column(String)
    payment_method = Column(String, default="bank")
    journal_entry_id = Column(String, nullable=True)    # accounting bridge
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="payslips")
    department = relationship("Department", foreign_keys=[dept_id])
    batch = relationship("PayslipBatch", back_populates="payslips")


class EmployeeExpense(Base):
    __tablename__ = "hr_employee_expenses"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    expense_date = Column(String)
    employee_id = Column(String, ForeignKey("hr_employees.id"), nullable=False)
    employee_name = Column(String)
    category = Column(String)       # transport|accommodation|meals|entertainment|other
    description = Column(String)
    amount = Column(Float, default=0)
    currency = Column(String, default="TZS")
    state = Column(String, default="draft")     # draft|submitted|approved|paid|refused
    payment_mode = Column(String, default="own_account")    # own_account|company_account
    ref = Column(String)
    approved_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="expenses")


class Leave(Base):
    __tablename__ = "hr_leaves"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    employee_id = Column(String, ForeignKey("hr_employees.id"), nullable=False)
    employee_name = Column(String)
    leave_type = Column(String)     # annual|sick|maternity|paternity|unpaid|emergency
    days = Column(Float, default=1)
    date_from = Column(String)
    date_to = Column(String)
    state = Column(String, default="draft")     # draft|confirmed|approved|refused|cancelled
    approved_by = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="leaves")


class AttendanceRecord(Base):
    __tablename__ = "hr_attendance"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    employee_id = Column(String, ForeignKey("hr_employees.id"), nullable=False)
    employee_name = Column(String)
    work_date = Column(String)
    check_in = Column(String)
    check_out = Column(String)
    worked_hours = Column(Float, default=0)
    overtime_hours = Column(Float, default=0)
    late_minutes = Column(Integer, default=0)
    status = Column(String, default="present")  # present|absent|late|halfday
    notes = Column(Text)

    employee = relationship("Employee", back_populates="attendance")


class Resignation(Base):
    """hr_resignation equivalent."""
    __tablename__ = "hr_resignations"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True)
    name = Column(String)   # auto-sequence
    employee_id = Column(String, ForeignKey("hr_employees.id"), nullable=False)
    dept_id = Column(String, nullable=True)
    resignation_type = Column(String, default="resigned")   # resigned|fired
    reason = Column(Text, nullable=False)
    expected_revealing_date = Column(String)    # employee's requested last day
    resign_confirm_date = Column(String)
    approved_revealing_date = Column(String)
    joined_date = Column(String)
    notice_period = Column(Integer, default=30)
    state = Column(String, default="draft")     # draft|confirm|approved|cancel
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")
