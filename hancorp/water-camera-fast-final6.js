(function(){
  'use strict';
  function el(id){return document.getElementById(id);}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  let startPromise=null;
  let recoveryTimer=null;
  function streamIsLive(s){try{return !!(s&&s.getVideoTracks().some(t=>t.readyState==='live'));}catch(e){return false;}}
  function stopStream(s){try{if(s)s.getTracks().forEach(t=>t.stop());}catch(e){}}
  function cameraBusyError(err){
    const name=String(err&&err.name||'');
    const msg=String(err&&err.message||err||'').toLowerCase();
    return name==='NotReadableError'||msg.includes('could not start video source')||msg.includes('could not start video')||msg.includes('device in use')||msg.includes('track start');
  }
  function withTimeout(promise,ms,message,onLate){
    return new Promise((resolve,reject)=>{
      let finished=false;
      const timer=setTimeout(()=>{finished=true;const e=new Error(message);e.name='TimeoutError';reject(e);},ms);
      Promise.resolve(promise).then(value=>{
        if(finished){try{if(onLate)onLate(value);}catch(e){};return;}
        finished=true;clearTimeout(timer);resolve(value);
      },err=>{if(finished)return;finished=true;clearTimeout(timer);reject(err);});
    });
  }
  function videoUiActive(v){
    if(!v||document.visibilityState!=='visible')return false;
    try{const r=v.getBoundingClientRect();return r.width>0&&r.height>0;}catch(e){return false;}
  }
  function waitFreshFrame(v,ms){
    ms=ms||1200;
    return new Promise(resolve=>{
      if(!v){resolve(false);return;}
      let done=false,rvfcId=0,timer=0;
      const oldTime=Number(v.currentTime||0);
      function finish(ok){
        if(done)return;done=true;clearTimeout(timer);
        try{if(rvfcId&&typeof v.cancelVideoFrameCallback==='function')v.cancelVideoFrameCallback(rvfcId);}catch(e){}
        resolve(!!ok);
      }
      if(typeof v.requestVideoFrameCallback==='function'){
        try{rvfcId=v.requestVideoFrameCallback(()=>finish(true));timer=setTimeout(()=>finish(false),ms);return;}catch(e){}
      }
      const started=Date.now();
      (function poll(){
        if(done)return;
        if(v.readyState>=2&&Number(v.currentTime||0)>oldTime+0.015){finish(true);return;}
        if(Date.now()-started>=ms){finish(false);return;}
        setTimeout(poll,80);
      })();
    });
  }
  async function playVideo(v){
    try{await withTimeout(v.play(),2600,'Camera đã kết nối nhưng chưa phát hình.');}
    catch(err){
      if(err&&err.name==='AbortError'){await wait(100);await withTimeout(v.play(),1800,'Camera đã kết nối nhưng chưa phát hình.');}
      else throw err;
    }
  }
  async function requestRearCamera(v,forceNew){
    if(forceNew){
      stopStream(stream);stream=null;
      try{if(v&&v.srcObject){stopStream(v.srcObject);v.srcObject=null;}}catch(e){}
      await wait(180);
    }else if(streamIsLive(stream))return stream;
    try{if(v&&v.srcObject&&v.srcObject!==stream){stopStream(v.srcObject);v.srcObject=null;}}catch(e){}
    try{
      return await withTimeout(navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false}),7000,'Camera phản hồi chậm.',stopStream);
    }catch(err){
      if(!cameraBusyError(err))throw err;
      stopStream(stream);stream=null;
      try{if(v){stopStream(v.srcObject);v.srcObject=null;}}catch(e){}
      await wait(450);
      return await withTimeout(navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}),7000,'Camera vẫn đang bận hoặc chưa sẵn sàng.',stopStream);
    }
  }
  async function attachAndVerify(v,s){
    v.muted=true;v.playsInline=true;v.controls=false;
    if(v.srcObject!==s)v.srcObject=s;
    await playVideo(v);
    const t0=Date.now();
    while((!v.videoWidth||!v.videoHeight)&&Date.now()-t0<1600)await wait(40);
    if(!v.videoWidth||!v.videoHeight)return false;
    return await waitFreshFrame(v,1250);
  }
  function bindTrackRecovery(s){
    try{
      const track=s&&s.getVideoTracks&&s.getVideoTracks()[0];
      if(!track||track.__waterRecoveryBound)return;
      track.__waterRecoveryBound=true;
      track.addEventListener('ended',()=>scheduleRecovery(120));
      track.addEventListener('mute',()=>scheduleRecovery(900));
    }catch(e){}
  }
  async function startInternal(forceNew){
    const staff=(typeof getStaffCode==='function')?getStaffCode():'';
    if(!staff){if(typeof openStaff==='function')openStaff();return;}
    const startBtn=el('startBtn'),shotBtn=el('shotBtn'),v=el('video');
    if(!v)throw new Error('Không tìm thấy khung camera.');
    if(startBtn)startBtn.style.display='none';
    if(shotBtn){shotBtn.style.display='flex';shotBtn.disabled=true;}
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Trình duyệt không hỗ trợ camera trực tiếp.');
    if(typeof stopLiveScan==='function')stopLiveScan();
    const reused=!forceNew&&streamIsLive(stream);
    stream=await requestRearCamera(v,!!forceNew);
    let fresh=await attachAndVerify(v,stream);
    if(!fresh&&reused){
      if(typeof stopLiveScan==='function')stopLiveScan();
      stream=await requestRearCamera(v,true);
      fresh=await attachAndVerify(v,stream);
    }
    if(!fresh)throw new Error('Camera đang bị đứng hình. Hệ thống chưa nhận được khung hình mới.');
    bindTrackRecovery(stream);
    if(typeof resetLiveQR==='function')resetLiveQR();
    if(typeof setStatus==='function')setStatus('SẴN SÀNG CHỤP','Đưa đồng hồ + QR rõ trong khung.');
    if(shotBtn)shotBtn.disabled=false;
    if(typeof scheduleLiveScan==='function')scheduleLiveScan(50);
    setTimeout(()=>{
      try{
        const track=stream&&stream.getVideoTracks()[0];
        if(!track||!track.getCapabilities||!track.applyConstraints)return;
        const caps=track.getCapabilities()||{},adv={};
        if(Array.isArray(caps.focusMode)&&caps.focusMode.includes('continuous'))adv.focusMode='continuous';
        if(Array.isArray(caps.exposureMode)&&caps.exposureMode.includes('continuous'))adv.exposureMode='continuous';
        if(Array.isArray(caps.whiteBalanceMode)&&caps.whiteBalanceMode.includes('continuous'))adv.whiteBalanceMode='continuous';
        if(Object.keys(adv).length)track.applyConstraints({advanced:[adv]}).catch(()=>{});
      }catch(e){}
    },150);
  }
  function startCameraSafe(forceNew){
    if(startPromise)return startPromise;
    if(typeof cameraStarting!=='undefined'&&cameraStarting)return Promise.resolve();
    cameraStarting=true;
    startPromise=Promise.resolve().then(()=>startInternal(!!forceNew)).catch(err=>{
      if(typeof stopLiveScan==='function')stopLiveScan();
      try{
        if(!streamIsLive(stream)){stopStream(stream);stream=null;const v=el('video');if(v)v.srcObject=null;}
      }catch(e){}
      const shotBtn=el('shotBtn');if(shotBtn)shotBtn.disabled=true;
      if(typeof setStatus==='function')setStatus('CAMERA CHƯA SẴN SÀNG',String(err&&err.message?err.message:err));
      alert('Không mở được camera: '+String(err&&err.message?err.message:err));
    }).finally(()=>{cameraStarting=false;startPromise=null;});
    return startPromise;
  }
  function scheduleRecovery(delay){
    clearTimeout(recoveryTimer);
    recoveryTimer=setTimeout(async()=>{
      const v=el('video');
      if(!videoUiActive(v)||startPromise)return;
      const fresh=streamIsLive(stream)?await waitFreshFrame(v,850):false;
      if(fresh)return;
      try{await startCameraSafe(true);}catch(e){}
    },delay||180);
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRecovery(250);});
  window.addEventListener('pageshow',()=>scheduleRecovery(250));
  window.startCamera=startCameraSafe;
  try{startCamera=startCameraSafe;}catch(e){}
  window.WATER_CAMERA_FAST_BUILD='879-final7-camera-lock-recovery-v1';
})();