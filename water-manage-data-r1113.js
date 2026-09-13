(function(){
  'use strict';

  const BUILD='879-r11.13-month-select-fixed-range-current-fallback';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='TAI_CHI_SO_THANG';
  const DATA_RANGE='A3:J40000';
  const MONTH_CACHE='water_export_months_tai_chi_so_v1';

  // FILE HỆ THỐNG: file quản lý gốc, mở thẳng sheet CAN_XU_LY.
  const SYSTEM_FILE_URL='https://docs.google.com/spreadsheets/d/1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY/edit#gid=1884007052';

  // XEM CHỈ SỐ: file xem riêng, có cột XEM ẢNH.
  const VIEW_SHEET_URL='https://docs.google.com/spreadsheets/d/1YUYPIs7YtvM3rXGtI3FoTww_TW9DWDTlItY6tFHv5iw/edit#gid=1754101056&range=A2';

  const STAFF_SHEET='NHAN_SU_THUC_HIEN';
  const STAFF_RANGE='A4:F1003';

  // Danh sách tháng đọc từ dữ liệu ghi số thật.
  // File Excel vẫn tải từ TAI_CHI_SO_THANG.
  const MONTH_LIST_SHEET='GHI_SO_HANG_THANG';
  const MONTH_LIST_RANGE='A:B';

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

  function jsonpSheet(sheetName,rangeA1,query){
    return new Promise(function(resolve,reject){
      const cb='__waterSheet_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let done=false;

      const timer=setTimeout(function(){
        finish(new Error('Hết thời gian kiểm tra quyền tài khoản.'));
      },15000);

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
        finish(new Error('Không kiểm tra được danh sách nhân sự.'));
      };

      script.src=
        'https://docs.google.com/spreadsheets/d/'
        +encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='
        +encodeURIComponent(sheetName)
        +'&range='
        +encodeURIComponent(rangeA1)
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
    if(el('waterExportR119Style'))return;

    const s=document.createElement('style');
    s.id='waterExportR119Style';

    s.textContent=`
      #waterExportR119 .r119Title{
        margin:0 0 10px;
        text-align:center;
        color:#18232d;
        font-size:15px;
        font-weight:900;
        line-height:1.2;
      }

      #waterExportR119 .r119TopRow,
      #waterExportR119 .r119ActionRow{
        display:flex !important;
        visibility:visible !important;
        width:100%;
        gap:8px;
        align-items:center;
        box-sizing:border-box;
      }

      #waterExportR119 .r119TopRow{
        margin-bottom:8px;
      }

      #waterExportR119 .r119SelectWrap{
        position:relative;
        display:block !important;
        visibility:visible !important;
        opacity:1 !important;
        flex:1 1 auto;
        min-width:145px;
        height:38px;
        overflow:visible !important;
      }

      #waterExportR119 .r119SelectWrap::after{
        content:"▼";
        position:absolute;
        right:11px;
        top:50%;
        transform:translateY(-50%);
        color:#42505d;
        font-size:10px;
        pointer-events:none;
      }

      #waterExportR119 select,
      #waterExportR119 .r119System,
      #waterExportR119 .r119Action{
        height:38px !important;
        min-height:38px !important;
        max-height:38px !important;
        margin:0 !important;
        border:1px solid #bdc7d1;
        border-radius:9px;
        box-sizing:border-box;
        box-shadow:none;
        font-family:Arial,sans-serif;
        font-size:11.5px;
        font-weight:800;
      }

      #waterExportR119 select{
        display:block !important;
        visibility:visible !important;
        opacity:1 !important;
        pointer-events:auto !important;
        position:relative !important;
        width:100% !important;
        min-width:145px !important;
        padding:0 32px 0 10px;
        outline:none;
        appearance:none !important;
        -webkit-appearance:none !important;
        -moz-appearance:none !important;
        background:#f7f8fa;
        color:#18232d;
      }

      #waterExportR119 .r119System{
        flex:0 0 34%;
        min-width:110px;
        padding:0 8px;
        background:#eef2f5;
        color:#18232d;
        cursor:pointer;
      }

      #waterExportR119 .r119System.disabled{
        opacity:.5;
        cursor:not-allowed;
      }

      #waterExportR119 .r119Action{
        flex:1 1 50%;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:0 8px;
        background:#f7f8fa;
        color:#18232d;
        text-decoration:none !important;
        cursor:pointer;
        user-select:none;
        -webkit-tap-highlight-color:transparent;
      }

      #waterExportR119 .r119Action{
        display:flex !important;
        visibility:visible !important;
      }

      #waterExportR119 .r119Action.r119Inactive{
        display:flex !important;
        visibility:visible !important;
        opacity:.5 !important;
        pointer-events:auto !important;
        cursor:not-allowed;
      }

      #waterExportR119Status{
        margin:8px 0 0;
        min-height:14px;
        text-align:center;
        color:#465461;
        font-size:10.5px;
        font-weight:700;
        line-height:1.3;
      }

      #waterExportR119Status.ok{color:#2a6942}
      #waterExportR119Status.err{color:#a23a2a}

      @media(max-width:360px){
        #waterExportR119 .r119Title{font-size:14px}
        #waterExportR119 .r119TopRow,
        #waterExportR119 .r119ActionRow{gap:6px}

        #waterExportR119 .r119SelectWrap,
        #waterExportR119 select,
        #waterExportR119 .r119System,
        #waterExportR119 .r119Action{
          height:36px !important;
          min-height:36px !important;
          max-height:36px !important;
          font-size:10.8px;
        }

        #waterExportR119 .r119System{
          min-width:102px;
          flex-basis:34%;
        }

        #waterExportR119Status{
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

    const current=el('waterExportR119');
    if(current)return current;

    const panel=el('waterManagePanel');
    if(!panel)return null;

    const cards=panel.querySelectorAll('.waterCard');

    for(let i=0;i<cards.length;i++){
      const titleNode=cards[i].querySelector(
        '.waterCardTitle,.r100Title,.r102Title,.r106Title,.r108Title,.r110Title,.r111Title,.r119Title'
      );

      const title=txt(titleNode&&titleNode.textContent).toLowerCase();

      if(title.indexOf('tải file chỉ số')>=0 || title.indexOf('dữ liệu ghi chỉ số')>=0){
        return cards[i];
      }
    }

    return null;
  }

  function isCorrectMounted(){
    return !!(
      el('waterExportR119') &&
      el('waterExportMonthR119') &&
      el('waterSystemFileR119') &&
      el('waterDownloadR119') &&
      el('waterViewR119')
    );
  }

  function mount(){
    if(isCorrectMounted())return true;

    const card=findTargetCard();
    if(!card)return false;

    ensureStyle();

    card.id='waterExportR119';
    card.innerHTML=`
      <div class="r119Title">DỮ LIỆU GHI CHỈ SỐ</div>

      <div class="r119TopRow">
        <div class="r119SelectWrap">
          <select id="waterExportMonthR119"
                  aria-label="Chọn tháng dữ liệu"
                  style="display:block!important;visibility:visible!important;opacity:1!important">
            <option value="">Chọn Tháng: Đang tải...</option>
          </select>
        </div>

        <button
          id="waterSystemFileR119"
          class="r119System disabled"
          type="button"
          disabled
          aria-disabled="true"
          title="Chỉ Trưởng bộ phận đang làm việc được mở từ App"
        >FILE HỆ THỐNG</button>
      </div>

      <div class="r119ActionRow">
        <button
          id="waterDownloadR119"
          class="r119Action r119Inactive"
          type="button"
          style="display:flex!important;visibility:visible!important"
          aria-disabled="true"
        >TẢI FILE</button>

        <button
          id="waterViewR119"
          class="r119Action"
          type="button"
          aria-label="Xem chỉ số trên Google Sheet"
        >XEM CHỈ SỐ</button>
      </div>

      <div id="waterExportR119Status">
        R11.13 • Đang đọc dữ liệu hệ thống...
      </div>
    `;

    const systemBtn=el('waterSystemFileR119');
    const download=el('waterDownloadR119');
    const view=el('waterViewR119');

    systemBtn.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

      if(systemBtn.disabled || systemBtn.classList.contains('disabled')){
        status('FILE HỆ THỐNG chỉ dành cho Trưởng bộ phận đang làm việc.','err');
        return false;
      }

      status('Đang mở FILE HỆ THỐNG → CAN_XU_LY...','');
      window.open(SYSTEM_FILE_URL,'_blank','noopener,noreferrer');
      return false;
    },false);

    download.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

      if(download.classList.contains('r119Inactive')){
        status('TẢI FILE chưa sẵn sàng. Anh chờ dữ liệu tháng tải xong.','err');
        return false;
      }
      downloadSelected();
      return false;
    },false);

    view.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

      status(
        'Đang mở XEM CHỈ SỐ. Google sẽ kiểm tra quyền email đã đăng ký.',
        ''
      );

      window.open(VIEW_SHEET_URL,'_blank','noopener,noreferrer');
      return false;
    },false);

    keepMonthSelectorVisible();
    loadMonths();
    watchSystemAccess();

    // Chống CSS/module khác ẩn lại ô chọn tháng sau khi render.
    setTimeout(keepMonthSelectorVisible,300);
    setTimeout(function(){
      keepMonthSelectorVisible();

      const s=el('waterExportMonthR119');
      const current=currentPeriodFromApp();

      if(
        current &&
        s &&
        (
          !s.value ||
          /Chưa có dữ liệu|Đang tải/.test(txt(s.options[s.selectedIndex] && s.options[s.selectedIndex].textContent))
        )
      ){
        setMonths([current]);
        status('R11.13 • Đã nhận kỳ hiện tại: '+current,'ok');
      }
    },1000);

    setTimeout(keepMonthSelectorVisible,2500);

    return true;
  }

  function status(message,kind){
    const n=el('waterExportR119Status');
    if(!n)return;

    n.className=kind||'';
    n.textContent=message||'';
  }

  function setDisabled(disabled){
    const button=el('waterDownloadR119');
    if(!button)return;

    button.classList.toggle('r119Inactive',!!disabled);
    button.setAttribute('aria-disabled',disabled?'true':'false');

    // Luôn ép hiển thị để không bị CSS chung của App ẩn nút.
    button.style.setProperty('display','flex','important');
    button.style.setProperty('visibility','visible','important');
  }

  function currentStaffName(){
    const node=el('waterManageStaff');
    const v=txt(node&&node.textContent);
    return v==='—' ? '' : v;
  }

  async function refreshSystemAccess(){
    const btn=el('waterSystemFileR119');
    if(!btn)return;

    btn.disabled=true;
    btn.classList.add('disabled');
    btn.setAttribute('aria-disabled','true');

    const name=currentStaffName();
    if(!name){
      btn.title='Chưa xác định người đang thực hiện';
      return;
    }

    try{
      const data=await jsonpSheet(
        STAFF_SHEET,
        STAFF_RANGE,
        "select B,C,E,F where B is not null"
      );

      const rows=
        data &&
        data.table &&
        Array.isArray(data.table.rows)
          ? data.table.rows
          : [];

      const target=name.toLocaleLowerCase('vi-VN');

      const ok=rows.some(function(r){
        const staffName=txt(cell(r,0)).toLocaleLowerCase('vi-VN');
        const role=txt(cell(r,1)).toLocaleLowerCase('vi-VN');
        const email=txt(cell(r,2));
        const state=txt(cell(r,3)).toLocaleLowerCase('vi-VN');

        return (
          staffName===target &&
          role==='trưởng bộ phận' &&
          !!email &&
          state==='đang làm việc'
        );
      });

      btn.disabled=!ok;
      btn.classList.toggle('disabled',!ok);
      btn.setAttribute('aria-disabled',ok?'false':'true');
      btn.title=ok
        ? 'Mở file quản lý gốc tại CAN_XU_LY'
        : 'Chỉ Trưởng bộ phận đang làm việc được mở từ App';

    }catch(e){
      btn.title='Không kiểm tra được quyền nhân sự';
    }
  }

  function watchSystemAccess(){
    refreshSystemAccess();

    let watched=null;
    let observer=null;
    let tries=0;

    const timer=setInterval(function(){
      tries++;

      const node=el('waterManageStaff');

      if(node && node!==watched){
        watched=node;

        if(observer)observer.disconnect();

        observer=new MutationObserver(function(){
          refreshSystemAccess();
        });

        observer.observe(node,{
          childList:true,
          subtree:true,
          characterData:true
        });

        refreshSystemAccess();
      }

      if(tries>=30){
        clearInterval(timer);
      }
    },1000);
  }

  function keepMonthSelectorVisible(){
    const wrap=document.querySelector('#waterExportR119 .r119SelectWrap');
    const select=el('waterExportMonthR119');

    if(wrap){
      wrap.style.setProperty('display','block','important');
      wrap.style.setProperty('visibility','visible','important');
      wrap.style.setProperty('opacity','1','important');
      wrap.style.setProperty('min-width','145px','important');
    }

    if(select){
      select.disabled=false;
      select.style.setProperty('display','block','important');
      select.style.setProperty('visibility','visible','important');
      select.style.setProperty('opacity','1','important');
      select.style.setProperty('width','100%','important');
      select.style.setProperty('min-width','145px','important');
    }
  }

  function currentPeriodFromApp(){
    const candidates=[
      el('progressPeriod'),
      el('waterManagePeriod'),
      document.querySelector('[data-water-period]')
    ];

    for(let i=0;i<candidates.length;i++){
      const v=txt(candidates[i] && candidates[i].textContent);
      if(/^\d{1,2}\/\d{4}$/.test(v)){
        return v;
      }
    }

    return '';
  }

  function setMonths(list){
    keepMonthSelectorVisible();

    const select=el('waterExportMonthR119');
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

    const select=el('waterExportMonthR119');

    keepMonthSelectorVisible();

    /*
      R11.13:
      1) Lấy ngay kỳ đang chạy trên App để người dùng chọn/tải được tức thì.
      2) Sau đó đọc bổ sung các kỳ lịch sử từ GHI_SO_HANG_THANG.
      3) File Excel vẫn chỉ lấy từ TAI_CHI_SO_THANG.
    */
    const current=currentPeriodFromApp();
    let visibleList=current ? setMonths([current]) : [];

    if(!visibleList.length && select){
      select.innerHTML='';
      const pending=document.createElement('option');
      pending.value='';
      pending.textContent='Chọn Tháng: Đang tải...';
      select.appendChild(pending);
      setDisabled(true);
    }

    try{
      const data=await jsonpSheet(
        MONTH_LIST_SHEET,
        MONTH_LIST_RANGE,
        "select B where B is not null"
      );

      const rows=
        data &&
        data.table &&
        Array.isArray(data.table.rows)
          ? data.table.rows
          : [];

      const months=rows.map(function(r){
        return txt(cell(r,0));
      });

      if(current){
        months.push(current);
      }

      let list=setMonths(months);

      // Fallback: nếu Google Visualization chưa trả dữ liệu,
      // vẫn giữ kỳ đang chạy trên App.
      if(!list.length && current){
        list=setMonths([current]);
      }

      // Fallback cuối: thử TAI_CHI_SO_THANG.
      if(!list.length){
        const data2=await jsonp('select J where J is not null');

        const rows2=
          data2 &&
          data2.table &&
          Array.isArray(data2.table.rows)
            ? data2.table.rows
            : [];

        const months2=rows2.map(function(r){
          return txt(cell(r,0));
        });

        list=setMonths(months2);
      }

      status(
        list.length
          ? 'R11.13 • Đã sẵn sàng chọn tháng • Tải file: TAI_CHI_SO_THANG'
          : 'R11.13 • Chưa tìm thấy kỳ ghi số.',
        list.length?'ok':'err'
      );

    }catch(e){
      let cached=[];

      try{
        cached=JSON.parse(localStorage.getItem(MONTH_CACHE)||'[]');
      }catch(_e){}

      if(current){
        cached.push(current);
      }

      const list=setMonths(cached);

      status(
        list.length
          ? 'R11.13 • Đã dùng kỳ hiện tại/danh sách tháng đã lưu.'
          : 'R11.13 • Không đọc được danh sách tháng.',
        list.length?'ok':'err'
      );

    }finally{
      loading=false;
      keepMonthSelectorVisible();
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
      ['CHI SỐ NƯỚC THÁNG '+period,'','','','','','',''],
      ['','','','','','','',''],
      [
        'TT',
        'Tòa',
        'Tầng',
        'Căn hộ',
        'Mã đồng hồ',
        'Chỉ số kỳ trước',
        'Chỉ số kỳ này',
        'Tiêu thụ m³'
      ]
    ];

    rows.forEach(function(r,index){
      const vals=[];
      for(let i=0;i<7;i++){
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
        vals[6]
      ]);
    });

    const ws=XLSX.utils.aoa_to_sheet(aoa);

    ws['!merges']=[
      {
        s:{r:0,c:0},
        e:{r:0,c:7}
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
      {wch:14}
    ];

    ws['!rows']=[
      {hpt:24},
      {hpt:18},
      {hpt:30}
    ];

    // Giữ TT/Tòa/Tầng/Căn hộ/Mã đồng hồ dạng text để không mất số 0 đầu.
    for(let r=3;r<aoa.length;r++){
      for(let c=0;c<=4;c++){
        const addr=XLSX.utils.encode_cell({r:r,c:c});
        if(ws[addr]){
          ws[addr].t='s';
          ws[addr].v=String(ws[addr].v==null?'':ws[addr].v);
          ws[addr].z='@';
        }
      }
    }

    if(aoa.length>=4){
      ws['!autofilter']={
        ref:'A3:H'+aoa.length
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

  function downloadStamp(){
    const d=new Date();
    const p=function(v){ return String(v).padStart(2,'0'); };

    return (
      d.getFullYear()
      +p(d.getMonth()+1)
      +p(d.getDate())
      +'_'
      +p(d.getHours())
      +p(d.getMinutes())
      +p(d.getSeconds())
    );
  }

  async function downloadSelected(){
    const select=el('waterExportMonthR119');
    const link=el('waterDownloadR119');
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
        B:H = 7 cột dữ liệu xuất file (không xuất cột ảnh).
        J = Kỳ dùng để lọc.
        KHÔNG tham chiếu bất kỳ Sheet hàng đợi nào.
      */
      const q=
        "select B,C,D,E,F,G,H where J = '" 
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
        'CHI_SO_NUOC_'
        +safeName(period.replace('/','-'))
        +'_'
        +downloadStamp()
        +'.xlsx';

      const bytes=XLSX.write(
        wb,
        {
          bookType:'xlsx',
          type:'array',
          compression:true
        }
      );

      // Kiểm tra CHÍNH bytes sẽ tải xuống: bắt buộc chỉ A:H.
      const verifyBook=XLSX.read(bytes,{type:'array'});
      const verifySheet=verifyBook.Sheets[verifyBook.SheetNames[0]];
      const verifyRange=XLSX.utils.decode_range(verifySheet['!ref']||'A1:A1');

      if(verifyRange.e.c!==7){
        throw new Error('Khóa R11.13: file tải không đúng 8 cột A:H.');
      }

      for(let rr=0;rr<=verifyRange.e.r;rr++){
        if(verifySheet['I'+(rr+1)]){
          throw new Error('Khóa R11.13: phát hiện cột I/Ảnh trong file tải.');
        }
      }

      const blob=new Blob(
        [bytes],
        {
          type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      );

      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=fileName;
      a.rel='noopener';
      a.style.display='none';

      document.body.appendChild(a);
      a.click();

      // Giữ blob sống 60 giây để nút/tên file trong cửa sổ tải có thể mở đúng
      // CHÍNH file vừa tạo, không rơi vào bản cũ/cache.
      setTimeout(function(){
        URL.revokeObjectURL(url);
        if(a.parentNode)a.parentNode.removeChild(a);
      },60000);

      status(
        'R11.13 • '+fileName+' • 8 cột A:H • Không ảnh.',
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
