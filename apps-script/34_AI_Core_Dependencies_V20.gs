/**
 * M&E WATER V20 - AI CORE DEPENDENCIES RESTORE
 *
 * Khôi phục các helper/phần cấu hình V8.7.x mà module AI multi-project cần,
 * nhưng đang thiếu trong Apps Script live sau quá trình tách module V20.
 *
 * Nguồn logic: backend V8.7.3 / V8.7.7 / V8.7.11 đã dùng trước đây.
 * Mục tiêu: chỉ khôi phục dependency, không đổi UI / upload / auth.
 */

const SHEET_GHI_SO = 'GHI_SO_HANG_THANG';
const GEMINI_MODEL = 'gemini-3.6-flash';
const NGUONG_TIEU_THU_CAO = Number.POSITIVE_INFINITY;
const AI_MAX_RETRY = 3;

function chuanHoaMaDongHo_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '')
    .replace(/-N\d+$/i, '');
}

function timDongKyHienTai_(sh, meter, ky) {
  if (sh.getLastRow() < 2) return 0;

  const data = sh
    .getRange(2, 2, sh.getLastRow() - 1, 5)
    .getDisplayValues();

  for (let i = data.length - 1; i >= 0; i--) {
    if (
      String(data[i][0] || '').trim() === ky &&
      chuanHoaMaDongHo_(data[i][4]) === meter
    ) {
      return i + 2;
    }
  }

  return 0;
}

function waterApartmentV877_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-N[0-9]+$/, '')
    .replace(/[- ._]/g, '');
}

function waterSeedV877_(ss, meter, period) {
  const sh = ss.getSheetByName('CHI_SO_DAU');
  if (!sh) return {exists:false, value:''};

  const rows = sh
    .getRange(1, 1, Math.max(1, sh.getLastRow()), 5)
    .getValues();

  const matches = rows.filter(function(r) {
    return (
      String(r[0]).trim() === String(period).trim() &&
      waterApartmentV877_(r[1]) === waterApartmentV877_(meter)
    );
  });

  if (!matches.length) return {exists:false, value:''};

  const r = matches[0];
  return {
    exists:true,
    value:
      matches.length === 1 &&
      r[4] === 'OK' &&
      typeof r[2] === 'number' &&
      Number.isFinite(r[2]) &&
      r[2] >= 0
        ? r[2]
        : ''
  };
}

function waterHistoricalPreviousV877_(sh, meter, period, currentRow) {
  const m = /^(0[1-9]|1[0-2])\/([0-9]{4})$/.exec(String(period).trim());
  if (!m || sh.getLastRow() < 2) return '';

  let month = Number(m[1]) - 1;
  let year = Number(m[2]);
  if (!month) {
    month = 12;
    year--;
  }

  const previousPeriod = String(month).padStart(2, '0') + '/' + year;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 15).getValues();

  const matches = rows.filter(function(r, i) {
    return (
      i + 2 !== currentRow &&
      String(r[1]).trim() === previousPeriod &&
      chuanHoaMaDongHo_(r[5]) === chuanHoaMaDongHo_(meter)
    );
  });

  if (matches.length !== 1) return '';
  const r = matches[0];

  return (
    r[14] === 'AI ĐÃ ĐỌC - CHỜ ĐỐI CHIẾU' &&
    typeof r[7] === 'number' &&
    Number.isFinite(r[7]) &&
    r[7] >= 0
  ) ? r[7] : '';
}

function layChiSoKyTruoc_(sh, meter, currentKy, currentRow) {
  const seed = waterSeedV877_(sh.getParent(), meter, currentKy);
  return seed.exists
    ? seed.value
    : waterHistoricalPreviousV877_(sh, meter, currentKy, currentRow);
}

