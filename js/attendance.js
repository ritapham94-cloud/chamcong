// ── Attendance Logic ──────────────────────────────────────────────────────────

const Attendance = {

  // ── WiFi Verification ──────────────────────────────────────────────────────
  async verifyWifi(employeeId = null) {
    const settings = Storage.getSettings();
    let wifiCfg = settings.wifiCheck;

    if (employeeId) {
      const emp = Storage.getEmployee(employeeId);
      const storeId = emp ? (emp.store_id || emp.storeId) : 'store-1';
      const store = Storage.getStore(storeId);
      if (store && store.wifiEnabled !== undefined && store.wifiEnabled !== null) {
        wifiCfg = {
          enabled: store.wifiEnabled,
          allowedIP: store.allowedIP,
          wifiName: store.wifiName
        };
      }
    }

    // If not configured or disabled → allow
    if (!wifiCfg || !wifiCfg.enabled || !wifiCfg.allowedIP) {
      return { ok: true, skipped: true };
    }

    try {
      // Try fetching public IP (timeout 6s)
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const resp = await fetch('https://api.ipify.org?format=json', { signal: ctrl.signal });
      clearTimeout(timer);
      const { ip } = await resp.json();

      if (ip === wifiCfg.allowedIP) {
        return { ok: true, ip };
      } else {
        return {
          ok: false,
          ip,
          message: `Bạn chưa kết nối WiFi của quán!\n\nIP hiện tại: ${ip}\nIP cho phép: ${wifiCfg.allowedIP}\n\nVui lòng kết nối WiFi "${wifiCfg.wifiName || 'của quán'}" rồi thử lại.`
        };
      }
    } catch (err) {
      // Network error or abort
      return {
        ok: false,
        ip: null,
        message: 'Không thể xác minh WiFi. Hãy chắc chắn bạn đang kết nối mạng và thử lại.'
      };
    }
  },

  // Fetch current public IP only (for admin setup)
  async fetchPublicIP() {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 6000);
      const resp = await fetch('https://api.ipify.org?format=json', { signal: ctrl.signal });
      const { ip } = await resp.json();
      return ip;
    } catch {
      // Fallback to api.ip.sb
      try {
        const resp2 = await fetch('https://api.ip.sb/ip', { cache: 'no-store' });
        return (await resp2.text()).trim();
      } catch {
        return null;
      }
    }
  },

  // ── GPS Geofencing Verification ──────────────────────────────────────────
  getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  async verifyGps(employeeId) {
    const emp = Storage.getEmployee(employeeId);
    const storeId = emp ? (emp.store_id || emp.storeId) : 'store-1';
    const store = Storage.getStore(storeId);

    // If store not configured or GPS not enabled → allow (skipped)
    if (!store || !store.gpsEnabled || !store.lat || !store.lng) {
      return { ok: true, skipped: true, storeName: store ? store.name : '' };
    }

    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return resolve({
          ok: false,
          message: 'Trình duyệt thiết bị của bạn không hỗ trợ định vị vị trí GPS!'
        });
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const currentLat = pos.coords.latitude;
          const currentLng = pos.coords.longitude;
          const targetLat = Number(store.lat);
          const targetLng = Number(store.lng);
          const allowedRadius = Number(store.radiusMeters) || 100;

          const distance = Attendance.getHaversineDistance(currentLat, currentLng, targetLat, targetLng);

          if (distance <= allowedRadius) {
            resolve({
              ok: true,
              distance,
              allowedRadius,
              currentLat,
              currentLng,
              storeName: store.name,
              message: `Vị trí GPS hợp lệ (${distance}m <= ${allowedRadius}m)`
            });
          } else {
            resolve({
              ok: false,
              distance,
              allowedRadius,
              currentLat,
              currentLng,
              storeName: store.name,
              message: `Từ chối chấm công!\nBạn đang ở cách cơ sở "${store.name}" khoảng ${distance}m (Bán kính cho phép tối đa ${allowedRadius}m).`
            });
          }
        },
        (err) => {
          let msg = 'Không thể lấy vị trí GPS từ điện thoại.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Vui lòng bật vị trí (GPS) trên điện thoại và cho phép truy cập vị trí để chấm công!';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Tín hiệu GPS chưa sẵn sàng. Vui lòng thử lại!';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Quá thời gian chờ định vị GPS. Vui lòng thử lại!';
          }
          resolve({ ok: false, message: msg });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },


  // ── Check In ───────────────────────────────────────────────────────────────
  checkIn(employeeId, shiftId = null) {
    const today = Utils.today();
    const existing = Storage.getTodayRecord(employeeId);
    if (existing && existing.checkIn) {
      return { ok: false, message: 'Bạn đã chấm công vào hôm nay rồi!' };
    }

    const now = Utils.nowTime();
    const shift = shiftId ? Storage.getShift(shiftId) : this.getDefaultShift(employeeId);
    const holiday = Storage.getHoliday(today);
    const lateMinutes = shift ? Math.max(0, Utils.minutesDiff(shift.startTime, now)) : 0;
    const policy = Storage.getSettings().latePolicy;
    const isLateViolation = lateMinutes >= policy.minLateMinutes;

    const record = {
      id: existing ? existing.id : Utils.uuid(),
      employeeId,
      date: today,
      shiftId: shift ? shift.id : null,
      checkIn: now,
      checkOut: null,
      lateMinutes,
      earlyLeaveMinutes: 0,
      isLateViolation,
      isEarlyViolation: false,
      isHoliday: !!holiday,
      holidayMultiplier: holiday ? holiday.multiplier : 1.0,
      workHours: 0,
      note: '',
      editedBy: null,
      editedAt: null,
      createdAt: new Date().toISOString(),
    };

    Storage.saveAttendance(record);
    return {
      ok: true,
      record,
      lateMinutes,
      isLateViolation,
      message: lateMinutes > 0
        ? `Chấm công vào lúc ${now} — Đi muộn ${lateMinutes} phút${isLateViolation ? ' ⚠️' : ''}`
        : `Chấm công vào lúc ${now} ✓`
    };
  },

  // Check out
  checkOut(employeeId) {
    const today = Utils.today();
    const record = Storage.getTodayRecord(employeeId);
    if (!record || !record.checkIn) {
      return { ok: false, message: 'Bạn chưa chấm công vào!' };
    }
    if (record.checkOut) {
      return { ok: false, message: 'Bạn đã chấm công ra rồi!' };
    }

    const now = Utils.nowTime();
    const shift = record.shiftId ? Storage.getShift(record.shiftId) : null;
    const earlyLeaveMinutes = shift
      ? Math.max(0, Utils.minutesDiff(now, shift.endTime))
      : 0;
    const policy = Storage.getSettings().latePolicy;
    const isEarlyViolation = earlyLeaveMinutes >= policy.minLateMinutes;
    const workHours = Utils.workHours(record.checkIn, now);

    record.checkOut = now;
    record.earlyLeaveMinutes = earlyLeaveMinutes;
    record.isEarlyViolation = isEarlyViolation;
    record.workHours = workHours;

    Storage.saveAttendance(record);
    return {
      ok: true,
      record,
      earlyLeaveMinutes,
      workHours,
      message: earlyLeaveMinutes > 0
        ? `Chấm công ra lúc ${now} — Về sớm ${earlyLeaveMinutes} phút${isEarlyViolation ? ' ⚠️' : ''}`
        : `Chấm công ra lúc ${now} — Đã làm ${workHours}h ✓`
    };
  },

  // Admin: add/edit record manually
  saveManual(data) {
    const { employeeId, date, shiftId, checkIn, checkOut, note, editedBy } = data;
    const shift = shiftId ? Storage.getShift(shiftId) : null;
    const holiday = Storage.getHoliday(date);
    const lateMinutes = (shift && checkIn) ? Math.max(0, Utils.minutesDiff(shift.startTime, checkIn)) : 0;
    const earlyLeaveMinutes = (shift && checkOut) ? Math.max(0, Utils.minutesDiff(checkOut, shift.endTime)) : 0;
    const policy = Storage.getSettings().latePolicy;

    const existing = Storage.getAttendance().find(a => a.employeeId === employeeId && a.date === date);

    const record = {
      id: existing ? existing.id : (data.id || Utils.uuid()),
      employeeId,
      date,
      shiftId: shiftId || null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      lateMinutes,
      earlyLeaveMinutes,
      isLateViolation: lateMinutes >= policy.minLateMinutes,
      isEarlyViolation: earlyLeaveMinutes >= policy.minLateMinutes,
      isHoliday: !!holiday,
      holidayMultiplier: holiday ? holiday.multiplier : 1.0,
      workHours: (checkIn && checkOut) ? Utils.workHours(checkIn, checkOut) : 0,
      note: note || '',
      editedBy: editedBy || null,
      editedAt: new Date().toISOString(),
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };

    Storage.saveAttendance(record);
    return { ok: true, record };
  },

  // Get monthly summary for one employee
  getMonthlySummary(employeeId, month) {
    const records = Storage.getAttendanceByEmployee(employeeId, month);
    const policy = Storage.getSettings().latePolicy;

    let workDays = 0;
    let totalWorkHours = 0;
    let totalShifts = 0;
    let lateCount = 0;       // Total late/early violations
    let lateViolationCount = 0; // Violations ABOVE free passes → triggers deduction
    let holidayWorkHours = 0;

    records.forEach(r => {
      if (r.checkIn) {
        workDays++;
        totalWorkHours += r.workHours || 0;
        if (r.shiftId) totalShifts++;
        if (r.isLateViolation) lateCount++;
        if (r.isEarlyViolation) lateCount++;
      }
      if (r.isHoliday && r.workHours) {
        holidayWorkHours += r.workHours;
      }
    });

    lateViolationCount = Math.max(0, lateCount - policy.freePassesPerMonth);
    const lateDeduction = lateViolationCount * policy.deductionPerOccurrence;

    return {
      workDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      totalShifts,
      lateCount,
      lateViolationCount,
      lateDeduction,
      holidayWorkHours,
      records,
    };
  },

  // Get default shift for employee (first assigned shift)
  getDefaultShift(employeeId) {
    const emp = Storage.getEmployee(employeeId);
    if (!emp || !emp.shiftIds || !emp.shiftIds.length) return null;
    return Storage.getShift(emp.shiftIds[0]);
  },

  // Today's attendance summary for all employees (for dashboard)
  getTodaySummary() {
    const today = Utils.today();
    const employees = Storage.getEmployees(true).filter(e => e.role === 'employee');
    const todayRecords = Storage.getAttendanceByDate(today);
    const policy = Storage.getSettings().latePolicy;

    let working = 0, checked_out = 0, absent = 0, late = 0;

    employees.forEach(emp => {
      const rec = todayRecords.find(r => r.employeeId === emp.id);
      if (!rec || !rec.checkIn) { absent++; return; }
      if (rec.checkOut) { checked_out++; }
      else { working++; }
      if (rec.isLateViolation) late++;
    });

    return { total: employees.length, working, checked_out, absent, late };
  }
};
