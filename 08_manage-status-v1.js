/* ============================================================
MODULE_ID: 08
MODULE_NAME: manage-status
VERSION: 1.0.0
STATUS: PASS-CANDIDATE
DEPENDENCIES: 03_manage-core-v1.js
RESPONSIBILITY: status line only
============================================================ */
(function(){
  'use strict';
  const core=window.WATER_MANAGE_CORE;
  if(!core)throw new Error('manage-status thiếu manage-core');

  function set(message,kind){
    const n=core.el('waterExportR118Status');
    if(!n)return;
    n.className=kind||'';
    n.textContent=message||'';
  }
  function clear(){ set('',''); }
  window.WATER_MANAGE_STATUS=Object.freeze({BUILD:'manage-status-v1.0.0',set,clear});
})();
