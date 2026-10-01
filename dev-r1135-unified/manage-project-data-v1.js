/* V20 QUẢN LÝ - dữ liệu theo PROJECT_ID qua backend trung tâm.
 * XEM CHỈ SỐ + TẢI FILE dùng chung api=months / api=monthdata.
 * Không đọc Google Sheet bằng gviz, không gắn cứng SHEET_ID dự án.
 */
(function(){
  'use strict';

  const BUILD='v20-manage-project-data-v1';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const MONTH_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const DOWNLOAD_IDS=['waterDownloadR119','waterDownloadR118'];
  const VIEW_IDS=['waterViewR119','waterViewR118'];
  const STATUS_IDS=['waterExportR119Status','waterExportR118Status'];
  const ALL='TẤT CẢ';

  let busy=false;
  let monthsCache=[];
  let monthsBusy=false;
  const rowsCache={};

  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function projectId(){
    try{return txt(window.WATER_PROJECT_ID||new URLSearchParams(location.search).get('project')).toUpperCase();}
    catch(e){return txt(window.WATER_PROJECT_ID).toUpperCase();}
  }
  function byIds(ids){for(let i=0;i<ids.length;i++){const n=document.getElementById(ids[i]);if(n)return n;}return null;}
  function monthSelect(){return byIds(MONTH_IDS);}
  function periodNow(){const s=monthSelect();return txt(s&&s.value);}
  function status(message,kind){const n=byIds(STATUS_IDS);if(!n)return;n.className=kind||'';n.textContent=message||'';}
  function canonMonth(v){const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';}
  function monthScore(v){const m=canonMonth(v).match(/^(\d{2})\/(\d{4})$/);return m?Number(m[2])*12+Number(m[1]):0;}
  function sortMonths(list){
    const seen={},out=[];
    (list||[]).forEach(function(v){v=canonMonth(v);if(v&&!seen[v]){seen[v]=1;out.push(v);}});
    return out.sort(function(a,b){return monthScore(b)-monthScore(a);});
  }
  function safeFile(v){return txt(v).replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_').replace(/^_+|_+$/g,'');}

  function api(params,timeoutMs){
    return new Promise(function(resolve,reject){
      const project=projectId();
      if(!project){reject(new Error('Thiếu PROJECT_ID.'));return;}
      const cb='__waterManageProject_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu dự án '+project+'.'));},timeoutMs||20000);
      function finish(err,data){
        if(done)return;done=true;clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        err?reject(err):resolve(data);
      }
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không đọc được dữ liệu dự án '+project+'.'));};
      const q=new URLSearchParams();
      Object.keys(params||{}).forEach(function(k){q.set(k,String(params[k]));});
      q.set('project',project);
      q.set('projectId',project);
      q.set('callback',cb);
      q.set('_',String(Date.now()));
      s.src=BACKEND+'?'+q.toString();
      document.head.appendChild(s);
    });
  }

  async function loadMonths(force){
    if(monthsCache.length&&!force)return monthsCache.slice();
    if(monthsBusy){
      return new Promise(function(resolve){
        const t=setInterval(function(){if(!monthsBusy){clearInterval(t);resolve(monthsCache.slice());}},50);
        setTimeout(function(){clearInterval(t);resolve(monthsCache.slice());},10000);
      });
    }
    monthsBusy=true;
    try{
      const d=await api({api:'months'},15000);
      if(!d||d.ok!==true)throw new Error(txt(d&&d.error)||'Không lấy được danh sách tháng.');
      monthsCache=sortMonths(d.months||[]);
      return monthsCache.slice();
    }finally{monthsBusy=false;}
  }

  function populateMainMonthSelect(months){
    const s=monthSelect();if(!s||!months||!months.length)return;
    const before=canonMonth(s.value);
    const keep=months.indexOf(before)>=0?before:months[0];
    const sig=months.join('|');
    if(s.dataset.projectMonthsSig===sig&&canonMonth(s.value)===keep)return;
    s.innerHTML='';
    months.forEach(function(m){const o=document.createElement('option');o.value=m;o.textContent=m;s.appendChild(o);});
    s.value=keep;
    s.dataset.projectMonthsSig=sig;
  }

  async function refreshMonths(force){
    try{populateMainMonthSelect(await loadMonths(!!force));}
    catch(e){status(txt(e&&e.message)||'Không lấy được danh sách tháng.','err');}
  }

  function normalizeRows(data,period){
    if(!data||data.ok!==true||!Array.isArray(data.rows))throw new Error(txt(data&&data.error)||'Không lấy được dữ liệu tháng '+period+'.');
    return data.rows.map(function(a){
      a=Array.isArray(a)?a:[];
      return {
        tower:txt(a[0]),floor:txt(a[1]),apartment:txt(a[2]),meter:txt(a[3]),
        prev:txt(a[4]),current:txt(a[5]),use:txt(a[6]),image:txt(a[7]),period:canonMonth(a[8]||period)
      };
    }).filter(function(r){return r.meter&&r.period===period;});
  }

  async function loadPeriod(period,force){
    period=canonMonth(period);
    if(!period)throw new Error('Kỳ không hợp lệ.');
    if(rowsCache[period]&&!force)return rowsCache[period].slice();
    const d=await api({api:'monthdata',period:period},22000);
    const rows=normalizeRows(d,period);
    rowsCache[period]=rows;
    return rows.slice();
  }

  function findButton(node,kind){
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

  function loadXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise(function(resolve,reject){
      const urls=['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'];
      let i=0;
      function next(){
        if(window.XLSX){resolve(window.XLSX);return;}
        if(i>=urls.length){reject(new Error('Không tải được thư viện Excel.'));return;}
        const s=document.createElement('script');s.src=urls[i++];s.async=true;
        s.onload=function(){window.XLSX?resolve(window.XLSX):next();};s.onerror=next;document.head.appendChild(s);
      }
      next();
    });
  }

  async function downloadPeriod(period){
    const rows=await loadPeriod(period,true);
    if(!rows.length)throw new Error('Không có dữ liệu của tháng '+period+'.');
    const XLSX=await loadXlsx();
    const aoa=[
      ['CHỈ SỐ NƯỚC THÁNG '+period,'','','','','','',''],
      ['','','','','','','',''],
      ['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³']
    ];
    rows.forEach(function(r,i){aoa.push([String(i+1),r.tower,r.floor,r.apartment,r.meter,r.prev,r.current,r.use]);});
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:7}}];
    ws['!cols']=[{wch:7},{wch:12},{wch:10},{wch:14},{wch:18},{wch:17},{wch:17},{wch:14}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,('CHI_SO_'+period.replace('/','_')).slice(0,31));
    const fileName='CHI_SO_NUOC_'+safeFile(period.replace('/','-'))+'.xlsx';
    XLSX.writeFile(wb,fileName,{compression:true});
    status('Đã tải dữ liệu '+projectId()+' tháng '+period+' • '+rows.length+' dòng.','ok');
  }

  function unique(list){const out=[];const seen={};(list||[]).forEach(function(v){v=txt(v);if(v&&!seen[v]){seen[v]=1;out.push(v);}});return out.sort(function(a,b){return a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});});}
  function setOptions(sel,values,current,withAll){
    if(!sel)return;
    const opts=(withAll?[ALL]:[]).concat(values||[]);
    sel.innerHTML='';
    opts.forEach(function(v){const o=sel.ownerDocument.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);});
    if(opts.indexOf(current)>=0)sel.value=current;else if(opts.length)sel.value=opts[0];
  }

  function writeViewShell(win){
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số nước</title>'
      +'<style>html,body{margin:0;min-height:100%;background:#f5f7fa;color:#18232d;font-family:Arial,sans-serif}.wrap{padding:10px}.title{text-align:center;font-weight:900;font-size:18px;margin:3px 0 9px}.filters{display:grid;grid-template-columns:repeat(4,minmax(95px,1fr));gap:7px;background:#fff;border:1px solid #dfe5ea;border-radius:10px;padding:8px;margin-bottom:8px}.f label{display:block;font-size:10px;font-weight:800;color:#8d2f2a;margin-bottom:3px}.f select{width:100%;height:31px;border:1px solid #bcc7d1;border-radius:7px;background:#eef5ff;font-weight:800;font-size:12px}.summary{text-align:center;font-size:12px;font-weight:800;color:#415365;margin:0 0 8px}.tableWrap{overflow:auto;max-height:69vh;background:#fff;border:1px solid #dfe5ea;border-radius:10px}table{border-collapse:collapse;width:max-content;min-width:100%}th,td{border-bottom:1px solid #e6eaed;border-right:1px solid #eef1f3;padding:7px;font-size:12px;text-align:center;white-space:nowrap}th{position:sticky;top:0;background:#fbe6d1;font-weight:900}td a{font-weight:900;color:#225b91}.back{display:block;min-width:190px;margin:12px auto 0;padding:11px 18px;border:1px solid #aab3bc;border-radius:9px;background:#fff;font-weight:800}.empty{padding:24px;text-align:center;font-weight:800;color:#657482}@media(max-width:700px){.filters{grid-template-columns:repeat(2,1fr)}.wrap{padding:7px}}</style></head><body>'
      +'<div class="wrap"><div class="title" id="wvTitle">CHỈ SỐ NƯỚC</div>'
      +'<div class="filters"><div class="f"><label>Chọn Tòa</label><select id="wvTower"></select></div><div class="f"><label>Chọn Tầng</label><select id="wvFloor"></select></div><div class="f"><label>Chọn Căn hộ</label><select id="wvApartment"></select></div><div class="f"><label>Chọn Tháng</label><select id="wvMonth"></select></div></div>'
      +'<div class="summary" id="wvSummary">Đang tải dữ liệu...</div><div class="tableWrap"><table><thead><tr id="wvHead"></tr></thead><tbody id="wvBody"></tbody></table></div>'
      +'<button class="back" id="wvBack">← QUAY LẠI ỨNG DỤNG</button></div></body></html>';
    win.document.open();win.document.write(html);win.document.close();
  }

  async function openView(initialPeriod){
    const win=window.open('','_blank');
    if(!win)throw new Error('Trình duyệt đang chặn cửa sổ XEM CHỈ SỐ.');
    writeViewShell(win);
    const d=win.document;
    const tower=d.getElementById('wvTower'),floor=d.getElementById('wvFloor'),apt=d.getElementById('wvApartment'),month=d.getElementById('wvMonth');
    const summary=d.getElementById('wvSummary'),head=d.getElementById('wvHead'),body=d.getElementById('wvBody');
    d.getElementById('wvBack').onclick=function(){try{if(win.opener)win.opener.focus();}catch(e){}win.close();};
    head.innerHTML=['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ'].map(function(h){return '<th>'+esc(h)+'</th>';}).join('');

    const months=await loadMonths(true);
    if(!months.length)throw new Error('Chưa có dữ liệu tháng của dự án '+projectId()+'.');
    setOptions(month,months,months.indexOf(initialPeriod)>=0?initialPeriod:months[0],true);

    let activeRows=[];
    async function loadSelectedMonth(){
      summary.textContent='Đang tải dữ liệu '+projectId()+'...';
      if(month.value===ALL){
        const groups=await Promise.all(months.map(function(m){return loadPeriod(m,false).catch(function(){return [];});}));
        activeRows=[];groups.forEach(function(g){activeRows=activeRows.concat(g);});
      }else activeRows=await loadPeriod(month.value,true);
      rebuildFilters();
      renderRows();
    }

    function rebuildFilters(){
      const curT=tower.value||ALL,curF=floor.value||ALL,curA=apt.value||ALL;
      const towers=unique(activeRows.map(function(r){return r.tower;}));
      setOptions(tower,towers,towers.indexOf(curT)>=0?curT:ALL,true);
      const floors=unique(activeRows.filter(function(r){return tower.value===ALL||r.tower===tower.value;}).map(function(r){return r.floor;}));
      setOptions(floor,floors,floors.indexOf(curF)>=0?curF:ALL,true);
      const apts=unique(activeRows.filter(function(r){return (tower.value===ALL||r.tower===tower.value)&&(floor.value===ALL||r.floor===floor.value);}).map(function(r){return r.apartment;}));
      setOptions(apt,apts,apts.indexOf(curA)>=0?curA:ALL,true);
    }

    function renderRows(){
      const rows=activeRows.filter(function(r){
        return (tower.value===ALL||r.tower===tower.value)
          &&(floor.value===ALL||r.floor===floor.value)
          &&(apt.value===ALL||r.apartment===apt.value);
      });
      summary.textContent='Dự án '+projectId()+' • '+rows.length+' dòng'+(month.value===ALL?' • Tất cả tháng':' • '+month.value);
      if(!rows.length){body.innerHTML='<tr><td colspan="9" class="empty">Không có dữ liệu phù hợp.</td></tr>';return;}
      body.innerHTML=rows.map(function(r,i){
        return '<tr><td>'+(i+1)+'</td><td>'+esc(r.tower)+'</td><td>'+esc(r.floor)+'</td><td>'+esc(r.apartment)+'</td><td>'+esc(r.meter)+'</td><td>'+esc(r.prev)+'</td><td>'+esc(r.current)+'</td><td>'+esc(r.use)+'</td><td>'+(r.image?'<a href="'+esc(r.image)+'" target="_blank" rel="noopener">XEM ẢNH</a>':'')+'</td></tr>';
      }).join('');
    }

    month.onchange=function(){loadSelectedMonth().catch(function(e){summary.textContent=txt(e&&e.message)||'Không tải được dữ liệu.';});};
    tower.onchange=function(){rebuildFilters();renderRows();};
    floor.onchange=function(){rebuildFilters();renderRows();};
    apt.onchange=renderRows;
    await loadSelectedMonth();
  }

  function onClick(ev){
    const d=findButton(ev.target,'download');
    const v=d?null:findButton(ev.target,'view');
    if(!d&&!v)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    if(busy)return false;
    if(navigator.onLine===false){status('Cần kết nối Internet để sử dụng chức năng này.','err');return false;}
    const period=canonMonth(periodNow());
    if(!period){status('Anh chọn tháng cần xem/tải trước.','err');return false;}
    busy=true;
    if(v){
      status('Đang đọc dữ liệu '+projectId()+' tháng '+period+'...','');
      openView(period).then(function(){status('Đang xem dữ liệu '+projectId()+' tháng '+period+'.','ok');}).catch(function(e){status(txt(e&&e.message)||'Không xem được dữ liệu.','err');}).finally(function(){busy=false;});
    }else{
      status('Đang tạo file '+projectId()+' tháng '+period+'...','');
      downloadPeriod(period).catch(function(e){status(txt(e&&e.message)||'Không tải được file.','err');}).finally(function(){busy=false;});
    }
    return false;
  }

  function start(){
    refreshMonths(true);
    setTimeout(function(){refreshMonths(false);},500);
    setTimeout(function(){refreshMonths(false);},1600);
  }

  window.addEventListener('click',onClick,true);
  window.addEventListener('pageshow',function(){setTimeout(function(){refreshMonths(true);},100);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(function(){refreshMonths(true);},100);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  window.WATER_MANAGE_PROJECT_DATA_BUILD=BUILD;
})();
