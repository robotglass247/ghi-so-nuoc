(function(){
  'use strict';

  const BUILD='water-v20-lazy-tabs-v1';
  const VERSION='v44';
  let manageStarted=false;
  let manageReady=false;

  const manageScripts=[
    './dev-r1135-offline/manage-view-offline-lock-dev.js?v=1&rel='+VERSION,
    './dev-r1135-offline/manage-unified-data-v1.js?v=1&rel='+VERSION,
    './dev-r1135-unified/manage-view-month-v4.js?v=18&rel='+VERSION,
    './dev-r1135-unified/manage-view-footer-fit-v1.js?v=19&rel='+VERSION,
    './dev-r1135-unified/manage-view-review-count-v1.js?v=25&rel='+VERSION,
    './dev-r1135-unified/manage-view-review-column-v1.js?v=2&rel='+VERSION,
    './dev-r1135-unified/manage-view-summary-label-v1.js?v=1&rel='+VERSION,
    './dev-r1135-unified/manage-download-v2.js?v=2&rel='+VERSION
  ];

  function loadScript(src){
    return new Promise(function(resolve,reject){
      const found=Array.from(document.scripts).some(function(s){return String(s.src||'').indexOf(src.split('?')[0])>=0;});
      if(found){resolve();return;}
      const s=document.createElement('script');
      s.src=src;
      s.async=false;
      s.onload=function(){resolve();};
      s.onerror=function(){reject(new Error('Không tải được '+src));};
      document.head.appendChild(s);
    });
  }

  async function loadManage(){
    if(manageReady||manageStarted)return;
    manageStarted=true;
    try{
      for(const src of manageScripts){await loadScript(src);}
      manageReady=true;
      window.dispatchEvent(new CustomEvent('WATER_MANAGE_LAZY_READY'));
    }catch(e){
      manageStarted=false;
      console.warn('[V20 lazy manage]',e);
    }
  }

  document.addEventListener('click',function(ev){
    const btn=ev.target&&ev.target.closest?ev.target.closest('#waterTabManage'):null;
    if(!btn)return;
    setTimeout(loadManage,0);
  },true);

  window.WATER_LOAD_MANAGE_MODULES=loadManage;
  window.WATER_V20_LAZY_TABS_BUILD=BUILD;
})();
