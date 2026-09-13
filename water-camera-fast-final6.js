(function(){
  'use strict';

  function el(id){return document.getElementById(id);}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function withFastTimeout(promise,ms,message,onLate){
    return new Promise((resolve,reject)=>{
      let done=false;
      const timer=setTimeout(()=>{
        done=true;
        const err=new Error(message);
        err.name='TimeoutError';
        reject(err);
      },ms);
      Promise.resolve(promise).then(value=>{
        if(done){try{if(onLate)onLate(value);}catch(e){};return;}
        done=true;
        clearTimeout(timer);
        resolve(value);
      },err=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function streamIsLive(){
    try{
      return !!(stream && stream.getVideoTracks().some(t=>t.readyState==='live'));
    }catch(e){return false;}
  }

  async function startCameraFast(){
    if(typeof cameraStarting!=='undefined' && cameraStarting)return;

    const staff=(typeof getStaffCode==='function')?getStaffCode():'';
    if(!staff){
      if(typeof openStaff==='function')openStaff();
      return;
    }

    cameraStarting=true;
    const startBtn=el('startBtn');
    const shotBtn=el('shotBtn');
    const v=el('video');

    if(startBtn)startBtn.style.display='none';
    if(shotBtn){
      shotBtn.style.display='flex';
      shotBtn.disabled=true;
    }

    try{
      if(typeof stopLiveScan==='function')stopLiveScan();

      if(stream && !streamIsLive()){
        try{stream.getTracks().forEach(t=>t.stop());}catch(e){}
        stream=null;
      }

      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
        throw new Error('Trình duyệt không hỗ trợ camera trực tiếp.');
      }

      // FAST CAMERA: ưu tiên mở hình trước ở 720p. Base lưu ảnh chỉ dùng tối đa 1600px,
      // nên không cần buộc camera thương lượng 1080p ngay trong bước khởi động.
      if(!stream){
        const fastConstraints={
          facingMode:{ideal:'environment'},
          width:{ideal:1280},
          height:{ideal:720}
        };

        stream=await withFastTimeout(
          navigator.mediaDevices.getUserMedia({video:fastConstraints,audio:false}),
          8000,
          'Camera phản hồi chậm. Kiểm tra quyền camera hoặc ứng dụng khác đang dùng camera.',
          late=>{try{late.getTracks().forEach(t=>t.stop());}catch(e){}}
        );
      }

      v.muted=true;
      v.playsInline=true;
      v.controls=false;
      if(v.srcObject!==stream)v.srcObject=stream;

      try{
        await withFastTimeout(v.play(),2500,'Camera đã kết nối nhưng chưa phát hình.');
      }catch(err){
        if(err&&err.name==='AbortError'){
          await wait(80);
          await withFastTimeout(v.play(),1800,'Camera đã kết nối nhưng chưa phát hình.');
        }else{
          throw err;
        }
      }

      // Chỉ chờ frame đầu, không chờ các tối ưu camera phụ.
      const t0=Date.now();
      while((!v.videoWidth||!v.videoHeight) && Date.now()-t0<1400){
        await wait(35);
      }
      if(!v.videoWidth||!v.videoHeight){
        throw new Error('Camera chưa trả khung hình đầu tiên.');
      }

      if(typeof resetLiveQR==='function')resetLiveQR();
      if(typeof setStatus==='function'){
        setStatus('SẴN SÀNG CHỤP','Đưa đồng hồ + QR rõ trong khung.');
      }
      if(shotBtn)shotBtn.disabled=false;

      if(typeof scheduleLiveScan==='function')scheduleLiveScan(40);

      // Focus/exposure chạy nền, KHÔNG chặn thời điểm hiển thị camera.
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
      },0);

    }catch(err){
      if(typeof stopLiveScan==='function')stopLiveScan();
      try{
        if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
      }catch(e){}
      if(v)v.srcObject=null;
      if(shotBtn)shotBtn.disabled=true;
      if(typeof setStatus==='function'){
        setStatus('CAMERA CHƯA SẴN SÀNG',String(err&&err.message?err.message:err));
      }
      alert('Không mở được camera: '+String(err&&err.message?err.message:err));
    }finally{
      cameraStarting=false;
    }
  }

  window.startCamera=startCameraFast;
  try{startCamera=startCameraFast;}catch(e){}
  window.WATER_CAMERA_FAST_BUILD='879-final6-fastcam';
})();
