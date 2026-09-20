/* R11.35 - XEM CHI SO review count V23
 * Dem dung tap du lieu dang can xu ly theo CAN_XU_LY:
 * - Lay Ky xu ly hien tai tu CAN_XU_LY!D2.
 * - Chi lay cac dong GHI_SO_HANG_THANG co B = Ky xu ly va AG <> rong.
 * - Sau do loc dong theo Toa / Tang / Can ho / Thang tren man hinh.
 * - TAT CA thang = tat ca du lieu can xu ly cua ky hien tai, khong cong co AG cua cac ky khac.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-review-count-v23-current-period-filtered';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const COUNT_SHEET='CAN_XU_LY';
  const RAW_SHEET='GHI_SO_HANG_THANG';
  const RAW_RANGE='A1:AH40000';
  const ALL='TẤT CẢ';
  const originalOpen=window.open.bind(window);
  let activeRowsPromise=null;

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

  function gviz(sheet,range,query,tag,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb='__waterReviewCount23_'+tag+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('timeout'));},timeoutMs||15000);

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
      let url='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(sheet)
        +'&range='+encodeURIComponent(range)
        +'&headers=0&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&_='+Date.now();
      if(query)url+='&tq='+encodeURIComponent(query);
      s.src=url;
      document.head.appendChild(s);
    });
  }

  async function loadCurrentPeriod(){
    const data=await gviz(COUNT_SHEET,'D2:D2','', 'period',12000);
    const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
    if(!rows.length)throw new Error('period-empty');
    const period=canonMonth(cell(rows[0],0));
    if(!period)throw new Error('period-invalid');
    return period;
  }

  async function loadActiveRows(){
    if(activeRowsPromise)return activeRowsPromise;
    activeRowsPromise=(async function(){
      const period=await loadCurrentPeriod();
      const safe=period.replace(/'/g,"''");
      const query="select B,C,D,E,F,AG where B = '"+safe+"' and AG is not null";
      const data=await gviz(RAW_SHEET,RAW_RANGE,query,'rows',16000);
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
      const out=[];
      rows.forEach(function(r){
        const rowPeriod=canonMonth(cell(r,0));
        const tower=txt(cell(r,1));
        const floor=txt(cell(r,2));
        const apartment=txt(cell(r,3));
        const meter=txt(cell(r,4));
        const group=txt(cell(r,5));
        if(rowPeriod===period && meter && group){
          out.push({
            period:rowPeriod,
            tower:tower,
            floor:floor,
            apartment:apartment,
            meter:meter,
            group:group
          });
        }
      });
      return {period:period,rows:out};
    })();
    return activeRowsPromise;
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

          let activeData=null;

          function update(){
            line.style.display='block';
            if(!activeData){
              line.textContent='Số dữ liệu cần kiểm tra xử lý: …';
              return;
            }

            const fTower=txt(tower.value);
            const fFloor=txt(floor.value);
            const fApartment=txt(apartment.value);
            const rawMonth=txt(month.value);
            const fMonth=canonMonth(rawMonth);

            const count=activeData.rows.filter(function(r){
              if(!isAll(fTower) && r.tower!==fTower)return false;
              if(!isAll(fFloor) && r.floor!==fFloor)return false;
              if(!isAll(fApartment) && r.apartment!==fApartment)return false;
              if(!isAll(rawMonth) && r.period!==fMonth)return false;
              return true;
            }).length;

            line.textContent='Số dữ liệu cần kiểm tra xử lý: '+count;
            line.style.color=count>0?'#a12b24':'#35633d';
          }

          [tower,floor,apartment,month].forEach(function(sel){
            sel.addEventListener('change',function(){setTimeout(update,0);});
          });

          update();
          loadActiveRows().then(function(data){
            activeData=data;
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
