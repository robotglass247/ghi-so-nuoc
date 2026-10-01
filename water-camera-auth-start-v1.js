(function(){
  'use strict';

  const BUILD='water-camera-auth-start-v3-core-wait-reacquire';
  let bootPromise=null;

  function wait(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}

  function hasStaff(){
    try{
      return !!(
        localStorage.getItem('water_staff') ||
        sessionStorage.getItem('water_staff') ||
        (window.WATER_AUTH_STAFF&&window.WATER_AUTH_STAFF.ma)
      );
    }catch(e){return !!(window.WATER_AUTH_STAFF&&window.WATER_AUTH_STAFF.ma);}
  }

  function cameraReady(){
    try{
      const v=document.getElementById('video');
      if(!v)return false;
      const s=v.srcObject;
      if(!s||!s.getVideoTracks)return false;
      return !!(
        v.videoWidth>0 &&
        v.videoHeight>0 &&
        s.getVideoTracks().some(function(t){return t.readyState==='live';})
      );
    }catch(e){return false;}
  }

  function coreStarting(){
    try{
      return typeof cameraStarting!=='undefined' && !!cameraStarting;
    }catch(e){return false;}
  }

  async function waitForCore(timeoutMs){
    const started=Date.now();
    while(Date.now()-started<(timeoutMs||10000)){
      if(
        window.WATER_AUTH_OK &&
        hasStaff() &&
        document.getElementById('video') &&
        typeof window.startCamera==='function'
      ){
        return window.startCamera;
      }
      await wait(100);
    }
    return null;
  }

  async function waitUntilNotStarting(timeoutMs){
    const started=Date.now();
    while(coreStarting() && Date.now()-started<(timeoutMs||4500)){
      await wait(100);
    }
  }

  async function waitForPicture(timeoutMs){
    const started=Date.now();
    while(Date.now()-started<(timeoutMs||3000)){
      if(cameraReady())return true;
      await wait(100);
    }
    return cameraReady();
  }

  async function bootCamera(){
    if(bootPromise)return bootPromise;

    bootPromise=(async function(){
      if(!window.WATER_AUTH_OK || cameraReady())return;

      const startFn=await waitForCore(10000);
      if(!startFn || cameraReady())return;

      // Nếu lõi đang mở camera từ luồng cũ thì chờ nó kết thúc trước,
      // tránh hai getUserMedia chạy song song gây màn hình đen.
      await waitUntilNotStarting(4500);
      if(cameraReady())return;

      try{await Promise.resolve(startFn(false));}catch(e){}
      if(await waitForPicture(2200))return;

      // Preview vẫn đen: giải phóng stream cũ và xin lại camera đúng 1 lần.
      await waitUntilNotStarting(2500);
      if(cameraReady())return;
      try{await Promise.resolve(startFn(true));}catch(e){}
      await waitForPicture(3500);
    })().finally(function(){
      bootPromise=null;
    });

    return bootPromise;
  }

  function scheduleBoot(){
    setTimeout(function(){bootCamera().catch(function(){});},0);
  }

  window.addEventListener('WATER_AUTH_OK',scheduleBoot);
  window.addEventListener('pageshow',function(){
    if(window.WATER_AUTH_OK&&!cameraReady())scheduleBoot();
  });
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'&&window.WATER_AUTH_OK&&!cameraReady())scheduleBoot();
  });

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      if(window.WATER_AUTH_OK)scheduleBoot();
    },{once:true});
  }else if(window.WATER_AUTH_OK){
    scheduleBoot();
  }

  window.WATER_CAMERA_AUTH_START_BUILD=BUILD;
})();
