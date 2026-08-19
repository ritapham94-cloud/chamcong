// ── Utility Functions ────────────────────────────────────────────────────────

const Utils = {
  // UUID
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  // Format currency VND
  currency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  },

  // Format date
  formatDate(dateStr, format = 'dd/mm/yyyy') {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
    if (format === 'dd/mm/yyyy') return `${dd}/${mm}/${yyyy}`;
    if (format === 'yyyy-mm-dd') return `${yyyy}-${mm}-${dd}`;
    if (format === 'dd/mm') return `${dd}/${mm}`;
    if (format === 'full') return `${days[d.getDay()]}, ${dd}/${mm}/${yyyy}`;
    if (format === 'month') return `Tháng ${mm}/${yyyy}`;
    return `${dd}/${mm}/${yyyy}`;
  },

  // Format time HH:MM
  formatTime(timeStr) {
    if (!timeStr) return '--:--';
    return timeStr.substring(0, 5);
  },

  // Today date string
  today() {
    return new Date().toISOString().split('T')[0];
  },

  // Current time HH:MM
  nowTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  },

  // Current month string YYYY-MM
  currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  },

  // Next month string YYYY-MM (For auto advance salary deduction next month)
  nextMonth() {
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
    return `${year}-${String(month).padStart(2, '0')}`;
  },

  // Diff in minutes between two HH:MM strings
  minutesDiff(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  },

  // Work hours between two HH:MM strings
  workHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const mins = this.minutesDiff(checkIn, checkOut);
    return Math.max(0, Math.round(mins / 60 * 100) / 100);
  },

  // Days in month
  daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  },

  // Get year and month from YYYY-MM string
  parseMonth(monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    return { year, month };
  },

  // Initials from name
  initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  // Truncate string
  truncate(str, len = 30) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  },

  // Number input formatting
  parseNumber(val) {
    return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
  },

  // Contract type label
  contractLabel(type) {
    const labels = { hourly: 'Theo giờ', shift: 'Theo ca', fixed: 'Cố định (tháng)' };
    return labels[type] || (type && type !== 'undefined' ? type : 'Theo ca');
  },

  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
};

// ── Toast Notifications ──────────────────────────────────────────────────────

const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 3500) {
    this.init();
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); }
};

// ── Modal Helpers ─────────────────────────────────────────────────────────────

const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('show'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('show'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.show').forEach(el => {
      el.classList.remove('show');
    });
    document.body.style.overflow = '';
  }
};

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
  if (e.target.classList.contains('modal-close')) {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay) { overlay.classList.remove('show'); document.body.style.overflow = ''; }
  }
});

// ── Sidebar Navigation ────────────────────────────────────────────────────────

function initSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // Set active nav item
  const current = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && (href === current || current.includes(href.replace('.html', '')))) {
      item.classList.add('active');
    }
  });
}

// ── Clock ─────────────────────────────────────────────────────────────────────

