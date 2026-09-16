/* R11.35 DEV ONLY
 * 1) Khóa XEM CHỈ SỐ khi offline.
 * 2) Sửa nguồn danh sách tháng của màn QUẢN LÝ sau khi cấu trúc file quản lý thay đổi.
 *    Nguồn chuẩn: FILE_CHI_SO_THANG!J2:J (DANH_SACH_KY).
 *    Fallback an toàn: kỳ đang hiển thị trên App.
 */
(function(){
  'use strict';

  const BUILD='r1135-manage-month-source-v2';
  const LOCK_ATTR='data-r1135-view-offline-lock';
  const TOAST_ID='r1135ViewOfflineToast';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const MONTH_SHEET='FILE_CHI_SO_THANG';
  const MONTH_RANGE='J2:J40000';
  let scanTimer=0;
  let monthsLoading=false;
  let monthsLoaded=false;
  let months=[];

  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){
    return txt(v).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }
  function validPeriod(v){return /^\d{1,2}\/\d{4}$/.test(txt(v));}
  function periodScore(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m ? Number(m[2])*12+Number(m[1]) : 0;
  }
  function uniquePeriods(list){
    return (list||[]).map(txt).filter(validPeriod)
      .filter(function(v,i,a){return a.indexOf(v)===i;})
      .sort(function(a,b){return periodScore(b)-periodScore(a);});
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

  function currentPeriodFromApp(){
    const ids=['progressPeriod','waterManagePeriod'];
    for(let i=0;i<ids.length;i++){
      const n=document.getElementById(ids[i]);
      const v=txt(n&&n.textContent);
      if(validPeriod(v))return v;
    }
    const nodes=document.querySelectorAll('[data-water-period],.r98OverviewValue,.waterOverviewValue');
    for(let i=0;i<nodes.length;i++){
      const v=txt(nodes[i].textContent);
      if(validPeriod(v))return v;
    }
    return '';
  }

  function setStatus(message,kind){
    const n=document.getElementById('waterExportR119Status');
    if(!n)return;
    n.textContent=message;
    n.className=kind||'';
  }

  function enableDownload(ok){
    const b=document.getElementById('waterDownloadR119');
    if(!b)return;
    b.disabled=!ok;
    b.classList.toggle('disabled',!ok);
    b.classList.toggle('r119Inactive',!ok);
    b.setAttribute('aria-disabled',ok?'false':'true');
    b.style.setProperty('display','flex','important');
    b.style.setProperty('visibility','visible','important');
  }

  function fillMonthSelector(list){
    const select=document.getElementById('waterExportMonthR119');
    if(!select)return false;

    list=uniquePeriods(list);
    if(!list.length)return false;

    const old=txt(select.value);
    select.innerHTML='';
    list.forEach(function(v){
      const o=document.createElement('option');
      o.value=v;
      o.textContent='Chọn Tháng: '+v;
      select.appendChild(o);
    });
    if(old&&list.indexOf(old)>=0)select.value=old;
    select.disabled=false;
    enableDownload(true);
    return true;
  }

  function readExistingPeriods(){
    const select=document.getElementById('waterExportMonthR119');
    if(!select)return [];
    return Array.from(select.options||[]).map(function(o){
      const v=txt(o.value)||txt(o.textContent).replace(/^Chọn Tháng:\s*/i,'');
      return validPeriod(v)?v:'';
    }).filter(Boolean);
  }

  function fallbackCurrentPeriod(){
    const current=currentPeriodFromApp();
    if(!current)return false;
    const list=uniquePeriods(months.concat(readExistingPeriods(),[current]));
    if(fillMonthSelector(list)){
      setStatus('Nguồn kỳ: FILE_CHI_SO_THANG • đang dùng kỳ hiện tại khi chờ Google Sheet.','ok');
      return true;
    }
    return false;
  }

  function loadMonthsFromManagementSheet(){
    if(monthsLoading||monthsLoaded||navigator.onLine===false)return;
    monthsLoading=true;

    const cb='__r1135Month_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const s=document.createElement('script');
    let done=false;
    const timer=setTimeout(function(){finish(new Error('timeout'));},12000);

    function cleanup(){
      clearTimeout(timer);
      try{delete window[cb];}catch(e){window[cb]=undefined;}
      if(s.parentNode)s.parentNode.removeChild(s);
    }
    function finish(err,data){
      if(done)return;
      done=true;
      cleanup();
      monthsLoading=false;

      if(!err&&data&&data.table&&Array.isArray(data.table.rows)){
        const got=data.table.rows.map(function(r){
          const c=r&&r.c&&r.c[0];
          return c ? (c.f!=null?c.f:c.v) : '';
        });
        months=uniquePeriods(got.concat([currentPeriodFromApp()]));
        if(months.length){
          monthsLoaded=true;
          fillMonthSelector(months);
          setStatus('Nguồn kỳ: FILE_CHI_SO_THANG • '+months.length+' kỳ dữ liệu','ok');
          return;
        }
      }
      fallbackCurrentPeriod();
    }

    window[cb]=function(data){finish(null,data);};
    s.onerror=function(){finish(new Error('load'));};
    s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
      +'/gviz/tq?sheet='+encodeURIComponent(MONTH_SHEET)
      +'&range='+encodeURIComponent(MONTH_RANGE)
      +'&headers=0&tqx=responseHandler:'+encodeURIComponent(cb)
      +'&tq='+encodeURIComponent('select A where A is not null')
      +'&_='+Date.now();
    document.head.appendChild(s);
  }

  function repairMonthSelector(){
    const select=document.getElementById('waterExportMonthR119');
    if(!select)return;

    const existing=readExistingPeriods();
    if(existing.length){
      if(months.length){
        fillMonthSelector(months.concat(existing,[currentPeriodFromApp()]));
      }
      return;
    }

    // Không để giao diện mắc ở "Chưa có dữ liệu" trong khi kỳ hiện tại đã có.
    fallbackCurrentPeriod();
    loadMonthsFromManagementSheet();
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
    repairMonthSelector();
  }

  function scheduleScan(){
    if(scanTimer)clearTimeout(scanTimer);
    scanTimer=setTimeout(function(){scanTimer=0;applyState();},80);
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

  window.addEventListener('online',function(){monthsLoaded=false;scheduleScan();loadMonthsFromManagementSheet();});
  window.addEventListener('offline',scheduleScan);
  window.addEventListener('pageshow',scheduleScan);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')scheduleScan();});

  if('MutationObserver' in window){
    new MutationObserver(scheduleScan).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleScan,{once:true});
  else scheduleScan();

  setTimeout(scheduleScan,300);
  setTimeout(scheduleScan,1000);
  setTimeout(function(){repairMonthSelector();loadMonthsFromManagementSheet();},2200);
  setTimeout(scheduleScan,5000);

  window.WATER_MANAGE_VIEW_OFFLINE_LOCK_BUILD=BUILD;
})();