function waterLinkFormulasV877_(row, lastSeedRow, previous) {
  const end = Math.max(4, lastSeedRow);
  const norm = function(x) {
    return 'REGEXREPLACE(REGEXREPLACE(UPPER(TRIM(' + x + '));"-N[0-9]+$";"");"[- ._]";"")';
  };

  const a = "'CHI_SO_DAU'!$A$4:$A$" + end;
  const b = "'CHI_SO_DAU'!$B$4:$B$" + end;
  const c = "'CHI_SO_DAU'!$C$4:$C$" + end;
  const e = "'CHI_SO_DAU'!$E$4:$E$" + end;

  const fallback =
    typeof previous === 'number' &&
    Number.isFinite(previous) &&
    previous >= 0
      ? String(previous).replace('.', ',')
      : '""';

  const g =
    '=IF(F' + row + '="";"";LET(keys;ARRAYFORMULA(TRIM(' + a + ')&"|"&' + norm(b) + ');key;TRIM(B' + row + ')&"|"&' + norm('F' + row) + ';n;SUMPRODUCT(--(keys=key));IF(n=0;' + fallback + ';IF(n<>1;"";IF(XLOOKUP(key;keys;' + e + ';"")="OK";XLOOKUP(key;keys;' + c + ';"");"")))))';

  const i =
    '=IF(AND(ISNUMBER(G' + row + ');ISNUMBER(H' + row + ');H' + row + '>=G' + row + ';OR(O' + row + '="AI ĐÃ ĐỌC - CHỜ ĐỐI CHIẾU";O' + row + '="CẦN KIỂM TRA - TIÊU THỤ CAO"));ROUND(H' + row + '-G' + row + ';4);"")';

  return [g, i];
}

function waterLinkRowV877_(ss, main, row) {
  const seed = ss.getSheetByName('CHI_SO_DAU');
  if (!seed) return;

  const values = main.getRange(row, 1, 1, 22).getValues()[0];
  const previous = waterHistoricalPreviousV877_(
    main,
    values[5],
    values[1],
    row
  );

  const formulas = waterLinkFormulasV877_(
    row,
    seed.getMaxRows(),
    previous
  );

  main.getRange(row, 7).setFormula(formulas[0]);
  main.getRange(row, 9).setFormula(formulas[1]);
}

function waterAssessV87_(ai, previous, meter) {
  const raw = ai && ai.reading_m3;

  if (
    raw === null ||
    raw === undefined ||
    raw === '' ||
    typeof raw === 'boolean' ||
    !Number.isFinite(Number(raw)) ||
    Number(raw) < 0
  ) {
    throw new Error('AI chưa đọc được chỉ số hợp lệ.');
  }

  const reading = Number(raw);
  const confidence = Number(ai.confidence);
  const hasPrevious =
    previous !== '' &&
    previous !== null &&
    Number.isFinite(Number(previous));

  const consumption = hasPrevious
    ? Number((reading - Number(previous)).toFixed(4))
    : '';

  const imageSafe =
    Number.isFinite(confidence) &&
    confidence >= 0.90 &&
    confidence <= 1 &&
    ai.needs_review === false &&
    (!ai.meter_code ||
      chuanHoaMaDongHo_(ai.meter_code) === chuanHoaMaDongHo_(meter));

  const highConsumption =
    consumption !== '' &&
    consumption > NGUONG_TIEU_THU_CAO;

  const replaceSafe =
    imageSafe &&
    (consumption === '' || consumption >= 0);

  const safe = replaceSafe && !highConsumption;

  return {
    reading: reading,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    previous: hasPrevious ? Number(previous) : '',
    consumption: consumption,
    safe: safe,
    replaceSafe: replaceSafe,
    highConsumption: highConsumption,
    meterType: ai.meter_type || null,
    resolution: ai.reading_resolution_m3 || null,
    ruleVersion: ai.rule_version || null
  };
}

function waterSameSafeV87_(a, b) {
  return (
    a.safe &&
    b.safe &&
    a.reading === b.reading &&
    !!a.meterType &&
    a.meterType === b.meterType &&
    a.resolution === b.resolution &&
    a.ruleVersion === '8.7.3' &&
    b.ruleVersion === '8.7.3'
  );
}

