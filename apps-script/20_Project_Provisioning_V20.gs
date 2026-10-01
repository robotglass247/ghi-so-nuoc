/**
 * M&E WATER - PROJECT PROVISIONING V20
 * One-time setup: run CAI_DAT_HE_THONG_NHAN_BAN_V20()
 * Daily use: fill PROJECT_REGISTRY/TAO_DU_AN B2:B12 then tick B15.
 *
 * This module is intentionally isolated from the locked V20 runtime.
 */

const V20_PROV = Object.freeze({
  TEMPLATE_ID: '1xxpH0znT_aT0UP74fOY9Z4eFa5DnSk96TvJxOELllh4',
  REGISTRY_ID: '1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0',
  REGISTRY_TAB: 'PROJECTS',
  CREATE_TAB: 'TAO_DU_AN',
  PROJECTS_FOLDER_ID: '1vGm31fksUV53kL9OHPs7ThEId4IwuOt2',
  APP_BASE_URL: 'https://robotglass247.github.io/ghi-so-nuoc/r1135-v20-direct.html',
  DEFAULT_OWNER_EMAIL: 'nguyenngochoa081075@gmail.com',
  VERSION: 'V20',
  PHOTO_FOLDER_NAME: 'ẢNH GHI SỐ',
  CREATE_CHECKBOX_A1: 'B15'
});

const V20_REQUIRED_SHEETS = Object.freeze([
  'GHI_SO_HANG_THANG',
  'CAN_XU_LY',
  'FILE_CHI_SO_THANG',
  'DANH_MUC_DONG_HO',
  'NHAN_SU_THUC_HIEN',
  'THONG_TIN_DU_AN',
  'TAI_CHI_SO_THANG',
  'HANG_DOI_ANH_V87',
  'NHAT_KY_DONG_BO',
  'CHI_SO_DAU',
  'CAU_HINH_V2',
  'LS_TIEU_THU_THANG'
]);

const V20_VISIBLE_SHEETS = Object.freeze([
  'GHI_SO_HANG_THANG',
  'CAN_XU_LY',
  'FILE_CHI_SO_THANG',
  'THONG_TIN_DU_AN',
  'DANH_MUC_DONG_HO',
  'NHAN_SU_THUC_HIEN'
]);

const V20_INPUT_RANGES = Object.freeze({
  GHI_SO_HANG_THANG: ['H2:H39978', 'X2:X39978', 'AB2:AB39978'],
  CAN_XU_LY: [],
  FILE_CHI_SO_THANG: ['C2', 'E2', 'G2', 'I2'],
  DANH_MUC_DONG_HO: ['B3:D4002', 'F3:F4002'],
  NHAN_SU_THUC_HIEN: ['A5:H1003'],
  THONG_TIN_DU_AN: ['B2:H2', 'J2', 'L2:M2']
});

function CAI_DAT_HE_THONG_NHAN_BAN_V20() {
  v20EnsureRegistryTrigger_();

  const missing = [];
  if (typeof xuLyOnEditDanhMucProject_ !== 'function') {
    missing.push('xuLyOnEditDanhMucProject_');
  }
  if (typeof xuLyXacNhanKiemTraProject_ !== 'function') {
    missing.push('xuLyXacNhanKiemTraProject_');
  }
  if (missing.length) {
    throw new Error(
      'Thiếu hàm trigger đã PASS: ' + missing.join(', ') +
      '. Không cài hệ thống cho tới khi đủ hàm.'
    );
  }

  Logger.log('V20 PROVISIONING SETUP: OK');
  return { ok: true, status: 'READY_TO_PROVISION' };
}

function v20EnsureRegistryTrigger_() {
  const handler = 'xuLyYeuCauTaoDuAnV20_';
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const exists = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === handler &&
      t.getTriggerSourceId() === ss.getId();
  });
  if (!exists) {
    ScriptApp.newTrigger(handler)
      .forSpreadsheet(ss)
      .onEdit()
      .create();
  }
}

