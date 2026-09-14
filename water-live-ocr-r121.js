(function(){
  'use strict';

  const BUILD='879-r12.1-live-ocr-v1';
  const TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const OCR_INTERVAL_MS=1500;
  const REQUIRED_DIGITS=7;
  const MIN_CONFIDENCE=35;
  const STABLE_HITS=2;

  let worker=null;
  let workerPromise=null;
  let scriptPromise=null;
  let timer=null;
  let busy=false;
  let currentMeter='';
  let candidateRaw='';
  let candidateHits=0;
  let stableReading=null;
  let captureReading=null;
  let lastOcrAt=0;
  let lastError='';

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

  function liveMeter(){
    try{
      return txt(liveQR&&liveQR.qr&&liveQR.qr.meter).toUpperCase().replace(/-N\d+$/i,'');
    }catch(e){return '';}
  }

  function qrReady(){
    try{
      return !!(liveQR&&Number(liveQR.hits)>=2&&Number(liveQR.at)>0&&(Date.now()-Number(liveQR.at))<1200);
    }catch(e){return false;}
  }

  function readingFromDigits(digits){
    const d=txt(digits).replace(/\D/g,'');
    if(d.length!==REQUIRED_DIGITS)return null;
    return {
      raw:d,
      value:Number(d.slice(0,4)+'.'+d.slice(4)),
      display:d.slice(0,4)+'.'+d.slice(4)
    };
  }

  function readingFromManual(value){
    let s=txt(value).replace(/\s+/g,'').replace(',','.');
    if(!s)return null;

    if(/^\d{7}$/.test(s))return readingFromDigits(s);

    const m=s.match(/^(\d{1,4})\.(\d{1,3})$/);
    if(!m)return null;
    const intPart=m[1].padStart(4,'0');
    const decPart=m[2].padEnd(3,'0');
    return readingFromDigits(intPart+decPart);
  }

  function readingSnapshot(sourceOverride){
    if(!stableReading)return null;
    return {
      raw:stableReading.raw,
      value:stableReading.value,
      display:stableReading.display,
      confidence:Number(stableReading.confidence||0),
      source:sourceOverride||stableReading.source||'LIVE_OCR_R12.1',
      meter:currentMeter||liveMeter(),
      at:new Date().toISOString()
    };
  }

  function ensureStyle(){
    if(el('waterLiveOcrR121Style'))return;
    const s=document.createElement('style');
    s.id='waterLiveOcrR121Style';
    s.textContent=`
      #waterOcrRoiR121{
        position:absolute;left:18%;top:35%;width:64%;height:18%;
        border:2px solid rgba(255,214,74,.95);border-radius:10px;
        box-shadow:0 0 0 2px rgba(0,0,0,.25) inset;
        z-index:5;pointer-events:none;box-sizing:border-box;
      }
      #waterOcrRoiR121::after{
        content:'ĐẶT DÃY SỐ ĐỒNG HỒ VÀO KHUNG NÀY';
        position:absolute;left:50%;bottom:-22px;transform:translateX(-50%);
        color:#fff;background:rgba(0,0,0,.62);padding:3px 7px;border-radius:7px;
        font:800 10px/1.1 Arial,sans-serif;white-space:nowrap;text-shadow:0 1px 2px #000;
      }
      #waterLiveOcrPanelR121{
        position:absolute;left:10px;right:10px;top:10px;z-index:8;
        background:rgba(9,20,31,.86);color:#fff;border:1px solid rgba(255,255,255,.35);
        border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:8px;
        box-shadow:0 3px 12px rgba(0,0,0,.28);font-family:Arial,sans-serif;
      }
      #waterLiveOcrPanelR121 .r121ocrMain{min-width:0;flex:1;text-align:left}
      #waterLiveOcrPanelR121 .r121ocrLabel{font-size:10px;font-weight:800;opacity:.8;text-transform:uppercase}
      #waterLiveOcrValueR121{font-size:23px;font-weight:900;line-height:1.05;font-variant-numeric:tabular-nums;letter-spacing:.4px}
      #waterLiveOcrMetaR121{font-size:10.5px;margin-top:2px;opacity:.86;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #waterLiveOcrEditR121{width:auto!important;flex:0 0 auto!important;margin:0!important;padding:8px 9px!important;border:1px solid rgba(255,255,255,.4)!important;border-radius:9px!important;background:#fff!important;color:#172b3d!important;font:800 12px/1 Arial,sans-serif!important}
      #waterLiveOcrPanelR121.ready{background:rgba(13,88,54,.90)}
      #waterLiveOcrPanelR121.warn{background:rgba(116,72,0,.90)}
      #waterLiveOcrPanelR121.error{background:rgba(119,35,35,.90)}
      #waterLiveOcrStatusR121{position:absolute;right:9px;bottom:9px;z-index:6;background:rgba(0,0,0,.58);color:#fff;border-radius:8px;padding:4px 7px;font:700 10px/1.2 Arial,sans-serif;pointer-events:none}
      @media(max-width:360px){
        #waterLiveOcrValueR121{font-size:20px}
        #waterOcrRoiR121{left:15%;width:70%}
        #waterOcrRoiR121::after{font-size:9px}
      }
    `;
    document.head.appendChild(s);
  }

  function ensureUI(){
    ensureStyle();
    const camera=document.querySelector('.camera');
    if(!camera)return false;

    if(!el('waterOcrRoiR121')){
      const roi=document.createElement('div');
      roi.id='waterOcrRoiR121';
      camera.appendChild(roi);
    }

    if(!el('waterLiveOcrPanelR121')){
      const panel=document.createElement('div');
      panel.id='waterLiveOcrPanelR121';
      panel.innerHTML=`
        <div class="r121ocrMain">
          <div class="r121ocrLabel">CHỈ SỐ NHẬN TRỰC TIẾP</div>
          <div id="waterLiveOcrValueR121">----.---</div>
          <div id="waterLiveOcrMetaR121">Đưa dãy số đồng hồ vào khung vàng.</div>
        </div>
        <button id="waterLiveOcrEditR121" type="button">SỬA</button>`;
      camera.appendChild(panel);
      el('waterLiveOcrEditR121').addEventListener('click',manualEdit);
    }

    if(!el('waterLiveOcrStatusR121')){
      const status=document.createElement('div');
      status.id='waterLiveOcrStatusR121';
      status.textContent='OCR R12.1';
      camera.appendChild(status);
    }

    return true;
  }

  function render(mode,message){
    ensureUI();
    const panel=el('waterLiveOcrPanelR121');
    const value=el('waterLiveOcrValueR121');
    const meta=el('waterLiveOcrMetaR121');
    const status=el('waterLiveOcrStatusR121');
    if(!panel||!value||!meta)return;

    panel.classList.remove('ready','warn','error');
    if(mode)panel.classList.add(mode);

    if(stableReading){
      value.textContent=stableReading.display+' m³';
      const conf=Math.round(Number(stableReading.confidence||0)*100);
      meta.textContent=(stableReading.source==='MANUAL_R12.1'?'Đã nhập/xác nhận thủ công':'Đã nhận ổn định')+
        (conf?(' · tin cậy '+conf+'%'):'')+
        (currentMeter?(' · '+currentMeter):'');
    }else if(candidateRaw){
      const r=readingFromDigits(candidateRaw);
      value.textContent=r?r.display+' m³':'----.---';
      meta.textContent=message||('Đang xác nhận lần '+candidateHits+'/'+STABLE_HITS+(currentMeter?' · '+currentMeter:''));
    }else{
      value.textContent='----.---';
      meta.textContent=message||'Đưa dãy số đồng hồ vào khung vàng.';
    }

    if(status){
      const age=lastOcrAt?Math.max(0,Math.round((Date.now()-lastOcrAt)/1000)):0;
      status.textContent=busy?'OCR đang đọc…':('OCR R12.1'+(lastOcrAt?' · '+age+'s':''));
    }
  }

  function resetForMeter(meter){
    currentMeter=txt(meter).toUpperCase();
    candidateRaw='';
    candidateHits=0;
    stableReading=null;
    captureReading=null;
    lastError='';
    render('',currentMeter?'Đã nhận QR '+currentMeter+' · đang đọc chỉ số.':'Chờ QR hợp lệ.');
  }

  function manualEdit(){
    const seed=stableReading?stableReading.display:(readingFromDigits(candidateRaw)||{}).display||'';
    const input=window.prompt(
      'Nhập chỉ số đồng hồ theo dạng 1234.567 hoặc 7 chữ số 1234567:',
      seed
    );
    if(input===null)return;
    const r=readingFromManual(input);
    if(!r){
      alert('Chỉ số chưa đúng định dạng. Ví dụ: 1234.567');
      return;
    }
    stableReading={raw:r.raw,value:r.value,display:r.display,confidence:1,source:'MANUAL_R12.1'};
    candidateRaw=r.raw;
    candidateHits=STABLE_HITS;
    render('ready');
  }

  function loadTesseractScript(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(scriptPromise)return scriptPromise;
    scriptPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=TESSERACT_SRC;
      s.async=true;
      s.crossOrigin='anonymous';
      s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Không khởi tạo được Tesseract.'));
      s.onerror=()=>reject(new Error('Không tải được thư viện OCR. Kiểm tra Internet.'));
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  async function ensureWorker(){
    if(worker)return worker;
    if(workerPromise)return workerPromise;
    workerPromise=(async()=>{
      const T=await loadTesseractScript();
      const w=await T.createWorker('eng',1,{logger:function(m){
        if(m&&m.status==='recognizing text'){
          const p=Math.round(Number(m.progress||0)*100);
          const status=el('waterLiveOcrStatusR121');
          if(status)status.textContent='OCR '+p+'%';
        }
      }});
      await w.setParameters({
        tessedit_char_whitelist:'0123456789',
        tessedit_pageseg_mode:T.PSM&&T.PSM.SINGLE_LINE?T.PSM.SINGLE_LINE:'7',
        preserve_interword_spaces:'0'
      });
      worker=w;
      return worker;
    })().catch(err=>{
      workerPromise=null;
      throw err;
    });
    return workerPromise;
  }

  function sourceRectForRoi(video,roi){
    const vr=video.getBoundingClientRect();
    const rr=roi.getBoundingClientRect();
    const vw=video.videoWidth, vh=video.videoHeight;
    const cw=vr.width, ch=vr.height;
    if(!vw||!vh||!cw||!ch)return null;

    const scale=Math.max(cw/vw,ch/vh);
    const drawnW=vw*scale, drawnH=vh*scale;
    const cropX=(drawnW-cw)/2;
    const cropY=(drawnH-ch)/2;

    const x=(rr.left-vr.left+cropX)/scale;
    const y=(rr.top-vr.top+cropY)/scale;
    const w=rr.width/scale;
    const h=rr.height/scale;

    return {
      x:clamp(x,0,vw-1),
      y:clamp(y,0,vh-1),
      w:clamp(w,1,vw),
      h:clamp(h,1,vh)
    };
  }

  function makeOcrCanvas(){
    const video=el('video');
    const roi=el('waterOcrRoiR121');
    if(!video||!roi||!video.videoWidth||!video.videoHeight)return null;

    const r=sourceRectForRoi(video,roi);
    if(!r)return null;

    const canvas=document.createElement('canvas');
    const targetW=900;
    const scale=targetW/r.w;
    canvas.width=targetW;
    canvas.height=Math.max(120,Math.round(r.h*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(video,r.x,r.y,r.w,r.h,0,0,canvas.width,canvas.height);

    try{
      const img=ctx.getImageData(0,0,canvas.width,canvas.height);
      let min=255,max=0,sum=0;
      const px=img.data;
      for(let i=0;i<px.length;i+=4){
        const g=Math.round(px[i]*0.299+px[i+1]*0.587+px[i+2]*0.114);
        if(g<min)min=g;if(g>max)max=g;sum+=g;
      }
      const mean=sum/(px.length/4);
      const span=Math.max(50,max-min);
      const threshold=clamp(mean-8,80,190);
      for(let i=0;i<px.length;i+=4){
        let g=Math.round(px[i]*0.299+px[i+1]*0.587+px[i+2]*0.114);
        g=clamp(Math.round((g-min)*255/span),0,255);
        g=g<threshold?0:255;
        px[i]=px[i+1]=px[i+2]=g;
      }
      ctx.putImageData(img,0,0);
    }catch(e){}

    return canvas;
  }

  function consumeOcr(text,confidence){
    const digits=txt(text).replace(/\D/g,'');
    lastOcrAt=Date.now();

    if(digits.length!==REQUIRED_DIGITS){
      candidateRaw='';
      candidateHits=0;
      if(!stableReading)render('warn','Chưa thấy đủ 7 chữ số · giữ máy thẳng và tránh lóa.');
      return;
    }

    const conf=Number(confidence||0);
    if(digits===candidateRaw)candidateHits++;
    else{candidateRaw=digits;candidateHits=1;}

    const r=readingFromDigits(digits);
    if(!r)return;

    if(candidateHits>=STABLE_HITS && conf>=MIN_CONFIDENCE){
      stableReading={
        raw:r.raw,
        value:r.value,
        display:r.display,
        confidence:clamp(conf/100,0,1),
        source:'LIVE_OCR_R12.1'
      };
      render('ready');
    }else{
      render('warn','Đang xác nhận '+candidateHits+'/'+STABLE_HITS+' · tin cậy '+Math.round(conf)+'%');
    }
  }

  async function runOcrOnce(){
    if(busy)return;
    ensureUI();

    const meter=liveMeter();
    if(meter!==currentMeter)resetForMeter(meter);

    const video=el('video');
    if(!meter||!qrReady()||!video||!video.videoWidth||video.paused||document.visibilityState!=='visible'){
      if(!meter)render('', 'Chờ nhận QR đồng hồ.');
      schedule();
      return;
    }

    const canvas=makeOcrCanvas();
    if(!canvas){schedule();return;}

    busy=true;
    render(stableReading?'ready':'warn',stableReading?'':'Đang đọc chỉ số…');
    try{
      const w=await ensureWorker();
      const result=await w.recognize(canvas);
      const data=result&&result.data?result.data:{};
      consumeOcr(data.text||'',data.confidence||0);
      lastError='';
    }catch(err){
      lastError=String(err&&err.message||err);
      if(!stableReading)render('error','OCR chưa sẵn sàng: '+lastError);
    }finally{
      busy=false;
      schedule();
    }
  }

  function schedule(delay){
    clearTimeout(timer);
    timer=setTimeout(runOcrOnce,delay==null?OCR_INTERVAL_MS:delay);
  }

  function ensureReadingBeforeCapture(){
    let snap=readingSnapshot();
    if(snap)return snap;

    const seed=(readingFromDigits(candidateRaw)||{}).display||'';
    const input=window.prompt(
      'OCR chưa xác nhận ổn định. Nhập/kiểm tra chỉ số trước khi lưu ảnh:',
      seed
    );
    if(input===null)return null;
    const manual=readingFromManual(input);
    if(!manual){
      alert('Chỉ số chưa đúng định dạng. Ví dụ: 1234.567');
      return null;
    }
    stableReading={raw:manual.raw,value:manual.value,display:manual.display,confidence:1,source:'MANUAL_R12.1'};
    candidateRaw=manual.raw;
    candidateHits=STABLE_HITS;
    render('ready');
    return readingSnapshot('MANUAL_R12.1');
  }

  function installCaptureHooks(){
    if(window.WATER_R121_OCR_HOOKED)return;
    if(typeof window.captureAndSave!=='function'||typeof window.dbPut!=='function'){
      setTimeout(installCaptureHooks,100);
      return;
    }

    const coreCapture=window.captureAndSave;
    const coreDbPut=window.dbPut;
    const coreTurboBuild=typeof window.turboBuildPayload==='function'?window.turboBuildPayload:null;
    const corePostNoWait=typeof window.postRecordNoWait==='function'?window.postRecordNoWait:null;

    window.captureAndSave=async function(){
      if(!qrReady())return coreCapture.apply(this,arguments);
      const snap=ensureReadingBeforeCapture();
      if(!snap){
        try{if(typeof toast==='function')toast('CHƯA LƯU · cần xác nhận chỉ số',1600);}catch(e){}
        return;
      }
      captureReading=snap;
      try{
        return await coreCapture.apply(this,arguments);
      }finally{
        setTimeout(function(){captureReading=null;},0);
      }
    };

    window.dbPut=function(record){
      if(record&&record.image){
        const snap=captureReading||readingSnapshot();
        if(snap){
          record.liveReading=snap.value;
          record.liveReadingRaw=snap.raw;
          record.liveReadingConfidence=snap.confidence;
          record.liveReadingSource=snap.source;
          record.liveReadingAt=snap.at;
          record.liveReadingMeter=snap.meter;
        }
      }
      return coreDbPut.apply(this,arguments);
    };

    if(coreTurboBuild){
      window.turboBuildPayload=async function(records){
        const payload=await coreTurboBuild.call(this,records);
        const map=new Map((records||[]).map(r=>[String(r&&r.clientId||''),r]));
        (payload||[]).forEach(function(p){
          const r=map.get(String(p&&p.clientId||''));
          if(!r)return;
          p.liveReading=r.liveReading==null?'':r.liveReading;
          p.liveReadingRaw=r.liveReadingRaw||'';
          p.liveReadingConfidence=r.liveReadingConfidence==null?'':r.liveReadingConfidence;
          p.liveReadingSource=r.liveReadingSource||'';
          p.liveReadingAt=r.liveReadingAt||'';
        });
        return payload;
      };
    }

    if(corePostNoWait && typeof window.postRecordByHiddenForm==='function'){
      window.postRecordNoWait=function(item,imageData){
        const values={
          clientId:item.clientId,
          meter:typeof normalizeMeterCode==='function'?normalizeMeterCode(item.meter):item.meter,
          token:item.token,
          staff:item.staff,
          capturedAt:item.capturedAt,
          replaceClientId:item.replaceClientId||'',
          liveReading:item.liveReading==null?'':item.liveReading,
          liveReadingRaw:item.liveReadingRaw||'',
          liveReadingConfidence:item.liveReadingConfidence==null?'':item.liveReadingConfidence,
          liveReadingSource:item.liveReadingSource||'',
          liveReadingAt:item.liveReadingAt||'',
          image:imageData
        };
        return window.postRecordByHiddenForm(values);
      };
    }

    window.WATER_R121_OCR_HOOKED=true;
  }

  function boot(){
    ensureUI();
    installCaptureHooks();
    render('', 'Chờ nhận QR đồng hồ.');
    schedule(700);
  }

  window.addEventListener('online',function(){if(lastError)schedule(200);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule(200);});
  window.addEventListener('beforeunload',function(){try{if(worker)worker.terminate();}catch(e){}});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.WATER_LIVE_OCR_BUILD=BUILD;
})();
