/**
 * M&E WATER V20 - AI IMMEDIATE KICK (STAGED)
 *
 * Mục tiêu:
 * - Sau khi upload ACK thành công, frontend gửi một POST riêng api=aikick.
 * - POST này KHÔNG mang ảnh, chỉ kích AI cho đúng PROJECT_ID.
 * - Bắt buộc sessionToken hợp lệ; không cho người ngoài kích AI.
 * - PKG001 dùng FAST -> fallback theo module 30.
 * - Trigger 1 phút vẫn giữ làm phương án dự phòng.
 *
 * QUAN TRỌNG:
 * File này KHÔNG tự sửa doPost().
 * Trong 10_Backend_Core.gs cần thêm route:
 *
 *   if (
 *     uiApi === 'aikick' &&
 *     typeof waterAIImmediateKickPostV20_ === 'function'
 *   ) {
 *     return waterAIImmediateKickPostV20_(p);
 *   }
 *
 * Đặt route trên SAU nhóm auth/BQL và TRƯỚC batchupload/batchuploadturbo.
 */

const WATER_AI_IMMEDIATE_KICK_V20 = Object.freeze({
  ENABLED_PROJECTS: ['PKG001'],
  MAX_JOBS: 3,
  RESULT_TYPE: 'WATER_AI_KICK_RESULT'
});

function waterAIImmediateKickPostV20_(p) {
  const requestId = String(
    p && p.requestId ? p.requestId : ''
  ).trim();

  if (!/^[A-Za-z0-9_-]{8,120}$/.test(requestId)) {
    return waterAIImmediateKickHtmlV20_({
      type: WATER_AI_IMMEDIATE_KICK_V20.RESULT_TYPE,
      requestId: requestId,
      ok: false,
      error: 'Mã yêu cầu AI kick không hợp lệ.'
    });
  }

  const projectId = waterProjectFromParams_(p);
  const sessionToken = String(
    p && p.sessionToken ? p.sessionToken : ''
  ).trim();

  const auth = waterAIImmediateKickRequireSessionV20_(
    projectId,
    sessionToken
  );

  if (!auth.ok) {
    return waterAIImmediateKickHtmlV20_({
      type: WATER_AI_IMMEDIATE_KICK_V20.RESULT_TYPE,
      requestId: requestId,
      ok: false,
      projectId: projectId,
      error: auth.error || 'Phiên đăng nhập không hợp lệ.'
    });
  }

  try {
    const result = waterAIImmediateKickProjectV20_(
      projectId,
      WATER_AI_IMMEDIATE_KICK_V20.MAX_JOBS
    );

    return waterAIImmediateKickHtmlV20_({
      type: WATER_AI_IMMEDIATE_KICK_V20.RESULT_TYPE,
      requestId: requestId,
      ok: true,
      projectId: projectId,
      staffCode: auth.staffCode,
      result: result
    });
  } catch (err) {
    return waterAIImmediateKickHtmlV20_({
      type: WATER_AI_IMMEDIATE_KICK_V20.RESULT_TYPE,
      requestId: requestId,
      ok: false,
      projectId: projectId,
      staffCode: auth.staffCode,
      error: String(
        err && err.message ? err.message : err
      )
    });
  }
}