function xuLyYeuCauTaoDuAnV20_(e) {
  if (!e || !e.range) return;

  const sh = e.range.getSheet();
  const ss = sh.getParent();
  if (ss.getId() !== V20_PROV.REGISTRY_ID) return;
  if (sh.getName() !== V20_PROV.CREATE_TAB) return;
  if (e.range.getA1Notation() !== V20_PROV.CREATE_CHECKBOX_A1) return;
  if (String(e.value || '').toUpperCase() !== 'TRUE') return;

  try {
    TAO_DU_AN_V20();
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
  } finally {
    try { sh.getRange(V20_PROV.CREATE_CHECKBOX_A1).setValue(false); } catch (_) {}
  }
}

function TAO_DU_AN_V20() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Hệ thống đang tạo dự án khác. Vui lòng thử lại sau.');
  }

  let ctx = null;
  try {
    v20SetCreateResult_({ STATUS: 'VALIDATING', ERROR_STEP: '', ERROR_MESSAGE: '' });

    const input = v20ReadCreateInput_();
    v20ValidateInput_(input);

    if (v20FindRegistryRow_(input.projectId)) {
      throw new Error('PROJECT_ID ' + input.projectId + ' đã tồn tại trong Registry.');
    }

    ctx = v20CreateProjectAssets_(input);

    v20AppendRegistry_(ctx, 'SHEET_CREATED', 'CONFIGURING');
    v20ConfigureProjectSheet_(ctx);

    v20UpdateRegistryStatus_(ctx.registryRow, 'SHEET_CREATED', 'INSTALLING_TRIGGERS', '', '');
    v20InstallProjectTriggers_(ctx.sheetId);

    v20UpdateRegistryStatus_(ctx.registryRow, 'SHEET_CREATED', 'PROTECTING', '', '');
    v20ProtectProject_(ctx.ss);
    v20LayoutProject_(ctx.ss);

    v20UpdateRegistryStatus_(ctx.registryRow, 'SHEET_CREATED', 'VERIFYING', '', '');
    const verify = v20VerifyProject_(ctx.projectId, ctx.registryRow);
    if (!verify.ok) {
      throw new Error('VERIFY FAILED: ' + verify.errors.join(' | '));
    }

    v20UpdateRegistryStatus_(ctx.registryRow, 'READY', 'READY', '', '');
    v20SetCreateResult_({
      STATUS: 'READY',
      PROJECT_ID: ctx.projectId,
      SHEET_ID: ctx.sheetId,
      SHEET_URL: ctx.sheetUrl,
      PROJECT_FOLDER_URL: ctx.projectFolderUrl,
      PHOTO_FOLDER_URL: ctx.photoFolderUrl,
      APP_URL: ctx.appUrl,
      LAST_CHECK: new Date(),
      ERROR_STEP: '',
      ERROR_MESSAGE: '',
      VERSION: V20_PROV.VERSION
    });

    return {
      ok: true,
      projectId: ctx.projectId,
      sheetId: ctx.sheetId,
      appUrl: ctx.appUrl,
      status: 'READY'
    };

  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    const step = v20CurrentCreateStatus_() || 'ERROR';

    if (ctx && ctx.registryRow) {
      try { v20UpdateRegistryStatus_(ctx.registryRow, 'ERROR', 'ERROR', step, msg); } catch (_) {}
    }

    v20SetCreateResult_({
      STATUS: 'ERROR',
      PROJECT_ID: ctx ? ctx.projectId : '',
      SHEET_ID: ctx ? ctx.sheetId : '',
      SHEET_URL: ctx ? ctx.sheetUrl : '',
      PROJECT_FOLDER_URL: ctx ? ctx.projectFolderUrl : '',
      PHOTO_FOLDER_URL: ctx ? ctx.photoFolderUrl : '',
      APP_URL: ctx ? ctx.appUrl : '',
      LAST_CHECK: new Date(),
      ERROR_STEP: step,
      ERROR_MESSAGE: msg,
      VERSION: V20_PROV.VERSION
    });
    throw err;

  } finally {
    lock.releaseLock();
  }
}

