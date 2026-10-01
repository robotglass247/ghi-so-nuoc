/* M&E OPS AUTO CLONE V1 - shared frontend config. */
(function(){
  'use strict';
  const q=new URLSearchParams(location.search||'');
  const project=String(q.get('project')||'').trim().toUpperCase();
  window.MEOPS_PROJECT_CONFIG={
    projectCode:project,
    projectName:'M&E OPS',
    siteName:project ? ('DỰ ÁN '+project) : 'CHƯA CHỌN DỰ ÁN',
    location:'',
    version:'AUTO-V1',
    backendUrl:'__MEOPS_AUTO_BACKEND_URL__',
    passHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    publicUrl:'https://robotglass247.github.io/ghi-so-nuoc/me-ops-auto/',
    brandSubtitle:'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT'
  };
})();
