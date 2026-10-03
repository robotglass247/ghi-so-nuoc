(function(){
'use strict';

const BUILD='water-manager-embed-pass-v3-preload-immediate';
const qs=new URLSearchParams(location.search);
const PROJECT=String(qs.get('project')||qs.get('projectId')||window.WATER_PROJECT_ID||'').trim().toUpperCase();
const APP_KEY='water_auth_v3_'+PROJECT;
const BQL_KEY='water_bql_auth_v20_'+PROJECT;
const MANAGER_URL='./quan-ly-v20-r6.html?project='+encodeURIComponent(PROJECT)+'&from=app&embed=1&v=embed-pass-preload-3';
let loaded=false;
let applying=false;

function txt(v){return String(v==null?'':v).trim();}
function readSession(){
  try{
    const d=JSON.parse(sessionStorage.getItem(APP_KEY)||'null');
    return d&&d.sessionToken&&d.staff?d:null;
  }catch(e){return null;}
}
function isManager(staff){
  const r=txt(staff&&(staff.quyen||staff.role||staff.phanQuyen||staff.permission))
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
  return ['quan ly','bql','admin','quan tri','administrator'].indexOf(r)>=0;
}
function byId(id){return document.getElementById(id);}

function publishSession(){
  const s=readSession();
  if(!s)return null;
  const shared={
    sessionToken:String(s.sessionToken||''),
    expiresAt:Number(s.expiresAt||0),
    staff:s.staff
  };
  try{sessionStorage.setItem(BQL_KEY,JSON.stringify(shared));}catch(e){}
  window.WATER_MANAGER_BRIDGE_SESSION=shared;
  window.WATER_MANAGER_BRIDGE_IS_MANAGER=isManager(shared.staff);
  return shared;
}

function ensureStyle(){
  if(byId('waterManagerEmbedPassStyle'))return;
  const s=document.createElement('style');
  s.id='waterManagerEmbedPassStyle';
  s.textContent=`
    #waterManagePanel.waterManagerEmbedPass{padding:0!important;overflow:hidden!important;background:#f4f7f9!important}
    #waterManagePanel.waterManagerEmbedPass.active{display:flex!important;flex-direction:column!important}
    #waterManagerEmbedShell{display:flex;flex:1 1 auto;min-height:0;width:100%;background:#f4f7f9}
    #waterManagerEmbedFrame{display:none;border:0;width:100%;height:100%;min-height:0;flex:1 1 auto;background:#f4f7f9}
    #waterManagerEmbedLoading{margin:auto;padding:20px;text-align:center;color:#607080;font:700 13px Arial,sans-serif}
    #waterTabManage:disabled{opacity:.38!important;filter:grayscale(1)!important;cursor:not-allowed!important}
  `;
  document.head.appendChild(s);
}

function decorate(frame){
  try{
    const d=frame.contentDocument;
    if(!d||!d.head)return;
    if(d.getElementById('waterManagerEmbeddedOnlyStyle'))return;
    const st=d.createElement('style');
    st.id='waterManagerEmbeddedOnlyStyle';
    st.textContent='.top{display:none!important}#waterBqlLogout{display:none!important}.wrap{padding-top:8px!important}@media(max-width:760px){.wrap{padding-top:7px!important}}';
    d.head.appendChild(st);
  }catch(e){}
}

function ensureFrame(){
  const panel=byId('waterManagePanel');
  if(!panel)return null;
  ensureStyle();
  panel.classList.add('waterManagerEmbedPass');
  let shell=byId('waterManagerEmbedShell');
  if(!shell){
    panel.innerHTML='';
    shell=document.createElement('div');
    shell.id='waterManagerEmbedShell';
    const loading=document.createElement('div');
    loading.id='waterManagerEmbedLoading';
    loading.textContent='Đang mở Trang quản lý...';
    shell.appendChild(loading);
    panel.appendChild(shell);
  }
  let frame=byId('waterManagerEmbedFrame');
  if(!frame){
    frame=document.createElement('iframe');
    frame.id='waterManagerEmbedFrame';
    frame.title='Trang quản lý ghi chỉ số nước';
    frame.setAttribute('loading','eager');
    frame.src='about:blank';
    shell.appendChild(frame);
    frame.addEventListener('load',function(){
      if(frame.src==='about:blank')return;
      const loading=byId('waterManagerEmbedLoading');
      if(loading)loading.style.display='none';
      frame.style.display='block';
      decorate(frame);
    });
  }
  return frame;
}

function loadManager(){
  if(loaded)return;
  const s=publishSession();
  if(!s)return;
  const frame=ensureFrame();
  if(!frame)return;
  frame.src=MANAGER_URL;
  loaded=true;
}

function preloadManager(){
  if(loaded||!readSession())return;
  loadManager();
}

function applyPermission(){
  const tab=byId('waterTabManage');
  if(!tab)return;
  const s=readSession();
  const allowed=!!s;
  tab.disabled=!allowed;
  tab.setAttribute('aria-disabled',allowed?'false':'true');
  tab.title=allowed
    ? (isManager(s.staff)?'Mở Trang quản lý':'Mở Trang quản lý - tài khoản Nhân viên chỉ được xem')
    : 'Vui lòng đăng nhập để sử dụng Trang quản lý';
  if(allowed&&tab.classList.contains('active'))loadManager();
  if(allowed)preloadManager();
}

function bindTab(){
  const tab=byId('waterTabManage');
  if(!tab||tab.dataset.waterManagerEmbedPassBound==='1')return;
  tab.dataset.waterManagerEmbedPassBound='1';
  tab.addEventListener('click',function(){
    setTimeout(function(){
      applyPermission();
      if(!tab.disabled)loadManager();
    },0);
  });
}

function apply(){
  if(applying)return;
  applying=true;
  try{
    ensureStyle();
    bindTab();
    applyPermission();
  }finally{applying=false;}
}

function schedule(){[0,80,180,400,800,1500,2600].forEach(function(ms){setTimeout(apply,ms);});}
window.addEventListener('WATER_AUTH_OK',function(){schedule();preloadManager();});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.addEventListener('pageshow',schedule);
if(document.readyState!=='loading')schedule();

window.WATER_MANAGER_EMBED_PASS_BUILD=BUILD;
})();