function startClock(elementId, dateId) {
  const update = () => {
    const now = new Date();
    const el = document.getElementById(elementId);
    const del = document.getElementById(dateId);
    if (el) {
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      el.textContent = `${hh}:${mm}:${ss}`;
    }
    if (del) {
      del.textContent = Utils.formatDate(Utils.today(), 'full');
    }
  };
  update();
  return setInterval(update, 1000);
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function confirm(message, title = 'Xác nhận') {
  return new Promise(resolve => {
    let overlay = document.getElementById('confirmOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirmOverlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:400px">
          <div class="modal-header">
            <h3 class="modal-title" id="confirmTitle"></h3>
          </div>
          <p id="confirmMessage" style="color:var(--text-secondary);font-size:14px;margin-bottom:0"></p>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirmCancel">Huỷ</button>
            <button class="btn btn-danger" id="confirmOk">Xác nhận</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    overlay.classList.add('show');
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    const cleanup = (result) => {
      overlay.classList.remove('show');
      ok.replaceWith(ok.cloneNode(true));
      cancel.replaceWith(cancel.cloneNode(true));
      resolve(result);
    };
    document.getElementById('confirmOk').onclick = () => cleanup(true);
    document.getElementById('confirmCancel').onclick = () => cleanup(false);
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
  });
}

// ── Page guard (See Auth Guard Helpers below) ─────────────────────────────────

// ── Header Store Selector & Realtime Notifications UI ────────────────────────

function initHeaderStoreAndNotifications(onStoreChangeCallback) {
  const session = (typeof Auth !== 'undefined' && typeof Auth.getSession === 'function')
    ? Auth.getSession()
    : Storage.getSession();

  if (!session) return;

  const headerActions = document.querySelector('.header-actions');
  if (!headerActions) return;

  // 1. Render Store Selector for Admins
  if (session.role === 'SUPER_ADMIN' || session.role === 'STORE_MANAGER') {
    let storeSel = document.getElementById('globalStoreSelector');
    if (!storeSel) {
      const container = document.createElement('div');
      container.className = 'store-select-wrap';
      container.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-right:10px;';

      container.innerHTML = `
        <span style="font-size:13px;color:var(--text-muted);font-weight:600;"><i class="fas fa-store"></i> Quán:</span>
        <select id="globalStoreSelector" class="form-control" style="width:220px;font-size:13px;padding:6px 10px;border-color:var(--accent);">
        </select>
      `;
      headerActions.insertBefore(container, headerActions.firstChild);
      storeSel = document.getElementById('globalStoreSelector');
    }
    if (typeof DB !== 'undefined' && typeof DB.initSupabaseRealtime === 'function') {
      DB.initSupabaseRealtime(session);
    }

    const stores = Storage.getStores(true);
    storeSel.innerHTML = '';

    if (session.role === 'SUPER_ADMIN') {
      storeSel.innerHTML += `<option value="all">🌐 Tất cả ${stores.length} cơ sở (Tổng)</option>`;
      stores.forEach(s => {
        storeSel.innerHTML += `<option value="${s.id}">${s.code} - ${s.name}</option>`;
      });
    } else {
      // Store Manager: restrict to assigned store
      const myStore = stores.find(s => s.id === session.storeId) || stores[0];
      if (myStore) {
        storeSel.innerHTML = `<option value="${myStore.id}">${myStore.code} - ${myStore.name}</option>`;
      }
    }

    storeSel.value = Storage.currentStoreId || (session.role === 'SUPER_ADMIN' ? 'all' : session.storeId);

    storeSel.onchange = (e) => {
      Storage.setStoreFilter(e.target.value);
      Toast.info(`Đã chuyển sang xem dữ liệu: ${e.target.options[e.target.selectedIndex].text}`);
      if (typeof onStoreChangeCallback === 'function') {
        onStoreChangeCallback(e.target.value);
      } else if (typeof initPage === 'function') {
        initPage();
      }
    };
  }

  // 2. Render Realtime Notification Bell
  let bellWrap = document.getElementById('notifBellWrap');
  if (!bellWrap) {
    bellWrap = document.createElement('div');
    bellWrap.id = 'notifBellWrap';
    bellWrap.style.cssText = 'position:relative;display:inline-block;margin-right:10px;';
    bellWrap.innerHTML = `
      <button id="notifBellBtn" class="btn btn-secondary btn-icon" style="position:relative;border-radius:50%;width:38px;height:38px;padding:0;display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-bell" style="font-size:16px;"></i>
        <span id="notifBadge" class="nav-badge" style="position:absolute;top:-4px;right:-4px;display:none;background:var(--danger);color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;font-weight:700;">0</span>
      </button>
      <div id="notifDropdown" class="card" style="display:none;position:absolute;right:0;top:46px;width:320px;max-height:400px;overflow-y:auto;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.5);padding:12px;border:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px;">
          <strong style="font-size:13.5px;"><i class="fas fa-bell" style="color:var(--accent);"></i> Thông báo mới</strong>
          <a href="#" onclick="DB.markAllNotificationsRead();updateNotifUI();return false;" style="font-size:11px;color:var(--info);">Đã đọc tất cả</a>
        </div>
        <div id="notifList" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    `;
    headerActions.insertBefore(bellWrap, headerActions.firstChild);

    document.getElementById('notifBellBtn').onclick = (e) => {
      e.stopPropagation();
      const dd = document.getElementById('notifDropdown');
      const isShowing = dd.style.display === 'block';
      dd.style.display = isShowing ? 'none' : 'block';
      if (!isShowing) updateNotifUI();
    };

    document.addEventListener('click', (e) => {
      const dd = document.getElementById('notifDropdown');
      if (dd && !bellWrap.contains(e.target)) dd.style.display = 'none';
    });
  }

  updateNotifUI();

  // 3. Listen to Realtime Notification events
  if (!window.hasRegisteredNotifListener) {
    window.hasRegisteredNotifListener = true;
    window.addEventListener('gmcp_realtime_notification', (e) => {
      const notif = e.detail;
      if (!notif) return;

      // Realtime Toast alert for Admin/Manager
      if (session.role === 'SUPER_ADMIN' || session.role === 'STORE_MANAGER') {
        Toast.info(`🔔 ${notif.title}: ${notif.content}`);

        // Audio chime alert
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.5);
        } catch (err) {}

        updateNotifUI();

        // Refresh Pending Hub on Dashboard if active
        if (typeof renderPendingApprovalsHub === 'function') {
          renderPendingApprovalsHub();
        }
        if (typeof initPage === 'function' && window.location.pathname.includes('dashboard')) {
          initPage();
        }
      }
    });

    window.addEventListener('gmcp_db_update', () => {
      updateNotifUI();
    });
  }
}

