(function(){
  'use strict';

  const BUILD='water-auth-post-login-lock-v1';
  const style=document.createElement('style');
  style.id='waterAuthPostLoginLockStyle';
  style.textContent=`
    html.waterAuthStaffLocked #waterAuthGate{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
  `;
  document.head.appendChild(style);

  window.WATER_AUTH_POST_LOGIN_LOCK_BUILD=BUILD;
})();
