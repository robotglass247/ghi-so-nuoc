/* ============================================================
MODULE_ID: 09-LAZY-SYSTEM-PASS-R2
STATUS: DEV ONLY
PURPOSE:
  Keep PASS AUTH modules unchanged.
  Load them ONLY when FILE HỆ THỐNG is selected.
  Before that, app / capture / download / view are untouched.
FIX R2:
  Auto-open FILE HỆ THỐNG only when permissions.system === true.
============================================================ */
(function(){
'use strict';
if(window.WATER_AUTH_LAZY_SYSTEM_PASS_R2)return;

const BUTTON_ID='waterSystemFileR118';
const BUILD='auth-lazy-systemfile-trigger-pass-r2.0.0-dev';
let loading=false;
let followTimer=null;

function status(msg,type){
  try{
    if(window.WATER_MANAGE_STATUS&&typeof window.WATER_MANAGE_STATUS.set==='function'){
      window.WATER_MANAGE_STATUS.set(msg,type||'');
      return;
    }
  }catch(e){}
  try{console.log('[AUTH-LAZY-R2]',msg);}catch(e){}
}

function loadScript(src,key){
  return new Promise(function(resolve,reject){
    const existing=document.querySelector('script[data-auth-lazy-key="'+key+'"]');
    if(existing){
      if(existing.dataset.loaded==='1'){resolve();return;}
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',function(){reject(new Error('Không nạp được '+key));},{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.dataset.authLazyKey=key;
    s.onload=function(){s.dataset.loaded='1';resolve();};
    s.onerror=function(){reject(new Error('Không nạp được '+key));};
    document.head.appendChild(s);
  });
}

function startFollowAuthorized(){
  clearInterval(followTimer);
  let ticks=0;
  followTimer=setInterval(function(){
    ticks++;
    try{
      const api=window.WATER_AUTH_SHEETS;
      if(!api||typeof api.getState!=='function')return;
      const st=api.getState();

      // QUẢN LÝ: được mở FILE HỆ THỐNG.
      if(st&&st.authorized&&st.permissions&&st.permissions.system===true){
        clearInterval(followTimer);followTimer=null;
        setTimeout(function(){
          const b=document.getElementById(BUTTON_ID);
          if(b) b.click();
        },80);
        return;
      }

      // NHÂN VIÊN hợp lệ: dừng chờ, tuyệt đối không tự bấm FILE HỆ THỐNG.
      if(st&&st.authenticated&&st.authorized&&(!st.permissions||st.permissions.system!==true)){
        clearInterval(followTimer);followTimer=null;
        status('Tài khoản NHÂN VIÊN không có quyền mở FILE HỆ THỐNG.','err');
        return;
      }
    }catch(e){}
    if(ticks>=800){clearInterval(followTimer);followTimer=null;}
  },150);
}

async function ensurePassAuth(){
  if(window.WATER_AUTH_SHEETS){startFollowAuthorized();return;}
  if(loading)return;
  if(!navigator.onLine){status('FILE HỆ THỐNG cần kết nối Internet để xác thực quyền truy cập.','err');return;}
  loading=true;
  status('Đang mở xác thực FILE HỆ THỐNG...','');
  try{
    if(!window.WATER_AUTH_SHEETS_CONFIG){
      await loadScript('./09_auth-sheets-config-prod.js?v=passlazy-r2-20260915','config');
    }
    await loadScript('./09_auth-sheets-v1.js?v=passlazy-r2-20260915','auth-pass');
    await loadScript('./09_auth-unregistered-ux-v2.js?v=passlazy-r2-20260915','ux-pass');
    startFollowAuthorized();
  }catch(err){
    status('Không tải được xác thực FILE HỆ THỐNG. Vui lòng kiểm tra Internet.','err');
  }finally{
    loading=false;
  }
}

function intercept(ev){
  const t=ev.target&&ev.target.closest?ev.target.closest('#'+BUTTON_ID):null;
  if(!t)return;

  // Sau khi AUTH PASS đã nạp, để chính module PASS xử lý click.
  if(window.WATER_AUTH_SHEETS)return;

  ev.preventDefault();
  ev.stopPropagation();
  if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

  if(!navigator.onLine){
    status('FILE HỆ THỐNG cần kết nối Internet để xác thực quyền truy cập.','err');
    return false;
  }

  ensurePassAuth();
  return false;
}

document.addEventListener('click',intercept,true);

window.WATER_AUTH_LAZY_SYSTEM_PASS_R2=Object.freeze({
  BUILD:BUILD,
  load:ensurePassAuth
});
})();
