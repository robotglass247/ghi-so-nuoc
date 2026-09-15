(function(){
  'use strict';

  const BUILD='879-r12.1-precheck-reading-v1';
  const TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const ANGLES=[-60,60,-45,45,0,-30,30];
  const SCAN_RETRY_MS=650;

  let worker=null,workerPromise=null,scriptPromise=null;
  let busy=false,timer=null,currentMeter='';
  let verified=null,manualReading=null;
  let coreDbPut=null;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function meterKey(v){return txt(v).toUpperCase().replace(/-N\d+$/i,'').replace(/\s+/g,'');}

  function qrState(){
    try{
      if(typeof liveQR==='undefined'||!liveQR||!liveQR.qr)return null;
      if(Number(liveQR.hits)<2||Date.now()-Number(liveQR.at)>=1300)return null;
      return {meter:meterKey(liveQR.qr.meter),label:txt(liveQR.qr.label||liveQR.qr.meter)};
    }catch(e){return null;}
  }

  function readingFromDigits(raw){
    const d=txt(raw).replace(/\D/g,'');
    if(d.length===5)return {raw:d,value:Number(d),display:d,format:'5_INT'};
    if(d.length===7){const display=d.slice(0,4)+'.'+d.slice(4);return {raw:d,value:Number(display),display,format:'4_INT_3_DEC'};}
    return null;
  }

  function readingFromManual(raw){
    const s=txt(raw).replace(',','.').replace(/\s+/g,'');
    if(/^\d{5}$/.test(s)||/^\d{7}$/.test(s))return readingFromDigits(s);
    let m=s.match(/^(\d{1,4})\.(\d{1,3})$/);
    if(m)return readingFromDigits(m[1].padStart(4,'0')+m[2].padEnd(3,'0'));
    if(/^\d{1,5}$/.test(s))return readingFromDigits(s.padStart(5,'0'));
    return null;
  }

  function ensureUI(){
    if(!el('waterPrecheckStyleR121')){
      const s=document.createElement('style');
      s.id='waterPrecheckStyleR121';
      s.textContent=`
        #waterPrecheckR121{display:none;margin:8px 0 0;border:1px solid #b9c9d6;border-radius:12px;background:#f6fbff;padding:9px 10px;color:#183246;font-family:Arial,sans-serif}
        #waterPrecheckR121.reading{background:#fff8e8;border-color:#e5cb8f}
        #waterPrecheckR121.ok{background:#eefbf3;border-color:#a9d9bc}
        #waterPrecheckR121.warn{background:#fff0f0;border-color:#e0adad}
        #waterPrecheckR121 .r121title{font-size:11px;font-weight:800;color:#51606b;text-transform:uppercase}
        #waterPrecheckValueR121{font-size:31px;line-height:1.08;font-weight:900;color:#075f8b;letter-spacing:1px;font-variant-numeric:tabular-nums;margin-top:2px}
        #waterPrecheckMetaR121{font-size:11px;color:#5b6872;line-height:1.3;margin-top:4px}
        #waterPrecheckActionsR121{display:flex;gap:6px;justify-content:center;margin-top:6px}
        #waterPrecheckActionsR121 button{width:auto!important;margin:0!important;padding:6px 10px!important;border:1px solid #c8d3dc!important;border-radius:8px!important;background:#fff!important;color:#173247!important;font-size:11px!important}
      `;
      document.head.appendChild(s);
    }
    if(el('waterPrecheckR121'))return;
    const box=document.createElement('div');
    box.id='waterPrecheckR121';
    box.innerHTML='<div class="r121title">CHỈ SỐ ĐỒNG HỒ ĐANG HIỂN THỊ</div><div id="waterPrecheckValueR121">--</div><div id="waterPrecheckMetaR121">Nhận QR trước, hệ thống sẽ tự đọc chỉ số.</div><div id="waterPrecheckActionsR121"><button id="waterPrecheckRetryR121" type="button">ĐỌC LẠI</button><button id="waterPrecheckEditR121" type="button">SỬA</button></div>';
    const shot=el('shotBtn');
    if(shot&&shot.parentNode)shot.parentNode.insertBefore(box,shot.nextSibling);
    else{const bottom=document.querySelector('.bottom');if(bottom)bottom.appendChild(box);else document.body.appendChild(box);}
    el('waterPrecheckRetryR121').addEventListener('click',()=>{verified=null;manualReading=null;schedule(0);});
    el('waterPrecheckEditR121').addEventListener('click',manualEdit);
  }

  function show(mode,value,meta){
    ensureUI();
    const box=el('waterPrecheckR121');
    box.style.display='block';
    box.classList.remove('reading','ok','warn');if(mode)box.classList.add(mode);
    el('waterPrecheckValueR121').textContent=value||'--';
    el('waterPrecheckMetaR121').textContent=meta||'';
  }

  function hide(){const box=el('waterPrecheckR121');if(box)box.style.display='none';}

  function manualEdit(){
    const seed=verified?verified.display:'';
    const input=window.prompt('Nhập chỉ số đang hiển thị trên đồng hồ:',seed);
    if(input===null)return;
    const r=readingFromManual(input);
    if(!r){alert('Chỉ số chưa đúng. Ví dụ: 00386 hoặc 0051.350');return;}
    const q=qrState();
    verified=Object.assign({},r,{source:'PRECHECK_MANUAL_R12.1',meter:q?q.meter:currentMeter,confidence:1,at:new Date().toISOString()});
    manualReading=verified;
    show('ok',verified.display,'Đã sửa thủ công · kiểm tra đúng số trên đồng hồ rồi bấm CHỤP.');
    try{if(typeof setStatus==='function'&&q)setStatus('BẤM ĐỂ CHỤP',q.label+' · Chỉ số '+verified.display+' · kiểm tra đúng rồi chụp.');}catch(e){}
  }

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(scriptPromise)return scriptPromise;
    scriptPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=TESSERACT_SRC;s.async=true;s.crossOrigin='anonymous';
      s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Không khởi tạo được OCR nội bộ.'));
      s.onerror=()=>reject(new Error('Không tải được OCR nội bộ.'));
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  async function ensureWorker(){
    if(worker)return worker;if(workerPromise)return workerPromise;
    workerPromise=(async()=>{
      const T=await loadTesseract();
      const w=await T.createWorker('eng',1);
      await w.setParameters({tessedit_char_whitelist:'0123456789',preserve_interword_spaces:'1'});
      worker=w;return w;
    })().catch(e=>{workerPromise=null;throw e;});
    return workerPromise;
  }

  function videoCanvas(angle,bw){
    const v=el('video');if(!v||!v.videoWidth||!v.videoHeight)return null;
    const sw=v.videoWidth,sh=v.videoHeight;
    const side=Math.min(sw,sh)*0.92,sx=(sw-side)/2,sy=(sh-side)/2;
    const base=document.createElement('canvas');const target=850,scale=Math.min(1.25,target/side);
    base.width=Math.max(1,Math.round(side*scale));base.height=base.width;
    const bctx=base.getContext('2d',{willReadFrequently:true});bctx.drawImage(v,sx,sy,side,side,0,0,base.width,base.height);
    const rad=angle*Math.PI/180,ac=Math.abs(Math.cos(rad)),as=Math.abs(Math.sin(rad));
    const out=document.createElement('canvas');out.width=Math.ceil(base.width*(ac+as));out.height=Math.ceil(base.height*(ac+as));
    const ctx=out.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);ctx.translate(out.width/2,out.height/2);ctx.rotate(rad);ctx.drawImage(base,-base.width/2,-base.height/2);ctx.setTransform(1,0,0,1,0,0);
    if(bw){
      try{const d=ctx.getImageData(0,0,out.width,out.height),p=d.data;let min=255,max=0,sum=0,n=0;for(let i=0;i<p.length;i+=4){const g=Math.round(p[i]*.299+p[i+1]*.587+p[i+2]*.114);min=Math.min(min,g);max=Math.max(max,g);sum+=g;n++;p[i]=p[i+1]=p[i+2]=g;}const span=Math.max(55,max-min),mean=n?sum/n:150,thr=clamp(mean-8,80,190);for(let i=0;i<p.length;i+=4){let g=clamp(Math.round((p[i]-min)*255/span),0,255);g=g<thr?0:255;p[i]=p[i+1]=p[i+2]=g;}ctx.putImageData(d,0,0);}catch(e){}
    }
    return out;
  }

  function strictCandidates(data){
    const out=[];const seen=new Set();
    function add(raw,confidence,origin){
      const s=txt(raw);if(!s||/[A-Za-z]/.test(s))return;
      const d=s.replace(/\D/g,'');if(d.length!==5&&d.length!==7)return;
      if(seen.has(d))return;seen.add(d);
      const r=readingFromDigits(d);if(r)out.push(Object.assign(r,{confidence:Number(confidence||0),origin}));
    }
    (data&&Array.isArray(data.words)?data.words:[]).forEach(w=>add(w&&w.text,w&&w.confidence,'word'));
    txt(data&&data.text).split(/\r?\n/).map(txt).filter(Boolean).forEach(line=>add(line,data&&data.confidence,'line'));
    return out.sort((a,b)=>b.confidence-a.confidence);
  }

  async function readOne(w,angle,bw){
    const c=videoCanvas(angle,bw);if(!c)return null;
    await w.setParameters({tessedit_pageseg_mode:'6'});
    const res=await w.recognize(c),list=strictCandidates(res&&res.data?res.data:{});
    return list[0]||null;
  }

  async function recognizeCurrent(){
    const w=await ensureWorker();const votes=new Map();
    for(const angle of ANGLES){
      const gray=await readOne(w,angle,false);
      if(gray){
        const bw=await readOne(w,angle,true);
        if(bw&&bw.raw===gray.raw&&Math.min(gray.confidence,bw.confidence)>=30){
          return Object.assign({},gray,{confidence:(gray.confidence+bw.confidence)/2,angle,consensus:'2 cách xử lý'});
        }
        for(const r of [gray,bw]){
          if(!r)continue;let g=votes.get(r.raw);if(!g){g={r,count:0,angles:new Set(),conf:0};votes.set(r.raw,g);}g.count++;g.angles.add(angle);g.conf+=r.confidence;
        }
      }
      for(const g of votes.values()){
        if(g.angles.size>=2&&g.count>=2&&(g.conf/g.count)>=35)return Object.assign({},g.r,{confidence:g.conf/g.count,angle:Array.from(g.angles).join(','),consensus:'nhiều góc'});
      }
    }
    return null;
  }

  async function scan(){
    if(busy)return;
    const q=qrState();
    if(!q){currentMeter='';verified=null;manualReading=null;hide();schedule(250);return;}
    if(q.meter!==currentMeter){currentMeter=q.meter;verified=null;manualReading=null;}
    if(verified&&verified.meter===q.meter){show('ok',verified.display,'QR '+q.label+' · kiểm tra đúng số trên đồng hồ rồi bấm CHỤP.');schedule(500);return;}
    busy=true;show('reading','ĐANG ĐỌC…','QR '+q.label+' đã nhận · đang đọc chỉ số hiện tại.');
    try{
      const r=await recognizeCurrent();
      if(r){verified=Object.assign({},r,{source:'PRECHECK_LOCAL_OCR_R12.1',meter:q.meter,confidence:clamp(Number(r.confidence||0)/100,0,1),at:new Date().toISOString()});show('ok',verified.display,'QR '+q.label+' · kiểm tra số trên đồng hồ. Đúng thì bấm CHỤP.');try{if(typeof setStatus==='function')setStatus('BẤM ĐỂ CHỤP',q.label+' · Chỉ số '+verified.display+' · kiểm tra đúng rồi chụp.');}catch(e){}
      }else{
        show('warn','CẦN KIỂM TRA','Chưa đọc chắc chắn. Giữ đồng hồ rõ hơn hoặc bấm ĐỌC LẠI / SỬA.');
      }
    }catch(e){show('warn','CẦN KIỂM TRA','OCR chưa sẵn sàng. Có thể bấm SỬA để nhập số nhìn thấy trên đồng hồ.');}
    finally{busy=false;schedule(SCAN_RETRY_MS);}
  }

  function schedule(ms){clearTimeout(timer);timer=setTimeout(scan,ms==null?SCAN_RETRY_MS:ms);}

  function installDbHook(){
    if(window.WATER_R121_PRECHECK_DB_HOOKED)return;
    if(typeof window.dbPut!=='function'){setTimeout(installDbHook,150);return;}
    coreDbPut=window.dbPut;
    window.dbPut=function(record){
      try{
        if(record&&record.image&&verified&&meterKey(record.meter)===verified.meter){
          record.liveReading=verified.value;
          record.liveReadingRaw=verified.raw;
          record.liveReadingConfidence=verified.confidence;
          record.liveReadingSource=verified.source;
          record.liveReadingAt=verified.at;
          record.liveReadingFormat=verified.format;
        }
      }catch(e){}
      return coreDbPut.apply(this,arguments);
    };
    window.WATER_R121_PRECHECK_DB_HOOKED=true;
  }

  function boot(){ensureUI();hide();installDbHook();if(navigator.onLine)ensureWorker().catch(()=>{});schedule(300);}
  window.addEventListener('online',()=>{ensureWorker().catch(()=>{});schedule(100);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(100);});
  window.addEventListener('beforeunload',()=>{try{if(worker)worker.terminate();}catch(e){}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.WATER_PRECHECK_READING_BUILD=BUILD;
})();