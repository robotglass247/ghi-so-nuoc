(function(){
  'use strict';

  const BUILD='879-r10.0-manage-export-sample-layout';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='GHI_SO_HANG_THANG';
  const MONTH_CACHE='water_export_months_v1';
  let mounted=false;
  let loadingMonths=false;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function cell(row,i){const c=row&&row.c&&row.c[i];return c?(c.f!=null?c.f:c.v):'';}
  function periodScore(v){const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);return m?Number(m[2])*12+Number(m[1]):0;}
  function safeName(v){return txt(v).replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_').replace(/^_+|_+$/g,'');}

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterExport_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu.'));},20000);
      function finish(err,data){
        if(done)return;done=true;clearTimeout(timer);
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
    if(el('waterExportR100Style'))return;
    const s=document.createElement('style');s.id='waterExportR100Style';
    s.textContent=`
      #waterExportR100 .r100Title{
        margin:0 0 12px;
        text-align:center;
        color:#18232d;
        font-size:16px;
        font-weight:900;
        line-height:1.25;
        letter-spacing:.15px;
      }
      #waterExportR100 .r100Row{
        display:grid;
        grid-template-columns:minmax(0,1fr) 112px;
        gap:10px;
        align-items:center;
      }
      #waterExportR100 .r100SelectWrap{
        position:relative;
        min-width:0;
      }
      #waterExportR100 select{
        display:block;
        width:100%;
        height:44px;
        border:1px solid #bdc7d1;
        border-radius:10px;
        background:#f1f3f5;
        color:#18232d;
        padding:0 34px 0 12px;
        font:800 13px Arial,sans-serif;
        outline:none;
        box-sizing:border-box;
        appearance:auto;
        -webkit-appearance:menulist;
      }
      #waterExportR100 button{
        display:block;
        width:100%;
        height:44px;
        border:1px solid #bdc7d1;
        border-radius:10px;
        background:#f1f3f5;
        color:#18232d;
        padding:0 8px;
        font:900 13px Arial,sans-serif;
        white-space:nowrap;
        box-shadow:none;
      }
      #waterExportR100 button:active{transform:translateY(1px)}
      #waterExportR100 button:disabled{opacity:.5}
      #waterExportR100Status{
        margin:11px 0 0;
        min-height:16px;
        text-align:center;
        color:#465461;
        font-size:11.5px;
        font-weight:700;
        line-height:1.35;
      }
      #waterExportR100Status.ok{color:#2a6942}
      #waterExportR100Status.err{color:#a23a2a}
      @media(max-width:360px){
        #waterExportR100 .r100Row{grid-template-columns:minmax(0,1fr) 100px;gap:7px}
        #waterExportR100 select{font-size:12px;padding-left:9px;padding-right:24px}
        #waterExportR100 button{font-size:12px}
        #waterExportR100Status{font-size:10.5px}
      }
    `;
    document.head.appendChild(s);
  }

  function findTargetCard(){
    const panel=el('waterManagePanel');if(!panel)return null;
    const cards=panel.querySelectorAll('.waterCard');
    for(let i=0;i<cards.length;i++){
      const t=cards[i].querySelector('.waterCardTitle,.r100Title');
      const title=txt(t&&t.textContent).toLowerCase();
      if(title.indexOf('nguyên tắc dữ liệu')>=0||title.indexOf('tải file chỉ số')>=0)return cards[i];
    }
    return null;
  }

  function mount(){
    if(mounted&&el('waterExportR100'))return true;
    const card=findTargetCard();if(!card)return false;
    ensureStyle();
    card.id='waterExportR100';
    card.innerHTML=`
      <div class="r100Title">TẢI FILE CHỈ SỐ</div>
      <div class="r100Row">
        <div class="r100SelectWrap">
          <select id="waterExportMonth" aria-label="Chọn tháng có dữ liệu">
            <option value="">Chọn Tháng: Đang tải...</option>
          </select>
        </div>
        <button id="waterExportBtn" type="button" disabled>Tải File</button>
      </div>
      <div id="waterExportR100Status">Đang kiểm tra dữ liệu trên hệ thống...</div>`;
    mounted=true;
    el('waterExportBtn').addEventListener('click',downloadSelected);
    loadMonths();
    return true;
  }

  function status(message,kind){
    const n=el('waterExportR100Status');if(!n)return;
    n.className=kind||'';
    n.textContent=message||'';
  }

  function getFallbackPeriod(){
    try{return txt(JSON.parse(localStorage.getItem('water_progress_ui3')||'{}').period);}catch(e){return '';}
  }

  function setMonths(list){
    const select=el('waterExportMonth'),btn=el('waterExportBtn');if(!select||!btn)return;
    list=(list||[]).map(txt).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return periodScore(b)-periodScore(a);});
    select.innerHTML='';
    if(!list.length){
      const o=document.createElement('option');o.value='';o.textContent='Chọn Tháng: Chưa có dữ liệu';
      select.appendChild(o);btn.disabled=true;return;
    }
    list.forEach(function(v){
      const o=document.createElement('option');o.value=v;o.textContent='Chọn Tháng: '+v;select.appendChild(o);
    });
    btn.disabled=false;
    try{localStorage.setItem(MONTH_CACHE,JSON.stringify(list));}catch(e){}
  }

  async function loadMonths(){
    if(loadingMonths)return;loadingMonths=true;
    const select=el('waterExportMonth'),btn=el('waterExportBtn');
    if(select)select.disabled=true;if(btn)btn.disabled=true;
    try{
      const data=await jsonp("select B where B is not null");
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
      const months=rows.map(function(r){return txt(cell(r,0));}).filter(Boolean);
      setMonths(months);
      const count=months.filter(function(v,i,a){return a.indexOf(v)===i;}).length;
      status(count?'Trên hệ thống có '+count+' tháng dữ liệu chỉ số':'Trên hệ thống chưa có dữ liệu chỉ số',count?'ok':'');
    }catch(e){
      let cached=[];try{cached=JSON.parse(localStorage.getItem(MONTH_CACHE)||'[]');}catch(_e){}
      if(!cached.length){const p=getFallbackPeriod();if(p)cached=[p];}
      setMonths(cached);
      status(cached.length?'Đang dùng danh sách tháng đã lưu trên máy':'Không tải được danh sách tháng. Kiểm tra kết nối Internet.','err');
    }finally{
      loadingMonths=false;
      if(select)select.disabled=false;
    }
  }

  function loadXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise(function(resolve,reject){
      const urls=['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'];let i=0;
      function next(){
        if(window.XLSX)return resolve(window.XLSX);
        if(i>=urls.length)return reject(new Error('Không tải được thư viện tạo file Excel.'));
        const s=document.createElement('script');s.src=urls[i++];s.async=true;
        s.onload=function(){window.XLSX?resolve(window.XLSX):next();};
        s.onerror=next;document.head.appendChild(s);
      }
      next();
    });
  }

  function excelValue(c){
    if(!c)return '';
    if(typeof c.v==='number'||typeof c.v==='boolean')return c.v;
    if(c.f!=null)return String(c.f);
    return c.v==null?'':String(c.v);
  }

  async function downloadSelected(){
    const select=el('waterExportMonth'),btn=el('waterExportBtn'),period=txt(select&&select.value);
    if(!period){status('Anh chọn tháng cần tải trước.','err');return;}
    if(!navigator.onLine){status('Thiết bị đang OFFLINE. Cần Internet để xuất file Excel.','err');return;}
    const old=btn?btn.textContent:'';
    if(btn){btn.disabled=true;btn.textContent='Đang tạo...';}
    status('Đang lấy dữ liệu tháng '+period+'...','');
    try{
      const q="select * where B = '"+period.replace(/'/g,"''")+"'";
      const data=await jsonp(q),table=data&&data.table;
      const rows=table&&Array.isArray(table.rows)?table.rows:[],cols=table&&Array.isArray(table.cols)?table.cols:[];
      if(!rows.length)throw new Error('Tháng '+period+' không có dữ liệu để xuất.');
      status('Đã lấy '+rows.length+' dòng. Đang tạo file Excel...','');
      const XLSX=await loadXlsx();
      const headers=cols.map(function(c,i){return txt(c&&c.label)||('Cột '+(i+1));});
      const aoa=[headers];
      rows.forEach(function(r){
        const out=[];for(let i=0;i<headers.length;i++)out.push(excelValue(r&&r.c?r.c[i]:null));aoa.push(out);
      });
      const ws=XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols']=headers.map(function(h,ci){
        let max=Math.max(10,String(h).length+2);const lim=Math.min(aoa.length,300);
        for(let ri=1;ri<lim;ri++)max=Math.max(max,String(aoa[ri][ci]==null?'':aoa[ri][ci]).length+2);
        return {wch:Math.min(max,42)};
      });
      if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,('CHI_SO_'+period.replace('/','_')).slice(0,31));
      const fileName='Chi_so_nuoc_'+safeName(period.replace('/','-'))+'.xls';
      XLSX.writeFile(wb,fileName,{bookType:'biff8'});
      status('Đã tạo file '+fileName+' ('+rows.length+' dòng).','ok');
    }catch(e){
      status(txt(e&&e.message)||'Không xuất được file Excel.','err');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=old||'Tải File';}
    }
  }

  function start(){
    if(mount())return;
    let tries=0;const timer=setInterval(function(){tries++;if(mount()||tries>20)clearInterval(timer);},250);
  }
  if(window.MutationObserver){
    const obs=new MutationObserver(function(){if(!mounted)mount();});
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.WATER_MANAGE_EXPORT_BUILD=BUILD;
})();
