/* ============================================================
MODULE_ID: 07
MODULE_NAME: system-file
VERSION: 2.1.0
STATUS: READY FOR RUNTIME TEST
BASE: GHI_SO_NUOC_MODULAR_RELEASE_V1_FINAL
DEPENDENCIES: 03_manage-core-v1.js, 08_manage-status-v1.js
RESPONSIBILITY: FILE HỆ THỐNG permission + open only
RULE: must not touch month/download/view logic
============================================================ */
(function(){
  'use strict';

  const core=window.WATER_MANAGE_CORE;
  const ui=window.WATER_MANAGE_STATUS;

  if(!core||!ui){
    throw new Error('system-file thiếu dependency');
  }

  const BACKEND_URL=
    'https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

  const DENIED_MESSAGE=
    'Bạn chưa được cấp quyền. Hãy liên hệ Quản lý để được cấp quyền';

  let cache={
    code:'',
    allowed:null,
    ts:0
  };

  function currentStaffCode(){
    try{
      return core
        .txt(localStorage.getItem('water_staff'))
        .toUpperCase();
    }catch(e){
      return '';
    }
  }

  /*************************************************************
   * QUAN TRỌNG:
   * Không đọc NHAN_SU_THUC_HIEN trực tiếp bằng Google gviz nữa.
   * File Google Sheet có thể để HẠN CHẾ; backend Apps Script sẽ
   * đọc quyền thay cho trình duyệt và trả JSONP về App.
   *************************************************************/
  function fetchAccessFromBackend(code){
    return new Promise(function(resolve,reject){
      const cb=
        '__waterSystemAccess_'+
        Date.now()+'_'+
        Math.random().toString(36).slice(2);

      const script=document.createElement('script');
      let done=false;

      const timer=setTimeout(function(){
        finish(new Error('Hết thời gian kiểm tra quyền.'));
      },12000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);

        try{
          delete window[cb];
        }catch(e){
          window[cb]=undefined;
        }

        if(script.parentNode){
          script.parentNode.removeChild(script);
        }

        err?reject(err):resolve(data);
      }

      window[cb]=function(data){
        finish(null,data);
      };

      script.onerror=function(){
        finish(new Error('Không kiểm tra được quyền.'));
      };

      script.src=
        BACKEND_URL+
        '?api=systemaccess'+
        '&code='+encodeURIComponent(code)+
        '&callback='+encodeURIComponent(cb)+
        '&_='+Date.now();

      document.head.appendChild(script);
    });
  }

  async function loadAccess(force){
    const code=currentStaffCode();

    if(!code){
      return {
        ok:true,
        code:'',
        allowed:false,
      };
    }

    if(
      !force&&
      cache.code===code&&
      cache.allowed!==null&&
      (Date.now()-cache.ts)<120000
    ){
      return {
        ok:true,
        code:cache.code,
        allowed:cache.allowed,
      };
    }

    const data=await fetchAccessFromBackend(code);

    const result={
      ok:!!(data&&data.ok!==false),
      code:code,
      allowed:!!(data&&data.allowed===true),
    };

    cache={
      code:code,
      allowed:result.allowed,
      ts:Date.now()
    };

    return result;
  }

  async function checkAccess(force){
    try{
      return !!(await loadAccess(force)).allowed;
    }catch(e){
      cache={
        code:currentStaffCode(),
        allowed:false,
            ts:Date.now()
      };
      return false;
    }
  }

  function safeHtml(v){
    return String(v==null?'':v)
      .replace(/[&<>"']/g,function(c){
        return {
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;',
          "'":'&#39;'
        }[c];
      });
  }

  function messageHtml(message){
    return '<!doctype html>'+
      '<html lang="vi"><head>'+
      '<meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'+
      '<title>Thông báo quyền truy cập</title>'+
      '</head>'+
      '<body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#18232d">'+
      '<main style="box-sizing:border-box;min-height:100vh;padding:24px 18px;display:flex;align-items:center;justify-content:center">'+
      '<section style="width:100%;max-width:420px;background:#fff;border:1px solid #d9e0e6;border-radius:14px;box-shadow:0 6px 22px rgba(0,0,0,.10);padding:26px 20px;text-align:center;box-sizing:border-box">'+
      '<div style="font-size:18px;font-weight:900;color:#174f7e;margin-bottom:18px">THÔNG BÁO</div>'+
      '<div style="font-size:16px;font-weight:800;line-height:1.5;color:#a23a2a;margin-bottom:26px">'+
      safeHtml(message)+
      '</div>'+
      '<button id="waterSystemDeniedBack" type="button" style="width:100%;min-height:46px;border:1px solid #9aa8b5;border-radius:10px;background:#f7f8fa;color:#263746;font-size:14px;font-weight:900">'+
      '← QUAY LẠI ỨNG DỤNG'+
      '</button>'+
      '</section></main>'+
      '<script>(function(){'+
      'var b=document.getElementById("waterSystemDeniedBack");'+
      'if(b){b.onclick=function(){'+
      'try{if(window.opener&&!window.opener.closed){window.opener.focus();}}catch(e){}'+
      'try{window.close();}catch(e){}'+
      '};}'+
      '})();</'+'script>'+
      '</body></html>';
  }

  function renderMessageTab(holder,message){
    if(!holder||holder.closed){
      return false;
    }

    try{
      holder.document.open();
      holder.document.write(messageHtml(message));
      holder.document.close();
      return true;
    }catch(e){
      return false;
    }
  }

  function systemUrl(){
    return core.CFG.SYSTEM_SHEET_URL;
  }

  async function openSystemFile(){
    ui.set('Đang kiểm tra quyền truy cập...','');

    let holder=null;

    try{
      holder=window.open('about:blank','_blank');
    }catch(e){
      holder=null;
    }

    let access=null;

    try{
      access=await loadAccess(true);
    }catch(e){
      const msg='Không kiểm tra được quyền. Hãy thử lại.';
      ui.set(msg,'err');
      renderMessageTab(holder,msg);
      return false;
    }

    if(!access.allowed){
      ui.set(DENIED_MESSAGE,'err');
      renderMessageTab(holder,DENIED_MESSAGE);
      return false;
    }

    const targetUrl=systemUrl();

    ui.set('Đang mở FILE HỆ THỐNG...','');

    try{
      if(holder&&!holder.closed){
        holder.opener=null;
        holder.location.replace(targetUrl);
      }else{
        window.open(
          targetUrl,
          '_blank',
          'noopener,noreferrer'
        );
      }
    }catch(e){
      window.location.href=targetUrl;
    }

    return true;
  }

  function bind(){
    const b=core.el('waterSystemFileR118');

    if(
      !b||
      b.dataset.systemModuleBound==='21'
    ){
      return false;
    }

    b.dataset.systemModuleBound='21';
    b.disabled=false;
    b.removeAttribute('disabled');
    b.setAttribute('aria-disabled','false');

    b.addEventListener(
      'click',
      function(ev){
        ev.preventDefault();
        ev.stopPropagation();

        if(ev.stopImmediatePropagation){
          ev.stopImmediatePropagation();
        }

        openSystemFile();
        return false;
      },
      false
    );

    return true;
  }

  document.addEventListener(
    'WATER_MANAGE_CARD_READY',
    bind
  );

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      bind,
      {once:true}
    );
  }else{
    bind();
  }

  if(window.MutationObserver){
    new MutationObserver(bind).observe(
      document.documentElement,
      {
        childList:true,
        subtree:true
      }
    );
  }

  window.WATER_MANAGE_SYSTEM={
    BUILD:'system-file-v2.1.0-restricted-drive',
    bind:bind,
    checkAccess:checkAccess,
    loadAccess:loadAccess,
    openSystemFile:openSystemFile,
    systemUrl:systemUrl,
    _clearCacheForTest:function(){
      cache={
        code:'',
        allowed:null,
            ts:0
      };
    }
  };
})();
