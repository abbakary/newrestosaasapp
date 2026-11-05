"""Tanzania payroll computation engine.
Follows zalongwa_om_hr_payroll / data_hr.js computePayslip() and computePAYE() logic.

TRA 2025/2026 progressive PAYE table:
  Annual income ≤ 3,240,000  → 0%
  3,240,001 – 6,240,000     → 8%  on excess
  6,240,001 – 9,240,000     → 20% on excess + 240,000
  9,240,001 – 12,240,000    → 25% on excess + 840,000
  > 12,240,000              → 30% on excess + 1,590,000
"""
from typing import Dict, Any
import math


def compute_paye(monthly_income: float) -> float:
    """Compute monthly PAYE from monthly gross income (TRA 2025/2026 rates)."""
    annual = monthly_income * 12
    if annual <= 3_240_000:
        tax = 0.0
    elif annual <= 6_240_000:
        tax = (annual - 3_240_000) * 0.08
    elif annual <= 9_240_000:
        tax = 240_000 + (annual - 6_240_000) * 0.20
    elif annual <= 12_240_000:
        tax = 840_000 + (annual - 9_240_000) * 0.25
    else:
        tax = 1_590_000 + (annual - 12_240_000) * 0.30
    return math.floor(tax / 12)


def compute_payslip(emp) -> Dict[str, Any]:
    """Compute a full payslip breakdown for an employee record.
    
    Args:
        emp: Employee model instance or dict with wage, hra, travel, meal, medical fields.
    
    Returns:
        Dict with all computed payslip fields and lines list.
    """
    # Allow both ORM objects and plain dicts
    if hasattr(emp, '__dict__'):
        basic    = float(getattr(emp, 'wage', 0) or 0)
        hra      = float(getattr(emp, 'hra', 0) or 0)
        travel   = float(getattr(emp, 'travel', 0) or 0)
        meal     = float(getattr(emp, 'meal', 0) or 0)
        medical  = float(getattr(emp, 'medical', 0) or 0)
        other    = float(getattr(emp, 'other_allowance', 0) or 0)
    else:
        basic    = float(emp.get('wage', 0) or 0)
        hra      = float(emp.get('hra', 0) or 0)
        travel   = float(emp.get('travel', 0) or 0)
        meal     = float(emp.get('meal', 0) or 0)
        medical  = float(emp.get('medical', 0) or 0)
        other    = float(emp.get('other_allowance', 0) or 0)

    gross = basic + hra + travel + meal + medical + other

    # Employee deductions
    nssf_ee = math.floor(basic * 0.10)          # 10% of basic
    paye    = compute_paye(gross)
    total_deductions = nssf_ee + paye
    net = gross - total_deductions

    # Employer contributions (not deducted from employee)
    nssf_er = math.floor(basic * 0.10)           # 10% of basic
    sdl     = math.floor(gross * 0.04)           # 4% of gross (Skills Development Levy)
    wcf_raw = math.floor(gross * 0.005)
    wcf     = min(wcf_raw, math.floor(gross * 0.10))  # 0.5% of gross, capped at 10%

    total_employer_cost = gross + nssf_er + sdl + wcf

    lines = [
        {"code": "BASIC",   "name": "Basic Salary",                "category": "BASIC",    "amount": basic,     "type": "earning"},
        {"code": "HRA",     "name": "House Rent Allowance",         "category": "ALW",      "amount": hra,       "type": "earning"},
        {"code": "TRAVEL",  "name": "Travel Allowance",             "category": "ALW",      "amount": travel,    "type": "earning"},
        {"code": "MEAL",    "name": "Meal Allowance",               "category": "ALW",      "amount": meal,      "type": "earning"},
        {"code": "MEDICAL", "name": "Medical Allowance",            "category": "ALW",      "amount": medical,   "type": "earning"},
    ]
    if other > 0:
        lines.append({"code": "OTHER", "name": "Other Allowance",  "category": "ALW",      "amount": other,     "type": "earning"})

    lines += [
        {"code": "GROSS",   "name": "Gross Salary",                 "category": "GROSS",    "amount": gross,     "type": "earning"},
        {"code": "NSSF_EE", "name": "NSSF Employee (10%)",          "category": "DED",      "amount": -nssf_ee,  "type": "deduction"},
        {"code": "PAYE",    "name": "PAYE Tax",                     "category": "DED",      "amount": -paye,     "type": "deduction"},
        {"code": "NET",     "name": "Net Salary",                   "category": "NET",      "amount": net,       "type": "net"},
        {"code": "NSSF_ER", "name": "Employer NSSF (10%)",          "category": "EMP_CONT", "amount": nssf_er,   "type": "employer"},
        {"code": "SDL",     "name": "SDL (4% of Gross)",            "category": "EMP_CONT", "amount": sdl,       "type": "employer"},
        {"code": "WCF",     "name": "WCF (0.5% capped)",            "category": "EMP_CONT", "amount": wcf,       "type": "employer"},
    ]

    return {
        "basic": basic,
        "hra": hra,
        "travel": travel,
        "meal": meal,
        "medical": medical,
        "other": other,
        "gross": gross,
        "nssf_ee": nssf_ee,
        "paye": paye,
        "net": net,
        "nssf_er": nssf_er,
        "sdl": sdl,
        "wcf": wcf,
        "total_deductions": total_deductions,
        "total_employer_cost": total_employer_cost,
        "lines": lines,
    }


