// ── Payroll Calculation Engine ────────────────────────────────────────────────

const Payroll = {

  // Calculate payroll for one employee for a given month
  // Returns a payroll object (unsaved) - admin can adjust before saving
  calculate(employeeId, month) {
    const emp = Storage.getEmployee(employeeId);
    if (!emp) return null;

    const summary = Attendance.getMonthlySummary(employeeId, month);
    const settings = Storage.getSettings();
    const policy = settings.latePolicy;

    // ── Base Salary Calculation ────────────────────────────────────────
    let baseSalary = 0;
    let workNote = '';

    if (emp.contractType === 'hourly') {
      baseSalary = Math.round(summary.totalWorkHours * emp.hourlyRate);
      workNote = `${summary.totalWorkHours}h × ${Utils.currency(emp.hourlyRate)}/h`;
    } else if (emp.contractType === 'shift') {
      baseSalary = Math.round(summary.totalShifts * emp.shiftRate);
      workNote = `${summary.totalShifts} ca × ${Utils.currency(emp.shiftRate)}/ca`;
    } else if (emp.contractType === 'fixed') {
      // Pro-rate by work days? For simplicity: pay full if ≥ threshold, else prorate
      const workingDaysInMonth = this.getWorkingDaysInMonth(month);
      baseSalary = Math.round((emp.fixedSalary / workingDaysInMonth) * summary.workDays);
      workNote = `${summary.workDays}/${workingDaysInMonth} ngày × ${Utils.currency(emp.fixedSalary)}/tháng`;
    }

    // ── Holiday bonus (extra pay for holidays)
    let holidayBonus = 0;
    if (summary.holidayWorkHours > 0 && emp.contractType === 'hourly') {
      // Extra (multiplier - 1) for each holiday hour already counted in base
      const holidayRecords = summary.records.filter(r => r.isHoliday && r.workHours);
      holidayRecords.forEach(r => {
        if (emp.contractType === 'hourly') {
          holidayBonus += Math.round(r.workHours * emp.hourlyRate * (r.holidayMultiplier - 1));
        }
      });
    }

    // ── Allowances ─────────────────────────────────────────────────────
    const allowances = emp.allowances || { food: 0, transport: 0, other: 0 };
    const totalAllowances = (allowances.food || 0) + (allowances.transport || 0) + (allowances.other || 0);

    // ── Late Deductions ────────────────────────────────────────────────
    const lateDeduction = summary.lateDeduction;

    // ── Check existing payroll for manual adjustments ──────────────────
    const existingPayroll = Storage.getPayroll(employeeId, month);
    const bonus = existingPayroll ? (existingPayroll.bonus || 0) : 0;
    const bonusNote = existingPayroll ? (existingPayroll.bonusNote || '') : '';
    const otherDeductions = existingPayroll ? (existingPayroll.otherDeductions || 0) : 0;
    const otherDeductionsNote = existingPayroll ? (existingPayroll.otherDeductionsNote || '') : '';

    // ── Deductions ───────────────────────────────────────────────────
    const advances = [];
    const totalAdvances = 0;

    // ── Totals ────────────────────────────────────────────────────────
    const grossSalary = baseSalary + holidayBonus + totalAllowances + bonus;
    const totalDeductions = lateDeduction + otherDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
      id: existingPayroll ? existingPayroll.id : Utils.uuid(),
      employeeId,
      month,
      // work data
      contractType: emp.contractType,
      workDays: summary.workDays,
      totalWorkHours: summary.totalWorkHours,
      totalShifts: summary.totalShifts,
      workNote,
      // salary
      baseSalary,
      holidayBonus,
      allowances,
      totalAllowances,
      bonus,
      bonusNote,
      // deductions
      lateCount: summary.lateCount,
      lateViolationCount: summary.lateViolationCount,
      freePassesUsed: Math.min(summary.lateCount, policy.freePassesPerMonth),
      lateDeduction,
      otherDeductions,
      otherDeductionsNote,
      // advance
      advances: advances.map(a => ({ id: a.id, amount: a.amount, date: a.date })),
      totalAdvances,
      // result
      grossSalary,
      totalDeductions,
      netSalary,
      // meta
      status: existingPayroll ? existingPayroll.status : 'draft',
      calculatedAt: new Date().toISOString(),
      paidAt: existingPayroll ? existingPayroll.paidAt : null,
    };
  },

  // Recalculate and save payroll
  recalculateAndSave(employeeId, month) {
    const payroll = this.calculate(employeeId, month);
    if (payroll) Storage.savePayroll(payroll);
    return payroll;
  },

  // Update manual fields (bonus, deductions) and recalculate
  updateManualFields(employeeId, month, fields) {
    let payroll = Storage.getPayroll(employeeId, month);
    if (!payroll) payroll = this.calculate(employeeId, month);
    if (!payroll) return null;

    // Apply manual overrides
    Object.assign(payroll, fields);

    // Recalculate totals
    payroll.grossSalary = payroll.baseSalary + payroll.holidayBonus + payroll.totalAllowances + payroll.bonus;
    payroll.totalDeductions = payroll.lateDeduction + payroll.otherDeductions + payroll.totalAdvances;
    payroll.netSalary = Math.max(0, payroll.grossSalary - payroll.totalDeductions);
    payroll.calculatedAt = new Date().toISOString();

    Storage.savePayroll(payroll);
    return payroll;
  },

  // Count working days in a month (Mon-Sat by default)
  getWorkingDaysInMonth(monthStr) {
    const { year, month } = Utils.parseMonth(monthStr);
    const days = Utils.daysInMonth(year, month);
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0) count++; // Sunday off
    }
    return count;
  },

  // Calculate all payrolls for a month
  calculateAll(month) {
    const employees = Storage.getEmployees(true).filter(e => e.role === 'employee');
    return employees.map(emp => this.calculate(emp.id, month));
  },

  // Mark as paid
  markPaid(employeeId, month) {
    let payroll = Storage.getPayroll(employeeId, month);
    if (!payroll) return false;
    payroll.status = 'paid';
    payroll.paidAt = new Date().toISOString();
    Storage.savePayroll(payroll);
    return true;
  },

  // Status label
  statusLabel(status) {
    const labels = { draft: 'Nháp', confirmed: 'Đã duyệt', paid: 'Đã trả' };
    return labels[status] || status;
  },
  statusBadgeClass(status) {
    const classes = { draft: 'badge-neutral', confirmed: 'badge-info', paid: 'badge-success' };
    return classes[status] || 'badge-neutral';
  }
};
