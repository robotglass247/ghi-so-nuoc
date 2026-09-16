/* R11.35 DEV ONLY - XEM + TAI FILE dung CHUNG 1 nguon TAI_CHI_SO_THANG.
   XEM: B:I (co cot anh). TAI: B:H (bo cot anh).
   Khong sua Project/Capture/Camera/QR/Queue/System File. */
(function(){
  'use strict';

  const BUILD='r1135-manage-unified-data-v1';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='TAI_CHI_SO_THANG';
  const DATA_RANGE='A3:J40000';
  const MONTH_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const DOWNLOAD_IDS=['waterDownloadR119','waterDownloadR118'];
  const VIEW_IDS=['waterViewR119','waterViewR118'];
  const STATUS_IDS=['waterExportR119Status','waterExportR118Status'];
  let busy=false;

  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function cell(row,i){const c=row&&row.c&&row.c[i];return c?(c.f!=null?c.f:c.v):'';}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function byIds(ids){for(const id of ids){const n=document.getElementById(id);if(n)return n;}return null;}
  function monthSelect(){return byIds(MONTH_IDS);}
  function periodNow(){const s=monthSelect();return txt(s&&s.value);}
  function status(message,kind){const n=byIds(STATUS_IDS);if(!n)return;n.className=kind||'';n.textContent=message||'';}
  function setBusy(on){busy=!!on;const d=byIds(DOWNLOAD_IDS),v=byIds(VIEW_IDS);[d,v].forEach(function(n){if(!n)return;n.style.opacity=on?'.55':'';n.setAttribute('aria-busy',on?'true':'false');});}

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterUnified_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu tháng.'));},20000);
      function finish(err,data){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);err?reject(err):resolve(data);}
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
    const q="select B,C,D,E,F,G,H,I,J where J = '"+safe+"'";
    const data=await jsonp(q);
    const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
    // Khoa an toan lan 2: chi nhan dung ky dang chon, ke ca khi Google tra du lieu du.
    return rows.filter(function(r){return txt(cell(r,8))===period;});
  }

  function findButtonFrom(node,kind){
    let el=node&&node.nodeType===1?node:null;
    while(el&&el!==document.documentElement){
      if(kind==='download'&&DOWNLOAD_IDS.indexOf(el.id)>=0)return el;
      if(kind==='view'&&VIEW_IDS.indexOf(el.id)>=0)return el;
      const label=norm(el.innerText||el.textContent||el.getAttribute('aria-label')||'');
      if(kind==='download'&&label==='tai file')return el;
      if(kind==='view'&&label==='xem chi so')return el;
      el=el.parentElement;
    }
    return null;
  }

  function needOnline(){
    status('Cần kết nối Internet để sử dụng chức năng này.','err');
  }

  function writeViewShell(win,period){
    if(!win)return;
    try{
      win.document.open();
      win.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số '+esc(period)+'</title></head><body style="font-family:Arial,sans-serif;padding:20px;text-align:center"><b>Đang tải dữ liệu tháng '+esc(period)+'...</b></body></html>');
      win.document.close();
    }catch(e){}
  }

  function renderView(win,period,rows){
    const head=['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ'];
    let body='';
    rows.forEach(function(r,i){
      const vals=[];for(let c=0;c<8;c++)vals.push(txt(cell(r,c)));
      body+='<tr><td>'+(i+1)+'</td>'
        +'<td>'+esc(vals[0])+'</td><td>'+esc(vals[1])+'</td><td>'+esc(vals[2])+'</td><td>'+esc(vals[3])+'</td>'
        +'<td>'+esc(vals[4])+'</td><td>'+esc(vals[5])+'</td><td>'+esc(vals[6])+'</td>'
        +'<td>'+(vals[7]?'<a href="'+esc(vals[7])+'" target="_blank" rel="noopener">XEM ẢNH</a>':'')+'</td></tr>';
    });
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chỉ số nước '+esc(period)+'</title>'
      +'<style>body{font-family:Arial,sans-serif;margin:0;background:#f5f7fa;color:#18232d}.wrap{padding:14px}.title{text-align:center;font-weight:900;font-size:18px;margin:4px 0 6px}.sub{text-align:center;font-size:12px;margin-bottom:12px;color:#5c6873}.tableWrap{overflow:auto;background:#fff;border:1px solid #dfe5ea;border-radius:10px}table{border-collapse:collapse;width:100%;min-width:900px}th,td{border-bottom:1px solid #e6eaed;border-right:1px solid #eef1f3;padding:8px 7px;font-size:12px;text-align:center;white-space:nowrap}th{position:sticky;top:0;background:#eef2f5;font-weight:900}td a{font-weight:900;color:#225b91}.back{display:block;width:100%;max-width:320px;margin:14px auto 0;padding:11px;border:1px solid #aab3bc;border-radius:9px;background:#fff;font-weight:800}</style></head><body>'
      +'<div class="wrap"><div class="title">CHỈ SỐ NƯỚC THÁNG '+esc(period)+'</div><div class="sub">Nguồn: TAI_CHI_SO_THANG • '+rows.length+' dòng</div>'
      +'<div class="tableWrap"><table><thead><tr>'+head.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>'
      +'<button class="back" onclick="window.close()">← QUAY LẠI ỨNG DỤNG</button></div></body></html>';
    win.document.open();win.document.write(html);win.document.close();
  }

  function loadXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise(function(resolve,reject){
      const urls=['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'];
      let i=0;
      function next(){
        if(window.XLSX){resolve(window.XLSX);return;}
        if(i>=urls.length){reject(new Error('Không tải được thư viện Excel.'));return;}
        const s=document.createElement('script');s.src=urls[i++];s.async=true;s.onload=function(){window.XLSX?resolve(window.XLSX):next();};s.onerror=next;document.head.appendChild(s);
      }
      next();
    });
  }

  function safeFile(v){return txt(v).replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_').replace(/^_+|_+$/g,'');}

  async function doDownload(period){
    const rows=await loadPeriod(period);
    if(!rows.length)throw new Error('Không có dữ liệu của tháng '+period+'.');
    const XLSX=await loadXlsx();
    const aoa=[['CHỈ SỐ NƯỚC THÁNG '+period,'','','','','','',''],['','','','','','','',''],['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³']];
    rows.forEach(function(r,i){const vals=[];for(let c=0;c<7;c++)vals.push(txt(cell(r,c)));aoa.push([String(i+1)].concat(vals));});
    const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:7}}];ws['!cols']=[{wch:7},{wch:12},{wch:10},{wch:14},{wch:18},{wch:17},{wch:17},{wch:14}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,('CHI_SO_'+period.replace('/','_')).slice(0,31));
    const fileName='CHI_SO_NUOC_'+safeFile(period.replace('/','-'))+'.xlsx';
    XLSX.writeFile(wb,fileName,{compression:true});
    status('Đã tải đúng dữ liệu tháng '+period+' • '+rows.length+' dòng.','ok');
  }

  async function doView(period,win){
    const rows=await loadPeriod(period);
    if(!rows.length)throw new Error('Không có dữ liệu của tháng '+period+'.');
    renderView(win,period,rows);
    status('Đang xem đúng dữ liệu tháng '+period+' • '+rows.length+' dòng.','ok');
  }

  document.addEventListener('click',function(ev){
    const d=findButtonFrom(ev.target,'download');
    const v=d?null:findButtonFrom(ev.target,'view');
    if(!d&&!v)return;

    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    if(busy)return false;
    if(navigator.onLine===false){needOnline();return false;}

    const period=periodNow();
    if(!/^\d{1,2}\/\d{4}$/.test(period)){status('Anh chọn tháng cần xem/tải trước.','err');return false;}

    if(v){
      const win=window.open('','_blank');
      if(!win){status('Trình duyệt đang chặn cửa sổ XEM CHỈ SỐ.','err');return false;}
      writeViewShell(win,period);
      setBusy(true);status('Đang đọc dữ liệu tháng '+period+'...','');
      doView(period,win).catch(function(e){try{win.document.body.innerHTML='<div style="padding:24px;font:700 15px Arial;color:#a23a2a">'+esc(e&&e.message||'Không xem được dữ liệu.')+'</div>';}catch(_e){}status(txt(e&&e.message)||'Không xem được dữ liệu.','err');}).finally(function(){setBusy(false);});
      return false;
    }

    setBusy(true);status('Đang tạo file tháng '+period+'...','');
    doDownload(period).catch(function(e){status(txt(e&&e.message)||'Không tải được file.','err');}).finally(function(){setBusy(false);});
    return false;
  },true);

  window.WATER_MANAGE_UNIFIED_DATA_BUILD=BUILD;
})();
