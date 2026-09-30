(function(){
  'use strict';

  const BUILD='water-queue-staff-repair-v1';
  let busy=false;

  function currentStaff(){
    try{return String(localStorage.getItem('water_staff')||'').trim().toUpperCase();}
    catch(e){return '';}
  }

  function validStaffCodes(){
    try{
      if(typeof staffList==='undefined'||!Array.isArray(staffList))return [];
      return staffList.map(function(x){return String(x&&x.ma||'').trim().toUpperCase();}).filter(Boolean);
    }catch(e){return [];}
  }

  function errorClientId(text){
    const s=String(text||'');
    if(s.indexOf('Nhân sự không hợp lệ')<0)return '';
    const m=s.match(/Lỗi SPEED3:\s*([^:\s]+)\s*:/i);
    return m?String(m[1]||'').trim():'';
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

  async function repairOne(clientId){
    if(!clientId||busy)return false;
    const selected=currentStaff();
    const valid=validStaffCodes();
    if(!selected||valid.indexOf(selected)<0)return false;

    busy=true;
    let d=null;
    try{
      d=await openProjectDb();
      return await new Promise(function(resolve,reject){
        const tx=d.transaction('queue','readwrite');
        const store=tx.objectStore('queue');
        const get=store.get(clientId);
        let changed=false;

        get.onsuccess=function(){
          const item=get.result;
          if(!item){resolve(false);return;}
          const old=String(item.staff||'').trim().toUpperCase();
          if(valid.indexOf(old)>=0){resolve(false);return;}
          item.staff=selected;
          store.put(item);
          changed=true;
        };
        get.onerror=function(){reject(get.error||new Error('Không đọc được ảnh chờ.'));};
        tx.oncomplete=function(){resolve(changed);};
        tx.onerror=function(){reject(tx.error||new Error('Không sửa được ảnh chờ.'));};
        tx.onabort=function(){reject(tx.error||new Error('Không sửa được ảnh chờ.'));};
      });
    }finally{
      try{if(d)d.close();}catch(e){}
      busy=false;
    }
  }

  async function inspect(){
    const node=document.getElementById('syncStatus');
    if(!node)return;
    const text=String(node.textContent||'');
    const clientId=errorClientId(text);
    if(!clientId)return;

    try{
      const changed=await repairOne(clientId);
      if(changed){
        node.textContent='✓ Đã gán lại nhân sự hiện tại cho ảnh chờ '+clientId+'. Bấm ĐỒNG BỘ NGAY để gửi lại.';
        if(typeof updatePending==='function'){
          try{await updatePending();}catch(e){}
        }
      }
    }catch(e){
      node.textContent='Chưa sửa được nhân sự ảnh chờ: '+String(e&&e.message||e);
    }
  }

  function install(){
    const node=document.getElementById('syncStatus');
    if(!node)return;
    const obs=new MutationObserver(function(){setTimeout(inspect,0);});
    obs.observe(node,{childList:true,characterData:true,subtree:true});
    setTimeout(inspect,300);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();

  window.WATER_QUEUE_STAFF_REPAIR_BUILD=BUILD;
})();
