/* R11.35 - XEM CHI SO review column V1
 * Them cot CAN KIEM TRA/XU LY trong XEM CHI SO.
 * Nguon: CAN_XU_LY, ghep theo Ky xu ly + Ma dong ho.
 * Khong sua logic loc/thang/bang goc.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-review-column-v1';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const SHEET='CAN_XU_LY';
  const ALL='TẤT CẢ';
  const originalOpen=window.open.bind(window);

  // Snapshot duoc doc truc tiep tu CAN_XU_LY tai thoi diem build; live data se thay the khi tai duoc.
  const FALLBACK_PERIOD='09/2026';
  const FALLBACK_GROUPS={
    P3309:'CẦN SỬA DỮ LIỆU',P2609:'CẦN SỬA DỮ LIỆU',P2608:'CẦN SỬA DỮ LIỆU',
    P3102:'CẦN SỬA DỮ LIỆU',P3103:'CẦN SỬA DỮ LIỆU',P3105:'CẦN SỬA DỮ LIỆU',
    P3111:'CẦN SỬA DỮ LIỆU',P3114:'CẦN SỬA DỮ LIỆU',P3115:'CẦN SỬA DỮ LIỆU',
    P2606:'CẦN SỬA DỮ LIỆU',P2607:'CẦN SỬA DỮ LIỆU',P2605:'CẦN SỬA DỮ LIỆU',
    P2602:'CẦN SỬA DỮ LIỆU',P2603:'CẦN SỬA DỮ LIỆU',P3106:'CẦN SỬA DỮ LIỆU'
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
    Object.keys(FALLBACK_GROUPS).forEach(function(m){
      map.set(key(FALLBACK_PERIOD,m),FALLBACK_GROUPS[m]);
    });
    return map;
  }

  function gviz(range,tag,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb='__waterReviewCol1_'+tag+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);
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
      gviz('A5:B500','rows',5000)
    ]);
    const pRows=results[0]&&results[0].table&&Array.isArray(results[0].table.rows)?results[0].table.rows:[];
    const period=pRows.length?canonMonth(cell(pRows[0],0)):'';
    if(!period)throw new Error('period');

    const rows=results[1]&&results[1].table&&Array.isArray(results[1].table.rows)?results[1].table.rows:[];
    const map=new Map();
    rows.forEach(function(r){
      const group=txt(cell(r,0));
      const meter=txt(cell(r,1));
      if(group&&meter&&meter.toLowerCase()!=='mã đồng hồ')map.set(key(period,meter),group);
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
                th.textContent='CẦN KIỂM TRA/XỬ LÝ';
                th.style.cssText='min-width:106px;max-width:130px;white-space:normal;line-height:1.15;';
                head.appendChild(th);
              }

              const selectedMonth=txt(month.value);
              const history=isAll(selectedMonth);
              Array.from(body.querySelectorAll('tr')).forEach(function(tr){
                const cells=tr.querySelectorAll('td');
                if(!cells.length)return;

                const empty=tr.querySelector('td.empty');
                if(empty){
                  if(empty.getAttribute('colspan')!=='10')empty.setAttribute('colspan','10');
                  return;
                }
                if(cells.length<5)return;

                const meter=txt(cells[4].textContent);
                const period=history?canonMonth(cells[0].textContent):canonMonth(selectedMonth);
                const value=reviewMap.get(key(period,meter))||'';

                let td=tr.querySelector('td[data-wv-review-col="1"]');
                if(!td){
                  td=d.createElement('td');
                  td.setAttribute('data-wv-review-col','1');
                  td.style.cssText='min-width:106px;max-width:130px;white-space:normal;line-height:1.15;font-weight:800;';
                  tr.appendChild(td);
                }
                if(td.textContent!==value)td.textContent=value;
                const css=value
                  ?'min-width:106px;max-width:130px;white-space:normal;line-height:1.15;font-weight:800;color:#a12b24;background:#fff1e8;'
                  :'min-width:106px;max-width:130px;white-space:normal;line-height:1.15;font-weight:800;color:#607080;';
                if(td.style.cssText!==css)td.style.cssText=css;
              });
            }finally{
              busy=false;
            }
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
          loadLiveMap().then(function(map){
            reviewMap=map;
            decorate();
          }).catch(function(){
            // Giu snapshot cua CAN_XU_LY de cot van hien thi neu Google Sheets live bi chan tren mobile.
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

  window.WATER_VIEW_REVIEW_COLUMN_BUILD=BUILD;
})();