function v20ReadCreateInput_() {
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_PROV.CREATE_TAB);
  if (!sh) throw new Error('Không có sheet ' + V20_PROV.CREATE_TAB + '.');

  const rows = sh.getRange('A2:B12').getDisplayValues();
  const map = {};
  rows.forEach(function(r) {
    map[String(r[0] || '').trim()] = String(r[1] || '').trim();
  });

  const startDay = Number(map.NGAY_GHI_BAT_DAU || 15);
  const endDay = Number(map.NGAY_GHI_KET_THUC || 19);
  const avgMonths = Number(map.KY_TB_TIEU_THU || 2);

  return {
    projectId: v20NormalizeProjectId_(map.PROJECT_ID),
    projectName: String(map.PROJECT_NAME || '').trim(),
    address: String(map.PROJECT_ADDRESS || '').trim(),
    unit: String(map.DON_VI_QLVH || '').trim(),
    manager: String(map.NGUOI_PHU_TRACH || '').trim(),
    startDay: startDay,
    endDay: endDay,
    imageUrl: String(map.ANH_DU_AN_URL || '').trim(),
    avgMonths: avgMonths,
    notes: String(map.GHI_CHU || '').trim(),
    ownerEmail: String(map.OWNER_EMAIL || V20_PROV.DEFAULT_OWNER_EMAIL).trim()
  };
}

function v20NormalizeProjectId_(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
}

function v20ValidateInput_(x) {
  if (!/^[A-Z0-9_-]{2,40}$/.test(x.projectId)) {
    throw new Error('PROJECT_ID chỉ được dùng A-Z, 0-9, _ hoặc -, dài 2-40 ký tự.');
  }
  if (!x.projectName) throw new Error('Thiếu PROJECT_NAME.');
  if (!Number.isInteger(x.startDay) || x.startDay < 1 || x.startDay > 31) {
    throw new Error('NGAY_GHI_BAT_DAU phải từ 1 đến 31.');
  }
  if (!Number.isInteger(x.endDay) || x.endDay < 1 || x.endDay > 31) {
    throw new Error('NGAY_GHI_KET_THUC phải từ 1 đến 31.');
  }
  if (x.endDay < x.startDay) {
    throw new Error('NGAY_GHI_KET_THUC phải lớn hơn hoặc bằng ngày bắt đầu.');
  }
  if (![2, 3].includes(x.avgMonths)) {
    throw new Error('KY_TB_TIEU_THU chỉ nhận 2 hoặc 3.');
  }
  if (x.ownerEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.ownerEmail)) {
    throw new Error('OWNER_EMAIL không hợp lệ.');
  }
}

function v20FindRegistryRow_(projectId) {
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_PROV.REGISTRY_TAB);
  if (!sh || sh.getLastRow() < 2) return 0;

  const found = sh.getRange(2, 1, sh.getLastRow() - 1, 1)
    .createTextFinder(projectId)
    .matchEntireCell(true)
    .matchCase(false)
    .findNext();
  return found ? found.getRow() : 0;
}

function v20SafeName_(s) {
  return String(s || '')
    .replace(/[\\/:*?"<>|#%{}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function v20CreateProjectAssets_(input) {
  v20SetCreateResult_({ STATUS: 'CREATING_FOLDER' });

  const root = DriveApp.getFolderById(V20_PROV.PROJECTS_FOLDER_ID);
  const folderName = v20SafeName_(input.projectId + ' - ' + input.projectName);
  const projectFolder = root.createFolder(folderName);
  const photoFolder = projectFolder.createFolder(V20_PROV.PHOTO_FOLDER_NAME);

  v20SetCreateResult_({ STATUS: 'COPYING_TEMPLATE' });

  const template = DriveApp.getFileById(V20_PROV.TEMPLATE_ID);
  const fileName = v20SafeName_(input.projectId + ' - QUAN LY GHI CHI SO NUOC');
  const file = template.makeCopy(fileName, projectFolder);
  const ss = SpreadsheetApp.openById(file.getId());
  const appUrl = V20_PROV.APP_BASE_URL + '?project=' + encodeURIComponent(input.projectId);

  return {
    projectId: input.projectId,
    projectName: input.projectName,
    input: input,
    ss: ss,
    sheetId: ss.getId(),
    sheetUrl: ss.getUrl(),
    projectFolderId: projectFolder.getId(),
    projectFolderUrl: projectFolder.getUrl(),
    photoFolderId: photoFolder.getId(),
    photoFolderUrl: photoFolder.getUrl(),
    appUrl: appUrl,
    registryRow: 0
  };
}

function v20AppendRegistry_(ctx, status, createStatus) {
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_PROV.REGISTRY_TAB);
  if (!sh) throw new Error('Không có sheet Registry ' + V20_PROV.REGISTRY_TAB + '.');

  const row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, 17).setValues([[
    ctx.projectId,
    ctx.projectName,
    ctx.sheetId,
    '',
    ctx.input.ownerEmail || V20_PROV.DEFAULT_OWNER_EMAIL,
    status,
    V20_PROV.VERSION,
    new Date(),
    ctx.input.notes || 'Tạo tự động V20',
    ctx.projectFolderId,
    ctx.photoFolderId,
    ctx.appUrl,
    createStatus,
    '',
    '',
    '',
    V20_PROV.TEMPLATE_ID
  ]]);
  ctx.registryRow = row;
}

