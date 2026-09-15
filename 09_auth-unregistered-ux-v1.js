/* ============================================================
MODULE_ID: 09-SHEETS-UX
MODULE_NAME: auth-unregistered-ux
VERSION: 1.0.0-DEV
STATUS: DEV ONLY
PURPOSE:
  Friendly handling for an unregistered / unauthorized Google account.
  Keeps the already-PASS auth-sheets module untouched.
BEHAVIOR:
  - Show the requested warning.
  - After 2 seconds, return to the Google authentication prompt.
============================================================ */
(function(){
  'use strict';

  if(window.WATER_AUTH_UNREGISTERED_UX) return;

  const WARNING='Tài khoản chưa đăng ký, hãy chọn tài khoản đã đăng ký hoặc liên hệ Quản lý để cấp quyền sử dụng.';
  const READY='Bấm “Đăng nhập bằng Google” để kiểm tra quyền sử dụng.';
  const MATCHES=[
    'Email Google không có trong danh sách phân quyền.',
    'Tài khoản Google chưa được cấp quyền đọc AUTH Sheet hoặc chưa chấp thuận quyền Google Sheets.'
  ];

  let timer=null;
  let busy=false;

  function isTargetMessage(text){
    const t=String(text||'').trim();
    return MATCHES.indexOf(t)>=0;
  }

  function getOverlay(){
    return document.getElementById('waterAuthSheetsOverlay');
  }

  function getMessage(){
    return document.getElementById('waterAuthSheetsMsg');
  }

  function showOverlay(){
    const overlay=getOverlay();
    if(overlay) overlay.style.display='flex';
  }

  function showWarningAndReset(){
    if(busy) return;
    const msg=getMessage();
    if(!msg) return;

    busy=true;
    clearTimeout(timer);
    showOverlay();

    msg.textContent=WARNING;
    msg.className='msg err';

    try{
      if(window.WATER_MANAGE_STATUS&&typeof window.WATER_MANAGE_STATUS.set==='function'){
        window.WATER_MANAGE_STATUS.set(WARNING,'err');
      }
    }catch(e){}

    timer=setTimeout(function(){
      const current=getMessage();
      showOverlay();
      if(current){
        current.textContent=READY;
        current.className='msg';
      }
      busy=false;
    },2000);
  }

  function inspect(){
    const msg=getMessage();
    if(!msg) return;
    if(isTargetMessage(msg.textContent)) showWarningAndReset();
  }

  function start(){
    inspect();

    const observer=new MutationObserver(function(){
      if(busy) return;
      inspect();
    });

    observer.observe(document.documentElement,{
      childList:true,
      subtree:true,
      characterData:true
    });

    window.WATER_AUTH_UNREGISTERED_UX=Object.freeze({
      BUILD:'auth-unregistered-ux-v1.0.0-dev',
      warning:WARNING,
      resetDelayMs:2000
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
