(function(){
  'use strict';

  function el(id){return document.getElementById(id);}

  function cleanGuideText(text){
    return String(text||'').replace(/^\s*[1-4]\.\s*/, '').trim();
  }

  function fitProgressFont(){
    const bar=el('progressBar');
    if(!bar)return;

    const probe=document.createElement('span');
    const cs=getComputedStyle(bar);
    probe.style.cssText=[
      'position:fixed',
      'left:-9999px',
      'top:-9999px',
      'visibility:hidden',
      'white-space:nowrap',
      'font-family:'+cs.fontFamily,
      'font-weight:700',
      'letter-spacing:-.35px'
    ].join(';');
    probe.textContent='Tổng: 0000 · Đã chụp: 0000 · Chưa chụp: 0000 · Kỳ ghi: 12/2026';
    document.body.appendChild(probe);

    const available=Math.max(0,bar.clientWidth-8);
    let size=Math.min(13,Math.max(11,window.innerWidth*0.031));
    while(size>9.5){
      probe.style.fontSize=size+'px';
      if(probe.scrollWidth<=available)break;
      size-=0.25;
    }

    bar.style.fontSize=size.toFixed(2)+'px';
    probe.remove();
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
      .camera .guide{
        left:50% !important;
        top:50% !important;
        transform:translate(-50%,-50%) !important;
        width:min(82vw,460px) !important;
        height:min(68%,310px) !important;
      }
      #progressBar{
        font-weight:700 !important;
        letter-spacing:-.35px !important;
        white-space:nowrap !important;
      }
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
    fitProgressFont();

    if(window.MutationObserver){
      const obs=new MutationObserver(mirror);
      obs.observe(statusMain,{childList:true,characterData:true,subtree:true});
      obs.observe(statusSub,{childList:true,characterData:true,subtree:true});
    }

    const displayObserver=new MutationObserver(function(){
      if(shotBtn.style.display==='block')shotBtn.style.display='flex';
    });
    displayObserver.observe(shotBtn,{attributes:true,attributeFilter:['style']});

    if(shotBtn.style.display==='block')shotBtn.style.display='flex';
    if(statusBox)statusBox.setAttribute('aria-hidden','true');

    window.addEventListener('resize',function(){
      clearTimeout(window.__waterProgressFitTimer);
      window.__waterProgressFitTimer=setTimeout(fitProgressFont,120);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
