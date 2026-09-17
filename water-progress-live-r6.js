(function(){
  'use strict';

  const BUILD='879-final10-postcapture-r6-liveprogress-periodswap1';
  const BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  const POLL_MS=4000;

  let frame=null;
  let form=null;
  let timer=null;
  let debounceTimer=null;
  let requestId='';
  let running=false;
  let queued=false;
  let lastPending=null;

  function el(id){return document.getElementById(id);}

  function periodNow(){
    try{
      const parts=new Intl.DateTimeFormat('en-GB',{
        timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',year:'numeric'
      }).formatToParts(new Date());
      return parts.find(x=>x.type==='month').value+'/'+parts.find(x=>x.type==='year').value;
    }catch(e){
      const d=new Date();
      return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
    }
  }

  function displayPeriod(value){
    const p=String(value||periodNow()).trim();
    const m=/^(0?[1-9]|1[0-2])\/(\d{4})$/.exec(p);
    return m ? String(Number(m[1]))+'/'+m[2] : p;
  }

  function displayCount(n){
    return String(Math.max(0,Math.floor(Number(n)||0)));
  }

  function swapHeaderPeriodPending(){
    const pendingNode=el('pending');
    const periodNode=el('progressPeriod');
    const totalNode=el('progressTotal');
    const doneNode=el('progressDone');
    const leftNode=el('progressLeft');
    const bar=el('progressBar');

    if(!pendingNode||!periodNode||!totalNode||!doneNode||!leftNode||!bar)return false;

    const headerSlot=pendingNode.parentElement;
    if(!headerSlot)return false;

    if(periodNode.parentElement===headerSlot && pendingNode.parentElement===bar)return true;

    try{
      periodNode.remove();
      pendingNode.remove();

      headerSlot.textContent='Kỳ ghi: ';
      headerSlot.appendChild(periodNode);

      bar.textContent='';
      bar.appendChild(document.createTextNode('Tổng: '));
      bar.appendChild(totalNode);
      bar.appendChild(document.createTextNode(' · Đã chụp: '));
      bar.appendChild(doneNode);
      bar.appendChild(document.createTextNode(' · Chưa chụp: '));
      bar.appendChild(leftNode);
      bar.appendChild(document.createTextNode(' · Chờ: '));
      bar.appendChild(pendingNode);

      return true;
    }catch(e){
      return false;
    }
  }

  function renderProgress(data){
    if(!data||data.ok!==true)return false;

    const total=Math.max(0,Number(data.total)||0);
    const done=Math.max(0,Math.min(total,Number(data.captured)||0));
    const left=Number.isFinite(Number(data.remaining))
      ? Math.max(0,Number(data.remaining))
      : Math.max(0,total-done);

    if(el('progressTotal'))el('progressTotal').textContent=displayCount(total);
    if(el('progressDone'))el('progressDone').textContent=displayCount(done);
    if(el('progressLeft'))el('progressLeft').textContent=displayCount(left);
    if(el('progressPeriod'))el('progressPeriod').textContent=displayPeriod(data.period);

    try{localStorage.setItem('water_progress_ui3',JSON.stringify(data));}catch(e){}
    return true;
  }

  swapHeaderPeriodPending();

  function cleanup(){
    clearTimeout(timer);
    timer=null;
    if(form){
      try{form.remove();}catch(e){}
      form=null;
    }
    if(frame){
      try{frame.remove();}catch(e){}
      frame=null;
    }
    requestId='';
    running=false;
  }

  function hiddenInput(target,name,value){
    const i=document.createElement('input');
    i.type='hidden';
    i.name=name;
    i.value=String(value==null?'':value);
    target.appendChild(i);
  }

  function requestProgress(reason){
    if(!navigator.onLine)return;

    if(running){
      queued=true;
      return;
    }

    running=true;
    queued=false;

    const id='p'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
    requestId=id;

    const target='waterProgressLive_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    const f=document.createElement('iframe');
    f.name=target;
    f.id=target;
    f.style.display='none';
    f.setAttribute('aria-hidden','true');
    document.body.appendChild(f);
    frame=f;

    const frm=document.createElement('form');
    frm.method='POST';
    frm.action=BACKEND;
    frm.target=target;
    frm.style.display='none';

    hiddenInput(frm,'api','uistate');
    hiddenInput(frm,'period',periodNow());
    hiddenInput(frm,'requestId',id);
    hiddenInput(frm,'reason',reason||'progress_live');

    document.body.appendChild(frm);
    form=frm;

    try{
      frm.submit();
    }catch(e){
      cleanup();
      return;
    }

    setTimeout(function(){
      if(form===frm){
        try{frm.remove();}catch(e){}
        form=null;
      }
    },200);

    timer=setTimeout(function(){
      if(requestId!==id)return;
      const rerun=queued;
      cleanup();
      queued=false;
      if(rerun)setTimeout(function(){requestProgress('retry_after_timeout');},250);
    },8000);
  }

  function schedule(reason,delay){
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(function(){requestProgress(reason);},Math.max(0,Number(delay)||0));
  }

  function burst(reason){
    schedule(reason,150);
    setTimeout(function(){requestProgress(reason+'_confirm');},1300);
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(!d.requestId||d.requestId!==requestId)return;

    renderProgress(d.progress);

    const rerun=queued;
    cleanup();
    queued=false;

    if(rerun)setTimeout(function(){requestProgress('queued_refresh');},180);
  });

  const syncStatus=el('syncStatus');
  if(syncStatus&&window.MutationObserver){
    new MutationObserver(function(){
      const t=String(syncStatus.textContent||'').trim();
      if(/✓\s*SPEED3.*GỬI HẾT/i.test(t)){
        burst('sync_complete');
      }
    }).observe(syncStatus,{childList:true,characterData:true,subtree:true});
  }

  const pending=el('pending');
  if(pending){
    const readPending=function(){
      const n=Math.max(0,Number(String(pending.textContent||'').replace(/[^\d]/g,''))||0);
      if(lastPending===null){
        lastPending=n;
        return;
      }
      if(lastPending>0&&n===0&&navigator.onLine){
        burst('pending_zero');
      }
      lastPending=n;
    };

    readPending();

    if(window.MutationObserver){
      new MutationObserver(readPending)
        .observe(pending,{childList:true,characterData:true,subtree:true});
    }
  }

  window.addEventListener('online',function(){burst('online');});
  window.addEventListener('pageshow',function(){
    swapHeaderPeriodPending();
    schedule('pageshow',250);
  });

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'){
      swapHeaderPeriodPending();
      schedule('visible',200);
    }
  });

  setTimeout(function(){
    swapHeaderPeriodPending();
    requestProgress('startup_live');
  },300);

  setInterval(function(){
    if(document.visibilityState==='visible'&&navigator.onLine){
      requestProgress('poll_4s');
    }
  },POLL_MS);

  window.WATER_LIVE_PROGRESS_BUILD=BUILD;
})();
