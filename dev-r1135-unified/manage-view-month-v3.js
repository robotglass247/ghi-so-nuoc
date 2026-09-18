/* R11.35 - XEM CHI SO co bo loc nhu FILE_CHI_SO_THANG.
 * Bo loc: Toa / Tang / Can ho / Thang.
 * Thang co TAT CA; khi TAT CA thi xem lich su theo thang cua can ho dang chon.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-filter-v15';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='TAI_CHI_SO_THANG';
  const DATA_RANGE='A3:J40000';
  const MONTH_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const VIEW_IDS=['waterViewR119','waterViewR118'];
  const STATUS_IDS=['waterExportR119Status','waterExportR118Status'];
  const ALL='TẤT CẢ';
  let busy=false;

  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function cell(row,i){const c=row&&row.c&&row.c[i];return c?(c.f!=null?c.f:c.v):'';}
  function byIds(ids){for(const id of ids){const n=document.getElementById(id);if(n)return n;}return null;}
  function periodNow(){const s=byIds(MONTH_IDS);return txt(s&&s.value);}
  function status(message,kind){const n=byIds(STATUS_IDS);if(!n)return;n.className=kind||'';n.textContent=message||'';}
  function canonMonth(v){const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';}
  function monthScore(v){const m=canonMonth(v).match(/^(\d{2})\/(\d{4})$/);return m?Number(m[2])*12+Number(m[1]):0;}
  function uniq(list){return (list||[]).map(txt).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;});}
  function sortText(list){return uniq(list).sort(function(a,b){return a.localeCompare(b,'vi',{numeric:true,sensitivity:'base'});});}
  function sortMonths(list){return uniq(list.map(canonMonth).filter(Boolean)).sort(function(a,b){return monthScore(a)-monthScore(b);});}

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
      const cb='__waterViewFilter_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu.'));},timeoutMs||20000);
      function finish(err,data){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);err?reject(err):resolve(data);}
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không đọc được dữ liệu từ máy chủ.'));};
      s.src=url+(url.indexOf('?')>=0?'&':'?')+'callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  function backendMonths(){return jsonp(BACKEND_URL+'?api=months',15000);}
  function backendPeriod(period){return jsonp(BACKEND_URL+'?api=monthdata&period='+encodeURIComponent(period),20000);}

  function gviz(query){
    return new Promise(function(resolve,reject){
      const cb='__waterViewGviz_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu tháng.'));},12000);
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

  function rowsFromApi(data,period){
    if(!data||data.ok!==true||!Array.isArray(data.rows))return [];
    return data.rows.map(function(a){
      a=Array.isArray(a)?a:[];
      return {c:a.map(function(v){return {v:v};})};
    }).filter(function(r){return txt(cell(r,8))===period;});
  }

  async function loadPeriod(period){
    try{
      const api=await backendPeriod(period);
      const rows=rowsFromApi(api,period);
      if(rows.length)return rows;
      if(api&&api.ok===true)return [];
    }catch(e){}
    const safe=period.replace(/'/g,"''");
    const data=await gviz("select B,C,D,E,F,G,H,I,J where J = '"+safe+"'");
    const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
    return rows.filter(function(r){return txt(cell(r,8))===period;});
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

  function rowObj(r){
    return {
      tower:txt(cell(r,0)), floor:txt(cell(r,1)), apartment:txt(cell(r,2)), meter:txt(cell(r,3)),
      prev:txt(cell(r,4)), current:txt(cell(r,5)), use:txt(cell(r,6)), image:txt(cell(r,7)), period:canonMonth(cell(r,8))
    };
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
    list.forEach(function(v){const o=sel.ownerDocument.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);});
    sel.value=list.indexOf(keep)>=0?keep:list[0];
  }

  function initViewer(win,initialPeriod,periods,initialRows){
    const doc=win.document;
    const towerSel=doc.getElementById('wvTower'), floorSel=doc.getElementById('wvFloor'), aptSel=doc.getElementById('wvApartment'), monthSel=doc.getElementById('wvMonth');
    const title=doc.getElementById('wvTitle'), summary=doc.getElementById('wvSummary'), head=doc.getElementById('wvHead'), body=doc.getElementById('wvBody');
    const cache={};
    cache[initialPeriod]=(initialRows||[]).map(rowObj);
    let allLoaded=false;
    let loadingAll=false;

    setOptions(monthSel,[ALL].concat(periods),initialPeriod);

    function sourceRows(){
      const m=monthSel.value;
      if(m===ALL){
        let out=[];periods.forEach(function(p){out=out.concat(cache[p]||[]);});return out;
      }
      return cache[m]||[];
    }

    function filteredRows(){
      const t=towerSel.value||ALL,f=floorSel.value||ALL,a=aptSel.value||ALL;
      return sourceRows().filter(function(r){
        return (t===ALL||r.tower===t)&&(f===ALL||r.floor===f)&&(a===ALL||r.apartment===a);
      }).sort(function(x,y){
        const d=monthScore(x.period)-monthScore(y.period);if(d)return d;
        return (x.tower+x.floor+x.apartment+x.meter).localeCompare(y.tower+y.floor+y.apartment+y.meter,'vi',{numeric:true});
      });
    }

    function rebuildCascade(changed){
      const rows=sourceRows();
      const oldT=towerSel.value||ALL,oldF=floorSel.value||ALL,oldA=aptSel.value||ALL;
      const towers=[ALL].concat(sortText(rows.map(function(r){return r.tower;})));
      setOptions(towerSel,towers,oldT);
      const byTower=rows.filter(function(r){return towerSel.value===ALL||r.tower===towerSel.value;});
      const floors=[ALL].concat(sortText(byTower.map(function(r){return r.floor;})));
      setOptions(floorSel,floors,changed==='tower'?ALL:oldF);
      const byFloor=byTower.filter(function(r){return floorSel.value===ALL||r.floor===floorSel.value;});
      const apts=[ALL].concat(sortText(byFloor.map(function(r){return r.apartment;})));
      setOptions(aptSel,apts,(changed==='tower'||changed==='floor')?ALL:oldA);
    }

    function draw(){
      const m=monthSel.value;
      if(m===ALL&&aptSel.value===ALL){
        title.textContent='LỊCH SỬ CHỈ SỐ NƯỚC';
        head.innerHTML=['Tháng','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ'].map(function(h){return '<th>'+esc(h)+'</th>';}).join('');
        body.innerHTML='<tr><td colspan="9" class="empty">CHỌN CĂN HỘ ĐỂ XEM LỊCH SỬ</td></tr>';
        summary.textContent='Chọn căn hộ, sau đó để Tháng = TẤT CẢ để xem lịch sử nhiều tháng.';
        return;
      }
      const rows=filteredRows();
      const history=m===ALL;
      title.textContent=history?'LỊCH SỬ CHỈ SỐ NƯỚC':'CHỈ SỐ NƯỚC THÁNG '+m;
      head.innerHTML=(history?['Tháng','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ']:['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ']).map(function(h){return '<th>'+esc(h)+'</th>';}).join('');
      if(!rows.length){body.innerHTML='<tr><td colspan="9" class="empty">KHÔNG CÓ DỮ LIỆU PHÙ HỢP</td></tr>';summary.textContent='0 dòng';return;}
      body.innerHTML=rows.map(function(r,i){
        const first=history?r.period:String(i+1);
        return '<tr><td>'+esc(first)+'</td><td>'+esc(r.tower)+'</td><td>'+esc(r.floor)+'</td><td>'+esc(r.apartment)+'</td><td>'+esc(r.meter)+'</td><td>'+esc(r.prev)+'</td><td>'+esc(r.current)+'</td><td>'+esc(r.use)+'</td><td>'+(r.image?'<a href="'+esc(r.image)+'" target="_blank" rel="noopener">XEM ẢNH</a>':'')+'</td></tr>';
      }).join('');
      summary.textContent=(history?'Lịch sử ':'')+rows.length+' dòng';
    }

    async function ensureMonth(month){
      if(cache[month])return;
      summary.textContent='Đang tải dữ liệu tháng '+month+'...';
      cache[month]=(await loadPeriod(month)).map(rowObj);
    }

    async function ensureAll(){
      if(allLoaded||loadingAll)return;
      loadingAll=true;
      summary.textContent='Đang tải lịch sử các tháng...';
      try{
        for(let i=0;i<periods.length;i++){
          const p=periods[i];if(!cache[p])cache[p]=(await loadPeriod(p)).map(rowObj);
        }
        allLoaded=true;
      }finally{loadingAll=false;}
    }

    async function onMonth(){
      try{
        if(monthSel.value===ALL)await ensureAll();else await ensureMonth(monthSel.value);
        rebuildCascade('month');draw();
      }catch(e){summary.textContent=txt(e&&e.message)||'Không tải được dữ liệu.';}
    }

    towerSel.addEventListener('change',function(){rebuildCascade('tower');draw();});
    floorSel.addEventListener('change',function(){rebuildCascade('floor');draw();});
    aptSel.addEventListener('change',draw);
    monthSel.addEventListener('change',onMonth);
    doc.getElementById('wvBack').addEventListener('click',function(){win.close();});

    rebuildCascade('init');draw();
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
    busy=true;status('Đang mở XEM CHỈ SỐ...','');
    Promise.all([loadMonths(initial),loadPeriod(initial)]).then(function(result){
      const periods=result[0],rows=result[1];
      if(periods.indexOf(initial)<0)periods.push(initial);
      periods.sort(function(a,b){return monthScore(a)-monthScore(b);});
      renderShell(win);initViewer(win,initial,periods,rows);
      status('Đã mở XEM CHỈ SỐ có bộ lọc Tòa / Tầng / Căn hộ / Tháng.','ok');
    }).catch(function(e){
      try{win.document.body.innerHTML='<div style="padding:24px;font:700 15px Arial;color:#a23a2a">'+esc(e&&e.message||'Không xem được dữ liệu.')+'</div>';}catch(_e){}
      status(txt(e&&e.message)||'Không xem được dữ liệu.','err');
    }).finally(function(){busy=false;});
    return false;
  }

  window.addEventListener('click',onViewClick,true);
  window.WATER_MANAGE_VIEW_MONTH_BUILD=BUILD;
})();
