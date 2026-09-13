(function(){
  'use strict';

  const BUILD='879-r11.0-export-hidden-download-sheet';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='TAI_CHI_SO_THANG';
  const DATA_RANGE='A3:J40000';
  const MONTH_CACHE='water_export_months_hidden_v1';

  let mounted=false;
  let loading=false;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function cell(row,i){
    const c=row&&row.c&&row.c[i];
    return c?(c.f!=null?c.f:c.v):'';
  }

  function periodScore(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m ? Number(m[2])*12+Number(m[1]) : 0;
  }

  function safeName(v){
    return txt(v)
      .replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_')
      .replace(/^_+|_+$/g,'');
  }

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterExportHidden_'+Date.now()+'_'+Math.random().toString(36).slice(2);
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
        +'&range='
        +encodeURIComponent(DATA_RANGE)
        +'&headers=1'
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
    if(el('waterExportR110Style'))return;

    const s=document.createElement('style');
    s.id='waterExportR110Style';
    s.textContent=`
      #waterExportR110 .r110Title{
        margin:0 0 9px;
        text-align:center;
        color:#18232d;
        font-size:15px;
        font-weight:900;
        line-height:1.2;
      }

      #waterExportR110 .r110Row{
        display:flex;
        width:100%;
        gap:8px;
        align-items:center;
        justify-content:space-between;
        box-sizing:border-box;
      }

      #waterExportR110 .r110SelectWrap{
        position:relative;
        flex:1 1 auto;
        min-width:0;
        height:38px;
      }

      #waterExportR110 .r110SelectWrap::after{
        content:"▼";
        position:absolute;
        right:11px;
        top:50%;
        transform:translateY(-50%);
        color:#42505d;
        font-size:10px;
        line-height:1;
        pointer-events:none;
      }

      #waterExportR110 select,
      #waterExportR110 button{
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

      #waterExportR110 select{
        display:block;
        width:100%;
        padding:0 32px 0 10px;
        outline:none;
        appearance:none !important;
        -webkit-appearance:none !important;
        -moz-appearance:none !important;
        background-image:none !important;
      }

      #waterExportR110 button{
        display:block;
        flex:0 0 31%;
        width:31%;
        min-width:96px;
        padding:0 8px;
        white-space:nowrap;
        text-align:center;
        cursor:pointer;
      }

      #waterExportR110 button:disabled{
        opacity:.5;
      }

      #waterExportR110Status{
        margin:8px 0 0;
        min-height:14px;
        text-align:center;
        color:#465461;
        font-size:10.5px;
        font-weight:700;
        line-height:1.3;
      }

      #waterExportR110Status.ok{color:#2a6942}
      #waterExportR110Status.err{color:#a23a2a}

      @media(max-width:360px){
        #waterExportR110 .r110Title{
          font-size:14px;
          margin-bottom:8px;
        }

        #waterExportR110 .r110Row{
          gap:6px;
        }

        #waterExportR110 .r110SelectWrap{
          height:36px;
        }

        #waterExportR110 select,
        #waterExportR110 button{
          height:36px !important;
          min-height:36px !important;
          max-height:36px !important;
          font-size:11px;
        }

        #waterExportR110 button{
          min-width:88px;
          flex-basis:30%;
          width:30%;
        }

        #waterExportR110Status{
          font-size:10px;
          margin-top:7px;
        }
      }
    `;

    document.head.appendChild(s);
  }

  function findTargetCard(){
    const direct=el('waterManageExportPlaceholder');
    if(direct)return direct;

    const panel=el('waterManagePanel');
    if(!panel)return null;

    const cards=panel.querySelectorAll('.waterCard');

    for(let i=0;i<cards.length;i++){
      const titleNode=cards[i].querySelector('.waterCardTitle');
      const title=txt(titleNode&&titleNode.textContent).toLowerCase();

      if(title.indexOf('tải file chỉ số')>=0){
        return cards[i];
      }
    }

    return null;
  }

  function mount(){
    if(mounted&&el('waterExportR110'))return true;

    const card=findTargetCard();
    if(!card)return false;

    ensureStyle();

    card.id='waterExportR110';
    card.innerHTML=`
      <div class="r110Title">TẢI FILE CHỈ SỐ</div>

      <div class="r110Row">
        <div class="r110SelectWrap">
          <select id="waterExportMonth" aria-label="Chọn tháng cần tải">
            <option value="">Chọn Tháng: Đang tải...</option>
          </select>
        </div>

        <button id="waterExportBtn" type="button" disabled>
          Tải File
        </button>
      </div>

      <div id="waterExportR110Status">
        Đang đọc danh sách kỳ...
      </div>
    `;

    mounted=true;

    el('waterExportBtn').addEventListener('click',downloadSelected);
    loadMonths();

    return true;
  }

  function status(message,kind){
    const n=el('waterExportR110Status');
    if(!n)return;

    n.className=kind||'';
    n.textContent=message||'';
  }

  function setMonths(list){
    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');

    if(!select||!btn)return;

    list=(list||[])
      .map(txt)
      .filter(function(v){
        return /^\d{1,2}\/\d{4}$/.test(v);
      })
      .filter(function(v,i,a){
        return a.indexOf(v)===i;
      })
      .sort(function(a,b){
        return periodScore(b)-periodScore(a);
      });

    select.innerHTML='';

    if(!list.length){
      const o=document.createElement('option');
      o.value='';
      o.textContent='Chọn Tháng: Chưa có dữ liệu';
      select.appendChild(o);
      btn.disabled=true;
      return;
    }

    list.forEach(function(v){
      const o=document.createElement('option');
      o.value=v;
      o.textContent='Chọn Tháng: '+v;
      select.appendChild(o);
    });

    btn.disabled=false;

    try{
      localStorage.setItem(MONTH_CACHE,JSON.stringify(list));
    }catch(e){}
  }

  async function loadMonths(){
    if(loading)return;
    loading=true;

    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');

    if(select)select.disabled=true;
    if(btn)btn.disabled=true;

    try{
      // Trong TAI_CHI_SO_THANG, cột J là Kỳ (ẩn)
      const data=await jsonp('select J where J is not null');
      const rows=data&&data.table&&Array.isArray(data.table.rows)
        ? data.table.rows
        : [];

      const months=rows.map(function(r){
        return txt(cell(r,0));
      });

      setMonths(months);

      const unique=months
        .map(txt)
        .filter(function(v){
          return /^\d{1,2}\/\d{4}$/.test(v);
        })
        .filter(function(v,i,a){
          return a.indexOf(v)===i;
        });

      status(
        unique.length
          ? 'Trên hệ thống có '+unique.length+' tháng dữ liệu chỉ số'
          : 'Trên hệ thống chưa có dữ liệu chỉ số',
        unique.length?'ok':''
      );

    }catch(e){
      let cached=[];

      try{
        cached=JSON.parse(localStorage.getItem(MONTH_CACHE)||'[]');
      }catch(_e){}

      setMonths(cached);

      status(
        cached.length
          ? 'Đang dùng danh sách tháng đã lưu trên máy'
          : 'Không tải được danh sách tháng dữ liệu.',
        'err'
      );

    }finally{
      loading=false;
      if(select)select.disabled=false;
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

  async function downloadSelected(){
    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');
    const period=txt(select&&select.value);

    if(!period){
      status('Anh chọn tháng cần tải trước.','err');
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
      'Đang lấy dữ liệu tháng '+period+'...',
      ''
    );

    try{
      // B:I = Tòa -> Ảnh đồng hồ
      // J = Kỳ (ẩn) dùng để lọc đúng tháng.
      const q=
        "select B,C,D,E,F,G,H,I where J = '"
        +period.replace(/'/g,"''")
        +"'";

      const data=await jsonp(q);

      const table=data&&data.table;
      const rows=table&&Array.isArray(table.rows)
        ? table.rows
        : [];

      if(!rows.length){
        throw new Error(
          'Tháng '+period+' chưa có dữ liệu để tải.'
        );
      }

      const aoa=[
        ['CHI SỐ NƯỚC THÁNG '+period,'','','','','','','',''],
        ['','','','','','','','',''],
        [
          'TT',
          'Tòa',
          'Tầng',
          'Căn hộ',
          'Mã đồng hồ',
          'Chỉ số kỳ trước',
          'Chỉ số kỳ này',
          'Tiêu thụ m³',
          'Ảnh đồng hồ'
        ]
      ];

      rows.forEach(function(r,index){
        const out=[String(index+1)];

        for(let i=0;i<8;i++){
          out.push(
            excelValue(
              r&&r.c ? r.c[i] : null
            )
          );
        }

        aoa.push(out);
      });

      const XLSX=await loadXlsx();
      const ws=XLSX.utils.aoa_to_sheet(aoa);

      ws['!merges']=[
        {
          s:{r:0,c:0},
          e:{r:0,c:8}
        }
      ];

      ws['!cols']=[
        {wch:7},
        {wch:12},
        {wch:10},
        {wch:14},
        {wch:18},
        {wch:17},
        {wch:17},
        {wch:14},
        {wch:38}
      ];

      ws['!autofilter']={
        ref:'A3:I'+aoa.length
      };

      const wb=XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        ('CHI_SO_'+period.replace('/','_')).slice(0,31)
      );

      const fileName=
        'Chi_so_nuoc_'
        +safeName(period.replace('/','-'))
        +'.xls';

      XLSX.writeFile(
        wb,
        fileName,
        {bookType:'biff8'}
      );

      status(
        'Đã tạo '+fileName+
        ' ('+rows.length+' dòng dữ liệu).',
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

      if(mount()||tries>25){
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
