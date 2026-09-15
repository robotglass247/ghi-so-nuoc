/* ============================================================
MODULE_ID: 09
MODULE_NAME: auth-role
VERSION: 1.2.0-DEV
STATUS: DEV ONLY - JSONP TRANSPORT
ROLE MATRIX:
  QUẢN LÝ   -> FILE HỆ THỐNG + TẢI FILE + XEM CHỈ SỐ
  NHÂN VIÊN -> TẢI FILE + XEM CHỈ SỐ
  OTHER     -> DENY ALL
============================================================ */
(function(){
  'use strict';
  const core=window.WATER_MANAGE_CORE;
  const ui=window.WATER_MANAGE_STATUS;
  const cfg=window.WATER_AUTH_CONFIG||{};
  if(!core||!ui) throw new Error('AUTH v1.2.0 thiếu dependency');

  const IDS={system:'waterSystemFileR118',download:'waterDownloadR118',view:'waterViewR118'};
  const state={ready:false,authenticated:false,authorized:false,email:'',name:'',role:'',status:'',permissions:{system:false,download:false,view:false},reason:'Chưa xác thực tài khoản Google'};
  let initialized=false;

  function norm(v){return core.norm?core.norm(v):String(v||'').trim().toLowerCase();}
  function rolePermissions(role){
    const r=norm(role);
    if(r==='quan ly') return {system:true,download:true,view:true};
    if(r==='nhan vien') return {system:false,download:true,view:true};
    return {system:false,download:false,view:false};
  }
  function ensureStyle(){
    if(document.getElementById('waterAuthRoleStyle')) return;
    const s=document.createElement('style');s.id='waterAuthRoleStyle';
    s.textContent='[data-water-auth-locked="1"]{opacity:.42!important;cursor:not-allowed!important;filter:grayscale(.35)}#waterAuthRoleBadge{margin:7px 0 0;text-align:center;font-size:10.5px;font-weight:800;line-height:1.35;color:#465461}#waterAuthRoleBadge.ok{color:#2a6942}#waterAuthRoleBadge.err{color:#a23a2a}#waterAuthOverlay{position:fixed;inset:0;z-index:2147483000;background:rgba(15,22,29,.94);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Arial,sans-serif}#waterAuthOverlay .box{width:min(420px,100%);background:#fff;color:#18232d;border-radius:14px;padding:22px 18px;box-sizing:border-box;text-align:center;box-shadow:0 10px 34px rgba(0,0,0,.30)}#waterAuthOverlay .title{font-size:17px;font-weight:900;margin-bottom:10px;color:#174f7e}#waterAuthOverlay .msg{font-size:13px;font-weight:700;line-height:1.5;margin-bottom:16px;color:#465461}#waterAuthOverlay .msg.err{color:#a23a2a}#waterAuthGoogleButton{display:flex;justify-content:center;min-height:40px}';
    document.head.appendChild(s);
  }
  function ensureOverlay(){let o=document.getElementById('waterAuthOverlay');if(o)return o;o=document.createElement('div');o.id='waterAuthOverlay';o.innerHTML='<div class="box"><div class="title">XÁC THỰC TÀI KHOẢN GOOGLE</div><div id="waterAuthOverlayMsg" class="msg">Đang chuẩn bị đăng nhập...</div><div id="waterAuthGoogleButton"></div></div>';document.body.appendChild(o);return o;}
  function setMsg(t,e){const m=ensureOverlay().querySelector('#waterAuthOverlayMsg');if(m){m.textContent=String(t||'');m.className='msg'+(e?' err':'');}}
  function showOverlay(){ensureOverlay().style.display='flex';}
  function hideOverlay(){const o=document.getElementById('waterAuthOverlay');if(o)o.style.display='none';}
  function ensureBadge(){const card=document.getElementById('waterExportR118');if(!card)return null;let b=document.getElementById('waterAuthRoleBadge');if(!b){b=document.createElement('div');b.id='waterAuthRoleBadge';card.appendChild(b);}return b;}
  function setBadge(t,c){const b=ensureBadge();if(!b)return;b.textContent=String(t||'');b.className=c||'';}
  function applyOne(id,key){const el=document.getElementById(id);if(!el)return;const allowed=!!state.permissions[key];el.setAttribute('aria-disabled',allowed?'false':'true');if(allowed)el.removeAttribute('data-water-auth-locked');else el.setAttribute('data-water-auth-locked','1');if(el.tagName==='BUTTON')el.disabled=false;}
  function applyVisual(){applyOne(IDS.system,'system');applyOne(IDS.download,'download');applyOne(IDS.view,'view');if(state.authorized)setBadge('Tài khoản: '+(state.name||state.email)+' · '+state.role,'ok');else setBadge(state.reason||'Không có quyền truy cập','err');}
  function deny(reason){state.ready=true;state.authorized=false;state.permissions={system:false,download:false,view:false};state.reason=reason||'Không có quyền truy cập';applyVisual();}
  function accept(data){state.ready=true;state.authenticated=true;state.authorized=!!data.authorized;state.email=String(data.email||'');state.name=String(data.name||'');state.role=String(data.role||'');state.status=String(data.status||'');state.reason=String(data.reason||'');state.permissions=state.authorized?rolePermissions(state.role):{system:false,download:false,view:false};applyVisual();}
  function controlled(target){if(!target||!target.closest)return null;return target.closest('#'+IDS.system+',#'+IDS.download+',#'+IDS.view);}
  function openSystem(){const url=core.CFG&&core.CFG.SYSTEM_SHEET_URL;if(!url){ui.set('Chưa cấu hình FILE HỆ THỐNG.','err');return;}ui.set('Đang mở FILE HỆ THỐNG...','');try{const w=window.open(url,'_blank','noopener,noreferrer');if(!w)window.location.href=url;}catch(e){window.location.href=url;}}
  document.addEventListener('click',function(ev){const el=controlled(ev.target);if(!el)return;let key='';if(el.id===IDS.system)key='system';else if(el.id===IDS.download)key='download';else if(el.id===IDS.view)key='view';if(!key)return;if(state.permissions[key]){if(key==='system'){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();openSystem();}return;}ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();ui.set(!state.authenticated?'Vui lòng xác thực tài khoản Google.':(state.reason||'Không có quyền sử dụng chức năng này.'),'err');if(!state.authenticated)showOverlay();},true);

  function loadGsi(){return new Promise(function(resolve,reject){if(window.google&&window.google.accounts&&window.google.accounts.id){resolve();return;}const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.onload=resolve;s.onerror=function(){reject(new Error('Không tải được Google Identity Services'));};document.head.appendChild(s);});}

  function verifyCredential(credential){
    if(!cfg.AUTH_GATEWAY_URL) return Promise.reject(new Error('DEV chưa cấu hình AUTH_GATEWAY_URL'));
    return new Promise(function(resolve,reject){
      const cb='__waterAuthJsonp_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian xác minh tài khoản.'));},15000);
      function finish(err,data){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);err?reject(err):resolve(data);}
      window[cb]=function(data){if(!data||data.ok!==true){finish(new Error((data&&data.error)||'Xác thực thất bại'));return;}finish(null,data);};
      s.onerror=function(){finish(new Error('Không gọi được AUTH Gateway.'));};
      s.src=cfg.AUTH_GATEWAY_URL+'?mode=auth&callback='+encodeURIComponent(cb)+'&credential='+encodeURIComponent(String(credential||''))+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function onGoogleCredential(resp){try{setMsg('Đang xác minh tài khoản và phân quyền...',false);const data=await verifyCredential(resp&&resp.credential);accept(data);if(state.authorized){hideOverlay();ui.set('Đã xác thực: '+(state.name||state.email)+' · '+state.role,'ok');}else{setMsg(state.reason||'Tài khoản không được phép sử dụng ứng dụng.',true);ui.set(state.reason||'Tài khoản không được phép sử dụng ứng dụng.','err');}}catch(err){const m=String(err&&err.message||err);deny(m);setMsg(m,true);ui.set(m,'err');}}

  async function init(){if(initialized)return;initialized=true;ensureStyle();deny('Chưa xác thực tài khoản Google');showOverlay();if(!cfg.GOOGLE_CLIENT_ID){setMsg('DEV chưa cấu hình GOOGLE_CLIENT_ID.',true);return;}try{await loadGsi();window.google.accounts.id.initialize({client_id:cfg.GOOGLE_CLIENT_ID,callback:onGoogleCredential,auto_select:false,cancel_on_tap_outside:false});const host=document.getElementById('waterAuthGoogleButton');host.innerHTML='';window.google.accounts.id.renderButton(host,{type:'standard',theme:'outline',size:'large',text:'signin_with',shape:'rectangular',locale:'vi',width:300});setMsg('Đăng nhập bằng tài khoản Google đã khai báo trong NHAN_SU_THUC_HIEN.',false);}catch(err){const m=String(err&&err.message||err);deny(m);setMsg(m,true);}}
  document.addEventListener('WATER_MANAGE_CARD_READY',applyVisual);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.WATER_AUTH_ROLE={BUILD:'auth-role-v1.2.0-dev-jsonp',getState:function(){return JSON.parse(JSON.stringify(state));},rolePermissions:rolePermissions,verifyCredential:verifyCredential,refreshVisual:applyVisual};
})();