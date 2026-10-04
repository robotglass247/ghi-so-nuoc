/**
 * M&E WATER V20 - QR PROJECT AUTO
 * R6: trigger gộp chỉ áp dụng cho dự án V20 đang READY.
 *
 * Mục tiêu:
 * - Mỗi dự án V20 chỉ dùng 01 trigger onEdit gộp.
 * - Không tạo trigger QR riêng.
 * - Loại các dự án legacy V1/PILOT/ARCHIVED khỏi migration để tránh lỗi quyền và tốn quota.
 * - Giữ 01 trigger Registry maintenance để dự án V20 mới tự chuyển về trigger gộp sau khi READY.
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
  ACTIVE_VERSION: 'V20',
  ACTIVE_STATUS: 'READY',
  BUILD: 'V20_QR_PROJECT_AUTO_20261004_R6_V20_ONLY_QUOTA_SAFE'
});

function waterProjectOnEditV20_(e) {
  let firstError = null;

  if (typeof xuLyOnEditDanhMucProject_ === 'function') {
    try { xuLyOnEditDanhMucProject_(e); }
    catch (err1) {
      firstError = firstError || err1;
      Logger.log('PROJECT_ONEDIT_DANHMUC_ERROR=' + String(err1 && err1.message ? err1.message : err1));
    }
  }

  if (typeof xuLyXacNhanKiemTraProject_ === 'function') {
    try { xuLyXacNhanKiemTraProject_(e); }
    catch (err2) {
      firstError = firstError || err2;
      Logger.log('PROJECT_ONEDIT_XACNHAN_ERROR=' + String(err2 && err2.message ? err2.message : err2));
    }
  }

  try { waterQrCatalogOnEditV20_(e); }
  catch (err3) {
    firstError = firstError || err3;
    Logger.log('PROJECT_ONEDIT_QR_ERROR=' + String(err3 && err3.message ? err3.message : err3));
  }

  if (firstError) throw firstError;
}

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
      let refreshed = {updated:0, lastRow:2};
      try {
        const projectSS = SpreadsheetApp.openById(sheetId);
        refreshed = waterQrRefreshAllV20_(projectSS, resultId);
      } catch (qrErr) {
        Logger.log('QR_AUTO_NEW_PROJECT_BACKFILL_ERROR=' + String(qrErr && qrErr.message ? qrErr.message : qrErr));
      }

      Logger.log('QR_AUTO_NEW_PROJECT=' + JSON.stringify({
        ok: !!triggerResult.ok,
        projectId: resultId,
        sheetId: sheetId,
        trigger: triggerResult,
        qrUpdated: refreshed.updated || 0,
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

function CAI_DAT_QR_AUTO_V20() {
  const migration = CHUYEN_TRIGGER_DU_AN_SANG_GOP_V20();
  let current;
  try { current = waterQrBackfillCreateResultV20_(); }
  catch (e) { current = {ok:false, error:String(e && e.message ? e.message : e)}; }

  const out = {
    ok: !!migration.ok && !!current.ok,
    triggerMode: 'ONE_SHARED_TRIGGER_PER_V20_READY_PROJECT',
    migration: migration,
    currentProject: current,
    build: WATER_QR_AUTO_V20.BUILD
  };
  Logger.log('QR_AUTO_SETUP=' + JSON.stringify(out));
  return out;
}

function CAP_NHAT_QR_DU_AN_VUA_TAO_V20() {
  const result = waterQrBackfillCreateResultV20_();
  Logger.log('QR_BACKFILL=' + JSON.stringify(result));
  return result;
}

function CHUYEN_TRIGGER_DU_AN_SANG_GOP_V20() {
  const active = waterQrActiveV20Projects_();
  const managed = waterQrManagedHandlersV20_();

  let deleted = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    const handler = t.getHandlerFunction();
    if (!managed[handler] && handler !== WATER_QR_AUTO_V20.REGISTRY_MAINT_HANDLER && handler !== 'waterQrRegistryOnEditV20_') return;
    try {
      ScriptApp.deleteTrigger(t);
      deleted++;
    } catch (_) {}
  });

  const created = [];
  const errors = [];
  active.forEach(function(p) {
    try {
      const ss = SpreadsheetApp.openById(p.sheetId);
      ScriptApp.newTrigger(WATER_QR_AUTO_V20.SHARED_HANDLER)
        .forSpreadsheet(ss)
        .onEdit()
        .create();
      created.push({projectId:p.projectId, sheetId:p.sheetId});
    } catch (e) {
      errors.push({
        projectId:p.projectId,
        sheetId:p.sheetId,
        error:String(e && e.message ? e.message : e)
      });
    }
  });

  const maintenance = waterQrEnsureRegistryMaintenanceV20_();
  const audit = waterQrAuditSharedTriggersV20_();
  const out = {
    ok: errors.length === 0 && maintenance.ok && audit.ok,
    deletedManagedTriggers: deleted,
    activeV20Projects: active.length,
    createdSharedTriggers: created.length,
    registryMaintenance: maintenance,
    errors: errors,
    audit: audit,
    build: WATER_QR_AUTO_V20.BUILD
  };
  Logger.log('PROJECT_TRIGGER_MIGRATION=' + JSON.stringify(out));
  return out;
}

function KIEM_TRA_TRIGGER_GOP_V20() {
  const out = waterQrAuditSharedTriggersV20_();
  Logger.log('PROJECT_TRIGGER_AUDIT=' + JSON.stringify(out));
  return out;
}

function waterQrActiveV20Projects_() {
  const regSS = SpreadsheetApp.openById(WATER_QR_AUTO_V20.REGISTRY_ID);
  const sh = regSS.getSheetByName(WATER_QR_AUTO_V20.REGISTRY_TAB);
  if (!sh) throw new Error('Không có sheet PROJECTS trong Registry.');

  const rows = sh.getLastRow() >= 2
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 7).getDisplayValues()
    : [];

  const out = [];
  const seen = {};
  rows.forEach(function(r) {
    const projectId = waterQrNormalizeProjectIdV20_(r[0]);
    const sheetId = String(r[2] || '').trim();
    const status = String(r[5] || '').trim().toUpperCase();
    const version = String(r[6] || '').trim().toUpperCase();

    if (!projectId || !sheetId) return;
    if (version !== WATER_QR_AUTO_V20.ACTIVE_VERSION) return;
    if (status !== WATER_QR_AUTO_V20.ACTIVE_STATUS) return;
    if (seen[sheetId]) return;

    seen[sheetId] = true;
    out.push({projectId:projectId, sheetId:sheetId});
  });
  return out;
}

function waterQrManagedHandlersV20_() {
  return {
    'xuLyOnEditDanhMucProject_': true,
    'xuLyXacNhanKiemTraProject_': true,
    'waterQrCatalogOnEditV20_': true,
    'waterProjectOnEditV20_': true
  };
}

function waterQrConvertSingleProjectTriggersV20_(sheetId, projectId) {
  const sid = String(sheetId || '').trim();
  if (!sid) return {ok:false, error:'Thiếu SHEET_ID.'};

  const managed = waterQrManagedHandlersV20_();
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

  const existing = ScriptApp.getProjectTriggers().some(function(t) {
    if (t.getHandlerFunction() !== WATER_QR_AUTO_V20.SHARED_HANDLER) return false;
    try { return String(t.getTriggerSourceId() || '') === sid; }
    catch (_) { return false; }
  });
  if (existing) {
    return {ok:true, projectId:projectId || '', sheetId:sid, deleted:deleted, created:0, existing:true};
  }

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
  const activeList = waterQrActiveV20Projects_();
  const active = {};
  activeList.forEach(function(p) { active[p.sheetId] = p.projectId; });

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

    if (handler === WATER_QR_AUTO_V20.REGISTRY_MAINT_HANDLER && sourceId === WATER_QR_AUTO_V20.REGISTRY_ID) {
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
    activeV20Projects: activeList.length,
    sharedTriggerCount: Object.keys(counts).reduce(function(s, k){ return s + counts[k]; }, 0),
    registryMaintenanceTriggerCount: maintenanceCount,
    missing: missing,
    duplicates: duplicates,
    oldProjectTriggersRemaining: unexpectedOld,
    totalScriptTriggers: totalTriggers,
    spareTriggerSlotsApprox: Math.max(0, 20 - totalTriggers),
    build: WATER_QR_AUTO_V20.BUILD
  };
}

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
  const startRow = Math.max(3, firstRow);
  const count = lastRow - startRow + 1;
  if (count > 0) waterQrRefreshRowsV20_(ss, projectId, startRow, count);
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
    ok:true,
    projectId:create.projectId,
    sheetId:create.sheetId,
    qrUpdated:refreshed.updated,
    lastRow:refreshed.lastRow,
    build:WATER_QR_AUTO_V20.BUILD
  };
}

function waterQrReadCreateResultV20_() {
  const ss = SpreadsheetApp.openById(WATER_QR_AUTO_V20.REGISTRY_ID);
  const sh = ss.getSheetByName(WATER_QR_AUTO_V20.CREATE_TAB);
  if (!sh) throw new Error('Không có sheet ' + WATER_QR_AUTO_V20.CREATE_TAB + '.');
  return {
    status:String(sh.getRange('E2').getDisplayValue() || '').trim(),
    projectId:waterQrNormalizeProjectIdV20_(sh.getRange('E3').getDisplayValue()),
    sheetId:String(sh.getRange('E4').getDisplayValue() || '').trim()
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
    if (data[i].some(function(v){ return String(v || '').trim() !== ''; })) return i + 3;
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
