/* ============================================================
MODULE_ID: 09-SYSTEMFILE-AUTH-V4
STATUS: DEV ONLY
RULE: Google auth is requested ONLY when FILE HỆ THỐNG is selected.
      QUẢN LÝ + Đang làm việc => open. Everyone else => deny.
============================================================ */
(function(){
'use strict';
if(window.WATER_AUTH_SYSTEMFILE_V4)return;

const core=window.WATER_MANAGE_CORE;
const ui=window.WATER_MANAGE_STATUS;
const cfg=window.WATER_AUTH_SHEETS_CONFIG||{};
if(!core||!ui)throw new Error('AUTH FILE HỆ THỐNG thiếu dependency');

const BUTTON_ID='waterSystemFileR118';
const OVERLAY_ID='waterSystemAuthV4Overlay';
const MSG_ID='waterSystemAuthV4Msg';
const LOGIN_ID='waterSystemAuthV4Login';
const RESET_MS=3000;
let tokenClient=null,loginBusy=false,observer=null;

function norm(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/\s+/g,' ').trim().toLowerCase();}
function maskEmail(v){const s=String(v||'');const p=s.split('@');if(p.length!==2)return 'Google';const a=p[0];return (a.length<=3?a[0]+'***':a.slice(0,3)+'***')+'@'+p[1];}

function ensureUI(){
 if(!document.getElementById('waterSystemAuthV4Style')){
  const s=document.createElement('style');s.id='waterSystemAuthV4Style';
  s.textContent='#'+OVERLAY_ID+'{position:fixed;inset:0;z-index:2147483647;background:rgba(15,22,29,.94);display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Arial,sans-serif}#'+OVERLAY_ID+' .box{width:min(420px,100%);background:#fff;color:#18232d;border-radius:14px;padding:22px 18px;box-sizing:border-box;text-align:center;box-shadow:0 10px 34px rgba(0,0,0,.3)}#'+OVERLAY_ID+' .title{font-size:17px;font-weight:900;margin-bottom:10px;color:#174f7e}#'+OVERLAY_ID+' .msg{font-size:13px;font-weight:700;line-height:1.5;margin-bottom:16px;color:#465461}#'+OVERLAY_ID+' .msg.err{color:#a23a2a}#'+LOGIN_ID+'{width:100%;border:1px solid #c8d0d8;border-radius:8px;background:#fff;color:#2d3a45;padding:11px 12px;font-size:15px;font-weight:700;cursor:pointer}#'+LOGIN_ID+':disabled{opacity:.5}';
  document.head.appendChild(s);
 }
 let o=document.getElementById(OVERLAY_ID);
 if(!o){
  o=document.createElement('div');o.id=OVERLAY_ID;
  o.innerHTML='<div class="box"><div class="title">XÁC THỰC FILE HỆ THỐNG</div><div id="'+MSG_ID+'" class="msg">Chỉ tài khoản QUẢN LÝ được mở FILE HỆ THỐNG.</div><button id="'+LOGIN_ID+'" type="button">Xác thực bằng Google</button></div>';
  document.body.appendChild(o);
  o.querySelector('#'+LOGIN_ID).addEventListener('click',requestLogin);
 }
 return o;
}
function setMsg(t,err){const m=ensureUI().querySelector('#'+MSG_ID);m.textContent=String(t||'');m.className='msg'+(err?' err':'');}
function show(){ensureUI().style.display='flex';}
function hide(){const o=document.getElementById(OVERLAY_ID);if(o)o.style.display='none';}
function resetLater(){setTimeout(function(){hide();const b=document.getElementById(LOGIN_ID);if(b)b.disabled=false;setMsg('Chỉ tài khoản QUẢN LÝ được mở FILE HỆ THỐNG.',false);try{ui.clear();}catch(e){}},RESET_MS);}
function deny(msg){loginBusy=false;const b=document.getElementById(LOGIN_ID);if(b)b.disabled=true;setMsg(msg,true);try{ui.set(msg,'err');}catch(e){}resetLater();}
function openSystem(){const url=core.CFG&&core.CFG.SYSTEM_SHEET_URL;if(!url){deny('Chưa cấu hình FILE HỆ THỐNG.');return;}hide();try{ui.set('Đã xác thực QUẢN LÝ · đang mở FILE HỆ THỐNG...','ok');}catch(e){}try{const w=window.open(url,'_blank','noopener,noreferrer');if(!w)window.location.href=url;}catch(e){window.location.href=url;}}

function loadGIS(){return new Promise(function(resolve,reject){if(window.google&&google.accounts&&google.accounts.oauth2){resolve();return;}let s=document.querySelector('script[data-system-auth-v4="1"]');if(s){s.addEventListener('load',resolve,{once:true});s.addEventListener('error',function(){reject(new Error('GIS_LOAD'));},{once:true});return;}s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.dataset.systemAuthV4='1';s.onload=resolve;s.onerror=function(){reject(new Error('GIS_LOAD'));};document.head.appendChild(s);});}
async function sha256(text){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(text||'')));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function getJson(url,token){const r=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!r.ok){const e=new Error('HTTP '+r.status);e.httpStatus=r.status;throw e;}return r.json();}

