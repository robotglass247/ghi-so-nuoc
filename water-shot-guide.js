(function(){
  'use strict';

  function el(id){return document.getElementById(id);}

  function cleanGuideText(text){
    return String(text||'').replace(/^\s*[1-4]\.\s*/,'').trim();
  }

  function formatApartmentCode(value){
    const s=String(value||'').trim().toUpperCase();
    if(!s)return '';
    return s.replace(/-N\d+$/i,'').replace(/[^A-Z0-9]/g,'');
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

  function install(){
    const statusBox=document.querySelector('.camera .status');
    const statusMain=el('statusMain');
    const statusSub=el('statusSub');
    const shotBtn=el('shotBtn');
    if(!statusMain||!statusSub||!shotBtn)return;

    let offlineNoticeShown=false;
    let offlineNoticeUntil=0;
    let offlineNoticeTimer=null;

    const style=document.createElement('style');
    style.textContent=`
      .camera .status{display:none !important;}
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

    function buildTitle(){
      const main=String(statusMain.textContent||'SẴN SÀNG CHỤP').trim();
      const apt=getApartmentCode();
      if(main==='NHẤN ĐỂ CHỤP'&&apt)return apt+' - NHẤN ĐỂ CHỤP';
      return main;
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

    function mirror(){
      beginOfflineNoticeIfNeeded();
      const parts=ensureButtonLayout();
      if(offlineNoticeUntil>Date.now()){
        parts.title.textContent='✓ ĐÃ SẴN SÀNG LÀM VIỆC OFFLINE';
        parts.sub.textContent='Ảnh sẽ được lưu trên thiết bị và đồng bộ khi có mạng.';
        return;
      }
      parts.title.textContent=buildTitle();
      parts.sub.textContent=cleanGuideText(statusSub.textContent);
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
    }

    setInterval(mirror,180);
    if(shotBtn.style.display==='block')shotBtn.style.display='flex';
    if(statusBox)statusBox.setAttribute('aria-hidden','true');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
