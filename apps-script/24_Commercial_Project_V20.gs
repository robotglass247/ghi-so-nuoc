/**
 * M&E WATER V20 - COMMERCIAL PROJECT HELPERS
 * - Kiểm tra Project/Photo folder đúng dự án
 * - Tự backfill PWA_INSTALL_URL ở Registry
 * - Tự kiểm tra cách ly dữ liệu bằng trigger định kỳ
 * - Chia sẻ CHỈ dữ liệu dự án cho khách khi cần
 *
 * Không tự chuyển ownership. Ownership chỉ chuyển khi có quyết định riêng.
 */

const V20_COMMERCIAL = Object.freeze({
  REGISTRY_ID: '1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0',
  REGISTRY_TAB: 'PROJECTS',
  PWA_INSTALL_BASE_URL: 'https://robotglass247.github.io/ghi-so-nuoc/install.html',
  PWA_HEADER: 'PWA_INSTALL_URL',
  SECURITY_HEADER: 'SECURITY_STATUS',
  SECURITY_MESSAGE_HEADER: 'SECURITY_MESSAGE',
  MAINTENANCE_HANDLER: 'V20_COMMERCIAL_MAINTENANCE'
});

function CAI_DAT_COMMERCIAL_V20() {
  v20CommercialEnsureTrigger_();
  const pwa = V20_BACKFILL_PWA_INSTALL_URLS();
  const security = V20_COMMERCIAL_MAINTENANCE();
  Logger.log(JSON.stringify({ ok: true, pwa: pwa, security: security }));
  return { ok: true, pwa: pwa, security: security };
}

function v20CommercialEnsureTrigger_() {
  const handler = V20_COMMERCIAL.MAINTENANCE_HANDLER;
  const exists = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === handler;
  });
  if (!exists) {
    ScriptApp.newTrigger(handler)
      .timeBased()
      .everyMinutes(10)
      .create();
  }
}

function v20CommercialInstallUrl_(projectId) {
  const id = String(projectId || '').trim().toUpperCase();
  if (!id) return '';
  return V20_COMMERCIAL.PWA_INSTALL_BASE_URL + '?project=' + encodeURIComponent(id);
}

function v20CommercialEnsureRegistryColumns_() {
  const ss = SpreadsheetApp.openById(V20_COMMERCIAL.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_COMMERCIAL.REGISTRY_TAB);
  if (!sh) throw new Error('Không có sheet Registry PROJECTS.');

  function ensure(name) {
    const lastCol = Math.max(1, sh.getLastColumn());
    const headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    let col = headers.findIndex(function(x) {
      return String(x || '').trim() === name;
    }) + 1;
    if (!col) {
      col = lastCol + 1;
      sh.getRange(1, col).setValue(name);
    }
    return col;
  }

  return {
    sh: sh,
    pwaCol: ensure(V20_COMMERCIAL.PWA_HEADER),
    securityCol: ensure(V20_COMMERCIAL.SECURITY_HEADER),
    securityMessageCol: ensure(V20_COMMERCIAL.SECURITY_MESSAGE_HEADER)
  };
}

function v20CommercialEnsureRegistryColumn_() {
  const info = v20CommercialEnsureRegistryColumns_();
  return { sh: info.sh, col: info.pwaCol };
}

function V20_BACKFILL_PWA_INSTALL_URLS() {
  const info = v20CommercialEnsureRegistryColumns_();
  const sh = info.sh;
  const col = info.pwaCol;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, updated: 0 };

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  const values = sh.getRange(2, col, lastRow - 1, 1).getDisplayValues();
  let updated = 0;

  ids.forEach(function(r, i) {
    const id = String(r[0] || '').trim().toUpperCase();
    if (!id) return;
    if (String(values[i][0] || '').trim()) return;
    sh.getRange(i + 2, col).setValue(v20CommercialInstallUrl_(id));
    updated++;
  });

  Logger.log('PWA_INSTALL_URL updated: ' + updated);
  return { ok: true, updated: updated };
}

function V20_COMMERCIAL_MAINTENANCE() {
  const info = v20CommercialEnsureRegistryColumns_();
  const sh = info.sh;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, checked: 0, errors: 0 };

  const data = sh.getRange(2, 1, lastRow - 1, Math.max(20, sh.getLastColumn())).getDisplayValues();
  let checked = 0;
  let errors = 0;

  data.forEach(function(r, i) {
    const row = i + 2;
    const projectId = String(r[0] || '').trim().toUpperCase();
    const version = String(r[6] || '').trim().toUpperCase();
    const projectFolderId = String(r[9] || '').trim();
    const photoFolderId = String(r[10] || '').trim();

    if (!projectId) return;

    // Các dự án cũ chưa có cấu trúc folder V20 thì không đánh lỗi.
    const shouldCheck = version === 'V20' || (projectFolderId && photoFolderId);
    if (!shouldCheck) return;

    checked++;
    let result;
    try {
      result = V20_KIEM_TRA_CACH_LY_DU_AN(projectId);
    } catch (e) {
      result = { ok: false, errors: [String(e && e.message ? e.message : e)] };
    }

    if (result.ok) {
      sh.getRange(row, info.securityCol).setValue('OK');
      sh.getRange(row, info.securityMessageCol).setValue('');
    } else {
      errors++;
      sh.getRange(row, info.securityCol).setValue('ERROR');
      sh.getRange(row, info.securityMessageCol).setValue((result.errors || []).join(' | '));
    }

    const pwaCell = sh.getRange(row, info.pwaCol);
    if (!String(pwaCell.getDisplayValue() || '').trim()) {
      pwaCell.setValue(v20CommercialInstallUrl_(projectId));
    }
  });

  const out = { ok: errors === 0, checked: checked, errors: errors };
  Logger.log(JSON.stringify(out));
  return out;
}

