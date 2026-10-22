// CẤU HÌNH DUY NHẤT CẦN ĐỔI KHI NHÂN BẢN DỰ ÁN
window.WATER_PROJECT = Object.freeze({
  configVersion: 1,

  project: {
    id: 'PROJECT_TEMPLATE',
    name: 'Tên dự án',
    code: 'PROJECT_TEMPLATE',
    timezone: 'Asia/Ho_Chi_Minh'
  },

  app: {
    version: '9.0.0',
    build: 'v9-template',
    title: 'Ghi số nước'
  },

  backend: {
    url: 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE',
    requestTimeoutMs: 20000
  },

  data: {
    sheets: {
      staff: 'NHAN_SU_THUC_HIEN',
      meterMaster: 'DANH_MUC_DONG_HO',
      openingReading: 'CHI_SO_DAU',
      syncLog: 'NHAT_KY_DONG_BO'
    }
  },

  qr: {
    legacySuffixPattern: '-N\\d+$',
    requireToken: true,
    consecutiveHits: 2,
    freshMs: 950
  },

  capture: {
    jpegQuality: 0.84,
    maxImageDimension: 1600,
    duplicatePolicy: 'ASK'
  },

  sync: {
    enabled: true,
    autoSync: true,
    retryMs: 3000,
    resendAfterMs: 90000,
    maxBatchStatus: 50
  },

  offline: {
    enabled: true
  },

  staff: {
    activeStatus: 'Đang làm việc',
    displayMode: 'NAME_ONLY'
  },

  features: {
    camera: true,
    qr: true,
    offlineQueue: true,
    duplicateWarning: true,
    aiReading: true
  }
});
