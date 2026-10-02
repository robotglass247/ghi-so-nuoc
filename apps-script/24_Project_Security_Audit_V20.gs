/**
 * M&E WATER V20 - PROJECT SECURITY/PWA AUDIT
 * Không thay logic nhân bản đang PASS.
 * Dùng để kiểm tra và chuẩn hóa metadata Registry cho từng dự án.
 */

const WATER_V20_AUDIT = Object.freeze({
  REGISTRY_ID: '1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0',
  REGISTRY_TAB: 'PROJECTS',
  PWA_BASE_URL: 'https://robotglass247.github.io/ghi-so-nuoc/install.html'
});

function WATER_AUDIT_PROJECT_V20(projectId) {
  const id = String(projectId || '').trim().toUpperCase();
  if (!id) throw new Error('Thiếu PROJECT_ID.');

  const reg = SpreadsheetApp.openById(WATER_V20_AUDIT.REGISTRY_ID);
  const sh = reg.getSheetByName(WATER_V20_AUDIT.REGISTRY_TAB);
  if (!sh) throw new Error('Không có sheet PROJECTS.');

  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Registry chưa có dự án.');

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  let row = 0;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim().toUpperCase() === id) {
      row = i + 2;
      break;
    }
  }
  if (!row) throw new Error('Không tìm thấy PROJECT_ID ' + id + '.');

  const vals = sh.getRange(row, 1, 1, 20).getDisplayValues()[0];
  const sheetId = String(vals[2] || '').trim();
  const projectFolderId = String(vals[9] || '').trim();
  const photoFolderId = String(vals[10] || '').trim();

  const errors = [];
  const notes = [];

  if (!sheetId) errors.push('Thiếu SHEET_ID');
  if (!projectFolderId) errors.push('Thiếu PROJECT_FOLDER_ID');
  if (!photoFolderId) errors.push('Thiếu PHOTO_FOLDER_ID');

  if (projectFolderId && photoFolderId) {
    try {
      const photoFolder = DriveApp.getFolderById(photoFolderId);
      const parents = photoFolder.getParents();
      let correctParent = false;
      while (parents.hasNext()) {
        if (parents.next().getId() === projectFolderId) {
          correctParent = true;
          break;
        }
      }
      if (!correctParent) {
        errors.push('PHOTO_FOLDER_ID không nằm trong PROJECT_FOLDER_ID');
      } else {
        notes.push('Folder ảnh đúng dự án');
      }
    } catch (err) {
      errors.push('Không kiểm tra được folder ảnh: ' + String(err.message || err));
    }
  }

  if (sheetId) {
    try {
      DriveApp.getFileById(sheetId);
      notes.push('Sheet tồn tại');
    } catch (err) {
      errors.push('Không truy cập được Sheet dự án');
    }
  }

  const pwaUrl = WATER_V20_AUDIT.PWA_BASE_URL + '?project=' + encodeURIComponent(id);
  const securityStatus = errors.length ? 'CHECK' : 'OK';
  const securityMessage = errors.length ? errors.join(' | ') : notes.join(' | ');

  // R=PWA_INSTALL_URL, S=SECURITY_STATUS, T=SECURITY_MESSAGE
  sh.getRange(row, 18).setValue(pwaUrl);
  sh.getRange(row, 19).setValue(securityStatus);
  sh.getRange(row, 20).setValue(securityMessage);

  const result = {
    ok: !errors.length,
    projectId: id,
    row: row,
    pwaInstallUrl: pwaUrl,
    securityStatus: securityStatus,
    securityMessage: securityMessage,
    errors: errors
  };

  Logger.log(JSON.stringify(result));
  return result;
}

function WATER_AUDIT_ALL_PROJECTS_V20() {
  const reg = SpreadsheetApp.openById(WATER_V20_AUDIT.REGISTRY_ID);
  const sh = reg.getSheetByName(WATER_V20_AUDIT.REGISTRY_TAB);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  const out = [];
  ids.forEach(function(r) {
    const id = String(r[0] || '').trim().toUpperCase();
    if (!id) return;
    try {
      out.push(WATER_AUDIT_PROJECT_V20(id));
    } catch (err) {
      out.push({ok:false, projectId:id, error:String(err.message || err)});
    }
  });
  Logger.log(JSON.stringify(out));
  return out;
}

function WATER_AUDIT_AUTO001_V20() {
  return WATER_AUDIT_PROJECT_V20('AUTO001');
}
