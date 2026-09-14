(function(){
  'use strict';

  const BUILD='879-r12.1-live-ocr-v2-multitype';
  const TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const OCR_INTERVAL_MS=1450;
  const MIN_CONF_7=35;
  const MIN_CONF_5=50;
  const STABLE_7=2;
  const STABLE_5=3;

  let worker=null, workerPromise=null, scriptPromise=null, timer=null;
  let busy=false, currentMeter='', candidateKey='', candidateHits=0;
  let stableReading=null, captureReading=null, lastOcrAt=0, lastError='';

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

  function liveMeter(){
    try{return txt(liveQR&&liveQR.qr&&liveQR.qr.meter).toUpperCase().replace(/-N\d+$/i,'');}
    catch(e){return '';}
  }

  function qrReady(){
    try{return !!(liveQR&&Number(liveQR.hits)>=2&&Number(liveQR.at)>0&&(Date.now()-Number(liveQR.at))<1300);}
    catch(e){return false;}
  }

  function readingFromDigits(raw){
    const d=txt(raw).replace(/\D/g,'');
    if(d.length===7){
      const display=d.slice(0,4)+'.'+d.slice(4);
      return {raw:d,value:Number(display),display,format:'4_INT_3_DEC',digits:7};
    }
    if(d.length===5){
      return {raw:d,value:Number(d),display:d,format:'5_INT',digits:5};
    }
    return null;
  }

  function readingFromManual(value){
    const s=txt(value).replace(/\s+/g,'').replace(',','.');
    if(/^\d{5}$/.test(s)||/^\d{7}$/.test(s))return readingFromDigits(s);
    let m=s.match(/^(\d{1,4})\.(\d{1,3})$/);
    if(m)return readingFromDigits(m[1].padStart(4,'0')+m[2].padEnd(3,'0'));
    m=s.match(/^\d{1,5}$/);
    if(m)return readingFromDigits(s.padStart(5,'0'));
    return null;
  }

  function formatLabel(r){
    return r&&r.format==='5_INT'?'5 số nguyên':'4 số nguyên + 3 số lẻ';
  }

  function snapshot(sourceOverride){
    if(!stableReading)return null;
    return {
      raw:stableReading.raw,
      value:stableReading.value,
      display:stableReading.display,
      format:stableReading.format,
      confidence:Number(stableReading.confidence||0),
      source:sourceOverride||stableReading.source||'LIVE_OCR_R12.1',
      meter:currentMeter||liveMeter(),
      at:new Date().toISOString()
    };
  }

  function ensureStyle(){
    if(el('waterLiveOcrR121V2Style'))return;
    const s=document.createElement('style');
    s.id='waterLiveOcrR121V2Style';
    s.textContent=`
      #waterOcrRoiR121{position:absolute;left:16%;top:36%;width:68%;height:17%;border:2px solid rgba(255,214,74,.98);border-radius:10px;box-shadow:0 0 0 2px rgba(0,0,0,.22) inset;z-index:5;pointer-events:none;box-sizing:border-box}
      #waterOcrRoiR121::after{content:'ĐẶT DÃY SỐ VÀO KHUNG VÀNG';position:absolute;left:50%;bottom:-22px;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,.64);padding:3px 7px;border-radius:7px;font:800 10px/1.1 Arial,sans-serif;white-space:nowrap;text-shadow:0 1px 2px #000}
      #waterLiveOcrPanelR121{position:absolute;left:10px;right:10px;top:10px;z-index:8;background:rgba(9,20,31,.88);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:8px;box-shadow:0 3px 12px rgba(0,0,0,.28);font-family:Arial,sans-serif}
      #waterLiveOcrPanelR121 .r121ocrMain{min-width:0;flex:1;text-align:left}
      #waterLiveOcrPanelR121 .r121ocrLabel{font-size:10px;font-weight:800;opacity:.82;text-transform:uppercase}
      #waterLiveOcrValueR121{font-size:23px;font-weight:900;line-height:1.05;font-variant-numeric:tabular-nums;letter-spacing:.4px}
      #waterLiveOcrMetaR121{font-size:10.5px;margin-top:2px;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #waterLiveOcrEditR121{width:auto!important;flex:0 0 auto!important;margin:0!important;padding:8px 9px!important;border:1px solid rgba(255,255,255,.4)!important;border-radius:9px!important;background:#fff!important;color:#172b3d!important;font:800 12px/1 Arial,sans-serif!important}
      #waterLiveOcrPanelR121.ready{background:rgba(13,88,54,.92)}
      #waterLiveOcrPanelR121.warn{background:rgba(116,72,0,.92)}
      #waterLiveOcrPanelR121.error{background:rgba(119,35,35,.92)}
      #waterLiveOcrStatusR121{position:absolute;right:9px;bottom:9px;z-index:6;background:rgba(0,0,0,.58);color:#fff;border-radius:8px;padding:4px 7px;font:700 10px/1.2 Arial,sans-serif;pointer-events:none}
      @media(max-width:360px){#waterLiveOcrValueR121{font-size:20px}#waterOcrRoiR121{left:13%;width:74%}#waterOcrRoiR121::after{font-size:9px}}
    `;
    document.head.appendChild(s);
  }

  function ensureUI(){
    ensureStyle();
    const camera=document.querySelector('.camera');
    if(!camera)return false;
    if(!el('waterOcrRoiR121')){
      const roi=document.createElement('div');roi.id='waterOcrRoiR121';camera.appendChild(roi);
    }
    if(!el('waterLiveOcrPanelR121')){
      const panel=document.createElement('div');panel.id='waterLiveOcrPanelR121';
      panel.innerHTML='<div class="r121ocrMain"><div class="r121ocrLabel">CHỈ SỐ NHẬN TRỰC TIẾP</div><div id="waterLiveOcrValueR121">-----</div><div id="waterLiveOcrMetaR121">Chờ QR hợp lệ.</div></div><button id="waterLiveOcrEditR121" type="button">SỬA</button>';
      camera.appendChild(panel);
      el('waterLiveOcrEditR121').addEventListener('click',manualEdit);
    }
    if(!el('waterLiveOcrStatusR121')){
      const status=document.createElement('div');status.id='waterLiveOcrStatusR121';status.textContent='OCR R12.1';camera.appendChild(status);
    }
    return true;
  }

  function render(mode,message){
    ensureUI();
    const panel=el('waterLiveOcrPanelR121'), value=el('waterLiveOcrValueR121'), meta=el('waterLiveOcrMetaR121'), status=el('waterLiveOcrStatusR121');
    if(!panel||!value||!meta)return;
    panel.classList.remove('ready','warn','error');if(mode)panel.classList.add(mode);
    if(stableReading){
      value.textContent=stableReading.display+' m³';
      const conf=Math.round(Number(stableReading.confidence||0)*100);
      meta.textContent=(stableReading.source==='MANUAL_R12.1'?'Đã xác nhận thủ công':'Đã nhận ổn định')+' · '+formatLabel(stableReading)+(conf?(' · '+conf+'%'):'')+(currentMeter?(' · '+currentMeter):'');
    }else{
      const r=readingFromDigits(candidateKey.split(':')[1]||'');
      value.textContent=r?r.display+' m³':'-----';
      meta.textContent=message||'Đưa dãy số đồng hồ vào khung vàng.';
    }
    if(status){const age=lastOcrAt?Math.max(0,Math.round((Date.now()-lastOcrAt)/1000)):0;status.textContent=busy?'OCR đang đọc…':('OCR R12.1'+(lastOcrAt?' · '+age+'s':''));}
  }

  function resetForMeter(meter){
    currentMeter=txt(meter).toUpperCase();candidateKey='';candidateHits=0;stableReading=null;captureReading=null;lastError='';
    render('',currentMeter?'QR '+currentMeter+' OK · đang đọc chỉ số.':'Chờ QR hợp lệ.');
  }

  function manualEdit(){
    const candidate=readingFromDigits(candidateKey.split(':')[1]||'');
    const seed=stableReading?stableReading.display:(candidate?candidate.display:'');
    const input=window.prompt('Nhập chỉ số: 00649 (5 số nguyên) hoặc 0051.350 / 0051350 (4+3):',seed);
    if(input===null)return;
    const r=readingFromManual(input);
    if(!r){alert('Chỉ số chưa đúng. Ví dụ: 00649 hoặc 0051.350');return;}
    stableReading=Object.assign({},r,{confidence:1,source:'MANUAL_R12.1'});
    candidateKey=r.format+':'+r.raw;candidateHits=r.digits===5?STABLE_5:STABLE_7;render('ready');
  }

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(scriptPromise)return scriptPromise;
    scriptPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=TESSERACT_SRC;s.async=true;s.crossOrigin='anonymous';
      s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Không khởi tạo được OCR.'));
      s.onerror=()=>reject(new Error('Không tải được OCR. Kiểm tra Internet.'));
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  async function ensureWorker(){
    if(worker)return worker;if(workerPromise)return workerPromise;
    workerPromise=(async()=>{
      const T=await loadTesseract();
      const w=await T.createWorker('eng',1,{logger:function(m){if(m&&m.status==='recognizing text'){const n=el('waterLiveOcrStatusR121');if(n)n.textContent='OCR '+Math.round(Number(m.progress||0)*100)+'%';}}});
      await w.setParameters({tessedit_char_whitelist:'0123456789',tessedit_pageseg_mode:T.PSM&&T.PSM.SINGLE_LINE?T.PSM.SINGLE_LINE:'7',preserve_interword_spaces:'0'});
      worker=w;return w;
    })().catch(e=>{workerPromise=null;throw e;});
    return workerPromise;
  }

  function sourceRect(video,roi){
    const vr=video.getBoundingClientRect(),rr=roi.getBoundingClientRect(),vw=video.videoWidth,vh=video.videoHeight,cw=vr.width,ch=vr.height;
    if(!vw||!vh||!cw||!ch)return null;
    const scale=Math.max(cw/vw,ch/vh),drawnW=vw*scale,drawnH=vh*scale,cropX=(drawnW-cw)/2,cropY=(drawnH-ch)/2;
    return {x:clamp((rr.left-vr.left+cropX)/scale,0,vw-1),y:clamp((rr.top-vr.top+cropY)/scale,0,vh-1),w:clamp(rr.width/scale,1,vw),h:clamp(rr.height/scale,1,vh)};
  }

  function makeCanvas(){
    const video=el('video'),roi=el('waterOcrRoiR121');if(!video||!roi||!video.videoWidth||!video.videoHeight)return null;
    const r=sourceRect(video,roi);if(!r)return null;
    const c=document.createElement('canvas'),targetW=900,scale=targetW/r.w;c.width=targetW;c.height=Math.max(110,Math.round(r.h*scale));
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,r.x,r.y,r.w,r.h,0,0,c.width,c.height);
    try{
      const img=ctx.getImageData(0,0,c.width,c.height),px=img.data;let min=255,max=0,sum=0;
      for(let i=0;i<px.length;i+=4){const g=Math.round(px[i]*.299+px[i+1]*.587+px[i+2]*.114);if(g<min)min=g;if(g>max)max=g;sum+=g;}
      const mean=sum/(px.length/4),span=Math.max(50,max-min),threshold=clamp(mean-8,80,190);
      for(let i=0;i<px.length;i+=4){let g=Math.round(px[i]*.299+px[i+1]*.587+px[i+2]*.114);g=clamp(Math.round((g-min)*255/span),0,255);g=g<threshold?0:255;px[i]=px[i+1]=px[i+2]=g;}
      ctx.putImageData(img,0,0);
    }catch(e){}
    return c;
  }

  function consume(text,confidence){
    const digits=txt(text).replace(/\D/g,'');lastOcrAt=Date.now();
    const r=readingFromDigits(digits);
    if(!r){candidateKey='';candidateHits=0;if(!stableReading)render('warn','Chưa nhận đúng 5 hoặc 7 chữ số · tránh lóa và giữ máy thẳng.');return;}
    const key=r.format+':'+r.raw,conf=Number(confidence||0),needHits=r.digits===5?STABLE_5:STABLE_7,minConf=r.digits===5?MIN_CONF_5:MIN_CONF_7;
    if(key===candidateKey)candidateHits++;else{candidateKey=key;candidateHits=1;}
    if(candidateHits>=needHits&&conf>=minConf){stableReading=Object.assign({},r,{confidence:clamp(conf/100,0,1),source:'LIVE_OCR_R12.1'});render('ready');}
    else render('warn','Đang xác nhận '+candidateHits+'/'+needHits+' · '+formatLabel(r)+' · '+Math.round(conf)+'%');
  }

  async function runOnce(){
    if(busy)return;ensureUI();
    const meter=liveMeter();if(meter!==currentMeter)resetForMeter(meter);
    const video=el('video');
    if(!meter||!qrReady()||!video||!video.videoWidth||video.paused||document.visibilityState!=='visible'){if(!meter)render('','Chờ nhận QR đồng hồ.');schedule();return;}
    const canvas=makeCanvas();if(!canvas){schedule();return;}
    busy=true;render(stableReading?'ready':'warn',stableReading?'':'Đang đọc chỉ số…');
    try{const w=await ensureWorker(),res=await w.recognize(canvas),data=res&&res.data?res.data:{};consume(data.text||'',data.confidence||0);lastError='';}
    catch(e){lastError=String(e&&e.message||e);if(!stableReading)render('error','OCR chưa sẵn sàng · có thể dùng SỬA để nhập tay.');}
    finally{busy=false;schedule();}
  }

  function schedule(delay){clearTimeout(timer);timer=setTimeout(runOnce,delay==null?OCR_INTERVAL_MS:delay);}

  function ensureReadingBeforeCapture(){
    let snap=snapshot();if(snap)return snap;
    const r0=readingFromDigits(candidateKey.split(':')[1]||'');
    const input=window.prompt('OCR chưa ổn định. Nhập/kiểm tra chỉ số trước khi lưu ảnh:',r0?r0.display:'');
    if(input===null)return null;
    const r=readingFromManual(input);if(!r){alert('Chỉ số chưa đúng. Ví dụ: 00649 hoặc 0051.350');return null;}
    stableReading=Object.assign({},r,{confidence:1,source:'MANUAL_R12.1'});candidateKey=r.format+':'+r.raw;candidateHits=r.digits===5?STABLE_5:STABLE_7;render('ready');return snapshot('MANUAL_R12.1');
  }

  function installHooks(){
    if(window.WATER_R121_OCR_HOOKED_V2)return;
    if(typeof window.captureAndSave!=='function'||typeof window.dbPut!=='function'){setTimeout(installHooks,120);return;}
    const coreCapture=window.captureAndSave,coreDbPut=window.dbPut,coreTurbo=typeof window.turboBuildPayload==='function'?window.turboBuildPayload:null;
    const coreHidden=typeof window.postRecordByHiddenForm==='function'?window.postRecordByHiddenForm:null;

    window.captureAndSave=async function(){
      if(!qrReady())return coreCapture.apply(this,arguments);
      const snap=ensureReadingBeforeCapture();if(!snap){try{if(typeof toast==='function')toast('CHƯA LƯU · cần xác nhận chỉ số',1600);}catch(e){}return;}
      captureReading=snap;try{return await coreCapture.apply(this,arguments);}finally{setTimeout(()=>{captureReading=null;},0);}
    };

    window.dbPut=function(record){
      if(record&&record.image){const s=captureReading||snapshot();if(s){record.liveReading=s.value;record.liveReadingRaw=s.raw;record.liveReadingConfidence=s.confidence;record.liveReadingSource=s.source;record.liveReadingAt=s.at;record.liveReadingMeter=s.meter;record.liveReadingFormat=s.format;}}
      return coreDbPut.apply(this,arguments);
    };

    if(coreTurbo){
      window.turboBuildPayload=async function(records){
        const payload=await coreTurbo.call(this,records),map=new Map((records||[]).map(r=>[String(r&&r.clientId||''),r]));
        (payload||[]).forEach(p=>{const r=map.get(String(p&&p.clientId||''));if(!r)return;p.liveReading=r.liveReading==null?'':r.liveReading;p.liveReadingRaw=r.liveReadingRaw||'';p.liveReadingConfidence=r.liveReadingConfidence==null?'':r.liveReadingConfidence;p.liveReadingSource=r.liveReadingSource||'';p.liveReadingAt=r.liveReadingAt||'';p.liveReadingFormat=r.liveReadingFormat||'';});
        return payload;
      };
    }

    if(coreHidden){
      window.postRecordByHiddenForm=function(values){
        if(values&&captureReading){values.liveReading=captureReading.value;values.liveReadingRaw=captureReading.raw;values.liveReadingConfidence=captureReading.confidence;values.liveReadingSource=captureReading.source;values.liveReadingAt=captureReading.at;values.liveReadingFormat=captureReading.format;}
        return coreHidden.apply(this,arguments);
      };
    }

    window.WATER_R121_OCR_HOOKED_V2=true;
  }

  function boot(){ensureUI();installHooks();render('','Chờ nhận QR đồng hồ.');schedule(700);}
  window.addEventListener('online',()=>{if(lastError)schedule(200);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(200);});
  window.addEventListener('beforeunload',()=>{try{if(worker)worker.terminate();}catch(e){}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.WATER_LIVE_OCR_BUILD=BUILD;
})();
