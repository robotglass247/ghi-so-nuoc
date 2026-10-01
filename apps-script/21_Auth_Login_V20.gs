/**
 * M&E WATER V20 - AUTH LOGIN
 * Chọn Họ và tên + nhập Mật khẩu.
 * Không trả mật khẩu xuống trình duyệt.
 *
 * Cột NHAN_SU_THUC_HIEN:
 * A Mã nhân sự | B Họ tên | F Tình trạng | G Phân quyền | H Mật khẩu
 */

const WATER_AUTH_V20_SESSION_MS = 8 * 60 * 60 * 1000;

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
    !staff.matKhau ||
    !waterAuthSafeEqualV20_(staff.matKhau, password)
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
  const token = waterAuthCreateTokenV20_(projectId, staff.ma, expiresAt);

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
    String(staff.trangThai || '').trim().toLowerCase() !== 'đang làm việc'
  ) {
    return waterAuthHtmlV20_({
      type: 'WATER_AUTH_SESSION_RESULT',
      requestId: requestId,
      ok: false,
      error: 'Tài khoản nhân viên không còn hoạt động.'
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

function waterAuthCreateTokenV20_(projectId, staffCode, expiresAt) {
  const payload = JSON.stringify({
    p: String(projectId || '').trim().toUpperCase(),
    s: String(staffCode || '').trim().toUpperCase(),
    e: Number(expiresAt || 0)
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

    if (
      !projectId ||
      !staffCode ||
      !expiresAt ||
      projectId !== String(expectedProjectId || '').trim().toUpperCase() ||
      Date.now() >= expiresAt
    ) {
      return {ok: false};
    }

    return {
      ok: true,
      projectId: projectId,
      staffCode: staffCode,
      expiresAt: expiresAt
    };
  } catch (err) {
    return {ok: false};
  }
}

function waterAuthSignV20_(text) {
  const secret = PropertiesService
    .getScriptProperties()
    .getProperty('WATER_WEBAPP_SECRET');

  if (!secret) {
    throw new Error('Thiếu WATER_WEBAPP_SECRET.');
  }

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
