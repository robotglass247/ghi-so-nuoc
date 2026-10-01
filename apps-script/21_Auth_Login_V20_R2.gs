/**
 * M&E WATER V20 - AUTH LOGIN R2
 * Chọn Họ và tên + nhập Mật khẩu.
 * Thêm đổi mật khẩu và tự chuyển mật khẩu rõ sang HMAC256 sau lần đăng nhập đúng.
 * Không trả mật khẩu xuống trình duyệt.
 *
 * Cột NHAN_SU_THUC_HIEN:
 * A Mã nhân sự | B Họ tên | F Tình trạng | G Phân quyền | H Mật khẩu/Hash
 */

const WATER_AUTH_V20_SESSION_MS = 8 * 60 * 60 * 1000;
const WATER_AUTH_V20_HASH_PREFIX = 'HMAC256$';

function waterAuthPostV20_(p) {
  const api = String(p && p.api ? p.api : '').trim().toLowerCase();
  const requestId = String(p && p.requestId ? p.requestId : '').trim();

  if (!/^[A-Za-z0-9_-]{8,120}$/.test(requestId)) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_ERROR',
      requestId: requestId,
      ok: false,
      error: 'Mã yêu cầu đăng nhập không hợp lệ.'
    });
  }

  const projectId = waterProjectFromParams_(p);
  const ss = waterOpenProject_(projectId);

  if (api === 'authstaff') {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_STAFF_RESULT',
      requestId: requestId,
      ok: true,
      projectId: projectId,
      staff: waterAuthActiveStaffV20_(ss)
    });
  }

  if (api === 'login') {
    return waterAuthLoginV20_(ss, projectId, p, requestId);
  }

  if (api === 'sessioncheck') {
    return waterAuthSessionCheckV20_(ss, projectId, p, requestId);
  }

  if (api === 'changepassword') {
    return waterAuthChangePasswordV20_(ss, projectId, p, requestId);
  }

  return waterAuthHtmlV20_({
    type: 'WATER_AUTH_ERROR',
    requestId: requestId,
    ok: false,
    error: 'API đăng nhập không hợp lệ.'
  });
}

function waterAuthActiveStaffV20_(ss) {
  const sh = ss.getSheetByName('NHAN_SU_THUC_HIEN');
  if (!sh || sh.getLastRow() < 5) return [];

  const data = sh
    .getRange(5, 1, sh.getLastRow() - 4, 8)
    .getDisplayValues();

  const out = [];

  data.forEach(function(r) {
    const ma = String(r[0] || '').trim().toUpperCase();
    const ten = String(r[1] || '').trim();
    const trangThai = String(r[5] || '').trim().toLowerCase();

    if (!ma || !ten || trangThai !== 'đang làm việc') return;
    out.push({ma: ma, ten: ten});
  });

  return out;
}

function waterAuthFindStaffV20_(ss, staffCode) {
  const code = String(staffCode || '').trim().toUpperCase();
  const sh = ss.getSheetByName('NHAN_SU_THUC_HIEN');

  if (!code || !sh || sh.getLastRow() < 5) return null;

  const data = sh
    .getRange(5, 1, sh.getLastRow() - 4, 8)
    .getDisplayValues();

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
      quyen: String(r[6] || '').trim(),
      matKhau: String(r[7] || '')
    };
  }

  return null;
}

function waterAuthLoginV20_(ss, projectId, p, requestId) {
  const staffCode = String(p && p.staff ? p.staff : '').trim().toUpperCase();
  const password = String(p && p.password != null ? p.password : '');

  if (!staffCode) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_LOGIN_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Vui lòng chọn Họ và tên.'
    });
  }

  if (!password || password.length > 100) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_LOGIN_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Mật khẩu không hợp lệ.'
    });
  }

  const staff = waterAuthFindStaffV20_(ss, staffCode);

  if (
    !staff ||
    String(staff.trangThai || '').trim().toLowerCase() !== 'đang làm việc' ||
    !waterAuthVerifyPasswordV20_(ss, projectId, staff, password, true)
  ) {
    Utilities.sleep(250);

    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_LOGIN_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Họ và tên hoặc mật khẩu không đúng.'
    });
  }

  const expiresAt = Date.now() + WATER_AUTH_V20_SESSION_MS;
  const passwordVersion = waterAuthPasswordVersionV20_(staff.matKhau);
  const token = waterAuthCreateTokenV20_(projectId, staff.ma, expiresAt, passwordVersion);

  return waterAuthHtmlV20_({
    type: 'WATER_AUTH_LOGIN_RESULT',
    requestId: requestId,
    ok: true,
    projectId: projectId,
    expiresAt: expiresAt,
    sessionToken: token,
    staff: {
      ma: staff.ma,
      ten: staff.ten,
      quyen: staff.quyen
    }
  });
}

