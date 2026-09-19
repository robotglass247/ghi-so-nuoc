/* R11.35 - XEM CHI SO review count V20
 * Them dong "So du lieu can kiem tra xu ly" trong che do LICH SU.
 * Dem theo dung tieu chi CAN_XU_LY: GHI_SO_HANG_THANG!AG <> "".
 * So dem tu dong thay doi theo cac dong dang hien thi sau bo loc.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-review-count-v20';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const RAW_SHEET='GHI_SO_HANG_THANG';
  const RAW_RANGE='A1:AH40000';
  const originalOpen=window.open.bind(window);
  let reviewSetPromise=null;

  function txt(v){return String(v==null?'':v).trim();}
  function canonMonth(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';
  }
  function key(period,meter){return canonMonth(period)+'|'+txt(meter);}
  function cell(row,i){const c=row&&row.c&&row.c[i];return c?(c.f!=null?c.f:c.v):'';}

  function loadReviewSet(){
    if(reviewSetPromise)return reviewSetPromise;
    reviewSetPromise=new Promise(function(resolve,reject){
      const cb='__waterReviewCount20_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('timeout'));},15000);
      function finish(err,data){
        if(done)return;done=true;clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        if(err){reject(err);return;}
        const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
        const set=new Set();
        rows.forEach(function(r){
          const period=canonMonth(cell(r,0));
          const meter=txt(cell(r,1));
          const group=txt(cell(r,2));
          if(period&&meter&&group)set.add(key(period,meter));
        });
        resolve(set);
      }
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('load'));};
      const query="select B,F,AG where AG is not null";
      s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(RAW_SHEET)
        +'&range='+encodeURIComponent(RAW_RANGE)
        +'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent(query)+'&_='+Date.now();
      document.head.appendChild(s);
    });
    return reviewSetPromise;
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
        const title=d.getElementById('wvTitle');
        if(summary&&body&&title){
          clearInterval(wait);
          let line=d.getElementById('wvReviewCount');
          if(!line){
            line=d.createElement('div');
            line.id='wvReviewCount';
            line.style.cssText='flex:0 0 auto;text-align:center;font:800 12px/1.2 Arial,sans-serif;margin:-2px 0 6px;color:#a12b24;';
            summary.insertAdjacentElement('afterend',line);
          }

          let reviewSet=null;
          function update(){
            const history=/LỊCH SỬ CHỈ SỐ NƯỚC/i.test(txt(title.textContent));
            if(!history){line.style.display='none';return;}
            line.style.display='block';
            if(!reviewSet){line.textContent='Số dữ liệu cần kiểm tra xử lý: …';return;}
            let count=0;
            const rows=Array.from(body.querySelectorAll('tr'));
            rows.forEach(function(tr){
              const td=tr.querySelectorAll('td');
              if(td.length<5)return;
              const period=txt(td[0].textContent);
              const meter=txt(td[4].textContent);
              if(reviewSet.has(key(period,meter)))count++;
            });
            line.textContent='Số dữ liệu cần kiểm tra xử lý: '+count;
            line.style.color=count>0?'#a12b24':'#35633d';
          }

          const obs=new win.MutationObserver(update);
          obs.observe(body,{childList:true,subtree:true,characterData:true});
          obs.observe(title,{childList:true,subtree:true,characterData:true});
          update();
          loadReviewSet().then(function(set){reviewSet=set;update();}).catch(function(){
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