function V20_KIEM_TRA_CACH_LY_DU_AN(projectId) {
  const id = String(projectId || '').trim().toUpperCase();
  if (!id) throw new Error('Thiếu PROJECT_ID.');

  const ss = SpreadsheetApp.openById(V20_COMMERCIAL.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_COMMERCIAL.REGISTRY_TAB);
  const row = v20CommercialFindRegistryRow_(sh, id);
  if (!row) throw new Error('Không tìm thấy PROJECT_ID ' + id + ' trong Registry.');

  const r = sh.getRange(row, 1, 1, Math.max(20, sh.getLastColumn())).getDisplayValues()[0];
  const sheetId = String(r[2] || '').trim();
  const projectFolderId = String(r[9] || '').trim();
  const photoFolderId = String(r[10] || '').trim();
  const errors = [];

  if (!sheetId) errors.push('Thiếu SHEET_ID.');
  if (!projectFolderId) errors.push('Thiếu PROJECT_FOLDER_ID.');
  if (!photoFolderId) errors.push('Thiếu PHOTO_FOLDER_ID.');

  let projectFolder = null;
  let photoFolder = null;
  let file = null;

  try { projectFolder = DriveApp.getFolderById(projectFolderId); }
  catch (e) { errors.push('Không mở được PROJECT_FOLDER_ID.'); }

  try { photoFolder = DriveApp.getFolderById(photoFolderId); }
  catch (e) { errors.push('Không mở được PHOTO_FOLDER_ID.'); }

  try { file = DriveApp.getFileById(sheetId); }
  catch (e) { errors.push('Không mở được SHEET_ID.'); }

  if (projectFolder && photoFolder) {
    const parents = photoFolder.getParents();
    let correctParent = false;
    while (parents.hasNext()) {
      if (parents.next().getId() === projectFolderId) {
        correctParent = true;
        break;
      }
    }
    if (!correctParent) errors.push('PHOTO_FOLDER không nằm trong PROJECT_FOLDER của chính dự án.');
  }

  if (projectFolder && file) {
    const parents = file.getParents();
    let correctParent = false;
    while (parents.hasNext()) {
      if (parents.next().getId() === projectFolderId) {
        correctParent = true;
        break;
      }
    }
    if (!correctParent) errors.push('Google Sheet dự án không nằm trong PROJECT_FOLDER của chính dự án.');
  }

  const result = {
    ok: errors.length === 0,
    projectId: id,
    sheetId: sheetId,
    projectFolderId: projectFolderId,
    photoFolderId: photoFolderId,
    errors: errors
  };

  Logger.log(JSON.stringify(result));
  return result;
}

function V20_CHIA_SE_DU_LIEU_CHO_KHACH(projectId, customerEmail) {
  const id = String(projectId || '').trim().toUpperCase();
  const email = String(customerEmail || '').trim();
  if (!id) throw new Error('Thiếu PROJECT_ID.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Email khách hàng không hợp lệ.');
  }

  const check = V20_KIEM_TRA_CACH_LY_DU_AN(id);
  if (!check.ok) {
    throw new Error('Không chia sẻ vì dự án chưa cách ly đúng: ' + check.errors.join(' | '));
  }

  const ss = SpreadsheetApp.openById(V20_COMMERCIAL.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_COMMERCIAL.REGISTRY_TAB);
  const row = v20CommercialFindRegistryRow_(sh, id);
  const r = sh.getRange(row, 1, 1, Math.max(20, sh.getLastColumn())).getDisplayValues()[0];
  const sheetId = String(r[2] || '').trim();
  const projectFolderId = String(r[9] || '').trim();

  // Chia sẻ CHỈ folder dự án. File Sheet và folder ảnh nằm trong folder này.
  // MASTER, Registry và Apps Script trung tâm không được chia sẻ.
  DriveApp.getFolderById(projectFolderId).addEditor(email);

  Logger.log('Đã chia sẻ dữ liệu dự án ' + id + ' cho ' + email + ' với quyền Editor.');
  return {
    ok: true,
    projectId: id,
    customerEmail: email,
    sheetId: sheetId,
    projectFolderId: projectFolderId,
    permission: 'EDITOR'
  };
}

function v20CommercialFindRegistryRow_(sh, projectId) {
  if (!sh || sh.getLastRow() < 2) return 0;
  const found = sh.getRange(2, 1, sh.getLastRow() - 1, 1)
    .createTextFinder(projectId)
    .matchEntireCell(true)
    .matchCase(false)
    .findNext();
  return found ? found.getRow() : 0;
}

function TEST_COMMERCIAL_AUTO001() {
  const pwa = v20CommercialInstallUrl_('AUTO001');
  const isolation = V20_KIEM_TRA_CACH_LY_DU_AN('AUTO001');
  Logger.log(JSON.stringify({ pwa: pwa, isolation: isolation }));
}
