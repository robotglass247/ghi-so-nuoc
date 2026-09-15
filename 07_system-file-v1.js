/* ============================================================
MODULE_ID: 07
MODULE_NAME: system-file
VERSION: 2.2.0
STATUS: STABLE - RESTRICTED DRIVE
DEPENDENCIES: 03_manage-core-v1.js, 08_manage-status-v1.js
RESPONSIBILITY: Open FILE HỆ THỐNG only.
SECURITY: Google Drive restricted sharing is the source of truth.
============================================================ */
(function(){
  'use strict';

  const core=window.WATER_MANAGE_CORE;
  const ui=window.WATER_MANAGE_STATUS;

  if(!core||!ui){
    throw new Error('system-file thiếu dependency');
  }

  function systemUrl(){
    return core.CFG.SYSTEM_SHEET_URL;
  }

  function openSystemFile(){
    const targetUrl=systemUrl();

    if(!targetUrl){
      ui.set('Chưa cấu hình FILE HỆ THỐNG.','err');
      return false;
    }

    ui.set('Đang mở FILE HỆ THỐNG...','');

    /*
     * KHÔNG kiểm tra quyền bằng gviz/JSONP/email ở trình duyệt.
     * File Google Drive để HẠN CHẾ.
     * NHAN_SU_THUC_HIEN + Apps Script chịu trách nhiệm cấp/gỡ quyền Drive.
     * Google Drive tự xác thực tài khoản Google đang đăng nhập khi mở link.
     */
    try{
      const w=window.open(targetUrl,'_blank','noopener,noreferrer');
      if(!w){
        window.location.href=targetUrl;
      }
    }catch(e){
      window.location.href=targetUrl;
    }

    return true;
  }

  function bind(){
    const b=core.el('waterSystemFileR118');

    if(!b||b.dataset.systemModuleBound==='22'){
      return false;
    }

    b.dataset.systemModuleBound='22';
    b.disabled=false;
    b.removeAttribute('disabled');
    b.setAttribute('aria-disabled','false');

    b.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation){
        ev.stopImmediatePropagation();
      }
      openSystemFile();
      return false;
    },false);

    return true;
  }

  document.addEventListener('WATER_MANAGE_CARD_READY',bind);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bind,{once:true});
  }else{
    bind();
  }

  if(window.MutationObserver){
    new MutationObserver(bind).observe(document.documentElement,{
      childList:true,
      subtree:true
    });
  }

  window.WATER_MANAGE_SYSTEM={
    BUILD:'system-file-v2.2.0-drive-acl',
    bind:bind,
    openSystemFile:openSystemFile,
    systemUrl:systemUrl
  };
})();
