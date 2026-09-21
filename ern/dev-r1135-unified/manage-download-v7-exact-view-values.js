/* DEV ONLY - TAI FILE / XEM FILE
   V18.3 ERN FRESH DATA
   - Giữ nguồn dữ liệu Apps Script api=monthdata.
   - Không dùng GViz vì Google Sheet đang để Hạn chế.
   - TẢI FILE luôn đọc mới từ backend, không dùng cache cũ của tháng.
   - XEM FILE hiển thị dữ liệu đúng lần tải mới nhất.
*/
(function(){
  'use strict';

  const BUILD='r1135-download-v7-api-monthdata-v18.3-ern-fresh';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbwoAdo6eDn_4sJkhnIVAwEmf5IEi15zsLSduKmpg02l7ZcRBYO27fE4HCuXUJUNp0g/exec';

  const MONTH_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const DOWNLOAD_IDS=['waterDownloadR119','waterDownloadR118'];
  const STATUS_IDS=['waterExportR119Status','waterExportR118Status'];

  let busy=false;
  let xlsxPreloadPromise=null;
  const periodPromises=Object.create(null);

  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function cobj(row,i){return row&&row.c&&row.c[i]?row.c[i]:null;}
  function displayCell(row,i){const c=cobj(row,i);return c?(c.f!=null?c.f:c.v):'';}
  function rawCell(row,i){const c=cobj(row,i);return c?(c.v!=null?c.v:(c.f!=null?c.f:'')):'';}
  function byIds(ids){for(const id of ids){const n=document.getElementById(id);if(n)return n;}return null;}
  function periodNow(){const s=byIds(MONTH_IDS);return txt(s&&s.value);}
  function status(message,kind){const n=byIds(STATUS_IDS);if(!n)return;n.className=kind||'';n.textContent=message||'';}

  function syncDownloadButton(){
    const btn=byIds(DOWNLOAD_IDS),period=periodNow();
    if(!btn||!/^\d{1,2}\/\d{4}$/.test(period))return;
    try{btn.disabled=false;}catch(e){}
    btn.removeAttribute('disabled');btn.removeAttribute('aria-disabled');
    if(btn.classList)btn.classList.remove('disabled');
  }

  function findDownload(node){
    let el=node&&node.nodeType===1?node:null;
    while(el&&el!==document.documentElement){
      if(DOWNLOAD_IDS.indexOf(el.id)>=0)return el;
      const label=norm(el.innerText||el.textContent||el.getAttribute('aria-label')||'');
      if(label==='tai file')return el;
      el=el.parentElement;
    }
    return null;
  }

  function rowsFromApi(data,period){
    if(!data||data.ok!==true||!Array.isArray(data.rows))return [];
    return data.rows.map(function(a){
      a=Array.isArray(a)?a:[];
      if(a.length>=10)a=a.slice(1,10);
      else if(a.length>=9)a=a.slice(0,9);
      return {c:a.map(function(v){return {v:v};})};
    }).filter(function(r){return txt(displayCell(r,8))===period;});
  }

  function backendPeriodOnce(period,attempt){
    return new Promise(function(resolve,reject){
      const cb='__waterDownloadApi183_'+Date.now()+'_'+attempt+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu tháng.'));},10000);
      function finish(err,data){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);err?reject(err):resolve(data);}
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không đọc được dữ liệu tháng từ Web App.'));};
      s.src=BACKEND_URL+'?api=monthdata&period='+encodeURIComponent(period)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function backendPeriod(period){
    let lastError=null;
    for(let attempt=1;attempt<=2;attempt++){
      try{
        const data=await backendPeriodOnce(period,attempt);
        if(data&&data.ok===true&&Array.isArray(data.rows))return data;
        lastError=new Error(txt(data&&data.error)||'Không đọc được dữ liệu tháng.');
      }catch(e){lastError=e;}
      if(attempt<2)await new Promise(function(resolve){setTimeout(resolve,350);});
    }
    throw(lastError||new Error('Không đọc được dữ liệu tháng.'));
  }

  function loadPeriod(period){
    if(periodPromises[period])return periodPromises[period];
    periodPromises[period]=(async function(){
      const api=await backendPeriod(period);
      return rowsFromApi(api,period);
    })().finally(function(){delete periodPromises[period];});
    return periodPromises[period];
  }

  function loadXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    if(xlsxPreloadPromise)return xlsxPreloadPromise;
    xlsxPreloadPromise=new Promise(function(resolve,reject){
      const urls=['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'];let i=0;
      function next(){
        if(window.XLSX){resolve(window.XLSX);return;}
        if(i>=urls.length){xlsxPreloadPromise=null;reject(new Error('Không tải được thư viện Excel.'));return;}
        const s=document.createElement('script');s.src=urls[i++];s.async=true;s.onload=function(){window.XLSX?resolve(window.XLSX):next();};s.onerror=next;document.head.appendChild(s);
      }
      next();
    });
    return xlsxPreloadPromise;
  }

  function safeFile(v){return txt(v).replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_').replace(/^_+|_+$/g,'');}
  function stamp(){const d=new Date(),p=function(n){return String(n).padStart(2,'0');};return p(d.getHours())+p(d.getMinutes())+p(d.getSeconds());}

  function pageBase(title,content){
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>'+esc(title)+'</title>'+
      '<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;min-height:100vh;min-height:100dvh;background:#f5f7fa;color:#18232d;font-family:Arial,sans-serif}body{display:grid;place-items:center;padding:18px;overflow:auto}.wrap{width:88vw;max-width:680px;margin:auto}.card{width:100%;background:#fff;border:1px solid #d9e0e6;border-radius:22px;padding:42px 28px;box-shadow:0 10px 34px rgba(0,0,0,.10);text-align:center}h1{font-size:clamp(26px,6vw,36px);line-height:1.2;margin:0 0 18px;font-weight:900}.msg{font-size:clamp(17px,4.2vw,21px);line-height:1.55;margin:12px 0 22px}.ok{font-weight:900;color:#237346}.err{font-weight:900;color:#a23a2a}.actions{display:grid;grid-template-columns:1fr;gap:14px;margin-top:26px}.btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:58px;padding:14px 18px;border:1px solid #9ea9b3;border-radius:12px;background:#fff;color:#18232d;font-weight:900;font-size:17px;text-decoration:none}.btn.primary{background:#225b91;border-color:#225b91;color:#fff}.spin{width:52px;height:52px;margin:0 auto 24px;border:5px solid #d8e1e8;border-top-color:#225b91;border-radius:50%;animation:waterSpin .72s linear infinite}@keyframes waterSpin{to{transform:rotate(360deg)}}@media(min-width:700px){.actions.two{grid-template-columns:1fr 1fr}}</style></head><body><div class="wrap"><div class="card">'+content+'</div></div></body></html>';
  }

  function writeLoading(win,period){
    if(!win)return;
    try{win.document.open();win.document.write(pageBase('Đang tải file','<div class="spin"></div><h1>ĐANG TẢI FILE</h1><div class="msg">Đang lấy dữ liệu mới nhất tháng <b>'+esc(period)+'</b>.<br>Vui lòng chờ trong giây lát...</div>'));win.document.close();try{win.focus();}catch(_e){}}catch(e){}
  }

  function buildPreviewHtml(period,rows){
    const head=['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³'];let body='';
    rows.forEach(function(r,i){body+='<tr><td>'+(i+1)+'</td>';for(let c=0;c<7;c++)body+='<td>'+esc(displayCell(r,c))+'</td>';body+='</tr>';});
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Chỉ số nước tháng '+esc(period)+'</title>'+
      '<style>*{box-sizing:border-box}html,body{margin:0;width:100%;min-height:100%;background:#f5f7fa;color:#18232d;font-family:Arial,sans-serif}body{padding:18px 14px 28px}.wrap{width:100%;max-width:980px;margin:0 auto}.title{text-align:center;font-weight:900;font-size:clamp(22px,5vw,30px);line-height:1.25;margin:10px 0 20px}.tableWrap{width:100%;overflow:auto;background:#fff;border:1px solid #dfe5ea;border-radius:18px;box-shadow:0 4px 18px rgba(0,0,0,.06);-webkit-overflow-scrolling:touch}table{border-collapse:collapse;width:max-content;min-width:100%}th,td{border-bottom:1px solid #e6eaed;border-right:1px solid #eef1f3;padding:11px 14px;font-size:clamp(14px,3.7vw,18px);text-align:center;white-space:nowrap}th{position:sticky;top:0;background:#eef2f5;font-weight:900;z-index:2}tr:last-child td{border-bottom:0}.actions{display:flex;justify-content:center;margin:26px 0 0}.back{display:flex;align-items:center;justify-content:center;width:min(100%,440px);min-height:58px;padding:14px 20px;border:1px solid #aab3bc;border-radius:14px;background:#fff;color:#18232d;font-weight:900;font-size:clamp(16px,4vw,20px)}</style></head><body><div class="wrap"><div class="title">CHỈ SỐ NƯỚC THÁNG '+esc(period)+'</div><div class="tableWrap"><table><thead><tr>'+head.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table></div><div class="actions"><button id="waterPreviewBack" class="back">← QUAY LẠI ỨNG DỤNG</button></div></div><script>(function(){var b=document.getElementById("waterPreviewBack");if(b)b.onclick=function(){try{if(window.opener)window.opener.focus();}catch(e){}try{window.close();}catch(e){}};})();</'+'script></body></html>';
  }

  function renderDone(win,period,previewHtml){
    if(!win)return;
    try{
      const content='<h1>ĐÃ TẢI XONG</h1><div class="msg ok">File chỉ số nước tháng '+esc(period)+' đã được tải xuống thiết bị.</div><div class="actions two"><button id="waterViewDownloaded" class="btn primary">XEM FILE</button><button id="waterBackToApp" class="btn">← QUAY LẠI ỨNG DỤNG</button></div>';
      win.document.open();win.document.write(pageBase('Đã tải xong',content));win.document.close();win.__WATER_DOWNLOAD_PREVIEW_HTML=previewHtml||'';
      const viewBtn=win.document.getElementById('waterViewDownloaded');if(viewBtn)viewBtn.onclick=function(){try{const viewWin=win.open('about:blank','_blank');if(!viewWin)return;viewWin.document.open();viewWin.document.write(win.__WATER_DOWNLOAD_PREVIEW_HTML||'<p>Không có dữ liệu xem trước.</p>');viewWin.document.close();try{viewWin.focus();}catch(e){}}catch(e){}};
      const backBtn=win.document.getElementById('waterBackToApp');if(backBtn)backBtn.onclick=function(){try{if(win.opener)win.opener.focus();}catch(e){}try{win.close();}catch(e){}};
      try{win.focus();}catch(_e){}
    }catch(e){}
  }

  function renderError(win,message){
    if(!win)return;
    try{const content='<h1>KHÔNG TẢI ĐƯỢC FILE</h1><div class="msg err">'+esc(message||'Không tải được file.')+'</div><div class="actions"><button id="waterBackError" class="btn">← QUAY LẠI ỨNG DỤNG</button></div>';win.document.open();win.document.write(pageBase('Không tải được file',content));win.document.close();const b=win.document.getElementById('waterBackError');if(b)b.onclick=function(){try{if(win.opener)win.opener.focus();}catch(e){}try{win.close();}catch(e){}};try{win.focus();}catch(_e){}}catch(e){}
  }

  async function createAndDownload(period,win){
    const pair=await Promise.all([loadPeriod(period),loadXlsx()]);
    const rows=pair[0],XLSX=pair[1];
    if(!rows.length)throw new Error('Không có dữ liệu của tháng '+period+'.');
    const aoa=[['CHỈ SỐ NƯỚC THÁNG '+period,'','','','','','',''],['','','','','','','',''],['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³']];
    rows.forEach(function(r,i){aoa.push([i+1,displayCell(r,0),displayCell(r,1),displayCell(r,2),displayCell(r,3),rawCell(r,4),rawCell(r,5),rawCell(r,6)]);});
    const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:7}}];ws['!ref']='A1:H'+aoa.length;ws['!cols']=[{wch:7},{wch:12},{wch:10},{wch:14},{wch:18},{wch:17},{wch:17},{wch:14}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,('CHI_SO_'+period.replace('/','_')).slice(0,31));
    const fileName='CHI_SO_NUOC_'+safeFile(period.replace('/','-'))+'_'+stamp()+'.xlsx';XLSX.writeFile(wb,fileName,{cellStyles:true,compression:false});
    renderDone(win,period,buildPreviewHtml(period,rows));status('Đã tải dữ liệu mới nhất tháng '+period+' • '+rows.length+' dòng.','ok');
  }

  function onDownloadClick(ev){
    const btn=findDownload(ev.target);if(!btn)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    if(busy)return false;
    if(navigator.onLine===false){status('Cần kết nối Internet để Tải file.','err');return false;}
    const period=periodNow();if(!/^\d{1,2}\/\d{4}$/.test(period)){status('Anh chọn tháng cần tải trước.','err');return false;}
    const win=window.open('about:blank','_blank');if(!win){status('Trình duyệt đang chặn tab báo TẢI FILE.','err');return false;}
    writeLoading(win,period);busy=true;status('Đang tải dữ liệu mới nhất tháng '+period+'...','');
    createAndDownload(period,win).catch(function(e){const m=txt(e&&e.message)||'Không tải được file.';renderError(win,m);status(m,'err');}).finally(function(){busy=false;syncDownloadButton();});
    return false;
  }

  window.addEventListener('click',onDownloadClick,true);
  document.addEventListener('change',function(ev){if(ev.target&&MONTH_IDS.indexOf(ev.target.id)>=0)setTimeout(syncDownloadButton,0);},true);
  if('MutationObserver' in window)new MutationObserver(syncDownloadButton).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-disabled']});
  function warmup(){syncDownloadButton();if(navigator.onLine!==false)loadXlsx().catch(function(){});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',warmup,{once:true});else warmup();
  setTimeout(warmup,250);setTimeout(warmup,900);setInterval(syncDownloadButton,1500);
  window.WATER_MANAGE_DOWNLOAD_BUILD=BUILD;
})();
