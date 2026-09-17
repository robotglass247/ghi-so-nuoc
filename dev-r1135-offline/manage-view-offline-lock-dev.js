/* R11.35 DEV - GIU NGUYEN GIAO DIEN QUAN LY.
 * Chi sua nguon danh sach thang: Apps Script api=months -> FILE_CHI_SO_THANG!J2:J.
 * Khong an/hien, khong doi class/style nut TAI FILE / XEM CHI SO.
 * V18.2 nap download moi: XEM FILE hien thi nhu XEM CHI SO.
 */
(function(){
  'use strict';
  const BUILD='r1135-month-only-ui-preserve-v18.2';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  const SELECT_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const CACHE_KEY='water_manage_months_api_v14';
  let months=[];let loading=false;let loaded=false;let timer=0;

  function txt(v){return String(v==null?'':v).trim();}
  function byIds(ids){for(let i=0;i<ids.length;i++){const n=document.getElementById(ids[i]);if(n)return n;}return null;}
  function canon(v){const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';}
  function score(v){const m=canon(v).match(/^(\d{2})\/(\d{4})$/);return m?Number(m[2])*12+Number(m[1]):0;}
  function unique(list){return (list||[]).map(canon).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return score(b)-score(a);});}
  function readCache(){try{return unique(JSON.parse(localStorage.getItem(CACHE_KEY)||'[]'));}catch(e){return [];}}
  function saveCache(list){try{localStorage.setItem(CACHE_KEY,JSON.stringify(unique(list)));}catch(e){}}

  function currentPeriod(){
    const ids=['waterManageOverviewPeriod','waterManagePeriod','progressPeriod','waterProjectPeriod'];
    for(let i=0;i<ids.length;i++){const n=document.getElementById(ids[i]);const v=canon(n&&n.textContent);if(v)return v;}
    try{const p=JSON.parse(localStorage.getItem('water_progress_ui3')||'{}');const v=canon(p&&p.period);if(v)return v;}catch(e){}
    return '';
  }

  function readSelect(select){
    if(!select)return [];
    return Array.from(select.options||[]).map(function(o){return canon(o.value)||canon(txt(o.textContent).replace(/^Chọn\s*Tháng\s*:\s*/i,''));}).filter(Boolean);
  }

  function same(a,b){return a.length===b.length&&a.every(function(v,i){return v===b[i];});}

  function applyMonths(list){
    const select=byIds(SELECT_IDS);if(!select)return false;
    const old=canon(select.value),cur=currentPeriod();
    list=unique((list||[]).concat(cur?[cur]:[]));if(!list.length)return false;
    const before=readSelect(select);
    if(!same(before,list)){
      select.innerHTML='';
      list.forEach(function(v){const o=document.createElement('option');o.value=v;o.textContent='Chọn Tháng: '+v;select.appendChild(o);});
    }
    let wanted='';
    if(old&&list.indexOf(old)>=0)wanted=old;else if(cur&&list.indexOf(cur)>=0)wanted=cur;else wanted=list[0];
    if(wanted)select.value=wanted;
    select.disabled=false;select.removeAttribute('disabled');
    months=list.slice();saveCache(months);
    window.WATER_MANAGE_MONTH_SOURCE={build:BUILD,source:'FILE_CHI_SO_THANG!J2:J via api=months',months:months.slice()};
    try{select.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
    try{select.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
    return true;
  }

  function load(){
    if(loading||loaded||navigator.onLine===false||!byIds(SELECT_IDS))return;
    loading=true;
    const cb='__r1135MonthOnly182_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');
    let done=false;
    const timeout=setTimeout(function(){finish(new Error('timeout'));},12000);
    function cleanup(){clearTimeout(timeout);try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);}
    function finish(err,data){
      if(done)return;done=true;cleanup();loading=false;
      if(!err&&data&&data.ok===true&&Array.isArray(data.months)){
        const got=unique(data.months);if(got.length){months=got;loaded=true;saveCache(got);applyMonths(got);return;}
      }
      const cached=readCache();if(cached.length)applyMonths(cached);
    }
    window[cb]=function(data){finish(null,data);};
    s.onerror=function(){finish(new Error('load'));};
    s.src=BACKEND_URL+'?api=months&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.head.appendChild(s);
  }

  function repair(){
    const select=byIds(SELECT_IDS);if(!select)return;
    const existing=readSelect(select),label=select.options&&select.options.length?txt(select.options[Math.max(0,select.selectedIndex)].textContent):'';
    if(months.length){applyMonths(months.concat(existing));return;}
    const cached=readCache();if(cached.length)applyMonths(cached.concat(existing));
    if(!loaded&&(!existing.length||/Chưa có dữ liệu|Đang tải/i.test(label)))load();
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(function(){repair();load();},80);}
  function loadFinalBehavior(src,key){
    if(window[key]||document.querySelector('script[data-r1135-final="'+key+'"]'))return;
    const s=document.createElement('script');s.setAttribute('data-r1135-final',key);s.src=src;s.async=false;document.head.appendChild(s);
  }

  loadFinalBehavior('./dev-r1135-unified/manage-view-month-v3.js?v=14','WATER_MANAGE_VIEW_MONTH_BUILD');
  loadFinalBehavior('./dev-r1135-unified/manage-download-v7-exact-view-values.js?v=182','WATER_MANAGE_DOWNLOAD_BUILD');

  document.addEventListener('click',function(ev){
    const t=ev.target;
    if(t&&(t.id==='waterTabManage'||(t.closest&&t.closest('#waterTabManage')))){loaded=false;setTimeout(schedule,80);setTimeout(load,220);setTimeout(schedule,900);}
  },true);
  window.addEventListener('online',function(){loaded=false;schedule();});
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule();});
  if('MutationObserver' in window)new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,300);setTimeout(schedule,900);setTimeout(schedule,2200);
  window.WATER_MANAGE_VIEW_OFFLINE_LOCK_BUILD=BUILD;
})();