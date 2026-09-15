/* ============================================================
MODULE_ID: 09-SHEETS
MODULE_NAME: auth-sheets
VERSION: 1.0.0-DEV
STATUS: DEV ONLY
RESPONSIBILITY:
  Google OAuth access token + Google Sheets API role lookup.
  Does NOT use Apps Script Gateway.
ROLE MATRIX:
  QUẢN LÝ   -> FILE HỆ THỐNG + TẢI FILE + XEM CHỈ SỐ
  NHÂN VIÊN -> TẢI FILE + XEM CHỈ SỐ
  OTHER     -> DENY ALL
============================================================ */
(function(){
  'use strict';

  const core=window.WATER_MANAGE_CORE;
  const ui=window.WATER_MANAGE_STATUS;
  const cfg=window.WATER_AUTH_SHEETS_CONFIG||{};
  if(!core||!ui) throw new Error('auth-sheets thiếu dependency');

  const IDS={
    system:'waterSystemFileR118',
    download:'waterDownloadR118',
    view:'waterViewR118'
  };

  const state={
    ready:false,
    authenticated:false,
    authorized:false,
    email:'',
    name:'',
    role:'',
    status:'',
    permissions:{system:false,download:false,view:false},
    reason:'Chưa đăng nhập Google'
  };

  let initialized=false;
  let tokenClient=null;
  let visualTimer=null;

  function normText(v){
    return String(v==null?'':v)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/Đ/g,'D')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }

  function rolePermissions(role){
    const r=normText(role);
    if(r==='quan ly') return {system:true,download:true,view:true};
    if(r==='nhan vien') return {system:false,download:true,view:true};
    return {system:false,download:false,view:false};
  }

  function ensureStyle(){
    if(document.getElementById('waterAuthSheetsStyle')) return;
    const s=document.createElement('style');
    s.id='waterAuthSheetsStyle';
    s.textContent=
      '[data-water-auth-locked="1"]{opacity:.42!important;cursor:not-allowed!important;filter:grayscale(.35)}'+
      '#waterAuthSheetsBadge{margin:7px 0 0;text-align:center;font-size:10.5px;font-weight:800;line-height:1.35;color:#465461}'+
      '#waterAuthSheetsBadge.ok{color:#2a6942}#waterAuthSheetsBadge.err{color:#a23a2a}'+
      '#waterAuthSheetsOverlay{position:fixed;inset:0;z-index:2147483000;background:rgba(15,22,29,.94);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Arial,sans-serif}'+
      '#waterAuthSheetsOverlay .box{width:min(420px,100%);background:#fff;color:#18232d;border-radius:14px;padding:22px 18px;box-sizing:border-box;text-align:center;box-shadow:0 10px 34px rgba(0,0,0,.30)}'+
      '#waterAuthSheetsOverlay .title{font-size:17px;font-weight:900;margin-bottom:10px;color:#174f7e}'+
      '#waterAuthSheetsOverlay .msg{font-size:13px;font-weight:700;line-height:1.5;margin-bottom:16px;color:#465461}'+
      '#waterAuthSheetsOverlay .msg.err{color:#a23a2a}'+
      '#waterAuthSheetsLoginBtn{width:100%;border:1px solid #c8d0d8;border-radius:8px;background:#fff;color:#2d3a45;padding:11px 12px;font-size:15px;font-weight:700;cursor:pointer}';
    document.head.appendChild(s);
  }

  function ensureOverlay(){
    let o=document.getElementById('waterAuthSheetsOverlay');
    if(o) return o;
    o=document.createElement('div');
    o.id='waterAuthSheetsOverlay';
    o.innerHTML='<div class="box">'+
      '<div class="title">XÁC THỰC TÀI KHOẢN GOOGLE</div>'+
      '<div id="waterAuthSheetsMsg" class="msg">Đang chuẩn bị đăng nhập...</div>'+
      '<button id="waterAuthSheetsLoginBtn" type="button">Đăng nhập bằng Google</button>'+
      '</div>';
    document.body.appendChild(o);
    return o;
  }

  function setOverlayMessage(text,isError){
    const m=ensureOverlay().querySelector('#waterAuthSheetsMsg');
    if(!m) return;
    m.textContent=String(text||'');
    m.className='msg'+(isError?' err':'');
  }

  function showOverlay(){ensureOverlay().style.display='flex';}
  function hideOverlay(){const o=document.getElementById('waterAuthSheetsOverlay');if(o)o.style.display='none';}

  function ensureBadge(){
    const card=document.getElementById('waterExportR118');
    if(!card) return null;
    let b=document.getElementById('waterAuthSheetsBadge');
    if(!b){b=document.createElement('div');b.id='waterAuthSheetsBadge';card.appendChild(b);}
    return b;
  }

  function setBadge(text,type){
    const b=ensureBadge();
    if(!b) return;
    b.textContent=String(text||'');
    b.className=type||'';
  }

  function applyOne(id,key){
    const el=document.getElementById(id);
    if(!el) return false;
    const allowed=!!state.permissions[key];
    el.setAttribute('aria-disabled',allowed?'false':'true');
    if(allowed) el.removeAttribute('data-water-auth-locked');
    else el.setAttribute('data-water-auth-locked','1');
    if(el.tagName==='BUTTON') el.disabled=false;
    return true;
  }

  function applyVisual(){
    const found=(applyOne(IDS.system,'system')|applyOne(IDS.download,'download')|applyOne(IDS.view,'view'));
    if(state.authorized) setBadge((state.name||'Google')+' · '+state.role,'ok');
    else setBadge(state.reason||'Không có quyền truy cập','err');
    return !!found;
  }

  function scheduleVisualRefresh(){
    if(visualTimer) return;
    let n=0;
    visualTimer=setInterval(function(){
      n++;
      const found=applyVisual();
      if(found||n>=20){clearInterval(visualTimer);visualTimer=null;}
    },250);
  }

  function deny(reason){
    state.ready=true;
    state.authorized=false;
    state.permissions={system:false,download:false,view:false};
    state.reason=reason||'Không có quyền truy cập';
    applyVisual();
    scheduleVisualRefresh();
  }

  function accept(profile,record){
    state.ready=true;
    state.authenticated=true;
    state.email=String(profile.email||'');
    state.name=String(profile.name||'');
    state.status=String(record.status||'');
    state.role=String(record.role||'');
    const active=normText(state.status)==='dang lam viec';
    const p=rolePermissions(state.role);
    const validRole=p.system||p.download||p.view;
    state.authorized=active&&validRole;
    state.permissions=state.authorized?p:{system:false,download:false,view:false};
    state.reason=!active?'Tài khoản nhân sự không ở trạng thái Đang làm việc.':(!validRole?'Tài khoản chưa được phân quyền QUẢN LÝ/NHÂN VIÊN.':'');
    applyVisual();
    scheduleVisualRefresh();
  }

  function controlledElement(target){
    if(!target||!target.closest) return null;
    return target.closest('#'+IDS.system+',#'+IDS.download+',#'+IDS.view);
  }

  function openSystemDirect(){
    const url=core.CFG&&core.CFG.SYSTEM_SHEET_URL;
    if(!url){ui.set('Chưa cấu hình FILE HỆ THỐNG.','err');return;}
    ui.set('Đang mở FILE HỆ THỐNG...','');
    try{
      const w=window.open(url,'_blank','noopener,noreferrer');
      if(!w) window.location.href=url;
    }catch(e){window.location.href=url;}
  }

  document.addEventListener('click',function(ev){
    const el=controlledElement(ev.target);
    if(!el) return;
    let key='';
    if(el.id===IDS.system) key='system';
    else if(el.id===IDS.download) key='download';
    else if(el.id===IDS.view) key='view';
    if(!key) return;

    if(state.permissions[key]){
      if(key==='system'){
        ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
        openSystemDirect();
      }
      return;
    }

    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    const msg=!state.authenticated?'Vui lòng đăng nhập Google.':(state.reason||'Tài khoản không được phép sử dụng chức năng này.');
    ui.set(msg,'err');
    if(!state.authenticated) showOverlay();
  },true);

  function loadGoogleIdentity(){
    return new Promise(function(resolve,reject){
      if(window.google&&window.google.accounts&&window.google.accounts.oauth2){resolve();return;}
      const existing=document.querySelector('script[data-water-gsi-sheets="1"]');
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',function(){reject(new Error('Không tải được Google Identity Services'));},{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.dataset.waterGsiSheets='1';
      s.onload=resolve;s.onerror=function(){reject(new Error('Không tải được Google Identity Services'));};
      document.head.appendChild(s);
    });
  }

  async function sha256(text){
    if(!window.crypto||!crypto.subtle) throw new Error('Trình duyệt không hỗ trợ SHA-256.');
    const data=new TextEncoder().encode(String(text||''));
    const digest=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(digest)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }

  async function fetchJson(url,token){
    const res=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if(!res.ok){
      let detail='HTTP '+res.status;
      try{const j=await res.json();detail=(j&&j.error&&j.error.message)||detail;}catch(e){}
      const err=new Error(detail);err.httpStatus=res.status;throw err;
    }
    return res.json();
  }

  async function loadProfile(token){
    return fetchJson('https://openidconnect.googleapis.com/v1/userinfo',token);
  }

  async function loadAuthRows(token){
    const range=encodeURIComponent(cfg.AUTH_RANGE||'AUTH_NHAN_SU!A2:C1000');
    const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(cfg.AUTH_SHEET_ID)+'/values/'+range+'?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE';
    const data=await fetchJson(url,token);
    return Array.isArray(data.values)?data.values:[];
  }

  async function authorizeWithToken(token){
    setOverlayMessage('Đang đọc tài khoản Google và phân quyền...',false);
    const profile=await loadProfile(token);
    const email=String(profile.email||'').trim().toLowerCase();
    if(!email) throw new Error('Không lấy được email Google.');
    const hash=await sha256(email);
    const rows=await loadAuthRows(token);
    let record=null;
    for(let i=0;i<rows.length;i++){
      const r=rows[i]||[];
      if(String(r[0]||'').trim().toLowerCase()===hash){
        record={status:String(r[1]||''),role:String(r[2]||'')};
        break;
      }
    }
    if(!record){
      state.authenticated=true;state.email=email;state.name=String(profile.name||'');
      deny('Email Google không có trong danh sách phân quyền.');
      setOverlayMessage(state.reason,true);
      ui.set(state.reason,'err');
      return;
    }
    accept(profile,record);
    if(state.authorized){
      hideOverlay();
      ui.set('Đã xác thực: '+(state.name||'Google')+' · '+state.role,'ok');
    }else{
      setOverlayMessage(state.reason,true);
      ui.set(state.reason,'err');
    }
  }

  function requestLogin(){
    if(!tokenClient){setOverlayMessage('Google OAuth chưa sẵn sàng.',true);return;}
    setOverlayMessage('Đang mở cửa sổ đăng nhập Google...',false);
    try{tokenClient.requestAccessToken({prompt:'select_account'});}catch(err){setOverlayMessage(String(err&&err.message||err),true);}
  }

  async function init(){
    if(initialized) return;
    initialized=true;
    ensureStyle();
    deny('Chưa đăng nhập Google');
    showOverlay();

    if(!cfg.GOOGLE_CLIENT_ID||!cfg.AUTH_SHEET_ID){
      setOverlayMessage('AUTH DEV chưa cấu hình đủ Client ID hoặc AUTH Sheet ID.',true);
      return;
    }

    const btn=ensureOverlay().querySelector('#waterAuthSheetsLoginBtn');
    btn.addEventListener('click',requestLogin);

    try{
      await loadGoogleIdentity();
      tokenClient=window.google.accounts.oauth2.initTokenClient({
        client_id:cfg.GOOGLE_CLIENT_ID,
        scope:cfg.OAUTH_SCOPE||'openid email https://www.googleapis.com/auth/spreadsheets.readonly',
        include_granted_scopes:true,
        callback:async function(resp){
          if(!resp||resp.error){
            const msg=(resp&&resp.error_description)||((resp&&resp.error)?String(resp.error):'Không nhận được access token Google.');
            deny(msg);setOverlayMessage(msg,true);ui.set(msg,'err');return;
          }
          try{await authorizeWithToken(resp.access_token);}catch(err){
            let msg=String(err&&err.message||err);
            if(err&&err.httpStatus===403) msg='Tài khoản Google chưa được cấp quyền đọc AUTH Sheet hoặc chưa chấp thuận quyền Google Sheets.';
            deny(msg);setOverlayMessage(msg,true);ui.set(msg,'err');
          }
        },
        error_callback:function(err){
          const msg='Không mở được đăng nhập Google'+(err&&err.type?': '+err.type:'');
          deny(msg);setOverlayMessage(msg,true);ui.set(msg,'err');
        }
      });
      setOverlayMessage('Bấm “Đăng nhập bằng Google” để kiểm tra quyền sử dụng.',false);
    }catch(err){
      const msg=String(err&&err.message||err);
      deny(msg);setOverlayMessage(msg,true);ui.set(msg,'err');
    }
  }

  document.addEventListener('WATER_MANAGE_CARD_READY',applyVisual);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  scheduleVisualRefresh();

  window.WATER_AUTH_SHEETS={
    BUILD:'auth-sheets-v1.0.0-dev',
    getState:function(){return JSON.parse(JSON.stringify(state));},
    rolePermissions:rolePermissions,
    refreshVisual:applyVisual,
    login:requestLogin
  };
})();
