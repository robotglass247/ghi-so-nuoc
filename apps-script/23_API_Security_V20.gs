/**
 * M&E WATER V20 - SERVER-SIDE API SECURITY
 *
 * Mục tiêu:
 * - Mọi API nghiệp vụ chỉ chạy khi có sessionToken hợp lệ.
 * - Token phải đúng PROJECT_ID, còn hạn và nhân sự còn Đang làm việc.
 * - Không áp dụng cho authstaff/login/sessioncheck/changepassword.
 *
 * Phụ thuộc module 21_Auth_Login_V20.gs:
 *   waterAuthVerifyTokenV20_()
 *   waterAuthFindStaffV20_()
 *   waterProjectFromParams_()
 *   waterOpenProject_()
 */

const WATER_SECURITY_PUBLIC_APIS_V20 = Object.freeze([
  'authstaff',
  'login',
  'sessioncheck',
  'changepassword'
]);

function waterSecurityIsPublicApiV20_(api) {
  const key = String(api || '').trim().toLowerCase();
  return WATER_SECURITY_PUBLIC_APIS_V20.indexOf(key) >= 0;
}

function waterSecurityRequirePostV20_(p) {
  p = p || {};

  const api = String(p.api || '').trim().toLowerCase();
  if (waterSecurityIsPublicApiV20_(api)) {
    return {
      ok: true,
      publicApi: true,
      projectId: waterProjectFromParams_(p),
      staff: null
    };
  }

  const projectId = waterProjectFromParams_(p);
  const token = String(p.sessionToken || '').trim();

  if (!token) {
    throw new Error('SECURITY_401: Vui lòng đăng nhập lại.');
  }

  const verified = waterAuthVerifyTokenV20_(token, projectId);
  if (!verified || !verified.ok) {
    throw new Error('SECURITY_401: Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }

  const ss = waterOpenProject_(projectId);
  const staff = waterAuthFindStaffV20_(ss, verified.staffCode);

  if (
    !staff ||
    String(staff.trangThai || '').trim().toLowerCase() !== 'đang làm việc'
  ) {
    throw new Error('SECURITY_403: Tài khoản không còn quyền sử dụng dự án.');
  }

  // Chỉ tin danh tính lấy từ token đã ký, không tin mã nhân sự do client tự gửi.
  p.projectId = projectId;
  p.authStaffCode = staff.ma;
  p.authStaffName = staff.ten;
  p.authRole = staff.quyen;

  return {
    ok: true,
    publicApi: false,
    projectId: projectId,
    expiresAt: verified.expiresAt,
    staff: {
      ma: staff.ma,
      ten: staff.ten,
      quyen: staff.quyen
    },
    ss: ss
  };
}

function waterSecurityTestTokenV20_(projectId, sessionToken) {
  const p = {
    api: 'uistate',
    project: projectId,
    projectId: projectId,
    sessionToken: sessionToken
  };
  const ctx = waterSecurityRequirePostV20_(p);
  Logger.log(JSON.stringify({
    ok: ctx.ok,
    projectId: ctx.projectId,
    staff: ctx.staff
  }));
  return ctx;
}
