(function(){
  'use strict';

  const BUILD='879-r12.1-postcapture-reading-v1';
  const TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const SHEET_ID='1Mu10P8GyQHHy4NlrQVG90C3Uwa8f2G6wjfb0idKO9PM';
  const PREVIOUS_SHEET='CHI_SO_DAU';
  const PREVIOUS_CACHE_KEY='water_r121_previous_readings_v1';
  const OCR_WAIT_FOR_SYNC_MS=9000;

  let worker=null,workerPromise=null,scriptPromise=null;
  let previousMap=loadPreviousCache();
  let coreDbPut=null,coreTurbo=null;
  const pendingOcr=new Map();
  let lastResult=null;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function norm(v){
    return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function meterKey(v){return txt(v).toUpperCase().replace(/-N\d+$/i,'').replace(/\s+/g,'');}
  function periodRank(v){
    const s=txt(v);let m=s.match(/(\d{1,2})\D+(\d{4})/);if(m)return Number(m[2])*100+Number(m[1]);
    m=s.match(/(\d{4})\D+(\d{1,2})/);if(m)return Number(m[1])*100+Number(m[2]);
    return 0;
  }
  function loadPreviousCache(){
    try{
      const raw=JSON.parse(localStorage.getItem(PREVIOUS_CACHE_KEY)||'{}');
      return raw&&typeof raw==='object'?raw:{};
    }catch(e){return {};}
  }
  function savePreviousCache(){
    try{localStorage.setItem(PREVIOUS_CACHE_KEY,JSON.stringify(previousMap));}catch(e){}
  }

  function readingFromDigits(raw){
    const d=txt(raw).replace(/\D/g,'');
    if(d.length===7){const display=d.slice(0,4)+'.'+d.slice(4);return {raw:d,value:Number(display),display,format:'4_INT_3_DEC'};}
    if(d.length===5){return {raw:d,value:Number(d),display:d,format:'5_INT'};}
    return null;
  }
  function readingFromManual(raw){
    const s=txt(raw).replace(',','.').replace(/\s+/g,'');
    if(/^\d{5}$/.test(s)||/^\d{7}$/.test(s))return readingFromDigits(s);
    let m=s.match(/^(\d{1,4})\.(\d{1,3})$/);if(m)return readingFromDigits(m[1].padStart(4,'0')+m[2].padEnd(3,'0'));
    if(/^\d{1,5}$/.test(s))return readingFromDigits(s.padStart(5,'0'));
    return null;
  }
  function fmt(v){
    if(v==null||!Number.isFinite(Number(v)))return '--';
    const n=Number(v);return Number.isInteger(n)?String(n):n.toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
  }

  function ensureUI(){
    if(!el('waterPostReadR121Style')){
      const s=document.createElement('style');s.id='waterPostReadR121Style';s.textContent=`
        #waterPostReadR121{margin-top:6px;border:1px solid #d9e1e8;border-radius:10px;background:#f8fbfd;padding:7px 8px;color:#173247;font-family:Arial,sans-serif}
        #waterPostReadR121 .r121row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;font-size:12px;font-weight:700}
        #waterPostReadR121 .r121item{white-space:nowrap}.r121val{font-size:16px;font-weight:900;color:#0b5f8a;font-variant-numeric:tabular-nums}
        #waterPostReadR121.r121ok{background:#f0fbf5;border-color:#b8dfc7}#waterPostReadR121.r121warn{background:#fff8e8;border-color:#ead098}#waterPostReadR121.r121err{background:#fff0f0;border-color:#e4b1b1}
        #waterPostReadR121 .r121sub{margin-top:4px;font-size:10.5px;color:#5b6872;text-align:center}
        #waterPostReadR121 button{width:auto!important;padding:4px 8px!important;margin:0!important;border:1px solid #c8d3dc!important;border-radius:7px!important;background:#fff!important;font-size:11px!important;color:#173247!important}
        @media(max-width:420px){#waterPostReadR121 .r121row{gap:5px;font-size:11px}.r121val{font-size:15px}}
      `;document.head.appendChild(s);
    }
    if(el('waterPostReadR121'))return;
    const box=document.createElement('div');box.id='waterPostReadR121';
    box.innerHTML='<div class="r121row"><span class="r121item">Chỉ số mới: <b id="r121New" class="r121val">--</b></span><span class="r121item">Chỉ số cũ: <b id="r121Old" class="r121val">--</b></span><span class="r121item">Số mét khối: <b id="r121Use" class="r121val">--</b></span><button id="r121Edit" type="button">SỬA</button></div><div id="r121Sub" class="r121sub">OCR sau khi chụp · ảnh vẫn lưu như bản cũ.</div>';
    const anchor=el('captureEvidence')||el('syncStatus')||document.querySelector('.bottom');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);else document.body.appendChild(box);
    el('r121Edit').addEventListener('click',editLast);
  }
  function render(state,newVal,oldVal,useVal,sub){
    ensureUI();const box=el('waterPostReadR121');box.classList.remove('r121ok','r121warn','r121err');if(state)box.classList.add(state);
    el('r121New').textContent=newVal==null?'--':String(newVal);el('r121Old').textContent=oldVal==null?'--':String(oldVal);el('r121Use').textContent=useVal==null?'--':String(useVal);el('r121Sub').textContent=sub||'';
  }
  function renderEngine(textValue){
    const sub=el('r121Sub');if(sub&&!lastResult)sub.textContent=textValue;
  }

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(scriptPromise)return scriptPromise;
    scriptPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=TESSERACT_SRC;s.async=true;s.crossOrigin='anonymous';
      s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Không khởi tạo được OCR nội bộ.'));
      s.onerror=()=>reject(new Error('OCR nội bộ chưa được tải trên máy.'));
      document.head.appendChild(s);
    });
    return scriptPromise;
  }
  async function ensureWorker(){
    if(worker)return worker;if(workerPromise)return workerPromise;
    workerPromise=(async()=>{
      const T=await loadTesseract();
      const w=await T.createWorker('eng',1,{logger:m=>{if(m&&m.status==='recognizing text')renderEngine('Đang đọc ảnh '+Math.round(Number(m.progress||0)*100)+'%…');}});
      await w.setParameters({tessedit_char_whitelist:'0123456789',tessedit_pageseg_mode:T.PSM&&T.PSM.SPARSE_TEXT?T.PSM.SPARSE_TEXT:'11',preserve_interword_spaces:'0'});
      worker=w;return w;
    })().then(w=>{renderEngine('✓ OCR nội bộ đã sẵn sàng · có thể tiếp tục đọc khi mất mạng trong phiên này.');return w;}).catch(e=>{workerPromise=null;throw e;});
    return workerPromise;
  }

  async function imageCanvas(blob,mode){
    let img=null,url='';
    try{
      if('createImageBitmap' in window)img=await createImageBitmap(blob);
      else{url=URL.createObjectURL(blob);img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});}
      const sw=img.width||img.naturalWidth,sh=img.height||img.naturalHeight;
      let sx=0,sy=0,cw=sw,ch=sh;
      if(mode==='center'){sx=sw*.10;sy=sh*.20;cw=sw*.80;ch=sh*.58;}
      const maxW=1300,scale=Math.min(1,maxW/cw),c=document.createElement('canvas');c.width=Math.max(1,Math.round(cw*scale));c.height=Math.max(1,Math.round(ch*scale));
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,sx,sy,cw,ch,0,0,c.width,c.height);
      try{
        const d=ctx.getImageData(0,0,c.width,c.height),p=d.data;let min=255,max=0;
        for(let i=0;i<p.length;i+=4){const g=Math.round(p[i]*.299+p[i+1]*.587+p[i+2]*.114);if(g<min)min=g;if(g>max)max=g;p[i]=p[i+1]=p[i+2]=g;}
        const span=Math.max(65,max-min);for(let i=0;i<p.length;i+=4){const g=clamp(Math.round((p[i]-min)*255/span),0,255);p[i]=p[i+1]=p[i+2]=g;}ctx.putImageData(d,0,0);
      }catch(e){}
      return c;
    }finally{if(img&&img.close)try{img.close();}catch(e){}if(url)URL.revokeObjectURL(url);}
  }

  function candidatesFromData(data,previous){
    const out=[];const seen=new Set();
    function add(raw,confidence,source){
      const digits=txt(raw).replace(/\D/g,'');if(!digits)return;
      const seq=[];
      if(digits.length===5||digits.length===7)seq.push(digits);
      else if(digits.length>7){seq.push(digits.slice(0,7),digits.slice(-7),digits.slice(0,5),digits.slice(-5));}
      seq.forEach(d=>{const r=readingFromDigits(d);if(!r||seen.has(r.raw))return;seen.add(r.raw);let score=Number(confidence||0);if(previous!=null&&Number.isFinite(Number(previous))){const use=r.value-Number(previous);if(use<0)score-=220;else if(use<=100)score+=45;else if(use<=300)score+=10;else score-=40;if((Number(previous)%1)!==0&&r.format==='4_INT_3_DEC')score+=30;}else score+=r.format==='5_INT'?8:4;out.push(Object.assign(r,{confidence:Number(confidence||0),score,source}));});
    }
    (data&&Array.isArray(data.words)?data.words:[]).forEach(w=>add(w&&w.text,w&&w.confidence,'word'));
    const text=txt(data&&data.text);(text.match(/\d[\d\s.,-]{3,12}\d/g)||[]).forEach(x=>add(x,data&&data.confidence,'text'));
    add(text,data&&data.confidence,'all');
    return out.sort((a,b)=>b.score-a.score);
  }

  async function recognizeBlob(blob,previous){
    const w=await ensureWorker();let all=[];
    for(const mode of ['full','center']){
      const c=await imageCanvas(blob,mode);
      await w.setParameters({tessedit_pageseg_mode:mode==='full'?'11':'6'});
      const res=await w.recognize(c),data=res&&res.data?res.data:{};all=all.concat(candidatesFromData(data,previous));
      all.sort((a,b)=>b.score-a.score);if(all[0]&&all[0].score>=45)break;
    }
    return all[0]||null;
  }

  function previousForMeter(meter){
    const x=previousMap[meterKey(meter)];return x&&Number.isFinite(Number(x.value))?Number(x.value):null;
  }

  async function processRecord(record){
    if(!record||!record.image||!record.clientId)return;
    const id=String(record.clientId),old=previousForMeter(record.meter);
    render('', 'Đang đọc…',old==null?'--':fmt(old),'--','Đã lưu ảnh · OCR đang đọc trên chính ảnh vừa chụp.');
    try{
      const r=await recognizeBlob(record.image,old);if(!r)throw new Error('Chưa nhận được dãy số rõ trên ảnh.');
      const use=old==null?null:r.value-old;const warn=old!=null&&use<0;
      record.liveReading=r.value;record.liveReadingRaw=r.raw;record.liveReadingConfidence=clamp(Number(r.confidence||0)/100,0,1);record.liveReadingSource='POST_CAPTURE_LOCAL_OCR_R12.1';record.liveReadingAt=new Date().toISOString();record.liveReadingFormat=r.format;record.previousReading=old;record.consumption=use;
      if(coreDbPut)await coreDbPut(record);
      lastResult={record,reading:r,old,use};
      render(warn?'r121warn':'r121ok',fmt(r.value),old==null?'--':fmt(old),use==null?'--':fmt(use)+' m³',warn?'⚠ Chỉ số mới nhỏ hơn chỉ số cũ · cần kiểm tra.':(navigator.onLine?'✓ Đọc sau chụp · backend online sẽ tiếp tục đối chiếu.':'✓ OCR nội bộ · đang OFFLINE, ảnh và kết quả vẫn lưu trên máy.'));
    }catch(e){
      lastResult={record,reading:null,old,use:null};
      render('r121err','CẦN KIỂM TRA',old==null?'--':fmt(old),'--',(navigator.onLine?'Ảnh đã lưu. AI/backend sẽ đọc lại khi đồng bộ.':'Ảnh đã lưu an toàn. OCR offline chưa đọc chắc chắn; sẽ xử lý lại khi có mạng.'));
    }
  }

  function editLast(){
    if(!lastResult||!lastResult.record)return;
    const seed=lastResult.reading?lastResult.reading.display:'';const input=window.prompt('Nhập lại chỉ số mới:',seed);if(input===null)return;
    const r=readingFromManual(input);if(!r){alert('Chỉ số chưa đúng. Ví dụ: 00649 hoặc 0051.350');return;}
    const record=lastResult.record,old=previousForMeter(record.meter),use=old==null?null:r.value-old;
    record.liveReading=r.value;record.liveReadingRaw=r.raw;record.liveReadingConfidence=1;record.liveReadingSource='POST_CAPTURE_MANUAL_R12.1';record.liveReadingAt=new Date().toISOString();record.liveReadingFormat=r.format;record.previousReading=old;record.consumption=use;
    if(coreDbPut)coreDbPut(record).catch(()=>{});lastResult={record,reading:r,old,use};
    render(old!=null&&use<0?'r121warn':'r121ok',fmt(r.value),old==null?'--':fmt(old),use==null?'--':fmt(use)+' m³','Đã sửa thủ công · giá trị lưu cùng ảnh trên máy.');
  }

  function refreshPreviousReadings(){
    if(!navigator.onLine)return;
    const cb='__waterPrevR121_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');let done=false;
    const finish=()=>{if(done)return;done=true;try{delete window[cb];}catch(e){}if(s.parentNode)s.parentNode.removeChild(s);};
    window[cb]=data=>{try{
      const table=data&&data.table;if(!table||!Array.isArray(table.rows))return;
      const labels=(table.cols||[]).map(c=>norm(c&&(c.label||c.id)||''));
      let meterIdx=labels.findIndex(x=>/ma can ho|ma dong ho|ma dh|can ho/.test(x));
      let readIdx=labels.findIndex(x=>/chi so/.test(x)&&!/kiem tra|danh gia/.test(x));
      let periodIdx=labels.findIndex(x=>/ky ap dung|ky ghi|thang|ky/.test(x));
      if(meterIdx<0)meterIdx=1;if(readIdx<0)readIdx=2;
      const next={...previousMap};
      table.rows.forEach(row=>{const cells=row&&row.c||[],code=meterKey(cells[meterIdx]&&(cells[meterIdx].f!=null?cells[meterIdx].f:cells[meterIdx].v));if(!code)return;const raw=cells[readIdx]&&(cells[readIdx].f!=null?cells[readIdx].f:cells[readIdx].v),value=Number(String(raw==null?'':raw).replace(',','.'));if(!Number.isFinite(value))return;const period=periodIdx>=0?txt(cells[periodIdx]&&(cells[periodIdx].f!=null?cells[periodIdx].f:cells[periodIdx].v)):'';const rank=periodRank(period),old=next[code];if(!old||rank>=Number(old.rank||0))next[code]={value,period,rank};});
      previousMap=next;savePreviousCache();renderEngine('✓ Đã lưu chỉ số cũ trên máy · sẵn sàng dùng khi mất mạng.');
    }catch(e){}finally{finish();}};
    s.onerror=finish;s.async=true;s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(PREVIOUS_SHEET)+'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)+'&tq='+encodeURIComponent('select *')+'&_='+Date.now();document.head.appendChild(s);setTimeout(finish,12000);
  }

  function enrichPayload(payload,records){
    const map=new Map((records||[]).map(r=>[String(r&&r.clientId||''),r]));
    (payload||[]).forEach(p=>{const r=map.get(String(p&&p.clientId||''));if(!r)return;p.liveReading=r.liveReading==null?'':r.liveReading;p.liveReadingRaw=r.liveReadingRaw||'';p.liveReadingConfidence=r.liveReadingConfidence==null?'':r.liveReadingConfidence;p.liveReadingSource=r.liveReadingSource||'';p.liveReadingAt=r.liveReadingAt||'';p.liveReadingFormat=r.liveReadingFormat||'';p.previousReading=r.previousReading==null?'':r.previousReading;p.consumption=r.consumption==null?'':r.consumption;});
    return payload;
  }

  function installHooks(){
    if(window.WATER_R121_POSTCAPTURE_HOOKED)return;
    if(typeof window.dbPut!=='function'){setTimeout(installHooks,120);return;}
    coreDbPut=window.dbPut;coreTurbo=typeof window.turboBuildPayload==='function'?window.turboBuildPayload:null;
    window.dbPut=function(record){
      const result=coreDbPut.apply(this,arguments);
      if(record&&record.image&&record.clientId&&!record.liveReadingSource){
        const id=String(record.clientId);const task=Promise.resolve(result).then(()=>processRecord(record)).catch(()=>{}).finally(()=>pendingOcr.delete(id));pendingOcr.set(id,task);
      }
      return result;
    };
    if(coreTurbo){
      window.turboBuildPayload=async function(records){
        const waits=(records||[]).map(r=>pendingOcr.get(String(r&&r.clientId||''))).filter(Boolean);
        if(waits.length)await Promise.race([Promise.allSettled(waits),sleep(OCR_WAIT_FOR_SYNC_MS)]);
        const payload=await coreTurbo.call(this,records);return enrichPayload(payload,records);
      };
    }
    window.WATER_R121_POSTCAPTURE_HOOKED=true;
  }

  function boot(){
    ensureUI();installHooks();refreshPreviousReadings();
    if(navigator.onLine){renderEngine('Đang chuẩn bị OCR nội bộ để dùng cả khi mất mạng…');ensureWorker().catch(()=>renderEngine('OCR nội bộ chưa tải được; ảnh vẫn lưu và backend sẽ xử lý khi có mạng.'));}
    else renderEngine(worker?'✓ OCR nội bộ sẵn sàng OFFLINE.':'OFFLINE · ảnh vẫn lưu; OCR chỉ đọc được nếu bộ nhận dạng đã được tải trước đó.');
  }
  window.addEventListener('online',()=>{refreshPreviousReadings();ensureWorker().catch(()=>{});});
  window.addEventListener('beforeunload',()=>{try{if(worker)worker.terminate();}catch(e){}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.WATER_POSTCAPTURE_READING_BUILD=BUILD;
})();