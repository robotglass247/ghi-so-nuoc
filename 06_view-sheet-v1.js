/* ============================================================
MODULE_ID: 06
MODULE_NAME: view-sheet
VERSION: 1.0.0
STATUS: PASS/FROZEN CANDIDATE
DEPENDENCIES: 03_manage-core-v1.js, 08_manage-status-v1.js
RESPONSIBILITY: XEM CHỈ SỐ only
============================================================ */
(function(){
  'use strict';
  const core=window.WATER_MANAGE_CORE,ui=window.WATER_MANAGE_STATUS;
  if(!core||!ui)throw new Error('view-sheet thiếu dependency');
  function open(){ui.set('Đang mở xem file trên Google Sheet...','');window.open(core.CFG.MANAGER_SHEET_URL,'_blank','noopener,noreferrer');return true;}
  function bind(){const b=core.el('waterViewR118');if(!b||b.dataset.viewModuleBound==='1')return false;b.dataset.viewModuleBound='1';b.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();open();return false;},false);return true;}
  document.addEventListener('WATER_MANAGE_CARD_READY',bind);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  if(window.MutationObserver)new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
  window.WATER_MANAGE_VIEW=Object.freeze({BUILD:'view-sheet-v1.0.0',bind,open});
})();
