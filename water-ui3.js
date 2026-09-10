(function(){
  'use strict';

  const BUILD='878-ui3';
  const CACHE_KEY='water_progress_ui3';
  const BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

  function el(id){return document.getElementById(id);}

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

  function four(n){
    n=Math.max(0,Math.floor(Number(n)||0));
    return String(n).padStart(4,'0');
  }

  function renderProgress(data){
    if(!data||data.ok!==true)return false;
    const total=Math.max(0,Number(data.total)||0);
    const done=Math.max(0,Math.min(total,Number(data.captured)||0));
    const left=Number.isFinite(Number(data.remaining))
      ? Math.max(0,Number(data.remaining))
      : Math.max(0,total-done);

    if(el('progressTotal'))el('progressTotal').textContent=four(total);
    if(el('progressDone'))el('progressDone').textContent=four(done);
    if(el('progressLeft'))el('progressLeft').textContent=four(left);

    try{localStorage.setItem(CACHE_KEY,JSON.stringify(data));}catch(e){}
    return true;
  }

  function renderCachedProgress(){
    try{
      const data=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(data&&data.period===periodNow())return renderProgress(data);
    }catch(e){}
    return false;
  }

  function setDebug(text){
    const d=el('debug');
    if(d)d.textContent=String(text||'');
  }

  let bridgeFrame=null;
  let bridgeTimer=null;
  let bridgeSeq=0;
  let expectedRequestId='';

  function cleanupBridge(){
    clearTimeout(bridgeTimer);
    bridgeTimer=null;
    if(bridgeFrame){
      try{bridgeFrame.remove();}catch(e){}
      bridgeFrame=null;
    }
  }

  function hiddenInput(form,name,value){
    const i=document.createElement('input');
    i.type='hidden';
    i.name=name;
    i.value=String(value==null?'':value);
    form.appendChild(i);
  }

  function submitUiState(reason){
    if(!navigator.onLine){
      renderCachedProgress();
      return;
    }

    const seq=++bridgeSeq;
    cleanupBridge();

    const requestId='u'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
    expectedRequestId=requestId;

    const frame=document.createElement('iframe');
    const frameName='waterUiBridge_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    frame.name=frameName;
    frame.id=frameName;
    frame.style.display='none';
    frame.setAttribute('aria-hidden','true');
    document.body.appendChild(frame);
    bridgeFrame=frame;

    const form=document.createElement('form');
    form.method='POST';
    form.action=BACKEND;
    form.target=frameName;
    form.style.display='none';

    hiddenInput(form,'api','uistate');
    hiddenInput(form,'period',periodNow());
    hiddenInput(form,'requestId',requestId);
    hiddenInput(form,'reason',reason||'auto');

    document.body.appendChild(form);

    setDebug('Đang cập nhật nhân sự + tiến độ từ Apps Script...');

    try{
      form.submit();
    }catch(err){
      try{form.remove();}catch(e){}
      cleanupBridge();
      setDebug('Không gửi được yêu cầu cập nhật: '+String(err&&err.message||err));
      return;
    }

    setTimeout(()=>{try{form.remove();}catch(e){}},200);

    bridgeTimer=setTimeout(function(){
      if(seq!==bridgeSeq||expectedRequestId!==requestId)return;
      expectedRequestId='';
      cleanupBridge();
      renderCachedProgress();
      setDebug('Apps Script chưa phản hồi dữ liệu động. Ảnh vẫn đồng bộ bình thường.');
    },20000);
  }

  function applyStaff(list){
    if(!Array.isArray(list)||!list.length)return false;

    try{
      if(typeof setStaffList==='function'){
        setStaffList(list,'POST bridge');
      }else if(typeof staffList!=='undefined'){
        staffList=list;
      }
    }catch(e){
      try{if(typeof staffList!=='undefined')staffList=list;}catch(_){}
    }

    try{if(typeof staffPrimaryLoaded!=='undefined')staffPrimaryLoaded=true;}catch(e){}
    try{if(typeof renderStaff==='function')renderStaff();}catch(e){}
    try{if(typeof updateStaffName==='function')updateStaffName();}catch(e){}
    return true;
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(!d.requestId||d.requestId!==expectedRequestId)return;

    const staffOk=applyStaff(d.staff);
    const progressOk=renderProgress(d.progress);

    expectedRequestId='';
    cleanupBridge();

    if(staffOk&&progressOk){
      setDebug('✓ Đã cập nhật '+d.staff.length+' nhân sự · tiến độ '+String(d.progress.period||periodNow()));
    }else if(staffOk){
      setDebug('✓ Đã cập nhật '+d.staff.length+' nhân sự · chưa nhận được tiến độ.');
    }else if(progressOk){
      setDebug('✓ Đã cập nhật tiến độ · danh sách nhân sự chưa nhận được.');
    }else{
      setDebug('Apps Script đã phản hồi nhưng dữ liệu chưa hợp lệ.');
    }
  });

  function loadStaffUI3(force){
    try{if(typeof staffLoadTimer!=='undefined')clearTimeout(staffLoadTimer);}catch(e){}

    try{
      if(typeof staffList!=='undefined'&&!staffList.length&&typeof loadLocalStaffFirst==='function'){
        loadLocalStaffFirst();
      }
      if(typeof renderStaff==='function')renderStaff();
      if(typeof updateStaffName==='function')updateStaffName();
    }catch(e){}

    if(force)setDebug('Đang lấy danh sách nhân sự mới nhất...');
    submitUiState(force?'staff_manual':'staff_auto');
  }

  try{loadStaff=loadStaffUI3;}catch(e){}
  window.loadStaff=loadStaffUI3;
  window.loadWaterProgress=function(){submitUiState('progress');};
  window.loadWaterUiState=submitUiState;

  try{if(typeof staffLoadTimer!=='undefined')clearTimeout(staffLoadTimer);}catch(e){}

  const oldSetStatus=window.setStatus;
  if(typeof oldSetStatus==='function'){
    window.setStatus=function(a,b){
      let main=String(a||'');
      let sub=String(b||'');

      if(main==='SẴN SÀNG CHỤP'){
        sub='1. Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.';
      }else if(main==='SẴN SÀNG ĐỒNG HỒ TIẾP THEO'){
        main='ĐÃ LƯU ẢNH';
        sub='3. Ảnh đã lưu an toàn. Chuẩn bị đồng hồ tiếp theo.';
        setTimeout(function(){
          oldSetStatus('SẴN SÀNG CHỤP','4. Đưa đồng hồ tiếp theo + QR vào khung.');
        },1200);
      }
      return oldSetStatus(main,sub);
    };
  }

  const oldAccept=window.acceptLiveQR;
  if(typeof oldAccept==='function'){
    window.acceptLiveQR=function(raw,source){
      const result=oldAccept(raw,source);
      try{
        if(result&&result.hits>=2){
          const q=result.qr||{};
          const name=q.label?': '+q.label:'';
          if(el('statusMain'))el('statusMain').textContent='NHẤN ĐỂ CHỤP';
          if(el('statusSub'))el('statusSub').textContent='2. QR + mặt số đã nhận rõ'+name+'. Nhấn CHỤP.';
        }
      }catch(e){}
      return result;
    };
  }

  renderCachedProgress();
  setTimeout(function(){submitUiState('startup');},800);
  setInterval(function(){submitUiState('interval');},30000);

  window.addEventListener('online',function(){
    setTimeout(function(){submitUiState('online');},600);
  });

  window.addEventListener('pageshow',function(){
    setTimeout(function(){submitUiState('pageshow');},900);
  });

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'){
      setTimeout(function(){submitUiState('visible');},700);
    }
  });

  const sync=el('syncBtn');
  if(sync)sync.addEventListener('click',function(){
    setTimeout(function(){submitUiState('after_sync');},3500);
    setTimeout(function(){submitUiState('after_sync_2');},9000);
  });

  const shot=el('shotBtn');
  if(shot)shot.addEventListener('click',function(){
    setTimeout(function(){submitUiState('after_shot');},3500);
    setTimeout(function(){submitUiState('after_shot_2');},9000);
  });
})();
