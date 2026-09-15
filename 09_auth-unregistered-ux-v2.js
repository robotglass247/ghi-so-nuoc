/* ============================================================
MODULE_ID: 09-SHEETS-UX
MODULE_NAME: auth-unregistered-ux
VERSION: 2.0.0-DEV
STATUS: DEV ONLY
PURPOSE:
  Replace technical AUTH/Sheets denial messages with a friendly
  unregistered-account warning, then return to auth screen after 2s.
  Does NOT modify the PASS auth module.
============================================================ */
(function(){
  'use strict';

  if(window.WATER_AUTH_UNREGISTERED_UX_V2) return;

  const WARNING='Tài khoản chưa đăng ký, hãy chọn tài khoản đã đăng ký hoặc liên hệ Quản lý để cấp quyền sử dụng.';
  const READY='Bấm “Đăng nhập bằng Google” để kiểm tra quyền sử dụng.';
  const RESET_MS=2000;

  let busy=false;
  let resetTimer=null;

  function norm(v){
    return String(v==null?'':v)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/Đ/g,'D')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }

  function isTechnicalDenied(text){
    const t=norm(text);
    if(!t) return false;
    return (
      t.indexOf('khong co trong danh sach phan quyen')>=0 ||
      t.indexOf('chua duoc cap quyen doc auth sheet')>=0 ||
      t.indexOf('chua chap thuan quyen google sheets')>=0 ||
      t.indexOf('permission denied')>=0 ||
      t.indexOf('caller does not have permission')>=0 ||
      t.indexOf('access denied')>=0 ||
      t.indexOf('forbidden')>=0
    );
  }

  function overlay(){return document.getElementById('waterAuthSheetsOverlay');}
  function message(){return document.getElementById('waterAuthSheetsMsg');}

  function showOverlay(){
    const o=overlay();
    if(o) o.style.display='flex';
  }

  function showFriendlyWarning(){
    if(busy) return;
    const m=message();
    if(!m) return;

    busy=true;
    clearTimeout(resetTimer);
    showOverlay();

    m.textContent=WARNING;
    m.className='msg err';

    try{
      if(window.WATER_MANAGE_STATUS && typeof window.WATER_MANAGE_STATUS.set==='function'){
        window.WATER_MANAGE_STATUS.set(WARNING,'err');
      }
    }catch(e){}

    resetTimer=setTimeout(function(){
      showOverlay();
      const mm=message();
      if(mm){
        mm.textContent=READY;
        mm.className='msg';
      }
      busy=false;
    },RESET_MS);
  }

  function inspect(){
    if(busy) return;
    const m=message();
    if(!m) return;
    if(isTechnicalDenied(m.textContent)) showFriendlyWarning();
  }

  function start(){
    // Polling is intentional here: the base AUTH module changes textContent
    // from async callbacks. This is isolated DEV UX and avoids touching PASS code.
    setInterval(inspect,120);

    window.WATER_AUTH_UNREGISTERED_UX_V2=Object.freeze({
      BUILD:'auth-unregistered-ux-v2.0.0-dev',
      warning:WARNING,
      resetDelayMs:RESET_MS,
      inspect:inspect
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
