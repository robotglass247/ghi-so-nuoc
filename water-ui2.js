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
  let expectedRequestId='';

  function removeProgressFrame(){
    if(progressFrame){
      try{progressFrame.remove()}catch(e){}
      progressFrame=null;
    }
  }

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||d.type!=='WATER_PROGRESS'||!d.requestId||d.requestId!==expectedRequestId)return;
    const result=d.result||{};
    if(result.ok===true){
      renderProgress(result);
      progressMessage('Đã cập nhật tiến độ lúc '+new Date().toLocaleTimeString('vi-VN'));
    }else{
      progressMessage('API tiến độ: '+String(result.error||'không rõ lỗi'));
    }
    expectedRequestId='';
    removeProgressFrame();
  });

  function loadProgress(){
    if(!navigator.onLine){renderCached();return;}

    const seq=++progressSeq;
    removeProgressFrame();
    const requestId='p'+Date.now()+'_'+Math.random().toString(36).slice(2);
    expectedRequestId=requestId;
    progressMessage('Đang tải tiến độ kỳ '+periodNow());

    const f=document.createElement('iframe');
    f.style.display='none';
    f.setAttribute('aria-hidden','true');
    f.src=DATA_BACKEND+'?api=progressframe&period='+encodeURIComponent(periodNow())+
      '&requestId='+encodeURIComponent(requestId)+'&_='+Date.now();
    progressFrame=f;
    document.body.appendChild(f);

    setTimeout(function(){
      if(seq!==progressSeq||expectedRequestId!==requestId)return;
      expectedRequestId='';
      removeProgressFrame();
      if(!renderCached())progressMessage('Chưa nhận được tiến độ từ Apps Script.');
    },15000);
  }

  window.loadWaterProgress=loadProgress;

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
        setTimeout(()=>oldSetStatus('SẴN SÀNG CHỤP','4. Đưa đồng hồ tiếp theo + QR vào khung.'),1200);
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

  renderCached();
  setTimeout(loadProgress,800);
  setInterval(loadProgress,30000);
  window.addEventListener('online',()=>setTimeout(loadProgress,600));
  window.addEventListener('pageshow',()=>setTimeout(loadProgress,800));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')setTimeout(loadProgress,600);
  });

  const sync=el('syncBtn');
  if(sync)sync.addEventListener('click',()=>{setTimeout(loadProgress,2500);setTimeout(loadProgress,7000);});
  const shot=el('shotBtn');
  if(shot)shot.addEventListener('click',()=>{setTimeout(loadProgress,2500);setTimeout(loadProgress,7000);});
})();
