/* R11.35 - XEM CHI SO review count V24
 * Nhanh va dung theo CAN_XU_LY:
 * - Chi doc Ky xu ly CAN_XU_LY!D2 va danh sach ma dong ho CAN_XU_LY!B5:B500.
 * - Khong quet GHI_SO_HANG_THANG 40.000 dong.
 * - Dem tren cac dong dang hien thi sau bo loc Toa / Tang / Can ho / Thang.
 * - TAT CA thang chi dem cac dong cua Ky xu ly hien tai.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-review-count-v24-fast-visible-filtered';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const COUNT_SHEET='CAN_XU_LY';
  const ALL='TẤT CẢ';
  const originalOpen=window.open.bind(window);
  let activePromise=null;

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

  function gviz(range,tag,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb='__waterReviewCount24_'+tag+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('timeout'));},timeoutMs||8000);

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

  async function loadActive(){
    if(activePromise)return activePromise;
    activePromise=(async function(){
      const results=await Promise.all([
        gviz('D2:D2','period',7000),
        gviz('B5:B500','meters',7000)
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
      return {period:period,meters:meters};
    })();
    return activePromise;
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

          let active=null;

          function update(){
            line.style.display='block';
            if(!active){
              line.textContent='Số dữ liệu cần kiểm tra xử lý: …';
              return;
            }

            const selectedMonth=txt(month.value);
            const selectedCanon=canonMonth(selectedMonth);

            // Neu chon mot thang khac ky dang xu ly thi khong co du lieu dang can xu ly.
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

              // Cot 5 luon la Ma dong ho trong ca che do 1 thang va Lich su.
              const meter=txt(td[4].textContent);
              if(!meter || !active.meters.has(meter))return;

              // Khi chon TAT CA, cot 1 la Ky (mm/yyyy), chi dem ky dang xu ly.
              if(isAll(selectedMonth)){
                const rowPeriod=canonMonth(td[0].textContent);
                if(rowPeriod!==active.period)return;
              }

              count++;
            });

            line.textContent='Số dữ liệu cần kiểm tra xử lý: '+count;
            line.style.color=count>0?'#a12b24':'#35633d';
          }

          // Main viewer redraws body after every filter change, so observe body rather than re-filtering source again.
          const obs=new win.MutationObserver(function(){update();});
          obs.observe(body,{childList:true,subtree:true,characterData:true});
          month.addEventListener('change',function(){setTimeout(update,0);});

          update();
          loadActive().then(function(data){
            active=data;
            update();
          }).catch(function(){
            line.textContent='Số dữ liệu cần kiểm tra xử lý: --';
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