function waterHasRecordedReadingV874_(row) {
  if (!row) return false;

  const present = function(v) {
    return v !== '' && v !== null && v !== undefined;
  };

  if (present(row[7])) return true;
  if (!present(row[16])) return false;

  try {
    const ai = JSON.parse(row[16]);
    return !ai || typeof ai !== 'object' || present(ai.reading_m3);
  } catch (e) {
    return true;
  }
}

function waterCanReplaceV875_(r, assessed, old, target, replaceId) {
  if (
    !(assessed.safe || assessed.replaceSafe) ||
    !replaceId ||
    replaceId === String(r[18])
  ) {
    return false;
  }

  const matches = function(a) {
    return (
      a &&
      String(a[1]) === String(r[1]) &&
      chuanHoaMaDongHo_(a[5]) === chuanHoaMaDongHo_(r[5])
    );
  };

  if (!matches(target) || String(target[18]) !== replaceId) return false;
  if (!old || !old[17]) return true;
  if (!matches(old)) return false;
  if (old[17] === r[17]) return true;

  const newer = new Date(r[0]).getTime();
  const before = new Date(old[0]).getTime();

  if (
    !Number.isFinite(newer) ||
    !Number.isFinite(before) ||
    newer < before
  ) {
    return false;
  }

  return true;
}

function waterNextMainRowV8711_(sh) {
  const maxRows = sh.getMaxRows();
  const chunkSize = 500;

  for (let start = 2; start <= maxRows; start += chunkSize) {
    const n = Math.min(chunkSize, maxRows - start + 1);
    const values = sh.getRange(start, 6, n, 1).getDisplayValues();

    for (let i = 0; i < values.length; i++) {
      if (!String(values[i][0] || '').trim()) {
        return start + i;
      }
    }
  }

  sh.insertRowsAfter(maxRows, 100);
  return maxRows + 1;
}

function waterQueueV87_(ss) {
  const queueName = 'HANG_DOI_ANH_V87';
  let sh = ss.getSheetByName(queueName);

  if (!sh) {
    sh = ss.insertSheet(queueName);
    const headers = ss
      .getSheetByName(SHEET_GHI_SO)
      .getRange(1, 1, 1, 22)
      .getValues()[0];

    sh.getRange(1, 1, 1, 26).setValues([
      headers.concat([
        'Mã lượt AI',
        'Hạn giữ lượt AI',
        'File chờ dọn',
        'Kết quả chọn ảnh'
      ])
    ]);
    sh.setFrozenRows(1);
  }

  if (sh.getMaxColumns() < 27) {
    sh.insertColumnsAfter(sh.getMaxColumns(), 27 - sh.getMaxColumns());
  }

  if (sh.getRange(1, 27).getValue() !== 'Thay thế Client ID') {
    sh.getRange(1, 27).setValue('Thay thế Client ID');
  }

  return sh;
}

function waterDeleteReplacedPhoto_(ss, oldId, newId) {
  if (!oldId || oldId === newId) return '';

  try {
    const sh = ss.getSheetByName(SHEET_GHI_SO);

    if (
      sh &&
      sh.getLastRow() > 1 &&
      sh.getRange(2, 18, sh.getLastRow() - 1, 1)
        .createTextFinder(oldId)
        .matchEntireCell(true)
        .findNext()
    ) {
      return 'Ảnh cũ còn được bản ghi khác sử dụng.';
    }

    let projectId = '';
    try {
      const projects = typeof waterAIProjects_ === 'function'
        ? (waterAIProjects_() || [])
        : [];
      const found = projects.find(function(p) {
        return String(p.sheetId || '') === String(ss.getId());
      });
      projectId = found ? String(found.projectId || '') : '';
    } catch (e) {}

    if (
      !projectId ||
      typeof waterProjectPhotoFolder_ !== 'function'
    ) {
      return 'Ảnh mới đã lưu; chưa xác định được thư mục ảnh dự án để dọn ảnh cũ.';
    }

    const folder = waterProjectPhotoFolder_(projectId);
    const folderId = folder && folder.getId ? folder.getId() : '';

    if (!folderId) {
      return 'Ảnh mới đã lưu; chưa xác định được thư mục ảnh dự án để dọn ảnh cũ.';
    }

    const oldFile = DriveApp.getFileById(oldId);
    const parents = oldFile.getParents();
    let belongs = false;

    while (parents.hasNext()) {
      if (parents.next().getId() === folderId) {
        belongs = true;
        break;
      }
    }

    if (!belongs) {
      return 'Không xóa ảnh nằm ngoài thư mục của dự án.';
    }

    const response = UrlFetchApp.fetch(
      'https://www.googleapis.com/drive/v3/files/' +
      encodeURIComponent(oldId),
      {
        method:'delete',
        headers:{Authorization:'Bearer ' + ScriptApp.getOAuthToken()},
        muteHttpExceptions:true
      }
    );

    const code = response.getResponseCode();
    if (code !== 204 && code !== 404) {
      throw new Error('Google Drive HTTP ' + code);
    }

    return '';
  } catch (e) {
    console.warn(
      'Ảnh mới đã lưu; chưa dọn được ảnh cũ: ' +
      oldId +
      ' / ' +
      String(e && e.message ? e.message : e)
    );
    return 'Ảnh mới đã lưu; chưa xóa được ảnh cũ trên Drive.';
  }
}

