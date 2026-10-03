(function(){
'use strict';
const BUILD='water-manager-integrated-tab-v3-parent-bridge';
const p=new URLSearchParams(location.search);
const PROJECT=String(p.get('project')||p.get('projectId')||window.WATER_PROJECT_ID||'').trim().toUpperCase();
const APP_KEY='water_auth_v3_'+PROJECT;
const BQL_KEY='water_bql_auth_v20_'+PROJECT;
const MANAGER_URL='./quan-ly-v20-r6.html?project='+encodeURIComponent(PROJECT)+'&from=app&embed=1&v=integrated-tab-v3';
const ACTIVE_KEY='water_active_main_tab_v1';
let frameLoaded=false;
let applying=false;

function txt(v){return String(v==null?'':v).trim();}
function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
function readSession(){try{const d=JSON.parse(sessionStorage.getItem(APP_KEY)||'null');return d&&d.sessionToken&&d.staff?d:null;}catch(e){return null;}}
function currentStaff(){const s=readSession();return window.WATER_AUTH_STAFF||(s&&s.staff)||null;}
function isManager(staff){const r=norm(staff&&(staff.quyen||staff.role||staff.phanQuyen||staff.permission));return r==='quan ly'||r==='bql'||r==='admin'||r==='quan tri'||r==='administrator';}
function byId(id){return document.getElementById(id);}

function managerSession(){
  const app=readSession();
  const user=currentStaff()||(app&&app.staff);
  if(!app||!isManager(user))return null;
  return {sessionToken:String(app.sessionToken||''),expiresAt:Number(app.expiresAt||0),staff:user||app.staff};
}

function publishBridge(){
  const shared=managerSession();
  if(!shared)return false;
  window.WATER_MANAGER_BRIDGE_SESSION=shared;
  try{sessionStorage.setItem(BQL_KEY,JSON.stringify(shared));}catch(e){}
  return true;
}

function ensureStyle(){
  if(byId('waterManagerIntegratedStyle'))return;
  const s=document.createElement('style');
  s.id='waterManagerIntegratedStyle';
  s.textContent=`
    #waterTabManage:disabled{opacity:.38!important;filter:grayscale(1)!important;cursor:not-allowed!important;background:#eef1f4!important;color:#8a97a4!important;border-color:#d4dbe2!important}
    #waterManagePanel.waterManagerIntegrated{padding:0!important;overflow:hidden!important;background:#f4f7f9!important}
    #waterManagePanel.waterManagerIntegrated.active{display:flex!important;flex-direction:column!important}
    #waterManagerIntegratedShell{display:flex;flex:1 1 auto;min-height:0;width:100%;background:#f4f7f9}
    #waterManagerIntegratedFrame{border:0;width:100%;height:100%;min-height:0;flex:1 1 auto;background:#f4f7f9}
    #waterManagerIntegratedLoading{margin:auto;padding:18px;text-align:center;color:#607080;font:700 13px Arial,sans-serif}
  `;
  document.head.appendChild(s);
}

function decorateEmbedded(frame){
  try{
    const d=frame.contentDocument;
    if(!d||!d.head)return;
    if(d.getElementById('waterEmbeddedManagerStyle'))return;
    const st=d.createElement('style');
    st.id='waterEmbeddedManagerStyle';
    st.textContent='.top{display:none!important}#waterBqlLogout{display:none!important}.wrap{padding-top:8px!important}@media(max-width:760px){.wrap{padding-top:7px!important}}';
    d.head.appendChild(st);
  }catch(e){}
}

function ensureManagerFrame(){
  const panel=byId('waterManagePanel');
  if(!panel)return null;
  ensureStyle();
  panel.classList.add('waterManagerIntegrated');
  let shell=byId('waterManagerIntegratedShell');
  let frame=byId('waterManagerIntegratedFrame');
  if(!shell){
    panel.innerHTML='';
    shell=document.createElement('div');
    shell.id='waterManagerIntegratedShell';
    const loading=document.createElement('div');
    loading.id='waterManagerIntegratedLoading';
    loading.textContent='Đang mở Trang quản lý...';
    shell.appendChild(loading);
    panel.appendChild(shell);
  }
  if(!frame){
    frame=document.createElement('iframe');
    frame.id='waterManagerIntegratedFrame';
    frame.title='Trang quản lý ghi chỉ số nước';
    frame.setAttribute('loading','eager');
    frame.src='about:blank';
    frame.style.display='none';
    shell.appendChild(frame);
    frame.addEventListener('load',function(){
      if(frame.src==='about:blank')return;
      const loading=byId('waterManagerIntegratedLoading');
      if(loading)loading.style.display='none';
      frame.style.display='block';
      decorateEmbedded(frame);
    });
  }
  return frame;
}

function loadManager(){
  if(frameLoaded)return;
  if(!publishBridge())return;
  const frame=ensureManagerFrame();
  if(!frame)return;
  frame.src=MANAGER_URL;
  frameLoaded=true;
}

function forceAwayFromManage(){
  const tab=byId('waterTabManage');
  if(!tab||!tab.classList.contains('active'))return;
  try{localStorage.setItem(ACTIVE_KEY,'project');}catch(e){}
  const project=byId('waterTabProject');
  if(project&&!project.disabled)project.click();
}

function applyPermission(){
  const tab=byId('waterTabManage');
  if(!tab)return;
  const allowed=isManager(currentStaff());
  tab.disabled=!allowed;
  tab.setAttribute('aria-disabled',allowed?'false':'true');
  tab.title=allowed?'Mở Trang quản lý':'Chỉ tài khoản Quản lý được sử dụng tab này';
  if(!allowed){
    try{delete window.WATER_MANAGER_BRIDGE_SESSION;}catch(e){}
    forceAwayFromManage();
  }
  if(allowed&&tab.classList.contains('active'))loadManager();
}

function bindManageTab(){
  const tab=byId('waterTabManage');
  if(!tab||tab.dataset.waterIntegratedBound==='1')return;
  tab.dataset.waterIntegratedBound='1';
  tab.addEventListener('click',function(){setTimeout(function(){applyPermission();if(!tab.disabled)loadManager();},0);});
}

function bindShortcut(){
  const shortcut=byId('waterManagerTabV2');
  if(!shortcut||shortcut.dataset.waterIntegratedShortcut==='1')return;
  shortcut.dataset.waterIntegratedShortcut='1';
  shortcut.addEventListener('click',function(ev){
    if(!isManager(currentStaff()))return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const tab=byId('waterTabManage');
    if(tab&&!tab.disabled)tab.click();
  },true);
}

function apply(){
  if(applying)return;
  applying=true;
  try{
    ensureStyle();
    bindManageTab();
    bindShortcut();
    applyPermission();
    const tab=byId('waterTabManage');
    if(tab&&tab.classList.contains('active')&&!tab.disabled)loadManager();
  }finally{applying=false;}
}

function schedule(){[0,60,160,350,700,1400,2500].forEach(function(ms){setTimeout(apply,ms);});}
window.addEventListener('WATER_AUTH_OK',schedule);
document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.addEventListener('pageshow',schedule);
if(document.readyState!=='loading')schedule();
if(window.MutationObserver){
  const mo=new MutationObserver(function(){setTimeout(apply,0);});
  function start(){if(document.body)mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
}
window.WATER_MANAGER_INTEGRATED_TAB_BUILD=BUILD;
})();
