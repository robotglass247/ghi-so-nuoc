(function(){
  'use strict';

  const BUILD='879-r12.1-postcapture-v3-rotate-strict-consensus';
  const TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const SHEET_ID='1Mu10P8GyQHHy4NlrQVG90C3Uwa8f2G6wjfb0idKO9PM';
  const PREVIOUS_SHEET='CHI_SO_DAU';
  const RESULT_SHEET='GHI_SO_HANG_THANG';
  const PREVIOUS_CACHE_KEY='water_r121_previous_readings_v3';
  const ANGLES=[-45,-60,-30,0,45,60,30,90,-90];
  const MAX_PLAUSIBLE_USE=500;
  const OCR_WAIT_FOR_SYNC_MS=12000;

  let worker=null,workerPromise=null,scriptPromise=null;
  let previousMap=loadPreviousCache();
  let coreDbPut=null,coreTurbo=null;
  const pendingOcr=new Map();
  let lastResult=null;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function meterKey(v){return txt(v).toUpperCase().replace(/-N\d+$/i,'').replace(/\s+/g,'');}
  function periodRank(v){const s=txt(v);let m=s.match(/(\d{1,2})\D+(\d{4})/);if(m)return Number(m[2])*100+Number(m[1]);m=s.match(/(\d{4})\D+(\d{1,2})/);if(m)return Number(m[1])*100+Number(m[2]);return 0;}
  function loadPreviousCache(){try{const raw=JSON.parse(localStorage.getItem(PREVIOUS_CACHE_KEY)||'{}');return raw&&typeof raw==='object'?raw:{};}catch(e){return {};}}
  function savePreviousCache(){try{localStorage.setItem(PREVIOUS_CACHE_KEY,JSON.stringify(previousMap));}catch(e){}}
  function fmt(v){if(v==null||!Number.isFinite(Number(v)))return '--';const n=Number(v);return Number.isInteger(n)?String(n):n.toFixed(3).replace(/0+$/,'').replace(/\.$/,'');}

  function readingFromDigits(raw){
    const d=txt(raw).replace(/\D/g,'');
    if(d.length===5)return {raw:d,value:Number(d),display:d,format:'5_INT'};
    if(d.length===7){const display=d.slice(0,4)+'.'+d.slice(4);return {raw:d,value:Number(display),display,format:'4_INT_3_DEC'};}
    return null;
  }
  function readingFromManual(raw){
    const s=txt(raw).replace(',','.').replace(/\s+/g,'');
    if(/^\d{5}$/.test(s)||/^\d{7}$/.test(s))return readingFromDigits(s);
    let m=s.match(/^(\d{1,4})\.(\d{1,3})$/);if(m)return readingFromDigits(m[1].padStart(4,'0')+m[2].padEnd(3,'0'));
    if(/^\d{1,5}$/.test(s))return readingFromDigits(s.padStart(5,'0'));
    return null;
  }

  function ensureUI(){
    if(!el('waterPostReadR121Style')){
      const s=document.createElement('style');s.id='waterPostReadR121Style';s.textContent=`
        #waterPostReadR121{margin-top:6px;border:1px solid #d9e1e8;border-radius:10px;background:#f8fbfd;padding:7px 8px;color:#173247;font-family:Arial,sans-serif}
        #waterPostReadR121 .r121row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;font-size:12px;font-weight:700}
        #waterPostReadR121 .r121item{white-space:nowrap}.r121val{font-size:16px;font-weight:900;color:#0b5f8a;font-variant-numeric:tabular-nums}
        #waterPostReadR121.r121ok{background:#f0fbf5;border-color:#b8dfc7}#waterPostReadR121.r121warn{background:#fff8e8;border-color:#ead098}#waterPostReadR121.r121err{background:#fff0f0;border-color:#e4b1b1}
        #waterPostReadR121 .r121sub{margin-top:4px;font-size:10.5px;color:#5b6872;text-align:center;line-height:1.25}
        #waterPostReadR121 button{width:auto!important;padding:4px 8px!important;margin:0!important;border:1px solid #c8d3dc!important;border-radius:7px!important;background:#fff!important;font-size:11px!important;color:#173247!important}
        @media(max-width:420px){#waterPostReadR121 .r121row{gap:5px;font-size:11px}.r121val{font-size:15px}}
      `;document.head.appendChild(s);
    }
    if(el('waterPostReadR121'))return;
    const box=document.createElement('div');box.id='waterPostReadR121';
    box.innerHTML='<div class="r121row"><span class="r121item">Chỉ số mới: <b id="r121New" class="r121val">--</b></span><span class="r121item">Chỉ số cũ: <b id="r121Old" class="r121val">--</b></span><span class="r121item">Số mét khối: <b id="r121Use" class="r121val">--</b></span><button id="r121Edit" type="button">SỬA</button></div><div id="r121Sub" class="r121sub">Sau khi chụp: tự xoay ảnh và chỉ nhận đúng dãy 5/7 số độc lập.</div>';
    const anchor=el('captureEvidence')||el('syncStatus')||document.querySelector('.bottom');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);else document.body.appendChild(box);
    el('r121Edit').addEventListener('click',editLast);
  }
  function render(state,newVal,oldVal,useVal,sub){
    ensureUI();const box=el('waterPostReadR121');box.classList.remove('r121ok','r121warn','r121err');if(state)box.classList.add(state);
    el('r121New').textContent=newVal==null?'--':String(newVal);el('r121Old').textContent=oldVal==null?'--':String(oldVal);el('r121Use').textContent=useVal==null?'--':String(useVal);el('r121Sub').textContent=sub||'';
  }
  function renderEngine(v){const sub=el('r121Sub');if(sub&&!lastResult)sub.textContent=v;}

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(scriptPromise)return scriptPromise;
    scriptPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=TESSERACT_SRC;s.async=true;s.crossOrigin='anonymous';s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Không khởi tạo được OCR nội bộ.'));s.onerror=()=>reject(new Error('OCR nội bộ chưa được tải trên máy.'));document.head.appendChild(s);});
    return scriptPromise;
  }
  async function ensureWorker(){
    if(worker)return worker;if(workerPromise)return workerPromise;
    workerPromise=(async()=>{const T=await loadTesseract();const w=await T.createWorker('eng',1,{logger:m=>{if(m&&m.status==='recognizing text')renderEngine('Đang đọc ảnh '+Math.round(Number(m.progress||0)*100)+'%…');}});await w.setParameters({tessedit_char_whitelist:'0123456789',preserve_interword_spaces:'1'});worker=w;return w;})().then(w=>{renderEngine('✓ OCR nội bộ sẵn sàng.');return w;}).catch(e=>{workerPromise=null;throw e;});
    return workerPromise;
  }

  async function decodeBlob(blob){
    if('createImageBitmap' in window)return await createImageBitmap(blob);
    const url=URL.createObjectURL(blob);try{return await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});}finally{setTimeout(()=>URL.revokeObjectURL(url),2000);}
  }

  function makeRotatedCanvas(img,angle,bw){
    const sw=img.width||img.naturalWidth,sh=img.height||img.naturalHeight;
    const side=Math.min(sw,sh)*0.92,sx=(sw-side)/2,sy=(sh-side)/2;
    const base=document.createElement('canvas');const max=1050,scale=Math.min(1.35,max/side);base.width=Math.round(side*scale);base.height=base.width;
    const bctx=base.getContext('2d',{willReadFrequently:true});bctx.drawImage(img,sx,sy,side,side,0,0,base.width,base.height);
    const rad=angle*Math.PI/180,absCos=Math.abs(Math.cos(rad)),absSin=Math.abs(Math.sin(rad));
    const out=document.createElement('canvas');out.width=Math.ceil(base.width*(absCos+absSin));out.height=Math.ceil(base.height*(absSin+absCos));
    const ctx=out.getContext('2d',{willReadFrequently:true});ctx.translate(out.width/2,out.height/2);ctx.rotate(rad);ctx.drawImage(base,-base.width/2,-base.height/2);ctx.setTransform(1,0,0,1,0,0);
    if(bw){
      try{const d=ctx.getImageData(0,0,out.width,out.height),p=d.data;let min=255,max=0,sum=0,n=0;for(let i=0;i<p.length;i+=4){if(p[i+3]<20)continue;const g=Math.round(p[i]*.299+p[i+1]*.587+p[i+2]*.114);min=Math.min(min,g);max=Math.max(max,g);sum+=g;n++;p[i]=p[i+1]=p[i+2]=g;}const span=Math.max(55,max-min),mean=n?sum/n:150,thr=clamp(mean-10,80,190);for(let i=0;i<p.length;i+=4){if(p[i+3]<20){p[i]=p[i+1]=p[i+2]=255;p[i+3]=255;continue;}let g=clamp(Math.round((p[i]-min)*255/span),0,255);g=g<thr?0:255;p[i]=p[i+1]=p[i+2]=g;}ctx.putImageData(d,0,0);}catch(e){}
    }
    return out;
  }

  // CHỐT QUY TẮC: KHÔNG BAO GIỜ cắt 5 số từ một chuỗi dài hơn.
  // Chỉ chấp nhận một dòng/từ mà sau khi bỏ khoảng trắng/ký tự phân cách còn đúng 5 hoặc 7 số.
  function strictCandidates(data){
    const out=[];const seen=new Set();
    function add(raw,confidence,origin){
      let s=txt(raw);if(!s)return;
      // Có chữ cái thì không coi là hàng số của bộ đếm.
      if(/[A-Za-z]/.test(s))return;
      const d=s.replace(/\D/g,'');
      if(d.length!==5&&d.length!==7)return;
      if(seen.has(d))return;seen.add(d);
      const r=readingFromDigits(d);if(r)out.push(Object.assign(r,{confidence:Number(confidence||0),origin}));
    }
    (data&&Array.isArray(data.words)?data.words:[]).forEach(w=>add(w&&w.text,w&&w.confidence,'word'));
    const lines=txt(data&&data.text).split(/\r?\n/).map(txt).filter(Boolean);lines.forEach(line=>add(line,data&&data.confidence,'line'));
    add(data&&data.text,data&&data.confidence,'all');
    return out.sort((a,b)=>b.confidence-a.confidence);
  }

  function plausible(r,previous){
    if(!r)return false;
    if(previous==null||!Number.isFinite(Number(previous)))return true;
    const use=r.value-Number(previous);return use>=0&&use<=MAX_PLAUSIBLE_USE;
  }

  async function readVariant(w,img,angle,bw,previous){
    const c=makeRotatedCanvas(img,angle,bw);await w.setParameters({tessedit_pageseg_mode:'6'});const res=await w.recognize(c);const list=strictCandidates(res&&res.data?res.data:{}).filter(r=>plausible(r,previous));
    return list[0]||null;
  }

  async function recognizeStrict(blob,previous){
    const w=await ensureWorker();const img=await decodeBlob(blob);const votes=new Map();let best=null;
    try{
      for(const angle of ANGLES){
        const gray=await readVariant(w,img,angle,false,previous);
        const bw=await readVariant(w,img,angle,true,previous);
        for(const r of [gray,bw]){
          if(!r)continue;const key=r.raw;let g=votes.get(key);if(!g){g={reading:r,count:0,angles:new Set(),conf:0};votes.set(key,g);}g.count++;g.angles.add(angle);g.conf+=r.confidence;if(!best||r.confidence>best.confidence)best=r;
        }
        // Hai phép xử lý ở cùng một góc cùng đọc một dãy = bằng chứng mạnh.
        if(gray&&bw&&gray.raw===bw.raw&&Math.min(gray.confidence,bw.confidence)>=30)return Object.assign({},gray,{confidence:(gray.confidence+bw.confidence)/2,angle,consensus:'GRAY_BW'});
        // Hoặc cùng dãy xuất hiện ở ít nhất 2 góc khác nhau.
        for(const g of votes.values())if(g.angles.size>=2&&g.count>=2&&(g.conf/g.count)>=35)return Object.assign({},g.reading,{confidence:g.conf/g.count,angle:Array.from(g.angles).join(','),consensus:'MULTI_ANGLE'});
      }
      return null;
    }finally{if(img&&img.close)try{img.close();}catch(e){}}
  }

  function previousForMeter(meter){const x=previousMap[meterKey(meter)];return x&&Number.isFinite(Number(x.value))?Number(x.value):null;}

  async function processRecord(record){
    if(!record||!record.image||!record.clientId)return;
    const old=previousForMeter(record.meter);
    render('', 'Đang đọc…',old==null?'--':fmt(old),'--','Đã lưu ảnh · đang tự xoay để tìm đúng hàng số cơ.');
    try{
      const r=await recognizeStrict(record.image,old);
      if(!r)throw new Error('Chưa đủ bằng chứng để chốt chỉ số.');
      const use=old==null?null:r.value-old;
      record.liveReading=r.value;record.liveReadingRaw=r.raw;record.liveReadingConfidence=clamp(Number(r.confidence||0)/100,0,1);record.liveReadingSource='POST_CAPTURE_ROTATE_STRICT_R12.1';record.liveReadingAt=new Date().toISOString();record.liveReadingFormat=r.format;record.previousReading=old;record.consumption=use;
      if(coreDbPut)await coreDbPut(record);
      lastResult={record,reading:r,old,use};
      render('r121ok',r.display,old==null?'--':fmt(old),use==null?'--':fmt(use)+' m³','✓ OCR nội bộ đã xác nhận '+r.consensus+' · góc '+r.angle+'°.');
    }catch(e){
      lastResult={record,reading:null,old,use:null};
      render('r121warn','CẦN KIỂM TRA',old==null?'--':fmt(old),'--','Không chốt số khi OCR chưa chắc. Ảnh vẫn lưu; AI máy chủ sẽ đối chiếu khi đồng bộ.');
    }
  }

  function editLast(){
    if(!lastResult||!lastResult.record)return;
    const seed=lastResult.reading?lastResult.reading.display:'';const input=window.prompt('Nhập lại chỉ số mới:',seed);if(input===null)return;
    const r=readingFromManual(input);if(!r){alert('Chỉ số chưa đúng. Ví dụ: 00386 hoặc 0051.350');return;}
    const record=lastResult.record,old=previousForMeter(record.meter),use=old==null?null:r.value-old;
    record.liveReading=r.value;record.liveReadingRaw=r.raw;record.liveReadingConfidence=1;record.liveReadingSource='POST_CAPTURE_MANUAL_R12.1';record.liveReadingAt=new Date().toISOString();record.liveReadingFormat=r.format;record.previousReading=old;record.consumption=use;
    if(coreDbPut)coreDbPut(record).catch(()=>{});lastResult={record,reading:r,old,use};render('r121ok',r.display,old==null?'--':fmt(old),use==null?'--':fmt(use)+' m³','Đã sửa thủ công · giá trị lưu cùng ảnh trên máy.');
  }

  function refreshPreviousReadings(){
    if(!navigator.onLine)return;
    const cb='__waterPrevR121v3_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');let done=false;
    const finish=()=>{if(done)return;done=true;try{delete window[cb];}catch(e){}if(s.parentNode)s.parentNode.removeChild(s);};
    window[cb]=data=>{try{const table=data&&data.table;if(!table||!Array.isArray(table.rows))return;const labels=(table.cols||[]).map(c=>norm(c&&(c.label||c.id)||''));let meterIdx=labels.findIndex(x=>/ma can ho|ma dong ho|ma dh|can ho/.test(x));let readIdx=labels.findIndex(x=>/chi so/.test(x)&&!/kiem tra|danh gia/.test(x));let periodIdx=labels.findIndex(x=>/ky ap dung|ky ghi|thang|ky/.test(x));if(meterIdx<0)meterIdx=1;if(readIdx<0)readIdx=2;const next={...previousMap};table.rows.forEach(row=>{const cells=row&&row.c||[],code=meterKey(cells[meterIdx]&&(cells[meterIdx].f!=null?cells[meterIdx].f:cells[meterIdx].v));if(!code)return;const raw=cells[readIdx]&&(cells[readIdx].f!=null?cells[readIdx].f:cells[readIdx].v),value=Number(String(raw==null?'':raw).replace(',','.'));if(!Number.isFinite(value))return;const period=periodIdx>=0?txt(cells[periodIdx]&&(cells[periodIdx].f!=null?cells[periodIdx].f:cells[periodIdx].v)):'';const rank=periodRank(period),old=next[code];if(!old||rank>=Number(old.rank||0))next[code]={value,period,rank};});previousMap=next;savePreviousCache();renderEngine('✓ Đã cập nhật dữ liệu chỉ số cũ trên máy.');}catch(e){}finally{finish();}};
    s.onerror=finish;s.async=true;s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(PREVIOUS_SHEET)+'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)+'&tq='+encodeURIComponent('select *')+'&_='+Date.now();document.head.appendChild(s);setTimeout(finish,12000);
  }

  function enrichPayload(payload,records){const map=new Map((records||[]).map(r=>[String(r&&r.clientId||''),r]));(payload||[]).forEach(p=>{const r=map.get(String(p&&p.clientId||''));if(!r)return;p.liveReading=r.liveReading==null?'':r.liveReading;p.liveReadingRaw=r.liveReadingRaw||'';p.liveReadingConfidence=r.liveReadingConfidence==null?'':r.liveReadingConfidence;p.liveReadingSource=r.liveReadingSource||'';p.liveReadingAt=r.liveReadingAt||'';p.liveReadingFormat=r.liveReadingFormat||'';p.previousReading=r.previousReading==null?'':r.previousReading;p.consumption=r.consumption==null?'':r.consumption;});return payload;}

  function installHooks(){
    if(window.WATER_R121_POSTCAPTURE_HOOKED_V3)return;
    if(typeof window.dbPut!=='function'){setTimeout(installHooks,120);return;}
    coreDbPut=window.dbPut;coreTurbo=typeof window.turboBuildPayload==='function'?window.turboBuildPayload:null;
    window.dbPut=function(record){const result=coreDbPut.apply(this,arguments);if(record&&record.image&&record.clientId&&!record.liveReadingSource){const id=String(record.clientId),task=Promise.resolve(result).then(()=>processRecord(record)).catch(()=>{}).finally(()=>pendingOcr.delete(id));pendingOcr.set(id,task);}return result;};
    if(coreTurbo){window.turboBuildPayload=async function(records){const waits=(records||[]).map(r=>pendingOcr.get(String(r&&r.clientId||''))).filter(Boolean);if(waits.length)await Promise.race([Promise.allSettled(waits),sleep(OCR_WAIT_FOR_SYNC_MS)]);const payload=await coreTurbo.call(this,records);return enrichPayload(payload,records);};}
    window.WATER_R121_POSTCAPTURE_HOOKED_V3=true;
  }

  function boot(){ensureUI();installHooks();refreshPreviousReadings();if(navigator.onLine){renderEngine('Đang chuẩn bị OCR xoay ảnh…');ensureWorker().catch(()=>renderEngine('OCR nội bộ chưa tải được; ảnh vẫn lưu và AI máy chủ sẽ xử lý.'));}else renderEngine(worker?'✓ OCR nội bộ sẵn sàng OFFLINE.':'OFFLINE · ảnh vẫn lưu; OCR cần được tải trước khi mất mạng.');}
  window.addEventListener('online',()=>{refreshPreviousReadings();ensureWorker().catch(()=>{});});
  window.addEventListener('beforeunload',()=>{try{if(worker)worker.terminate();}catch(e){}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.WATER_POSTCAPTURE_READING_BUILD=BUILD;
})();