async function verify(token){
 const profile=await getJson('https://openidconnect.googleapis.com/v1/userinfo',token);
 const email=String(profile&&profile.email||'').trim().toLowerCase();
 if(!email)return {code:'NO_EMAIL',email:''};
 setMsg('Đã nhận '+maskEmail(email)+' · đang kiểm tra phân quyền...',false);
 const hash=await sha256(email);
 const range=encodeURIComponent(cfg.AUTH_RANGE||'AUTH_NHAN_SU!A2:C1000');
 const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(cfg.AUTH_SHEET_ID)+'/values/'+range+'?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&_='+Date.now();
 const data=await getJson(url,token);
 const rows=Array.isArray(data.values)?data.values:[];
 for(let i=0;i<rows.length;i++){
  const r=rows[i]||[];
  if(String(r[0]||'').trim().toLowerCase()===hash){
   const active=norm(r[1])==='dang lam viec';
   const role=norm(r[2]);
   if(!active)return {code:'INACTIVE',email:email};
   if(role!=='quan ly')return {code:'NOT_MANAGER',email:email};
   return {code:'MANAGER',email:email};
  }
 }
 return {code:'NOT_REGISTERED',email:email};
}

async function initTokenClient(){
 if(tokenClient)return true;
 await loadGIS();
 tokenClient=google.accounts.oauth2.initTokenClient({
  client_id:cfg.GOOGLE_CLIENT_ID,
  scope:cfg.OAUTH_SCOPE||'openid email https://www.googleapis.com/auth/spreadsheets.readonly',
  include_granted_scopes:true,
  callback:async function(resp){
   loginBusy=false;
   if(!resp||resp.error){deny('Không xác thực được tài khoản Google.');return;}
   try{
    const result=await verify(resp.access_token);
    if(result.code==='MANAGER'){openSystem();return;}
    if(result.code==='NOT_MANAGER'){deny('Tài khoản này là NHÂN VIÊN · không được phép mở FILE HỆ THỐNG.');return;}
    if(result.code==='INACTIVE'){deny('Tài khoản nhân sự không ở trạng thái Đang làm việc.');return;}
    if(result.code==='NOT_REGISTERED'){deny('Tài khoản Google chưa đăng ký trong danh sách phân quyền.');return;}
    deny('Không xác định được tài khoản Google.');
   }catch(err){
    if(err&&err.httpStatus===403)deny('Tài khoản Google không đọc được bảng phân quyền AUTH. Vui lòng liên hệ Quản lý.');
    else deny('Không kiểm tra được quyền FILE HỆ THỐNG. Vui lòng thử lại khi mạng ổn định.');
   }
  },
  error_callback:function(err){loginBusy=false;if(err&&err.type==='popup_closed')deny('Đã đóng cửa sổ xác thực Google.');else deny('Không mở được xác thực Google.');}
 });
 return true;
}

async function requestLogin(){
 if(loginBusy)return;
 if(!navigator.onLine){deny('FILE HỆ THỐNG cần Internet để xác thực quyền truy cập.');return;}
 const b=document.getElementById(LOGIN_ID);if(b)b.disabled=true;
 setMsg('Đang tải xác thực Google...',false);
 try{await initTokenClient();if(b)b.disabled=false;loginBusy=true;setMsg('Chọn đúng tài khoản Google cần kiểm tra.',false);tokenClient.requestAccessToken({prompt:'select_account'});}catch(e){loginBusy=false;if(b)b.disabled=false;deny('Không tải được xác thực Google. Vui lòng kiểm tra Internet.');}
}

function clickOnly(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();show();if(!navigator.onLine){deny('FILE HỆ THỐNG cần Internet để xác thực quyền truy cập.');return false;}setMsg('Chỉ tài khoản QUẢN LÝ được mở FILE HỆ THỐNG.',false);const b=document.getElementById(LOGIN_ID);if(b)b.disabled=false;return false;}
function ownButton(){const old=document.getElementById(BUTTON_ID);if(!old)return false;if(old.dataset.authV4==='1')return true;const fresh=old.cloneNode(true);fresh.dataset.authV4='1';fresh.removeAttribute('onclick');fresh.disabled=false;fresh.removeAttribute('disabled');fresh.setAttribute('aria-disabled','false');old.replaceWith(fresh);fresh.addEventListener('click',clickOnly,true);return true;}
function bind(){ensureUI();hide();ownButton();if(!observer&&window.MutationObserver){observer=new MutationObserver(ownButton);observer.observe(document.documentElement,{childList:true,subtree:true});}document.addEventListener('WATER_MANAGE_CARD_READY',function(){setTimeout(ownButton,0);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.WATER_AUTH_SYSTEMFILE_V4=Object.freeze({BUILD:'auth-systemfile-only-v4.0.0-dev',verify:verify,login:requestLogin});
})();
