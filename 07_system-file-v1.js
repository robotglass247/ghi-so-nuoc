/* ============================================================
MODULE_ID: 07
MODULE_NAME: system-file
VERSION: 1.1.0
STATUS: PENDING USER RUNTIME CONFIRMATION
DEPENDENCIES: 03_manage-core-v1.js, 08_manage-status-v1.js
RESPONSIBILITY: FILE HỆ THỐNG permission + open/denied tab only
BASE: MODULAR RELEASE V1 FINAL - PASS package supplied by user
RULE: must not touch month/download/view logic
============================================================ */
(function(){
  'use strict';
  const core=window.WATER_MANAGE_CORE,ui=window.WATER_MANAGE_STATUS;
  if(!core||!ui)throw new Error('system-file thiếu dependency');

  const DENIED_MESSAGE='Bạn chưa được cấp quyền. Hãy liên hệ Quản lý để được cấp quyền';
  let cache={code:'',allowed:null,ts:0};

  function currentStaffCode(){
    try{
      return core.txt(localStorage.getItem('water_staff')).toUpperCase();
    }catch(e){
      return '';
    }
  }

  function fetchAccessRows(){
    return new Promise(function(resolve,reject){
      const cb='__waterSystemAccess_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;

      const timer=setTimeout(function(){
        finish(new Error('Hết thời gian kiểm tra quyền.'));
      },12000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);

        try{delete window[cb];}
        catch(e){window[cb]=undefined;}

        if(s.parentNode)s.parentNode.removeChild(s);
        err?reject(err):resolve(data);
      }

      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không kiểm tra được quyền.'));};

      const q='select A,B,C,F where A is not null';

      s.src=
        'https://docs.google.com/spreadsheets/d/'
        +encodeURIComponent(core.CFG.SHEET_ID)
        +'/gviz/tq?sheet='
        +encodeURIComponent(core.CFG.STAFF_SHEET)
        +'&range='
        +encodeURIComponent(core.CFG.STAFF_RANGE)
        +'&headers=1&tqx=responseHandler:'
        +encodeURIComponent(cb)
        +'&tq='
        +encodeURIComponent(q)
        +'&_='
        +Date.now();

      document.head.appendChild(s);
    });
  }

  const api={fetchAccessRows};

  async function checkAccess(force){
    const code=currentStaffCode();
    if(!code)return false;

    if(
      !force &&
      cache.code===code &&
      cache.allowed!==null &&
      (Date.now()-cache.ts)<300000
    ){
      return cache.allowed;
    }

    try{
      const data=await api.fetchAccessRows();
      const rows=
        data &&
        data.table &&
        Array.isArray(data.table.rows)
          ? data.table.rows
          : [];

      let matched=null;

      for(let i=0;i<rows.length;i++){
        const r={
          code:core.txt(core.cell(rows[i],0)).toUpperCase(),
          name:core.txt(core.cell(rows[i],1)),
          role:core.txt(core.cell(rows[i],2)),
          state:core.txt(core.cell(rows[i],3))
        };

        if(r.code===code){
          matched=r;
          break;
        }
      }

      const allowed=!!(
        matched &&
        core.norm(matched.role)==='truong bo phan' &&
        core.norm(matched.state)==='dang lam viec'
      );

      cache={code,allowed,ts:Date.now()};
      return allowed;

    }catch(e){
      cache={code,allowed:false,ts:Date.now()};
      return false;
    }
  }

  function activateManageTab(){
    const b=core.el('waterTabManage');

    if(b){
      try{b.click();}
      catch(e){}
    }

    const panel=core.el('waterManagePanel');

    if(panel){
      try{
        panel.scrollIntoView({
          block:'start',
          behavior:'smooth'
        });
      }catch(e){}
    }
  }

  function safeHtml(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[c];
    });
  }

  function deniedTabHtml(){
    const message=safeHtml(DENIED_MESSAGE);

    return '<!doctype html>'
      +'<html lang="vi"><head>'
      +'<meta charset="utf-8">'
      +'<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
      +'<title>Thông báo quyền truy cập</title>'
      +'</head>'
      +'<body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#18232d">'
      +'<main style="box-sizing:border-box;min-height:100vh;padding:24px 18px;display:flex;align-items:center;justify-content:center">'
      +'<section style="width:100%;max-width:420px;background:#fff;border:1px solid #d9e0e6;border-radius:14px;box-shadow:0 6px 22px rgba(0,0,0,.10);padding:26px 20px;text-align:center;box-sizing:border-box">'
      +'<div style="font-size:18px;font-weight:900;color:#174f7e;margin-bottom:18px">THÔNG BÁO</div>'
      +'<div style="font-size:16px;font-weight:800;line-height:1.5;color:#a23a2a;margin-bottom:26px">'
      +message
      +'</div>'
      +'<button id="waterSystemDeniedBack" type="button" '
      +'style="width:100%;min-height:46px;border:1px solid #9aa8b5;border-radius:10px;background:#f7f8fa;color:#263746;font-size:14px;font-weight:900">'
      +'← QUAY LẠI ỨNG DỤNG'
      +'</button>'
      +'</section></main>'
      +'<script>'
      +'(function(){'
      +'var b=document.getElementById("waterSystemDeniedBack");'
      +'if(!b)return;'
      +'b.onclick=function(){'
      +'try{if(window.opener&&!window.opener.closed){window.opener.focus();}}catch(e){}'
      +'try{window.close();}catch(e){}'
      +'};'
      +'})();'
      +'</'+'script>'
      +'</body></html>';
  }

  function renderDeniedTab(holder){
    if(!holder||holder.closed)return false;

    try{
      holder.document.open();
      holder.document.write(deniedTabHtml());
      holder.document.close();
      return true;
    }catch(e){
      return false;
    }
  }

  function showDeniedFallback(){
    ui.set(DENIED_MESSAGE,'err');

    let tab=core.el('waterSystemDeniedInApp');

    if(!tab){
      tab=document.createElement('section');
      tab.id='waterSystemDeniedInApp';

      tab.style.cssText=[
        'position:fixed',
        'inset:0',
        'z-index:2147483647',
        'box-sizing:border-box',
        'background:#f4f6f8',
        'padding:24px 18px',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'font-family:Arial,sans-serif'
      ].join(';');

      tab.innerHTML=
        '<div style="width:100%;max-width:420px;background:#fff;border:1px solid #d9e0e6;border-radius:14px;box-shadow:0 6px 22px rgba(0,0,0,.10);padding:26px 20px;text-align:center;box-sizing:border-box">'
        +'<div style="font-size:18px;font-weight:900;color:#174f7e;margin-bottom:18px">THÔNG BÁO</div>'
        +'<div style="font-size:16px;font-weight:800;line-height:1.5;color:#a23a2a;margin-bottom:26px">'
        +safeHtml(DENIED_MESSAGE)
        +'</div>'
        +'<button id="waterSystemDeniedBackInApp" type="button" style="width:100%;min-height:46px;border:1px solid #9aa8b5;border-radius:10px;background:#f7f8fa;color:#263746;font-size:14px;font-weight:900">'
        +'← QUAY LẠI QUẢN LÝ'
        +'</button>'
        +'</div>';

      document.body.appendChild(tab);

      const back=core.el('waterSystemDeniedBackInApp');

      if(back){
        back.addEventListener('click',function(){
          try{
            if(tab&&tab.parentNode)tab.parentNode.removeChild(tab);
          }catch(e){}

          ui.clear();
          activateManageTab();
        },false);
      }
    }

    tab.style.display='flex';
    return true;
  }

  function showDenied(holder){
    ui.set(DENIED_MESSAGE,'err');

    if(renderDeniedTab(holder)){
      return true;
    }

    showDeniedFallback();
    return false;
  }

  async function openSystemFile(){
    ui.set('Đang kiểm tra quyền truy cập...','');

    let holder=null;

    try{
      holder=window.open('about:blank','_blank');
    }catch(e){
      holder=null;
    }

    const allowed=await checkAccess(false);

    if(!allowed){
      showDenied(holder);
      return false;
    }

    ui.set('Đang mở FILE HỆ THỐNG...','');

    try{
      if(holder&&!holder.closed){
        holder.opener=null;
        holder.location.replace(core.CFG.SYSTEM_SHEET_URL);
      }else{
        window.open(
          core.CFG.SYSTEM_SHEET_URL,
          '_blank',
          'noopener,noreferrer'
        );
      }
    }catch(e){
      window.location.href=core.CFG.SYSTEM_SHEET_URL;
    }

    return true;
  }

  function bind(){
    const b=core.el('waterSystemFileR118');

    if(!b||b.dataset.systemModuleBound==='1'){
      return false;
    }

    b.dataset.systemModuleBound='1';
    b.disabled=false;
    b.removeAttribute('disabled');
    b.setAttribute('aria-disabled','false');

    b.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();

      if(ev.stopImmediatePropagation){
        ev.stopImmediatePropagation();
      }

      openSystemFile();
      return false;
    },false);

    return true;
  }

  function prefetch(){
    checkAccess(false);
  }

  document.addEventListener(
    'WATER_MANAGE_CARD_READY',
    function(){
      bind();
      setTimeout(prefetch,250);
    }
  );

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      function(){
        bind();
        setTimeout(prefetch,250);
      },
      {once:true}
    );
  }else{
    bind();
    setTimeout(prefetch,250);
  }

  if(window.MutationObserver){
    new MutationObserver(bind).observe(
      document.documentElement,
      {childList:true,subtree:true}
    );
  }

  window.WATER_MANAGE_SYSTEM={
    BUILD:'system-file-v1.1.0-denied-tab',
    bind,
    checkAccess,
    openSystemFile,
    showDenied,
    renderDeniedTab,
    api,
    _clearCacheForTest:function(){
      cache={code:'',allowed:null,ts:0};
    }
  };
})();
