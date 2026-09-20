/* R11.35 - XEM CHI SO review count V22
 * So du lieu can kiem tra xu ly duoc dem dong theo bo loc:
 * Toa / Tang / Can ho / Thang.
 * Nguon: GHI_SO_HANG_THANG, chi cac dong AG (Nhom can xu ly) khac rong.
 * Hien thi ca khi chon 1 thang va khi chon TAT CA.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-review-count-v22-filtered';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const RAW_SHEET='GHI_SO_HANG_THANG';
  const RAW_RANGE='A1:AH40000';
  const ALL='TẤT CẢ';
  const originalOpen=window.open.bind(window);
  let reviewRowsPromise=null;

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

  function loadReviewRows(){
    if(reviewRowsPromise)return reviewRowsPromise;
    reviewRowsPromise=new Promise(function(resolve,reject){
      const cb='__waterReviewCount22_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('timeout'));},15000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        if(err){reject(err);return;}

        const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
        const out=[];
        rows.forEach(function(r){
          const period=canonMonth(cell(r,0));
          const tower=txt(cell(r,1));
          const floor=txt(cell(r,2));
          const apartment=txt(cell(r,3));
          const meter=txt(cell(r,4));
          const group=txt(cell(r,5));
          if(period&&meter&&group){
            out.push({
              period:period,
              tower:tower,
              floor:floor,
              apartment:apartment,
              meter:meter,
              group:group
            });
          }
        });
        resolve(out);
      }

      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('load'));};
      const query='select B,C,D,E,F,AG where AG is not null';
      s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(RAW_SHEET)
        +'&range='+encodeURIComponent(RAW_RANGE)
        +'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent(query)+'&_='+Date.now();
      document.head.appendChild(s);
    });
    return reviewRowsPromise;
  }

  function install(win){
    let tries=0;
    const wait=setInterval(function(){
      tries++;
      try{
        if(!win||win.closed){clearInterval(wait);return;}
        const d=win.document;
        const summary=d.getElementById('wvSummary');
        const tower=d.getElementById('wvTower');
        const floor=d.getElementById('wvFloor');
        const apartment=d.getElementById('wvApartment');
        const month=d.getElementById('wvMonth');
        if(summary&&tower&&floor&&apartment&&month){
          clearInterval(wait);

          let line=d.getElementById('wvReviewCount');
          if(!line){
            line=d.createElement('div');
            line.id='wvReviewCount';
            line.style.cssText='flex:0 0 auto;text-align:center;font:800 12px/1.2 Arial,sans-serif;margin:-2px 0 6px;color:#a12b24;';
            summary.insertAdjacentElement('afterend',line);
          }

          let reviewRows=null;

          function update(){
            line.style.display='block';
            if(!reviewRows){
              line.textContent='Số dữ liệu cần kiểm tra xử lý: …';
              return;
            }

            const fTower=txt(tower.value);
            const fFloor=txt(floor.value);
            const fApartment=txt(apartment.value);
            const fMonth=canonMonth(month.value);

            const count=reviewRows.filter(function(r){
              if(!isAll(fTower) && r.tower!==fTower)return false;
              if(!isAll(fFloor) && r.floor!==fFloor)return false;
              if(!isAll(fApartment) && r.apartment!==fApartment)return false;
              if(!isAll(month.value) && r.period!==fMonth)return false;
              return true;
            }).length;

            line.textContent='Số dữ liệu cần kiểm tra xử lý: '+count;
            line.style.color=count>0?'#a12b24':'#35633d';
          }

          [tower,floor,apartment,month].forEach(function(sel){
            sel.addEventListener('change',function(){
              setTimeout(update,0);
            });
          });

          update();
          loadReviewRows().then(function(rows){
            reviewRows=rows;
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
