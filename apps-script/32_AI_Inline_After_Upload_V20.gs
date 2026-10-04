/**
 * M&E WATER V20 - AI INLINE AFTER TURBO UPLOAD (STAGED)
 *
 * Mục tiêu:
 * - Sau khi SPEED3/TURBO đã lưu ảnh + ghi HANG_DOI_ANH_V87 thành công,
 *   xử lý AI ngay trong cùng request backend.
 * - Chỉ bật cho PKG001 ở giai đoạn test.
 * - Nếu AI inline lỗi, KHÔNG làm hỏng ACK upload; trigger 1 phút vẫn xử lý dự phòng.
 * - Dùng lại pipeline FAST -> fallback của module 31.
 */

const WATER_AI_INLINE_AFTER_UPLOAD_V20 = Object.freeze({
  ENABLED_PROJECTS: ['PKG001'],
  MAX_JOBS: 3
});

function waterAIInlineAfterTurboV20_(projectId, results) {
  const id = String(projectId || '').trim().toUpperCase();
  const rows = Array.isArray(results) ? results : [];

  if (
    WATER_AI_INLINE_AFTER_UPLOAD_V20.ENABLED_PROJECTS.indexOf(id) < 0
  ) {
    return {
      ok: true,
      projectId: id,
      skipped: true,
      reason: 'PROJECT_NOT_STAGED'
    };
  }

  const fresh = rows.filter(function(x) {
    return !!(
      x &&
      x.ok === true &&
      x.duplicate !== true
    );
  });

  if (!fresh.length) {
    return {
      ok: true,
      projectId: id,
      skipped: true,
      reason: 'NO_NEW_IMAGE'
    };
  }

  if (typeof waterAIImmediateKickProjectV20_ !== 'function') {
    Logger.log(
      'AI_INLINE_AFTER_UPLOAD=' +
      JSON.stringify({
        ok: false,
        projectId: id,
        error: 'Thiếu waterAIImmediateKickProjectV20_.'
      })
    );

    return {
      ok: false,
      projectId: id,
      error: 'Thiếu waterAIImmediateKickProjectV20_.'
    };
  }

  try {
    // Bảo đảm các dòng vừa ghi vào hàng đợi có thể được worker đọc ngay.
    SpreadsheetApp.flush();

    const maxJobs = Math.max(
      1,
      Math.min(
        fresh.length,
        WATER_AI_INLINE_AFTER_UPLOAD_V20.MAX_JOBS
      )
    );

    const result = waterAIImmediateKickProjectV20_(
      id,
      maxJobs
    );

    Logger.log(
      'AI_INLINE_AFTER_UPLOAD=' +
      JSON.stringify({
        ok: true,
        projectId: id,
        newImages: fresh.length,
        maxJobs: maxJobs,
        result: result
      })
    );

    return result;

  } catch (err) {
    // Tuyệt đối không throw: ảnh đã nhận thành công thì ACK upload vẫn phải trả về.
    // Trigger 1 phút sẽ là tuyến dự phòng nếu AI inline gặp lỗi.
    const msg = String(
      err && err.message ? err.message : err
    );

    Logger.log(
      'AI_INLINE_AFTER_UPLOAD=' +
      JSON.stringify({
        ok: false,
        projectId: id,
        newImages: fresh.length,
        error: msg,
        fallback: 'TIME_TRIGGER'
      })
    );

    return {
      ok: false,
      projectId: id,
      error: msg,
      fallback: 'TIME_TRIGGER'
    };
  }
}

function KIEM_TRA_AI_INLINE_AFTER_UPLOAD_V20() {
  const errors = [];

  if (typeof waterAIImmediateKickProjectV20_ !== 'function') {
    errors.push('Thiếu waterAIImmediateKickProjectV20_.');
  }

  if (typeof waterProject_ !== 'function') {
    errors.push('Thiếu waterProject_.');
  }

  let pkg001 = false;
  try {
    const p = waterProject_('PKG001');
    pkg001 = !!(p && p.sheetId);
    if (!pkg001) errors.push('Không tìm thấy PKG001.');
  } catch (e) {
    errors.push('PKG001 lỗi: ' + e);
  }

  const result = {
    ok: errors.length === 0,
    stagedProjects: WATER_AI_INLINE_AFTER_UPLOAD_V20.ENABLED_PROJECTS,
    maxJobs: WATER_AI_INLINE_AFTER_UPLOAD_V20.MAX_JOBS,
    pkg001: pkg001,
    errors: errors
  };

  Logger.log(
    'AI_INLINE_PRECHECK=' +
    JSON.stringify(result)
  );

  return result;
}
