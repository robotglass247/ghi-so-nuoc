/**
 * M&E WATER V20 - QR PROJECT AUTO
 * R5: dùng CHUNG 01 trigger onEdit cho mỗi dự án + tự bảo trì trigger dự án mới.
 *
 * Mục tiêu:
 * - Giữ nguyên 2 luồng cũ: xuLyOnEditDanhMucProject_ và xuLyXacNhanKiemTraProject_.
 * - Bổ sung sinh QR G:J trong cùng trigger, KHÔNG tạo trigger QR riêng.
 * - Chuyển trigger cũ -> 01 trigger gộp/dự án để giải phóng quota.
 * - Khi tạo dự án mới, tự đổi 2 trigger cũ thành 1 trigger gộp sau khi dự án READY.
 * - Không cần deploy Web App.
 */

const WATER_QR_AUTO_V20 = Object.freeze({
  REGISTRY_ID: '1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0',
  REGISTRY_TAB: 'PROJECTS',
  CREATE_TAB: 'TAO_DU_AN',
  CREATE_CHECKBOX_A1: 'B15',
  CATALOG_SHEET: 'DANH_MUC_DONG_HO',
  INFO_SHEET: 'THONG_TIN_DU_AN',
  APP_BASE_URL: 'https://robotglass247.github.io/ghi-so-nuoc/r1135-v20-direct.html',
  SHARED_HANDLER: 'waterProjectOnEditV20_',
  REGISTRY_MAINT_HANDLER: 'waterQrRegistryMaintenanceV20_',
  BUILD: 'V20_QR_PROJECT_AUTO_20261004_R5_SHARED_TRIGGER_AUTO_MAINT'
});

/**
 * Trigger onEdit DUY NHẤT cho mỗi dự án.
 * Gọi lại nguyên logic cũ rồi bổ sung QR.
 */
function waterProjectOnEditV20_(e) {
  let firstError = null;

  if (typeof xuLyOnEditDanhMucProject_ === 'function') {
    try {
      xuLyOnEditDanhMucProject_(e);
    } catch (err1) {
      firstError = firstError || err1;
      Logger.log('PROJECT_ONEDIT_DANHMUC_ERROR=' + String(err1 && err1.message ? err1.message : err1));
    }
  }

  if (typeof xuLyXacNhanKiemTraProject_ === 'function') {
    try {
      xuLyXacNhanKiemTraProject_(e);
    } catch (err2) {
      firstError = firstError || err2;
      Logger.log('PROJECT_ONEDIT_XACNHAN_ERROR=' + String(err2 && err2.message ? err2.message : err2));
    }
  }

  try {
    waterQrCatalogOnEditV20_(e);
  } catch (err3) {
    firstError = firstError || err3;
    Logger.log('PROJECT_ONEDIT_QR_ERROR=' + String(err3 && err3.message ? err3.message : err3));
  }

  if (firstError) throw firstError;
}

/**
 * Trigger Registry bảo trì tự động cho dự án mới.
 * Chạy song song với trigger tạo dự án hiện có; đợi dự án READY rồi đổi trigger của dự án mới sang trigger gộp.
 */
