(function(){
  'use strict';

  const BUILD='water-auth-logout-row-v1';

  const style=document.createElement('style');
  style.id='waterAuthLogoutRowStyle';
  style.textContent=`
    .row #waterAuthLogout{
      position:static!important;
      right:auto!important;
      bottom:auto!important;
      z-index:auto!important;
      flex:1 1 0!important;
      width:auto!important;
      min-width:0!important;
      max-width:none!important;
      height:auto!important;
      margin:0!important;
      padding:10px 6px!important;
      border:1px solid #ccc!important;
      border-radius:13px!important;
      background:#fff!important;
      color:#111!important;
      font-size:13px!important;
      font-weight:800!important;
      line-height:normal!important;
      text-align:center!important;
      box-shadow:none!important;
      cursor:pointer!important;
    }
  `;
  document.head.appendChild(style);

  function mountLogoutBesideSync(){
    const logout=document.getElementById('waterAuthLogout');
    const sync=document.getElementById('syncBtn');
    if(!logout || !sync)return false;

    const row=sync.closest('.row');
    if(!row)return false;

    logout.textContent='ĐĂNG XUẤT';
    logout.classList.add('waterAuthLogoutRowBtn');

    if(logout.parentElement!==row){
      row.appendChild(logout);
    }

    return true;
  }

  function settle(){
    [0,60,180,400,800,1500,3000].forEach(function(ms){
      setTimeout(mountLogoutBesideSync,ms);
    });
  }

  window.addEventListener('WATER_AUTH_OK',settle);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',settle,{once:true});
  }else{
    settle();
  }

  window.WATER_AUTH_LOGOUT_ROW_BUILD=BUILD;
})();
