(function(){
  'use strict';

  const BUILD='water-sync-diagnostic-v1';

  function styleSyncStatus(){
    const el=document.getElementById('syncStatus');
    if(!el)return;

    el.style.setProperty('white-space','normal','important');
    el.style.setProperty('overflow-wrap','anywhere','important');
    el.style.setProperty('word-break','break-word','important');
    el.style.setProperty('text-overflow','clip','important');
    el.style.setProperty('overflow-x','hidden','important');
    el.style.setProperty('overflow-y','auto','important');
    el.style.setProperty('max-height','120px','important');
    el.style.setProperty('line-height','1.35','important');
    el.style.setProperty('text-align','left','important');
  }

  function syncFullText(){
    const el=document.getElementById('syncStatus');
    if(!el)return;
    const text=String(el.textContent||'').trim();
    if(text)el.setAttribute('title',text);
  }

  function install(){
    const el=document.getElementById('syncStatus');
    if(!el){
      setTimeout(install,200);
      return;
    }

    styleSyncStatus();
    syncFullText();

    if(window.MutationObserver){
      new MutationObserver(function(){
        styleSyncStatus();
        syncFullText();
      }).observe(el,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['style']});
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }

  window.WATER_SYNC_DIAGNOSTIC_BUILD=BUILD;
})();
