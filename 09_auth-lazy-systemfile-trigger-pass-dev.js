/* ============================================================
MODULE_ID: 09-LAZY-SYSTEM-PASS
STATUS: DEV ONLY
PURPOSE:
  Keep PASS AUTH modules unchanged.
  Load them ONLY when FILE HỆ THỐNG is selected.
  Before that, app / capture / download / view are untouched.
============================================================ */
(function(){
'use strict';
if(window.WATER_AUTH_LAZY_SYSTEM_PASS)return;

const BUTTON_ID='waterSystemFileR118';
const BUILD='auth-lazy-systemfile-trigger-pass-v1.0.0-dev';
let loading=false;
let followTimer=null;

function status(msg,type){
  try{
    if(window.WATER_MANAGE_STATUS&&typeof window.WATER_MANAGE_STATUS.set==='function'){
      window.WATER_MANAGE_STATUS.set(msg,type||'');
      return;
    }
  }catch(e){}
  try{console.log('[AUTH-LAZY]',msg);}catch(e){}
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
      if(st&&st.authorized){
        clearInterval(followTimer);followTimer=null;
        setTimeout(function(){
          const b=document.getElementById(BUTTON_ID);
          if(b) b.click();
        },80);
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
      await loadScript('./09_auth-sheets-config-prod.js?v=passlazy-20260915','config');
    }
    await loadScript('./09_auth-sheets-v1.js?v=passlazy-20260915','auth-pass');
    await loadScript('./09_auth-unregistered-ux-v2.js?v=passlazy-20260915','ux-pass');
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

  // Once the original PASS AUTH module is loaded, leave the click entirely to it.
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

window.WATER_AUTH_LAZY_SYSTEM_PASS=Object.freeze({
  BUILD:BUILD,
  load:ensurePassAuth
});
})();
