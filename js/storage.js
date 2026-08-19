// ── Storage Compatibility Layer (Delegates to Central Database API DB) ─────────

const Storage = {

  // Current selected store ID filter for UI (defaults to 'all' or active session store)
  currentStoreId: 'all',

  setStoreFilter(storeId) {
    this.currentStoreId = storeId || 'all';
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings() {
    return (typeof DB !== 'undefined') ? DB.getSettings() : {
      restaurantName: 'Gà Mẹt Cẩm Phả',
      latePolicy: { freePassesPerMonth: 5, minLateMinutes: 15, deductionPerOccurrence: 50000 }
    };
  },
  saveSettings(data) {
    return (typeof DB !== 'undefined') ? DB.saveSettings(data) : data;
  },

  // ── Session ────────────────────────────────────────────────────────────────
  getSession() {
    if (typeof Auth !== 'undefined' && typeof Auth.getSession === 'function') {
      const s = Auth.getSession();
      if (s) return s;
    }
    try {
      return JSON.parse(localStorage.getItem('gmcp_auth_session_v2')) || JSON.parse(localStorage.getItem('gmcp_session')) || null;
    } catch {
      return null;
    }
  },
  setSession(data) {
    if (typeof Auth !== 'undefined' && typeof Auth.setSession === 'function') {
      Auth.setSession(data);
    }
    localStorage.setItem('gmcp_auth_session_v2', JSON.stringify(data));
    localStorage.setItem('gmcp_session', JSON.stringify(data));
  },
  clearSession() {
    if (typeof Auth !== 'undefined' && typeof Auth.clearSession === 'function') {
      Auth.clearSession();
    }
    localStorage.removeItem('gmcp_auth_session_v2');
    localStorage.removeItem('gmcp_session');
  },

  // ── Employees ──────────────────────────────────────────────────────────────
  getEmployees(activeOnly = false) {
    if (typeof DB !== 'undefined') {
      const session = this.getSession();
      const storeId = (session && session.role === 'STORE_MANAGER') ? session.storeId : this.currentStoreId;
      return DB.getEmployees(storeId, activeOnly);
    }
    return [];
  },
  getEmployee(id) {
    return (typeof DB !== 'undefined') ? DB.getEmployee(id) : null;
  },
  getEmployeeByUsername(username) {
    return (typeof DB !== 'undefined') ? DB.getEmployeeByUsername(username) : null;
  },
  saveEmployee(data) {
    return (typeof DB !== 'undefined') ? DB.saveEmployee(data) : data;
  },
  deleteEmployee(id) {
    if (typeof DB !== 'undefined') DB.deleteEmployee(id);
  },

  // ── Shifts ─────────────────────────────────────────────────────────────────
  getShifts() {
    if (typeof DB !== 'undefined') {
      const session = this.getSession();
      const storeId = (session && session.role === 'STORE_MANAGER') ? session.storeId : this.currentStoreId;
      return DB.getShifts(storeId);
    }
    return [];
  },
  getShift(id) {
    return (typeof DB !== 'undefined') ? DB.getShift(id) : null;
  },
  saveShift(data) {
    return (typeof DB !== 'undefined') ? DB.saveShift(data) : data;
  },
  deleteShift(id) {
    // Delete shift logic
    const list = this.getShifts().filter(s => s.id !== id);
    if (typeof DB !== 'undefined') DB.set(DB_KEYS.SHIFTS, list);
  },

  // ── Attendance ─────────────────────────────────────────────────────────────
  getAttendance() {
    if (typeof DB !== 'undefined') {
      const session = this.getSession();
      const storeId = (session && session.role === 'STORE_MANAGER') ? session.storeId : this.currentStoreId;
      return DB.getAttendance(storeId);
    }
    return [];
  },
  getAttendanceByDate(date) {
    if (typeof DB !== 'undefined') {
      const session = this.getSession();
      const storeId = (session && session.role === 'STORE_MANAGER') ? session.storeId : this.currentStoreId;
      return DB.getAttendance(storeId, date);
    }
    return [];
  },
  getAttendanceByEmployee(employeeId, month = null) {
    return (typeof DB !== 'undefined') ? DB.getAttendanceByEmployee(employeeId, month) : [];
  },
  getAttendanceByMonth(month) {
    return this.getAttendance().filter(a => a.date.startsWith(month));
  },
  getTodayRecord(employeeId) {
    return (typeof DB !== 'undefined') ? DB.getTodayRecord(employeeId) : null;
  },
  saveAttendance(data) {
    return (typeof DB !== 'undefined') ? DB.saveAttendance(data) : data;
  },
  deleteAttendance(id) {
    const list = this.getAttendance().filter(a => a.id !== id);
    if (typeof DB !== 'undefined') DB.set(DB_KEYS.ATTENDANCE, list);
  },

  // ── Payroll ────────────────────────────────────────────────────────────────
  getPayrolls() {
    if (typeof DB !== 'undefined') {
      const session = this.getSession();
      const storeId = (session && session.role === 'STORE_MANAGER') ? session.storeId : this.currentStoreId;
      return DB.getPayrolls(storeId);
    }
    return [];
  },
  getPayroll(employeeId, month) {
    return (typeof DB !== 'undefined') ? DB.getPayroll(employeeId, month) : null;
  },
  getPayrollsByMonth(month) {
    return this.getPayrolls().filter(p => p.month === month);
  },
  savePayroll(data) {
    return (typeof DB !== 'undefined') ? DB.savePayroll(data) : data;
  },
  deletePayroll(id) {
    const list = this.getPayrolls().filter(p => p.id !== id);
    if (typeof DB !== 'undefined') DB.set(DB_KEYS.PAYROLL, list);
  },

  // ── Advances (Deprecated - Feature Removed) ───────────────────────────────
  getAdvances() { return []; },
  getAdvancesByEmployee() { return []; },
  getAdvancesByMonth() { return []; },
  getPendingAdvances() { return []; },
  saveAdvance(data) { return { ok: true, data }; },

  // ── Holidays ───────────────────────────────────────────────────────────────
  getHolidays() {
    return (typeof DB !== 'undefined') ? (DB.get(DB_KEYS.HOLIDAYS) || []) : [];
  },
  getHoliday(date) {
    return this.getHolidays().find(h => h.date === date) || null;
  },
  saveHoliday(data) {
    const list = this.getHolidays();
    const idx = list.findIndex(h => h.id === data.id);
    if (idx >= 0) list[idx] = data;
    else list.push(data);
    if (typeof DB !== 'undefined') DB.set(DB_KEYS.HOLIDAYS, list);
    return data;
  },
  deleteHoliday(id) {
    const list = this.getHolidays().filter(h => h.id !== id);
    if (typeof DB !== 'undefined') DB.set(DB_KEYS.HOLIDAYS, list);
  },

  // ── Contracts ──────────────────────────────────────────────────────────────
  getContracts() {
    if (typeof DB !== 'undefined') {
      const session = this.getSession();
      const storeId = (session && session.role === 'STORE_MANAGER') ? session.storeId : this.currentStoreId;
      return DB.getContracts(storeId);
    }
    return [];
  },
  getContract(employeeId, type = 'probation') {
    return (typeof DB !== 'undefined') ? DB.getContract(employeeId, type) : null;
  },
  saveContract(data) {
    return (typeof DB !== 'undefined') ? DB.saveContract(data) : data;
  },

  // ── Stores ─────────────────────────────────────────────────────────────────
  // ── Stores ─────────────────────────────────────────────────────────────────
  getStores(activeOnly = false) {
    return (typeof DB !== 'undefined') ? DB.getStores(activeOnly) : [];
  },
  getStore(id) {
    return (typeof DB !== 'undefined') ? DB.getStore(id) : null;
  },
  saveStore(data) {
    return (typeof DB !== 'undefined') ? DB.saveStore(data) : data;
  },

  // ── Initialization ─────────────────────────────────────────────────────────
  isInitialized() {
    return !!localStorage.getItem('gmcp_initialized');
  },
  markInitialized() {
    localStorage.setItem('gmcp_initialized', '1');
  },
  clearAll() {
    localStorage.clear();
  }
};