function waterAuthSessionCheckV20_(ss, projectId, p, requestId) {
  const token = String(p && p.sessionToken ? p.sessionToken : '').trim();
  const verified = waterAuthVerifyTokenV20_(token, projectId);

  if (!verified.ok) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_SESSION_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Phiên đăng nhập đã hết hạn.'
    });
  }

  const staff = waterAuthFindStaffV20_(ss, verified.staffCode);

  if (
    !staff ||
    String(staff.trangThai || '').trim().toLowerCase() !== 'đang làm việc' ||
    !waterAuthSafeEqualV20_(
      verified.passwordVersion,
      waterAuthPasswordVersionV20_(staff.matKhau)
    )
  ) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_SESSION_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Phiên đăng nhập không còn hiệu lực.'
    });
  }

  return waterAuthHtmlV20_({
    type: 'WATER_AUTH_SESSION_RESULT',
    requestId: requestId,
    ok: true,
    projectId: projectId,
    expiresAt: verified.expiresAt,
    sessionToken: token,
    staff: {
      ma: staff.ma,
      ten: staff.ten,
      quyen: staff.quyen
    }
  });
}

function waterAuthChangePasswordV20_(ss, projectId, p, requestId) {
  const staffCode = String(p && p.staff ? p.staff : '').trim().toUpperCase();
  const currentPassword = String(p && p.currentPassword != null ? p.currentPassword : '');
  const newPassword = String(p && p.newPassword != null ? p.newPassword : '');

  if (!staffCode) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_CHANGE_PASSWORD_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Vui lòng chọn Họ và tên.'
    });
  }

  if (!currentPassword || currentPassword.length > 100) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_CHANGE_PASSWORD_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Mật khẩu hiện tại không hợp lệ.'
    });
  }

  if (newPassword.length < 4 || newPassword.length > 64) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_CHANGE_PASSWORD_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Mật khẩu mới phải từ 4 đến 64 ký tự.'
    });
  }

  if (waterAuthSafeEqualV20_(currentPassword, newPassword)) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_CHANGE_PASSWORD_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Mật khẩu mới phải khác mật khẩu hiện tại.'
    });
  }

  const staff = waterAuthFindStaffV20_(ss, staffCode);

  if (
    !staff ||
    String(staff.trangThai || '').trim().toLowerCase() !== 'đang làm việc' ||
    !waterAuthVerifyPasswordV20_(ss, projectId, staff, currentPassword, false)
  ) {
    Utilities.sleep(250);
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_CHANGE_PASSWORD_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Mật khẩu hiện tại không đúng.'
    });
  }

  const newHash = waterAuthPasswordHashV20_(projectId, staff.ma, newPassword);
  const sh = ss.getSheetByName('NHAN_SU_THUC_HIEN');
  sh.getRange(staff.row, 8).setValue(newHash);
  SpreadsheetApp.flush();

  return waterAuthHtmlV20_({
    type: 'WATER_AUTH_CHANGE_PASSWORD_RESULT',
    requestId: requestId,
    ok: true,
    projectId: projectId,
    staff: {ma: staff.ma, ten: staff.ten},
    message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
  });
}

function waterAuthVerifyPasswordV20_(ss, projectId, staff, password, migratePlain) {
  const stored = String(staff && staff.matKhau != null ? staff.matKhau : '');
  if (!stored) return false;

  if (stored.indexOf(WATER_AUTH_V20_HASH_PREFIX) === 0) {
    return waterAuthSafeEqualV20_(
      stored,
      waterAuthPasswordHashV20_(projectId, staff.ma, password)
    );
  }

  const ok = waterAuthSafeEqualV20_(stored, password);
  if (!ok) return false;

  if (migratePlain) {
    const hashed = waterAuthPasswordHashV20_(projectId, staff.ma, password);
    const sh = ss.getSheetByName('NHAN_SU_THUC_HIEN');
    sh.getRange(staff.row, 8).setValue(hashed);
    SpreadsheetApp.flush();
    staff.matKhau = hashed;
  }

  return true;
}