function v20UpdateRegistryStatus_(row, status, createStatus, errorStep, errorMessage) {
  if (!row) return;
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_PROV.REGISTRY_TAB);
  sh.getRange(row, 6).setValue(status || '');
  sh.getRange(row, 13).setValue(createStatus || '');
  sh.getRange(row, 14).setValue(new Date());
  sh.getRange(row, 15).setValue(errorStep || '');
  sh.getRange(row, 16).setValue(errorMessage || '');
}

function v20ConfigureProjectSheet_(ctx) {
  v20SetCreateResult_({ STATUS: 'CONFIGURING' });

  const ss = ctx.ss;
  const info = ss.getSheetByName('THONG_TIN_DU_AN');
  if (!info) throw new Error('Template thiếu THONG_TIN_DU_AN.');

  info.getRange('A2:H2').setValues([[
    ctx.projectId,
    ctx.projectName,
    ctx.input.address,
    ctx.input.unit,
    ctx.input.manager,
    'CHƯA KÍCH HOẠT',
    ctx.input.startDay,
    ctx.input.endDay
  ]]);
  info.getRange('I2').setFormula('=IF(OR(G2="";H2="");"";H2-G2)');
  info.getRange('J2').setValue(ctx.input.notes || '');
  info.getRange('K2').setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  info.getRange('L2').setValue(ctx.input.imageUrl || '');
  info.getRange('M2').setValue(ctx.input.avgMonths);

  const replacements = {
    '__PROJECT_ID__': ctx.projectId,
    '__PROJECT_NAME__': ctx.projectName,
    '__PROJECT_ADDRESS__': ctx.input.address,
    '__PROJECT_UNIT__': ctx.input.unit,
    '__PROJECT_OWNER__': ctx.input.manager,
    '__PROJECT_SHEET_ID__': ctx.sheetId
  };

  Object.keys(replacements).forEach(function(key) {
    ss.createTextFinder(key).matchCase(true).replaceAllWith(String(replacements[key] || ''));
  });

  const fileMonth = ss.getSheetByName('FILE_CHI_SO_THANG');
  if (fileMonth) {
    fileMonth.getRange('C2').setValue('TẤT CẢ');
    fileMonth.getRange('E2').setValue('TẤT CẢ');
    fileMonth.getRange('G2').setValue('TẤT CẢ');
    fileMonth.getRange('I2').clearContent();
  }

  SpreadsheetApp.flush();
}

function v20InstallProjectTriggers_(sheetId) {
  const ss = SpreadsheetApp.openById(sheetId);
  v20EnsureSpreadsheetTrigger_('xuLyOnEditDanhMucProject_', ss);
  v20EnsureSpreadsheetTrigger_('xuLyXacNhanKiemTraProject_', ss);
}

function v20EnsureSpreadsheetTrigger_(handler, ss) {
  const exists = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === handler && t.getTriggerSourceId() === ss.getId();
  });
  if (!exists) {
    ScriptApp.newTrigger(handler).forSpreadsheet(ss).onEdit().create();
  }
}

function v20ProtectProject_(ss) {
  const me = Session.getEffectiveUser();

  ss.getSheets().forEach(function(sh) {
    const allowed = V20_INPUT_RANGES[sh.getName()] || [];
    let protections = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    let p = protections.length ? protections[0] : sh.protect();

    for (let i = 1; i < protections.length; i++) {
      try { if (protections[i].canEdit()) protections[i].remove(); } catch (_) {}
    }

    p.setDescription('V20_LOCK_INPUT_ONLY_' + sh.getName());
    p.setWarningOnly(false);
    try { p.addEditor(me); } catch (_) {}
    try {
      const editors = p.getEditors().filter(function(u) {
        return u.getEmail() !== me.getEmail();
      });
      if (editors.length) p.removeEditors(editors);
    } catch (_) {}
    try { if (p.canDomainEdit()) p.setDomainEdit(false); } catch (_) {}

    const ranges = allowed.map(function(a1) { return sh.getRange(a1); });
    p.setUnprotectedRanges(ranges);
  });
}

