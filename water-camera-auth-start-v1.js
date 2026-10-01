(function(){
  'use strict';

  const BUILD='water-camera-auth-start-v1';

  function cameraReady(){
    try{
      const v=document.getElementById('video');
      if(!v)return false;
      const s=v.srcObject;
      if(!s||!s.getVideoTracks)return false;
      return !!(v.videoWidth>0&&v.videoHeight>0&&s.getVideoTracks().some(function(t){return t.readyState==='live';}));
    }catch(e){return false;}
  }

  function tryStart(){
    if(!window.WATER_AUTH_OK)return;
    if(cameraReady())return;
    const fn=window.startCamera;
    if(typeof fn!=='function')return;
    try{
      Promise.resolve(fn()).catch(function(){});
    }catch(e){}
  }

  function startBurst(){
    [0,80,220,500,1000,1800,3000].forEach(function(ms){
      setTimeout(tryStart,ms);
    });
  }

  window.addEventListener('WATER_AUTH_OK',startBurst);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      if(window.WATER_AUTH_OK)startBurst();
    },{once:true});
  }else if(window.WATER_AUTH_OK){
    startBurst();
  }

  window.WATER_CAMERA_AUTH_START_BUILD=BUILD;
})();
