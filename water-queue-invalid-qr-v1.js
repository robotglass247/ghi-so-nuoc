(function(){
  'use strict';

  const BUILD='water-queue-invalid-qr-v2';
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

  function clearReceipt(clientId){
    try{
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i);
        if(!k||k.indexOf('water_capture_v86:')!==0)continue;
        try{
          const v=JSON.parse(localStorage.getItem(k)||'null');
          if(v&&String(v.clientId||'')===String(clientId))localStorage.removeItem(k);
        }catch(e){}
      }
    }catch(e){}

    try{
      if(typeof captureReceipts!=='undefined'&&captureReceipts&&typeof captureReceipts.forEach==='function'){
        const keys=[];
        captureReceipts.forEach(function(v,k){
          if(v&&String(v.clientId||'')===String(clientId))keys.push(k);
        });
        keys.forEach(function(k){captureReceipts.delete(k);});
      }
    }catch(e){}
  }

  async function deleteOne(clientId){
    if(!clientId||busy)return false;
    busy=true;
    let d=null;
    try{
      d=await openProjectDb();
      const existed=await new Promise(function(resolve,reject){
        const tx=d.transaction('queue','readwrite');
        const store=tx.objectStore('queue');
        const get=store.get(clientId);
        let found=false;

        get.onsuccess=function(){
          if(!get.result)return;
          found=true;
          store.delete(clientId);
        };
        get.onerror=function(){reject(get.error||new Error('Không đọc được ảnh chờ.'));};
        tx.oncomplete=function(){resolve(found);};
        tx.onerror=function(){reject(tx.error||new Error('Không xóa được ảnh lỗi.'));};
        tx.onabort=function(){reject(tx.error||new Error('Không xóa được ảnh lỗi.'));};
      });

      if(existed)clearReceipt(clientId);
      return existed;
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
      const p=document.getElementById('pending');
      if(p)p.textContent=String(count);
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
    btn.textContent='XÓA ẢNH LỖI KHỎI CHỜ';
    btn.style.cssText='display:none;width:100%;margin-top:7px;padding:11px 8px;border:1px solid #c94a3a;border-radius:12px;background:#fff;color:#a52f23;font-size:14px;font-weight:800;';

    btn.onclick=async function(){
      const clientId=activeClientId;
      const reason=activeReason||'Ảnh không hợp lệ';
      if(!clientId||busy)return;

      const ok=window.confirm(
        reason+'.\n\n'+
        'Ảnh này không thể đồng bộ vào dự án hiện tại.\n\n'+
        'Xóa đúng ảnh lỗi này khỏi Chờ?\n\n'+
        clientId+'\n\n'+
        'Sau đó chụp lại đúng đồng hồ/QR thuộc dự án.'
      );
      if(!ok)return;

      btn.disabled=true;
      try{
        const deleted=await deleteOne(clientId);
        await refreshPending();

        if(deleted){
          activeClientId='';
          activeReason='';
          btn.style.display='none';
          status.textContent='✓ Đã xóa ảnh lỗi khỏi Chờ. Chụp lại đúng đồng hồ/QR thuộc dự án.';
        }else{
          status.textContent='Ảnh lỗi không còn trong Chờ.';
          btn.style.display='none';
        }
      }catch(e){
        status.textContent='Không xóa được ảnh lỗi khỏi Chờ: '+String(e&&e.message||e);
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
