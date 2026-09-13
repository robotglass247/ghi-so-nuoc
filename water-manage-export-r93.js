(function(){
  'use strict';

  const BUILD='879-r9.3-manage-export';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='GHI_SO_HANG_THANG';
  const MONTH_CACHE='water_export_months_v1';
  let mounted=false;
  let loadingMonths=false;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function cell(row,i){
    const c=row&&row.c&&row.c[i];
    if(!c)return '';
    return c.f!=null?c.f:c.v;
  }
  function periodScore(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m?Number(m[2])*12+Number(m[1]):0;
  }
  function safeName(v){return txt(v).replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_').replace(/^_+|_+$/g,'');}

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterExport_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu.'));},20000);
      function finish(err,data){
        if(done)return; done=true;
        clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(script.parentNode)script.parentNode.removeChild(script);
        err?reject(err):resolve(data);
      }
      window[cb]=function(data){finish(null,data);};
      script.onerror=function(){finish(new Error('Không đọc được dữ liệu Google Sheets.'));};
      script.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(DATA_SHEET)+'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)+'&tq='+encodeURIComponent(query)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }

  function ensureStyle(){
    if(el('waterExportR93Style'))return;
    const s=document.createElement('style');
    s.id='waterExportR93Style';
    s.textContent=`
      #waterExportR93 .r93ExportLabel{display:block;font-size:11px;font-weight:800;color:#5c6975;margin:3px 0 6px;text-transform:uppercase}
      #waterExportR93 .r93ExportRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
      #waterExportR93 select{width:100%;height:40px;border:1px solid #bdc7d1;border-radius:9px;background:#fff;color:#18232d;padding:0 10px;font:700 13px Arial,sans-serif;outline:none}
      #waterExportR93 button{height:40px;border:0;border-radius:9px;background:#174a7e;color:#fff;padding:0 14px;font:800 12px Arial,sans-serif;white-space:nowrap;box-shadow:none}
      #waterExportR93 button:disabled{opacity:.5}
      #waterExportR93Status{margin-top:8px;font-size:11px;line-height:1.4;color:#6a7783;min-height:15px}
      #waterExportR93Status.ok{color:#2a6942}
      #waterExportR93Status.err{color:#a23a2a}
      @media(max-width:360px){#waterExportR93 .r93ExportRow{grid-template-columns:1fr}#waterExportR93 button{width:100%}}
    `;
    document.head.appendChild(s);
  }

  function findTargetCard(){
    const panel=el('waterManagePanel');
    if(!panel)return null;
    const cards=panel.querySelectorAll('.waterCard');
    for(let i=0;i<cards.length;i++){
      const t=cards[i].querySelector('.waterCardTitle');
      const title=txt(t&&t.textContent).toLowerCase();
      if(title.indexOf('nguyên tắc dữ liệu')>=0 || title.indexOf('tai file chi so')>=0 || title.indexOf('tải file chỉ số')>=0)return cards[i];
    }
    return cards.length>1?cards[1]:null;
  }

  function mount(){
    if(mounted&&el('waterExportR93'))return true;
    const card=findTargetCard();
    if(!card)return false;
    ensureStyle();
    card.id='waterExportR93';
    card.innerHTML=`
      <div class="waterCardTitle">TẢI FILE CHỈ SỐ</div>
      <label class="r93ExportLabel" for="waterExportMonth">Chọn tháng</label>
      <div class="r93ExportRow">
        <select id="waterExportMonth" aria-label="Chọn tháng có dữ liệu"><option value="">Đang tải danh sách tháng...</option></select>
        <button id="waterExportBtn" type="button" disabled>TẢI FILE</button>
      </div>
      <div id="waterExportR93Status">Chỉ hiển thị các tháng đã có chỉ số trên hệ thống.</div>`;
    mounted=true;
    el('waterExportBtn').addEventListener('click',downloadSelected);
    loadMonths();
    return true;
  }

  function status(message,kind){
    const n=el('waterExportR93Status');
    if(!n)return;
    n.className=kind||'';
    n.textContent=message||'';
  }

  function getFallbackPeriod(){
    try{
      const p=JSON.parse(localStorage.getItem('water_progress_ui3')||'{}');
      return txt(p.period);
    }catch(e){return '';}
  }

  function setMonths(list){
    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');
    if(!select||!btn)return;
    list=(list||[]).map(txt).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return periodScore(b)-periodScore(a);});
    select.innerHTML='';
    if(!list.length){
      const o=document.createElement('option');o.value='';o.textContent='Chưa có tháng dữ liệu';select.appendChild(o);btn.disabled=true;return;
    }
    list.forEach(function(v){const o=document.createElement('option');o.value=v;o.textContent=v;select.appendChild(o);});
    btn.disabled=false;
    try{localStorage.setItem(MONTH_CACHE,JSON.stringify(list));}catch(e){}
  }

  async function loadMonths(){
    if(loadingMonths)return;
    loadingMonths=true;
    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');
    if(select)select.disabled=true;
    if(btn)btn.disabled=true;
    try{
      const data=await jsonp("select B where B is not null group by B label B ''");
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
      const months=rows.map(function(r){return txt(cell(r,0));}).filter(Boolean);
      setMonths(months);
      status(months.length?'Có '+months.length+' tháng dữ liệu trên hệ thống.':'Chưa có dữ liệu chỉ số để tải.',months.length?'ok':'');
    }catch(e){
      let cached=[];
      try{cached=JSON.parse(localStorage.getItem(MONTH_CACHE)||'[]');}catch(_e){}
      if(!cached.length){const p=getFallbackPeriod();if(p)cached=[p];}
      setMonths(cached);
      status(cached.length?'Đang dùng danh sách tháng đã lưu trên máy.':'Không tải được danh sách tháng. Kiểm tra kết nối Internet.','err');
    }finally{
      loadingMonths=false;
      if(select)select.disabled=false;
    }
  }

  function loadXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise(function(resolve,reject){
      const urls=[
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
      ];
      let i=0;
      function next(){
        if(window.XLSX)return resolve(window.XLSX);
        if(i>=urls.length)return reject(new Error('Không tải được thư viện Excel.'));
        const s=document.createElement('script');
        s.src=urls[i++];
        s.async=true;
        s.onload=function(){window.XLSX?resolve(window.XLSX):next();};
        s.onerror=next;
        document.head.appendChild(s);
      }
      next();
    });
  }

  function excelValue(c){
    if(!c)return '';
    if(typeof c.v==='number' || typeof c.v==='boolean')return c.v;
    if(c.f!=null)return String(c.f);
    return c.v==null?'':String(c.v);
  }

  async function downloadSelected(){
    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');
    const period=txt(select&&select.value);
    if(!period){status('Anh chọn tháng cần tải trước.','err');return;}
    if(!navigator.onLine){status('Thiết bị đang OFFLINE. Cần Internet để xuất file Excel.','err');return;}

    const old=btn?btn.textContent:'';
    if(btn){btn.disabled=true;btn.textContent='ĐANG TẠO...';}
    status('Đang lấy dữ liệu tháng '+period+'...','');
    try{
      const q="select * where B = '"+period.replace(/'/g,"''")+"'";
      const data=await jsonp(q);
      const table=data&&data.table;
      const rows=table&&Array.isArray(table.rows)?table.rows:[];
      const cols=table&&Array.isArray(table.cols)?table.cols:[];
      if(!rows.length)throw new Error('Tháng '+period+' không có dữ liệu để xuất.');

      status('Đã lấy '+rows.length+' dòng. Đang tạo file Excel...','');
      const XLSX=await loadXlsx();
      const headers=cols.map(function(c,i){return txt(c&&c.label)||('Cột '+(i+1));});
      const aoa=[headers];
      rows.forEach(function(r){
        const out=[];
        for(let i=0;i<headers.length;i++)out.push(excelValue(r&&r.c?r.c[i]:null));
        aoa.push(out);
      });
      const ws=XLSX.utils.aoa_to_sheet(aoa);
      const widths=headers.map(function(h,ci){
        let max=Math.max(10,String(h).length+2);
        const lim=Math.min(aoa.length,300);
        for(let ri=1;ri<lim;ri++)max=Math.max(max,String(aoa[ri][ci]==null?'':aoa[ri][ci]).length+2);
        return {wch:Math.min(max,42)};
      });
      ws['!cols']=widths;
      if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};
      const wb=XLSX.utils.book_new();
      const sheetName=('CHI_SO_'+period.replace('/','_')).slice(0,31);
      XLSX.utils.book_append_sheet(wb,ws,sheetName);
      const fileName='Chi_so_nuoc_'+safeName(period.replace('/','-'))+'.xlsx';
      XLSX.writeFile(wb,fileName,{compression:true});
      status('Đã tạo file Excel '+fileName+' ('+rows.length+' dòng).','ok');
    }catch(e){
      status(txt(e&&e.message)||'Không xuất được file Excel.','err');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=old||'TẢI FILE';}
    }
  }

  function start(){
    if(mount())return;
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(mount()||tries>20)clearInterval(timer);
    },250);
  }

  if(window.MutationObserver){
    const obs=new MutationObserver(function(){if(!mounted)mount();});
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  window.WATER_MANAGE_EXPORT_BUILD=BUILD;
})();
