(function(){
  'use strict';

  const BUILD='879-final10-r9.2-default-capture';
  let applied=false;

  function openCaptureDefault(){
    if(applied)return;
    const btn=document.getElementById('waterTabCapture');
    if(!btn)return;
    applied=true;
    try{localStorage.setItem('water_active_main_tab_v1','capture');}catch(e){}
    btn.click();
  }

  function schedule(){
    setTimeout(openCaptureDefault,0);
    setTimeout(openCaptureDefault,120);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  }else{
    schedule();
  }

  window.addEventListener('pageshow',schedule,{once:true});
  window.WATER_DEFAULT_CAPTURE_BUILD=BUILD;
})();
