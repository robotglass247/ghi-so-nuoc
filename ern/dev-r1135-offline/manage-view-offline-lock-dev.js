/* ERN - QUAN LY: khoa nguon Chon Thang vao dung du lieu du an ERN.
 * Danh sach thang chi lay tu backend ERN api=months.
 * Khong chen Ky ghi hien tai, khong dung danh sach thang cu tren giao dien.
 */
(function(){
  'use strict';

  const VIEW_RELEASE='ern-month-force-source-20260921-1549';
  const BUILD='ern-month-source-v19-force-backend';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbwoAdo6eDn_4sJkhnIVAwEmf5IEi15zsLSduKmpg02l7ZcRBYO27fE4HCuXUJUNp0g/exec';
  const SELECT_IDS=['waterExportMonthR119','waterExportMonthR118'];
  let loading=false;
  let loaded=false;
  let timer=0;

  try{
    const k='water_manage_view_release_session';
    if(sessionStorage.getItem(k)!==VIEW_RELEASE){
      sessionStorage.setItem(k,VIEW_RELEASE);
      setTimeout(function(){ location.reload(); },0);
      return;
    }
  }catch(e){}

  function txt(v){ return String(v==null?'':v).trim(); }
  function byIds(ids){
    for(let i=0;i<ids.length;i++){
      const n=document.getElementById(ids[i]);
      if(n)return n;
    }
    return null;
  }
  function canon(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';
  }
  function score(v){
    const m=canon(v).match(/^(\d{2})\/(\d{4})$/);
    return m?Number(m[2])*12+Number(m[1]):0;
  }
  function unique(list){
    return (list||[]).map(canon).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;})
      .sort(function(a,b){return score(b)-score(a);});
  }

  function swapCaptureHeaderPendingPeriod(){
    const pending=document.getElementById('pending');
    const period=document.getElementById('progressPeriod');
    const total=document.getElementById('progressTotal');
    const done=document.getElementById('progressDone');
    const left=document.getElementById('progressLeft');
    const bar=document.getElementById('progressBar');
    if(!pending||!period||!total||!done||!left||!bar)return;
    if(period.parentElement&&/Kỳ ghi/i.test(String(period.parentElement.textContent||''))&&pending.parentElement===bar)return;
    const slot=pending.parentElement;
    if(!slot)return;
    try{
      period.remove(); pending.remove();
      slot.textContent='Kỳ ghi: '; slot.appendChild(period);
      bar.textContent='';
      bar.appendChild(document.createTextNode('Tổng: ')); bar.appendChild(total);
      bar.appendChild(document.createTextNode(' · Đã chụp: ')); bar.appendChild(done);
      bar.appendChild(document.createTextNode(' · Chưa chụp: ')); bar.appendChild(left);
      bar.appendChild(document.createTextNode(' · Chờ: ')); bar.appendChild(pending);
    }catch(e){}
  }

  function applyMonths(list){
    const select=byIds(SELECT_IDS);
    if(!select)return false;
    list=unique(list);
    if(!list.length)return false;

    const old=canon(select.value);
    select.innerHTML='';
    list.forEach(function(v){
      const o=document.createElement('option');
      o.value=v;
      o.textContent='Chọn Tháng: '+v;
      select.appendChild(o);
    });
    select.value=(old&&list.indexOf(old)>=0)?old:list[0];
    select.disabled=false;
    select.removeAttribute('disabled');

    window.WATER_MANAGE_MONTH_SOURCE={
      build:BUILD,
      source:'ERN backend api=months only',
      months:list.slice(),
      selected:select.value
    };

    try{select.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
    try{select.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
    return true;
  }

  function load(){
    const select=byIds(SELECT_IDS);
    if(!select||loading||navigator.onLine===false)return;
    loading=true;
    const cb='__ernMonthForce_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const s=document.createElement('script');
    let done=false;
    const timeout=setTimeout(function(){finish(new Error('timeout'));},12000);

    function cleanup(){
      clearTimeout(timeout);
      try{delete window[cb];}catch(e){window[cb]=undefined;}
      if(s.parentNode)s.parentNode.removeChild(s);
    }
    function finish(err,data){
      if(done)return;
      done=true; cleanup(); loading=false;
      if(!err&&data&&data.ok===true&&Array.isArray(data.months)){
        const got=unique(data.months);
        if(got.length){ loaded=true; applyMonths(got); return; }
      }
      loaded=false;
    }

    window[cb]=function(data){finish(null,data);};
    s.onerror=function(){finish(new Error('load'));};
    s.src=BACKEND_URL+'?api=months&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.head.appendChild(s);
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(function(){
      swapCaptureHeaderPendingPeriod();
      load();
    },60);
  }

  function loadFinalBehavior(src,key){
    if(window[key])return;
    const old=document.querySelector('script[data-r1135-final="'+key+'"]');
    if(old&&old.parentNode)old.parentNode.removeChild(old);
    const s=document.createElement('script');
    s.setAttribute('data-r1135-final',key);
    s.src=src;
    s.async=false;
    document.head.appendChild(s);
  }

  loadFinalBehavior('./dev-r1135-unified/manage-view-month-v3.js?v=19-ern-force','WATER_MANAGE_VIEW_MONTH_BUILD');
  loadFinalBehavior('./dev-r1135-unified/manage-download-v7-exact-view-values.js?v=184-ern-force','WATER_MANAGE_DOWNLOAD_BUILD');

  document.addEventListener('click',function(ev){
    const t=ev.target;
    if(t&&(t.id==='waterTabManage'||(t.closest&&t.closest('#waterTabManage')))){
      loaded=false;
      setTimeout(load,80);
      setTimeout(load,500);
    }
  },true);
  window.addEventListener('online',function(){loaded=false;load();});
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule();});
  if('MutationObserver' in window){
    new MutationObserver(function(){if(!loaded)schedule();}).observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,250);
  setTimeout(schedule,900);
  setTimeout(schedule,2200);

  window.WATER_MANAGE_VIEW_OFFLINE_LOCK_BUILD=BUILD;
})();
