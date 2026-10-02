/**
 * M&E WATER V20 - API SESSION GUARD
 * Dùng sessionToken đã ký bởi 21_Auth_Login_V20.gs để bảo vệ API dự án.
 * Module này KHÔNG tự thay doPost/doGet. Cần gắn chốt guard ở router trung tâm.
 */

function waterAuthRequireSessionV20_(p) {
  const projectId = waterProjectFromParams_(p);
  const token = String(
    p && (p.sessionToken || p.authToken) ? (p.sessionToken || p.authToken) : ''
  ).trim();

  if (!projectId) {
    return { ok: false, code: 'NO_PROJECT', error: 'Thiếu PROJECT_ID.' };
  }

  if (!token) {
    return { ok: false, code: 'NO_SESSION', error: 'Chưa đăng nhập hoặc thiếu session token.' };
  }

  if (typeof waterAuthVerifyTokenV20_ !== 'function') {
    return { ok: false, code: 'AUTH_HELPER_MISSING', error: 'Thiếu hàm xác thực token.' };
  }

  const verified = waterAuthVerifyTokenV20_(token, projectId);
  if (!verified || !verified.ok) {
    return { ok: false, code: 'INVALID_SESSION', error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' };
  }

  const ss = waterOpenProject_(projectId);
  const staff = waterAuthGuardFindStaffV20_(ss, verified.staffCode);

  if (!staff || String(staff.trangThai || '').trim().toLowerCase() !== 'đang làm việc') {
    return { ok: false, code: 'STAFF_INACTIVE', error: 'Nhân sự không còn hoạt động.' };
  }

  return {
    ok: true,
    projectId: projectId,
    staffCode: staff.ma,
    staffName: staff.ten,
    role: staff.quyen,
    expiresAt: verified.expiresAt,
    staff: staff
  };
}

function waterAuthGuardFindStaffV20_(ss, staffCode) {
  if (typeof waterAuthFindStaffV20_ === 'function') {
    return waterAuthFindStaffV20_(ss, staffCode);
  }

  const code = String(staffCode || '').trim().toUpperCase();
  const sh = ss && ss.getSheetByName('NHAN_SU_THUC_HIEN');
  if (!code || !sh || sh.getLastRow() < 5) return null;

  const data = sh.getRange(5, 1, sh.getLastRow() - 4, 8).getDisplayValues();
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const ma = String(r[0] || '').trim().toUpperCase();
    if (ma !== code) continue;
    return {
      row: i + 5,
      ma: ma,
      ten: String(r[1] || '').trim(),
      email: String(r[4] || '').trim(),
      trangThai: String(r[5] || '').trim(),
      quyen: String(r[6] || '').trim()
    };
  }
  return null;
}

function waterAuthGuardIsPublicApiV20_(api) {
  const x = String(api || '').trim().toLowerCase();
  return [
    'authstaff',
    'login',
    'sessioncheck',
    'changepassword',
    'staff',
    'staffframe'
  ].indexOf(x) >= 0;
}

function waterAuthGuardPostV20_(p) {
  const api = String(p && p.api ? p.api : '').trim().toLowerCase();
  if (waterAuthGuardIsPublicApiV20_(api)) {
    return { ok: true, publicApi: true };
  }
  return waterAuthRequireSessionV20_(p);
}

function waterAuthGuardGetV20_(p) {
  const api = String(p && p.api ? p.api : '').trim().toLowerCase();
  if (waterAuthGuardIsPublicApiV20_(api)) {
    return { ok: true, publicApi: true };
  }

  // Mở trực tiếp Web App không có api: giữ trang dự phòng cũ.
  if (!api) {
    return { ok: true, publicApi: true };
  }

  return waterAuthRequireSessionV20_(p);
}

function waterAuthGuardHtmlV20_(p, guard) {
  const requestId = String(p && p.requestId ? p.requestId : '').trim();
  const obj = {
    type: 'WATER_AUTH_REQUIRED',
    requestId: requestId,
    ok: false,
    code: guard && guard.code ? guard.code : 'AUTH_REQUIRED',
    error: guard && guard.error ? guard.error : 'Yêu cầu đăng nhập.'
  };

  if (typeof waterAuthHtmlV20_ === 'function') {
    return waterAuthHtmlV20_(obj);
  }

  return waterAuthGuardIframeOutputV20_(obj);
}

function waterAuthGuardGetResponseV20_(p, guard) {
  const callbackRaw = String(p && p.callback ? p.callback : '').trim();
  const callback = /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callbackRaw)
    ? callbackRaw
    : '';

  const obj = {
    ok: false,
    authRequired: true,
    code: guard && guard.code ? guard.code : 'AUTH_REQUIRED',
    error: guard && guard.error ? guard.error : 'Yêu cầu đăng nhập.'
  };

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(obj) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  obj.type = 'WATER_AUTH_REQUIRED';
  return waterAuthGuardIframeOutputV20_(obj);
}

function waterAuthGuardIframeOutputV20_(obj) {
  const payload = JSON.stringify(obj || {})
    .replace(/</g, '\\u003c')
    .replace(/-->/g, '--\\u003e');

  return HtmlService
    .createHtmlOutput(
      '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
      '<script>(function(){var m=' + payload + ';' +
      'try{window.top.postMessage(m,"*");}catch(e){}' +
      'try{window.parent.postMessage(m,"*");}catch(e){}' +
      '})();</script></body></html>'
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function TEST_API_GUARD_NO_TOKEN_AUTO001() {
  const result = waterAuthRequireSessionV20_({ project: 'AUTO001' });
  Logger.log(JSON.stringify(result));
}
