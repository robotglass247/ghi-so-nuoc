/* R11.35 - XEM CHI SO summary label V1
 * Chi doi nhan tong so ket qua, khong sua logic loc/du lieu.
 */
(function(){
  'use strict';
  const BUILD='r1135-view-summary-label-v1';
  const originalOpen=window.open.bind(window);

  function install(win){
    let tries=0;
    const wait=setInterval(function(){
      tries++;
      try{
        if(!win||win.closed){clearInterval(wait);return;}
        const d=win.document;
        const summary=d.getElementById('wvSummary');
        if(summary){
          clearInterval(wait);
          let busy=false;
          function fix(){
            if(busy)return;
            const raw=String(summary.textContent||'').trim();
            const m=raw.match(/(\d+)\s*dòng\s*$/i);
            if(!m)return;
            const wanted='Tổng số kết quả chỉ số: '+m[1];
            if(raw===wanted)return;
            busy=true;
            summary.textContent=wanted;
            busy=false;
          }
          const obs=new win.MutationObserver(function(){fix();});
          obs.observe(summary,{childList:true,subtree:true,characterData:true});
          fix();
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

  window.WATER_VIEW_SUMMARY_LABEL_BUILD=BUILD;
})();
