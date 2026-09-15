/* ============================================================
MODULE_ID: 09-SYSTEMFILE-GATE-PASS-R3
STATUS: DEV ONLY
PURPOSE:
  Keep PASS AUTH modules unchanged.
  FILE HỆ THỐNG is always intercepted here.
  First click: lazy-load PASS AUTH and let user authenticate.
  After authentication:
    permissions.system === true  -> allow open on next click.
    otherwise                    -> deny.
  No synthetic/replayed click.
============================================================ */
(function(){
'use strict';
if(window.WATER_AUTH_SYSTEMFILE_GATE_PASS_R3)return;

const BUTTON_ID='waterSystemFileR118';
const BUILD='auth-systemfile-gate-pass-r3.0.0-dev';
let loading=false;
let watcher=null;

function status(msg,type){
  try{
    if(window.WATER_MANAGE_STATUS&&typeof window.WATER_MANAGE_STATUS.set==='function'){
      window.WATER_MANAGE_STATUS.set(msg,type||'');
      return;
    }
  }catch(e){}
  try{console.log('[SYSTEM-GATE-R3]',msg);}catch(e){}
}

function loadScript(src,key){
  return new Promise(function(resolve,reject){
    const existing=document.querySelector('script[data-system-gate-key="'+key+'"]');
    if(existing){
      if(existing.dataset.loaded==='1'){resolve();return;}
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',function(){reject(new Error('Không nạp được '+key));},{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.dataset.systemGateKey=key;
    s.onload=function(){s.dataset.loaded='1';resolve();};
    s.onerror=function(){reject(new Error('Không nạp được '+key));};
    document.head.appendChild(s);
  });
}

function getState(){
  try{
    const api=window.WATER_AUTH_SHEETS;
    if(api&&typeof api.getState==='function')return api.getState();
  }catch(e){}
  return null;
}

function systemAllowed(st){
  return !!(st&&st.authenticated&&st.authorized&&st.permissions&&st.permissions.system===true);
}

function openSystem(){
  const core=window.WATER_MANAGE_CORE;
  const url=core&&core.CFG&&core.CFG.SYSTEM_SHEET_URL;
  if(!url){status('Chưa cấu hình FILE HỆ THỐNG.','err');return false;}
  status('Đã xác thực QUẢN LÝ · đang mở FILE HỆ THỐNG...','ok');
  try{
    const w=window.open(url,'_blank','noopener,noreferrer');
    if(!w)window.location.href=url;
  }catch(e){window.location.href=url;}
  return true;
}

function describeDenied(st){
  if(!st||!st.authenticated)return 'Vui lòng xác thực tài khoản Google để mở FILE HỆ THỐNG.';
  const role=String(st.role||'').trim();
  if(role)return 'Tài khoản '+role+' không có quyền mở FILE HỆ THỐNG.';
  return st.reason||'Tài khoản không có quyền mở FILE HỆ THỐNG.';
}

function watchAuthResult(){
  if(watcher)return;
  let ticks=0;
  watcher=setInterval(function(){
    ticks++;
    const st=getState();
    if(st&&st.authenticated){
      clearInterval(watcher);watcher=null;
      if(systemAllowed(st)){
        status('Đã xác thực QUẢN LÝ · bấm FILE HỆ THỐNG lần nữa để mở.','ok');
      }else{
        status(describeDenied(st),'err');
      }
      return;
    }
    if(ticks>=800){clearInterval(watcher);watcher=null;}
  },150);
}

async function ensurePassAuth(){
  if(window.WATER_AUTH_SHEETS){watchAuthResult();return;}
  if(loading)return;
  if(!navigator.onLine){status('FILE HỆ THỐNG cần kết nối Internet để xác thực quyền truy cập.','err');return;}
  loading=true;
  status('Đang mở xác thực FILE HỆ THỐNG...','');
  try{
    if(!window.WATER_AUTH_SHEETS_CONFIG){
      await loadScript('./09_auth-sheets-config-prod.js?v=gatepass-r3-20260915','config');
    }
    await loadScript('./09_auth-sheets-v1.js?v=gatepass-r3-20260915','auth-pass');
    await loadScript('./09_auth-unregistered-ux-v2.js?v=gatepass-r3-20260915','ux-pass');
    watchAuthResult();
  }catch(err){
    status('Không tải được xác thực FILE HỆ THỐNG. Vui lòng kiểm tra Internet.','err');
  }finally{
    loading=false;
  }
}

function gateClick(ev){
  const t=ev.target&&ev.target.closest?ev.target.closest('#'+BUTTON_ID):null;
  if(!t)return;

  // This gate ALWAYS owns FILE HỆ THỐNG. Do not allow any legacy handler through.
  ev.preventDefault();
  ev.stopPropagation();
  if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

  if(!navigator.onLine){
    status('FILE HỆ THỐNG cần kết nối Internet để xác thực quyền truy cập.','err');
    return false;
  }

  const st=getState();
  if(systemAllowed(st)){
    openSystem();
    return false;
  }

  if(st&&st.authenticated){
    status(describeDenied(st),'err');
    return false;
  }

  ensurePassAuth();
  return false;
}

// Capture phase so this runs before button/legacy bubble handlers.
document.addEventListener('click',gateClick,true);

window.WATER_AUTH_SYSTEMFILE_GATE_PASS_R3=Object.freeze({
  BUILD:BUILD,
  load:ensurePassAuth,
  getState:getState,
  systemAllowed:systemAllowed
});
})();