// ── Phase 2: Secure Authentication & 3-Tier Role Access Control (SUPER_ADMIN, STORE_MANAGER, EMPLOYEE) ─

const Auth = {
  // Session storage token key
  SESSION_KEY: 'gmcp_auth_session_v2',

  login(username, password) {
    if (typeof DB === 'undefined') {
      return { ok: false, message: 'Database client chưa sẵn sàng' };
    }

    const emp = DB.getEmployeeByUsername(username.trim());
    if (!emp || !emp.active) {
      return { ok: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa' };
    }
    if (emp.password !== password) {
      return { ok: false, message: 'Mật khẩu không đúng' };
    }

    // Standardize & secure role from Database record
    let role = emp.role || 'EMPLOYEE';
    if (username.toLowerCase() === 'admin' || role === 'admin') role = 'SUPER_ADMIN';

    // Generate secure authenticated token
    const token = 'token_' + Utils.uuid() + '_' + Date.now();
    const session = {
      token: token,
      employeeId: emp.id,
      storeId: emp.store_id || emp.storeId || 'store-1',
      name: emp.name,
      username: emp.username,
      role: role,
      loginAt: new Date().toISOString(),
    };

    this.setSession(session);
    console.log(`✓ [Phase 2 Auth] User '${emp.username}' authenticated securely as [${role}] for store [${session.storeId}].`);
    return { ok: true, session };
  },

  logout() {
    this.clearSession();
    window.location.href = 'index.html';
  },

  getSession() {
    try {
      const s = JSON.parse(localStorage.getItem(this.SESSION_KEY));
      if (!s) return null;
      // Standardize legacy role strings
      if (s.role === 'admin') s.role = 'SUPER_ADMIN';
      if (s.role === 'employee') s.role = 'EMPLOYEE';
      return s;
    } catch {
      return null;
    }
  },

  setSession(sessionData) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  // Standardize Role Helpers
  normalizeRole(role) {
    if (!role) return 'EMPLOYEE';
    const r = String(role).toUpperCase();
    if (r === 'ADMIN' || r === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (r === 'STORE_MANAGER' || r === 'MANAGER') return 'STORE_MANAGER';
    return 'EMPLOYEE';
  },

  // Role Security Helpers
  isSuperAdmin(sessionOrRole) {
    const s = typeof sessionOrRole === 'object' ? (sessionOrRole ? sessionOrRole.role : null) : (sessionOrRole || (this.getSession() ? this.getSession().role : null));
    return this.normalizeRole(s) === 'SUPER_ADMIN';
  },

  isStoreManager(sessionOrRole) {
    const s = typeof sessionOrRole === 'object' ? (sessionOrRole ? sessionOrRole.role : null) : (sessionOrRole || (this.getSession() ? this.getSession().role : null));
    return this.normalizeRole(s) === 'STORE_MANAGER';
  },

  isEmployee(sessionOrRole) {
    const s = typeof sessionOrRole === 'object' ? (sessionOrRole ? sessionOrRole.role : null) : (sessionOrRole || (this.getSession() ? this.getSession().role : null));
    return this.normalizeRole(s) === 'EMPLOYEE';
  },

  isAdmin(sessionOrRole) {
    return this.isSuperAdmin(sessionOrRole) || this.isStoreManager(sessionOrRole);
  },

  currentEmployee() {
    const s = this.getSession();
    if (!s) return null;
    return DB.getEmployee(s.employeeId);
  },

  changePassword(employeeId, oldPassword, newPassword) {
    const session = this.getSession();
    if (!session) return { ok: false, message: 'Chưa đăng nhập' };

    // Security check: Only allow self or SUPER_ADMIN
    if (session.role !== 'SUPER_ADMIN' && session.employeeId !== employeeId) {
      return { ok: false, message: 'Lỗi bảo mật (403 Forbidden): Không có quyền đổi mật khẩu người khác' };
    }

    const emp = DB.getEmployee(employeeId);
    if (!emp) return { ok: false, message: 'Nhân viên không tồn tại' };
    if (session.role !== 'SUPER_ADMIN' && emp.password !== oldPassword) {
      return { ok: false, message: 'Mật khẩu hiện tại không đúng' };
    }
    if (newPassword.length < 6) return { ok: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' };

    emp.password = newPassword;
    DB.saveEmployee(emp);
    return { ok: true };
  }
};
