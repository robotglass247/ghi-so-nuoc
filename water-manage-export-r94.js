(function(){
  'use strict';

  const BUILD='879-r10.8-export-file-chi-so-thang';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='FILE_CHI_SO_THANG';
  const MONTH_CACHE='water_export_file_month_v2';

  let mounted=false;
  let loadingMonths=false;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function cell(row,i){
    const c=row&&row.c&&row.c[i];
    return c?(c.f!=null?c.f:c.v):'';
  }

  function safeName(v){
    return txt(v)
      .replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_')
      .replace(/^_+|_+$/g,'');
  }

  function normalizePeriod(v){
    const m=txt(v).match(/(\d{1,2})\/(\d{4})/);
    if(!m)return '';
    return String(Number(m[1])).padStart(2,'0')+'/'+m[2];
  }

  function jsonp(query,headers){
    return new Promise(function(resolve,reject){
      const cb='__waterExportFile_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let done=false;

      const timer=setTimeout(function(){
        finish(new Error('Hết thời gian đọc dữ liệu.'));
      },20000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);

        try{delete window[cb];}
        catch(e){window[cb]=undefined;}

        if(script.parentNode){
          script.parentNode.removeChild(script);
        }

        err?reject(err):resolve(data);
      }

      window[cb]=function(data){
        finish(null,data);
      };

      script.onerror=function(){
        finish(new Error('Không đọc được dữ liệu Google Sheets.'));
      };

      script.src=
        'https://docs.google.com/spreadsheets/d/'
        +encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='
        +encodeURIComponent(DATA_SHEET)
        +'&headers='
        +encodeURIComponent(headers==null?0:headers)
        +'&tqx=responseHandler:'
        +encodeURIComponent(cb)
        +'&tq='
        +encodeURIComponent(query)
        +'&_='
        +Date.now();

      document.head.appendChild(script);
    });
  }

  function ensureStyle(){
    if(el('waterExportR108Style'))return;

    const s=document.createElement('style');
    s.id='waterExportR108Style';
    s.textContent=`
      #waterExportR108 .r108Title{
        margin:0 0 9px;
        text-align:center;
        color:#18232d;
        font-size:15px;
        font-weight:900;
        line-height:1.2;
      }

      #waterExportR108 .r108Row{
        display:flex;
        width:100%;
        gap:8px;
        align-items:center;
        justify-content:space-between;
        box-sizing:border-box;
      }

      #waterExportR108 .r108SelectWrap{
        position:relative;
        flex:1 1 auto;
        min-width:0;
        height:38px;
      }

      #waterExportR108 .r108SelectWrap::after{
        content:"▼";
        position:absolute;
        right:11px;
        top:50%;
        transform:translateY(-50%);
        color:#42505d;
        font-size:10px;
        line-height:1;
        pointer-events:none;
        z-index:2;
      }

      #waterExportR108 select,
      #waterExportR108 button{
        height:38px !important;
        min-height:38px !important;
        max-height:38px !important;
        margin:0 !important;
        border:1px solid #bdc7d1;
        border-radius:9px;
        background:#f7f8fa;
        color:#18232d;
        box-sizing:border-box;
        box-shadow:none;
        font-family:Arial,sans-serif;
        font-size:11.5px;
        font-weight:800;
      }

      #waterExportR108 select{
        display:block;
        width:100%;
        padding:0 32px 0 10px;
        outline:none;
        appearance:none !important;
        -webkit-appearance:none !important;
        -moz-appearance:none !important;
        background-image:none !important;
      }

      #waterExportR108 button{
        display:block;
        flex:0 0 31%;
        width:31%;
        min-width:96px;
        padding:0 8px;
        white-space:nowrap;
        text-align:center;
        cursor:pointer;
      }

      #waterExportR108 button:active{
        transform:translateY(1px);
      }

      #waterExportR108 button:disabled{
        opacity:.5;
      }

      #waterExportR108Status{
        margin:8px 0 0;
        min-height:14px;
        text-align:center;
        color:#465461;
        font-size:10.5px;
        font-weight:700;
        line-height:1.3;
      }

      #waterExportR108Status.ok{color:#2a6942}
      #waterExportR108Status.err{color:#a23a2a}

      @media(max-width:360px){
        #waterExportR108 .r108Title{
          font-size:14px;
          margin-bottom:8px;
        }

        #waterExportR108 .r108Row{
          gap:6px;
        }

        #waterExportR108 .r108SelectWrap{
          height:36px;
        }

        #waterExportR108 select,
        #waterExportR108 button{
          height:36px !important;
          min-height:36px !important;
          max-height:36px !important;
          font-size:11px;
        }

        #waterExportR108 button{
          flex-basis:30%;
          width:30%;
          min-width:88px;
          padding:0 6px;
        }

        #waterExportR108 select{
          padding:0 27px 0 8px;
        }

        #waterExportR108 .r108SelectWrap::after{
          right:9px;
          font-size:9px;
        }

        #waterExportR108Status{
          font-size:10px;
          margin-top:7px;
        }
      }
    `;

    document.head.appendChild(s);
  }

  function findTargetCard(){
    const panel=el('waterManagePanel');
    if(!panel)return null;

    const direct=el('waterManageExportPlaceholder');
    if(direct)return direct;

    const cards=panel.querySelectorAll('.waterCard');

    for(let i=0;i<cards.length;i++){
      const titleNode=cards[i].querySelector(
        '.waterCardTitle,.r100Title,.r102Title,.r106Title,.r108Title'
      );

      const title=txt(titleNode&&titleNode.textContent).toLowerCase();

      if(
        title.indexOf('tải file chỉ số')>=0 ||
        title.indexOf('nguyên tắc dữ liệu')>=0
      ){
        return cards[i];
      }
    }

    return null;
  }

  function mount(){
    if(mounted&&el('waterExportR108'))return true;

    const card=findTargetCard();
    if(!card)return false;

    ensureStyle();

    card.id='waterExportR108';

    card.innerHTML=`
      <div class="r108Title">TẢI FILE CHỈ SỐ</div>

      <div class="r108Row">
        <div class="r108SelectWrap">
          <select id="waterExportMonth" aria-label="Chọn tháng dữ liệu">
            <option value="">Chọn Tháng: Đang tải...</option>
          </select>
        </div>

        <button id="waterExportBtn" type="button" disabled>
          Tải File
        </button>
      </div>

      <div id="waterExportR108Status">
        Đang kiểm tra FILE_CHI_SO_THANG...
      </div>
    `;

    mounted=true;

    const btn=el('waterExportBtn');
    if(btn){
      btn.addEventListener('click',downloadSelected);
    }

    loadMonths();
    return true;
  }

  function status(message,kind){
    const n=el('waterExportR108Status');
    if(!n)return;

    n.className=kind||'';
    n.textContent=message||'';
  }

  function setMonth(period){
    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');

    if(!select||!btn)return;

    select.innerHTML='';

    if(!period){
      const o=document.createElement('option');
      o.value='';
      o.textContent='Chọn Tháng: Chưa có dữ liệu';
      select.appendChild(o);
      btn.disabled=true;
      return;
    }

    const o=document.createElement('option');
    o.value=period;
    o.textContent='Chọn Tháng: '+period;
    select.appendChild(o);

    btn.disabled=false;

    try{
      localStorage.setItem(MONTH_CACHE,period);
    }catch(e){}
  }

  async function loadMonths(){
    if(loadingMonths)return;

    loadingMonths=true;

    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');

    if(select)select.disabled=true;
    if(btn)btn.disabled=true;

    try{
      const data=await jsonp('select A',0);

      const rows=
        data &&
        data.table &&
        Array.isArray(data.table.rows)
          ? data.table.rows
          : [];

      let title='';
      for(let i=0;i<Math.min(rows.length,5);i++){
        const v=txt(cell(rows[i],0));
        if(v){
          title=v;
          if(normalizePeriod(v))break;
        }
      }

      const period=normalizePeriod(title);

      setMonth(period);

      if(period){
        status(
          'Trên hệ thống có 1 tháng dữ liệu chỉ số',
          'ok'
        );
      }else{
        status(
          'Không xác định được tháng từ FILE_CHI_SO_THANG.',
          'err'
        );
      }

    }catch(e){
      let cached='';

      try{
        cached=txt(localStorage.getItem(MONTH_CACHE));
      }catch(_e){}

      setMonth(cached);

      status(
        cached
          ? 'Đang dùng tháng đã lưu trên máy'
          : 'Không đọc được FILE_CHI_SO_THANG. Kiểm tra kết nối Internet.',
        'err'
      );

    }finally{
      loadingMonths=false;

      if(select){
        select.disabled=false;
      }
    }
  }

  function loadXlsx(){
    if(window.XLSX){
      return Promise.resolve(window.XLSX);
    }

    return new Promise(function(resolve,reject){
      const urls=[
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
      ];

      let i=0;

      function next(){
        if(window.XLSX){
          return resolve(window.XLSX);
        }

        if(i>=urls.length){
          return reject(
            new Error('Không tải được thư viện tạo file Excel.')
          );
        }

        const s=document.createElement('script');
        s.src=urls[i++];
        s.async=true;

        s.onload=function(){
          window.XLSX
            ? resolve(window.XLSX)
            : next();
        };

        s.onerror=next;

        document.head.appendChild(s);
      }

      next();
    });
  }

  function excelValue(c){
    if(!c)return '';

    if(
      typeof c.v==='number' ||
      typeof c.v==='boolean'
    ){
      return c.v;
    }

    if(c.f!=null){
      return String(c.f);
    }

    return c.v==null?'':String(c.v);
  }

  function rowIsBlank(row){
    if(!row)return true;

    for(let i=0;i<row.length;i++){
      if(txt(row[i])!==''){
        return false;
      }
    }

    return true;
  }

  async function downloadSelected(){
    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');
    const period=txt(select&&select.value);

    if(!period){
      status(
        'Anh chọn tháng cần tải trước.',
        'err'
      );
      return;
    }

    if(!navigator.onLine){
      status(
        'Thiết bị đang OFFLINE. Cần Internet để tải file.',
        'err'
      );
      return;
    }

    const old=btn?btn.textContent:'';

    if(btn){
      btn.disabled=true;
      btn.textContent='Đang tạo...';
    }

    status(
      'Đang lấy dữ liệu từ FILE_CHI_SO_THANG...',
      ''
    );

    try{
      const data=await jsonp(
        'select A,B,C,D,E,F,G,H,I',
        0
      );

      const table=data&&data.table;

      const rows=
        table &&
        Array.isArray(table.rows)
          ? table.rows
          : [];

      if(!rows.length){
        throw new Error(
          'FILE_CHI_SO_THANG chưa có dữ liệu.'
        );
      }

      const aoa=[];

      rows.forEach(function(r){
        const out=[];

        for(let i=0;i<9;i++){
          out.push(
            excelValue(
              r&&r.c ? r.c[i] : null
            )
          );
        }

        aoa.push(out);
      });

      // Bỏ các dòng trống ở cuối nhưng giữ dòng trống nội bộ.
      while(aoa.length && rowIsBlank(aoa[aoa.length-1])){
        aoa.pop();
      }

      if(!aoa.length){
        throw new Error(
          'FILE_CHI_SO_THANG chưa có dữ liệu.'
        );
      }

      const titlePeriod=normalizePeriod(
        aoa[0]&&aoa[0][0]
      );

      if(titlePeriod && titlePeriod!==period){
        throw new Error(
          'Tháng trong FILE_CHI_SO_THANG hiện là '
          +titlePeriod+
          ', không phải '+period+'.'
        );
      }

      const XLSX=await loadXlsx();
      const ws=XLSX.utils.aoa_to_sheet(aoa);

      // Tiêu đề tháng nằm ở A1 và trải ngang 9 cột.
      ws['!merges']=[
        {
          s:{r:0,c:0},
          e:{r:0,c:8}
        }
      ];

      ws['!cols']=[
        {wch:7},   // TT
        {wch:12},  // Tòa
        {wch:10},  // Tầng
        {wch:14},  // Căn hộ
        {wch:18},  // Mã đồng hồ
        {wch:17},  // Chỉ số kỳ trước
        {wch:17},  // Chỉ số kỳ này
        {wch:14},  // Tiêu thụ
        {wch:38}   // Ảnh đồng hồ
      ];

      // Header dữ liệu của mẫu ở dòng 3.
      if(aoa.length>=3){
        ws['!autofilter']={
          ref:'A3:I'+Math.max(3,aoa.length)
        };
      }

      const wb=XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        'CHI_SO_'+period.replace('/','_')
      );

      const fileName=
        'Chi_so_nuoc_'
        +safeName(period.replace('/','-'))
        +'.xls';

      XLSX.writeFile(
        wb,
        fileName,
        {
          bookType:'biff8'
        }
      );

      const dataRows=Math.max(0,aoa.length-3);

      status(
        'Đã tạo '+fileName+
        ' ('+dataRows+' dòng dữ liệu).',
        'ok'
      );

    }catch(e){
      status(
        txt(e&&e.message)||
        'Không tải được file chỉ số.',
        'err'
      );

    }finally{
      if(btn){
        btn.disabled=false;
        btn.textContent=old||'Tải File';
      }
    }
  }

  function start(){
    if(mount())return;

    let tries=0;

    const timer=setInterval(function(){
      tries++;

      if(
        mount() ||
        tries>25
      ){
        clearInterval(timer);
      }
    },250);
  }

  if(window.MutationObserver){
    const obs=new MutationObserver(function(){
      if(!mounted){
        mount();
      }
    });

    obs.observe(
      document.documentElement,
      {
        childList:true,
        subtree:true
      }
    );
  }

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      start,
      {once:true}
    );
  }else{
    start();
  }

  window.WATER_MANAGE_EXPORT_BUILD=BUILD;
})();
