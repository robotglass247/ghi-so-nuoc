/**
 * 00_Config.gs
 * FILE DUY NHẤT ĐƯỢC PHÉP CHỨA THÔNG TIN RIÊNG CỦA DỰ ÁN.
 * Khi nhân bản dự án mới, ưu tiên chỉ sửa file này.
 */

const APP_CONFIG = Object.freeze({
  CONFIG_VERSION: 1,

  PROJECT: {
    ID: 'PROJECT_TEMPLATE',
    NAME: 'Tên dự án',
    TIMEZONE: 'Asia/Ho_Chi_Minh'
  },

  GOOGLE: {
    SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE',
    IMAGE_FOLDER_ID: 'PASTE_DRIVE_FOLDER_ID_HERE'
  },

  SHEETS: {
    STAFF: 'NHAN_SU_THUC_HIEN',
    METER_MASTER: 'DANH_MUC_DONG_HO',
    OPENING_READING: 'CHI_SO_DAU',
    SYNC_LOG: 'NHAT_KY_DONG_BO'
  },

  STAFF: {
    ACTIVE_STATUS: 'Đang làm việc'
  },

  API: {
    VERSION: 'v1',
    MAX_BATCH_STATUS: 50
  },

  FEATURES: {
    STAFF: true,
    UPLOAD: true,
    BATCH_STATUS: true,
    AI_READING: true
  }
});

function getAppConfig_(){
  return APP_CONFIG;
}

function assertProjectConfig_(){
  const c = APP_CONFIG;
  if (!c.PROJECT.ID || c.PROJECT.ID === 'PROJECT_TEMPLATE') {
    throw new Error('PROJECT.ID chưa được cấu hình.');
  }
  if (!c.GOOGLE.SPREADSHEET_ID || c.GOOGLE.SPREADSHEET_ID.indexOf('PASTE_') === 0) {
    throw new Error('SPREADSHEET_ID chưa được cấu hình.');
  }
  if (!c.GOOGLE.IMAGE_FOLDER_ID || c.GOOGLE.IMAGE_FOLDER_ID.indexOf('PASTE_') === 0) {
    throw new Error('IMAGE_FOLDER_ID chưa được cấu hình.');
  }
}