function waterQrRegistryMaintenanceV20_(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  const ss = sh.getParent();
  if (ss.getId() !== WATER_QR_AUTO_V20.REGISTRY_ID) return;
  if (sh.getName() !== WATER_QR_AUTO_V20.CREATE_TAB) return;
  if (e.range.getA1Notation() !== WATER_QR_AUTO_V20.CREATE_CHECKBOX_A1) return;
  if (String(e.value || '').toUpperCase() !== 'TRUE') return;

  const requested = waterQrNormalizeProjectIdV20_(sh.getRange('B2').getDisplayValue());
  if (!requested) return;

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const status = String(sh.getRange('E2').getDisplayValue() || '').trim().toUpperCase();
    const resultId = waterQrNormalizeProjectIdV20_(sh.getRange('E3').getDisplayValue());
    const sheetId = String(sh.getRange('E4').getDisplayValue() || '').trim();

    if (status === 'READY' && resultId === requested && sheetId) {
      const triggerResult = waterQrConvertSingleProjectTriggersV20_(sheetId, resultId);
      const projectSS = SpreadsheetApp.openById(sheetId);
      const refreshed = waterQrRefreshAllV20_(projectSS, resultId);
      Logger.log('QR_AUTO_NEW_PROJECT=' + JSON.stringify({
        ok: triggerResult.ok,
        projectId: resultId,
        sheetId: sheetId,
        trigger: triggerResult,
        qrUpdated: refreshed.updated,
        build: WATER_QR_AUTO_V20.BUILD
      }));
      return;
    }

    if (status === 'ERROR' && (!resultId || resultId === requested)) {
      Logger.log('QR_AUTO_NEW_PROJECT=' + JSON.stringify({
        ok:false,
        projectId:requested,
        reason:'CREATE_ERROR',
        build:WATER_QR_AUTO_V20.BUILD
      }));
      return;
    }

    Utilities.sleep(1000);
  }

  Logger.log('QR_AUTO_NEW_PROJECT=' + JSON.stringify({
    ok:false,
    projectId:requested,
    reason:'WAIT_READY_TIMEOUT',
    build:WATER_QR_AUTO_V20.BUILD
  }));
}

/**
 * Chuẩn hóa module QR. R5 chỉ đảm bảo 01 trigger bảo trì Registry + backfill dự án vừa tạo.
 */
function CAI_DAT_QR_AUTO_V20() {
  const maintenance = waterQrEnsureRegistryMaintenanceV20_();
  let current;
  try {
    current = waterQrBackfillCreateResultV20_();
  } catch (e) {
    current = {ok:false, error:String(e && e.message ? e.message : e)};
  }

  const out = {
    ok: !!(maintenance && maintenance.ok) && !!(current && current.ok),
    triggerMode: 'SHARED_ONE_TRIGGER_PER_PROJECT',
    registryMaintenance: maintenance,
    currentProject: current,
    build: WATER_QR_AUTO_V20.BUILD
  };
  Logger.log('QR_AUTO_SETUP=' + JSON.stringify(out));
  return out;
}

/** Backfill riêng dự án vừa tạo. Không tạo trigger dự án. */
function CAP_NHAT_QR_DU_AN_VUA_TAO_V20() {
  const result = waterQrBackfillCreateResultV20_();
  Logger.log('QR_BACKFILL=' + JSON.stringify(result));
  return result;
}

/**
 * Chạy 01 lần sau khi cập nhật R5.
 * - Xóa trigger cũ dành riêng cho danh mục/xác nhận/QR.
 * - Giữ nguyên trigger tạo dự án Registry và trigger AI/time-driven khác.
 * - Tạo đúng 01 waterProjectOnEditV20_ cho mỗi dự án còn hoạt động trong Registry.
 * - Tạo đúng 01 trigger bảo trì Registry cho các dự án tạo sau này.
 */
