/**
 * M&E WATER V20 - AI INLINE AFTER TURBO UPLOAD (PRODUCTION)
 *
 * Mục tiêu:
 * - Sau khi SPEED3/TURBO đã lưu ảnh + ghi HANG_DOI_ANH_V87 thành công,
 *   xử lý AI ngay trong cùng request backend.
 * - Áp dụng cho mọi PROJECT_ID hợp lệ, không còn giới hạn PKG001.
 * - FAST: gemini-3.5-flash-lite qua helper module 30.
 * - Nếu FAST lỗi/không vượt validation V8.7.3 -> fallback AI hiện tại.
 * - Nếu AI inline lỗi toàn cục, KHÔNG làm hỏng ACK upload;
 *   trigger 1 phút vẫn là tuyến dự phòng.
 *
 * Phụ thuộc:
 * - 30_AI_Fast_Production_V20.gs
 * - waterProject_ / waterClaimV87Project_ / waterFinishV87Project_
 * - waterCleanupV87Project_ / docDongHoBangGemini_
 */

const WATER_AI_INLINE_AFTER_UPLOAD_V20 = Object.freeze({
  MAX_JOBS: 3,
  DISABLE_PROPERTY: 'WATER_AI_INLINE_DISABLED',
  BUILD: 'V20_INLINE_PROD_ALL_PROJECTS'
});

