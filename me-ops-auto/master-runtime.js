(function(){
  'use strict';
  const c=window.MEOPS_PROJECT_CONFIG||{};
  let hydrateInFlight=false;
  let hydrateCompleted=false;

  function projectCode(){
    return String(c.projectCode||'').trim().toUpperCase();
  }

  function userCacheKey(){
    return 'meops_user_session_v1_'+(projectCode()||'NO_PROJECT');
  }

  function apply(){
    const product=c.projectName||'M&E OPS';
    const site=c.siteName||c.projectCode||'';
    document.title=site?product+' · '+site:product;
    const strong=document.querySelector('.brand strong');
    if(strong) strong.textContent=product;
    const small=document.querySelector('.brand small');
    if(small) small.textContent=site?(site+' · '+(c.brandSubtitle||'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT')):(c.brandSubtitle||'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT');
    document.documentElement.setAttribute('data-project-code',c.projectCode||'');
    document.documentElement.setAttribute('data-project-version',c.version||'');
  }

  function injectUserStyle(){
    if(document.getElementById('meops-user-session-style')) return;
    const style=document.createElement('style');
    style.id='meops-user-session-style';
    style.textContent=`
      .user{gap:8px}
      .user .meops-user-name{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .user .meops-logout-btn{border:1px solid #dbe7f5;background:#fff;color:#365577;border-radius:9px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
      .user .meops-logout-btn:hover{background:#fff4f4;border-color:#ffc8c8;color:#c53a3a}
      @media(max-width:760px){
        .user .meops-user-name{max-width:105px}
        .user .meops-logout-btn{padding:7px 8px;font-size:11px}
      }
    `;
    document.head.appendChild(style);
  }

  function initialFor(text){
    const s=String(text||'').trim();
    if(!s) return 'U';
    const local=s.indexOf('@')>0?s.split('@')[0]:s;
    const parts=local.split(/[\s._-]+/).filter(Boolean);
    const source=parts.length?parts[parts.length-1]:local;
    return String(source.charAt(0)||'U').toUpperCase();
  }

  function normalizeUser(x){
    x=x||{};
    const email=String(x.userEmail||x.email||'').trim();
    const displayName=String(
      x.userName||x.displayName||x.userDisplayName||x.fullName||x.userFullName||''
    ).trim();
    return {
      name:displayName||email||'Người dùng',
      email:email
    };
  }

  function prepareUserUi(){
    injectUserStyle();
    const box=document.querySelector('.user');
    if(!box) return null;

    let avatar=box.querySelector('.avatar');
    if(!avatar){
      avatar=document.createElement('div');
      avatar.className='avatar';
      box.appendChild(avatar);
    }

    let name=box.querySelector('.meops-user-name')||box.querySelector('span');
    if(!name){
      name=document.createElement('span');
      box.appendChild(name);
    }
    name.classList.add('meops-user-name');
    name.id='meopsUserName';

    let logout=box.querySelector('.meops-logout-btn');
    if(!logout){
      logout=document.createElement('button');
      logout.type='button';
      logout.className='meops-logout-btn';
      logout.textContent='Đăng xuất';
      logout.title='Đăng xuất khỏi M&E OPS';
      logout.addEventListener('click',logoutApp);
      box.appendChild(logout);
    }

    return {box:box,avatar:avatar,name:name,logout:logout};
  }

  function applyUser(user){
    const ui=prepareUserUi();
    if(!ui) return;
    user=user||{name:'Người dùng',email:''};
    const text=String(user.name||user.email||'Người dùng').trim()||'Người dùng';
    ui.name.textContent=text;
    ui.name.title=String(user.email||text);
    ui.avatar.textContent=initialFor(text);
  }

  function saveUserSession(user){
    try{
      sessionStorage.setItem(userCacheKey(),JSON.stringify(user||{}));
    }catch(e){}
  }

  function hydrateUserFromSession(){
    try{
      const raw=sessionStorage.getItem(userCacheKey());
      if(!raw) return false;
      const user=JSON.parse(raw);
      if(!user) return false;
      applyUser(user);
      return true;
    }catch(e){
      return false;
    }
  }

  function logoutApp(){
    const project=projectCode();
    try{ sessionStorage.removeItem('meops_unlock_once_v5'); }catch(e){}
    try{ sessionStorage.removeItem(userCacheKey()); }catch(e){}
    try{ sessionStorage.removeItem('meops_current_user'); }catch(e){}
    const url='./water.html?logout=1&project='+encodeURIComponent(project);
    location.replace(url);
  }

  function injectCatalogSetup(){
    try{
      if(document.querySelector('script[data-meops-catalog-setup]')) return;
      const s=document.createElement('script');
      s.src='./catalog-setup-v2.js?v=1';
      s.async=true;
      s.setAttribute('data-meops-catalog-setup','1');
      document.head.appendChild(s);
    }catch(e){
      console.error('[M&E OPS] Không nạp được Thiết lập dự án',e);
    }
  }

  function injectKpiLiveSync(){
    try{
      if(document.querySelector('script[data-meops-kpi-live-sync]')) return;
      const s=document.createElement('script');
      s.src='./kpi-live-sync-v1.js?v=2';
      s.async=true;
      s.setAttribute('data-meops-kpi-live-sync','1');
      document.head.appendChild(s);
    }catch(e){
      console.error('[M&E OPS] Không nạp được KPI Live Sync',e);
    }
  }

  function injectResultModule(){
    try{
      if(document.querySelector('script[data-meops-result-v2]')) return;
      const s=document.createElement('script');
      s.src='./result-module-v2.js?v=1';
      s.async=true;
      s.setAttribute('data-meops-result-v2','1');
      document.head.appendChild(s);
    }catch(e){
      console.error('[M&E OPS] Không nạp được module Nhập kết quả V2',e);
    }
  }

  function injectTodayWorkType(){
    try{
      if(document.querySelector('script[data-meops-today-worktype]')) return;
      const s=document.createElement('script');
      s.src='./today-worktype-v1.js?v=2';
      s.async=true;
      s.setAttribute('data-meops-today-worktype','1');
      document.head.appendChild(s);
    }catch(e){
      console.error('[M&E OPS] Không nạp được Loại công việc hôm nay',e);
    }
  }

  function loadCatalogSetup(){ injectCatalogSetup(); }

  function hydrate(){
    if(hydrateInFlight||hydrateCompleted) return;
    try{
      if(!window.google||!google.script||!google.script.run){setTimeout(hydrate,350);return;}
      hydrateInFlight=true;
      google.script.run.withSuccessHandler(function(x){
        hydrateInFlight=false;
        hydrateCompleted=true;
        const p=x&&x.project?x.project:null;
        if(p){
          if(p.projectName)c.projectName=p.projectName;
          if(p.siteName)c.siteName=p.siteName;
          if(p.projectCode)c.projectCode=p.projectCode;
          if(p.version)c.version=p.version;
          apply();
        }
        const user=normalizeUser(x);
        applyUser(user);
        saveUserSession(user);
      }).withFailureHandler(function(){
        hydrateInFlight=false;
      }).getAppConfig();
    }catch(e){
      hydrateInFlight=false;
    }
  }

  function hydrateFromCache(){
    try{
      const project=projectCode();
      if(!project) return;
      const raw=localStorage.getItem('meops_public_project_v2_'+project);
      if(!raw) return;
      const box=JSON.parse(raw);
      const p=box&&box.data?box.data:null;
      if(!p) return;
      if(p.projectName)c.projectName=p.projectName;
      if(p.siteName)c.siteName=p.siteName;
      if(p.projectCode)c.projectCode=p.projectCode;
      if(p.version)c.version=p.version;
      apply();
    }catch(e){}
  }

  function start(){
    apply();
    hydrateFromCache();
    prepareUserUi();
    if(!hydrateUserFromSession()) applyUser({name:'Đang xác định…',email:''});
    setTimeout(loadCatalogSetup,900);
    setTimeout(injectResultModule,1200);

    // Không tranh hàng đợi với Dashboard: lấy tên người dùng sau khi dữ liệu chính đã sẵn sàng.
    window.addEventListener('meops:dashboard-ready',function(){setTimeout(hydrate,300);},{once:true});
    // Fallback nếu Dashboard không phát sự kiện.
    setTimeout(hydrate,5500);
  }

  window.MEOPS_LOGOUT=logoutApp;

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
