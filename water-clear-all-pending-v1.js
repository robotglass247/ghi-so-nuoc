(function(){
  'use strict';

  const BUILD='water-clear-all-pending-v1';
  const DB_NAME='water_meter_v6';
  const STORE='queue';
  let clearing=false;

  function plain(v){
    return String(v==null?'':v)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D')
      .toUpperCase()
      .replace(/\s+/g,' ')
      .trim();
  }

  function isClearPendingAction(node){
    if(!node)return false;
    const label=plain(node.getAttribute('aria-label')||node.textContent||'');
    return label.indexOf('XOA ANH CHO')>=0 || label.indexOf('XOA ANH DANG CHO')>=0;
  }

  function actionNode(target){
    if(!target||!target.closest)return null;
    const node=target.closest('button,[role="button"],a,.btn');
    return isClearPendingAction(node)?node:null;
  }

  function syncBusy(){
    try{
      if(typeof syncRunning!=='undefined' && syncRunning)return true;
    }catch(e){}
    const btn=document.getElementById('syncBtn');
    const status=document.getElementById('syncStatus');
    const t=plain((btn?btn.textContent:'')+' '+(status?status.textContent:''));
    return t.indexOf('DANG DONG BO')>=0;
  }

  function openQueueDb(){
    return new Promise(function(resolve,reject){
      const req=indexedDB.open(DB_NAME);
      req.onupgradeneeded=function(e){
        const d=e.target.result;
        if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'clientId'});
      };
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){reject(req.error||new Error('Không mở được bộ nhớ ảnh chờ.'));};
    });
  }

  function countQueue(d){
    return new Promise(function(resolve,reject){
      try{
        const req=d.transaction(STORE,'readonly').objectStore(STORE).count();
        req.onsuccess=function(){resolve(Number(req.result||0));};
        req.onerror=function(){reject(req.error||new Error('Không đếm được ảnh chờ.'));};
      }catch(err){reject(err);}
    });
  }

  function clearQueue(d){
    return new Promise(function(resolve,reject){
      try{
        const tx=d.transaction(STORE,'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete=function(){resolve();};
        tx.onerror=function(){reject(tx.error||new Error('Không xóa được ảnh chờ.'));};
        tx.onabort=function(){reject(tx.error||new Error('Thao tác xóa ảnh chờ bị hủy.'));};
      }catch(err){reject(err);}
    });
  }

  function setPendingZero(){
    ['pending','waterProjectPending','waterManagePending'].forEach(function(id){
      const n=document.getElementById(id);
      if(n)n.textContent='0';
    });
  }

  function showMessage(text,ok){
    const status=document.getElementById('syncStatus');
    if(status){
      status.textContent=text;
      try{status.classList.toggle('ok',!!ok);status.classList.toggle('bad',!ok);}catch(e){}
    }
    try{
      if(typeof toast==='function')toast(text,ok?3200:4200);
    }catch(e){}
  }

  async function clearAllPending(){
    if(clearing)return;
    clearing=true;
    let d=null;
    try{
      if(syncBusy()){
        showMessage('Đang đồng bộ. Chưa xóa ảnh chờ để tránh mất dữ liệu.',false);
        return;
      }

      d=await openQueueDb();
      const count=await countQueue(d);
      if(count<=0){
        setPendingZero();
        showMessage('Không có ảnh chờ để xóa.',true);
        return;
      }

      const ok=window.confirm('Xóa toàn bộ '+count+' ảnh đang chờ trên máy này?\n\nẢnh đã đồng bộ lên hệ thống sẽ không bị xóa.');
      if(!ok)return;

      await clearQueue(d);
      setPendingZero();
      try{
        if(typeof updatePending==='function')await updatePending();
      }catch(e){}
      showMessage('Đã xóa toàn bộ '+count+' ảnh chờ.',true);
      try{window.dispatchEvent(new CustomEvent('water:pending-cleared',{detail:{count:count}}));}catch(e){}
    }catch(err){
      console.error('[WATER_CLEAR_ALL_PENDING]',err);
      showMessage('Không xóa được ảnh chờ. Vui lòng thử lại.',false);
      try{window.alert('Không xóa được ảnh chờ: '+String(err&&err.message||err));}catch(e){}
    }finally{
      try{if(d)d.close();}catch(e){}
      clearing=false;
    }
  }

  document.addEventListener('click',function(e){
    const node=actionNode(e.target);
    if(!node)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    clearAllPending();
  },true);

  window.WATER_CLEAR_ALL_PENDING_BUILD=BUILD;
})();