function waterAIImmediateKickRequireSessionV20_(
  projectId,
  sessionToken
) {
  try {
    if (
      typeof waterAuthVerifyTokenV20_ !== 'function' ||
      typeof waterAuthFindStaffV20_ !== 'function' ||
      typeof waterAuthPasswordVersionV20_ !== 'function' ||
      typeof waterAuthSafeEqualV20_ !== 'function'
    ) {
      return {
        ok: false,
        error: 'Backend thiếu helper xác thực phiên V20.'
      };
    }

    const verified = waterAuthVerifyTokenV20_(
      sessionToken,
      projectId
    );

    if (!verified || !verified.ok) {
      return {
        ok: false,
        error: 'Phiên đăng nhập đã hết hạn.'
      };
    }

    const ss = waterOpenProject_(projectId);
    const staff = waterAuthFindStaffV20_(
      ss,
      verified.staffCode
    );

    if (
      !staff ||
      String(staff.trangThai || '')
        .trim()
        .toLowerCase() !== 'đang làm việc'
    ) {
      return {
        ok: false,
        error: 'Nhân sự không còn hoạt động.'
      };
    }

    const currentPasswordVersion =
      waterAuthPasswordVersionV20_(staff.matKhau);

    if (
      !waterAuthSafeEqualV20_(
        verified.passwordVersion,
        currentPasswordVersion
      )
    ) {
      return {
        ok: false,
        error: 'Phiên đăng nhập không còn hiệu lực.'
      };
    }

    return {
      ok: true,
      staffCode: staff.ma,
      staffName: staff.ten,
      expiresAt: verified.expiresAt
    };
  } catch (err) {
    return {
      ok: false,
      error: String(
        err && err.message ? err.message : err
      )
    };
  }
}

function waterAIImmediateKickProjectV20_(
  projectId,
  requestedMaxJobs
) {
  const id = String(projectId || '')
    .trim()
    .toUpperCase();

  if (
    WATER_AI_IMMEDIATE_KICK_V20.ENABLED_PROJECTS
      .indexOf(id) < 0
  ) {
    const skipped = {
      ok: true,
      projectId: id,
      skipped: true,
      reason: 'PROJECT_NOT_STAGED',
      claimed: 0,
      processed: 0
    };

    Logger.log(
      'AI_IMMEDIATE_KICK=' +
      JSON.stringify(skipped)
    );

    return skipped;
  }

  if (
    typeof waterAIFastProdBuildRequestV20_ !== 'function' ||
    typeof waterAIFastProdParseResponseV20_ !== 'function'
  ) {
    throw new Error(
      'Thiếu module 30_AI_Fast_Production_V20.gs.'
    );
  }

  const project = waterProject_(id);

  if (!project || !project.sheetId) {
    throw new Error(
      'Không tìm thấy Project ' + id + '.'
    );
  }

  const maxJobs = Math.max(
    1,
    Math.min(
      Number(requestedMaxJobs || 1),
      WATER_AI_IMMEDIATE_KICK_V20.MAX_JOBS
    )
  );

  const started = Date.now();
  const entries = [];

  for (
    let i = 0;
    i < maxJobs;
    i++
  ) {
    const job = waterClaimV87Project_(project);
    if (!job) break;

    entries.push({
      job: job,
      blob: null,
      request: null,
      response: null,
      ai: null,
      fastError: '',
      mode: ''
    });
  }

  if (!entries.length) {
    const empty = {
      ok: true,
      projectId: id,
      skipped: false,
      claimed: 0,
      processed: 0,
      elapsedMs: Date.now() - started
    };

    Logger.log(
      'AI_IMMEDIATE_KICK=' +
      JSON.stringify(empty)
    );

    return empty;
  }

  const requestEntries = [];
  const requests = [];

  entries.forEach(function(entry) {
    try {
      entry.blob = DriveApp
        .getFileById(entry.job.data[17])
        .getBlob();

      entry.request =
        waterAIFastProdBuildRequestV20_(
          entry.blob,
          entry.job.data[5],
          WATER_AI_FAST_PROD_V20.MODEL
        );

      requestEntries.push(entry);
      requests.push(entry.request);
    } catch (err) {
      entry.fastError = String(
        err && err.message ? err.message : err
      );
    }
  });

  let responses = [];
  let fetchAllError = '';

  if (requests.length) {
    try {
      responses = UrlFetchApp.fetchAll(requests);
    } catch (err) {
      fetchAllError = String(
        err && err.message ? err.message : err
      );
    }
  }

  requestEntries.forEach(
    function(entry, index) {
      if (fetchAllError) {
        entry.fastError = fetchAllError;
        return;
      }

      try {
        entry.response = responses[index];

        entry.ai =
          waterAIFastProdParseResponseV20_(
            entry.response,
            entry.job.data[5]
          );

        entry.mode = 'FAST';
      } catch (err) {
        entry.fastError = String(
          err && err.message
            ? err.message
            : err
        );
      }
    }
  );

  const details = [];

  entries.forEach(function(entry) {
    let ai = entry.ai || null;
    let error = '';
    let mode = entry.mode || 'FALLBACK';

    if (!ai) {
      try {
        if (!entry.blob) {
          entry.blob = DriveApp
            .getFileById(entry.job.data[17])
            .getBlob();
        }

        ai = docDongHoBangGemini_(
          entry.blob,
          entry.job.data[5]
        );

        mode = 'FALLBACK';
      } catch (fallbackErr) {
        error =
          'FAST: ' +
          String(
            entry.fastError ||
            'Không có kết quả FAST.'
          ) +
          ' | FALLBACK: ' +
          String(
            fallbackErr &&
            fallbackErr.message
              ? fallbackErr.message
              : fallbackErr
          );

        mode = 'FAILED';
      }
    }

    waterFinishV87Project_(
      entry.job,
      ai,
      error
    );

    details.push({
      meter: String(
        entry.job.data[5] || ''
      ),
      mode: mode,
      fastNote: entry.fastError || '',
      error: error
    });
  });

  try {
    waterCleanupV87Project_(project);
  } catch (cleanupErr) {
    Logger.log(
      'AI_IMMEDIATE_CLEANUP_ERROR=' +
      String(cleanupErr)
    );
  }

  const result = {
    ok: details.every(function(x) {
      return !x.error;
    }),
    projectId: id,
    skipped: false,
    claimed: entries.length,
    processed: details.length,
    elapsedMs: Date.now() - started,
    details: details
  };

  Logger.log(
    'AI_IMMEDIATE_KICK=' +
    JSON.stringify(result)
  );

  return result;
}

