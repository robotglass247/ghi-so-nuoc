/* R11.35 - XEM CHI SO bo loc dong bo nhu FILE_CHI_SO_THANG.
 * V18: bo loc compact tuy bien tren mobile; giu nguyen TAT CA thang.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-filter-v18-compact-select';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbwoAdo6eDn_4sJkhnIVAwEmf5IEi15zsLSduKmpg02l7ZcRBYO27fE4HCuXUJUNp0g/exec';
  const SHEET_ID='18R-6ulz85T34hXOu5B2GrYoqHrWiDV4BO6LojJp16_A';
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
      const cb='__waterViewFilter18_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu.'));},timeoutMs||20000);
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

  function backendMonths(){return jsonp(BACKEND_URL+'?api=months',15000);}
  function backendPeriod(period){return jsonp(BACKEND_URL+'?api=monthdata&period='+encodeURIComponent(period),22000);}

  function gviz(query){
    return new Promise(function(resolve,reject){
      const cb='__waterViewGviz18_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu tháng.'));},12000);
      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
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

  function rowsFromApi(data,period){
    if(!data||data.ok!==true||!Array.isArray(data.rows))return [];
    return data.rows.map(function(a){
      a=Array.isArray(a)?a:[];
      return {c:a.map(function(v){return {v:v};})};
    }).filter(function(r){return canonMonth(cell(r,8))===period;});
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
    return rows.filter(function(r){return canonMonth(cell(r,8))===period;});
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
      tower:txt(cell(r,0)),
      floor:txt(cell(r,1)),
      apartment:txt(cell(r,2)),
      meter:txt(cell(r,3)),
      prev:txt(cell(r,4)),
      current:txt(cell(r,5)),
      use:txt(cell(r,6)),
      image:txt(cell(r,7)),
      period:canonMonth(cell(r,8))
    };
  }

  async function loadAllRows(periods){
    const jobs=periods.map(async function(p){
      try{return (await loadPeriod(p)).map(rowObj);}catch(e){return [];}
    });
    const groups=await Promise.all(jobs);
    let out=[];
    groups.forEach(function(g){out=out.concat(g);});
    return out.filter(function(r){return r.period&&r.meter;});
  }

  function writeLoading(win,msg){
    try{
      win.document.open();
      win.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số</title></head><body style="font-family:Arial,sans-serif;padding:24px;text-align:center;color:#263746"><b>'+esc(msg)+'</b></body></html>');
      win.document.close();
    }catch(e){}
  }

  function renderShell(win){
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số nước</title>'
      +'<style>'
      +'html,body{margin:0;min-height:100%;background:#f5f7fa;color:#18232d;font-family:Arial,sans-serif}'
      +'.wrap{padding:12px}.title{text-align:center;font-weight:900;font-size:18px;margin:2px 0 10px}'
      +'.filters{display:grid;grid-template-columns:repeat(4,max-content);justify-content:center;gap:8px 14px;background:#fff;border:1px solid #dfe5ea;border-radius:10px;padding:9px;margin-bottom:10px;overflow:visible}'
      +'.f{position:relative;min-width:86px;width:max-content;max-width:100%}.f label{display:block;font-size:10px;font-weight:800;color:#8d2f2a;margin-bottom:3px;line-height:1.1}'
      +'.f select.wvNative{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}'
      +'.csel{position:relative;display:inline-block;max-width:100%;z-index:2}.csel.open{z-index:2000}'
      +'.cselBtn{display:flex;align-items:center;justify-content:space-between;gap:8px;width:max-content;min-width:86px;max-width:160px;height:30px;margin:0;padding:0 8px;border:1px solid #bcc7d1;border-radius:7px;background:#eef5ff;color:#172b3d;font:800 12px/1 Arial,sans-serif;white-space:nowrap;box-sizing:border-box}'
      +'.cselBtn .arrow{font-size:9px;color:#526171;flex:0 0 auto}.cselMenu{display:none;position:absolute;left:0;top:33px;width:max-content;min-width:100%;max-width:min(180px,calc(100vw - 18px));max-height:230px;overflow:auto;background:#fff;border:1px solid #9ca7b1;border-radius:8px;box-shadow:0 7px 18px rgba(0,0,0,.22);padding:2px;box-sizing:border-box;z-index:3000;-webkit-overflow-scrolling:touch}'
      +'.csel.open .cselMenu{display:block}.cselOpt{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-width:max-content;height:29px;margin:0;padding:0 8px;border:0;border-bottom:1px solid #e7eaed;background:#fff;color:#242b31;font:500 13px/1 Arial,sans-serif;text-align:left;white-space:nowrap;box-sizing:border-box}.cselOpt:last-child{border-bottom:0}.cselOpt.sel{font-weight:800;background:#f1f5f9}.cselOpt .tick{width:12px;text-align:center;font-size:11px;color:#246ee9}'
      +'.summary{font-size:12px;font-weight:800;color:#415365;margin:0 0 8px;text-align:center}'
      +'.tableWrap{overflow:auto;background:#fff;border:1px solid #dfe5ea;border-radius:10px;-webkit-overflow-scrolling:touch;max-height:68vh}'
      +'table{border-collapse:collapse;table-layout:auto;width:max-content;min-width:100%}th,td{box-sizing:border-box;border-bottom:1px solid #e6eaed;border-right:1px solid #eef1f3;padding:6px 8px;font-size:12px;line-height:1.25;text-align:center;white-space:nowrap;vertical-align:middle}th{position:sticky;top:0;z-index:1;background:#fbe6d1;font-weight:900}td a{font-weight:900;color:#225b91}.empty{padding:28px 12px;text-align:center;font-weight:800;color:#657482}'
      +'.back{display:block;min-width:190px;margin:12px auto 0;padding:11px 18px;border:1px solid #aab3bc;border-radius:9px;background:#fff;font-weight:800}'
      +'@media(max-width:700px){.wrap{padding:8px}.title{font-size:17px;margin-bottom:8px}.filters{grid-template-columns:repeat(2,max-content);justify-content:space-between;gap:7px 10px;padding:8px}.f{min-width:96px}.cselBtn{min-width:96px;max-width:124px;height:29px;font-size:11px;padding:0 7px}.cselMenu{top:32px}.cselOpt{height:28px;font-size:12.5px;padding:0 8px}}'
      +'</style></head><body>'
      +'<div class="wrap"><div class="title" id="wvTitle">CHỈ SỐ NƯỚC</div>'
      +'<div class="filters"><div class="f"><label>Chọn Tòa</label><select id="wvTower"></select></div><div class="f"><label>Chọn Tầng</label><select id="wvFloor"></select></div><div class="f"><label>Chọn Căn hộ</label><select id="wvApartment"></select></div><div class="f"><label>Chọn Tháng</label><select id="wvMonth"></select></div></div>'
      +'<div class="summary" id="wvSummary"></div><div class="tableWrap"><table><thead><tr id="wvHead"></tr></thead><tbody id="wvBody"></tbody></table></div>'
      +'<button class="back" id="wvBack">← QUAY LẠI ỨNG DỤNG</button></div></body></html>';
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function closeCompactMenus(d,except){
    Array.from(d.querySelectorAll('.csel.open')).forEach(function(box){
      if(box!==except)box.classList.remove('open');
    });
  }

  function syncCompact(sel){
    const ui=sel&&sel._wvCompact;
    if(!ui)return;
    ui.text.textContent=sel.value||'';
    ui.menu.innerHTML='';
    Array.from(sel.options).forEach(function(opt){
      const b=sel.ownerDocument.createElement('button');
      b.type='button';
      b.className='cselOpt'+(opt.value===sel.value?' sel':'');
      b.setAttribute('role','option');
      b.setAttribute('aria-selected',opt.value===sel.value?'true':'false');
      const label=sel.ownerDocument.createElement('span');
      label.textContent=opt.textContent;
      const tick=sel.ownerDocument.createElement('span');
      tick.className='tick';
      tick.textContent=opt.value===sel.value?'✓':'';
      b.appendChild(label);
      b.appendChild(tick);
      b.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        sel.value=opt.value;
        syncCompact(sel);
        ui.box.classList.remove('open');
        sel.dispatchEvent(new sel.ownerDocument.defaultView.Event('change',{bubbles:true}));
      });
      ui.menu.appendChild(b);
    });
  }

  function makeCompactSelect(sel){
    if(!sel||sel._wvCompact)return;
    const d=sel.ownerDocument;
    sel.classList.add('wvNative');

    const box=d.createElement('div');
    box.className='csel';
    const btn=d.createElement('button');
    btn.type='button';
    btn.className='cselBtn';
    btn.setAttribute('aria-haspopup','listbox');
    btn.setAttribute('aria-expanded','false');
    const text=d.createElement('span');
    const arrow=d.createElement('span');
    arrow.className='arrow';
    arrow.textContent='▼';
    btn.appendChild(text);
    btn.appendChild(arrow);

    const menu=d.createElement('div');
    menu.className='cselMenu';
    menu.setAttribute('role','listbox');

    box.appendChild(btn);
    box.appendChild(menu);
    sel.insertAdjacentElement('afterend',box);
    sel._wvCompact={box:box,btn:btn,text:text,menu:menu};

    btn.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      const open=!box.classList.contains('open');
      closeCompactMenus(d,box);
      box.classList.toggle('open',open);
      btn.setAttribute('aria-expanded',open?'true':'false');
      if(open)syncCompact(sel);
    });

    sel.addEventListener('change',function(){syncCompact(sel);});
    syncCompact(sel);
  }

  function setOptions(sel,list,wanted){
    const keep=txt(wanted||sel.value);
    sel.innerHTML='';
    list.forEach(function(v){
      const o=sel.ownerDocument.createElement('option');
      o.value=v;
      o.textContent=v;
      sel.appendChild(o);
    });
    sel.value=list.indexOf(keep)>=0?keep:list[0];
    syncCompact(sel);
  }

  function initViewer(win,initialPeriod,periods,allRows){
    const d=win.document;
    const tower=d.getElementById('wvTower');
    const floor=d.getElementById('wvFloor');
    const apt=d.getElementById('wvApartment');
    const month=d.getElementById('wvMonth');
    const title=d.getElementById('wvTitle');
    const summary=d.getElementById('wvSummary');
    const head=d.getElementById('wvHead');
    const body=d.getElementById('wvBody');

    [tower,floor,apt,month].forEach(makeCompactSelect);
    setOptions(month,[ALL].concat(periods),initialPeriod);

    function monthRows(){
      const m=month.value;
      return allRows.filter(function(r){return m===ALL||r.period===m;});
    }

    function rebuild(changed){
      const rows=monthRows();
      const oldT=tower.value||ALL;
      const oldF=floor.value||ALL;
      const oldA=apt.value||ALL;

      setOptions(tower,[ALL].concat(sortText(rows.map(function(r){return r.tower;}))),oldT);
      const rT=rows.filter(function(r){return tower.value===ALL||r.tower===tower.value;});
      setOptions(floor,[ALL].concat(sortText(rT.map(function(r){return r.floor;}))),changed==='tower'?ALL:oldF);
      const rF=rT.filter(function(r){return floor.value===ALL||r.floor===floor.value;});
      setOptions(apt,[ALL].concat(sortText(rF.map(function(r){return r.apartment;}))),(changed==='tower'||changed==='floor')?ALL:oldA);
    }

    function filtered(){
      const t=tower.value||ALL;
      const f=floor.value||ALL;
      const a=apt.value||ALL;
      return monthRows().filter(function(r){
        return (t===ALL||r.tower===t)&&(f===ALL||r.floor===f)&&(a===ALL||r.apartment===a);
      }).sort(function(x,y){
        const md=monthScore(x.period)-monthScore(y.period);
        if(md)return md;
        return (x.tower+'|'+x.floor+'|'+x.apartment+'|'+x.meter)
          .localeCompare(y.tower+'|'+y.floor+'|'+y.apartment+'|'+y.meter,'vi',{numeric:true});
      });
    }

    function draw(){
      const history=month.value===ALL;
      const rows=filtered();
      title.textContent=history?'LỊCH SỬ CHỈ SỐ NƯỚC':'CHỈ SỐ NƯỚC THÁNG '+month.value;
      head.innerHTML=(history
        ?['Tháng','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ']
        :['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ']
      ).map(function(h){return '<th>'+esc(h)+'</th>';}).join('');

      if(!rows.length){
        body.innerHTML='<tr><td colspan="9" class="empty">KHÔNG CÓ DỮ LIỆU PHÙ HỢP</td></tr>';
        summary.textContent='0 dòng';
        return;
      }

      body.innerHTML=rows.map(function(r,i){
        const first=history?r.period:String(i+1);
        return '<tr><td>'+esc(first)+'</td><td>'+esc(r.tower)+'</td><td>'+esc(r.floor)+'</td><td>'+esc(r.apartment)+'</td><td>'+esc(r.meter)+'</td><td>'+esc(r.prev)+'</td><td>'+esc(r.current)+'</td><td>'+esc(r.use)+'</td><td>'+(r.image?'<a href="'+esc(r.image)+'" target="_blank" rel="noopener">XEM ẢNH</a>':'')+'</td></tr>';
      }).join('');
      summary.textContent=(history?'TẤT CẢ THÁNG • ':'')+rows.length+' dòng';
    }

    tower.addEventListener('change',function(){rebuild('tower');draw();});
    floor.addEventListener('change',function(){rebuild('floor');draw();});
    apt.addEventListener('change',draw);
    month.addEventListener('change',function(){rebuild('month');draw();});
    d.getElementById('wvBack').addEventListener('click',function(){win.close();});

    d.addEventListener('click',function(){closeCompactMenus(d,null);});
    win.addEventListener('resize',function(){closeCompactMenus(d,null);});
    win.addEventListener('scroll',function(){closeCompactMenus(d,null);},true);

    rebuild('init');
    draw();
  }

  function onViewClick(ev){
    const btn=findView(ev.target);
    if(!btn)return;
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

    if(busy)return false;
    if(navigator.onLine===false){
      status('Cần kết nối Internet để Xem chỉ số.','err');
      return false;
    }

    const initial=canonMonth(periodNow());
    if(!initial){
      status('Anh chọn tháng cần xem trước.','err');
      return false;
    }

    const win=window.open('','_blank');
    if(!win){
      status('Trình duyệt đang chặn cửa sổ XEM CHỈ SỐ.','err');
      return false;
    }

    writeLoading(win,'Đang tải dữ liệu các tháng để lọc chính xác...');
    busy=true;
    status('Đang tải dữ liệu XEM CHỈ SỐ...','');

    loadMonths(initial).then(async function(periods){
      if(periods.indexOf(initial)<0)periods.push(initial);
      periods=sortMonths(periods);
      const allRows=await loadAllRows(periods);
      if(!allRows.length)throw new Error('Không có dữ liệu chỉ số để xem.');
      renderShell(win);
      initViewer(win,initial,periods,allRows);
      status('Đã mở XEM CHỈ SỐ • dữ liệu '+periods.length+' tháng.','ok');
    }).catch(function(e){
      try{
        win.document.body.innerHTML='<div style="padding:24px;font:700 15px Arial;color:#a23a2a">'+esc(e&&e.message||'Không xem được dữ liệu.')+'</div>';
      }catch(_e){}
      status(txt(e&&e.message)||'Không xem được dữ liệu.','err');
    }).finally(function(){busy=false;});

    return false;
  }

  window.addEventListener('click',onViewClick,true);
  window.WATER_MANAGE_VIEW_MONTH_BUILD=BUILD;
})();