function waterAIInlineAfterTurboV20_(projectId, results) {
  const id = String(projectId || '').trim().toUpperCase();
  const rows = Array.isArray(results) ? results : [];

  if (!id) {
    return {
      ok: false,
      projectId: '',
      skipped: true,
      reason: 'MISSING_PROJECT_ID'
    };
  }

  try {
    const disabled = String(
      PropertiesService.getScriptProperties().getProperty(
        WATER_AI_INLINE_AFTER_UPLOAD_V20.DISABLE_PROPERTY
      ) || ''
    ).trim();

    if (disabled === '1' || disabled.toLowerCase() === 'true') {
      return {
        ok: true,
        projectId: id,
        skipped: true,
        reason: 'INLINE_DISABLED_BY_PROPERTY'
      };
    }
  } catch (e) {}

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

  try {
    SpreadsheetApp.flush();

    const maxJobs = Math.max(
      1,
      Math.min(
        fresh.length,
        WATER_AI_INLINE_AFTER_UPLOAD_V20.MAX_JOBS
      )
    );

    const result = waterAIInlineProcessProjectV20_(id, maxJobs);

    Logger.log(
      'AI_INLINE_AFTER_UPLOAD=' +
      JSON.stringify({
        ok: result.ok,
        projectId: id,
        newImages: fresh.length,
        maxJobs: maxJobs,
        build: WATER_AI_INLINE_AFTER_UPLOAD_V20.BUILD,
        result: result
      })
    );

    return result;
  } catch (err) {
    const msg = String(
      err && err.message ? err.message : err
    );

    Logger.log(
      'AI_INLINE_AFTER_UPLOAD=' +
      JSON.stringify({
        ok: false,
        projectId: id,
        newImages: fresh.length,
        build: WATER_AI_INLINE_AFTER_UPLOAD_V20.BUILD,
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

function waterAIInlineProcessProjectV20_(projectId, requestedMaxJobs) {
  const id = String(projectId || '').trim().toUpperCase();

  if (
    typeof waterProject_ !== 'function' ||
    typeof waterClaimV87Project_ !== 'function' ||
    typeof waterFinishV87Project_ !== 'function' ||
    typeof waterCleanupV87Project_ !== 'function' ||
    typeof docDongHoBangGemini_ !== 'function' ||
    typeof waterAIFastProdBuildRequestV20_ !== 'function' ||
    typeof waterAIFastProdParseResponseV20_ !== 'function'
  ) {
    throw new Error('Backend thiếu helper AI production V20.');
  }

  const project = waterProject_(id);
  if (!project || !project.sheetId) {
    throw new Error('Không tìm thấy Project ' + id + '.');
  }

  const maxJobs = Math.max(
    1,
    Math.min(
      Number(requestedMaxJobs || 1),
      WATER_AI_INLINE_AFTER_UPLOAD_V20.MAX_JOBS
    )
  );

  const model = (
    typeof WATER_AI_FAST_PROD_V20 !== 'undefined' &&
    WATER_AI_FAST_PROD_V20 &&
    WATER_AI_FAST_PROD_V20.MODEL
  )
    ? String(WATER_AI_FAST_PROD_V20.MODEL)
    : 'gemini-3.5-flash-lite';

  const started = Date.now();
  const entries = [];

  for (let i = 0; i < maxJobs; i++) {
    const job = waterClaimV87Project_(project);
    if (!job) break;

    entries.push({
      job: job,
      blob: null,
      request: null,
      ai: null,
      fastError: '',
      mode: ''
    });
  }

  if (!entries.length) {
    return {
      ok: true,
      projectId: id,
      claimed: 0,
      processed: 0,
      elapsedMs: Date.now() - started
    };
  }

  const requestEntries = [];
  const requests = [];

  entries.forEach(function(entry) {
    try {
      entry.blob = DriveApp
        .getFileById(entry.job.data[17])
        .getBlob();

      entry.request = waterAIFastProdBuildRequestV20_(
        entry.blob,
        entry.job.data[5],
        model
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

  requestEntries.forEach(function(entry, index) {
    if (fetchAllError) {
      entry.fastError = fetchAllError;
      return;
    }

    try {
      entry.ai = waterAIFastProdParseResponseV20_(
        responses[index],
        entry.job.data[5]
      );
      entry.mode = 'FAST';
    } catch (err) {
      entry.fastError = String(
        err && err.message ? err.message : err
      );
    }
  });

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
          String(entry.fastError || 'Không có kết quả FAST.') +
          ' | FALLBACK: ' +
          String(
            fallbackErr && fallbackErr.message
              ? fallbackErr.message
              : fallbackErr
          );
        mode = 'FAILED';
      }
    }

    waterFinishV87Project_(entry.job, ai, error);

    details.push({
      meter: String(entry.job.data[5] || ''),
      mode: mode,
      fastNote: entry.fastError || '',
      error: error
    });
  });

  try {
    waterCleanupV87Project_(project);
  } catch (cleanupErr) {
    Logger.log(
      'AI_INLINE_CLEANUP_ERROR=' +
      String(cleanupErr)
    );
  }

  return {
    ok: details.every(function(x) { return !x.error; }),
    projectId: id,
    model: model,
    claimed: entries.length,
    processed: details.length,
    elapsedMs: Date.now() - started,
    details: details
  };
}

function KIEM_TRA_AI_INLINE_AFTER_UPLOAD_V20() {
  const errors = [];

  [
    'waterProject_',
    'waterClaimV87Project_',
    'waterFinishV87Project_',
    'waterCleanupV87Project_',
    'docDongHoBangGemini_',
    'waterAIFastProdBuildRequestV20_',
    'waterAIFastProdParseResponseV20_'
  ].forEach(function(name) {
    try {
      if (typeof this[name] !== 'function') {
        errors.push('Thiếu hàm ' + name);
      }
    } catch (e) {
      errors.push('Không kiểm tra được ' + name);
    }
  });

  let projectCount = 0;
  try {
    if (typeof waterAIProjects_ === 'function') {
      const projects = waterAIProjects_() || [];
      projectCount = projects.length;
    }
  } catch (e) {
    errors.push('Không đọc được danh sách project AI: ' + e);
  }

  const result = {
    ok: errors.length === 0,
    mode: 'ALL_PROJECTS',
    maxJobs: WATER_AI_INLINE_AFTER_UPLOAD_V20.MAX_JOBS,
    projectCount: projectCount,
    build: WATER_AI_INLINE_AFTER_UPLOAD_V20.BUILD,
    emergencyDisableProperty:
      WATER_AI_INLINE_AFTER_UPLOAD_V20.DISABLE_PROPERTY,
    errors: errors
  };

  Logger.log(
    'AI_INLINE_PRECHECK=' +
    JSON.stringify(result)
  );

  return result;
}

function TAT_AI_INLINE_V20() {
  PropertiesService
    .getScriptProperties()
    .setProperty(
      WATER_AI_INLINE_AFTER_UPLOAD_V20.DISABLE_PROPERTY,
      '1'
    );

  Logger.log('AI INLINE: DISABLED');
  return {ok: true, enabled: false};
}

function BAT_AI_INLINE_V20() {
  PropertiesService
    .getScriptProperties()
    .deleteProperty(
      WATER_AI_INLINE_AFTER_UPLOAD_V20.DISABLE_PROPERTY
    );

  Logger.log('AI INLINE: ENABLED');
  return {ok: true, enabled: true};
}
