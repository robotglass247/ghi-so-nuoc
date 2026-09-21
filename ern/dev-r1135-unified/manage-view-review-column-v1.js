/* R11.35 - XEM CHI SO review column V2
 * Cot NỘI DUNG CẦN KIỂM TRA lay dung Ly do can xu ly tu CAN_XU_LY cot I.
 * Ghep theo Ky xu ly + Ma dong ho. Khong sua logic loc/bang goc.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-review-column-v2-reason';
  const SHEET_ID='18R-6ulz85T34hXOu5B2GrYoqHrWiDV4BO6LojJp16_A';
  const SHEET='CAN_XU_LY';
  const ALL='TẤT CẢ';
  const originalOpen=window.open.bind(window);

  const FALLBACK_PERIOD='09/2026';
  const FALLBACK_REASONS={
    P3309:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P2609:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P2608:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',
    P3102:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P3103:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P3105:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',
    P3111:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P3114:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P3115:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',
    P2606:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P2607:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P2605:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',
    P2602:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P2603:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ',P3106:'THIẾU/SAI CHỈ SỐ ĐẦU KỲ'
  };

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
  function key(period,meter){return canonMonth(period)+'|'+txt(meter);}

  function fallbackMap(){
    const map=new Map();
    Object.keys(FALLBACK_REASONS).forEach(function(m){
      map.set(key(FALLBACK_PERIOD,m),FALLBACK_REASONS[m]);
    });
    return map;
  }

  function gviz(range,tag,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb='__waterReviewCol2_'+tag+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);
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
        +'/gviz/tq?sheet='+encodeURIComponent(SHEET)
        +'&range='+encodeURIComponent(range)
        +'&headers=0&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function loadLiveMap(){
    const results=await Promise.all([
      gviz('D2:D2','period',5000),
      gviz('A5:I500','rows',5000)
    ]);
    const pRows=results[0]&&results[0].table&&Array.isArray(results[0].table.rows)?results[0].table.rows:[];
    const period=pRows.length?canonMonth(cell(pRows[0],0)):'';
    if(!period)throw new Error('period');

    const rows=results[1]&&results[1].table&&Array.isArray(results[1].table.rows)?results[1].table.rows:[];
    const map=new Map();
    rows.forEach(function(r){
      const meter=txt(cell(r,1));
      const reason=txt(cell(r,8));
      if(meter&&reason&&meter.toLowerCase()!=='mã đồng hồ')map.set(key(period,meter),reason);
    });
    if(!map.size)throw new Error('empty');
    return map;
  }

  function install(win){
    let tries=0;
    const wait=setInterval(function(){
      tries++;
      try{
        if(!win||win.closed){clearInterval(wait);return;}
        const d=win.document;
        const head=d.getElementById('wvHead');
        const body=d.getElementById('wvBody');
        const month=d.getElementById('wvMonth');
        if(head&&body&&month){
          clearInterval(wait);
          let reviewMap=fallbackMap();
          let busy=false;
          let scheduled=false;

          function decorate(){
            if(busy)return;
            busy=true;
            try{
              let th=head.querySelector('th[data-wv-review-col="1"]');
              if(!th){
                th=d.createElement('th');
                th.setAttribute('data-wv-review-col','1');
                head.appendChild(th);
              }
              th.textContent='NỘI DUNG CẦN KIỂM TRA';
              th.style.cssText='min-width:145px;max-width:185px;white-space:normal;line-height:1.15;';

              const selectedMonth=txt(month.value);
              const history=isAll(selectedMonth);
              Array.from(body.querySelectorAll('tr')).forEach(function(tr){
                const cells=tr.querySelectorAll('td');
                if(!cells.length)return;

                const empty=tr.querySelector('td.empty');
                if(empty){empty.setAttribute('colspan','10');return;}
                if(cells.length<5)return;

                const meter=txt(cells[4].textContent);
                const period=history?canonMonth(cells[0].textContent):canonMonth(selectedMonth);
                const reason=reviewMap.get(key(period,meter))||'';

                let td=tr.querySelector('td[data-wv-review-col="1"]');
                if(!td){
                  td=d.createElement('td');
                  td.setAttribute('data-wv-review-col','1');
                  tr.appendChild(td);
                }
                if(td.textContent!==reason)td.textContent=reason;
                td.style.cssText=reason
                  ?'min-width:145px;max-width:185px;white-space:normal;line-height:1.15;font-weight:800;color:#a12b24;background:#fff1e8;'
                  :'min-width:145px;max-width:185px;white-space:normal;line-height:1.15;color:#607080;';
              });
            }finally{busy=false;}
          }

          function schedule(){
            if(scheduled)return;
            scheduled=true;
            win.setTimeout(function(){scheduled=false;decorate();},0);
          }

          const obs=new win.MutationObserver(schedule);
          obs.observe(head,{childList:true,subtree:true,characterData:true});
          obs.observe(body,{childList:true,subtree:true,characterData:true});
          month.addEventListener('change',function(){win.setTimeout(decorate,0);});

          decorate();
          loadLiveMap().then(function(map){reviewMap=map;decorate();}).catch(function(){});
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

  window.WATER_VIEW_REVIEW_COLUMN_BUILD=BUILD;
})();
