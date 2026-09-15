/* ============================================================
MODULE_ID: 09-SYSTEMFILE-AUTH
MODULE_NAME: auth-systemfile-only
VERSION: 1.1.1-DEV
STATUS: DEV ONLY
RESPONSIBILITY:
  Lazy Google OAuth ONLY when FILE HỆ THỐNG is selected.
  App / capture / download / view remain usable without Google auth.
  FILE HỆ THỐNG button is rebound exclusively to prevent legacy handlers.
ROLE RULE:
  QUẢN LÝ + Đang làm việc -> open FILE HỆ THỐNG
  Other / unregistered / inactive -> deny
============================================================ */
(function(){
  'use strict';

  if(window.WATER_AUTH_SYSTEMFILE_ONLY) return;

  const core=window.WATER_MANAGE_CORE;
  const ui=window.WATER_MANAGE_STATUS;
  const cfg=window.WATER_AUTH_SHEETS_CONFIG||{};
  if(!core||!ui) throw new Error('auth-systemfile-only thiếu dependency');

  const BUTTON_ID='waterSystemFileR118';
  const OVERLAY_ID='waterSystemOnlyAuthOverlay';
  const MSG_ID='waterSystemOnlyAuthMsg';
  const LOGIN_ID='waterSystemOnlyAuthLogin';
  const DENY_MS=3000;

  let tokenClient=null;
  let gisReady=false;
  let loginRunning=false;
  let observer=null;

  function norm(v){
    return String(v==null?'':v)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/Đ/g,'D')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }

  function ensureStyle(){
    if(document.getElementById('waterSystemOnlyAuthStyle')) return;
    const s=document.createElement('style');
    s.id='waterSystemOnlyAuthStyle';
    s.textContent=
      '#'+OVERLAY_ID+'{position:fixed;inset:0;z-index:2147483000;background:rgba(15,22,29,.94);display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Arial,sans-serif}'+
      '#'+OVERLAY_ID+' .box{width:min(420px,100%);background:#fff;color:#18232d;border-radius:14px;padding:22px 18px;box-sizing:border-box;text-align:center;box-shadow:0 10px 34px rgba(0,0,0,.30)}'+
      '#'+OVERLAY_ID+' .title{font-size:17px;font-weight:900;margin-bottom:10px;color:#174f7e}'+
      '#'+OVERLAY_ID+' .msg{font-size:13px;font-weight:700;line-height:1.5;margin-bottom:16px;color:#465461}'+
      '#'+OVERLAY_ID+' .msg.err{color:#a23a2a}'+
      '#'+LOGIN_ID+'{width:100%;border:1px solid #c8d0d8;border-radius:8px;background:#fff;color:#2d3a45;padding:11px 12px;font-size:15px;font-weight:700;cursor:pointer}'+
      '#'+LOGIN_ID+':disabled{opacity:.5;cursor:not-allowed}';
    document.head.appendChild(s);
  }

  function ensureOverlay(){
    let o=document.getElementById(OVERLAY_ID);
    if(o) return o;
    ensureStyle();
    o=document.createElement('div');
    o.id=OVERLAY_ID;
    o.innerHTML='<div class="box">'+
      '<div class="title">XÁC THỰC FILE HỆ THỐNG</div>'+
      '<div id="'+MSG_ID+'" class="msg">Chức năng này chỉ dành cho tài khoản QUẢN LÝ.</div>'+
      '<button id="'+LOGIN_ID+'" type="button">Xác thực bằng Google</button>'+
      '</div>';
    document.body.appendChild(o);
    const b=o.querySelector('#'+LOGIN_ID);
    if(b) b.addEventListener('click',requestLogin);
    return o;
  }

  function setMsg(text,isError){
    const m=ensureOverlay().querySelector('#'+MSG_ID);
    if(!m) return;
    m.textContent=String(text||'');
    m.className='msg'+(isError?' err':'');
  }

  function showOverlay(){ensureOverlay().style.display='flex';}
  function hideOverlay(){const o=document.getElementById(OVERLAY_ID);if(o)o.style.display='none';}

  function deny(text){
    loginRunning=false;
    const b=document.getElementById(LOGIN_ID);
    if(b) b.disabled=true;
    const msg=text||'Tài khoản chưa được cấp quyền truy cập FILE HỆ THỐNG. Vui lòng liên hệ Quản lý.';
    setMsg(msg,true);
    try{ui.set(msg,'err');}catch(e){}
    setTimeout(function(){
      hideOverlay();
      const bb=document.getElementById(LOGIN_ID);
      if(bb) bb.disabled=false;
      setMsg('Chức năng này chỉ dành cho tài khoản QUẢN LÝ.',false);
      try{ui.clear();}catch(e){}
    },DENY_MS);
  }

  function openSystem(){
    const url=core.CFG&&core.CFG.SYSTEM_SHEET_URL;
    if(!url){deny('Chưa cấu hình FILE HỆ THỐNG.');return;}
    hideOverlay();
    try{ui.set('Đang mở FILE HỆ THỐNG...','');}catch(e){}
    try{
      const w=window.open(url,'_blank','noopener,noreferrer');
      if(!w) window.location.href=url;
    }catch(e){window.location.href=url;}
  }

  function loadGoogleIdentity(){
    return new Promise(function(resolve,reject){
      if(window.google&&window.google.accounts&&window.google.accounts.oauth2){resolve();return;}
      let s=document.querySelector('script[data-water-systemfile-gis="1"]');
      if(s){
        s.addEventListener('load',resolve,{once:true});
        s.addEventListener('error',function(){reject(new Error('Không tải được Google Identity Services'));},{once:true});
        return;
      }
      s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client';
      s.async=true;s.defer=true;s.dataset.waterSystemfileGis='1';
      s.onload=resolve;
      s.onerror=function(){reject(new Error('Không tải được Google Identity Services'));};
      document.head.appendChild(s);
    });
  }

  async function sha256(text){
    const data=new TextEncoder().encode(String(text||''));
    const digest=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(digest)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }

  async function fetchJson(url,token){
    const r=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if(!r.ok){const e=new Error('HTTP '+r.status);e.httpStatus=r.status;throw e;}
    return r.json();
  }

  async function verifyManager(token){
    const profile=await fetchJson('https://openidconnect.googleapis.com/v1/userinfo',token);
    const email=String(profile&&profile.email||'').trim().toLowerCase();
    if(!email) return false;
    const hash=await sha256(email);
    const range=encodeURIComponent(cfg.AUTH_RANGE||'AUTH_NHAN_SU!A2:C1000');
    const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(cfg.AUTH_SHEET_ID)+'/values/'+range+'?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE';
    const data=await fetchJson(url,token);
    const rows=Array.isArray(data.values)?data.values:[];
    for(let i=0;i<rows.length;i++){
      const r=rows[i]||[];
      if(String(r[0]||'').trim().toLowerCase()===hash){
        return norm(r[1])==='dang lam viec' && norm(r[2])==='quan ly';
      }
    }
    return false;
  }

  async function initGoogle(){
    if(gisReady&&tokenClient) return true;
    if(!navigator.onLine) return false;
    try{
      await loadGoogleIdentity();
      tokenClient=window.google.accounts.oauth2.initTokenClient({
        client_id:cfg.GOOGLE_CLIENT_ID,
        scope:cfg.OAUTH_SCOPE||'openid email https://www.googleapis.com/auth/spreadsheets.readonly',
        include_granted_scopes:true,
        callback:async function(resp){
          loginRunning=false;
          if(!resp||resp.error){deny('Không xác thực được tài khoản Google.');return;}
          try{
            setMsg('Đang kiểm tra quyền QUẢN LÝ...',false);
            const ok=await verifyManager(resp.access_token);
            if(ok) openSystem();
            else deny('Tài khoản không có quyền QUẢN LÝ. Không được phép mở FILE HỆ THỐNG.');
          }catch(err){
            if(err&&err.httpStatus===403) deny('Tài khoản không được cấp quyền truy cập FILE HỆ THỐNG.');
            else deny('Không kiểm tra được quyền FILE HỆ THỐNG. Vui lòng thử lại khi có mạng ổn định.');
          }
        },
        error_callback:function(err){
          loginRunning=false;
          if(err&&err.type==='popup_closed') deny('Đã đóng cửa sổ xác thực Google.');
          else deny('Không mở được xác thực Google.');
        }
      });
      gisReady=true;
      return true;
    }catch(e){gisReady=false;tokenClient=null;return false;}
  }

  async function requestLogin(){
    if(loginRunning) return;
    if(!navigator.onLine){deny('FILE HỆ THỐNG cần kết nối Internet để xác thực quyền truy cập.');return;}
    const b=document.getElementById(LOGIN_ID);
    if(b) b.disabled=true;
    setMsg('Đang chuẩn bị xác thực Google...',false);
    const ok=await initGoogle();
    if(!ok){if(b)b.disabled=false;deny('Không tải được xác thực Google. Vui lòng kiểm tra Internet.');return;}
    if(b) b.disabled=false;
    loginRunning=true;
    setMsg('Chọn tài khoản Google đã được cấp quyền QUẢN LÝ.',false);
    try{tokenClient.requestAccessToken({prompt:'select_account'});}catch(e){loginRunning=false;deny('Không mở được xác thực Google.');}
  }

  function handleSystemClick(ev){
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    showOverlay();
    if(!navigator.onLine){deny('FILE HỆ THỐNG cần kết nối Internet để xác thực quyền truy cập.');return false;}
    setMsg('Chức năng này chỉ dành cho tài khoản QUẢN LÝ.',false);
    const b=document.getElementById(LOGIN_ID);if(b)b.disabled=false;
    return false;
  }

  function takeExclusiveOwnership(){
    const old=document.getElementById(BUTTON_ID);
    if(!old) return false;
    if(old.dataset.systemAuthExclusive==='1') return true;
    const fresh=old.cloneNode(true);
    fresh.dataset.systemAuthExclusive='1';
    fresh.removeAttribute('onclick');
    fresh.removeAttribute('href');
    fresh.disabled=false;
    fresh.removeAttribute('disabled');
    fresh.setAttribute('aria-disabled','false');
    old.replaceWith(fresh);
    fresh.addEventListener('click',handleSystemClick,true);
    fresh.addEventListener('click',handleSystemClick,false);
    return true;
  }

  function bind(){
    ensureOverlay();
    hideOverlay();
    takeExclusiveOwnership();
    if(!observer && window.MutationObserver){
      observer=new MutationObserver(function(){takeExclusiveOwnership();});
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }
    document.addEventListener('WATER_MANAGE_CARD_READY',function(){setTimeout(takeExclusiveOwnership,0);});
    /* Google Identity is intentionally NOT loaded here.
       It is loaded only after FILE HỆ THỐNG -> Xác thực bằng Google. */
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();

  window.WATER_AUTH_SYSTEMFILE_ONLY=Object.freeze({
    BUILD:'auth-systemfile-only-v1.1.1-dev',
    bind:bind,
    login:requestLogin,
    verifyManager:verifyManager,
    denyDelayMs:DENY_MS
  });
})();
