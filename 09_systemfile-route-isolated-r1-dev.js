/* ============================================================
MODULE_ID: 09-SYSTEMFILE-ROUTE-ISOLATED-R1
STATUS: DEV ONLY
PURPOSE: FILE HỆ THỐNG has one owner only.
============================================================ */
(function(){
'use strict';
if(window.WATER_SYSTEMFILE_ROUTE_ISOLATED_R1)return;
const SYSTEM_ID='waterSystemFileR118';
const AUTH_PAGE='./system-auth-isolated-r1-dev.html';
function intercept(ev){
  const t=ev.target&&ev.target.closest?ev.target.closest('#'+SYSTEM_ID):null;
  if(!t)return;
  ev.preventDefault();
  ev.stopPropagation();
  if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
  if(!navigator.onLine){
    try{window.WATER_MANAGE_STATUS&&window.WATER_MANAGE_STATUS.set('FILE HỆ THỐNG cần Internet để xác thực.','err');}catch(e){}
    return false;
  }
  try{sessionStorage.setItem('water_system_auth_return','./r9-system-auth-isolated-r1-dev.html?returned=1#manage');}catch(e){}
  window.location.assign(AUTH_PAGE+'?t='+Date.now());
  return false;
}
document.addEventListener('click',intercept,true);
window.WATER_SYSTEMFILE_ROUTE_ISOLATED_R1=Object.freeze({BUILD:'systemfile-route-isolated-r1-dev'});
})();