function waterAuthPasswordHashV20_(projectId, staffCode, password) {
  const secret = PropertiesService
    .getScriptProperties()
    .getProperty('WATER_WEBAPP_SECRET');

  if (!secret) throw new Error('Thiếu WATER_WEBAPP_SECRET.');

  const material = [
    'PWDV2',
    String(projectId || '').trim().toUpperCase(),
    String(staffCode || '').trim().toUpperCase(),
    String(password == null ? '' : password)
  ].join('|');

  const bytes = Utilities.computeHmacSha256Signature(
    material,
    secret,
    Utilities.Charset.UTF_8
  );

  return WATER_AUTH_V20_HASH_PREFIX + Utilities
    .base64EncodeWebSafe(bytes)
    .replace(/=+$/g, '');
}

function waterAuthPasswordVersionV20_(storedPassword) {
  return waterAuthSignV20_('PWDVER|' + String(storedPassword || '')).slice(0, 24);
}

function waterAuthCreateTokenV20_(projectId, staffCode, expiresAt, passwordVersion) {
  const payload = JSON.stringify({
    p: String(projectId || '').trim().toUpperCase(),
    s: String(staffCode || '').trim().toUpperCase(),
    e: Number(expiresAt || 0),
    v: String(passwordVersion || '')
  });

  const body = Utilities
    .base64EncodeWebSafe(payload, Utilities.Charset.UTF_8)
    .replace(/=+$/g, '');

  const signature = waterAuthSignV20_(body);
  return body + '.' + signature;
}

function waterAuthVerifyTokenV20_(token, expectedProjectId) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return {ok: false};

    const body = parts[0];
    const signature = parts[1];

    if (!waterAuthSafeEqualV20_(waterAuthSignV20_(body), signature)) {
      return {ok: false};
    }

    const bytes = Utilities.base64DecodeWebSafe(body);
    const payload = JSON.parse(
      Utilities.newBlob(bytes).getDataAsString('UTF-8')
    );

    const projectId = String(payload.p || '').trim().toUpperCase();
    const staffCode = String(payload.s || '').trim().toUpperCase();
    const expiresAt = Number(payload.e || 0);
    const passwordVersion = String(payload.v || '');

    if (
      !projectId ||
      !staffCode ||
      !expiresAt ||
      !passwordVersion ||
      projectId !== String(expectedProjectId || '').trim().toUpperCase() ||
      Date.now() >= expiresAt
    ) {
      return {ok: false};
    }

    return {
      ok: true,
      projectId: projectId,
      staffCode: staffCode,
      expiresAt: expiresAt,
      passwordVersion: passwordVersion
    };
  } catch (err) {
    return {ok: false};
  }
}

function waterAuthSignV20_(text) {
  const secret = PropertiesService
    .getScriptProperties()
    .getProperty('WATER_WEBAPP_SECRET');

  if (!secret) throw new Error('Thiếu WATER_WEBAPP_SECRET.');

  const bytes = Utilities.computeHmacSha256Signature(
    String(text || ''),
    secret,
    Utilities.Charset.UTF_8
  );

  return Utilities
    .base64EncodeWebSafe(bytes)
    .replace(/=+$/g, '');
}

function waterAuthSafeEqualV20_(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);

  let diff = x.length ^ y.length;
  const maxLen = Math.max(x.length, y.length);

  for (let i = 0; i < maxLen; i++) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }

  return diff === 0;
}

function waterAuthHtmlV20_(obj) {
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

function TEST_AUTH_STAFF_AUTO001() {
  const ss = waterOpenProject_('AUTO001');
  Logger.log(JSON.stringify(waterAuthActiveStaffV20_(ss)));
}

function TEST_AUTH_HASH_HELPER_AUTO001() {
  const ss = waterOpenProject_('AUTO001');
  const list = waterAuthActiveStaffV20_(ss);
  Logger.log('STAFF=' + JSON.stringify(list));
  Logger.log('HASH_HELPER=' + (typeof waterAuthPasswordHashV20_ === 'function' ? 'OK' : 'MISSING'));
}