function KIEM_TRA_AI_CORE_DEPENDENCIES_V20() {
  const errors = [];

  const requiredFunctions = {
    waterQueueV87_: typeof waterQueueV87_,
    layChiSoKyTruoc_: typeof layChiSoKyTruoc_,
    chuanHoaMaDongHo_: typeof chuanHoaMaDongHo_,
    waterAssessV87_: typeof waterAssessV87_,
    timDongKyHienTai_: typeof timDongKyHienTai_,
    waterCanReplaceV875_: typeof waterCanReplaceV875_,
    waterNextMainRowV8711_: typeof waterNextMainRowV8711_,
    waterLinkRowV877_: typeof waterLinkRowV877_,
    waterHasRecordedReadingV874_: typeof waterHasRecordedReadingV874_,
    waterSameSafeV87_: typeof waterSameSafeV87_,
    waterDeleteReplacedPhoto_: typeof waterDeleteReplacedPhoto_,
    waterSeedV877_: typeof waterSeedV877_,
    waterHistoricalPreviousV877_: typeof waterHistoricalPreviousV877_,
    waterLinkFormulasV877_: typeof waterLinkFormulasV877_
  };

  Object.keys(requiredFunctions).forEach(function(name) {
    if (requiredFunctions[name] !== 'function') {
      errors.push('Thiếu hàm ' + name);
    }
  });

  if (typeof SHEET_GHI_SO === 'undefined') errors.push('Thiếu SHEET_GHI_SO');
  if (typeof AI_MAX_RETRY === 'undefined') errors.push('Thiếu AI_MAX_RETRY');
  if (typeof NGUONG_TIEU_THU_CAO === 'undefined') errors.push('Thiếu NGUONG_TIEU_THU_CAO');
  if (typeof GEMINI_MODEL === 'undefined') errors.push('Thiếu GEMINI_MODEL');

  let projectOk = false;
  let queueOk = false;

  try {
    const p = waterProject_('PKG001');
    projectOk = !!(p && p.sheetId);

    if (!projectOk) {
      errors.push('Không tìm thấy PKG001.');
    } else {
      const ss = SpreadsheetApp.openById(p.sheetId);
      const q = waterQueueV87_(ss);
      queueOk = !!q;
      if (!queueOk) errors.push('Không mở được HANG_DOI_ANH_V87 của PKG001.');
    }
  } catch (e) {
    errors.push('PKG001 dependency check lỗi: ' + String(e && e.message ? e.message : e));
  }

  const result = {
    ok: errors.length === 0,
    projectOk: projectOk,
    queueOk: queueOk,
    build:'V20_AI_CORE_DEPENDENCIES_8711',
    errors:errors
  };

  Logger.log('AI_CORE_DEPENDENCIES_PRECHECK=' + JSON.stringify(result));
  return result;
}
