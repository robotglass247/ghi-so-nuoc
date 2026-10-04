/**
 * M&E WATER V20 - QR PROJECT AUTO
 *
 * Mục tiêu:
 * - Sửa lỗi dự án nhân bản có DANH_MUC_DONG_HO nhưng cột G:J chưa sinh QR.
 * - Sinh QR V5 theo đúng PROJECT_ID + Mã đồng hồ + HMAC token.
 * - Hỗ trợ dán/import nhiều dòng; có hàm backfill cho dự án vừa tạo.
 * - Không cần deploy Web App.
 *
 * Cột DANH_MUC_DONG_HO:
 * B Tòa | C Tầng | D Căn | E Mã đồng hồ | F Vị trí
 * G Nội dung QR | H Mã QR | I Link Web App | J MỞ / IN QR WEB
 */

const WATER_QR_AUTO_V20 = Object.freeze({
  REGISTRY_ID: '1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0',
  CREATE_TAB: 'TAO_DU_AN',
  CREATE_CHECKBOX_A1: 'B15',
  CATALOG_SHEET: 'DANH_MUC_DONG_HO',
  INFO_SHEET: 'THONG_TIN_DU_AN',
  APP_BASE_URL: 'https://robotglass247.github.io/ghi-so-nuoc/r1135-v20-direct.html',
  PROJECT_HANDLER: 'waterQrCatalogOnEditV20_',
  REGISTRY_HANDLER: 'waterQrRegistryOnEditV20_',
  BUILD: 'V20_QR_PROJECT_AUTO_20261004_R2'
});

function CAI_DAT_QR_AUTO_V20() {
  const regSS = SpreadsheetApp.openById(WATER_QR_AUTO_V20.REGISTRY_ID);
  waterQrEnsureTriggerV20_(WATER_QR_AUTO_V20.REGISTRY_HANDLER, regSS);

  let current = null;
  try {
    current = waterQrBackfillCreateResultV20_();
  } catch (e) {
    current = {ok:false, error:String(e && e.message ? e.message : e)};
  }

  const out = {
    ok: !!(current && current.ok),
    registryTrigger: true,
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
  waterQrRefreshRowsV20_(
    ss,
    projectId,
    Math.max(3, firstRow),
    lastRow - Math.max(3, firstRow) + 1
  );
}

function waterQrRegistryOnEditV20_(e) {
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
      const projectSS = SpreadsheetApp.openById(sheetId);
      waterQrEnsureTriggerV20_(WATER_QR_AUTO_V20.PROJECT_HANDLER, projectSS);
      waterQrRefreshAllV20_(projectSS, resultId);
      Logger.log('QR_AUTO_NEW_PROJECT=' + JSON.stringify({ok:true, projectId:resultId, sheetId:sheetId}));
      return;
    }

    if (status === 'ERROR' && (!resultId || resultId === requested)) {
      Logger.log('QR_AUTO_NEW_PROJECT=' + JSON.stringify({ok:false, projectId:requested, reason:'CREATE_ERROR'}));
      return;
    }
    Utilities.sleep(1000);
  }

  Logger.log('QR_AUTO_NEW_PROJECT=' + JSON.stringify({ok:false, projectId:requested, reason:'WAIT_READY_TIMEOUT'}));
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

  waterQrEnsureTriggerV20_(WATER_QR_AUTO_V20.PROJECT_HANDLER, ss);
  const refreshed = waterQrRefreshAllV20_(ss, create.projectId);
  return {
    ok: true,
    projectId: create.projectId,
    sheetId: create.sheetId,
    qrUpdated: refreshed.updated,
    lastRow: refreshed.lastRow,
    trigger: 'OK',
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
    if (data[i].some(function(v){return String(v || '').trim() !== '';})) return i + 3;
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
      meter = (toa + tang + can)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') + 'N01';
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
    throw new Error(
      'Thiếu WATER_WEBAPP_SECRET để tạo QR bảo mật.' +
      (legacyError ? ' Helper cũ lỗi: ' + legacyError : '')
    );
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

function waterQrEnsureTriggerV20_(handler, ss) {
  const exists = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === handler && t.getTriggerSourceId() === ss.getId();
  });
  if (!exists) {
    ScriptApp.newTrigger(handler).forSpreadsheet(ss).onEdit().create();
  }
  return {ok:true, created:!exists, handler:handler, sheetId:ss.getId()};
}