function v20LayoutProject_(ss) {
  const visibleSet = new Set(V20_VISIBLE_SHEETS);

  V20_VISIBLE_SHEETS.forEach(function(name) {
    const sh = ss.getSheetByName(name);
    if (sh) sh.showSheet();
  });

  V20_VISIBLE_SHEETS.forEach(function(name, idx) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(idx + 1);
  });

  ss.getSheets().forEach(function(sh) {
    if (!visibleSet.has(sh.getName())) {
      try { sh.hideSheet(); } catch (_) {}
    }
  });

  const first = ss.getSheetByName('GHI_SO_HANG_THANG');
  if (first) ss.setActiveSheet(first);
}

function v20VerifyProject_(projectId, registryRow) {
  const errors = [];
  const regSS = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const reg = regSS.getSheetByName(V20_PROV.REGISTRY_TAB);
  const row = registryRow || v20FindRegistryRow_(projectId);
  if (!row) return { ok: false, errors: ['Không tìm thấy Registry row.'] };

  const r = reg.getRange(row, 1, 1, 17).getValues()[0];
  const sheetId = String(r[2] || '').trim();
  const projectFolderId = String(r[9] || '').trim();
  const photoFolderId = String(r[10] || '').trim();
  const appUrl = String(r[11] || '').trim();

  if (String(r[0] || '').trim().toUpperCase() !== projectId) errors.push('Registry PROJECT_ID không khớp.');
  if (!sheetId) errors.push('Thiếu SHEET_ID.');
  if (!projectFolderId) errors.push('Thiếu PROJECT_FOLDER_ID.');
  if (!photoFolderId) errors.push('Thiếu PHOTO_FOLDER_ID.');
  if (appUrl !== V20_PROV.APP_BASE_URL + '?project=' + encodeURIComponent(projectId)) {
    errors.push('APP_URL không khớp PROJECT_ID.');
  }

  let ss;
  try { ss = SpreadsheetApp.openById(sheetId); }
  catch (e) { errors.push('Không mở được SHEET_ID: ' + e.message); }

  if (ss) {
    V20_REQUIRED_SHEETS.forEach(function(name) {
      if (!ss.getSheetByName(name)) errors.push('Thiếu sheet ' + name + '.');
    });

    const info = ss.getSheetByName('THONG_TIN_DU_AN');
    if (info && String(info.getRange('A2').getDisplayValue() || '').trim().toUpperCase() !== projectId) {
      errors.push('THONG_TIN_DU_AN!A2 không khớp PROJECT_ID.');
    }

    const catalog = ss.getSheetByName('DANH_MUC_DONG_HO');
    if (catalog && catalog.getRange('B3:D4002').getDisplayValues().some(function(row) {
      return row.some(function(v) { return String(v || '').trim() !== ''; });
    })) {
      errors.push('MASTER copy không sạch: DANH_MUC_DONG_HO có dữ liệu cũ.');
    }

    const main = ss.getSheetByName('GHI_SO_HANG_THANG');
    if (main && main.getRange('A2:F20').getDisplayValues().some(function(row) {
      return row.some(function(v) { return String(v || '').trim() !== ''; });
    })) {
      errors.push('MASTER copy không sạch: GHI_SO_HANG_THANG có dữ liệu cũ.');
    }
  }

  try { DriveApp.getFolderById(projectFolderId).getName(); }
  catch (e) { errors.push('PROJECT_FOLDER_ID không mở được.'); }
  try {
    const pf = DriveApp.getFolderById(photoFolderId);
    if (pf.getName() !== V20_PROV.PHOTO_FOLDER_NAME) errors.push('PHOTO_FOLDER sai tên.');
  } catch (e) { errors.push('PHOTO_FOLDER_ID không mở được.'); }

  const triggers = ScriptApp.getProjectTriggers();
  ['xuLyOnEditDanhMucProject_', 'xuLyXacNhanKiemTraProject_'].forEach(function(handler) {
    const ok = triggers.some(function(t) {
      return t.getHandlerFunction() === handler && t.getTriggerSourceId() === sheetId;
    });
    if (!ok) errors.push('Thiếu trigger ' + handler + '.');
  });

  if (errors.length === 0 && typeof waterOpenProject_ === 'function') {
    try {
      const routed = waterOpenProject_(projectId);
      if (!routed || routed.getId() !== sheetId) errors.push('Router mở sai SHEET_ID.');
    } catch (e) {
      errors.push('Router lỗi: ' + e.message);
    }
  }

  if (errors.length === 0 && typeof waterProjectPhotoFolder_ === 'function') {
    try {
      const routedFolder = waterProjectPhotoFolder_(projectId);
      if (!routedFolder || routedFolder.getId() !== photoFolderId) {
        errors.push('Router folder ảnh mở sai PHOTO_FOLDER_ID.');
      }
    } catch (e) {
      errors.push('Router folder ảnh lỗi: ' + e.message);
    }
  }

  return { ok: errors.length === 0, errors: errors };
}