def build_payroll_journal_entry(payslips_data: list, period: str, journal: str = "Payroll Journal") -> dict:
    """Build accounting journal entry for a payroll batch.
    
    Follows payroll_account bridge logic:
      DR Salaries & Wages Expense       (1001)  — basic+allowances
      DR Employer NSSF Expense          (1002)  — nssf_er
      DR SDL Expense                    (1003)  — sdl
      DR WCF Expense                    (1004)  — wcf
      CR PAYE Payable                   (2001)  — paye
      CR NSSF Payable                   (2002)  — nssf_ee + nssf_er
      CR SDL Payable                    (2003)  — sdl
      CR WCF Payable                    (2004)  — wcf
      CR Bank (Net pay)                 (1031)  — net salaries disbursed
    """
    totals = {k: 0.0 for k in ["gross", "nssf_ee", "paye", "nssf_er", "sdl", "wcf", "net"]}
    for ps in payslips_data:
        for k in totals:
            totals[k] += ps.get(k, 0)

    lines = [
        {"account": "1001", "name": "Salaries and Wages Expense",  "debit": totals["gross"],   "credit": 0,                   "partner": ""},
        {"account": "1002", "name": "Employer NSSF Expense",       "debit": totals["nssf_er"], "credit": 0,                   "partner": ""},
        {"account": "1003", "name": "SDL Expense",                  "debit": totals["sdl"],     "credit": 0,                   "partner": ""},
        {"account": "1004", "name": "WCF Expense",                  "debit": totals["wcf"],     "credit": 0,                   "partner": ""},
        {"account": "2001", "name": "PAYE Payable",                 "debit": 0,                 "credit": totals["paye"],       "partner": "TRA"},
        {"account": "2002", "name": "NSSF Payable",                 "debit": 0,                 "credit": totals["nssf_ee"] + totals["nssf_er"], "partner": "NSSF"},
        {"account": "2003", "name": "SDL Payable",                  "debit": 0,                 "credit": totals["sdl"],        "partner": "WDA"},
        {"account": "2004", "name": "WCF Payable",                  "debit": 0,                 "credit": totals["wcf"],        "partner": "WCF"},
        {"account": "1031", "name": "Bank",                         "debit": 0,                 "credit": totals["net"],        "partner": "Employees"},
    ]

    return {
        "journal": journal,
        "ref": f"PAYROLL-{period}",
        "lines": lines,
        "total_debit": sum(l["debit"] for l in lines),
        "total_credit": sum(l["credit"] for l in lines),
    }
