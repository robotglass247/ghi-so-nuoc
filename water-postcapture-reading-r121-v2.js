(function(){
  'use strict';

  const BUILD='879-r12.1-postcapture-reading-v2-consensus-server-ai';
  const TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const SHEET_ID='1Mu10P8GyQHHy4NlrQVG90C3Uwa8f2G6wjfb0idKO9PM';
  const PREVIOUS_SHEET='CHI_SO_DAU';
  const RESULT_SHEET='GHI_SO_HANG_THANG';
  const PREVIOUS_CACHE_KEY='water_r121_previous_readings_v2';
  const OCR_WAIT_FOR_SYNC_MS=9000;
  const SERVER_POLL_MS=2500;
  const SERVER_POLL_MAX_MS=75000;

  let worker=null,workerPromise=null,scriptPromise=null;
  let previousMap=loadPreviousCache();
  let coreDbPut=null,coreTurbo=null;
  const pendingOcr=new Map();
  const serverPollers=new Map();
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
    box.innerHTML='<div class="r121row"><span class="r121item">Chỉ số mới: <b id="r121New" class="r121val">--</b></span><span class="r121item">Chỉ số cũ: <b id="r121Old" class="r121val">--</b></span><span class="r121item">Số mét khối: <b id="r121Use" class="r121val">--</b></span><button id="r121Edit" type="button">SỬA</button></div><div id="r121Sub" class="r121sub">Chụp như bản cũ · OCR chỉ nhận khi nhiều vùng đọc cùng một kết quả.</div>';
    const anchor=el('captureEvidence')||el('syncStatus')||document.querySelector('.bottom');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);else document.body.appendChild(box);
    el('r121Edit').addEventListener('click',editLast);
  }
  function render(state,newVal,oldVal,useVal,sub){
    ensureUI();const box=el('waterPostReadR121');box.classList.remove('r121ok','r121warn','r121err');if(state)box.classList.add(state);
    el('r121New').textContent=newVal==null?'--':String(newVal);el('r121Old').textContent=oldVal==null?'--':String(oldVal);el('r121Use').textContent=useVal==null?'--':String(useVal);el('r121Sub').textContent=sub||'';
  }
  function renderEngine(textValue){const sub=el('r121Sub');if(sub&&!lastResult)sub.textContent=textValue;}

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(scriptPromise)return scriptPromise;
    scriptPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=TESSERACT_SRC;s.async=true;s.crossOrigin='anonymous';s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Không khởi tạo được OCR nội bộ.'));s.onerror=()=>reject(new Error('OCR nội bộ chưa được tải trên máy.'));document.head.appendChild(s);});
    return scriptPromise;
  }
  async function ensureWorker(){
    if(worker)return worker;if(workerPromise)return workerPromise;
    workerPromise=(async()=>{const T=await loadTesseract();const w=await T.createWorker('eng',1,{logger:m=>{if(m&&m.status==='recognizing text')renderEngine('Đang đọc ảnh '+Math.round(Number(m.progress||0)*100)+'%…');}});await w.setParameters({tessedit_char_whitelist:'0123456789',preserve_interword_spaces:'0'});worker=w;return w;})().then(w=>{renderEngine('✓ OCR nội bộ sẵn sàng. Kết quả chỉ được nhận khi có đồng thuận nhiều vùng.');return w;}).catch(e=>{workerPromise=null;throw e;});
    return workerPromise;
  }

  const CROPS=[
    {name:'bandA',x:.10,y:.20,w:.80,h:.27,psm:'7'},
    {name:'bandB',x:.10,y:.29,w:.80,h:.27,psm:'7'},
    {name:'bandC',x:.10,y:.38,w:.80,h:.27,psm:'7'},
    {name:'center',x:.14,y:.20,w:.72,h:.50,psm:'6'}
  ];

  async function imageCanvas(blob,crop,thresholdMode){
    let img=null,url='';
    try{
      if('createImageBitmap' in window)img=await createImageBitmap(blob);
      else{url=URL.createObjectURL(blob);img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});}
      const sw=img.width||img.naturalWidth,sh=img.height||img.naturalHeight;
      const sx=Math.round(sw*crop.x),sy=Math.round(sh*crop.y),cw=Math.max(1,Math.round(sw*crop.w)),ch=Math.max(1,Math.round(sh*crop.h));
      const targetW=1100,scale=Math.min(2,Math.max(.4,targetW/cw)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(cw*scale));c.height=Math.max(1,Math.round(ch*scale));
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,sx,sy,cw,ch,0,0,c.width,c.height);
      try{
        const d=ctx.getImageData(0,0,c.width,c.height),p=d.data;let min=255,max=0,sum=0;
        for(let i=0;i<p.length;i+=4){const g=Math.round(p[i]*.299+p[i+1]*.587+p[i+2]*.114);if(g<min)min=g;if(g>max)max=g;sum+=g;p[i]=p[i+1]=p[i+2]=g;}
        const mean=sum/(p.length/4),span=Math.max(55,max-min),thr=clamp(mean-8,85,190);
        for(let i=0;i<p.length;i+=4){let g=clamp(Math.round((p[i]-min)*255/span),0,255);if(thresholdMode)g=g<thr?0:255;p[i]=p[i+1]=p[i+2]=g;}
        ctx.putImageData(d,0,0);
      }catch(e){}
      return c;
    }finally{if(img&&img.close)try{img.close();}catch(e){}if(url)URL.revokeObjectURL(url);}
  }

  function extractCandidates(data,cropName,variant,previous){
    const out=[];const seen=new Set();
    function add(raw,confidence,origin){
      const only=txt(raw).replace(/\D/g,'');if(!only)return;
      const seq=[];
      if(only.length===5||only.length===7)seq.push(only);
      if(only.length>7){for(let i=0;i<=only.length-5;i++){const s5=only.slice(i,i+5);if(s5.length===5)seq.push(s5);}for(let i=0;i<=only.length-7;i++){const s7=only.slice(i,i+7);if(s7.length===7)seq.push(s7);}}
      seq.forEach(d=>{if(seen.has(d))return;seen.add(d);const r=readingFromDigits(d);if(!r)return;let plaus=0;if(previous!=null&&Number.isFinite(Number(previous))){const use=r.value-Number(previous);if(use<0)plaus-=200;else if(use<=80)plaus+=55;else if(use<=200)plaus+=25;else if(use<=500)plaus+=5;else plaus-=35;}out.push(Object.assign(r,{confidence:Number(confidence||0),crop:cropName,variant,origin,plaus}));});
    }
    (data&&Array.isArray(data.words)?data.words:[]).forEach(w=>add(w&&w.text,w&&w.confidence,'word'));
    const text=txt(data&&data.text);(text.match(/\d[\d\s.,-]{3,12}\d/g)||[]).forEach(x=>add(x,data&&data.confidence,'text'));add(text,data&&data.confidence,'all');
    return out;
  }

  async function recognizeConsensus(blob,previous){
    const w=await ensureWorker();const all=[];
    for(let i=0;i<CROPS.length;i++){
      const crop=CROPS[i];
      for(const thresholdMode of [false,true]){
        const c=await imageCanvas(blob,crop,thresholdMode);
        await w.setParameters({tessedit_pageseg_mode:crop.psm});
        const res=await w.recognize(c),data=res&&res.data?res.data:{};
        all.push(...extractCandidates(data,crop.name,thresholdMode?'bw':'gray',previous));
      }
    }
    const groups=new Map();
    all.forEach(c=>{
      const key=c.raw;let g=groups.get(key);if(!g){g={raw:key,items:[],crops:new Set(),variants:new Set()};groups.set(key,g);}g.items.push(c);g.crops.add(c.crop);g.variants.add(c.variant);
    });
    const ranked=[];
    groups.forEach(g=>{
      const best=g.items.slice().sort((a,b)=>(b.confidence+b.plaus)-(a.confidence+a.plaus))[0];
      const avg=g.items.reduce((s,x)=>s+x.confidence,0)/g.items.length;
      const votes=g.crops.size;
      const score=votes*100+g.variants.size*20+avg+best.plaus;
      ranked.push(Object.assign({},best,{votes,avgConfidence:avg,score,samples:g.items.length}));
    });
    ranked.sort((a,b)=>b.score-a.score);
    const top=ranked[0]||null,second=ranked[1]||null;
    if(!top)return {accepted:null,candidates:[]};
    const clearLead=!second||(top.score-second.score)>=40;
    const validUse=previous==null||top.value>=Number(previous);
    const accepted=(top.votes>=2&&top.avgConfidence>=35&&clearLead&&validUse)?top:null;
    return {accepted,candidates:ranked.slice(0,5)};
  }

  function previousForMeter(meter){const x=previousMap[meterKey(meter)];return x&&Number.isFinite(Number(x.value))?Number(x.value):null;}

  function jsonp(url,cbPrefix,timeoutMs){
    return new Promise((resolve,reject)=>{const cb=cbPrefix+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');let done=false;const finish=(err,data)=>{if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){}if(s.parentNode)s.parentNode.removeChild(s);err?reject(err):resolve(data);};window[cb]=d=>finish(null,d);s.onerror=()=>finish(new Error('network'));const timer=setTimeout(()=>finish(new Error('timeout')),timeoutMs||10000);s.src=url.replace('__CB__',encodeURIComponent(cb));document.head.appendChild(s);});
  }

  async function fetchServerResult(clientId){
    const q="select F,G,H,I,N,O,P,Q,S,U where S = '"+String(clientId).replace(/'/g,"''")+"' limit 1";
    const url='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(RESULT_SHEET)+'&headers=1&tqx=responseHandler:__CB__&tq='+encodeURIComponent(q)+'&_='+Date.now();
    const data=await jsonp(url,'__waterAiR121_',9000),row=data&&data.table&&data.table.rows&&data.table.rows[0];if(!row)return null;
    const c=row.c||[];const val=i=>c[i]?(c[i].f!=null?c[i].f:c[i].v):'';
    const meter=txt(val(0)),old=Number(String(val(1)).replace(',','.')),current=Number(String(val(2)).replace(',','.')),use=Number(String(val(3)).replace(',','.')),confidence=Number(String(val(4)).replace(',','.')),status=txt(val(5)),note=txt(val(6)),aiResult=txt(val(7)),cid=txt(val(8)),aiStatus=txt(val(9));
    if(cid!==String(clientId)||!Number.isFinite(current))return null;
    if(/cho ai|chờ ai|dang xu ly|đang xử lý/i.test((status+' '+aiStatus).toLowerCase()))return null;
    return {meter,old:Number.isFinite(old)?old:null,current,use:Number.isFinite(use)?use:null,confidence:Number.isFinite(confidence)?confidence:null,status,note,aiResult,aiStatus};
  }

  function startServerPoll(record){
    if(!navigator.onLine||!record||!record.clientId)return;
    const id=String(record.clientId);if(serverPollers.has(id))return;
    const started=Date.now();let stopped=false;
    async function tick(){
      if(stopped)return;
      if(Date.now()-started>SERVER_POLL_MAX_MS){serverPollers.delete(id);return;}
      if(!navigator.onLine){setTimeout(tick,SERVER_POLL_MS);return;}
      try{
        const r=await fetchServerResult(id);
        if(r){
          stopped=true;serverPollers.delete(id);
          const old=r.old!=null?r.old:previousForMeter(record.meter),use=r.use!=null?r.use:(old==null?null:r.current-old);
          record.liveReading=r.current;record.liveReadingRaw=String(r.current);record.liveReadingConfidence=r.confidence==null?'':r.confidence;record.liveReadingSource='SERVER_GEMINI_R12.1';record.liveReadingAt=new Date().toISOString();record.previousReading=old;record.consumption=use;
          if(coreDbPut)coreDbPut(record).catch(()=>{});
          if(lastResult&&lastResult.record&&String(lastResult.record.clientId)===id&&!lastResult.manual){lastResult={record,reading:{value:r.current,display:fmt(r.current),raw:String(r.current),source:'SERVER_GEMINI_R12.1'},old,use,manual:false};render(old!=null&&use<0?'r121warn':'r121ok',fmt(r.current),old==null?'--':fmt(old),use==null?'--':fmt(use)+' m³','✓ AI máy chủ đã xác nhận kết quả.');}
          return;
        }
      }catch(e){}
      setTimeout(tick,SERVER_POLL_MS);
    }
    serverPollers.set(id,{stop:()=>{stopped=true;}});setTimeout(tick,1200);
  }

  async function processRecord(record){
    if(!record||!record.image||!record.clientId)return;
    const id=String(record.clientId),old=previousForMeter(record.meter);
    render('', 'Đang đọc…',old==null?'--':fmt(old),'--','Đã lưu ảnh · đang đối chiếu nhiều vùng ảnh, không nhận một kết quả đơn lẻ.');
    startServerPoll(record);
    try{
      const result=await recognizeConsensus(record.image,old),r=result.accepted;
      if(!r)throw new Error('OCR nội bộ chưa đủ đồng thuận.');
      const use=old==null?null:r.value-old,warn=old!=null&&use<0;
      record.liveReading=r.value;record.liveReadingRaw=r.raw;record.liveReadingConfidence=clamp(Number(r.avgConfidence||0)/100,0,1);record.liveReadingSource='POST_CAPTURE_LOCAL_CONSENSUS_R12.1';record.liveReadingAt=new Date().toISOString();record.liveReadingFormat=r.format;record.previousReading=old;record.consumption=use;
      if(coreDbPut)await coreDbPut(record);
      lastResult={record,reading:r,old,use,manual:false};
      render(warn?'r121warn':'r121ok',fmt(r.value),old==null?'--':fmt(old),use==null?'--':fmt(use)+' m³',(navigator.onLine?'Tạm đọc trên máy ('+r.votes+' vùng đồng thuận) · đang chờ AI máy chủ xác nhận.':'OCR offline: '+r.votes+' vùng đồng thuận · kết quả lưu trên máy.'));
    }catch(e){
      lastResult={record,reading:null,old,use:null,manual:false};
      render('r121warn','CẦN KIỂM TRA',old==null?'--':fmt(old),'--',(navigator.onLine?'Không nhận kết quả OCR đơn lẻ để tránh đọc sai · đang chờ AI máy chủ xác nhận.':'Ảnh đã lưu. OCR offline chưa đủ chắc chắn; dùng SỬA hoặc chờ có mạng.'));
    }
  }

  function editLast(){
    if(!lastResult||!lastResult.record)return;
    const seed=lastResult.reading?lastResult.reading.display:'';const input=window.prompt('Nhập lại chỉ số mới:',seed);if(input===null)return;
    const r=readingFromManual(input);if(!r){alert('Chỉ số chưa đúng. Ví dụ: 00649 hoặc 0051.350');return;}
    const record=lastResult.record,old=previousForMeter(record.meter),use=old==null?null:r.value-old;
    record.liveReading=r.value;record.liveReadingRaw=r.raw;record.liveReadingConfidence=1;record.liveReadingSource='POST_CAPTURE_MANUAL_R12.1';record.liveReadingAt=new Date().toISOString();record.liveReadingFormat=r.format;record.previousReading=old;record.consumption=use;
    if(coreDbPut)coreDbPut(record).catch(()=>{});lastResult={record,reading:r,old,use,manual:true};
    render(old!=null&&use<0?'r121warn':'r121ok',fmt(r.value),old==null?'--':fmt(old),use==null?'--':fmt(use)+' m³','Đã sửa thủ công · giá trị này được giữ, AI máy chủ không tự ghi đè màn hình.');
  }

  function refreshPreviousReadings(){
    if(!navigator.onLine)return;
    const cb='__waterPrevR121_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');let done=false;
    const finish=()=>{if(done)return;done=true;try{delete window[cb];}catch(e){}if(s.parentNode)s.parentNode.removeChild(s);};
    window[cb]=data=>{try{const table=data&&data.table;if(!table||!Array.isArray(table.rows))return;const labels=(table.cols||[]).map(c=>norm(c&&(c.label||c.id)||''));let meterIdx=labels.findIndex(x=>/ma can ho|ma dong ho|ma dh|can ho/.test(x));let readIdx=labels.findIndex(x=>/chi so/.test(x)&&!/kiem tra|danh gia/.test(x));let periodIdx=labels.findIndex(x=>/ky ap dung|ky ghi|thang|ky/.test(x));if(meterIdx<0)meterIdx=1;if(readIdx<0)readIdx=2;const next={...previousMap};table.rows.forEach(row=>{const cells=row&&row.c||[],code=meterKey(cells[meterIdx]&&(cells[meterIdx].f!=null?cells[meterIdx].f:cells[meterIdx].v));if(!code)return;const raw=cells[readIdx]&&(cells[readIdx].f!=null?cells[readIdx].f:cells[readIdx].v),value=Number(String(raw==null?'':raw).replace(',','.'));if(!Number.isFinite(value))return;const period=periodIdx>=0?txt(cells[periodIdx]&&(cells[periodIdx].f!=null?cells[periodIdx].f:cells[periodIdx].v)):'';const rank=periodRank(period),old=next[code];if(!old||rank>=Number(old.rank||0))next[code]={value,period,rank};});previousMap=next;savePreviousCache();renderEngine('✓ Đã lưu chỉ số cũ trên máy · sẵn sàng dùng khi mất mạng.');}catch(e){}finally{finish();}};
    s.onerror=finish;s.async=true;s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(PREVIOUS_SHEET)+'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)+'&tq='+encodeURIComponent('select *')+'&_='+Date.now();document.head.appendChild(s);setTimeout(finish,12000);
  }

  function enrichPayload(payload,records){const map=new Map((records||[]).map(r=>[String(r&&r.clientId||''),r]));(payload||[]).forEach(p=>{const r=map.get(String(p&&p.clientId||''));if(!r)return;p.liveReading=r.liveReading==null?'':r.liveReading;p.liveReadingRaw=r.liveReadingRaw||'';p.liveReadingConfidence=r.liveReadingConfidence==null?'':r.liveReadingConfidence;p.liveReadingSource=r.liveReadingSource||'';p.liveReadingAt=r.liveReadingAt||'';p.liveReadingFormat=r.liveReadingFormat||'';p.previousReading=r.previousReading==null?'':r.previousReading;p.consumption=r.consumption==null?'':r.consumption;});return payload;}

  function installHooks(){
    if(window.WATER_R121_POSTCAPTURE_HOOKED_V2)return;
    if(typeof window.dbPut!=='function'){setTimeout(installHooks,120);return;}
    coreDbPut=window.dbPut;coreTurbo=typeof window.turboBuildPayload==='function'?window.turboBuildPayload:null;
    window.dbPut=function(record){const result=coreDbPut.apply(this,arguments);if(record&&record.image&&record.clientId&&!record.liveReadingSource){const id=String(record.clientId);const task=Promise.resolve(result).then(()=>processRecord(record)).catch(()=>{}).finally(()=>pendingOcr.delete(id));pendingOcr.set(id,task);}return result;};
    if(coreTurbo){window.turboBuildPayload=async function(records){const waits=(records||[]).map(r=>pendingOcr.get(String(r&&r.clientId||''))).filter(Boolean);if(waits.length)await Promise.race([Promise.allSettled(waits),sleep(OCR_WAIT_FOR_SYNC_MS)]);const payload=await coreTurbo.call(this,records);return enrichPayload(payload,records);};}
    window.WATER_R121_POSTCAPTURE_HOOKED_V2=true;
  }

  function boot(){ensureUI();installHooks();refreshPreviousReadings();if(navigator.onLine){renderEngine('Đang chuẩn bị OCR nội bộ + AI máy chủ…');ensureWorker().catch(()=>renderEngine('OCR nội bộ chưa tải được; ảnh vẫn lưu và AI máy chủ sẽ xử lý.'));}else renderEngine(worker?'✓ OCR nội bộ sẵn sàng OFFLINE.':'OFFLINE · ảnh vẫn lưu; OCR chỉ đọc nếu bộ nhận dạng đã tải trước.');}
  window.addEventListener('online',()=>{refreshPreviousReadings();ensureWorker().catch(()=>{});});
  window.addEventListener('beforeunload',()=>{try{if(worker)worker.terminate();}catch(e){}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.WATER_POSTCAPTURE_READING_BUILD=BUILD;
})();