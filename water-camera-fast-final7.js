(function(){
  'use strict';

  function el(id){return document.getElementById(id);}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

  let startPromise=null;

  function streamIsLive(s){
    try{return !!(s&&s.getVideoTracks().some(t=>t.readyState==='live'));}catch(e){return false;}
  }

  function stopStream(s){
    try{if(s)s.getTracks().forEach(t=>t.stop());}catch(e){}
  }

  function cameraBusyError(err){
    const name=String(err&&err.name||'');
    const msg=String(err&&err.message||err||'').toLowerCase();
    return name==='NotReadableError' ||
      msg.includes('could not start video source') ||
      msg.includes('could not start video') ||
      msg.includes('device in use') ||
      msg.includes('track start');
  }

  function withTimeout(promise,ms,message,onLate){
    return new Promise((resolve,reject)=>{
      let finished=false;
      const timer=setTimeout(()=>{
        finished=true;
        const e=new Error(message);
        e.name='TimeoutError';
        reject(e);
      },ms);
      Promise.resolve(promise).then(value=>{
        if(finished){try{if(onLate)onLate(value);}catch(e){};return;}
        finished=true;
        clearTimeout(timer);
        resolve(value);
      },err=>{
        if(finished)return;
        finished=true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async function requestRearCamera(v){
    if(streamIsLive(stream))return stream;

    // Dọn srcObject cũ không còn thuộc biến stream.
    try{
      if(v&&v.srcObject&&v.srcObject!==stream){
        stopStream(v.srcObject);
        v.srcObject=null;
      }
    }catch(e){}

    const primary={
      video:{
        facingMode:{ideal:'environment'},
        width:{ideal:1280},
        height:{ideal:720}
      },
      audio:false
    };

    try{
      return await withTimeout(
        navigator.mediaDevices.getUserMedia(primary),
        7000,
        'Camera phản hồi chậm.',
        stopStream
      );
    }catch(err){
      if(!cameraBusyError(err))throw err;

      // Android đôi lúc chưa nhả camera ngay sau lần mở trước / chuyển trang.
      stopStream(stream);
      stream=null;
      try{if(v){stopStream(v.srcObject);v.srcObject=null;}}catch(e){}
      await wait(450);

      // Chỉ thử lại 1 lần với ràng buộc tối thiểu để tránh thương lượng camera lâu.
      return await withTimeout(
        navigator.mediaDevices.getUserMedia({
          video:{facingMode:{ideal:'environment'}},
          audio:false
        }),
        7000,
        'Camera vẫn đang bận hoặc chưa sẵn sàng.',
        stopStream
      );
    }
  }

  async function startInternal(){
    const staff=(typeof getStaffCode==='function')?getStaffCode():'';
    if(!staff){
      if(typeof openStaff==='function')openStaff();
      return;
    }

    const startBtn=el('startBtn');
    const shotBtn=el('shotBtn');
    const v=el('video');

    if(startBtn)startBtn.style.display='none';
    if(shotBtn){shotBtn.style.display='flex';shotBtn.disabled=true;}

    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
      throw new Error('Trình duyệt không hỗ trợ camera trực tiếp.');
    }

    if(typeof stopLiveScan==='function')stopLiveScan();

    stream=await requestRearCamera(v);

    v.muted=true;
    v.playsInline=true;
    v.controls=false;
    if(v.srcObject!==stream)v.srcObject=stream;

    try{
      await withTimeout(v.play(),2600,'Camera đã kết nối nhưng chưa phát hình.');
    }catch(err){
      if(err&&err.name==='AbortError'){
        await wait(100);
        await withTimeout(v.play(),1800,'Camera đã kết nối nhưng chưa phát hình.');
      }else{
        throw err;
      }
    }

    const t0=Date.now();
    while((!v.videoWidth||!v.videoHeight) && Date.now()-t0<1600){
      await wait(40);
    }
    if(!v.videoWidth||!v.videoHeight){
      throw new Error('Camera chưa trả khung hình đầu tiên.');
    }

    if(typeof resetLiveQR==='function')resetLiveQR();
    if(typeof setStatus==='function')setStatus('SẴN SÀNG CHỤP','Đưa đồng hồ + QR rõ trong khung.');
    if(shotBtn)shotBtn.disabled=false;
    if(typeof scheduleLiveScan==='function')scheduleLiveScan(50);

    // Tối ưu nét sau khi hình đã lên, không chặn giao diện.
    setTimeout(()=>{
      try{
        const track=stream&&stream.getVideoTracks()[0];
        if(!track||!track.getCapabilities||!track.applyConstraints)return;
        const caps=track.getCapabilities()||{};
        const adv={};
        if(Array.isArray(caps.focusMode)&&caps.focusMode.includes('continuous'))adv.focusMode='continuous';
        if(Array.isArray(caps.exposureMode)&&caps.exposureMode.includes('continuous'))adv.exposureMode='continuous';
        if(Array.isArray(caps.whiteBalanceMode)&&caps.whiteBalanceMode.includes('continuous'))adv.whiteBalanceMode='continuous';
        if(Object.keys(adv).length)track.applyConstraints({advanced:[adv]}).catch(()=>{});
      }catch(e){}
    },150);
  }

  function startCameraSafe(){
    if(startPromise)return startPromise;
    if(typeof cameraStarting!=='undefined'&&cameraStarting)return Promise.resolve();

    cameraStarting=true;
    startPromise=Promise.resolve().then(startInternal).catch(err=>{
      if(typeof stopLiveScan==='function')stopLiveScan();
      try{
        // Chỉ dọn stream nếu nó thực sự không dùng được.
        if(!streamIsLive(stream)){
          stopStream(stream);
          stream=null;
          const v=el('video');
          if(v)v.srcObject=null;
        }
      }catch(e){}
      const shotBtn=el('shotBtn');
      if(shotBtn)shotBtn.disabled=true;
      if(typeof setStatus==='function')setStatus('CAMERA CHƯA SẴN SÀNG',String(err&&err.message?err.message:err));
      alert('Không mở được camera: '+String(err&&err.message?err.message:err));
    }).finally(()=>{
      cameraStarting=false;
      startPromise=null;
    });
    return startPromise;
  }

  window.startCamera=startCameraSafe;
  try{startCamera=startCameraSafe;}catch(e){}
  window.WATER_CAMERA_FAST_BUILD='879-final7-camera-lock';
})();
