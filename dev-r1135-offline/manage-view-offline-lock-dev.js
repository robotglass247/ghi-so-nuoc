/* R11.35 DEV ONLY
 * Giữ nguyên giao diện QUẢN LÝ trước bản force-month.
 * Chỉ sửa NGUỒN dữ liệu tháng qua Apps Script api=months.
 * Không tự ẩn/hiện, không đổi class/style của nút TẢI FILE / XEM CHỈ SỐ.
 */
(function(){
  'use strict';

  const BUILD='r1135-manage-month-api-v4-ui-preserve';
  const LOCK_ATTR='data-r1135-view-offline-lock';
  const TOAST_ID='r1135ViewOfflineToast';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  const CACHE_KEY='water_manage_months_api_v4';

  let months=[];
  let loading=false;
  let loaded=false;
  let repairTimer=0;

  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){
    return txt(v).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }
  function canonical(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m ? String(Number(m[1])).padStart(2,'0')+'/'+m[2] : '';
  }
  function score(v){
    const m=canonical(v).match(/^(\d{2})\/(\d{4})$/);
    return m ? Number(m[2])*12+Number(m[1]) : 0;
  }
  function unique(list){
    return (list||[]).map(canonical).filter(Boolean)
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

  function currentPeriod(){
    const ids=['waterManageOverviewPeriod','waterManagePeriod','progressPeriod','waterProjectPeriod'];
    for(let i=0;i<ids.length;i++){
      const n=document.getElementById(ids[i]);
      const v=canonical(n&&n.textContent);
      if(v)return v;
    }
    try{
      const p=JSON.parse(localStorage.getItem('water_progress_ui3')||'{}');
      const v=canonical(p&&p.period);
      if(v)return v;
    }catch(e){}
    return '';
  }

  function getSelect(){
    return document.getElementById('waterExportMonthR119');
  }

  function readSelectMonths(select){
    if(!select)return [];
    return Array.from(select.options||[]).map(function(o){
      return canonical(o.value) || canonical(txt(o.textContent).replace(/^Chọn\s*Tháng\s*:\s*/i,''));
    }).filter(Boolean);
  }

  function sameList(a,b){
    return a.length===b.length && a.every(function(v,i){return v===b[i];});
  }

  function applyMonths(list){
    const select=getSelect();
    if(!select)return false;

    const current=currentPeriod();
    const old=canonical(select.value);
    list=unique((list||[]).concat(current?[current]:[]));
    if(!list.length)return false;

    const before=readSelectMonths(select);
    const needRebuild=!sameList(before,list);
    if(needRebuild){
      select.innerHTML='';
      list.forEach(function(v){
        const o=document.createElement('option');
        o.value=v;
        o.textContent='Chọn Tháng: '+v;
        select.appendChild(o);
      });
    }

    let wanted='';
    if(old&&list.indexOf(old)>=0)wanted=old;
    else if(current&&list.indexOf(current)>=0)wanted=current;
    else wanted=list[0];

    const valueChanged=canonical(select.value)!==wanted;
    if(wanted)select.value=wanted;
    select.disabled=false;
    select.removeAttribute('disabled');

    months=list.slice();
    saveCache(months);

    /* Quan trọng: để module giao diện GỐC tự xử lý trạng thái nút TẢI FILE / XEM CHỈ SỐ.
       Không đụng class/style/button tại đây. */
    if(needRebuild || valueChanged){
      try{select.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
      try{select.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
    }

    window.WATER_MANAGE_MONTH_SOURCE={
      source:'WEB APP / FILE_CHI_SO_THANG',
      months:months.slice(),
      build:BUILD
    };
    return true;
  }

  function repair(){
    const select=getSelect();
    if(!select)return;
    const current=currentPeriod();
    const existing=readSelectMonths(select);
    const shown=txt(select.options&&select.options.length?select.options[Math.max(0,select.selectedIndex)].textContent:'');

    if(months.length){
      applyMonths(months.concat(existing));
      return;
    }

    const cached=readCache();
    if(cached.length || current){
      applyMonths(cached.concat(existing,current?[current]:[]));
    }

    if(!loaded && (/Chưa có dữ liệu|Đang tải/i.test(shown) || !existing.length)){
      load();
    }
  }

  function load(){
    if(loading || navigator.onLine===false)return;
    loading=true;

    const cb='__r1135MonthsV4_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const s=document.createElement('script');
    let done=false;
    const timer=setTimeout(function(){finish(new Error('timeout'));},15000);

    function cleanup(){
      clearTimeout(timer);
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
          months=got;
          loaded=true;
          saveCache(got);
          applyMonths(got);
          return;
        }
      }
      setTimeout(repair,500);
    }

    window[cb]=function(data){finish(null,data);};
    s.onerror=function(){finish(new Error('load'));};
    s.src=BACKEND_URL+'?api=months&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.head.appendChild(s);
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
  function applyOfflineLock(){
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

  function scheduleRepair(){
    clearTimeout(repairTimer);
    repairTimer=setTimeout(function(){
      applyOfflineLock();
      repair();
    },100);
  }

  document.addEventListener('click',function(ev){
    if(navigator.onLine===false){
      const btn=getViewButtonFrom(ev.target);
      if(btn){
        ev.preventDefault();
        ev.stopPropagation();
        if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
        showNeedNetwork();
        return;
      }
    }
    const t=ev.target;
    if(t&&(t.id==='waterTabManage'||(t.closest&&t.closest('#waterTabManage')))){
      setTimeout(repair,80);
      setTimeout(load,180);
      setTimeout(repair,700);
    }
  },true);

  window.addEventListener('online',function(){loaded=false;scheduleRepair();setTimeout(load,100);});
  window.addEventListener('offline',scheduleRepair);
  window.addEventListener('pageshow',scheduleRepair);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')scheduleRepair();});

  if('MutationObserver' in window){
    new MutationObserver(scheduleRepair).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleRepair,{once:true});
  else scheduleRepair();

  setTimeout(function(){repair();load();},500);
  setTimeout(repair,1200);
  setTimeout(repair,3000);

  window.WATER_MANAGE_VIEW_OFFLINE_LOCK_BUILD=BUILD;
})();
