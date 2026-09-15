/* ============================================================
MODULE_ID: 09-SYSTEMFILE-AUTH-POINTER-R2
STATUS: DEV ONLY
PURPOSE:
  FILE HỆ THỐNG only.
  Every FILE HỆ THỐNG click must re-authenticate current Google account.
  QUẢN LÝ + Đang làm việc => open SYSTEM_SHEET_URL.
  NHÂN VIÊN / inactive / unregistered => "Tài khoản chưa cấp quyền"
  for 3 seconds, then return to QUẢN LÝ tab.
  NHÂN VIÊN => hide FILE HỆ THỐNG button after denial.
============================================================ */
(function(){
'use strict';
if(window.WATER_SYSTEM_AUTH_POINTER_R2_DEV)return;

const core=window.WATER_MANAGE_CORE;
const ui=window.WATER_MANAGE_STATUS;
const cfg=window.WATER_AUTH_SHEETS_CONFIG||{};
if(!core||!ui)throw new Error('SYSTEM AUTH POINTER R2 thiếu dependency');

const SYSTEM_ID='waterSystemFileR118';
const OVERLAY_ID='waterSystemPointerR2Overlay';
const MSG_ID='waterSystemPointerR2Msg';
const LOGIN_ID='waterSystemPointerR2Login';
const RESET_MS=3000;
let tokenClient=null;
let busy=false;

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

function ensureStyle(){
  if(document.getElementById('waterSystemPointerR2Style'))return;
  const s=document.createElement('style');
  s.id='waterSystemPointerR2Style';
  s.textContent=
    '#'+OVERLAY_ID+'{position:fixed;inset:0;z-index:2147483647;background:rgba(15,22,29,.94);display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Arial,sans-serif}'+
    '#'+OVERLAY_ID+' .box{width:min(420px,100%);background:#fff;color:#18232d;border-radius:14px;padding:22px 18px;box-sizing:border-box;text-align:center;box-shadow:0 10px 34px rgba(0,0,0,.3)}'+
    '#'+OVERLAY_ID+' .title{font-size:17px;font-weight:900;margin-bottom:10px;color:#174f7e}'+
    '#'+OVERLAY_ID+' .msg{font-size:15px;font-weight:800;line-height:1.5;margin-bottom:16px;color:#465461}'+
    '#'+OVERLAY_ID+' .msg.err{color:#a23a2a}'+
    '#'+LOGIN_ID+'{width:100%;border:1px solid #c8d0d8;border-radius:8px;background:#fff;color:#2d3a45;padding:11px 12px;font-size:15px;font-weight:700;cursor:pointer}'+
    '#'+LOGIN_ID+':disabled{opacity:.5}';
  document.head.appendChild(s);
}

function ensureOverlay(){
  ensureStyle();
  let o=document.getElementById(OVERLAY_ID);
  if(o)return o;
  o=document.createElement('div');
  o.id=OVERLAY_ID;
  o.innerHTML='<div class="box"><div class="title">XÁC THỰC FILE HỆ THỐNG</div><div id="'+MSG_ID+'" class="msg">Chọn đúng tài khoản Google đã được cấp quyền QUẢN LÝ.</div><button id="'+LOGIN_ID+'" type="button">Xác thực bằng Google</button></div>';
  document.body.appendChild(o);
  o.querySelector('#'+LOGIN_ID).addEventListener('click',requestLogin);
  return o;
}

function setMsg(text,isError){
  const m=ensureOverlay().querySelector('#'+MSG_ID);
  m.textContent=String(text||'');
  m.className='msg'+(isError?' err':'');
}
function showOverlay(){ensureOverlay().style.display='flex';}
function hideOverlay(){const o=document.getElementById(OVERLAY_ID);if(o)o.style.display='none';}

function activateManage(){
  try{const tab=document.getElementById('waterTabManage');if(tab)tab.click();}catch(e){}
  setTimeout(function(){
    try{const panel=document.getElementById('waterManagePanel');if(panel)panel.scrollIntoView({block:'start',behavior:'smooth'});}catch(e){}
  },80);
}

function hideSystemButton(){
  try{
    const b=document.getElementById(SYSTEM_ID);
    if(b)b.style.setProperty('display','none','important');
  }catch(e){}
}
function showSystemButton(){
  try{
    const b=document.getElementById(SYSTEM_ID);
    if(b)b.style.removeProperty('display');
  }catch(e){}
}

function denyAndReturn(isEmployee){
  busy=false;
  if(isEmployee)hideSystemButton();
  setMsg('Tài khoản chưa cấp quyền',true);
  try{ui.set('Tài khoản chưa cấp quyền','err');}catch(e){}
  const btn=document.getElementById(LOGIN_ID);if(btn)btn.disabled=true;
  setTimeout(function(){
    hideOverlay();
    activateManage();
    try{ui.clear();}catch(e){}
    if(btn)btn.disabled=false;
    setMsg('Chọn đúng tài khoản Google đã được cấp quyền QUẢN LÝ.',false);
  },RESET_MS);
}

function openSystem(){
  const url=core.CFG&&core.CFG.SYSTEM_SHEET_URL;
  if(!url){denyAndReturn(false);return;}
  showSystemButton();
  hideOverlay();
  try{ui.set('Đã xác thực QUẢN LÝ · đang mở FILE HỆ THỐNG...','ok');}catch(e){}
  try{
    const w=window.open(url,'_blank','noopener,noreferrer');
    if(!w)window.location.href=url;
  }catch(e){window.location.href=url;}
}

function loadGIS(){
  return new Promise(function(resolve,reject){
    if(window.google&&google.accounts&&google.accounts.oauth2){resolve();return;}
    let s=document.querySelector('script[data-water-system-pointer-r2-gis="1"]');
    if(s){
      s.addEventListener('load',resolve,{once:true});
      s.addEventListener('error',function(){reject(new Error('GIS_LOAD'));},{once:true});
      return;
    }
    s=document.createElement('script');
    s.src='https://accounts.google.com/gsi/client';
    s.async=true;s.defer=true;s.dataset.waterSystemPointerR2Gis='1';
    s.onload=resolve;
    s.onerror=function(){reject(new Error('GIS_LOAD'));};
    document.head.appendChild(s);
  });
}

async function sha256(text){
  const data=new TextEncoder().encode(String(text||''));
  const digest=await crypto.subtle.digest('SHA-256',data);
  return Array.from(new Uint8Array(digest)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}

async function fetchJson(url,token){
  const res=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!res.ok){const err=new Error('HTTP '+res.status);err.httpStatus=res.status;throw err;}
  return res.json();
}

async function verify(token){
  const profile=await fetchJson('https://openidconnect.googleapis.com/v1/userinfo',token);
  const email=String(profile&&profile.email||'').trim().toLowerCase();
  if(!email)return {manager:false,employee:false};
  const hash=await sha256(email);
  const range=encodeURIComponent(cfg.AUTH_RANGE||'AUTH_NHAN_SU!A2:C1000');
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(cfg.AUTH_SHEET_ID)+'/values/'+range+'?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&_='+Date.now();
  const data=await fetchJson(url,token);
  const rows=Array.isArray(data.values)?data.values:[];
  for(let i=0;i<rows.length;i++){
    const r=rows[i]||[];
    if(String(r[0]||'').trim().toLowerCase()!==hash)continue;
    const active=normText(r[1])==='dang lam viec';
    const role=normText(r[2]);
    return {manager:active&&role==='quan ly',employee:active&&role==='nhan vien'};
  }
  return {manager:false,employee:false};
}

async function initTokenClient(){
  if(tokenClient)return;
  await loadGIS();
  tokenClient=google.accounts.oauth2.initTokenClient({
    client_id:cfg.GOOGLE_CLIENT_ID,
    scope:cfg.OAUTH_SCOPE||'openid email https://www.googleapis.com/auth/spreadsheets.readonly',
    include_granted_scopes:true,
    callback:async function(resp){
      busy=false;
      if(!resp||resp.error){denyAndReturn(false);return;}
      try{
        const result=await verify(resp.access_token);
        if(result.manager){openSystem();return;}
        denyAndReturn(!!result.employee);
      }catch(e){denyAndReturn(false);}
    },
    error_callback:function(){busy=false;denyAndReturn(false);}
  });
}

async function requestLogin(){
  if(busy)return;
  if(!navigator.onLine){
    setMsg('FILE HỆ THỐNG cần Internet để xác thực.',true);
    setTimeout(function(){hideOverlay();activateManage();},RESET_MS);
    return;
  }
  const b=document.getElementById(LOGIN_ID);if(b)b.disabled=true;
  setMsg('Đang chuẩn bị xác thực Google...',false);
  try{
    await initTokenClient();
    if(b)b.disabled=false;
    busy=true;
    setMsg('Chọn đúng tài khoản Google đã được cấp quyền QUẢN LÝ.',false);
    tokenClient.requestAccessToken({prompt:'select_account'});
  }catch(e){
    busy=false;
    if(b)b.disabled=false;
    denyAndReturn(false);
  }
}

function interceptSystem(ev){
  const t=ev.target&&ev.target.closest?ev.target.closest('#'+SYSTEM_ID):null;
  if(!t)return;
  ev.preventDefault();
  ev.stopPropagation();
  if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

  // IMPORTANT: never reuse a previous manager verification.
  // Every FILE HỆ THỐNG click starts a fresh Google account check.
  showOverlay();
  setMsg('Chọn đúng tài khoản Google đã được cấp quyền QUẢN LÝ.',false);
  const b=document.getElementById(LOGIN_ID);if(b)b.disabled=false;
  return false;
}

document.addEventListener('click',interceptSystem,true);

function bindReady(){ensureOverlay();hideOverlay();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindReady,{once:true});else bindReady();

window.WATER_SYSTEM_AUTH_POINTER_R2_DEV=Object.freeze({BUILD:'systemfile-auth-pointer-r2-dev-v1.0.0'});
})();