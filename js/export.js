// ── Export Functions ──────────────────────────────────────────────────────────
// Uses SheetJS for Excel, jsPDF for PDF

const Export = {

  // ── Excel: Monthly Attendance ─────────────────────────────────────────────
  attendanceExcel(month) {
    const employees = Storage.getEmployees(true).filter(e => e.role === 'employee');
    const records = Storage.getAttendanceByMonth(month);
    const { year, month: m } = Utils.parseMonth(month);
    const days = Utils.daysInMonth(year, m);
    const monthLabel = `Tháng ${String(m).padStart(2,'0')}/${year}`;
    const settings = Storage.getSettings();

    // Build header row: Name | Code | Day1 | Day2 ... | Work days | Work hours | Late count | ...
    const headers = ['Họ và tên', 'Mã NV', 'Vị trí'];
    const dayHeaders = [];
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      const dowLabels = ['CN','T2','T3','T4','T5','T6','T7'];
      dayHeaders.push(`${d}\n${dowLabels[dow]}`);
    }
    headers.push(...dayHeaders, 'Ngày công', 'Giờ làm', 'Số muộn/sớm', 'Vi phạm bị trừ', 'Khấu trừ muộn');

    const rows = [headers];

    employees.forEach(emp => {
      const row = [emp.name, emp.code, emp.position];
      let workDays = 0, totalHours = 0, lateCount = 0;

      for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const rec = records.find(r => r.employeeId === emp.id && r.date === dateStr);
        if (!rec || !rec.checkIn) {
          const dow = new Date(dateStr + 'T00:00:00').getDay();
          row.push(dow === 0 ? 'CN' : '');
        } else {
          let cell = `${rec.checkIn}-${rec.checkOut || '?'}`;
          if (rec.isLateViolation) { cell += ' [M]'; lateCount++; }
          if (rec.isEarlyViolation) { cell += ' [S]'; lateCount++; }
          if (rec.isHoliday) cell += ' [LỄ]';
          workDays++;
          totalHours += rec.workHours || 0;
          row.push(cell);
        }
      }

      const violationCount = Math.max(0, lateCount - settings.latePolicy.freePassesPerMonth);
      const deduction = violationCount * settings.latePolicy.deductionPerOccurrence;
      row.push(workDays, Math.round(totalHours * 100) / 100, lateCount, violationCount, deduction);
      rows.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 16 }, ...Array(days).fill({ wch: 14 }), { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Chấm Công');
    XLSX.writeFile(wb, `Cham_Cong_${settings.restaurantName}_${month}.xlsx`);
    Toast.success('Đã xuất file chấm công Excel!');
  },

  // ── Excel: Monthly Payroll ────────────────────────────────────────────────
  payrollExcel(month) {
    const employees = Storage.getEmployees(true).filter(e => e.role === 'employee');
    const settings = Storage.getSettings();
    const { year, month: m } = Utils.parseMonth(month);

    const headers = [
      'STT', 'Họ và tên', 'Mã NV', 'Vị trí', 'Loại HĐ',
      'Ngày công', 'Giờ làm / Số ca',
      'Lương cơ bản', 'Thưởng lễ', 'Phụ cấp', 'Thưởng thêm',
      'Số lần muộn/sớm', 'Lần miễn', 'Lần bị trừ', 'Khấu trừ muộn',
      'Khấu trừ khác', 'Tạm ứng',
      'Tổng thu', 'Tổng trừ', 'Thực lãnh', 'Trạng thái'
    ];

    const rows = [
      [`BẢNG LƯƠNG ${settings.restaurantName} - THÁNG ${String(m).padStart(2,'0')}/${year}`],
      [],
      headers
    ];

    employees.forEach((emp, idx) => {
      const p = Payroll.calculate(emp.id, month);
      if (!p) return;
      rows.push([
        idx + 1, emp.name, emp.code, emp.position, Utils.contractLabel(emp.contractType),
        p.workDays, emp.contractType === 'hourly' ? `${p.totalWorkHours}h` : `${p.totalShifts} ca`,
        p.baseSalary, p.holidayBonus, p.totalAllowances, p.bonus,
        p.lateCount, p.freePassesUsed, p.lateViolationCount, p.lateDeduction,
        p.otherDeductions, p.totalAdvances,
        p.grossSalary, p.totalDeductions, p.netSalary,
        Payroll.statusLabel(p.status || 'draft')
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
      { wch: 10 }, { wch: 12 }, ...Array(14).fill({ wch: 14 })];
    XLSX.utils.book_append_sheet(wb, ws, 'Bảng Lương');
    XLSX.writeFile(wb, `Bang_Luong_${settings.restaurantName}_${month}.xlsx`);
    Toast.success('Đã xuất bảng lương Excel!');
  },

  // ── PDF: Payslip for one employee ─────────────────────────────────────────
  payslipPDF(employeeId, month) {
    const emp = Storage.getEmployee(employeeId);
    const p = Payroll.calculate(employeeId, month);
    const settings = Storage.getSettings();
    if (!emp || !p) { Toast.error('Không tìm thấy dữ liệu lương!'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const { year, month: m } = Utils.parseMonth(month);
    const monthLabel = `Tháng ${String(m).padStart(2,'0')}/${year}`;

    // Colors
    const orange = [249, 115, 22];
    const dark = [15, 20, 37];
    const gray = [100, 116, 139];

    doc.setFillColor(...dark);
    doc.rect(0, 0, 148, 210, 'F');

    // Header
    doc.setFillColor(...orange);
    doc.rect(0, 0, 148, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.restaurantName, 74, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PHIEU LUONG - ' + monthLabel.toUpperCase(), 74, 20, { align: 'center' });

    // Employee info
    doc.setTextColor(...orange);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.name, 10, 42);
    doc.setTextColor(...gray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ma NV: ${emp.code}  |  Vi tri: ${emp.position}`, 10, 49);
    doc.text(`Loai HĐ: ${Utils.contractLabel(emp.contractType)}  |  Ngay cong: ${p.workDays}`, 10, 55);

    // Divider
    doc.setDrawColor(...orange);
    doc.setLineWidth(0.4);
    doc.line(10, 59, 138, 59);

    // Earnings section
    let y = 66;
    const line = (label, value, color = null) => {
      doc.setTextColor(...gray);
      doc.setFontSize(9);
      doc.text(label, 12, y);
      if (color) doc.setTextColor(...color);
      else doc.setTextColor(240, 244, 255);
      doc.text(value, 136, y, { align: 'right' });
      y += 7;
    };

    doc.setTextColor(...orange);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('THU NHAP', 12, y);
    y += 6;
    doc.setFont('helvetica', 'normal');

    line('Luong co ban (' + p.workNote + ')', formatVND(p.baseSalary));
    if (p.holidayBonus > 0) line('Thuong ngay le', formatVND(p.holidayBonus));
    if (p.totalAllowances > 0) line('Phu cap (an, xang,...)', formatVND(p.totalAllowances));
    if (p.bonus > 0) line('Thuong them' + (p.bonusNote ? ` (${p.bonusNote})` : ''), formatVND(p.bonus));

    doc.setDrawColor(40, 50, 70);
    doc.setLineWidth(0.2);
    doc.line(10, y, 138, y); y += 6;

    doc.setTextColor(...orange);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('KHAU TRU', 12, y);
    y += 6;
    doc.setFont('helvetica', 'normal');

    line(`Di muon/ve som: ${p.lateCount} lan (mien ${p.freePassesUsed}, tru ${p.lateViolationCount})`, formatVND(-p.lateDeduction), [239, 68, 68]);
    if (p.otherDeductions > 0) line('Khau tru khac' + (p.otherDeductionsNote ? ` (${p.otherDeductionsNote})` : ''), formatVND(-p.otherDeductions), [239, 68, 68]);
    if (p.totalAdvances > 0) line('Tam ung luong', formatVND(-p.totalAdvances), [239, 68, 68]);

    // Total
    y += 2;
    doc.setFillColor(249, 115, 22, 0.15);
    doc.setDrawColor(...orange);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, y, 128, 16, 3, 3);
    doc.setTextColor(...gray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('THUC LANH', 14, y + 7);
    doc.setTextColor(...orange);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatVND(p.netSalary), 134, y + 10, { align: 'right' });

    y += 24;
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`In luc: ${new Date().toLocaleString('vi-VN')}`, 74, y, { align: 'center' });

    doc.save(`Phieu_Luong_${emp.name.replace(/\s/g,'_')}_${month}.pdf`);
    Toast.success('Đã xuất phiếu lương PDF!');
  }
};

function formatVND(num) {
  if (num === 0) return '0 d';
  const prefix = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  return prefix + new Intl.NumberFormat('vi-VN').format(abs) + ' d';
}