function CHUYEN_TRIGGER_DU_AN_SANG_GOP_V20() {
  const regSS = SpreadsheetApp.openById(WATER_QR_AUTO_V20.REGISTRY_ID);
  const sh = regSS.getSheetByName(WATER_QR_AUTO_V20.REGISTRY_TAB);
  if (!sh) throw new Error('Không có sheet PROJECTS trong Registry.');

  const rows = sh.getLastRow() >= 2
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 6).getDisplayValues()
    : [];

  const projectSheetIds = [];
  const seen = {};
  rows.forEach(function(r) {
    const projectId = waterQrNormalizeProjectIdV20_(r[0]);
    const sheetId = String(r[2] || '').trim();
    const status = String(r[5] || '').trim().toUpperCase();
    if (!projectId || !sheetId || status === 'ARCHIVED') return;
    if (!seen[sheetId]) {
      seen[sheetId] = projectId;
      projectSheetIds.push(sheetId);
    }
  });

  const managedProjectHandlers = {
    'xuLyOnEditDanhMucProject_': true,
    'xuLyXacNhanKiemTraProject_': true,
    'waterQrCatalogOnEditV20_': true,
    'waterProjectOnEditV20_': true
  };

  const before = ScriptApp.getProjectTriggers();
  let deleted = 0;
  before.forEach(function(t) {
    const handler = t.getHandlerFunction();
    if (!managedProjectHandlers[handler] && handler !== 'waterQrRegistryOnEditV20_') return;
    try {
      ScriptApp.deleteTrigger(t);
      deleted++;
    } catch (_) {}
  });

  const created = [];
  const errors = [];
  projectSheetIds.forEach(function(sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      ScriptApp.newTrigger(WATER_QR_AUTO_V20.SHARED_HANDLER)
        .forSpreadsheet(ss)
        .onEdit()
        .create();
      created.push({projectId: seen[sheetId], sheetId: sheetId});
    } catch (e) {
      errors.push({
        projectId: seen[sheetId] || '',
        sheetId: sheetId,
        error: String(e && e.message ? e.message : e)
      });
    }
  });

  const maintenance = waterQrEnsureRegistryMaintenanceV20_();
  const audit = waterQrAuditSharedTriggersV20_();
  const out = {
    ok: errors.length === 0 && maintenance.ok && audit.ok,
    deletedOldTriggers: deleted,
    activeProjects: projectSheetIds.length,
    createdSharedTriggers: created.length,
    registryMaintenance: maintenance,
    errors: errors,
    audit: audit,
    build: WATER_QR_AUTO_V20.BUILD
  };
  Logger.log('PROJECT_TRIGGER_MIGRATION=' + JSON.stringify(out));
  return out;
}

/** Kiểm tra trigger gộp, không thay đổi dữ liệu. */
function KIEM_TRA_TRIGGER_GOP_V20() {
  const out = waterQrAuditSharedTriggersV20_();
  Logger.log('PROJECT_TRIGGER_AUDIT=' + JSON.stringify(out));
  return out;
}

function waterQrConvertSingleProjectTriggersV20_(sheetId, projectId) {
  const sid = String(sheetId || '').trim();
  if (!sid) return {ok:false, error:'Thiếu SHEET_ID.'};

  const managed = {
    'xuLyOnEditDanhMucProject_': true,
    'xuLyXacNhanKiemTraProject_': true,
    'waterQrCatalogOnEditV20_': true,
    'waterProjectOnEditV20_': true
  };

  let deleted = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    const handler = t.getHandlerFunction();
    if (!managed[handler]) return;
    let sourceId = '';
    try { sourceId = String(t.getTriggerSourceId() || ''); } catch (_) {}
    if (sourceId !== sid) return;
    try {
      ScriptApp.deleteTrigger(t);
      deleted++;
    } catch (_) {}
  });

  try {
    const ss = SpreadsheetApp.openById(sid);
    ScriptApp.newTrigger(WATER_QR_AUTO_V20.SHARED_HANDLER)
      .forSpreadsheet(ss)
      .onEdit()
      .create();
    return {ok:true, projectId:projectId || '', sheetId:sid, deleted:deleted, created:1};
  } catch (e) {
    return {
      ok:false,
      projectId:projectId || '',
      sheetId:sid,
      deleted:deleted,
      created:0,
      error:String(e && e.message ? e.message : e)
    };
  }
}

function waterQrEnsureRegistryMaintenanceV20_() {
  const regSS = SpreadsheetApp.openById(WATER_QR_AUTO_V20.REGISTRY_ID);
  const matches = [];

  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() !== WATER_QR_AUTO_V20.REGISTRY_MAINT_HANDLER) return;
    let sourceId = '';
    try { sourceId = String(t.getTriggerSourceId() || ''); } catch (_) {}
    if (sourceId === WATER_QR_AUTO_V20.REGISTRY_ID) matches.push(t);
  });

  for (let i = 1; i < matches.length; i++) {
    try { ScriptApp.deleteTrigger(matches[i]); } catch (_) {}
  }

  if (matches.length) {
    return {ok:true, created:false, existing:true, count:1};
  }

  try {
    ScriptApp.newTrigger(WATER_QR_AUTO_V20.REGISTRY_MAINT_HANDLER)
      .forSpreadsheet(regSS)
      .onEdit()
      .create();
    return {ok:true, created:true, existing:false, count:1};
  } catch (e) {
    return {ok:false, created:false, existing:false, count:0, error:String(e && e.message ? e.message : e)};
  }
}

