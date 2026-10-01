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
    backendUrl:'__MEOPS_AUTO_BACKEND_URL__',
    publicUrl:'https://robotglass247.github.io/ghi-so-nuoc/me-ops-auto/',
    brandSubtitle:'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT'
  };
})();
