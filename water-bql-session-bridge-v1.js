(function(){
'use strict';
const BUILD='water-bql-session-bridge-v1';
const P=new URLSearchParams(location.search);
const PROJECT=String(P.get('project')||P.get('projectId')||window.WATER_PROJECT_ID||'').trim().toUpperCase();

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function valid(x){return !!(x&&x.sessionToken&&x.staff)}
function read(){
  let x=null;
  try{x=parse(sessionStorage.getItem('water_auth_v3_'+PROJECT));}catch(e){}
  if(!valid(x)){try{x=parse(sessionStorage.getItem('water_bql_auth_v20_'+PROJECT));}catch(e){}}
  if(!valid(x)&&window.WATER_BQL_SESSION&&valid(window.WATER_BQL_SESSION))x=window.WATER_BQL_SESSION;
  return valid(x)?x:null;
}
function publish(x){
  if(!valid(x))return false;
  window.WATER_BQL_SESSION=x;
  window.WATER_BQL_AUTH_STAFF=x.staff;
  window.WATER_BQL_AUTH_OK=true;
  window.WATER_BQL_READ_SESSION=read;
  document.documentElement.classList.remove('waterAuthPending');
  const fire=()=>window.dispatchEvent(new CustomEvent('WATER_BQL_AUTH_OK',{detail:{staff:x.staff,projectId:PROJECT}}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fire,{once:true});
  else setTimeout(fire,0);
  return true;
}
function noSession(){
  window.WATER_BQL_READ_SESSION=read;
  document.documentElement.classList.remove('waterAuthPending');
  const show=()=>{
    const m=document.getElementById('mainStatus');
    const r=document.getElementById('reviewStatus');
    const text='Chưa có phiên từ Ứng dụng. Mở Trang Quản lý từ tab Quản lý của Ứng dụng.';
    if(m)m.textContent=text;
    if(r)r.textContent=text;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
}

const s=read();
if(!publish(s))noSession();
window.WATER_BQL_SESSION_BRIDGE_BUILD=BUILD;
})();