function waterQrAuditSharedTriggersV20_() {
  const regSS = SpreadsheetApp.openById(WATER_QR_AUTO_V20.REGISTRY_ID);
  const sh = regSS.getSheetByName(WATER_QR_AUTO_V20.REGISTRY_TAB);
  if (!sh) throw new Error('Không có sheet PROJECTS trong Registry.');

  const rows = sh.getLastRow() >= 2
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 6).getDisplayValues()
    : [];

  const active = {};
  rows.forEach(function(r) {
    const projectId = waterQrNormalizeProjectIdV20_(r[0]);
    const sheetId = String(r[2] || '').trim();
    const status = String(r[5] || '').trim().toUpperCase();
    if (!projectId || !sheetId || status === 'ARCHIVED') return;
    active[sheetId] = projectId;
  });

  const counts = {};
  const unexpectedOld = [];
  let maintenanceCount = 0;

  ScriptApp.getProjectTriggers().forEach(function(t) {
    const handler = t.getHandlerFunction();
    let sourceId = '';
    try { sourceId = String(t.getTriggerSourceId() || ''); } catch (_) {}

    if (handler === WATER_QR_AUTO_V20.SHARED_HANDLER && active[sourceId]) {
      counts[sourceId] = (counts[sourceId] || 0) + 1;
    }

    if (
      handler === 'xuLyOnEditDanhMucProject_' ||
      handler === 'xuLyXacNhanKiemTraProject_' ||
      handler === 'waterQrCatalogOnEditV20_' ||
      handler === 'waterQrRegistryOnEditV20_'
    ) {
      unexpectedOld.push({handler:handler, sourceId:sourceId});
    }

    if (
      handler === WATER_QR_AUTO_V20.REGISTRY_MAINT_HANDLER &&
      sourceId === WATER_QR_AUTO_V20.REGISTRY_ID
    ) {
      maintenanceCount++;
    }
  });

  const missing = [];
  const duplicates = [];
  Object.keys(active).forEach(function(sheetId) {
    const n = counts[sheetId] || 0;
    if (n === 0) missing.push({projectId:active[sheetId], sheetId:sheetId});
    if (n > 1) duplicates.push({projectId:active[sheetId], sheetId:sheetId, count:n});
  });

  const totalTriggers = ScriptApp.getProjectTriggers().length;
  return {
    ok: missing.length === 0 && duplicates.length === 0 && unexpectedOld.length === 0 && maintenanceCount === 1,
    activeProjects: Object.keys(active).length,
    sharedTriggerCount: Object.keys(counts).reduce(function(sum, k) { return sum + counts[k]; }, 0),
    registryMaintenanceTriggerCount: maintenanceCount,
    missing: missing,
    duplicates: duplicates,
    oldProjectTriggersRemaining: unexpectedOld,
    totalScriptTriggers: totalTriggers,
    build: WATER_QR_AUTO_V20.BUILD
  };
}

/** Kiểm tra QR dự án vừa tạo. */
function KIEM_TRA_QR_DU_AN_VUA_TAO_V20() {
  const create = waterQrReadCreateResultV20_();
  if (!create.projectId || !create.sheetId) {
    throw new Error('TAO_DU_AN chưa có PROJECT_ID/SHEET_ID của dự án vừa tạo.');
  }

  const ss = SpreadsheetApp.openById(create.sheetId);
  const sh = ss.getSheetByName(WATER_QR_AUTO_V20.CATALOG_SHEET);
  if (!sh) throw new Error('Dự án thiếu DANH_MUC_DONG_HO.');

  const last = waterQrLastCatalogRowV20_(sh);
  let meterCount = 0;
  let qrCount = 0;
  let wrongProject = 0;

  if (last >= 3) {
    const data = sh.getRange(3, 5, last - 2, 3).getDisplayValues();
    data.forEach(function(r) {
      const meter = String(r[0] || '').trim();
      const qr = String(r[2] || '').trim();
      if (meter) meterCount++;
      if (qr) {
        qrCount++;
        if (qr.indexOf('|PROJECT=' + create.projectId + '|') < 0) wrongProject++;
      }
    });
  }

  const result = {
    ok: meterCount > 0 && meterCount === qrCount && wrongProject === 0,
    projectId: create.projectId,
    meterCount: meterCount,
    qrCount: qrCount,
    wrongProject: wrongProject,
    build: WATER_QR_AUTO_V20.BUILD
  };
  Logger.log('QR_AUTO_PRECHECK=' + JSON.stringify(result));
  return result;
}