function VERIFY_PROJECT_V20(projectId) {
  const id = v20NormalizeProjectId_(projectId || v20ReadCreateResultProjectId_());
  if (!id) throw new Error('Thiếu PROJECT_ID để kiểm tra.');
  const row = v20FindRegistryRow_(id);
  const result = v20VerifyProject_(id, row);

  if (row) {
    v20UpdateRegistryStatus_(
      row,
      result.ok ? 'READY' : 'ERROR',
      result.ok ? 'READY' : 'ERROR',
      result.ok ? '' : 'VERIFYING',
      result.ok ? '' : result.errors.join(' | ')
    );
  }

  v20SetCreateResult_({
    STATUS: result.ok ? 'READY' : 'ERROR',
    PROJECT_ID: id,
    LAST_CHECK: new Date(),
    ERROR_STEP: result.ok ? '' : 'VERIFYING',
    ERROR_MESSAGE: result.ok ? '' : result.errors.join(' | '),
    VERSION: V20_PROV.VERSION
  });

  return result;
}

function v20ReadCreateResultProjectId_() {
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_PROV.CREATE_TAB);
  return sh ? String(sh.getRange('E3').getDisplayValue() || '').trim() : '';
}

function v20SetCreateResult_(obj) {
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_PROV.CREATE_TAB);
  if (!sh) return;

  const rowByKey = {
    STATUS: 2,
    PROJECT_ID: 3,
    SHEET_ID: 4,
    SHEET_URL: 5,
    PROJECT_FOLDER_URL: 6,
    PHOTO_FOLDER_URL: 7,
    APP_URL: 8,
    LAST_CHECK: 9,
    ERROR_STEP: 10,
    ERROR_MESSAGE: 11,
    VERSION: 12
  };

  Object.keys(obj || {}).forEach(function(key) {
    const row = rowByKey[key];
    if (!row) return;
    sh.getRange(row, 5).setValue(obj[key] == null ? '' : obj[key]);
  });
}

function v20CurrentCreateStatus_() {
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_PROV.CREATE_TAB);
  return sh ? String(sh.getRange('E2').getDisplayValue() || '').trim() : '';
}

function XOA_FORM_TAO_DU_AN_V20() {
  const ss = SpreadsheetApp.openById(V20_PROV.REGISTRY_ID);
  const sh = ss.getSheetByName(V20_PROV.CREATE_TAB);
  sh.getRange('B2:B6').clearContent();
  sh.getRange('B7').setValue(15);
  sh.getRange('B8').setValue(19);
  sh.getRange('B9').clearContent();
  sh.getRange('B10').setValue(2);
  sh.getRange('B11').clearContent();
  sh.getRange('B12').setValue(V20_PROV.DEFAULT_OWNER_EMAIL);
  sh.getRange('E2:E11').clearContent();
  sh.getRange('E2').setValue('CHƯA TẠO');
  sh.getRange('E12').setValue(V20_PROV.VERSION);
  sh.getRange(V20_PROV.CREATE_CHECKBOX_A1).setValue(false);
}
