/* R11.35 DEV ONLY - lock XEM CHỈ SỐ while offline.
   Does not change project, capture, camera, QR, queue, download or other management functions. */
(function(){
  'use strict';

  const BUILD='r1135-manage-view-offline-lock-v1';
  const LOCK_ATTR='data-r1135-view-offline-lock';
  const TOAST_ID='r1135ViewOfflineToast';
  let scanTimer=0;

  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){
    return txt(v).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function isViewButton(el){
    if(!el||el.nodeType!==1)return false;
    const label=norm(el.innerText||el.textContent||el.getAttribute('aria-label')||'');
    return label==='xem chi so';
  }

  function getViewButtonFrom(node){
    let el=node&&node.nodeType===1?node:null;
    while(el&&el!==document.documentElement){
      if(isViewButton(el))return el;
      el=el.parentElement;
    }
    return null;
  }

  function ensureStyle(){
    if(document.getElementById('r1135ViewOfflineLockStyle'))return;
    const s=document.createElement('style');
    s.id='r1135ViewOfflineLockStyle';
    s.textContent=`
      [${LOCK_ATTR}="1"]{opacity:.48!important;filter:grayscale(.15);cursor:not-allowed!important}
      #${TOAST_ID}{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:calc(100vw - 36px);box-sizing:border-box;padding:10px 14px;border-radius:10px;background:#20262d;color:#fff;font:700 13px/1.35 Arial,sans-serif;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.24);opacity:0;pointer-events:none;transition:opacity .16s ease}
      #${TOAST_ID}.show{opacity:1}
    `;
    document.head.appendChild(s);
  }

  function showNeedNetwork(){
    ensureStyle();
    let n=document.getElementById(TOAST_ID);
    if(!n){
      n=document.createElement('div');
      n.id=TOAST_ID;
      n.setAttribute('role','status');
      n.textContent='Cần kết nối Internet để Xem chỉ số.';
      document.body.appendChild(n);
    }
    n.classList.remove('show');
    void n.offsetWidth;
    n.classList.add('show');
    clearTimeout(n._hideTimer);
    n._hideTimer=setTimeout(function(){n.classList.remove('show');},2200);
  }

  function applyState(){
    ensureStyle();
    const offline=navigator.onLine===false;
    const candidates=document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]');
    for(let i=0;i<candidates.length;i++){
      const el=candidates[i];
      if(!isViewButton(el))continue;
      if(offline){
        el.setAttribute(LOCK_ATTR,'1');
        el.setAttribute('aria-disabled','true');
        el.setAttribute('title','Cần kết nối Internet để Xem chỉ số');
      }else{
        el.removeAttribute(LOCK_ATTR);
        el.removeAttribute('aria-disabled');
        if(el.getAttribute('title')==='Cần kết nối Internet để Xem chỉ số')el.removeAttribute('title');
      }
    }
  }

  function scheduleScan(){
    if(scanTimer)clearTimeout(scanTimer);
    scanTimer=setTimeout(function(){scanTimer=0;applyState();},60);
  }

  function blockIfOffline(ev){
    if(navigator.onLine!==false)return;
    const btn=getViewButtonFrom(ev.target);
    if(!btn)return;
    ev.preventDefault();
    ev.stopPropagation();
    if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
    showNeedNetwork();
  }

  // Capture phase blocks the original XEM CHỈ SỐ handler before it can open Google Sheet.
  document.addEventListener('click',blockIfOffline,true);
  document.addEventListener('keydown',function(ev){
    if((ev.key==='Enter'||ev.key===' ')&&navigator.onLine===false){
      const btn=getViewButtonFrom(ev.target);
      if(btn){
        ev.preventDefault();
        ev.stopPropagation();
        if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
        showNeedNetwork();
      }
    }
  },true);

  window.addEventListener('online',scheduleScan);
  window.addEventListener('offline',scheduleScan);
  window.addEventListener('pageshow',scheduleScan);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')scheduleScan();});

  if('MutationObserver' in window){
    new MutationObserver(scheduleScan).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleScan,{once:true});
  else scheduleScan();

  window.WATER_MANAGE_VIEW_OFFLINE_LOCK_BUILD=BUILD;
})();
