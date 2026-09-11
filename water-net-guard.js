(function(){
  'use strict';

  const PROBE_URL='./net-check.txt';
  const PROBE_TIMEOUT=3000;
  const VERIFY_TTL=8000;

  let realOnline=null;
  let lastVerifiedAt=0;
  let probePromise=null;
  let gateTimer=null;

  const baseSchedule=window.scheduleAutoSync;
  const baseSync=window.syncQueue;

  function el(id){return document.getElementById(id);}

  function renderNet(){
    const n=el('net');
    if(n)n.textContent=realOnline===true?'● ONLINE':'● OFFLINE';
  }

  function setRealOnline(ok){
    realOnline=ok===true;
    window.WATER_REAL_ONLINE=realOnline;
    window.WATER_OPENED_OFFLINE=!realOnline;
    renderNet();
    return realOnline;
  }

  async function probe(force){
    if(!navigator.onLine)return setRealOnline(false);

    if(!force && realOnline===true && (Date.now()-lastVerifiedAt)<VERIFY_TTL){
      return true;
    }
    if(probePromise)return probePromise;

    probePromise=(async()=>{
      const ctl=new AbortController();
      const timer=setTimeout(()=>ctl.abort(),PROBE_TIMEOUT);
      try{
        const r=await fetch(PROBE_URL+'?t='+Date.now(),{
          cache:'no-store',
          signal:ctl.signal
        });
        const ok=!!(r&&r.ok);
        if(ok)lastVerifiedAt=Date.now();
        return setRealOnline(ok);
      }catch(e){
        return setRealOnline(false);
      }finally{
        clearTimeout(timer);
        probePromise=null;
      }
    })();

    return probePromise;
  }

  function showOfflineQueue(){
    const s=el('syncStatus');
    if(s)s.textContent='OFFLINE · ảnh được lưu an toàn trong Chờ.';
  }

  function guardedSchedule(delayMs){
    clearTimeout(gateTimer);
    gateTimer=setTimeout(async()=>{
      const ok=await probe(false);
      if(!ok){
        showOfflineQueue();
        return;
      }
      if(typeof baseSchedule==='function')baseSchedule(0);
    },Math.max(0,Number(delayMs)||0));
  }

  async function guardedSync(options){
    const ok=await probe(true);
    if(!ok){
      showOfflineQueue();
      try{if(typeof updatePending==='function')await updatePending();}catch(e){}
      return;
    }
    if(typeof baseSync==='function')return baseSync(options||{});
  }

  function guardedUpdateNet(){
    if(!navigator.onLine)setRealOnline(false);
    else renderNet();
  }

  window.scheduleAutoSync=guardedSchedule;
  window.syncQueue=guardedSync;
  window.updateNet=guardedUpdateNet;
  window.waterProbeInternet=probe;
  window.WATER_REAL_ONLINE=null;
  window.WATER_OPENED_OFFLINE=!navigator.onLine;

  try{scheduleAutoSync=guardedSchedule;}catch(e){}
  try{syncQueue=guardedSync;}catch(e){}
  try{updateNet=guardedUpdateNet;}catch(e){}

  // Không bao giờ hiển thị ONLINE trước khi kiểm tra Internet thật thành công.
  renderNet();

  /* ================================================================
   * NHÁNH CHỤP THAY THẾ AN TOÀN BỘ NHỚ
   *
   * Ảnh mới vẫn dùng cơ chế V8.7.8 hiện tại.
   * Riêng khi đồng hồ đã có ảnh, tạo Blob qua workCanvas TRƯỚC khi mở
   * hộp xác nhận. Sau đó giải phóng canvas lớn ngay, tránh giữ đồng thời
   * video + canvas QR + ảnh chụp trong RAM trong lúc người dùng lựa chọn.
   * ================================================================ */
  function canvasToBlobSafe(source){
    const save=el('workCanvas');
    if(!save)throw new Error('Thiếu vùng xử lý ảnh.');

    const w=Math.max(1,Number(source&&source.width)||1);
    const h=Math.max(1,Number(source&&source.height)||1);
    save.width=w;
    save.height=h;
    const ctx=save.getContext('2d');
    ctx.drawImage(source,0,0,w,h);

    return new Promise((resolve,reject)=>{
      save.toBlob(blob=>{
        try{save.width=1;save.height=1;}catch(e){}
        if(blob)resolve(blob);
        else reject(new Error('Không tạo được ảnh thay thế.'));
      },'image/jpeg',0.84);
    });
  }

  async function captureAndSaveSafe(){
    if(typeof shotRunning!=='undefined'&&shotRunning)return;

    const staff=typeof getStaffCode==='function'?getStaffCode():'';
    if(!staff){
      if(typeof openStaff==='function')openStaff();
      return;
    }

    const v=el('video');
    if(!v||!v.videoWidth||!v.videoHeight){
      alert('Camera chưa sẵn sàng.');
      return;
    }

    if(typeof liveQR==='undefined'||!liveQR||liveQR.hits<2||Date.now()-liveQR.at>=950){
      if(typeof toast==='function')toast('ĐỢI QR OK RỒI BẤM CHỤP',1400);
      return;
    }

    shotRunning=true;
    const captureStarted=performance.now();
    let choiceWaitMs=0;
    let full=null;
    let blob=null;
    const shotBtn=el('shotBtn');
    if(shotBtn)shotBtn.disabled=true;

    // Không cho một lượt tự đồng bộ mới khởi động đúng lúc đang xử lý ảnh.
    try{clearTimeout(autoSyncTimer);}catch(e){}

    try{
      setStatus('ĐANG CHỤP...','Đang xác nhận QR trên đúng ảnh vừa chụp.');

      const shot=await captureQRFastAndAccurate();
      full=shot.full;
      const qr=shot.qr;
      if(!qr){
        throw new Error('Chưa nhận được QR hợp lệ. Giữ máy yên, tránh lóa và đưa QR rõ hơn trong khung.');
      }

      const capturedAt=new Date().toISOString();
      const previous=readCaptureReceipt(qr.meter,capturedAt);
      let replaceClientId='';

      if(previous){
        // Tạo Blob trước khi mở modal rồi bỏ backing-store canvas lớn.
        setStatus('ĐÃ NHẬN '+qr.label,'Đang chuẩn bị ảnh thay thế...');
        blob=await canvasToBlobSafe(full);
        try{full.width=1;full.height=1;}catch(e){}

        const choiceStarted=performance.now();
        const replace=await askDuplicate(qr.meter,capturedAt);
        choiceWaitMs+=performance.now()-choiceStarted;

        if(!replace){
          blob=null;
          setStatus('ĐÃ GIỮ ẢNH CŨ','Tiếp tục với đồng hồ tiếp theo.');
          resetLiveQR();
          scheduleLiveScan(120);
          return;
        }

        replaceClientId=String(previous.clientId||'').trim();
        if(!replaceClientId){
          throw new Error('Thiếu mã ảnh cũ. Ảnh thay thế chưa được lưu.');
        }
      }else{
        // Ảnh mới giữ nguyên đường lưu nhanh hiện tại.
        setStatus('ĐÃ NHẬN '+qr.label,'Đang lưu ảnh đồng hồ...');
        blob=await new Promise((resolve,reject)=>{
          full.toBlob(b=>b?resolve(b):reject(new Error('Không tạo được ảnh.')),'image/jpeg',0.84);
        });
        try{full.width=1;full.height=1;}catch(e){}
      }

      const clientId=qr.meter+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const record={
        clientId,
        meter:normalizeMeterCode(qr.meter),
        token:qr.token,
        label:qr.label,
        staff,
        capturedAt,
        replaceClientId,
        sentAt:0,
        image:blob
      };

      await dbPut(record);
      const ev=el('captureEvidence');
      if(ev){
        ev.textContent='V8.7.8 · '+(replaceClientId?'CHỤP THAY THẾ':'ẢNH MỚI')+' · '+record.meter+' · Mã gửi: '+record.clientId+(replaceClientId?' · Thay ảnh: '+replaceClientId:'');
      }
      rememberCapture(record);
      await updatePending();

      const savedSeconds=(Math.max(0,performance.now()-captureStarted-choiceWaitMs)/1000).toFixed(1);
      toast('✓ '+qr.label+' - ĐÃ LƯU '+savedSeconds+' GIÂY',1800);
      setStatus('SẴN SÀNG ĐỒNG HỒ TIẾP THEO','Đưa đồng hồ + QR tiếp theo vào khung. Khi hiện QR OK thì bấm CHỤP.');

      lastCaptureAt=Date.now();
      resetLiveQR();
      scheduleLiveScan(120);

      if(window.WATER_REAL_ONLINE===true){
        const d=el('debug');
        if(d)d.textContent='ĐÃ LƯU · tự đồng bộ nền, tiếp tục chụp đồng hồ tiếp theo.';
        guardedSchedule(250);
      }else{
        const d=el('debug');
        if(d)d.textContent='OFFLINE · đã lưu an toàn trong Chờ.';
        showOfflineQueue();
      }
    }catch(err){
      setStatus('CHƯA LƯU',''+(err&&err.message?err.message:err));
      alert(err&&err.message?err.message:err);
      try{resetLiveQR();}catch(e){}
      try{scheduleLiveScan(120);}catch(e){}
    }finally{
      try{if(full&&full.width>1){full.width=1;full.height=1;}}catch(e){}
      blob=null;
      shotRunning=false;
      if(shotBtn)shotBtn.disabled=false;
    }
  }

  if(typeof window.captureAndSave==='function'){
    window.captureAndSave=captureAndSaveSafe;
    try{captureAndSave=captureAndSaveSafe;}catch(e){}
  }

  window.addEventListener('offline',()=>{
    clearTimeout(gateTimer);
    setRealOnline(false);
    showOfflineQueue();
  });

  window.addEventListener('online',()=>{
    probe(true).then(ok=>{
      if(ok)guardedSchedule(300);
    });
  });

  probe(true).then(ok=>{
    if(ok)guardedSchedule(500);
    else showOfflineQueue();
  });
})();
