(function(){
  'use strict';

  const BUILD='879-r11.1-export-match-file-template';
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
  function esc(v){
    return txt(v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function periodScore(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m ? Number(m[2])*12+Number(m[1]) : 0;
  }
  function safeName(v){
    return txt(v).replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_').replace(/^_+|_+$/g,'');
  }

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterExport_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let done=false;

      const timer=setTimeout(function(){
        finish(new Error('Hết thời gian đọc dữ liệu.'));
      },20000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(script.parentNode)script.parentNode.removeChild(script);
        err?reject(err):resolve(data);
      }

      window[cb]=function(data){finish(null,data);};
      script.onerror=function(){finish(new Error('Không đọc được dữ liệu Google Sheets.'));};

      script.src=
        'https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(DATA_SHEET)
        +'&range='+encodeURIComponent(DATA_RANGE)
        +'&headers=1'
        +'&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent(query)
        +'&_='+Date.now();

      document.head.appendChild(script);
    });
  }

  function ensureStyle(){
    if(el('waterExportR111Style'))return;
    const s=document.createElement('style');
    s.id='waterExportR111Style';
    s.textContent=`
      #waterExportR111 .r111Title{
        margin:0 0 9px;
        text-align:center;
        color:#18232d;
        font-size:15px;
        font-weight:900;
        line-height:1.2;
      }
      #waterExportR111 .r111Row{
        display:flex;
        width:100%;
        gap:8px;
        align-items:center;
        justify-content:space-between;
        box-sizing:border-box;
      }
      #waterExportR111 .r111SelectWrap{
        position:relative;
        flex:1 1 auto;
        min-width:0;
        height:38px;
      }
      #waterExportR111 .r111SelectWrap::after{
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
      #waterExportR111 select,
      #waterExportR111 button{
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
      #waterExportR111 select{
        display:block;
        width:100%;
        padding:0 32px 0 10px;
        outline:none;
        appearance:none !important;
        -webkit-appearance:none !important;
        -moz-appearance:none !important;
        background-image:none !important;
      }
      #waterExportR111 button{
        display:block;
        flex:0 0 31%;
        width:31%;
        min-width:96px;
        padding:0 8px;
        white-space:nowrap;
        text-align:center;
        cursor:pointer;
      }
      #waterExportR111 button:disabled{opacity:.5}
      #waterExportR111Status{
        margin:8px 0 0;
        min-height:14px;
        text-align:center;
        color:#465461;
        font-size:10.5px;
        font-weight:700;
        line-height:1.3;
      }
      #waterExportR111Status.ok{color:#2a6942}
      #waterExportR111Status.err{color:#a23a2a}

      @media(max-width:360px){
        #waterExportR111 .r111Title{font-size:14px;margin-bottom:8px}
        #waterExportR111 .r111Row{gap:6px}
        #waterExportR111 .r111SelectWrap{height:36px}
        #waterExportR111 select,
        #waterExportR111 button{
          height:36px !important;
          min-height:36px !important;
          max-height:36px !important;
          font-size:11px;
        }
        #waterExportR111 button{
          min-width:88px;
          flex-basis:30%;
          width:30%;
        }
        #waterExportR111Status{font-size:10px;margin-top:7px}
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
      if(title.indexOf('tải file chỉ số')>=0)return cards[i];
    }
    return null;
  }

  function mount(){
    if(mounted&&el('waterExportR111'))return true;

    const card=findTargetCard();
    if(!card)return false;

    ensureStyle();
    card.id='waterExportR111';
    card.innerHTML=`
      <div class="r111Title">TẢI FILE CHỈ SỐ</div>
      <div class="r111Row">
        <div class="r111SelectWrap">
          <select id="waterExportMonth" aria-label="Chọn tháng cần tải">
            <option value="">Chọn Tháng: Đang tải...</option>
          </select>
        </div>
        <button id="waterExportBtn" type="button" disabled>Tải File</button>
      </div>
      <div id="waterExportR111Status">Đang đọc danh sách kỳ...</div>
    `;

    mounted=true;
    el('waterExportBtn').addEventListener('click',downloadSelected);
    loadMonths();
    return true;
  }

  function status(message,kind){
    const n=el('waterExportR111Status');
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
      .filter(function(v){return /^\d{1,2}\/\d{4}$/.test(v);})
      .filter(function(v,i,a){return a.indexOf(v)===i;})
      .sort(function(a,b){return periodScore(b)-periodScore(a);});

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
    try{localStorage.setItem(MONTH_CACHE,JSON.stringify(list));}catch(e){}
  }

  async function loadMonths(){
    if(loading)return;
    loading=true;

    const select=el('waterExportMonth');
    const btn=el('waterExportBtn');
    if(select)select.disabled=true;
    if(btn)btn.disabled=true;

    try{
      const data=await jsonp('select J where J is not null');
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
      const months=rows.map(function(r){return txt(cell(r,0));});
      setMonths(months);

      const unique=months
        .filter(function(v){return /^\d{1,2}\/\d{4}$/.test(v);})
        .filter(function(v,i,a){return a.indexOf(v)===i;});

      status(
        unique.length
          ? 'Trên hệ thống có '+unique.length+' tháng dữ liệu chỉ số'
          : 'Trên hệ thống chưa có dữ liệu chỉ số',
        unique.length?'ok':''
      );
    }catch(e){
      let cached=[];
      try{cached=JSON.parse(localStorage.getItem(MONTH_CACHE)||'[]');}catch(_e){}
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

  function excelHtml(period,rows){
    const headers=[
      'TT','Tòa','Tầng','Căn hộ','Mã đồng hồ',
      'Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ'
    ];

    const body=rows.map(function(r,index){
      const vals=[];
      for(let i=0;i<8;i++)vals.push(txt(cell(r,i)));

      const imageUrl=vals[7];
      const cells=[
        '<td class="c center text">'+esc(index+1)+'</td>',
        '<td class="c center text">'+esc(vals[0])+'</td>',
        '<td class="c center text">'+esc(vals[1])+'</td>',
        '<td class="c center text">'+esc(vals[2])+'</td>',
        '<td class="c center text">'+esc(vals[3])+'</td>',
        '<td class="c num">'+esc(vals[4])+'</td>',
        '<td class="c num">'+esc(vals[5])+'</td>',
        '<td class="c num">'+esc(vals[6])+'</td>',
        '<td class="c link">'+(
          imageUrl
            ? '<a href="'+esc(imageUrl)+'">'+esc(imageUrl)+'</a>'
            : ''
        )+'</td>'
      ];
      return '<tr>'+cells.join('')+'</tr>';
    }).join('');

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>CHI_SO_${esc(period.replace('/','_'))}</x:Name>
        <x:WorksheetOptions>
          <x:Selected/>
          <x:FreezePanes/>
          <x:FrozenNoSplit/>
          <x:SplitHorizontal>3</x:SplitHorizontal>
          <x:TopRowBottomPane>3</x:TopRowBottomPane>
          <x:ActivePane>2</x:ActivePane>
          <x:ProtectContents>False</x:ProtectContents>
          <x:ProtectObjects>False</x:ProtectObjects>
          <x:ProtectScenarios>False</x:ProtectScenarios>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table{
    border-collapse:collapse;
    font-family:"Times New Roman";
    font-size:11pt;
  }
  .title{
    color:#0000FF;
    font-family:"Times New Roman";
    font-size:15pt;
    font-weight:bold;
    text-align:center;
    vertical-align:bottom;
    height:24pt;
  }
  .blank{height:18pt}
  .hdr{
    background:#FCE5CD;
    font-family:"Times New Roman";
    font-size:10pt;
    font-weight:bold;
    text-align:center;
    vertical-align:middle;
    white-space:normal;
    border:1px solid #000000;
    height:30pt;
  }
  .c{
    font-family:"Times New Roman";
    font-size:11pt;
    vertical-align:bottom;
    height:18pt;
  }
  .center{text-align:center}
  .num{text-align:right}
  .text{mso-number-format:"\\@"}
  .link{text-align:left;white-space:nowrap}
  .link a{color:#467887;text-decoration:underline}
  .w1{width:45pt}
  .w2{width:65pt}
  .w3{width:55pt}
  .w4{width:70pt}
  .w5{width:95pt}
  .w6{width:95pt}
  .w7{width:95pt}
  .w8{width:85pt}
  .w9{width:260pt}
</style>
</head>
<body>
<table>
  <col class="w1"><col class="w2"><col class="w3"><col class="w4"><col class="w5">
  <col class="w6"><col class="w7"><col class="w8"><col class="w9">
  <tr><td class="title" colspan="9">CHI SỐ NƯỚC THÁNG ${esc(period)}</td></tr>
  <tr><td class="blank" colspan="9"></td></tr>
  <tr>${headers.map(function(h){return '<td class="hdr">'+esc(h)+'</td>';}).join('')}</tr>
  ${body}
</table>
</body>
</html>`;
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
      status('Thiết bị đang OFFLINE. Cần Internet để tải file.','err');
      return;
    }

    const old=btn?btn.textContent:'';
    if(btn){
      btn.disabled=true;
      btn.textContent='Đang tạo...';
    }

    status('Đang lấy dữ liệu tháng '+period+'...','');

    try{
      const q=
        "select B,C,D,E,F,G,H,I where J = '"
        +period.replace(/'/g,"''")
        +"'";

      const data=await jsonp(q);
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];

      if(!rows.length){
        throw new Error('Tháng '+period+' chưa có dữ liệu để tải.');
      }

      const html=excelHtml(period,rows);
      const blob=new Blob(
        ['\uFEFF',html],
        {type:'application/vnd.ms-excel;charset=utf-8;'}
      );

      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='Chi_so_nuoc_'+safeName(period.replace('/','-'))+'.xls';
      document.body.appendChild(a);
      a.click();

      setTimeout(function(){
        try{URL.revokeObjectURL(url);}catch(e){}
        if(a.parentNode)a.parentNode.removeChild(a);
      },1500);

      status(
        'Đã tạo file đúng mẫu FILE_CHI_SO_THANG ('+rows.length+' dòng).',
        'ok'
      );
    }catch(e){
      status(
        txt(e&&e.message)||'Không tải được file chỉ số.',
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
      if(mount()||tries>25)clearInterval(timer);
    },250);
  }

  if(window.MutationObserver){
    const obs=new MutationObserver(function(){
      if(!mounted)mount();
    });
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }

  window.WATER_MANAGE_EXPORT_BUILD=BUILD;
})();
