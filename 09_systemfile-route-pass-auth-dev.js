/* ============================================================
MODULE_ID: 09-SYSTEMFILE-ROUTE-PASS-AUTH
STATUS: DEV ONLY
PURPOSE:
  Do not authenticate inside the main App.
  FILE HỆ THỐNG click goes to a dedicated page that loads the
  unchanged PASS AUTH module.
============================================================ */
(function(){
'use strict';
if(window.WATER_SYSTEMFILE_ROUTE_PASS_AUTH_DEV)return;

const SYSTEM_ID='waterSystemFileR118';
const AUTH_PAGE='./system-auth-pass-bridge-dev.html';

function intercept(ev){
  const t=ev.target&&ev.target.closest?ev.target.closest('#'+SYSTEM_ID):null;
  if(!t)return;
  ev.preventDefault();
  ev.stopPropagation();
  if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

  if(!navigator.onLine){
    try{
      if(window.WATER_MANAGE_STATUS&&typeof window.WATER_MANAGE_STATUS.set==='function'){
        window.WATER_MANAGE_STATUS.set('FILE HỆ THỐNG cần Internet để xác thực.','err');
      }
    }catch(e){}
    return false;
  }

  window.location.href=AUTH_PAGE+'?t='+Date.now();
  return false;
}

document.addEventListener('click',intercept,true);
window.WATER_SYSTEMFILE_ROUTE_PASS_AUTH_DEV=Object.freeze({BUILD:'systemfile-route-pass-auth-dev-v1'});
})();