/** QR chỉ phản ứng khi edit B:F của DANH_MUC_DONG_HO từ dòng 3. */
function waterQrCatalogOnEditV20_(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== WATER_QR_AUTO_V20.CATALOG_SHEET) return;

  const firstRow = e.range.getRow();
  const lastRow = firstRow + e.range.getNumRows() - 1;
  if (lastRow < 3) return;

  const firstCol = e.range.getColumn();
  const lastCol = firstCol + e.range.getNumColumns() - 1;
  if (lastCol < 2 || firstCol > 6) return;

  const ss = sh.getParent();
  const projectId = waterQrProjectIdFromSheetV20_(ss);
  if (!projectId) return;

  SpreadsheetApp.flush();
  const start = Math.max(3, firstRow);
  waterQrRefreshRowsV20_(ss, projectId, start, lastRow - start + 1);
}

function waterQrBackfillCreateResultV20_() {
  const create = waterQrReadCreateResultV20_();
  if (!create.projectId || !create.sheetId) {
    throw new Error('TAO_DU_AN chưa có PROJECT_ID/SHEET_ID của dự án vừa tạo.');
  }

  const ss = SpreadsheetApp.openById(create.sheetId);
  const realProjectId = waterQrProjectIdFromSheetV20_(ss);
  if (realProjectId !== create.projectId) {
    throw new Error('PROJECT_ID trong Sheet không khớp TAO_DU_AN.');
  }

  const refreshed = waterQrRefreshAllV20_(ss, create.projectId);
  return {
    ok: true,
    projectId: create.projectId,
    sheetId: create.sheetId,
    qrUpdated: refreshed.updated,
    lastRow: refreshed.lastRow,
    triggerMode: 'SHARED_ONE_TRIGGER_PER_PROJECT',
    build: WATER_QR_AUTO_V20.BUILD
  };
}

function waterQrReadCreateResultV20_() {
  const ss = SpreadsheetApp.openById(WATER_QR_AUTO_V20.REGISTRY_ID);
  const sh = ss.getSheetByName(WATER_QR_AUTO_V20.CREATE_TAB);
  if (!sh) throw new Error('Không có sheet ' + WATER_QR_AUTO_V20.CREATE_TAB + '.');
  return {
    status: String(sh.getRange('E2').getDisplayValue() || '').trim(),
    projectId: waterQrNormalizeProjectIdV20_(sh.getRange('E3').getDisplayValue()),
    sheetId: String(sh.getRange('E4').getDisplayValue() || '').trim()
  };
}

function waterQrRefreshAllV20_(ss, projectId) {
  const sh = ss.getSheetByName(WATER_QR_AUTO_V20.CATALOG_SHEET);
  if (!sh) throw new Error('Dự án thiếu DANH_MUC_DONG_HO.');
  const last = waterQrLastCatalogRowV20_(sh);
  if (last < 3) return {updated:0, lastRow:last};
  return waterQrRefreshRowsV20_(ss, projectId, 3, last - 2);
}

function waterQrLastCatalogRowV20_(sh) {
  const max = Math.min(4002, sh.getMaxRows());
  if (max < 3) return 2;
  const data = sh.getRange(3, 2, max - 2, 4).getDisplayValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].some(function(v) { return String(v || '').trim() !== ''; })) return i + 3;
  }
  return 2;
}

