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
    }catch(e){return false;}
  }

  function currentMeter(){
    try{return formatApartmentCode(liveQR&&liveQR.qr&&liveQR.qr.meter);}catch(e){return '';}
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
    const duplicateModal=el('duplicateModal');
    if(!statusMain||!statusSub||!shotBtn)return;

    let offlineNoticeShown=false;
    let offlineNoticeUntil=0;
    let offlineNoticeTimer=null;
    let readyWatchTimer=null;
    let hasHandledMeter=false;
    let lastHandledMeter='';
    let waitingForDifferentMeter=false;
    let lastEvidenceText='';

    // FINAL9 adjacent flow.
    let adjacentPromptOpen=false;
    let adjacentPromptMeter='';
    let suppressSameMeter='';
    let retakeApprovedMeter='';
    let autoReplaceMeter='';
    let readyNextAfterNo=false;

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
      #adjacentRetakeModal{
        display:none;
        position:fixed;
        inset:0;
        z-index:140;
        background:rgba(0,0,0,.66);
        align-items:center;
        justify-content:center;
        padding:18px;
      }
      #adjacentRetakeModal .waterAdjacentCard{
        width:100%;
        max-width:420px;
        background:#fff;
        border-radius:17px;
        padding:20px 18px 16px;
        text-align:center;
        box-shadow:0 12px 34px rgba(0,0,0,.34);
      }
      #adjacentRetakeModal .waterAdjacentTitle{
        font-size:21px;
        font-weight:900;
        line-height:1.2;
      }
      #adjacentRetakeModal .waterAdjacentQuestion{
        margin:12px 0 16px;
        font-size:16px;
        line-height:1.35;
        color:#333;
      }
      #adjacentRetakeModal .waterAdjacentMeter{
        margin-top:6px;
        font-size:14px;
        font-weight:800;
        color:#555;
      }
      #adjacentRetakeModal .waterAdjacentActions{
        display:flex;
        gap:10px;
      }
      #adjacentRetakeModal .waterAdjacentActions button{
        flex:1;
        width:auto;
        margin:0;
        padding:13px 8px;
        font-size:18px;
        font-weight:900;
        border:1px solid #bbb;
        border-radius:12px;
        background:#fff;
      }
    `;
    document.head.appendChild(style);

    const adjacentModal=document.createElement('div');
    adjacentModal.id='adjacentRetakeModal';
    adjacentModal.setAttribute('role','dialog');
    adjacentModal.setAttribute('aria-modal','true');
    adjacentModal.innerHTML=`
      <div class="waterAdjacentCard">
        <div class="waterAdjacentTitle">ĐỒNG HỒ NÀY VỪA CHỤP XONG</div>
        <div id="adjacentRetakeMeter" class="waterAdjacentMeter"></div>
        <div class="waterAdjacentQuestion">Bạn có muốn chụp lại ảnh này không?</div>
        <div class="waterAdjacentActions">
          <button type="button" id="adjacentRetakeYes">CÓ</button>
          <button type="button" id="adjacentRetakeNo">KHÔNG</button>
        </div>
      </div>`;
    document.body.appendChild(adjacentModal);
    const adjacentYes=el('adjacentRetakeYes');
    const adjacentNo=el('adjacentRetakeNo');
    const adjacentMeterText=el('adjacentRetakeMeter');

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

    function closeAdjacentModal(){
      adjacentPromptOpen=false;
      adjacentModal.style.display='none';
    }

    function showAdjacentModal(meter){
      const m=formatApartmentCode(meter);
      if(!m||adjacentPromptOpen)return;
      adjacentPromptMeter=m;
      adjacentPromptOpen=true;
      if(adjacentMeterText)adjacentMeterText.textContent=m;
      adjacentModal.style.display='flex';
      shotBtn.disabled=true;
    }

    function markHandled(meter,fromSavedPhoto){
      const m=formatApartmentCode(meter);
      if(!m)return;
      hasHandledMeter=true;
      lastHandledMeter=m;
      waitingForDifferentMeter=true;
      readyNextAfterNo=false;
      if(fromSavedPhoto){
        // Một ảnh mới/thay thế vừa thực sự lưu xong: bắt đầu lại kiểm tra liền kề.
        suppressSameMeter='';
        retakeApprovedMeter='';
        autoReplaceMeter='';
        adjacentPromptMeter='';
        closeAdjacentModal();
      }
    }

    function readSavedEvidence(){
      const evidence=el('captureEvidence');
      if(!evidence)return;
      const txt=String(evidence.textContent||'').trim();
      if(!txt||txt===lastEvidenceText)return;
      lastEvidenceText=txt;
      const m=txt.match(/(?:ẢNH MỚI|CHỤP THAY THẾ)\s*·\s*([^·]+?)\s*·\s*Mã gửi:/i);
      if(m&&m[1])markHandled(m[1],true);
    }

    if(keepPhotoBtn){
      keepPhotoBtn.addEventListener('click',function(){
        let meter=currentMeter();
        if(!meter&&duplicateDetail){
          const txt=String(duplicateDetail.textContent||'');
          const m=txt.match(/^\s*([^\s]+)\s+đã có ảnh/i);
          if(m)meter=m[1];
        }
        meter=formatApartmentCode(meter);
        if(meter){
          markHandled(meter,false);
          // Vừa chủ động chọn GIỮ ẢNH CŨ: không hỏi lại ngay cùng QR đang còn trước camera.
          suppressSameMeter=meter;
          readyNextAfterNo=true;
        }
      },true);
    }

    function captureBusy(){
      try{return typeof shotRunning!=='undefined'&&shotRunning;}catch(e){return false;}
    }

    function evaluateAdjacent(){
      if(!waitingForDifferentMeter||!lastHandledMeter||!qrReadyNow())return;
      const meter=currentMeter();
      if(!meter)return;

      if(meter!==lastHandledMeter){
        waitingForDifferentMeter=false;
        suppressSameMeter='';
        retakeApprovedMeter='';
        autoReplaceMeter='';
        adjacentPromptMeter='';
        readyNextAfterNo=false;
        closeAdjacentModal();
        return;
      }

      if(suppressSameMeter===meter || retakeApprovedMeter===meter)return;
      if(captureBusy())return;
      showAdjacentModal(meter);
    }

    adjacentYes.addEventListener('click',function(){
      const meter=formatApartmentCode(adjacentPromptMeter||lastHandledMeter);
      closeAdjacentModal();
      if(!meter)return;
      suppressSameMeter='';
      readyNextAfterNo=false;
      retakeApprovedMeter=meter;
      autoReplaceMeter=meter;
      // Không tự chụp. Nhân viên vẫn phải bấm nút chụp; khi lõi phát hiện trùng,
      // lựa chọn THAY THẾ ẢNH CŨ sẽ được chọn tự động.
      mirror();
    });

    adjacentNo.addEventListener('click',function(){
      const meter=formatApartmentCode(adjacentPromptMeter||lastHandledMeter);
      closeAdjacentModal();
      if(meter){
        suppressSameMeter=meter;
        retakeApprovedMeter='';
        autoReplaceMeter='';
        readyNextAfterNo=true;
      }
      try{if(typeof resetLiveQR==='function')resetLiveQR();}catch(e){}
      try{if(typeof scheduleLiveScan==='function')scheduleLiveScan(120);}catch(e){}
      try{
        if(typeof setStatus==='function')setStatus(
          'SẴN SÀNG CHỤP ĐỒNG HỒ TIẾP THEO',
          'Đưa đồng hồ + QR tiếp theo vào khung.'
        );
      }catch(e){}
      mirror();
    });

    function state(){
      const main=String(statusMain.textContent||'').trim();

      if(qrReadyNow()){
        const apt=getApartmentCode();
        const meter=currentMeter();

        if(meter && suppressSameMeter===meter && meter===lastHandledMeter){
          return {
            title:'SẴN SÀNG CHỤP ĐỒNG HỒ TIẾP THEO',
            sub:'Đưa đồng hồ + QR tiếp theo vào khung.'
          };
        }

        if(meter && retakeApprovedMeter===meter){
          return {
            title:'BẤM ĐỂ CHỤP',
            sub:(apt ? apt+': ' : '')+'Chụp lại để THAY THẾ ẢNH CŨ'
          };
        }

        if(waitingForDifferentMeter && meter && meter===lastHandledMeter){
          return {
            title:'ĐỒNG HỒ NÀY VỪA CHỤP XONG',
            sub:'Bạn có muốn chụp lại ảnh này không?'
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
        main==='SẴN SÀNG CHỤP ĐỒNG HỒ TIẾP THEO' ||
        main==='NHẤN ĐỂ CHỤP' ||
        main==='ĐANG KẾT NỐI CAMERA' ||
        main==='ĐANG HIỂN THỊ CAMERA' ||
        main==='BẤM HIỂN THỊ CAMERA'
      );

      if(readyState){
        if(readyNextAfterNo){
          return {
            title:'SẴN SÀNG CHỤP ĐỒNG HỒ TIẾP THEO',
            sub:'Đưa đồng hồ + QR tiếp theo vào khung.'
          };
        }
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

    function applyShotLock(){
      const meter=currentMeter();
      if(adjacentPromptOpen){
        shotBtn.disabled=true;
        return;
      }
      if(qrReadyNow() && meter && meter===lastHandledMeter && suppressSameMeter===meter){
        shotBtn.disabled=true;
        return;
      }
      if(qrReadyNow() && waitingForDifferentMeter && meter && meter===lastHandledMeter && retakeApprovedMeter!==meter){
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
      evaluateAdjacent();
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

    // Khi người dùng đã chọn CÓ ở hộp liền kề, lõi vẫn mở hộp trùng ảnh bình thường.
    // Tại đúng thời điểm đó, tự chọn THAY THẾ ẢNH CŨ một lần.
    function maybeAutoReplaceDuplicate(){
      if(!duplicateModal||!replacePhotoBtn||!autoReplaceMeter)return;
      if(duplicateModal.style.display!=='flex')return;
      const meter=currentMeter();
      if(!meter||meter!==autoReplaceMeter)return;
      autoReplaceMeter='';
      setTimeout(function(){
        try{replacePhotoBtn.click();}catch(e){}
      },0);
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

      if(duplicateModal){
        const duplicateObserver=new MutationObserver(function(){
          maybeAutoReplaceDuplicate();
        });
        duplicateObserver.observe(duplicateModal,{attributes:true,attributeFilter:['style']});
      }
    }

    setInterval(function(){
      maybeAutoReplaceDuplicate();
      mirror();
    },180);

    if(startBtn)startBtn.style.display='none';
    shotBtn.style.display='flex';
    shotBtn.disabled=true;
    mirror();
    setTimeout(autoStartCamera,0);

    const baseSaveStaff=window.saveStaff;
    if(typeof baseSaveStaff==='function'){
      const saveStaffAutoCamera=function(){
        const result=baseSaveStaff.apply(this,arguments);
        setTimeout(function(){if(hasStaff())autoStartCamera();},0);
        return result;
      };
      window.saveStaff=saveStaffAutoCamera;
      try{saveStaff=saveStaffAutoCamera;}catch(e){}
    }

    if(statusBox)statusBox.setAttribute('aria-hidden','true');
    window.WATER_ADJACENT_CONFIRM_BUILD='879-final9-adjacent-confirm';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
