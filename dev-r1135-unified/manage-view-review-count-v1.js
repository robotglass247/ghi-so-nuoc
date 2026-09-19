/* R11.35 - XEM CHI SO review count V21
 * Hien thi dung so "Can xu ly" tu CAN_XU_LY!H2.
 * Khong tu dem lai cac co AG trong lich su de tranh dem ca du lieu cu/da xu ly.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-review-count-v21';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const COUNT_SHEET='CAN_XU_LY';
  const originalOpen=window.open.bind(window);

  function txt(v){return String(v==null?'':v).trim();}
  function cell(row,i){const c=row&&row.c&&row.c[i];return c?(c.f!=null?c.f:c.v):'';}

  function loadCurrentReviewCount(){
    return new Promise(function(resolve,reject){
      const cb='__waterReviewCount21_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('timeout'));},12000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        if(err){reject(err);return;}

        const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
        if(!rows.length){reject(new Error('empty'));return;}
        const v=cell(rows[0],0);
        const n=Number(String(v).replace(/[^0-9.-]/g,''));
        if(!Number.isFinite(n)){reject(new Error('invalid'));return;}
        resolve(n);
      }

      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('load'));};
      s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(COUNT_SHEET)
        +'&range=H2:H2&headers=0&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  function install(win){
    let tries=0;
    const wait=setInterval(function(){
      tries++;
      try{
        if(!win||win.closed){clearInterval(wait);return;}
        const d=win.document;
        const summary=d.getElementById('wvSummary');
        const title=d.getElementById('wvTitle');
        if(summary&&title){
          clearInterval(wait);

          let line=d.getElementById('wvReviewCount');
          if(!line){
            line=d.createElement('div');
            line.id='wvReviewCount';
            line.style.cssText='flex:0 0 auto;text-align:center;font:800 12px/1.2 Arial,sans-serif;margin:-2px 0 6px;color:#a12b24;';
            summary.insertAdjacentElement('afterend',line);
          }

          let currentCount=null;
          function update(){
            const history=/LỊCH SỬ CHỈ SỐ NƯỚC/i.test(txt(title.textContent));
            if(!history){line.style.display='none';return;}
            line.style.display='block';
            if(currentCount===null){
              line.textContent='Số dữ liệu cần kiểm tra xử lý: …';
              return;
            }
            line.textContent='Số dữ liệu cần kiểm tra xử lý: '+currentCount;
            line.style.color=currentCount>0?'#a12b24':'#35633d';
          }

          const obs=new win.MutationObserver(update);
          obs.observe(title,{childList:true,subtree:true,characterData:true});
          update();

          loadCurrentReviewCount().then(function(n){
            currentCount=n;
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
