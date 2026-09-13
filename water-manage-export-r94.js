(function(){
  'use strict';

  const BUILD='879-r11.4-real-biff8-xls';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='TAI_CHI_SO_THANG';
  const DATA_RANGE='A3:J40000';
  const MONTH_CACHE='water_export_months_tai_chi_so_v1';

  let loading=false;

  function el(id){ return document.getElementById(id); }
  function txt(v){ return String(v==null?'':v).trim(); }

  function cell(row,i){
    const c=row&&row.c&&row.c[i];
    return c ? (c.f!=null ? c.f : c.v) : '';
  }

  function esc(v){
    return txt(v).replace(/[&<>"']/g,function(c){
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[c];
    });
  }

  function periodScore(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m ? Number(m[2])*12 + Number(m[1]) : 0;
  }

  function safeName(v){
    return txt(v)
      .replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_')
      .replace(/^_+|_+$/g,'');
  }

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterTaiChiSo_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let done=false;

      const timer=setTimeout(function(){
        finish(new Error('Hết thời gian đọc TAI_CHI_SO_THANG.'));
      },20000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);

        try{ delete window[cb]; }
        catch(e){ window[cb]=undefined; }

        if(script.parentNode){
          script.parentNode.removeChild(script);
        }

        err ? reject(err) : resolve(data);
      }

      window[cb]=function(data){
        finish(null,data);
      };

      script.onerror=function(){
        finish(new Error('Không đọc được sheet TAI_CHI_SO_THANG.'));
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
    if(el('waterExportR112Style'))return;

    const s=document.createElement('style');
    s.id='waterExportR112Style';

    s.textContent=`
      #waterExportR112 .r112Title{
        margin:0 0 9px;
        text-align:center;
        color:#18232d;
        font-size:15px;
        font-weight:900;
        line-height:1.2;
      }

      #waterExportR112 .r112Row{
        display:flex;
        width:100%;
        gap:8px;
        align-items:center;
        justify-content:space-between;
        box-sizing:border-box;
      }

      #waterExportR112 .r112SelectWrap{
        position:relative;
        flex:1 1 auto;
        min-width:0;
        height:38px;
      }

      #waterExportR112 .r112SelectWrap::after{
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

      #waterExportR112 select,
      #waterExportR112 .r112Download{
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

      #waterExportR112 select{
        display:block;
        width:100%;
        padding:0 32px 0 10px;
        outline:none;
        appearance:none !important;
        -webkit-appearance:none !important;
        -moz-appearance:none !important;
        background-image:none !important;
      }

      #waterExportR112 .r112Download{
        display:flex;
        flex:0 0 31%;
        width:31%;
        min-width:96px;
        padding:0 8px;
        align-items:center;
        justify-content:center;
        white-space:nowrap;
        text-align:center;
        text-decoration:none !important;
        cursor:pointer;
        user-select:none;
        -webkit-tap-highlight-color:transparent;
      }

      #waterExportR112 .r112Download.disabled{
        opacity:.5;
        pointer-events:none;
      }

      #waterExportR112Status{
        margin:8px 0 0;
        min-height:14px;
        text-align:center;
        color:#465461;
        font-size:10.5px;
        font-weight:700;
        line-height:1.3;
      }

      #waterExportR112Status.ok{ color:#2a6942; }
      #waterExportR112Status.err{ color:#a23a2a; }

      @media(max-width:360px){
        #waterExportR112 .r112Title{
          font-size:14px;
          margin-bottom:8px;
        }

        #waterExportR112 .r112Row{
          gap:6px;
        }

        #waterExportR112 .r112SelectWrap{
          height:36px;
        }

        #waterExportR112 select,
        #waterExportR112 .r112Download{
          height:36px !important;
          min-height:36px !important;
          max-height:36px !important;
          font-size:11px;
        }

        #waterExportR112 .r112Download{
          min-width:88px;
          flex-basis:30%;
          width:30%;
        }

        #waterExportR112Status{
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

    const current=el('waterExportR112');
    if(current)return current;

    const panel=el('waterManagePanel');
    if(!panel)return null;

    const cards=panel.querySelectorAll('.waterCard');

    for(let i=0;i<cards.length;i++){
      const titleNode=cards[i].querySelector(
        '.waterCardTitle,.r100Title,.r102Title,.r106Title,.r108Title,.r110Title,.r111Title'
      );

      const title=txt(titleNode&&titleNode.textContent).toLowerCase();

      if(title.indexOf('tải file chỉ số')>=0){
        return cards[i];
      }
    }

    return null;
  }

  function isCorrectMounted(){
    return !!(
      el('waterExportR112') &&
      el('waterExportMonthR112') &&
      el('waterDownloadSelectedMonthR112')
    );
  }

  function mount(){
    if(isCorrectMounted())return true;

    const card=findTargetCard();
    if(!card)return false;

    ensureStyle();

    /*
      QUAN TRỌNG:
      Ghi đè toàn bộ nội dung card để loại bỏ button cũ
      cùng toàn bộ listener gắn trực tiếp vào DOM cũ.
    */
    card.id='waterExportR112';

    card.innerHTML=`
      <div class="r112Title">TẢI FILE CHỈ SỐ</div>

      <div class="r112Row">
        <div class="r112SelectWrap">
          <select id="waterExportMonthR112" aria-label="Chọn tháng cần tải">
            <option value="">Chọn Tháng: Đang tải...</option>
          </select>
        </div>

        <a
          id="waterDownloadSelectedMonthR112"
          class="r112Download disabled"
          href="#"
          role="button"
          aria-disabled="true"
        >Tải File</a>
      </div>

      <div id="waterExportR112Status">
        Đang đọc nguồn TAI_CHI_SO_THANG...
      </div>
    `;

    const link=el('waterDownloadSelectedMonthR112');

    /*
      Dùng <a> riêng thay vì button cũ để tránh code cũ
      bắt theo selector button / waterExportBtn.
    */
    link.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

      if(link.classList.contains('disabled'))return false;

      downloadSelected();
      return false;
    },false);

    loadMonths();
    return true;
  }

  function status(message,kind){
    const n=el('waterExportR112Status');
    if(!n)return;

    n.className=kind||'';
    n.textContent=message||'';
  }

  function setDisabled(disabled){
    const link=el('waterDownloadSelectedMonthR112');
    if(!link)return;

    link.classList.toggle('disabled',!!disabled);
    link.setAttribute('aria-disabled',disabled?'true':'false');
  }

  function setMonths(list){
    const select=el('waterExportMonthR112');
    if(!select)return;

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
      setDisabled(true);
      return [];
    }

    list.forEach(function(v){
      const o=document.createElement('option');
      o.value=v;
      o.textContent='Chọn Tháng: '+v;
      select.appendChild(o);
    });

    setDisabled(false);

    try{
      localStorage.setItem(MONTH_CACHE,JSON.stringify(list));
    }catch(e){}

    return list;
  }

  async function loadMonths(){
    if(loading)return;
    loading=true;

    const select=el('waterExportMonthR112');

    if(select)select.disabled=true;
    setDisabled(true);

    try{
      /*
        CHỈ đọc cột J của TAI_CHI_SO_THANG.
        KHÔNG có bất kỳ fallback nào sang HANG_DOI_ANH_V87.
      */
      const data=await jsonp('select J where J is not null');

      const rows=
        data &&
        data.table &&
        Array.isArray(data.table.rows)
          ? data.table.rows
          : [];

      const months=rows.map(function(r){
        return txt(cell(r,0));
      });

      const list=setMonths(months);

      status(
        list.length
          ? 'Nguồn tải: TAI_CHI_SO_THANG • '+list.length+' tháng dữ liệu'
          : 'TAI_CHI_SO_THANG chưa có dữ liệu.',
        list.length?'ok':'err'
      );

    }catch(e){
      /*
        Có thể dùng cache danh sách tháng để hiển thị,
        NHƯNG download vẫn bắt buộc đọc TAI_CHI_SO_THANG.
        Không bao giờ đọc Sheet hàng đợi.
      */
      let cached=[];

      try{
        cached=JSON.parse(localStorage.getItem(MONTH_CACHE)||'[]');
      }catch(_e){}

      const list=setMonths(cached);

      if(list.length){
        status(
          'Không đọc được danh sách mới. Nguồn tải vẫn khóa tại TAI_CHI_SO_THANG.',
          'err'
        );
      }else{
        status(
          'Không đọc được TAI_CHI_SO_THANG.',
          'err'
        );
      }

    }finally{
      loading=false;

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
          resolve(window.XLSX);
          return;
        }

        if(i>=urls.length){
          reject(new Error('Không tải được thư viện Excel.'));
          return;
        }

        const s=document.createElement('script');
        s.src=urls[i++];
        s.async=true;

        s.onload=function(){
          if(window.XLSX){
            resolve(window.XLSX);
          }else{
            next();
          }
        };

        s.onerror=next;
        document.head.appendChild(s);
      }

      next();
    });
  }

  function buildRealXls(period,rows,XLSX){
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
      const vals=[];
      for(let i=0;i<8;i++){
        vals.push(txt(cell(r,i)));
      }

      aoa.push([
        String(index+1),
        vals[0],
        vals[1],
        vals[2],
        vals[3],
        vals[4],
        vals[5],
        vals[6],
        vals[7]
      ]);
    });

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
      {wch:45}
    ];

    ws['!rows']=[
      {hpt:24},
      {hpt:18},
      {hpt:30}
    ];

    // Giữ các cột nhận dạng dưới dạng text để không mất số 0 đầu.
    for(let r=3;r<aoa.length;r++){
      for(let c=0;c<=4;c++){
        const addr=XLSX.utils.encode_cell({r:r,c:c});
        if(ws[addr]){
          ws[addr].t='s';
          ws[addr].v=String(ws[addr].v==null?'':ws[addr].v);
          ws[addr].z='@';
        }
      }

      // Ảnh đồng hồ là hyperlink thật trong Excel.
      const imgAddr=XLSX.utils.encode_cell({r:r,c:8});
      if(ws[imgAddr] && txt(ws[imgAddr].v)){
        ws[imgAddr].l={
          Target:String(ws[imgAddr].v),
          Tooltip:'Mở ảnh đồng hồ'
        };
      }
    }

    if(aoa.length>=4){
      ws['!autofilter']={
        ref:'A3:I'+aoa.length
      };
    }

    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      ('CHI_SO_'+period.replace('/','_')).slice(0,31)
    );

    return wb;
  }

  async function downloadSelected(){
    const select=el('waterExportMonthR112');
    const link=el('waterDownloadSelectedMonthR112');
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

    setDisabled(true);

    const old=link?link.textContent:'Tải File';

    if(link){
      link.textContent='Đang tạo...';
    }

    status(
      'Đang lấy '+period+' từ TAI_CHI_SO_THANG...',
      ''
    );

    try{
      /*
        B:I = 8 cột dữ liệu xuất file.
        J = Kỳ dùng để lọc.
        KHÔNG tham chiếu bất kỳ Sheet hàng đợi nào.
      */
      const q=
        "select B,C,D,E,F,G,H,I where J = '"
        +period.replace(/'/g,"''")
        +"'";

      const data=await jsonp(q);

      const rows=
        data &&
        data.table &&
        Array.isArray(data.table.rows)
          ? data.table.rows
          : [];

      if(!rows.length){
        throw new Error(
          'TAI_CHI_SO_THANG không có dữ liệu kỳ '+period+'.'
        );
      }

      const XLSX=await loadXlsx();
      const wb=buildRealXls(period,rows,XLSX);

      const fileName=
        'TAI_CHI_SO_THANG_'
        +safeName(period.replace('/','-'))
        +'.xls';

      XLSX.writeFile(
        wb,
        fileName,
        {
          bookType:'biff8',
          compression:false
        }
      );

      status(
        'Đã tạo file Excel thật từ TAI_CHI_SO_THANG ('+rows.length+' dòng).',
        'ok'
      );

    }catch(e){
      /*
        CỐ Ý KHÔNG FALLBACK.
        Nếu TAI_CHI_SO_THANG lỗi thì dừng tại đây.
      */
      status(
        txt(e&&e.message)||
        'Không tải được dữ liệu từ TAI_CHI_SO_THANG.',
        'err'
      );

    }finally{
      if(link){
        link.textContent=old||'Tải File';
      }

      setDisabled(false);
    }
  }

  function keepMounted(){
    /*
      Nếu module layout khác dựng lại Tab QUẢN LÝ,
      module này sẽ dựng lại card tải mới.
    */
    if(!isCorrectMounted()){
      mount();
    }
  }

  function start(){
    if(mount())return;

    let tries=0;

    const timer=setInterval(function(){
      tries++;

      if(mount() || tries>40){
        clearInterval(timer);
      }
    },200);
  }

  if(window.MutationObserver){
    const obs=new MutationObserver(function(){
      keepMounted();
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
  window.WATER_MANAGE_EXPORT_SOURCE=DATA_SHEET;
})();
