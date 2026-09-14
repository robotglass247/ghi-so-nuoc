/* ============================================================
MODULE_ID: 07
MODULE_NAME: system-file
VERSION: 1.0.0
STATUS: PENDING USER RUNTIME CONFIRMATION
DEPENDENCIES: 03_manage-core-v1.js, 08_manage-status-v1.js
RESPONSIBILITY: FILE HỆ THỐNG permission + open/denied message only
RULE: must not touch month/download/view logic
============================================================ */
(function(){
  'use strict';
  const core=window.WATER_MANAGE_CORE,ui=window.WATER_MANAGE_STATUS;
  if(!core||!ui)throw new Error('system-file thiếu dependency');
  let cache={code:'',allowed:null,ts:0};

  function currentStaffCode(){try{return core.txt(localStorage.getItem('water_staff')).toUpperCase();}catch(e){return '';}}

  function fetchAccessRows(){
    return new Promise(function(resolve,reject){
      const cb='__waterSystemAccess_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian kiểm tra quyền.'));},12000);
      function finish(err,data){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);err?reject(err):resolve(data);}
      window[cb]=function(data){finish(null,data);};s.onerror=function(){finish(new Error('Không kiểm tra được quyền.'));};
      const q='select A,B,C,F where A is not null';
      s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(core.CFG.SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(core.CFG.STAFF_SHEET)+'&range='+encodeURIComponent(core.CFG.STAFF_RANGE)+'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)+'&tq='+encodeURIComponent(q)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  const api={fetchAccessRows};

  async function checkAccess(force){
    const code=currentStaffCode();
    if(!code)return false;
    if(!force&&cache.code===code&&cache.allowed!==null&&(Date.now()-cache.ts)<300000)return cache.allowed;
    try{
      const data=await api.fetchAccessRows();
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
      let matched=null;
      for(let i=0;i<rows.length;i++){
        const r={code:core.txt(core.cell(rows[i],0)).toUpperCase(),name:core.txt(core.cell(rows[i],1)),role:core.txt(core.cell(rows[i],2)),state:core.txt(core.cell(rows[i],3))};
        if(r.code===code){matched=r;break;}
      }
      const allowed=!!(matched&&core.norm(matched.role)==='truong bo phan'&&core.norm(matched.state)==='dang lam viec');
      cache={code,allowed,ts:Date.now()};return allowed;
    }catch(e){cache={code,allowed:false,ts:Date.now()};return false;}
  }

  function activateManageTab(){
    const b=core.el('waterTabManage');
    if(b){try{b.click();}catch(e){}}
    const panel=core.el('waterManagePanel');
    if(panel){try{panel.scrollIntoView({block:'start',behavior:'smooth'});}catch(e){}}
  }

  function showDenied(){
    const msg='Bạn chưa được cấp quyền, Vui lòng liên hệ quản lý';
    ui.set(msg,'err');
    let box=core.el('waterSystemAccessNotice');
    if(!box){box=document.createElement('div');box.id='waterSystemAccessNotice';box.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;width:min(86vw,340px);box-sizing:border-box;padding:16px 18px;border:1px solid #d5a19a;border-radius:12px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.22);color:#a23a2a;font-family:Arial,sans-serif;font-size:15px;font-weight:800;line-height:1.35;text-align:center';document.body.appendChild(box);}
    box.textContent=msg;box.style.display='block';
    setTimeout(function(){try{if(box&&box.parentNode)box.parentNode.removeChild(box);}catch(e){}activateManageTab();setTimeout(ui.clear,120);},2000);
  }

  async function openSystemFile(){
    ui.set('Đang kiểm tra quyền truy cập...','');
    let holder=null;
    try{holder=window.open('about:blank','_blank');}catch(e){holder=null;}
    const allowed=await checkAccess(false);
    if(!allowed){try{if(holder&&!holder.closed)holder.close();}catch(e){}showDenied();return false;}
    ui.set('Đang mở FILE HỆ THỐNG...','');
    try{
      if(holder&&!holder.closed){holder.opener=null;holder.location.replace(core.CFG.SYSTEM_SHEET_URL);}else{window.open(core.CFG.SYSTEM_SHEET_URL,'_blank','noopener,noreferrer');}
    }catch(e){window.location.href=core.CFG.SYSTEM_SHEET_URL;}
    return true;
  }

  function bind(){const b=core.el('waterSystemFileR118');if(!b||b.dataset.systemModuleBound==='1')return false;b.dataset.systemModuleBound='1';b.disabled=false;b.removeAttribute('disabled');b.setAttribute('aria-disabled','false');b.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();openSystemFile();return false;},false);return true;}
  function prefetch(){checkAccess(false);}
  document.addEventListener('WATER_MANAGE_CARD_READY',function(){bind();setTimeout(prefetch,250);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bind();setTimeout(prefetch,250);},{once:true});else{bind();setTimeout(prefetch,250);}
  if(window.MutationObserver)new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});

  window.WATER_MANAGE_SYSTEM={BUILD:'system-file-v1.0.0',bind,checkAccess,openSystemFile,showDenied,api,_clearCacheForTest:function(){cache={code:'',allowed:null,ts:0};}};
})();
