/* R11.35 - XEM CHI SO V16.
 * Thang cu the: doc api=monthdata.
 * TAT CA: doc 1 lan api=history theo Toa/Tang/Can ho da chon.
 * Khong tai tung thang roi ghep tren dien thoai.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-history-v16';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  const MONTH_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const VIEW_IDS=['waterViewR119','waterViewR118'];
  const STATUS_IDS=['waterExportR119Status','waterExportR118Status'];
  const ALL='TẤT CẢ';
  let busy=false;

  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function byIds(ids){for(let i=0;i<ids.length;i++){const n=document.getElementById(ids[i]);if(n)return n;}return null;}
  function periodNow(){const s=byIds(MONTH_IDS);return txt(s&&s.value);}
  function status(message,kind){const n=byIds(STATUS_IDS);if(!n)return;n.className=kind||'';n.textContent=message||'';}
  function canonMonth(v){const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';}
  function monthScore(v){const m=canonMonth(v).match(/^(\d{2})\/(\d{4})$/);return m?Number(m[2])*12+Number(m[1]):0;}
  function uniq(list){return (list||[]).map(txt).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;});}
  function sortText(list){return uniq(list).sort(function(a,b){return a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});});}
  function sortMonths(list){return uniq((list||[]).map(canonMonth).filter(Boolean)).sort(function(a,b){return monthScore(a)-monthScore(b);});}

  function findView(node){
    let el=node&&node.nodeType===1?node:null;
    while(el&&el!==document.documentElement){
      if(VIEW_IDS.indexOf(el.id)>=0)return el;
      const label=norm(el.innerText||el.textContent||el.getAttribute('aria-label')||'');
      if(label==='xem chi so')return el;
      el=el.parentElement;
    }
    return null;
  }

  function jsonp(url,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb='__waterViewHistory_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu.'));},timeoutMs||15000);
      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        err?reject(err):resolve(data);
      }
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không đọc được dữ liệu từ máy chủ.'));};
      s.src=url+(url.indexOf('?')>=0?'&':'?')+'callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  function backendMonths(){return jsonp(BACKEND_URL+'?api=months',12000);}
  function backendPeriod(period){return jsonp(BACKEND_URL+'?api=monthdata&period='+encodeURIComponent(period),16000);}
  function backendHistory(tower,floor,apartment){
    return jsonp(
      BACKEND_URL+'?api=history'
      +'&tower='+encodeURIComponent(tower===ALL?'':tower)
      +'&floor='+encodeURIComponent(floor===ALL?'':floor)
      +'&apartment='+encodeURIComponent(apartment),
      16000
    );
  }

  function rowObj(a){
    a=Array.isArray(a)?a:[];
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

  function rowsFromApi(data,period){
    if(!data||data.ok!==true||!Array.isArray(data.rows)){
      throw new Error(txt(data&&data.error)||'Máy chủ không trả dữ liệu hợp lệ.');
    }
    return data.rows.map(rowObj).filter(function(r){return r.period===period;});
  }

  function rowsFromHistory(data){
    if(!data||data.ok!==true||!Array.isArray(data.rows)){
      throw new Error(txt(data&&data.error)||'Chưa đọc được lịch sử chỉ số.');
    }
    return data.rows.map(rowObj).filter(function(r){return !!r.period;}).sort(function(a,b){
      const d=monthScore(a.period)-monthScore(b.period);
      if(d)return d;
      return (a.tower+a.floor+a.apartment+a.meter).localeCompare(b.tower+b.floor+b.apartment+b.meter,'vi',{numeric:true});
    });
  }

  async function loadPeriod(period){
    return rowsFromApi(await backendPeriod(period),period);
  }

  async function loadMonths(fallbackPeriod){
    let list=[];
    try{
      const data=await backendMonths();
      if(data&&data.ok===true&&Array.isArray(data.months))list=data.months;
    }catch(e){}
    const cur=canonMonth(fallbackPeriod);
    if(cur)list.push(cur);
    return sortMonths(list);
  }

  function writeLoading(win,period){
    try{
      win.document.open();
      win.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số</title></head><body style="font-family:Arial,sans-serif;padding:24px;text-align:center;color:#263746"><b>Đang tải dữ liệu '+esc(period)+'...</b></body></html>');
      win.document.close();
    }catch(e){}
  }

  function renderShell(win){
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số nước</title>'
      +'<style>'
      +'html,body{margin:0;min-height:100%;background:#f5f7fa;color:#18232d;font-family:Arial,sans-serif}.wrap{padding:12px}.title{text-align:center;font-weight:900;font-size:18px;margin:2px 0 10px}.filters{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px;background:#fff;border:1px solid #dfe5ea;border-radius:10px;padding:10px;margin-bottom:10px}.f label{display:block;font-size:11px;font-weight:800;color:#8d2f2a;margin-bottom:4px}.f select{width:100%;height:36px;border:1px solid #bcc7d1;border-radius:7px;background:#eef5ff;padding:0 7px;font-weight:800;color:#172b3d}.summary{font-size:12px;font-weight:800;color:#415365;margin:0 0 8px;text-align:center}.tableWrap{overflow:auto;background:#fff;border:1px solid #dfe5ea;border-radius:10px;-webkit-overflow-scrolling:touch;max-height:68vh}table{border-collapse:collapse;table-layout:auto;width:max-content;min-width:100%}th,td{box-sizing:border-box;border-bottom:1px solid #e6eaed;border-right:1px solid #eef1f3;padding:7px 10px;font-size:12px;line-height:1.35;text-align:center;white-space:nowrap;vertical-align:middle}th{position:sticky;top:0;z-index:1;background:#fbe6d1;font-weight:900}td a{font-weight:900;color:#225b91}.empty{padding:28px 12px;text-align:center;font-weight:800;color:#657482}.back{display:block;min-width:190px;margin:12px auto 0;padding:11px 18px;border:1px solid #aab3bc;border-radius:9px;background:#fff;font-weight:800}@media(max-width:700px){.filters{grid-template-columns:repeat(2,minmax(0,1fr))}.wrap{padding:8px}}'
      +'</style></head><body><div class="wrap"><div class="title" id="wvTitle">CHỈ SỐ NƯỚC</div>'
      +'<div class="filters"><div class="f"><label>Chọn Tòa</label><select id="wvTower"></select></div><div class="f"><label>Chọn Tầng</label><select id="wvFloor"></select></div><div class="f"><label>Chọn Căn hộ</label><select id="wvApartment"></select></div><div class="f"><label>Chọn Tháng</label><select id="wvMonth"></select></div></div>'
      +'<div class="summary" id="wvSummary">Đang tải...</div><div class="tableWrap"><table><thead><tr id="wvHead"></tr></thead><tbody id="wvBody"></tbody></table></div>'
      +'<button class="back" id="wvBack">← QUAY LẠI ỨNG DỤNG</button></div></body></html>';
    win.document.open();win.document.write(html);win.document.close();
  }

  function setOptions(sel,list,value){
    if(!sel)return;
    const keep=txt(value||sel.value);
    sel.innerHTML='';
    list.forEach(function(v){
      const o=sel.ownerDocument.createElement('option');
      o.value=v;o.textContent=v;sel.appendChild(o);
    });
    sel.value=list.indexOf(keep)>=0?keep:list[0];
  }

  function initViewer(win,initialPeriod,periods,initialRows){
    const doc=win.document;
    const towerSel=doc.getElementById('wvTower');
    const floorSel=doc.getElementById('wvFloor');
    const aptSel=doc.getElementById('wvApartment');
    const monthSel=doc.getElementById('wvMonth');
    const title=doc.getElementById('wvTitle');
    const summary=doc.getElementById('wvSummary');
    const head=doc.getElementById('wvHead');
    const body=doc.getElementById('wvBody');
    const cache={};
    cache[initialPeriod]=initialRows||[];
    let lastSpecific=initialPeriod;
    let historyRows=[];
    let historyKey='';
    let historyLoading=false;

    setOptions(monthSel,[ALL].concat(periods),initialPeriod);

    function selectorRows(){
      const m=monthSel.value;
      if(m!==ALL&&cache[m])return cache[m];
      if(cache[lastSpecific])return cache[lastSpecific];
      return cache[initialPeriod]||[];
    }

    function rebuildCascade(changed){
      const rows=selectorRows();
      const oldT=towerSel.value||ALL;
      const oldF=floorSel.value||ALL;
      const oldA=aptSel.value||ALL;

      setOptions(towerSel,[ALL].concat(sortText(rows.map(function(r){return r.tower;}))),oldT);
      const byTower=rows.filter(function(r){return towerSel.value===ALL||r.tower===towerSel.value;});
      setOptions(floorSel,[ALL].concat(sortText(byTower.map(function(r){return r.floor;}))),changed==='tower'?ALL:oldF);
      const byFloor=byTower.filter(function(r){return floorSel.value===ALL||r.floor===floorSel.value;});
      setOptions(aptSel,[ALL].concat(sortText(byFloor.map(function(r){return r.apartment;}))),(changed==='tower'||changed==='floor')?ALL:oldA);
    }

    function currentRows(){
      const m=monthSel.value;
      const source=m===ALL?historyRows:(cache[m]||[]);
      const t=towerSel.value||ALL;
      const f=floorSel.value||ALL;
      const a=aptSel.value||ALL;
      return source.filter(function(r){
        return (t===ALL||r.tower===t)&&(f===ALL||r.floor===f)&&(a===ALL||r.apartment===a);
      }).sort(function(x,y){
        if(m===ALL){
          const d=monthScore(x.period)-monthScore(y.period);if(d)return d;
        }
        return (x.tower+x.floor+x.apartment+x.meter).localeCompare(y.tower+y.floor+y.apartment+y.meter,'vi',{numeric:true});
      });
    }

    function draw(){
      const history=monthSel.value===ALL;
      if(history&&aptSel.value===ALL){
        title.textContent='LỊCH SỬ CHỈ SỐ NƯỚC';
        head.innerHTML=['Tháng','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ'].map(function(h){return '<th>'+esc(h)+'</th>';}).join('');
        body.innerHTML='<tr><td colspan="9" class="empty">CHỌN CĂN HỘ ĐỂ XEM LỊCH SỬ</td></tr>';
        summary.textContent='Chọn Tòa → Tầng → Căn hộ. Sau đó Tháng = TẤT CẢ.';
        return;
      }

      const rows=currentRows();
      const m=monthSel.value;
      title.textContent=history?'LỊCH SỬ CHỈ SỐ NƯỚC':'CHỈ SỐ NƯỚC THÁNG '+m;
      const heads=history
        ? ['Tháng','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ']
        : ['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ'];
      head.innerHTML=heads.map(function(h){return '<th>'+esc(h)+'</th>';}).join('');

      if(!rows.length){
        body.innerHTML='<tr><td colspan="9" class="empty">KHÔNG CÓ DỮ LIỆU PHÙ HỢP</td></tr>';
        if(!historyLoading)summary.textContent='0 dòng';
        return;
      }

      body.innerHTML=rows.map(function(r,i){
        const first=history?r.period:String(i+1);
        return '<tr><td>'+esc(first)+'</td><td>'+esc(r.tower)+'</td><td>'+esc(r.floor)+'</td><td>'+esc(r.apartment)+'</td><td>'+esc(r.meter)+'</td><td>'+esc(r.prev)+'</td><td>'+esc(r.current)+'</td><td>'+esc(r.use)+'</td><td>'+(r.image?'<a href="'+esc(r.image)+'" target="_blank" rel="noopener">XEM ẢNH</a>':'')+'</td></tr>';
      }).join('');
      summary.textContent=(history?'Lịch sử ':'')+rows.length+' dòng';
    }

    async function ensureMonth(month){
      if(cache[month])return;
      summary.textContent='Đang tải dữ liệu tháng '+month+'...';
      cache[month]=await loadPeriod(month);
    }

    async function loadHistoryForSelection(){
      const apartment=aptSel.value||ALL;
      if(apartment===ALL){historyRows=[];historyKey='';draw();return;}
      const tower=towerSel.value||ALL;
      const floor=floorSel.value||ALL;
      const key=[tower,floor,apartment].join('|');
      if(historyKey===key&&historyRows.length){draw();return;}

      historyLoading=true;
      summary.textContent='Đang tải toàn bộ lịch sử của căn hộ '+apartment+'...';
      try{
        const data=await backendHistory(tower,floor,apartment);
        historyRows=rowsFromHistory(data);
        historyKey=key;
        draw();
      }catch(e){
        historyRows=[];historyKey='';
        body.innerHTML='<tr><td colspan="9" class="empty">'+esc(txt(e&&e.message)||'Không đọc được lịch sử.')+'</td></tr>';
        summary.textContent='Không tải được lịch sử. Kiểm tra API history của Backend.';
      }finally{
        historyLoading=false;
      }
    }

    async function onMonth(){
      const m=monthSel.value;
      if(m===ALL){
        await loadHistoryForSelection();
        return;
      }
      try{
        await ensureMonth(m);
        lastSpecific=m;
        historyRows=[];historyKey='';
        rebuildCascade('month');
        draw();
      }catch(e){
        summary.textContent=txt(e&&e.message)||'Không tải được dữ liệu.';
      }
    }

    towerSel.addEventListener('change',function(){
      historyRows=[];historyKey='';
      rebuildCascade('tower');
      draw();
    });
    floorSel.addEventListener('change',function(){
      historyRows=[];historyKey='';
      rebuildCascade('floor');
      draw();
    });
    aptSel.addEventListener('change',function(){
      historyRows=[];historyKey='';
      if(monthSel.value===ALL)loadHistoryForSelection();else draw();
    });
    monthSel.addEventListener('change',onMonth);
    doc.getElementById('wvBack').addEventListener('click',function(){win.close();});

    rebuildCascade('init');
    draw();
  }

  function onViewClick(ev){
    const btn=findView(ev.target);if(!btn)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    if(busy)return false;
    if(navigator.onLine===false){status('Cần kết nối Internet để Xem chỉ số.','err');return false;}

    const initial=canonMonth(periodNow());
    if(!initial){status('Anh chọn tháng cần xem trước.','err');return false;}

    const win=window.open('','_blank');
    if(!win){status('Trình duyệt đang chặn cửa sổ XEM CHỈ SỐ.','err');return false;}
    writeLoading(win,initial);
    busy=true;
    status('Đang mở XEM CHỈ SỐ...','');

    Promise.all([loadMonths(initial),loadPeriod(initial)]).then(function(result){
      const periods=result[0];
      const rows=result[1];
      if(periods.indexOf(initial)<0)periods.push(initial);
      periods.sort(function(a,b){return monthScore(a)-monthScore(b);});
      renderShell(win);
      initViewer(win,initial,periods,rows);
      status('Đã mở XEM CHỈ SỐ. TẤT CẢ tháng dùng API lịch sử theo căn hộ.','ok');
    }).catch(function(e){
      try{win.document.body.innerHTML='<div style="padding:24px;font:700 15px Arial;color:#a23a2a">'+esc(e&&e.message||'Không xem được dữ liệu.')+'</div>';}catch(_e){}
      status(txt(e&&e.message)||'Không xem được dữ liệu.','err');
    }).finally(function(){busy=false;});
    return false;
  }

  window.addEventListener('click',onViewClick,true);
  window.WATER_MANAGE_VIEW_MONTH_BUILD=BUILD;
})();
