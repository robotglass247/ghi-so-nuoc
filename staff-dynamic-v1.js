/* STAFF_DYNAMIC_V1_ONLY
 * Chỉ cập nhật danh sách nhân sự qua POST api=uistate.
 * KHÔNG can thiệp camera, QR, IndexedDB, captureAndSave, queue hay SPEED3.
 */
(function(){
  'use strict';

  const STAFF_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  let bridgeFrame=null;
  let bridgeTimer=null;
  let bridgeSeq=0;
  let expectedRequestId='';

  function periodNow(){
    try{
      const parts=new Intl.DateTimeFormat('en-GB',{
        timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',year:'numeric'
      }).formatToParts(new Date());
      return parts.find(x=>x.type==='month').value+'/'+parts.find(x=>x.type==='year').value;
    }catch(e){
      const d=new Date();
      return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
    }
  }

  function trustedOrigin(origin){
    try{
      const u=new URL(origin);
      return u.protocol==='https:' &&
        (u.hostname==='script.google.com' || u.hostname.endsWith('-script.googleusercontent.com'));
    }catch(e){return false;}
  }

  function cleanup(){
    clearTimeout(bridgeTimer);
    bridgeTimer=null;
    if(bridgeFrame){
      try{bridgeFrame.remove();}catch(e){}
      bridgeFrame=null;
    }
  }

  function hidden(form,name,value){
    const i=document.createElement('input');
    i.type='hidden';
    i.name=name;
    i.value=String(value==null?'':value);
    form.appendChild(i);
  }

  function applyStaff(list){
    if(!Array.isArray(list)||!list.length)return false;
    try{
      // Dùng nguồn remote để hàm gốc cập nhật cache và loại người đã nghỉ việc.
      if(typeof setStaffList==='function'){
        setStaffList(list,'Google iframe');
      }else{
        return false;
      }
      if(typeof renderStaff==='function')renderStaff();
      if(typeof updateStaffName==='function')updateStaffName();
      return true;
    }catch(e){return false;}
  }

  function refreshStaff(reason){
    if(!navigator.onLine)return;

    const seq=++bridgeSeq;
    cleanup();

    const requestId='staff_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
    expectedRequestId=requestId;

    const frame=document.createElement('iframe');
    const frameName='staffBridge_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    frame.name=frameName;
    frame.id=frameName;
    frame.style.display='none';
    frame.setAttribute('aria-hidden','true');
    document.body.appendChild(frame);
    bridgeFrame=frame;

    const form=document.createElement('form');
    form.method='POST';
    form.action=STAFF_BACKEND;
    form.target=frameName;
    form.style.display='none';
    hidden(form,'api','uistate');
    hidden(form,'period',periodNow());
    hidden(form,'requestId',requestId);
    hidden(form,'reason',reason||'staff');
    document.body.appendChild(form);

    try{form.submit();}
    catch(e){
      try{form.remove();}catch(_){}
      cleanup();
      return;
    }
    setTimeout(()=>{try{form.remove();}catch(e){}},200);

    bridgeTimer=setTimeout(function(){
      if(seq!==bridgeSeq||expectedRequestId!==requestId)return;
      expectedRequestId='';
      cleanup();
    },15000);
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(!trustedOrigin(event.origin))return;
    if(!d.requestId||d.requestId!==expectedRequestId)return;

    expectedRequestId='';
    cleanup();
    applyStaff(d.staff);
  });

  // Mỗi lần mở danh sách: hiển thị cache ngay rồi yêu cầu bản mới từ Sheet.
  try{
    const baseOpenStaff=openStaff;
    const openStaffDynamic=function(){
      baseOpenStaff();
      setTimeout(()=>refreshStaff('open_staff'),80);
    };
    window.openStaff=openStaffDynamic;
    try{openStaff=openStaffDynamic;}catch(e){}
  }catch(e){}

  // Tải mới khi mở app, khi có mạng lại, quay lại tab và định kỳ.
  setTimeout(()=>refreshStaff('startup'),600);
  setInterval(()=>refreshStaff('interval'),20000);
  window.addEventListener('online',()=>setTimeout(()=>refreshStaff('online'),400));
  window.addEventListener('pageshow',()=>setTimeout(()=>refreshStaff('pageshow'),700));
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible')setTimeout(()=>refreshStaff('visible'),500);
  });

  window.refreshWaterStaff=refreshStaff;
})();
