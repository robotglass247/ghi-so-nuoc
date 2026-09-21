/* R11.35 - XEM CHI SO review count V25
 * Hien so ngay, khong cho Google Sheet tra ve.
 * - Fallback dong bo tu CAN_XU_LY tai thoi diem build: Ky 09/2026, 15 ma dang can xu ly.
 * - Van thu tai live CAN_XU_LY o nen; neu thanh cong thi thay fallback bang du lieu moi.
 * - Dem tren cac dong dang hien thi sau bo loc Toa / Tang / Can ho / Thang.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-review-count-v25-immediate-fallback';
  const SHEET_ID='18R-6ulz85T34hXOu5B2GrYoqHrWiDV4BO6LojJp16_A';
  const COUNT_SHEET='CAN_XU_LY';
  const ALL='TẤT CẢ';
  const originalOpen=window.open.bind(window);

  // Snapshot hien tai doc truc tiep tu CAN_XU_LY.
  const FALLBACK_PERIOD='09/2026';
  const FALLBACK_METERS=[
    'P3309','P2609','P2608','P3102','P3103','P3105','P3111','P3114','P3115',
    'P2606','P2607','P2605','P2602','P2603','P3106'
  ];

  function txt(v){return String(v==null?'':v).trim();}
  function canonMonth(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';
  }
  function cell(row,i){
    const c=row&&row.c&&row.c[i];
    return c?(c.f!=null?c.f:c.v):'';
  }
  function isAll(v){
    const s=txt(v).toUpperCase();
    return !s || s===ALL || s==='TAT CA';
  }

  function fallbackData(){
    return {period:canonMonth(FALLBACK_PERIOD),meters:new Set(FALLBACK_METERS)};
  }

  function gviz(range,tag,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb='__waterReviewCount25_'+tag+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('timeout'));},timeoutMs||5000);
      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        err?reject(err):resolve(data);
      }
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('load'));};
      s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(COUNT_SHEET)
        +'&range='+encodeURIComponent(range)
        +'&headers=0&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function loadLive(){
    const results=await Promise.all([
      gviz('D2:D2','period',4500),
      gviz('B5:B500','meters',4500)
    ]);
    const pRows=results[0]&&results[0].table&&Array.isArray(results[0].table.rows)?results[0].table.rows:[];
    const period=pRows.length?canonMonth(cell(pRows[0],0)):'';
    if(!period)throw new Error('period');

    const mRows=results[1]&&results[1].table&&Array.isArray(results[1].table.rows)?results[1].table.rows:[];
    const meters=new Set();
    mRows.forEach(function(r){
      const m=txt(cell(r,0));
      if(m && m.toLowerCase()!=='mã đồng hồ')meters.add(m);
    });
    if(!meters.size)throw new Error('meters');
    return {period:period,meters:meters};
  }

  function install(win){
    let tries=0;
    const wait=setInterval(function(){
      tries++;
      try{
        if(!win||win.closed){clearInterval(wait);return;}
        const d=win.document;
        const summary=d.getElementById('wvSummary');
        const body=d.getElementById('wvBody');
        const month=d.getElementById('wvMonth');
        if(summary&&body&&month){
          clearInterval(wait);

          let line=d.getElementById('wvReviewCount');
          if(!line){
            line=d.createElement('div');
            line.id='wvReviewCount';
            line.style.cssText='flex:0 0 auto;text-align:center;font:800 12px/1.2 Arial,sans-serif;margin:-2px 0 6px;color:#a12b24;';
            summary.insertAdjacentElement('afterend',line);
          }

          // Co du lieu fallback ngay lap tuc => khong con dau "…".
          let active=fallbackData();

          function update(){
            line.style.display='block';
            const selectedMonth=txt(month.value);
            const selectedCanon=canonMonth(selectedMonth);

            if(!isAll(selectedMonth) && selectedCanon!==active.period){
              line.textContent='Số dữ liệu cần kiểm tra xử lý: 0';
              line.style.color='#35633d';
              return;
            }

            let count=0;
            const rows=Array.from(body.querySelectorAll('tr'));
            rows.forEach(function(tr){
              const td=tr.querySelectorAll('td');
              if(td.length<5)return;
              const meter=txt(td[4].textContent);
              if(!meter || !active.meters.has(meter))return;

              // Che do TAT CA: cot dau la Ky, chi dem Ky dang xu ly.
              if(isAll(selectedMonth)){
                const rowPeriod=canonMonth(td[0].textContent);
                if(rowPeriod!==active.period)return;
              }
              count++;
            });

            line.textContent='Số dữ liệu cần kiểm tra xử lý: '+count;
            line.style.color=count>0?'#a12b24':'#35633d';
          }

          const obs=new win.MutationObserver(function(){update();});
          obs.observe(body,{childList:true,subtree:true,characterData:true});
          month.addEventListener('change',function(){setTimeout(update,0);});

          // Hien ngay bang fallback.
          update();

          // Neu live CAN_XU_LY doc duoc thi tu dong thay snapshot bang du lieu moi.
          loadLive().then(function(data){
            active=data;
            update();
          }).catch(function(){
            // Giu fallback, khong doi thanh -- de man hinh luon co so lieu.
          });
        }
      }catch(e){}
      if(tries>=120)clearInterval(wait);
    },100);
  }

  window.open=function(){
    const args=Array.prototype.slice.call(arguments);
    const win=originalOpen.apply(window,args);
    const url=String(args[0]==null?'':args[0]);
    if(win&&(!url||url==='about:blank'))install(win);
    return win;
  };

  window.WATER_VIEW_REVIEW_COUNT_BUILD=BUILD;
})();
