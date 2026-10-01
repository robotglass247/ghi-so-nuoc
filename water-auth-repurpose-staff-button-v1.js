(function(){
  'use strict';

  const BUILD='water-auth-repurpose-staff-button-v1';
  const params=new URLSearchParams(location.search);
  const PROJECT_ID=String(
    params.get('project') ||
    params.get('projectId') ||
    window.WATER_PROJECT_ID ||
    ''
  ).trim().toUpperCase();

  function fallbackLogout(){
    try{sessionStorage.removeItem('water_auth_v3_'+PROJECT_ID);}catch(e){}
    try{sessionStorage.removeItem('water_staff');}catch(e){}
    try{localStorage.removeItem('water_staff');}catch(e){}
    try{window.WATER_AUTH_STAFF=null;}catch(e){}
    location.reload();
  }

  function apply(){
    const sync=document.getElementById('syncBtn');
    if(!sync)return false;

    const row=sync.closest('.row');
    if(!row)return false;

    const buttons=Array.from(row.querySelectorAll('button'));
    let staffBtn=buttons.find(function(btn){
      if(btn===sync)return false;
      const oc=String(btn.getAttribute('onclick')||'');
      const txt=String(btn.textContent||'').trim().toUpperCase();
      return oc.indexOf('openStaff')>=0 || txt.indexOf('ĐỔI NHÂN SỰ')>=0;
    });

    if(!staffBtn){
      staffBtn=document.getElementById('waterAuthLogoutPassButton');
    }
    if(!staffBtn)return false;

    // Chỉ đổi chức năng của đúng nút cũ; giữ nguyên class/style/layout PASS.
    staffBtn.removeAttribute('onclick');
    try{staffBtn.onclick=null;}catch(e){}
    staffBtn.id='waterAuthLogoutPassButton';
    staffBtn.textContent='ĐĂNG XUẤT';
    staffBtn.style.removeProperty('display');

    if(!staffBtn.dataset.waterLogoutBound){
      staffBtn.dataset.waterLogoutBound='1';
      staffBtn.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        const original=document.getElementById('waterAuthLogout');
        if(original && original!==staffBtn){
          original.click();
        }else{
          fallbackLogout();
        }
      });
    }

    // Nút logout do Auth tạo chỉ giữ làm handler, không hiển thị thêm UI.
    const original=document.getElementById('waterAuthLogout');
    if(original && original!==staffBtn){
      original.style.setProperty('display','none','important');
      original.setAttribute('aria-hidden','true');
      original.tabIndex=-1;
    }

    return true;
  }

  function settle(){
    [0,60,180,450,900,1800,3500].forEach(function(ms){
      setTimeout(apply,ms);
    });
  }

  window.addEventListener('WATER_AUTH_OK',settle);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',settle,{once:true});
  }else{
    settle();
  }

  window.WATER_AUTH_REPURPOSE_STAFF_BUTTON_BUILD=BUILD;
})();
