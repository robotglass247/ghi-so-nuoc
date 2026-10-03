(function(){
  'use strict';

  const BUILD='water-queue-invalid-qr-v3-clear-all';
  const BTN_ID='discardInvalidQrBtn';
  let activeClientId='';
  let activeReason='';
  let busy=false;

  function parseBlockingError(text){
    const s=String(text||'');

    let reason='';
    if(/QR\/token không khớp danh mục/i.test(s)){
      reason='QR/token không khớp danh mục';
    }else if(/Không tìm thấy(?: mã đồng hồ)?/i.test(s)){
      reason='Không tìm thấy mã đồng hồ trong dự án';
    }else{
      return null;
    }

    const m=s.match(/Lỗi SPEED3:\s*([^:\s]+)\s*:/i);
    const clientId=m?String(m[1]||'').trim():'';
    if(!clientId)return null;

    return {clientId:clientId,reason:reason};
  }

  function openProjectDb(){
    return new Promise(function(resolve,reject){
      try{
        const req=indexedDB.open('water_meter_v6',1);
        req.onsuccess=function(){resolve(req.result);};
        req.onerror=function(){reject(req.error||new Error('Không mở được hàng chờ.'));};
      }catch(e){reject(e);}
    });
  }

  function readAllQueue(d){
    return new Promise(function(resolve,reject){
      try{
        const req=d.transaction('queue','readonly').objectStore('queue').getAll();
        req.onsuccess=function(){resolve(Array.isArray(req.result)?req.result:[]);};
        req.onerror=function(){reject(req.error||new Error('Không đọc được ảnh chờ.'));};
      }catch(e){reject(e);}
    });
  }

  function clearQueue(d){
    return new Promise(function(resolve,reject){
      try{
        const tx=d.transaction('queue','readwrite');
        tx.objectStore('queue').clear();
        tx.oncomplete=function(){resolve();};
        tx.onerror=function(){reject(tx.error||new Error('Không xóa được ảnh chờ.'));};
        tx.onabort=function(){reject(tx.error||new Error('Không xóa được ảnh chờ.'));};
      }catch(e){reject(e);}
    });
  }

  function clearReceipts(clientIds){
    const wanted=new Set((clientIds||[]).map(function(x){return String(x||'');}).filter(Boolean));
    if(!wanted.size)return;

    try{
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i);
        if(!k||k.indexOf('water_capture_v86:')!==0)continue;
        try{
          const v=JSON.parse(localStorage.getItem(k)||'null');
          if(v&&wanted.has(String(v.clientId||'')))localStorage.removeItem(k);
        }catch(e){}
      }
    }catch(e){}

    try{
      if(typeof captureReceipts!=='undefined'&&captureReceipts&&typeof captureReceipts.forEach==='function'){
        const keys=[];
        captureReceipts.forEach(function(v,k){
          if(v&&wanted.has(String(v.clientId||'')))keys.push(k);
        });
        keys.forEach(function(k){captureReceipts.delete(k);});
      }
    }catch(e){}
  }

  async function clearAllPending(reason){
    if(busy)return {cancelled:true,count:0};
    busy=true;
    let d=null;
    try{
      d=await openProjectDb();
      const rows=await readAllQueue(d);
      const count=rows.length;
      if(!count)return {cancelled:false,count:0};

      const ok=window.confirm(
        (reason||'Có ảnh không hợp lệ trong hàng chờ')+'.\n\n'+
        'XÓA TOÀN BỘ '+count+' ẢNH ĐANG CHỜ trên máy này?\n\n'+
        'Ảnh đã đồng bộ lên hệ thống sẽ không bị xóa.'
      );
      if(!ok)return {cancelled:true,count:count};

      const ids=rows.map(function(x){return String(x&&x.clientId||'');}).filter(Boolean);
      await clearQueue(d);
      clearReceipts(ids);
      return {cancelled:false,count:count};
    }finally{
      try{if(d)d.close();}catch(e){}
      busy=false;
    }
  }

  async function refreshPending(){
    if(typeof updatePending==='function'){
      try{await updatePending();return;}catch(e){}
    }

    let d=null;
    try{
      d=await openProjectDb();
      const count=await new Promise(function(resolve,reject){
        const req=d.transaction('queue','readonly').objectStore('queue').count();
        req.onsuccess=function(){resolve(req.result||0);};
        req.onerror=function(){reject(req.error);};
      });
      ['pending','waterProjectPending','waterManagePending'].forEach(function(id){
        const p=document.getElementById(id);
        if(p)p.textContent=String(count);
      });
    }catch(e){}finally{
      try{if(d)d.close();}catch(e){}
    }
  }

  function ensureButton(){
    let btn=document.getElementById(BTN_ID);
    if(btn)return btn;

    const status=document.getElementById('syncStatus');
    if(!status)return null;

    btn=document.createElement('button');
    btn.id=BTN_ID;
    btn.type='button';
    btn.textContent='XÓA TOÀN BỘ ẢNH CHỜ';
    btn.style.cssText='display:none;width:100%;margin-top:7px;padding:11px 8px;border:1px solid #c94a3a;border-radius:12px;background:#fff;color:#a52f23;font-size:14px;font-weight:800;';

    btn.onclick=async function(){
      const reason=activeReason||'Ảnh không hợp lệ';
      if(!activeClientId||busy)return;

      btn.disabled=true;
      try{
        const result=await clearAllPending(reason);
        if(result.cancelled)return;

        await refreshPending();
        activeClientId='';
        activeReason='';
        btn.style.display='none';

        if(result.count>0){
          status.textContent='✓ Đã xóa toàn bộ '+result.count+' ảnh chờ. Có thể chụp lại từ đầu.';
        }else{
          status.textContent='Không còn ảnh trong Chờ.';
        }
      }catch(e){
        status.textContent='Không xóa được toàn bộ ảnh chờ: '+String(e&&e.message||e);
      }finally{
        btn.disabled=false;
      }
    };

    status.insertAdjacentElement('afterend',btn);
    return btn;
  }

  function inspect(){
    const status=document.getElementById('syncStatus');
    const btn=ensureButton();
    if(!status||!btn)return;

    const parsed=parseBlockingError(status.textContent||'');
    if(!parsed){
      activeClientId='';
      activeReason='';
      btn.style.display='none';
      return;
    }

    activeClientId=parsed.clientId;
    activeReason=parsed.reason;
    btn.style.display='block';
  }

  function install(){
    const status=document.getElementById('syncStatus');
    if(!status){setTimeout(install,250);return;}

    ensureButton();
    const obs=new MutationObserver(function(){setTimeout(inspect,0);});
    obs.observe(status,{childList:true,characterData:true,subtree:true});
    setTimeout(inspect,200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();

  window.WATER_QUEUE_INVALID_QR_BUILD=BUILD;
})();
