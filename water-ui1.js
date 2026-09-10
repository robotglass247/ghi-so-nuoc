(function(){
  'use strict';

  const CACHE_KEY='water_progress_ui1';
  // Backend AH là backend trang hiện tại đang dùng để gửi/đồng bộ ảnh.
  const DATA_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  const FALLBACK_BACKEND='https://script.google.com/macros/s/AKfycbxNEVthu3eh0hdXEJat9ReqR3MrDJJDaWKXlsoE-NN6qe1-wqJvmVTYMwI5BITOLeQ/exec';

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
    if(p) p.title=String(text||'');
  }

  let progressSeq=0;
  function loadProgress(){
    if(!navigator.onLine){renderCached();return;}

    const seq=++progressSeq;
    const cb='waterProgressUI_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    let finished=false;
    let lastError='';
    const scripts=[];

    progressMessage('Đang tải tiến độ kỳ '+periodNow());

    const cleanup=()=>setTimeout(()=>{
      try{delete window[cb]}catch(e){}
      scripts.forEach(s=>{try{s.remove()}catch(e){}});
    },300);

    window[cb]=(data)=>{
      if(seq!==progressSeq||finished)return;
      if(data&&data.ok===false){
        lastError=String(data.error||'API progress trả lỗi');
        progressMessage(lastError);
        return;
      }
      if(renderProgress(data)){
        finished=true;
        progressMessage('Đã cập nhật tiến độ lúc '+new Date().toLocaleTimeString('vi-VN'));
        cleanup();
      }
    };

    const ask=(url,label)=>{
      if(!url)return;
      const s=document.createElement('script');
      scripts.push(s);
      s.async=true;
      s.src=url+'?api=progress&period='+encodeURIComponent(periodNow())+
        '&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      s.onerror=()=>{lastError='Không gọi được '+label;progressMessage(lastError);};
      document.head.appendChild(s);
    };

    ask(DATA_BACKEND,'backend chính');
    setTimeout(()=>{if(!finished)ask(FALLBACK_BACKEND,'backend dự phòng');},2500);
    setTimeout(()=>{
      if(seq!==progressSeq||finished)return;
      const cached=renderCached();
      if(!cached){
        progressMessage(lastError||'Chưa nhận được API tiến độ. Kiểm tra deployment Apps Script.');
      }
      cleanup();
    },20000);
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
        setTimeout(()=>{
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
    new MutationObserver(()=>{
      if(busy)return;
      const t=String(sub.textContent||'');
      const main=el('statusMain');
      if(t.indexOf('Đưa tem QR rõ vào khung')>=0 ||
         t.indexOf('Để đồng hồ + QR rõ trong khung')>=0){
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
  window.addEventListener('online',()=>setTimeout(loadProgress,500));
  window.addEventListener('pageshow',()=>setTimeout(loadProgress,700));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')setTimeout(loadProgress,500);
  });

  const sync=el('syncBtn');
  if(sync)sync.addEventListener('click',()=>{
    setTimeout(loadProgress,2500);
    setTimeout(loadProgress,8000);
  });

  const shot=el('shotBtn');
  if(shot)shot.addEventListener('click',()=>{
    setTimeout(loadProgress,3000);
    setTimeout(loadProgress,9000);
  });
})();
