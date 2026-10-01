/* M&E OPS AUTO CLONE V2 - one shared app, many PROJECT_IDs. */
(function(){
  'use strict';
  const q=new URLSearchParams(location.search||'');
  const project=String(q.get('project')||'').trim().toUpperCase();
  window.MEOPS_PROJECT_CONFIG={
    projectCode:project,
    projectName:'M&E OPS',
    siteName:'',
    location:'',
    version:'AUTO-V2-ONECLICK',
    backendUrl:'https://script.google.com/macros/s/AKfycbxJNgLV33P3fyZhE1-4U_7O7KytnvseFftdEHH6WnT91PnpiKuXlniArwOk8VWPzfw/exec',
    publicUrl:'https://robotglass247.github.io/ghi-so-nuoc/me-ops-auto/',
    brandSubtitle:'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT'
  };
})();
