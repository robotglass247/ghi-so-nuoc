(function(){
  'use strict';

  function el(id){return document.getElementById(id);}

  function cleanGuideText(text){
    return String(text||'').replace(/^\s*[1-4]\.\s*/,'').trim();
  }

  function formatApartmentCode(value){
    const s=String(value||'').trim().toUpperCase();
    if(!s)return '';
    return s.replace(/-N\d+$/i,'');
  }

  function getApartmentCode(){
    try{
      if(typeof liveQR!=='undefined' && liveQR && liveQR.qr && liveQR.qr.meter){
        const code=formatApartmentCode(liveQR.qr.meter);
        if(code)return code;
      }
    }catch(e){}

    const candidates=[
      window.currentCanHo,
      window.currentApartment,
      window.currentApartmentCode,
      window.selectedApartment,
      window.selectedCanHo,
      window.lastApartmentCode,
      window.lastCanHo
    ];
    for(const v of candidates){
      const code=formatApartmentCode(v);
      if(code)return code;
    }
    return '';
  }

  function qrReadyNow(){
    try{
      return !!(
        typeof liveQR!=='undefined' &&
        liveQR &&
        Number(liveQR.hits)>=2 &&
        Number(liveQR.at)>0 &&
        (Date.now()-Number(liveQR.at))<950
      );
    }catch(e){
      return false;
    }
  }

  function currentMeter(){
    try{
      return formatApartmentCode(liveQR&&liveQR.qr&&liveQR.qr.meter);
    }catch(e){return '';}
  }

  function install(){
    const statusBox=document.querySelector('.camera .status');
    const statusMain=el('statusMain');
    const statusSub=el('statusSub');
    const shotBtn=el('shotBtn');
    const startBtn=el('startBtn');
    const video=el('video');
    const keepPhotoBtn=el('keepPhotoBtn');
    const replacePhotoBtn=el('replacePhotoBtn');
    const duplicateDetail=el('duplicateDetail');
    if(!statusMain||!statusSub||!shotBtn)return;

    let offlineNoticeShown=false;
    let offlineNoticeUntil=0;
    let offlineNoticeTimer=null;
    let readyWatchTimer=null;
    let hasHandledMeter=false;
    let lastHandledMeter='';
    let waitingForDifferentMeter=false;
    let lastEvidenceText='';

    if(replacePhotoBtn)replacePhotoBtn.textContent='THAY THẾ ẢNH CŨ';

    const style=document.createElement('style');
    style.textContent=`
      .camera .status{display:none !important;}
      #startBtn{display:none !important;}
      .camera .guide{
        position:absolute !important;
        left:50% !important;
        top:50% !important;
        transform:translate(-50%,-50%) !important;
        width:min(84vw,460px) !important;
        height:auto !important;
        aspect-ratio:4 / 3 !important;
        border:2px solid rgba(255,255,255,.90) !important;
        border-radius:18px !important;
        box-sizing:border-box !important;
        pointer-events:none !important;
      }
      #shotBtn{
        min-height:82px !important;
        padding:10px 12px !important;
        display:none;
        flex-direction:column !important;
        align-items:center !important;
        justify-content:center !important;
        gap:4px !important;
        line-height:1.15 !important;
        text-align:center !important;
      }
      #shotBtn .waterShotTitle{
        display:block;
        font-size:20px;
        font-weight:800;
        line-height:1.1;
      }
      #shotBtn .waterShotSub{
        display:block;
        margin-top:2px;
        font-size:12px;
        font-weight:600;
        line-height:1.22;
        color:#555;
      }
    `;
    document.head.appendChild(style);

    function ensureButtonLayout(){
      let title=shotBtn.querySelector('.waterShotTitle');
      let sub=shotBtn.querySelector('.waterShotSub');
      if(!title||!sub){
        shotBtn.textContent='';
        title=document.createElement('span');
        title.className='waterShotTitle';
        sub=document.createElement('span');
        sub.className='waterShotSub';
        shotBtn.appendChild(title);
        shotBtn.appendChild(sub);
      }
      return {title,sub};
    }

    function markHandled(meter){
      const m=formatApartmentCode(meter);
      if(!m)return;
      hasHandledMeter=true;
      lastHandledMeter=m;
      waitingForDifferentMeter=true;
    }

    function readSavedEvidence(){
      const evidence=el('captureEvidence');
      if(!evidence)return;
      const txt=String(evidence.textContent||'').trim();
      if(!txt||txt===lastEvidenceText)return;
      lastEvidenceText=txt;
      const m=txt.match(/(?:ẢNH MỚI|CHỤP THAY THẾ)\s*·\s*([^·]+?)\s*·\s*Mã gửi:/i);
      if(m&&m[1])markHandled(m[1]);
    }

    if(keepPhotoBtn){
      keepPhotoBtn.addEventListener('click',function(){
        let meter=currentMeter();
        if(!meter&&duplicateDetail){
          const txt=String(duplicateDetail.textContent||'');
          const m=txt.match(/^\s*([^\s]+)\s+đã có ảnh/i);
          if(m)meter=m[1];
        }
        markHandled(meter);
      },true);
    }

    function isAdjacentSameMeter(){
      if(!waitingForDifferentMeter||!lastHandledMeter||!qrReadyNow())return false;
      const meter=currentMeter();
      if(!meter)return false;
      if(meter===lastHandledMeter)return true;
      waitingForDifferentMeter=false;
      return false;
    }

    function state(){
      const main=String(statusMain.textContent||'').trim();

      if(qrReadyNow()){
        const apt=getApartmentCode();
        if(isAdjacentSameMeter()){
          return {
            title:'ĐỒNG HỒ NÀY VỪA CHỤP XONG',
            sub:(apt ? apt+': ' : '')+'Hãy chuyển sang đồng hồ khác.'
          };
        }
        return {
          title:'BẤM ĐỂ CHỤP',
          sub:(apt ? apt+': ' : '')+'Đã nhận rõ, Bấm để chụp'
        };
      }

      const readyState=(
        main==='ĐÃ GIỮ ẢNH CŨ' ||
        main==='SẴN SÀNG CHỤP' ||
        main==='SẴN SÀNG ĐỒNG HỒ TIẾP THEO' ||
        main==='SẴN SÀNG CHỤP ĐỒNG HỒ' ||
        main==='SẴN SÀNG CHỤP ẢNH TIẾP THEO' ||
        main==='NHẤN ĐỂ CHỤP' ||
        main==='ĐANG KẾT NỐI CAMERA' ||
        main==='ĐANG HIỂN THỊ CAMERA' ||
        main==='BẤM HIỂN THỊ CAMERA'
      );

      if(readyState){
        if(hasHandledMeter){
          return {
            title:'SẴN SÀNG CHỤP ẢNH TIẾP THEO',
            sub:'Đưa đồng hồ + QR tiếp theo vào khung.'
          };
        }
        return {
          title:'SẴN SÀNG CHỤP ĐỒNG HỒ',
          sub:'Đưa đồng hồ + QR vào khung.'
        };
      }

      return {
        title:main||(hasHandledMeter?'SẴN SÀNG CHỤP ẢNH TIẾP THEO':'SẴN SÀNG CHỤP ĐỒNG HỒ'),
        sub:cleanGuideText(statusSub.textContent)
      };
    }

    function shotButtonVisible(){
      return getComputedStyle(shotBtn).display!=='none';
    }

    function isOfflineNow(){
      if(window.WATER_REAL_ONLINE===false)return true;
      if(window.WATER_REAL_ONLINE===true)return false;
      return !navigator.onLine;
    }

    function beginOfflineNoticeIfNeeded(){
      if(!isOfflineNow()||offlineNoticeShown||!shotButtonVisible())return;
      offlineNoticeShown=true;
      offlineNoticeUntil=Date.now()+1800;
      clearTimeout(offlineNoticeTimer);
      offlineNoticeTimer=setTimeout(mirror,1850);
    }

    function cameraReady(){
      try{
        return !!(
          video && video.videoWidth>0 && video.videoHeight>0 &&
          typeof stream!=='undefined' && stream &&
          stream.getVideoTracks().some(track=>track.readyState==='live')
        );
      }catch(e){return false;}
    }

    function captureBusy(){
      try{return typeof shotRunning!=='undefined'&&shotRunning;}catch(e){return false;}
    }

    function applyShotLock(){
      const adjacent=isAdjacentSameMeter();
      if(adjacent){
        shotBtn.disabled=true;
        return;
      }
      if(captureBusy()){
        shotBtn.disabled=true;
        return;
      }
      if(cameraReady())shotBtn.disabled=false;
    }

    function mirror(){
      readSavedEvidence();
      beginOfflineNoticeIfNeeded();
      const parts=ensureButtonLayout();
      if(offlineNoticeUntil>Date.now()){
        parts.title.textContent='✓ ĐÃ SẴN SÀNG LÀM VIỆC OFFLINE';
        parts.sub.textContent='Ảnh sẽ được lưu trên thiết bị và đồng bộ khi có mạng.';
        applyShotLock();
        return;
      }
      const s=state();
      parts.title.textContent=s.title;
      parts.sub.textContent=s.sub;
      applyShotLock();
    }

    function hasStaff(){
      try{return typeof getStaffCode==='function' && !!getStaffCode();}catch(e){return false;}
    }

    function watchCameraReady(){
      clearInterval(readyWatchTimer);
      readyWatchTimer=setInterval(function(){
        if(cameraReady()){
          clearInterval(readyWatchTimer);
          readyWatchTimer=null;
          applyShotLock();
          mirror();
        }
      },60);
    }

    function autoStartCamera(){
      if(cameraReady()){
        applyShotLock();
        return;
      }
      if(!hasStaff()){
        try{if(typeof openStaff==='function')openStaff();}catch(e){}
        return;
      }
      try{
        if(typeof cameraStarting!=='undefined' && cameraStarting)return;
      }catch(e){}
      if(typeof startCamera!=='function')return;

      shotBtn.disabled=true;
      watchCameraReady();
      Promise.resolve(startCamera()).catch(function(){});
    }

    mirror();

    if(window.MutationObserver){
      const obs=new MutationObserver(mirror);
      obs.observe(statusMain,{childList:true,characterData:true,subtree:true});
      obs.observe(statusSub,{childList:true,characterData:true,subtree:true});

      const displayObserver=new MutationObserver(function(){
        if(shotBtn.style.display==='block')shotBtn.style.display='flex';
        mirror();
      });
      displayObserver.observe(shotBtn,{attributes:true,attributeFilter:['style']});

      const evidence=el('captureEvidence');
      if(evidence){
        const evidenceObserver=new MutationObserver(mirror);
        evidenceObserver.observe(evidence,{childList:true,characterData:true,subtree:true});
      }
    }

    setInterval(mirror,180);
    if(startBtn)startBtn.style.display='none';

    shotBtn.style.display='flex';
    shotBtn.disabled=true;
    mirror();
    setTimeout(autoStartCamera,0);

    const baseSaveStaff=window.saveStaff;
    if(typeof baseSaveStaff==='function'){
      const saveStaffAutoCamera=function(){
        const result=baseSaveStaff.apply(this,arguments);
        setTimeout(function(){
          if(hasStaff())autoStartCamera();
        },0);
        return result;
      };
      window.saveStaff=saveStaffAutoCamera;
      try{saveStaff=saveStaffAutoCamera;}catch(e){}
    }

    if(statusBox)statusBox.setAttribute('aria-hidden','true');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