function updateNotifUI() {
  const session = (typeof Auth !== 'undefined' && typeof Auth.getSession === 'function')
    ? Auth.getSession()
    : Storage.getSession();

  if (!session || typeof DB === 'undefined') return;

  const notifs = DB.getNotifications(Storage.currentStoreId, session.role);
  const unreadCount = notifs.filter(n => !n.isRead).length;

  const badge = document.getElementById('notifBadge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  const list = document.getElementById('notifList');
  if (list) {
    if (notifs.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px;">Không có thông báo nào</div>`;
    } else {
      list.innerHTML = notifs.slice(0, 10).map(n => `
        <div style="padding:8px 10px;border-radius:6px;background:${n.isRead ? 'transparent' : 'rgba(249,115,22,0.1)'};border-left:3px solid ${n.isRead ? 'var(--border)' : 'var(--accent)'};cursor:pointer;font-size:12px;"
             onclick="DB.markNotificationRead('${n.id}');updateNotifUI();if('${n.link}' !== '#') window.location.href='${n.link}';">
          <div style="font-weight:700;color:var(--text-primary);display:flex;justify-content:space-between;">
            <span>${n.title}</span>
            <small style="color:var(--text-muted);font-weight:normal;">${Utils.formatDate(n.createdAt.split('T')[0])}</small>
          </div>
          <div style="color:var(--text-secondary);margin-top:2px;">${n.content}</div>
        </div>
      `).join('');
    }
  }
}

// ── Auth Guard Helpers (URL Access Protection) ─────────────────────────────

function requireAuth(allowedRoles = ['SUPER_ADMIN', 'STORE_MANAGER', 'EMPLOYEE']) {
  const session = (typeof Auth !== 'undefined' && typeof Auth.getSession === 'function')
    ? Auth.getSession()
    : (typeof Storage !== 'undefined' ? Storage.getSession() : null);

  // Rule 1: Not logged in -> redirect to login page index.html
  if (!session) {
    if (typeof Toast !== 'undefined') Toast.warning('Vui lòng đăng nhập để tiếp tục');
    window.location.href = 'index.html';
    return null;
  }

  // Rule 2 & 3: Role check normalized
  const role = (typeof Auth !== 'undefined' && typeof Auth.normalizeRole === 'function')
    ? Auth.normalizeRole(session.role)
    : String(session.role || 'EMPLOYEE').toUpperCase();

  const normalizedAllowed = allowedRoles.map(r => 
    (typeof Auth !== 'undefined' && typeof Auth.normalizeRole === 'function') ? Auth.normalizeRole(r) : String(r).toUpperCase()
  );

  // Rule 4: Authenticated user accessing unauthorized page -> redirect safely to attendance.html (NEVER logout / NEVER index.html)
  if (!normalizedAllowed.includes(role)) {
    if (typeof Toast !== 'undefined') Toast.error('Bạn không có quyền truy cập trang này');
    window.location.href = 'attendance.html';
    return null;
  }

  return session;
}

function requireAdmin() {
  return requireAuth(['SUPER_ADMIN', 'STORE_MANAGER']);
}

