(function(){
  'use strict';
  const c=window.MEOPS_PROJECT_CONFIG||{};

  function projectCode(){
    const q=new URLSearchParams(location.search||'');
    return String(q.get('project')||c.projectCode||'').trim().toUpperCase();
  }
  function authKey(){return 'meops_auth_session_v1_'+(projectCode()||'NO_PROJECT')}
  function userKey(){return 'meops_user_session_v1_'+(projectCode()||'NO_PROJECT')}

  function apply(){
    const product=c.projectName||'M&E OPS';
    const site=c.siteName||c.projectCode||projectCode()||'';
    document.title=site?product+' · '+site:product;
    const strong=document.querySelector('.brand strong');
    if(strong) strong.textContent=product;
    const small=document.querySelector('.brand small');
    if(small) small.textContent=site?(site+' · '+(c.brandSubtitle||'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT')):(c.brandSubtitle||'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT');
    document.documentElement.setAttribute('data-project-code',projectCode());
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
      .meops-mobile-account{display:none}
      @media(max-width:760px){
        .meops-mobile-account{display:block;margin-top:8px;padding:10px;border-top:1px solid #e6eef7}
        .meops-mobile-name{font-size:12px;font-weight:800;color:#234264;margin-bottom:7px;overflow:hidden;text-overflow:ellipsis}
        .meops-mobile-logout{width:100%;border:1px solid #ffd1d1;background:#fff6f6;color:#b42318;border-radius:9px;padding:10px;font-weight:800}
      }
    `;
    document.head.appendChild(style);
  }

  function initialFor(text){
    const s=String(text||'').trim();
    if(!s)return 'U';
    const parts=s.split(/\s+/).filter(Boolean);
    return String((parts[parts.length-1]||s).charAt(0)||'U').toUpperCase();
  }

  function readUser(){
    try{
      const a=JSON.parse(sessionStorage.getItem(authKey())||'null');
      if(a&&a.staff&&a.sessionToken&&Number(a.expiresAt||0)>Date.now()){
        return {
          name:String(a.staff.ten||'Người dùng'),
          staffCode:String(a.staff.ma||''),
          department:String(a.staff.boPhan||''),
          role:String(a.staff.quyen||'')
        };
      }
    }catch(e){}
    try{
      const u=JSON.parse(sessionStorage.getItem(userKey())||'null');
      if(u&&u.name)return u;
    }catch(e){}
    return null;
  }

  function prepareUserUi(user){
    injectUserStyle();
    const box=document.querySelector('.user');
    if(box){
      let avatar=box.querySelector('.avatar');
      if(!avatar){avatar=document.createElement('div');avatar.className='avatar';box.appendChild(avatar)}
      let name=box.querySelector('.meops-user-name')||box.querySelector('span');
      if(!name){name=document.createElement('span');box.appendChild(name)}
      name.classList.add('meops-user-name');
      name.id='meopsUserName';
      let logout=box.querySelector('.meops-logout-btn');
      if(!logout){
        logout=document.createElement('button');
        logout.type='button';logout.className='meops-logout-btn';
        logout.textContent='Đăng xuất';
        logout.title='Đăng xuất khỏi M&E OPS';
        logout.addEventListener('click',logoutApp);
        box.appendChild(logout);
      }
      const text=String(user&&user.name||'Người dùng');
      name.textContent=text;
      name.title=[
        text,
        user&&user.department?user.department:'',
        user&&user.role?user.role:''
      ].filter(Boolean).join(' · ');
      avatar.textContent=initialFor(text);
    }

    const sidebar=document.getElementById('sidebar');
    if(sidebar&&!sidebar.querySelector('.meops-mobile-account')){
      const wrap=document.createElement('div');
      wrap.className='meops-mobile-account';
      const n=document.createElement('div');
      n.className='meops-mobile-name';
      n.textContent=String(user&&user.name||'Người dùng');
      const b=document.createElement('button');
      b.type='button';b.className='meops-mobile-logout';b.textContent='Đăng xuất';
      b.addEventListener('click',logoutApp);
      wrap.appendChild(n);wrap.appendChild(b);sidebar.appendChild(wrap);
    }
  }

  function logoutApp(){
    const project=projectCode();
    try{sessionStorage.removeItem('meops_unlock_once_v5')}catch(e){}
    try{sessionStorage.removeItem(authKey())}catch(e){}
    try{sessionStorage.removeItem(userKey())}catch(e){}
    try{sessionStorage.removeItem('meops_current_user')}catch(e){}
    location.replace('./water.html?logout=1&project='+encodeURIComponent(project));
  }

  function hydrateFromCache(){
    try{
      const project=projectCode();
      if(!project)return;
      const raw=localStorage.getItem('meops_public_project_v2_'+project);
      if(!raw)return;
      const box=JSON.parse(raw);
      const p=box&&box.data?box.data:null;
      if(!p)return;
      if(p.projectName)c.projectName=p.projectName;
      if(p.siteName)c.siteName=p.siteName;
      if(p.projectCode)c.projectCode=p.projectCode;
      if(p.version)c.version=p.version;
      apply();
    }catch(e){}
  }

  function injectCatalogSetup(){
    try{
      if(document.querySelector('script[data-meops-catalog-setup]'))return;
      const s=document.createElement('script');
      s.src='./catalog-setup-v2.js?v=1';s.async=true;
      s.setAttribute('data-meops-catalog-setup','1');document.head.appendChild(s);
    }catch(e){}
  }
  function injectResultModule(){
    try{
      if(document.querySelector('script[data-meops-result-v2]'))return;
      const s=document.createElement('script');
      s.src='./result-module-v2.js?v=1';s.async=true;
      s.setAttribute('data-meops-result-v2','1');document.head.appendChild(s);
    }catch(e){}
  }

  function start(){
    apply();
    hydrateFromCache();
    const user=readUser();
    if(!user){
      logoutApp();
      return;
    }
    try{sessionStorage.setItem(userKey(),JSON.stringify(user))}catch(e){}
    try{sessionStorage.setItem('meops_current_user',JSON.stringify(user))}catch(e){}
    prepareUserUi(user);
    setTimeout(injectCatalogSetup,900);
    setTimeout(injectResultModule,1200);
  }

  window.MEOPS_LOGOUT=logoutApp;
  window.MEOPS_CURRENT_USER=function(){return readUser()};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
