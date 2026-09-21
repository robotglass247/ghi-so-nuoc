/* ERN - XEM CHI SO
 * Nguon duy nhat: backend ERN.
 * Danh sach thang: api=months.
 * Du lieu thang: api=monthdata.
 * Khong chen Ky ghi hien tai, khong dung GViz, khong dung thang cu tren giao dien.
 */
(function(){
  'use strict';

  const BUILD='ern-view-v19-strict-backend-months';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbwoAdo6eDn_4sJkhnIVAwEmf5IEi15zsLSduKmpg02l7ZcRBYO27fE4HCuXUJUNp0g/exec';
  const MONTH_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const VIEW_IDS=['waterViewR119','waterViewR118'];
  const STATUS_IDS=['waterExportR119Status','waterExportR118Status'];
  const ALL='TẤT CẢ';
  let busy=false;

  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function byIds(ids){for(let i=0;i<ids.length;i++){const n=document.getElementById(ids[i]);if(n)return n;}return null;}
  function canonMonth(v){const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';}
  function monthScore(v){const m=canonMonth(v).match(/^(\d{2})\/(\d{4})$/);return m?Number(m[2])*12+Number(m[1]):0;}
  function sortMonths(list){return (list||[]).map(canonMonth).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return monthScore(a)-monthScore(b);});}
  function sortText(list){return (list||[]).map(txt).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});});}
  function periodNow(){const s=byIds(MONTH_IDS);return canonMonth(s&&s.value);}
  function status(message,kind){const n=byIds(STATUS_IDS);if(!n)return;n.className=kind||'';n.textContent=message||'';}

  function findView(node){
    let el=node&&node.nodeType===1?node:null;
    while(el&&el!==document.documentElement){
      if(VIEW_IDS.indexOf(el.id)>=0)return el;
      if(norm(el.innerText||el.textContent||el.getAttribute('aria-label')||'')==='xem chi so')return el;
      el=el.parentElement;
    }
    return null;
  }

  function jsonp(url,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb='__ernView19_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu.'));},timeoutMs||20000);
      function finish(err,data){
        if(done)return;done=true;clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        err?reject(err):resolve(data);
      }
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không đọc được dữ liệu từ Web App ERN.'));};
      s.src=url+(url.indexOf('?')>=0?'&':'?')+'callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function loadMonths(){
    const data=await jsonp(BACKEND_URL+'?api=months',15000);
    if(!data||data.ok!==true||!Array.isArray(data.months))throw new Error(txt(data&&data.error)||'Không đọc được danh sách tháng.');
    const list=sortMonths(data.months);
    if(!list.length)throw new Error('Chưa có dữ liệu tháng trong dự án ERN.');
    return list;
  }

  function normalizeApiArray(a){
    a=Array.isArray(a)?a:[];
    if(a.length>=10)return a.slice(1,10);
    if(a.length>=9)return a.slice(0,9);
    return a;
  }

  function rowObj(a){
    a=normalizeApiArray(a);
    return {
      tower:txt(a[0]),
      floor:txt(a[1]),
      apartment:txt(a[2]),
      meter:txt(a[3]),
      prev:txt(a[4]),
      current:txt(a[5]),
      use:txt(a[6]),
      image:txt(a[7]),
      period:canonMonth(a[8])
    };
  }

  async function loadPeriod(period){
    const data=await jsonp(BACKEND_URL+'?api=monthdata&period='+encodeURIComponent(period),22000);
    if(!data||data.ok!==true||!Array.isArray(data.rows))throw new Error(txt(data&&data.error)||('Không đọc được dữ liệu tháng '+period+'.'));
    return data.rows.map(rowObj).filter(function(r){return r.meter&&r.period===period;});
  }

  function writeLoading(win,msg){
    try{
      win.document.open();
      win.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số</title></head><body style="font-family:Arial,sans-serif;padding:24px;text-align:center;color:#263746"><b>'+esc(msg)+'</b></body></html>');
      win.document.close();
    }catch(e){}
  }

  function renderShell(win){
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số nước</title>'+
      '<style>html,body{margin:0;min-height:100%;background:#f5f7fa;color:#18232d;font-family:Arial,sans-serif}.wrap{padding:12px}.title{text-align:center;font-weight:900;font-size:18px;margin:2px 0 10px}.filters{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px;background:#fff;border:1px solid #dfe5ea;border-radius:10px;padding:10px;margin-bottom:10px}.f label{display:block;font-size:11px;font-weight:800;color:#8d2f2a;margin-bottom:4px}.f select{width:100%;height:36px;border:1px solid #bcc7d1;border-radius:7px;background:#eef5ff;padding:0 7px;font-weight:800;color:#172b3d}.summary{font-size:12px;font-weight:800;color:#415365;margin:0 0 8px;text-align:center}.tableWrap{overflow:auto;background:#fff;border:1px solid #dfe5ea;border-radius:10px;-webkit-overflow-scrolling:touch;max-height:68vh}table{border-collapse:collapse;table-layout:auto;width:max-content;min-width:100%}th,td{box-sizing:border-box;border-bottom:1px solid #e6eaed;border-right:1px solid #eef1f3;padding:7px 10px;font-size:12px;line-height:1.35;text-align:center;white-space:nowrap;vertical-align:middle}th{position:sticky;top:0;z-index:1;background:#fbe6d1;font-weight:900}td a{font-weight:900;color:#225b91}.empty{padding:28px 12px;text-align:center;font-weight:800;color:#657482}.back{display:block;min-width:190px;margin:12px auto 0;padding:11px 18px;border:1px solid #aab3bc;border-radius:9px;background:#fff;font-weight:800}@media(max-width:700px){.filters{grid-template-columns:repeat(2,minmax(0,1fr))}.wrap{padding:8px}}</style></head><body>'+
      '<div class="wrap"><div class="title" id="wvTitle">CHỈ SỐ NƯỚC</div>'+
      '<div class="filters"><div class="f"><label>Chọn Tòa</label><select id="wvTower"></select></div><div class="f"><label>Chọn Tầng</label><select id="wvFloor"></select></div><div class="f"><label>Chọn Căn hộ</label><select id="wvApartment"></select></div><div class="f"><label>Chọn Tháng</label><select id="wvMonth"></select></div></div>'+
      '<div class="summary" id="wvSummary"></div><div class="tableWrap"><table><thead><tr id="wvHead"></tr></thead><tbody id="wvBody"></tbody></table></div>'+
      '<button class="back" id="wvBack">← QUAY LẠI ỨNG DỤNG</button></div></body></html>';
    win.document.open();win.document.write(html);win.document.close();
  }

  function setOptions(sel,list,wanted){
    const keep=txt(wanted||sel.value);
    sel.innerHTML='';
    list.forEach(function(v){const o=sel.ownerDocument.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);});
    sel.value=list.indexOf(keep)>=0?keep:list[0];
  }

  function initViewer(win,initialPeriod,periods,initialRows){
    const d=win.document;
    const tower=d.getElementById('wvTower');
    const floor=d.getElementById('wvFloor');
    const apt=d.getElementById('wvApartment');
    const month=d.getElementById('wvMonth');
    const title=d.getElementById('wvTitle');
    const summary=d.getElementById('wvSummary');
    const head=d.getElementById('wvHead');
    const body=d.getElementById('wvBody');
    const cache={};
    cache[initialPeriod]=initialRows||[];
    let historyRows=null;
    periods=sortMonths(periods);
    setOptions(month,[ALL].concat(periods),initialPeriod);

    function rowsForMonth(){return month.value===ALL?(historyRows||[]):(cache[month.value]||[]);}

    function rebuild(changed){
      const rows=rowsForMonth();
      const oldT=tower.value||ALL,oldF=floor.value||ALL,oldA=apt.value||ALL;
      setOptions(tower,[ALL].concat(sortText(rows.map(function(r){return r.tower;}))),oldT);
      const rt=rows.filter(function(r){return tower.value===ALL||r.tower===tower.value;});
      setOptions(floor,[ALL].concat(sortText(rt.map(function(r){return r.floor;}))),changed==='tower'?ALL:oldF);
      const rf=rt.filter(function(r){return floor.value===ALL||r.floor===floor.value;});
      setOptions(apt,[ALL].concat(sortText(rf.map(function(r){return r.apartment;}))),(changed==='tower'||changed==='floor')?ALL:oldA);
    }

    function filtered(){
      const t=tower.value||ALL,f=floor.value||ALL,a=apt.value||ALL;
      return rowsForMonth().filter(function(r){return (t===ALL||r.tower===t)&&(f===ALL||r.floor===f)&&(a===ALL||r.apartment===a);}).sort(function(x,y){
        const md=monthScore(x.period)-monthScore(y.period);if(md)return md;
        return (x.tower+'|'+x.floor+'|'+x.apartment+'|'+x.meter).localeCompare(y.tower+'|'+y.floor+'|'+y.apartment+'|'+y.meter,'vi',{numeric:true});
      });
    }

    function draw(){
      const history=month.value===ALL;
      const rows=filtered();
      title.textContent=history?'LỊCH SỬ CHỈ SỐ NƯỚC':'CHỈ SỐ NƯỚC THÁNG '+month.value;
      const heads=history?['Tháng','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ']:['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ'];
      head.innerHTML=heads.map(function(h){return '<th>'+esc(h)+'</th>';}).join('');
      if(!rows.length){body.innerHTML='<tr><td colspan="9" class="empty">KHÔNG CÓ DỮ LIỆU PHÙ HỢP</td></tr>';summary.textContent='0 dòng';return;}
      body.innerHTML=rows.map(function(r,i){
        const first=history?r.period:String(i+1);
        return '<tr><td>'+esc(first)+'</td><td>'+esc(r.tower)+'</td><td>'+esc(r.floor)+'</td><td>'+esc(r.apartment)+'</td><td>'+esc(r.meter)+'</td><td>'+esc(r.prev)+'</td><td>'+esc(r.current)+'</td><td>'+esc(r.use)+'</td><td>'+(r.image?'<a href="'+esc(r.image)+'" target="_blank" rel="noopener">XEM ẢNH</a>':'')+'</td></tr>';
      }).join('');
      summary.textContent=(history?'TẤT CẢ THÁNG • ':'')+rows.length+' dòng';
    }

    async function ensureMonth(p){
      if(cache[p])return cache[p];
      summary.textContent='Đang tải tháng '+p+'...';
      cache[p]=await loadPeriod(p);
      return cache[p];
    }

    async function ensureHistory(){
      if(historyRows)return historyRows;
      summary.textContent='Đang tải lịch sử tất cả các tháng...';
      const groups=await Promise.all(periods.map(function(p){return ensureMonth(p).catch(function(){return [];});}));
      historyRows=[];
      groups.forEach(function(g){historyRows=historyRows.concat(g||[]);});
      return historyRows;
    }

    tower.addEventListener('change',function(){rebuild('tower');draw();});
    floor.addEventListener('change',function(){rebuild('floor');draw();});
    apt.addEventListener('change',draw);
    month.addEventListener('change',async function(){
      try{
        if(month.value===ALL)await ensureHistory();else await ensureMonth(month.value);
        rebuild('month');draw();
      }catch(e){summary.textContent=txt(e&&e.message)||'Không tải được dữ liệu.';}
    });
    d.getElementById('wvBack').addEventListener('click',function(){win.close();});
    rebuild('init');draw();
  }

  function onViewClick(ev){
    const btn=findView(ev.target);if(!btn)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    if(busy)return false;
    if(navigator.onLine===false){status('Cần kết nối Internet để Xem chỉ số.','err');return false;}

    const win=window.open('','_blank');
    if(!win){status('Trình duyệt đang chặn cửa sổ XEM CHỈ SỐ.','err');return false;}
    writeLoading(win,'Đang đọc danh sách tháng của dự án ERN...');
    busy=true;status('Đang mở XEM CHỈ SỐ...','');

    loadMonths().then(async function(periods){
      const requested=periodNow();
      const initial=(requested&&periods.indexOf(requested)>=0)?requested:periods[periods.length-1];
      writeLoading(win,'Đang tải dữ liệu tháng '+initial+'...');
      const rows=await loadPeriod(initial);
      renderShell(win);
      initViewer(win,initial,periods,rows);
      status('Đã mở XEM CHỈ SỐ từ dữ liệu ERN.','ok');
    }).catch(function(e){
      try{win.document.body.innerHTML='<div style="padding:24px;font:700 15px Arial;color:#a23a2a">'+esc(e&&e.message||'Không xem được dữ liệu.')+'</div>';}catch(_e){}
      status(txt(e&&e.message)||'Không xem được dữ liệu.','err');
    }).finally(function(){busy=false;});
    return false;
  }

  window.addEventListener('click',onViewClick,true);
  window.WATER_MANAGE_VIEW_MONTH_BUILD=BUILD;
})();
