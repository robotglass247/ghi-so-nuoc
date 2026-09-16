/* DEV ONLY - TAI FILE theo dung thang dang chon, cung nguon TAI_CHI_SO_THANG.
   V4: file chi co du lieu A:H; an toan bo cot I:XFD va bat cellStyles de SheetJS ghi metadata an cot vao XLSX. */
(function(){
  'use strict';

  const BUILD='r1135-download-v4-hide-after-h-cellstyles';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='TAI_CHI_SO_THANG';
  const DATA_RANGE='A3:J40000';
  const MONTH_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const DOWNLOAD_IDS=['waterDownloadR119','waterDownloadR118'];
  const STATUS_IDS=['waterExportR119Status','waterExportR118Status'];
  let busy=false;

  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function cell(row,i){const c=row&&row.c&&row.c[i];return c?(c.f!=null?c.f:c.v):'';}
  function byIds(ids){for(const id of ids){const n=document.getElementById(id);if(n)return n;}return null;}
  function periodNow(){const s=byIds(MONTH_IDS);return txt(s&&s.value);}
  function status(message,kind){const n=byIds(STATUS_IDS);if(!n)return;n.className=kind||'';n.textContent=message||'';}

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

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterDownloadV4_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu tháng.'));},20000);
      function finish(err,data){
        if(done)return;done=true;clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        err?reject(err):resolve(data);
      }
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không đọc được dữ liệu tháng.'));};
      s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(DATA_SHEET)
        +'&range='+encodeURIComponent(DATA_RANGE)
        +'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent(query)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function loadPeriod(period){
    const safe=period.replace(/'/g,"''");
    const data=await jsonp("select B,C,D,E,F,G,H,J where J = '"+safe+"'");
    const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
    return rows.filter(function(r){return txt(cell(r,7))===period;});
  }

  function loadXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise(function(resolve,reject){
      const urls=['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'];
      let i=0;
      function next(){
        if(window.XLSX){resolve(window.XLSX);return;}
        if(i>=urls.length){reject(new Error('Không tải được thư viện Excel.'));return;}
        const s=document.createElement('script');
        s.src=urls[i++];s.async=true;
        s.onload=function(){window.XLSX?resolve(window.XLSX):next();};
        s.onerror=next;
        document.head.appendChild(s);
      }
      next();
    });
  }

  function safeFile(v){return txt(v).replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_').replace(/^_+|_+$/g,'');}

  function pageBase(title,content){
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      +'<title>'+esc(title)+'</title>'
      +'<style>html,body{margin:0;min-height:100%;background:#f5f7fa;color:#18232d;font-family:Arial,sans-serif}.wrap{max-width:520px;margin:0 auto;padding:32px 18px;text-align:center}.card{background:#fff;border:1px solid #dfe5ea;border-radius:14px;padding:28px 18px;box-shadow:0 4px 18px rgba(0,0,0,.06)}h1{font-size:20px;margin:0 0 12px}.msg{font-size:14px;line-height:1.5;margin:8px 0 18px}.back{display:block;width:100%;max-width:300px;margin:18px auto 0;padding:12px 16px;border:1px solid #9ea9b3;border-radius:9px;background:#fff;color:#18232d;font-weight:800;font-size:14px}.ok{font-weight:900;color:#237346}.err{font-weight:900;color:#a23a2a}</style>'
      +'</head><body><div class="wrap"><div class="card">'+content+'</div></div></body></html>';
  }

  function writeLoading(win,period){
    if(!win)return;
    try{
      win.document.open();
      win.document.write(pageBase('Tải file chỉ số '+period,'<h1>TẢI FILE CHỈ SỐ NƯỚC</h1><div class="msg"><b>Đang tạo file tháng '+esc(period)+'...</b></div>'));
      win.document.close();
    }catch(e){}
  }

  function renderDone(win,period,rowCount,fileName){
    if(!win)return;
    try{
      const content='<h1>TẢI FILE CHỈ SỐ NƯỚC</h1>'
        +'<div class="msg ok">Đã tải file tháng '+esc(period)+' thành công.</div>'
        +'<div class="msg">'+rowCount+' dòng dữ liệu • File: '+esc(fileName)+'</div>'
        +'<button class="back" onclick="try{if(window.opener)window.opener.focus()}catch(e){};window.close()">← QUAY LẠI ỨNG DỤNG</button>';
      win.document.open();win.document.write(pageBase('Đã tải file '+period,content));win.document.close();
    }catch(e){}
  }

  function renderError(win,message){
    if(!win)return;
    try{
      const content='<h1>TẢI FILE CHỈ SỐ NƯỚC</h1>'
        +'<div class="msg err">'+esc(message||'Không tải được file.')+'</div>'
        +'<button class="back" onclick="try{if(window.opener)window.opener.focus()}catch(e){};window.close()">← QUAY LẠI ỨNG DỤNG</button>';
      win.document.open();win.document.write(pageBase('Không tải được file',content));win.document.close();
    }catch(e){}
  }

  async function createAndDownload(period,win){
    const rows=await loadPeriod(period);
    if(!rows.length)throw new Error('Không có dữ liệu của tháng '+period+'.');
    const XLSX=await loadXlsx();

    const aoa=[
      ['CHỈ SỐ NƯỚC THÁNG '+period,'','','','','','',''],
      ['','','','','','','',''],
      ['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³']
    ];
    rows.forEach(function(r,i){
      const vals=[];
      for(let c=0;c<7;c++)vals.push(txt(cell(r,c)));
      aoa.push([String(i+1)].concat(vals));
    });

    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:7}}];
    ws['!ref']='A1:H'+aoa.length;

    const cols=[{wch:7},{wch:12},{wch:10},{wch:14},{wch:18},{wch:17},{wch:17},{wch:14}];
    for(let c=8;c<16384;c++)cols[c]={hidden:true,wch:0};
    ws['!cols']=cols;

    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,('CHI_SO_'+period.replace('/','_')).slice(0,31));
    const fileName='CHI_SO_NUOC_'+safeFile(period.replace('/','-'))+'.xlsx';

    // cellStyles:true la bat buoc de SheetJS ghi thuoc tinh hidden cua cot vao file XLSX.
    XLSX.writeFile(wb,fileName,{compression:true,cellStyles:true});
    renderDone(win,period,rows.length,fileName);
    status('Đã tải đúng dữ liệu tháng '+period+' • '+rows.length+' dòng.','ok');
  }

  function onDownloadClick(ev){
    const btn=findDownload(ev.target);if(!btn)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    if(busy)return false;
    if(navigator.onLine===false){status('Cần kết nối Internet để Tải file.','err');return false;}

    const period=periodNow();
    if(!/^\d{1,2}\/\d{4}$/.test(period)){status('Anh chọn tháng cần tải trước.','err');return false;}

    const win=window.open('','_blank');
    if(!win){status('Trình duyệt đang chặn tab báo TẢI FILE.','err');return false;}
    writeLoading(win,period);
    busy=true;status('Đang tạo file tháng '+period+'...','');
    createAndDownload(period,win)
      .catch(function(e){const m=txt(e&&e.message)||'Không tải được file.';renderError(win,m);status(m,'err');})
      .finally(function(){busy=false;});
    return false;
  }

  window.addEventListener('click',onDownloadClick,true);
  window.WATER_MANAGE_DOWNLOAD_BUILD=BUILD;
})();