function waterAIImmediateKickHtmlV20_(obj) {
  const payload = JSON.stringify(obj || {})
    .replace(/</g, '\\u003c')
    .replace(/-->/g, '--\\u003e');

  return HtmlService
    .createHtmlOutput(
      '<!doctype html>' +
      '<html><head><meta charset="utf-8"></head><body>' +
      '<script>' +
      '(function(){' +
      'var m=' + payload + ';' +
      'try{window.top.postMessage(m,"*");}catch(e){}' +
      'try{window.parent.postMessage(m,"*");}catch(e){}' +
      '})();' +
      '</script>' +
      '</body></html>'
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}

function KIEM_TRA_AI_IMMEDIATE_KICK_V20() {
  const errors = [];

  const required = {
    waterProjectFromParams_: typeof waterProjectFromParams_,
    waterOpenProject_: typeof waterOpenProject_,
    waterProject_: typeof waterProject_,
    waterClaimV87Project_: typeof waterClaimV87Project_,
    waterFinishV87Project_: typeof waterFinishV87Project_,
    waterCleanupV87Project_: typeof waterCleanupV87Project_,
    docDongHoBangGemini_: typeof docDongHoBangGemini_,
    waterAuthVerifyTokenV20_: typeof waterAuthVerifyTokenV20_,
    waterAuthFindStaffV20_: typeof waterAuthFindStaffV20_,
    waterAuthPasswordVersionV20_: typeof waterAuthPasswordVersionV20_,
    waterAuthSafeEqualV20_: typeof waterAuthSafeEqualV20_,
    waterAIFastProdBuildRequestV20_: typeof waterAIFastProdBuildRequestV20_,
    waterAIFastProdParseResponseV20_: typeof waterAIFastProdParseResponseV20_
  };

  Object.keys(required).forEach(function(name) {
    if (required[name] !== 'function') {
      errors.push('Thiếu hàm ' + name);
    }
  });

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
    stagedProjects: WATER_AI_IMMEDIATE_KICK_V20.ENABLED_PROJECTS,
    maxJobs: WATER_AI_IMMEDIATE_KICK_V20.MAX_JOBS,
    pkg001: pkg001,
    errors: errors
  };

  Logger.log('AI_IMMEDIATE_PRECHECK=' + JSON.stringify(result));
  return result;
}
