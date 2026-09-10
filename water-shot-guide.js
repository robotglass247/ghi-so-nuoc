(function(){
  'use strict';

  function el(id){return document.getElementById(id);}

  function cleanGuideText(text){
    return String(text||'').replace(/^\s*[1-4]\.\s*/, '').trim();
  }

  function install(){
    const statusBox=document.querySelector('.camera .status');
    const statusMain=el('statusMain');
    const statusSub=el('statusSub');
    const shotBtn=el('shotBtn');

    if(!statusMain||!statusSub||!shotBtn)return;

    const style=document.createElement('style');
    style.textContent=`
      .camera .status{display:none !important;}
      #shotBtn{
        min-height:76px !important;
        padding:9px 12px !important;
        display:none;
        flex-direction:column !important;
        align-items:center !important;
        justify-content:center !important;
        gap:3px !important;
        line-height:1.15 !important;
      }
      #shotBtn .waterShotTitle{
        display:block;
        font-size:19px;
        font-weight:800;
        line-height:1.15;
      }
      #shotBtn .waterShotSub{
        display:block;
        margin-top:2px;
        font-size:12px;
        font-weight:600;
        line-height:1.25;
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

    function mirror(){
      const parts=ensureButtonLayout();
      parts.title.textContent=String(statusMain.textContent||'SẴN SÀNG CHỤP').trim();
      parts.sub.textContent=cleanGuideText(statusSub.textContent);
    }

    mirror();

    if(window.MutationObserver){
      const obs=new MutationObserver(mirror);
      obs.observe(statusMain,{childList:true,characterData:true,subtree:true});
      obs.observe(statusSub,{childList:true,characterData:true,subtree:true});
    }

    // Base app đặt display:block khi camera mở. Chuyển thành flex để giữ bố cục 2 dòng.
    const displayObserver=new MutationObserver(function(){
      if(shotBtn.style.display==='block')shotBtn.style.display='flex';
    });
    displayObserver.observe(shotBtn,{attributes:true,attributeFilter:['style']});

    if(shotBtn.style.display==='block')shotBtn.style.display='flex';
    if(statusBox)statusBox.setAttribute('aria-hidden','true');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
