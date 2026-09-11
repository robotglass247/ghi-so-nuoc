(function(){
  'use strict';

  const PROBE_URL='./net-check.txt';
  const PROBE_TIMEOUT=3000;
  const VERIFY_TTL=8000;

  let realOnline=null;
  let lastVerifiedAt=0;
  let probePromise=null;
  let gateTimer=null;

  const baseSchedule=window.scheduleAutoSync;
  const baseSync=window.syncQueue;

  function el(id){return document.getElementById(id);}

  function renderNet(){
    const n=el('net');
    if(n)n.textContent=realOnline===true?'● ONLINE':'● OFFLINE';
  }

  function setRealOnline(ok){
    realOnline=ok===true;
    window.WATER_REAL_ONLINE=realOnline;
    window.WATER_OPENED_OFFLINE=!realOnline;
    renderNet();
    return realOnline;
  }

  async function probe(force){
    if(!navigator.onLine)return setRealOnline(false);

    if(!force && realOnline===true && (Date.now()-lastVerifiedAt)<VERIFY_TTL){
      return true;
    }
    if(probePromise)return probePromise;

    probePromise=(async()=>{
      const ctl=new AbortController();
      const timer=setTimeout(()=>ctl.abort(),PROBE_TIMEOUT);
      try{
        const r=await fetch(PROBE_URL+'?t='+Date.now(),{
          cache:'no-store',
          signal:ctl.signal
        });
        const ok=!!(r&&r.ok);
        if(ok)lastVerifiedAt=Date.now();
        return setRealOnline(ok);
      }catch(e){
        return setRealOnline(false);
      }finally{
        clearTimeout(timer);
        probePromise=null;
      }
    })();

    return probePromise;
  }

  function showOfflineQueue(){
    const s=el('syncStatus');
    if(s)s.textContent='OFFLINE · ảnh được lưu an toàn trong Chờ.';
  }

  function guardedSchedule(delayMs){
    clearTimeout(gateTimer);
    gateTimer=setTimeout(async()=>{
      const ok=await probe(false);
      if(!ok){
        showOfflineQueue();
        return;
      }
      if(typeof baseSchedule==='function')baseSchedule(0);
    },Math.max(0,Number(delayMs)||0));
  }

  async function guardedSync(options){
    const ok=await probe(true);
    if(!ok){
      showOfflineQueue();
      try{if(typeof updatePending==='function')await updatePending();}catch(e){}
      return;
    }
    if(typeof baseSync==='function')return baseSync(options||{});
  }

  function guardedUpdateNet(){
    if(!navigator.onLine)setRealOnline(false);
    else renderNet();
  }

  window.scheduleAutoSync=guardedSchedule;
  window.syncQueue=guardedSync;
  window.updateNet=guardedUpdateNet;
  window.waterProbeInternet=probe;
  window.WATER_REAL_ONLINE=null;
  window.WATER_OPENED_OFFLINE=!navigator.onLine;

  try{scheduleAutoSync=guardedSchedule;}catch(e){}
  try{syncQueue=guardedSync;}catch(e){}
  try{updateNet=guardedUpdateNet;}catch(e){}

  // Không bao giờ hiển thị ONLINE trước khi kiểm tra Internet thật thành công.
  renderNet();

  window.addEventListener('offline',()=>{
    clearTimeout(gateTimer);
    setRealOnline(false);
    showOfflineQueue();
  });

  window.addEventListener('online',()=>{
    probe(true).then(ok=>{
      if(ok)guardedSchedule(300);
    });
  });

  probe(true).then(ok=>{
    if(ok)guardedSchedule(500);
    else showOfflineQueue();
  });
})();
