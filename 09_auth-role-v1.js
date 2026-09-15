/* ============================================================
MODULE_ID: 09
MODULE_NAME: auth-role
VERSION: 1.1.0-DEV
STATUS: DEV ONLY - DOES NOT MODIFY PASS MODULES
DEPENDENCIES: WATER_MANAGE_CORE, WATER_MANAGE_STATUS
RESPONSIBILITY: Google identity login + role based UI gating only
ROLE MATRIX:
  QUẢN LÝ   -> FILE HỆ THỐNG + TẢI FILE + XEM CHỈ SỐ
  NHÂN VIÊN -> TẢI FILE + XEM CHỈ SỐ
  OTHER     -> DENY ALL
TRANSPORT: hidden FORM POST -> Apps Script iframe -> postMessage
SECURITY: Google ID token is verified server-side by AUTH GATEWAY.
============================================================ */
(function(){
  'use strict';

  const core=window.WATER_MANAGE_CORE;
  const ui=window.WATER_MANAGE_STATUS;
  const cfg=window.WATER_AUTH_CONFIG||{};

  if(!core||!ui){
    throw new Error('auth-role thiếu dependency');
  }

  const IDS=Object.freeze({
    SYSTEM:'waterSystemFileR118',
    DOWNLOAD:'waterDownloadR118',
    VIEW:'waterViewR118'
  });

  const PERM_KEY=Object.freeze({
    [IDS.SYSTEM]:'system',
    [IDS.DOWNLOAD]:'download',
    [IDS.VIEW]:'view'
  });

  const state={
    ready:false,
    authenticated:false,
    authorized:false,
    email:'',
    name:'',
    role:'',
    status:'',
    permissions:{system:false,download:false,view:false},
    reason:'Chưa xác thực tài khoản Google'
  };

  function norm(v){
    return core.norm ? core.norm(v) : String(v||'').trim().toLowerCase();
  }

  function rolePermissions(role){
    const r=norm(role);
    if(r==='quan ly')return {system:true,download:true,view:true};
    if(r==='nhan vien')return {system:false,download:true,view:true};
    return {system:false,download:false,view:false};
  }

  function ensureStyle(){
    if(document.getElementById('waterAuthRoleStyle'))return;
    const s=document.createElement('style');
    s.id='waterAuthRoleStyle';
    s.textContent=`
      [data-water-auth-locked="1"]{opacity:.42!important;cursor:not-allowed!important;filter:grayscale(.35)}
      #waterAuthRoleBadge{margin:7px 0 0;text-align:center;font-size:10.5px;font-weight:800;line-height:1.35;color:#465461}
      #waterAuthRoleBadge.ok{color:#2a6942}#waterAuthRoleBadge.err{color:#a23a2a}
      #waterAuthOverlay{position:fixed;inset:0;z-index:2147483000;background:rgba(15,22,29,.92);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Arial,sans-serif}
      #waterAuthOverlay .box{width:min(420px,100%);background:#fff;color:#18232d;border-radius:14px;padding:22px 18px;box-sizing:border-box;text-align:center;box-shadow:0 10px 34px rgba(0,0,0,.30)}
      #waterAuthOverlay .title{font-size:17px;font-weight:900;margin-bottom:10px;color:#174f7e}
      #waterAuthOverlay .msg{font-size:13px;font-weight:700;line-height:1.5;margin-bottom:16px;color:#465461}
      #waterAuthOverlay .err{color:#a23a2a}
      #waterAuthGoogleButton{display:flex;justify-content:center;min-height:40px}
    `;
    document.head.appendChild(s);
  }

  function ensureBadge(){
    const card=document.getElementById('waterExportR118');
    if(!card)return null;
    let b=document.getElementById('waterAuthRoleBadge');
    if(!b){
      b=document.createElement('div');
      b.id='waterAuthRoleBadge';
      card.appendChild(b);
    }
    return b;
  }

  function setBadge(text,type){
    const b=ensureBadge();
    if(!b)return;
    b.className=type||'';
    b.textContent=text||'';
  }

  function ensureOverlay(){
    let o=document.getElementById('waterAuthOverlay');
    if(o)return o;
    o=document.createElement('div');
    o.id='waterAuthOverlay';
    o.innerHTML='<div class="box"><div class="title">XÁC THỰC TÀI KHOẢN GOOGLE</div><div id="waterAuthOverlayMsg" class="msg">Đang chuẩn bị đăng nhập...</div><div id="waterAuthGoogleButton"></div></div>';
    document.body.appendChild(o);
    return o;
  }

  function overlayMessage(text,isError){
    const o=ensureOverlay();
    const m=o.querySelector('#waterAuthOverlayMsg');
    if(m){
      m.textContent=text||'';
      m.className='msg'+(isError?' err':'');
    }
  }

  function hideOverlay(){
    const o=document.getElementById('waterAuthOverlay');
    if(o)o.style.display='none';
  }

  function showOverlay(){
    const o=ensureOverlay();
    o.style.display='flex';
  }

  function applyVisualAccess(){
    Object.keys(PERM_KEY).forEach(function(id){
      const el=document.getElementById(id);
      if(!el)return;
      const key=PERM_KEY[id];
      const allowed=!!state.permissions[key];
      el.setAttribute('aria-disabled',allowed?'false':'true');
      if(allowed){
        el.removeAttribute('data-water-auth-locked');
        if(el.tagName==='BUTTON')el.disabled=false;
      }else{
        el.setAttribute('data-water-auth-locked','1');
        if(el.tagName==='BUTTON')el.disabled=false;
      }
    });

    if(state.authorized){
      setBadge('Tài khoản: '+(state.name||state.email)+' · '+state.role,'ok');
    }else{
      setBadge(state.reason||'Không có quyền truy cập','err');
    }
  }

  function denyAll(reason){
    state.ready=true;
    state.authorized=false;
    state.permissions={system:false,download:false,view:false};
    state.reason=reason||'Không có quyền truy cập';
    applyVisualAccess();
  }

  function allowFromServer(data){
    state.ready=true;
    state.authenticated=true;
    state.authorized=!!data.authorized;
    state.email=String(data.email||'');
    state.name=String(data.name||'');
    state.role=String(data.role||'');
    state.status=String(data.status||'');
    state.reason=String(data.reason||'');
    state.permissions=state.authorized ? rolePermissions(state.role) : {system:false,download:false,view:false};
    applyVisualAccess();
  }

  function isEventForControlledElement(target){
    if(!target||!target.closest)return null;
    return target.closest('#'+IDS.SYSTEM+',#'+IDS.DOWNLOAD+',#'+IDS.VIEW);
  }

  function openSystemDirect(){
    const url=core.CFG&&core.CFG.SYSTEM_SHEET_URL;
    if(!url){ui.set('Chưa cấu hình FILE HỆ THỐNG.','err');return false;}
    ui.set('Đang mở FILE HỆ THỐNG...','');
    try{
      const w=window.open(url,'_blank','noopener,noreferrer');
      if(!w)window.location.href=url;
    }catch(e){
      window.location.href=url;
    }
    return true;
  }

  function guardEvent(ev){
    const el=isEventForControlledElement(ev.target);
    if(!el)return;
    const key=PERM_KEY[el.id];
    if(!key)return;

    if(state.permissions[key]){
      // FILE HỆ THỐNG được Module 09 xử lý trực tiếp để không đi qua
      // logic quyền cũ trong module 07 PASS. Module 07 vẫn giữ nguyên.
      if(key==='system'){
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
        openSystemDirect();
      }
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

    const msg=!state.authenticated
      ? 'Vui lòng xác thực tài khoản Google.'
      : (state.reason||'Tài khoản không được phép sử dụng chức năng này.');
    ui.set(msg,'err');
    if(!state.authenticated)showOverlay();
  }

  document.addEventListener('click',guardEvent,true);

  function loadGoogleIdentity(){
    return new Promise(function(resolve,reject){
      if(window.google&&window.google.accounts&&window.google.accounts.id){resolve();return;}
      const existing=document.querySelector('script[data-water-gsi="1"]');
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',function(){reject(new Error('Không tải được Google Identity Services'));},{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client';
      s.async=true;
      s.defer=true;
      s.dataset.waterGsi='1';
      s.onload=resolve;
      s.onerror=function(){reject(new Error('Không tải được Google Identity Services'));};
      document.head.appendChild(s);
    });
  }

  function ensureGatewayFrame(){
    let frame=document.getElementById('waterAuthGatewayFrame');
    if(frame)return frame;
    frame=document.createElement('iframe');
    frame.id='waterAuthGatewayFrame';
    frame.name='waterAuthGatewayFrame';
    frame.setAttribute('aria-hidden','true');
    frame.style.cssText='position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none;left:-9999px;top:-9999px';
    document.body.appendChild(frame);
    return frame;
  }

  function makeHidden(form,name,value){
    const input=document.createElement('input');
    input.type='hidden';
    input.name=name;
    input.value=String(value==null?'':value);
    form.appendChild(input);
  }

  function verifyCredential(credential){
    if(!cfg.AUTH_GATEWAY_URL){
      return Promise.reject(new Error('DEV chưa cấu hình AUTH_GATEWAY_URL'));
    }

    return new Promise(function(resolve,reject){
      const frame=ensureGatewayFrame();
      const nonce='water_auth_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      let done=false;
      let form=null;

      const timer=setTimeout(function(){
        finish(new Error('Hết thời gian xác minh tài khoản.'));
      },20000);

      function cleanup(){
        clearTimeout(timer);
        window.removeEventListener('message',onMessage);
        if(form&&form.parentNode)form.parentNode.removeChild(form);
      }

      function finish(err,data){
        if(done)return;
        done=true;
        cleanup();
        err?reject(err):resolve(data);
      }

      function onMessage(ev){
        if(ev.source!==frame.contentWindow)return;
        const msg=ev.data;
        if(!msg||msg.type!=='WATER_AUTH_GATEWAY_RESULT'||msg.nonce!==nonce)return;
        const data=msg.payload||{};
        if(data.ok!==true){
          finish(new Error(data.error||'Xác thực thất bại'));
          return;
        }
        finish(null,data);
      }

      window.addEventListener('message',onMessage);

      form=document.createElement('form');
      form.method='POST';
      form.action=cfg.AUTH_GATEWAY_URL;
      form.target=frame.name;
      form.style.display='none';
      makeHidden(form,'credential',credential);
      makeHidden(form,'nonce',nonce);
      makeHidden(form,'app','ghi-so-nuoc-auth-v1');
      document.body.appendChild(form);

      try{form.submit();}
      catch(err){finish(err);}
    });
  }

  async function onGoogleCredential(response){
    try{
      overlayMessage('Đang xác minh tài khoản và phân quyền...',false);
      const data=await verifyCredential(response&&response.credential);
      allowFromServer(data);
      if(state.authorized){
        hideOverlay();
        ui.set('Đã xác thực: '+(state.name||state.email)+' · '+state.role,'ok');
      }else{
        overlayMessage(state.reason||'Tài khoản không được phép sử dụng ứng dụng.',true);
        ui.set(state.reason||'Tài khoản không được phép sử dụng ứng dụng.','err');
      }
    }catch(err){
      denyAll(String(err&&err.message||err));
      overlayMessage(String(err&&err.message||err),true);
      ui.set(String(err&&err.message||err),'err');
    }
  }

  async function initGoogleLogin(){
    ensureStyle();
    denyAll('Chưa xác thực tài khoản Google');
    showOverlay();

    if(!cfg.GOOGLE_CLIENT_ID){
      overlayMessage('DEV chưa cấu hình GOOGLE_CLIENT_ID. Bản Production không bị ảnh hưởng.',true);
      return;
    }

    try{
      await loadGoogleIdentity();
      window.google.accounts.id.initialize({
        client_id:cfg.GOOGLE_CLIENT_ID,
        callback:onGoogleCredential,
        auto_select:true,
        cancel_on_tap_outside:false
      });

      const host=document.getElementById('waterAuthGoogleButton');
      host.innerHTML='';
      window.google.accounts.id.renderButton(host,{
        type:'standard',
        theme:'outline',
        size:'large',
        text:'signin_with',
        shape:'rectangular',
        locale:'vi',
        width:300
      });

      window.google.accounts.id.prompt();
      overlayMessage('Đăng nhập bằng tài khoản Google đã khai báo trong NHAN_SU_THUC_HIEN.',false);
    }catch(err){
      denyAll(String(err&&err.message||err));
      overlayMessage(String(err&&err.message||err),true);
    }
  }

  function refreshVisual(){
    ensureStyle();
    applyVisualAccess();
  }

  document.addEventListener('WATER_MANAGE_CARD_READY',refreshVisual);
  if(window.MutationObserver){
    new MutationObserver(refreshVisual).observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initGoogleLogin,{once:true});
  }else{
    initGoogleLogin();
  }

  window.WATER_AUTH_ROLE={
    BUILD:'auth-role-v1.1.0-dev-iframe-post',
    getState:function(){return JSON.parse(JSON.stringify(state));},
    refreshVisual:refreshVisual,
    rolePermissions:rolePermissions,
    verifyCredential:verifyCredential
  };
})();
