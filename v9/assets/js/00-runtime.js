/* CORE RUNTIME - KHÔNG CHỨA THÔNG TIN RIÊNG DỰ ÁN */
const APP_CONFIG=globalThis.WATER_PROJECT_CONFIG||{};
const PROJECT_ID=String(APP_CONFIG.projectId||'DEFAULT').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'_');
const APP_VERSION=String(APP_CONFIG.appVersion||'9.0.0');
const BACKEND_URL=String(APP_CONFIG.backendUrl||'').trim();
const STAFF_CACHE_KEY='water:'+PROJECT_ID+':staff-list:v1';
const STAFF_FALLBACK=Array.isArray(APP_CONFIG.staffFallback)?APP_CONFIG.staffFallback:[];
const STORAGE={
  staffKey:'water:'+PROJECT_ID+':staff-selected',
  capturePrefix:'water:'+PROJECT_ID+':capture:',
  dbName:'water_'+PROJECT_ID+'_v1'
};
if(!BACKEND_URL) throw new Error('Thiếu backendUrl trong config/project.config.js');
let stream=null;
let cameraStarting=false;
let detector=null;
let staffList=[];
let db=null;
let syncRunning=false;
let syncRequested=false;
let manualSyncRequested=false;
let syncStartedAt=0;
let autoSyncTimer=null;
let lastCaptureAt=0;
let liveQR=null;
let liveScanTimer=null;
let liveScanBusy=false;
let liveScanCycle=0;
let lastQRKey='';
let lastQRAt=0;
let lastQRHits=0;
let awaitingUpload=null;
let shotRunning=false;
let staffLoadTimer=null;


let staffUiRequestId='';