function waterQrRefreshRowsV20_(ss, projectId, startRow, numRows) {
  const sh = ss.getSheetByName(WATER_QR_AUTO_V20.CATALOG_SHEET);
  if (!sh) throw new Error('Dự án thiếu DANH_MUC_DONG_HO.');
  if (numRows <= 0) return {updated:0, lastRow:startRow - 1};

  const id = waterQrNormalizeProjectIdV20_(projectId || waterQrProjectIdFromSheetV20_(ss));
  if (!id) throw new Error('Thiếu PROJECT_ID để tạo QR.');
  const appUrl = WATER_QR_AUTO_V20.APP_BASE_URL + '?project=' + encodeURIComponent(id);

  const data = sh.getRange(startRow, 2, numRows, 4).getDisplayValues();
  const colG = [];
  const colH = [];
  const colI = [];
  const colJ = [];
  let updated = 0;

  data.forEach(function(r) {
    const toa = String(r[0] || '').trim();
    const tang = String(r[1] || '').trim();
    const can = String(r[2] || '').trim();
    let meter = String(r[3] || '').trim().toUpperCase();

    if (!meter && toa && tang && can) {
      meter = (toa + tang + can).toUpperCase().replace(/[^A-Z0-9]/g, '') + 'N01';
    }

    if (!toa || !tang || !can || !meter) {
      colG.push(['']);
      colH.push([waterQrEmptyRichTextV20_()]);
      colI.push(['']);
      colJ.push([waterQrEmptyRichTextV20_()]);
      return;
    }

    const token = waterQrProjectTokenCompatV20_(id, meter);
    const payload = 'WATERQR|V=5|PROJECT=' + id + '|MADH=' + meter + '|TOKEN=' + token;
    const qrUrl = 'https://quickchart.io/qr?size=300&margin=1&text=' + encodeURIComponent(payload);

    colG.push([payload]);
    colH.push([waterQrRichLinkV20_('MỞ / IN QR', qrUrl)]);
    colI.push([appUrl]);
    colJ.push([waterQrRichLinkV20_('MỞ / IN QR WEB', qrUrl)]);
    updated++;
  });

  sh.getRange(startRow, 7, numRows, 1).setValues(colG);
  sh.getRange(startRow, 8, numRows, 1).setRichTextValues(colH);
  sh.getRange(startRow, 9, numRows, 1).setValues(colI);
  sh.getRange(startRow, 10, numRows, 1).setRichTextValues(colJ);
  SpreadsheetApp.flush();
  return {updated:updated, lastRow:startRow + numRows - 1};
}

function waterQrProjectTokenCompatV20_(projectId, meter) {
  const id = waterQrNormalizeProjectIdV20_(projectId);
  const ma = String(meter || '').trim().toUpperCase();
  if (!id || !ma) throw new Error('Thiếu PROJECT_ID hoặc mã đồng hồ để tạo QR.');

  let legacyError = '';
  if (typeof waterProjectToken_ === 'function') {
    try {
      const legacyToken = String(waterProjectToken_(id, ma) || '').trim();
      if (legacyToken) return legacyToken;
    } catch (e) {
      legacyError = String(e && e.message ? e.message : e);
    }
  }

  const props = PropertiesService.getScriptProperties();
  const secret = String(
    props.getProperty('WATER_WEBAPP_SECRET') ||
    props.getProperty('WATER_SECRET') ||
    ''
  ).trim();

  if (!secret) {
    throw new Error('Thiếu WATER_WEBAPP_SECRET để tạo QR bảo mật.' + (legacyError ? ' Helper cũ lỗi: ' + legacyError : ''));
  }

  const bytes = Utilities.computeHmacSha256Signature(id + '|' + ma, secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function waterQrProjectIdFromSheetV20_(ss) {
  const sh = ss.getSheetByName(WATER_QR_AUTO_V20.INFO_SHEET);
  if (!sh) return '';
  return waterQrNormalizeProjectIdV20_(sh.getRange('A2').getDisplayValue());
}

function waterQrNormalizeProjectIdV20_(v) {
  return String(v || '').trim().toUpperCase().replace(/\s+/g, '_');
}

function waterQrRichLinkV20_(text, url) {
  return SpreadsheetApp.newRichTextValue()
    .setText(String(text || ''))
    .setLinkUrl(String(url || ''))
    .build();
}

function waterQrEmptyRichTextV20_() {
  return SpreadsheetApp.newRichTextValue().setText('').build();
}
