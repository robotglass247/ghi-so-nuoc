/* R11.35 DEV ONLY
 * Muc tieu duy nhat:
 * - Giu nguyen giao dien QUAN LY hien tai.
 * - Sua NGUON danh sach thang cho ca ban nhung R11.8 (R118) va R11.9 (R119).
 * - Nguon: Apps Script api=months -> FILE_CHI_SO_THANG!J2:J.
 * - Khong thay layout, khong thay nut XEM, khong thay logic tai file ngoai viec mo lai nut
 *   dung nhu logic goc sau khi danh sach thang da nap thanh cong.
 */
(function(){
  'use strict';

  const BUILD='r1135-month-source-file-chi-so-v1';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  const SELECT_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const DOWNLOAD_IDS=['waterDownloadR119','waterDownloadR118'];
  const VIEW_IDS=['waterViewR119','waterViewR118'];
  const LOCK_ATTR='data-r1135-view-offline-lock';
  const CACHE_KEY='water_manage_months_file_chi_so_v1';

  let loading=false;
  let loaded=false;
  let months=[];
  let timer=0;

  function txt(v){return String(v==null?'':v).trim();}
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
    return (list||[]).map(canon).filter(Boolean)
      .filter(function(v,i,a){return a.indexOf(v)===i;})
      .sort(function(a,b){return score(b)-score(a);});
  }
  function readCache(){
    try{return unique(JSON.parse(localStorage.getItem(CACHE_KEY)||'[]'));}
    catch(e){return [];}
  }
  function saveCache(list){
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(unique(list)));}catch(e){}
  }

  function enableDownload(){
    const b=byIds(DOWNLOAD_IDS);
    if(!b)return;
    try{b.disabled=false;}catch(e){}
    b.classList.remove('disabled');
    b.setAttribute('aria-disabled','false');
  }

  function fill(list){
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

    if(old&&list.indexOf(old)>=0)select.value=old;
    else select.value=list[0];

    select.disabled=false;
    enableDownload();
    months=list.slice();
    saveCache(months);

    try{select.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
    window.WATER_MANAGE_MONTH_SOURCE={
      build:BUILD,
      source:'FILE_CHI_SO_THANG!J2:J via api=months',
      months:months.slice()
    };
    return true;
  }

  function load(){
    if(loading||loaded||navigator.onLine===false)return;
    if(!byIds(SELECT_IDS))return;

    loading=true;
    const cb='__r1135Months_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const s=document.createElement('script');
    let done=false;
    const to=setTimeout(function(){finish(new Error('timeout'));},15000);

    function cleanup(){
      clearTimeout(to);
      try{delete window[cb];}catch(e){window[cb]=undefined;}
      if(s.parentNode)s.parentNode.removeChild(s);
    }
    function finish(err,data){
      if(done)return;
      done=true;
      cleanup();
      loading=false;

      if(!err&&data&&data.ok===true&&Array.isArray(data.months)){
        const got=unique(data.months);
        if(got.length){
          loaded=true;
          fill(got);
          return;
        }
      }

      const cached=readCache();
      if(cached.length)fill(cached);
    }

    window[cb]=function(data){finish(null,data);};
    s.onerror=function(){finish(new Error('load'));};
    s.src=BACKEND_URL+'?api=months&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.head.appendChild(s);
  }

  function repair(){
    const select=byIds(SELECT_IDS);
    if(!select)return;

    const current=canon(select.value);
    const label=select.options&&select.options.length
      ? txt(select.options[select.selectedIndex>=0?select.selectedIndex:0].textContent)
      : '';

    if(loaded&&months.length){
      if(!current || /Chưa có dữ liệu|Đang tải/i.test(label))fill(months);
      return;
    }

    const cached=readCache();
    if(cached.length && (!current || /Chưa có dữ liệu|Đang tải/i.test(label))){
      fill(cached);
    }
    load();
  }

  // Giu lai hanh vi cu: XEM CHI SO chi khoa khi offline, khong doi giao dien.
  function applyOfflineViewLock(){
    const offline=navigator.onLine===false;
    const v=byIds(VIEW_IDS);
    if(!v)return;
    if(offline){
      v.setAttribute(LOCK_ATTR,'1');
      v.setAttribute('aria-disabled','true');
    }else{
      v.removeAttribute(LOCK_ATTR);
      v.removeAttribute('aria-disabled');
    }
  }

  function scan(){
    clearTimeout(timer);
    timer=setTimeout(function(){
      applyOfflineViewLock();
      repair();
    },60);
  }

  document.addEventListener('click',function(ev){
    const t=ev.target;
    if(t&&(t.id==='waterTabManage'||(t.closest&&t.closest('#waterTabManage')))){
      loaded=false;
      setTimeout(scan,80);
      setTimeout(load,250);
      setTimeout(scan,900);
    }
  },true);

  window.addEventListener('online',function(){loaded=false;scan();setTimeout(load,120);});
  window.addEventListener('offline',scan);
  window.addEventListener('pageshow',scan);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')scan();});

  if('MutationObserver' in window){
    new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});
  else scan();

  setTimeout(scan,250);
  setTimeout(load,600);
  setTimeout(scan,1400);
  setTimeout(scan,3200);

  window.WATER_MANAGE_VIEW_OFFLINE_LOCK_BUILD=BUILD;
})();
