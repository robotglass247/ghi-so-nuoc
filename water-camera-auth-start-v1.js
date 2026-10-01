(function(){
  'use strict';

  const BUILD='water-camera-auth-start-v2-bounded';
  let timers=[];

  function clearTimers(){
    timers.forEach(function(id){try{clearTimeout(id);}catch(e){}});
    timers=[];
  }

  function cameraReady(){
    try{
      const v=document.getElementById('video');
      if(!v)return false;
      const s=v.srcObject;
      if(!s||!s.getVideoTracks)return false;
      return !!(v.videoWidth>0&&v.videoHeight>0&&s.getVideoTracks().some(function(t){return t.readyState==='live';}));
    }catch(e){return false;}
  }

  function hasStaff(){
    try{
      return !!(
        localStorage.getItem('water_staff') ||
        sessionStorage.getItem('water_staff') ||
        (window.WATER_AUTH_STAFF&&window.WATER_AUTH_STAFF.ma)
      );
    }catch(e){return !!(window.WATER_AUTH_STAFF&&window.WATER_AUTH_STAFF.ma);}
  }

  function tryStart(){
    if(!window.WATER_AUTH_OK || !hasStaff() || cameraReady())return;
    const video=document.getElementById('video');
    const fn=window.startCamera;
    if(!video || typeof fn!=='function')return;

    try{
      Promise.resolve(fn()).catch(function(){});
    }catch(e){}
  }

  function startBurst(){
    clearTimers();
    [0,100,300,700,1400].forEach(function(ms){
      timers.push(setTimeout(tryStart,ms));
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
