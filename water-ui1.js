(function(){
  'use strict';

  const CACHE_KEY='water_progress_ui2';
  const DATA_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

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
    const rawLeft=Number(data.remaining);
    const left=Number.isFinite(rawLeft)?Math.max(0,rawLeft):Math.max(0,total-done);
    if(el('progressTotal'))el('progressTotal').textContent=four(total);
    if(el('progressDone'))el('progressDone').textContent=four(done);
    if(el('progressLeft'))el('progressLeft').textContent=four(left);
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(data));}catch(e){}
    return true;
  }

  function renderCached(){
    try{
      const data=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(data&&data.period===periodNow())return renderProgress(data);
    }catch(e){}
    return false;
  }

  function progressMessage(text){
    const p=el('progressBar');
    if(p)p.title=String(text||'');
  }

  let progressSeq=0;
  let progressFrame=null;
  let progressTimer=null;
  let activeProgressRequest='';

  function ensureProgressFrame(){
    if(progressFrame&&progressFrame.parentNode)return progressFrame;
    progressFrame=document.createElement('iframe');
    progressFrame.id='waterProgressFrameUI2';
    progressFrame.setAttribute('aria-hidden','true');
    progressFrame.style.display='none';
    document.body.appendChild(progressFrame);
    return progressFrame;
  }

  function loadProgress(){
    if(!navigator.onLine){renderCached();return;}

    const seq=++progressSeq;
    const requestId='p'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
    activeProgressRequest=requestId;
    progressMessage('Đang tải tiến độ kỳ '+periodNow());

    const frame=ensureProgressFrame();
    frame.src=DATA_BACKEND+
      '?api=progressframe'+
      '&period='+encodeURIComponent(periodNow())+
      '&requestId='+encodeURIComponent(requestId)+
      '&_='+Date.now();

    clearTimeout(progressTimer);
    progressTimer=setTimeout(function(){
      if(seq!==progressSeq)return;
      if(!renderCached())progressMessage('Chưa nhận được tiến độ từ máy chủ.');
    },15000);
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object')return;

    if(d.type==='WATER_PROGRESS'){
      if(!d.requestId||d.requestId!==activeProgressRequest)return;
      const result=d.result||{};
      if(result.ok===true){
        renderProgress(result);
        clearTimeout(progressTimer);
        progressMessage('Đã cập nhật tiến độ lúc '+new Date().toLocaleTimeString('vi-VN'));
      }else{
        progressMessage(String(result.error||'API tiến độ báo lỗi'));
      }
      return;
    }

    if(d.type==='WATER_STAFF_LIST'&&Array.isArray(d.staff)){
      try{
        if(typeof staffPrimaryLoaded!=='undefined')staffPrimaryLoaded=true;
        if(typeof setStaffList==='function')setStaffList(d.staff,'Apps Script iframe');
      }catch(e){}
    }
  });

  window.loadWaterProgress=loadProgress;

  // UI2: ép nhân sự dùng cùng deployment AH và iframe/postMessage.
  try{
    const loadStaffUI2=function(force){
      try{
        if(typeof staffList!=='undefined'&&!staffList.length&&typeof loadLocalStaffFirst==='function'){
          loadLocalStaffFirst();
        }

        if(force&&typeof byId==='function'){
          byId('debug').textContent='Đang lấy danh sách nhân sự mới nhất từ Google Sheet...';
        }

        if(!navigator.onLine){
          if(typeof byId==='function')byId('debug').textContent='OFFLINE · dùng danh sách nhân sự đã lưu trên máy.';
          return;
        }

        if(typeof staffPrimaryLoaded!=='undefined')staffPrimaryLoaded=false;
        if(typeof staffRequestSeq!=='undefined')staffRequestSeq++;

        const f=typeof byId==='function'?byId('staffFrame'):el('staffFrame');
        if(f){
          f.src=DATA_BACKEND+'?api=staffframe&_='+Date.now();
        }

        if(typeof staffLoadTimer!=='undefined')clearTimeout(staffLoadTimer);
        const timer=setTimeout(function(){
          try{
            if(typeof renderStaff==='function')renderStaff();
            if(typeof updateStaffName==='function')updateStaffName();
            if(typeof byId==='function'){
              byId('reloadStaffBtn').style.display='none';
              byId('manualStaff').style.display='none';
              byId('staffSelect').style.display='block';
              if(typeof staffPrimaryLoaded!=='undefined'&&!staffPrimaryLoaded){
                byId('debug').textContent='Chưa nhận được danh sách mới · đang dùng cache/dự phòng.';
              }
            }
          }catch(e){}
        },12000);
        if(typeof staffLoadTimer!=='undefined')staffLoadTimer=timer;
      }catch(err){
        try{if(typeof byId==='function')byId('debug').textContent='Lỗi cập nhật nhân sự: '+String(err.message||err);}catch(e){}
      }
    };

    window.loadStaff=loadStaffUI2;
    try{loadStaff=loadStaffUI2;}catch(e){}
  }catch(e){}

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

  const sub=el('statusSub');
  if(sub&&window.MutationObserver){
    let busy=false;
    new MutationObserver(function(){
      if(busy)return;
      const t=String(sub.textContent||'');
      const main=el('statusMain');
      if(t.indexOf('Đưa tem QR rõ vào khung')>=0||t.indexOf('Để đồng hồ + QR rõ trong khung')>=0){
        busy=true;
        if(main)main.textContent='SẴN SÀNG CHỤP';
        sub.textContent='1. Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.';
        busy=false;
      }
    }).observe(sub,{childList:true,characterData:true,subtree:true});
  }

  renderCached();
  setTimeout(loadProgress,700);
  setInterval(loadProgress,30000);
  window.addEventListener('online',function(){setTimeout(loadProgress,500);});
  window.addEventListener('pageshow',function(){setTimeout(loadProgress,700);});
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible')setTimeout(loadProgress,500);
  });

  const sync=el('syncBtn');
  if(sync)sync.addEventListener('click',function(){
    setTimeout(loadProgress,2500);
    setTimeout(loadProgress,8000);
  });

  const shot=el('shotBtn');
  if(shot)shot.addEventListener('click',function(){
    setTimeout(loadProgress,3000);
    setTimeout(loadProgress,9000);
  });
})();
