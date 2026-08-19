// ── Seed Data ─────────────────────────────────────────────────────────────────
// Runs once on first load to populate sample data

function seedData() {
  const emps = typeof DB !== 'undefined' ? DB.getEmployees(null, false) : [];
  const hasAdmin = emps && emps.some(e => e.username && e.username.toLowerCase() === 'admin');
  if (Storage.isInitialized() && hasAdmin) return;

  // ── Settings
  Storage.saveSettings({
    restaurantName: 'Gà Mẹt Cẩm Phả',
    latePolicy: {
      freePassesPerMonth: 5,
      deductionPerOccurrence: 50000,
      minLateMinutes: 15
    }
  });

  // ── Shifts
  const shifts = [
    { id: 'shift-1', name: 'Ca Sáng',   startTime: '07:00', endTime: '13:00' },
    { id: 'shift-2', name: 'Ca Chiều',  startTime: '13:00', endTime: '19:00' },
    { id: 'shift-3', name: 'Ca Tối',    startTime: '17:00', endTime: '22:00' },
    { id: 'shift-4', name: 'Ca Toàn Ngày', startTime: '08:00', endTime: '17:00' },
  ];
  shifts.forEach(s => Storage.saveShift(s));

  // ── Admin account
  const adminId = 'emp-admin';
  Storage.saveEmployee({
    id: adminId,
    storeId: 'store-1',
    code: 'ADMIN001',
    name: 'Quản Lý Tổng',
    phone: '0901234567',
    position: 'Quản lý tổng',
    contractType: 'fixed',
    hourlyRate: 0,
    shiftRate: 0,
    fixedSalary: 0,
    allowances: { food: 0, transport: 0, other: 0 },
    shiftIds: [],
    username: 'admin',
    password: 'admin123',
    role: 'SUPER_ADMIN',
    active: true,
    startDate: '2024-01-01',
  });

  // ── Store Manager account (CS2 Bãi Cháy)
  Storage.saveEmployee({
    id: 'emp-mgr2',
    storeId: 'store-2',
    code: 'MGR002',
    name: 'Trần Thanh Vân (QL CS2)',
    phone: '0902345678',
    position: 'Quản lý cơ sở 2',
    contractType: 'fixed',
    hourlyRate: 0,
    shiftRate: 0,
    fixedSalary: 8000000,
    allowances: { food: 500000, transport: 300000, other: 0 },
    shiftIds: [],
    username: 'manager2',
    password: '123',
    role: 'STORE_MANAGER',
    active: true,
    startDate: '2024-01-01',
  });

  // ── Employees
  const employees = [
    {
      id: 'emp-1',
      storeId: 'store-1',
      code: 'NV001',
      name: 'Nguyễn Thị Hoa',
      phone: '0912345678',
      position: 'Nhân viên phục vụ',
      contractType: 'hourly',
      hourlyRate: 25000,
      shiftRate: 0,
      fixedSalary: 0,
      allowances: { food: 300000, transport: 200000, other: 0 },
      shiftIds: ['shift-1', 'shift-2'],
      username: 'hoa',
      password: '123456',
      role: 'EMPLOYEE',
      active: true,
      startDate: '2024-03-01',
    },
    {
      id: 'emp-2',
      code: 'NV002',
      name: 'Trần Văn Nam',
      phone: '0923456789',
      position: 'Nhân viên bếp',
      contractType: 'shift',
      hourlyRate: 0,
      shiftRate: 160000,
      fixedSalary: 0,
      allowances: { food: 300000, transport: 150000, other: 0 },
      shiftIds: ['shift-1', 'shift-2', 'shift-3'],
      username: 'nam',
      password: '123456',
      role: 'employee',
      active: true,
      startDate: '2024-01-15',
    },
    {
      id: 'emp-3',
      code: 'NV003',
      name: 'Lê Thị Mai',
      phone: '0934567890',
      position: 'Thu ngân',
      contractType: 'fixed',
      hourlyRate: 0,
      shiftRate: 0,
      fixedSalary: 5500000,
      allowances: { food: 300000, transport: 200000, other: 0 },
      shiftIds: ['shift-4'],
      username: 'mai',
      password: '123456',
      role: 'employee',
      active: true,
      startDate: '2023-11-01',
    },
    {
      id: 'emp-4',
      code: 'NV004',
      name: 'Phạm Văn Tùng',
      phone: '0945678901',
      position: 'Nhân viên phục vụ',
      contractType: 'hourly',
      hourlyRate: 22000,
      shiftRate: 0,
      fixedSalary: 0,
      allowances: { food: 300000, transport: 0, other: 0 },
      shiftIds: ['shift-2', 'shift-3'],
      username: 'tung',
      password: '123456',
      role: 'employee',
      active: true,
      startDate: '2024-06-01',
    },
  ];
  employees.forEach(e => Storage.saveEmployee(e));

  // ── Attendance for current month (sample data)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = Utils.today();

  const empIds = ['emp-1', 'emp-2', 'emp-3', 'emp-4'];
  const empShifts = {
    'emp-1': { shiftId: 'shift-1', start: '07:00', end: '13:00' },
    'emp-2': { shiftId: 'shift-2', start: '13:00', end: '19:00' },
    'emp-3': { shiftId: 'shift-4', start: '08:00', end: '17:00' },
    'emp-4': { shiftId: 'shift-3', start: '17:00', end: '22:00' },
  };

  // Simulate past attendance (days 1 to today-1)
  for (let day = 1; day < now.getDate(); day++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
    if (dayOfWeek === 0) continue; // Skip Sundays

    empIds.forEach(empId => {
      const s = empShifts[empId];
      // Randomize: 85% attendance
      if (Math.random() < 0.15) return;

      // Random late 0-25 mins (30% chance of being late)
      const lateMins = Math.random() < 0.3 ? Math.floor(Math.random() * 26) : 0;
      // Random early leave 0-20 mins (20% chance)
      const earlyMins = Math.random() < 0.2 ? Math.floor(Math.random() * 21) : 0;

      const checkInTime = addMinutes(s.start, lateMins);
      const checkOutTime = addMinutes(s.end, -earlyMins);
      const policy = Storage.getSettings().latePolicy;

      Storage.saveAttendance({
        id: Utils.uuid(),
        employeeId: empId,
        date: dateStr,
        shiftId: s.shiftId,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        lateMinutes: lateMins,
        earlyLeaveMinutes: earlyMins,
        isLateViolation: lateMins >= policy.minLateMinutes,
        isEarlyViolation: earlyMins >= policy.minLateMinutes,
        isHoliday: false,
        holidayMultiplier: 1.0,
        workHours: Utils.workHours(checkInTime, checkOutTime),
        note: '',
        editedBy: null,
        editedAt: null,
        createdAt: dateStr + 'T' + checkInTime + ':00',
      });
    });
  }

  // ── One approved advance
  Storage.saveAdvance({
    id: Utils.uuid(),
    employeeId: 'emp-3',
    month: Utils.currentMonth(),
    amount: 1000000,
    date: today,
    reason: 'Chi tiêu cá nhân',
    status: 'approved',
    approvedBy: 'admin',
    approvedAt: today,
  });

  // ── Holidays
  Storage.saveHoliday({ id: Utils.uuid(), date: `${year}-09-02`, name: 'Quốc Khánh 2/9', multiplier: 2.0 });
  Storage.saveHoliday({ id: Utils.uuid(), date: `${year}-01-01`, name: 'Tết Dương Lịch', multiplier: 2.0 });
  Storage.saveHoliday({ id: Utils.uuid(), date: `${year}-04-30`, name: 'Ngày Giải Phóng', multiplier: 1.5 });
  Storage.saveHoliday({ id: Utils.uuid(), date: `${year}-05-01`, name: 'Quốc Tế Lao Động', multiplier: 1.5 });

  // ── Contracts (Probation & Official)
  const defaultContracts = [
    {
      id: Utils.uuid(),
      employeeId: 'emp-1',
      type: 'probation', // Hợp đồng thử việc
      contractNumber: 'HDTV-2024/001',
      title: 'HỢP ĐỒNG THỬ VIỆC LAO ĐỘNG',
      duration: '02 tháng (01/03/2024 - 30/04/2024)',
      salaryText: '25.000đ / giờ',
      allowanceText: 'Phụ cấp ăn 300.000đ/tháng, Xăng xe 200.000đ/tháng',
      workSchedule: 'Theo ca phân công (Ca sáng 07:00-13:00 / Ca chiều 13:00-19:00)',
      status: 'signed',
      signedAt: '2024-03-01T08:30:00.000Z',
      signatureData: 'Nguyễn Thị Hoa (Đã ký)',
    },
    {
      id: Utils.uuid(),
      employeeId: 'emp-1',
      type: 'official', // Hợp đồng chính thức
      contractNumber: 'HDLD-2024/001',
      title: 'HỢP ĐỒNG LAO ĐỘNG CHÍNH THỨC',
      duration: '12 tháng (01/05/2024 - 30/04/2025)',
      salaryText: '25.000đ / giờ',
      allowanceText: 'Phụ cấp ăn 300.000đ/tháng, Xăng xe 200.000đ/tháng',
      workSchedule: 'Theo ca phân công (Ca sáng 07:00-13:00 / Ca chiều 13:00-19:00)',
      status: 'pending', // Chưa ký -> để Hoa vào ký trải nghiệm
      signedAt: null,
      signatureData: null,
    },
    {
      id: Utils.uuid(),
      employeeId: 'emp-3',
      type: 'official',
      contractNumber: 'HDLD-2023/003',
      title: 'HỢP ĐỒNG LAO ĐỘNG CHÍNH THỨC',
      duration: '24 tháng (01/11/2023 - 31/10/2025)',
      salaryText: '5.500.000đ / tháng',
      allowanceText: 'Phụ cấp ăn 300.000đ/tháng, Xăng xe 200.000đ/tháng',
      workSchedule: 'Ca toàn ngày (08:00 - 17:00)',
      status: 'signed',
      signedAt: '2023-11-01T09:00:00.000Z',
      signatureData: 'Lê Thị Mai (Đã ký)',
    }
  ];
  defaultContracts.forEach(c => Storage.saveContract(c));

  Storage.markInitialized();
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.max(0, Math.floor(total / 60)) % 24;
  const nm = Math.max(0, total % 60);
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
}
