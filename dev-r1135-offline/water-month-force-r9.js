/* R11.35 DEV - FINAL AUTHORITY FOR MANAGEMENT MONTH SELECTOR
 * Nguồn duy nhất: Apps Script api=months -> FILE_CHI_SO_THANG!J2:J.
 * Chạy độc lập với module export cũ và tự sửa lại nếu module khác ghi đè select.
 */
(function(){
  'use strict';

  const BUILD='r1135-month-force-v1';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
  const CACHE_KEY='water_manage_months_force_v1';
  let months=[];
  let loading=false;
  let retryTimer=0;

  function txt(v){return String(v==null?'':v).trim();}
  function valid(v){return /^(0?[1-9]|1[0-2])\/\d{4}$/.test(txt(v));}
  function normalize(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';
  }
  function score(v){
    const m=normalize(v).match(/^(\d{2})\/(\d{4})$/);
    return m?Number(m[2])*12+Number(m[1]):0;
  }
  function unique(list){
    return (list||[]).map(normalize).filter(Boolean)
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
      const v=normalize(n&&n.textContent);
      if(v)return v;
    }
    try{
      const p=JSON.parse(localStorage.getItem('water_progress_ui3')||'{}');
      const v=normalize(p&&p.period);
      if(v)return v;
    }catch(e){}
    const panel=document.getElementById('waterManagePanel');
    if(panel){
      const m=txt(panel.innerText||panel.textContent).match(/(?:Kỳ\s*ghi[^0-9]*)?(0?[1-9]|1[0-2])\/\d{4}/i);
      if(m){
        const v=normalize(m[0].match(/(0?[1-9]|1[0-2])\/\d{4}/)[0]);
        if(v)return v;
      }
    }
    return '';
  }

  function selectorCandidates(){
    const out=[];
    const add=function(n){if(n&&n.tagName==='SELECT'&&out.indexOf(n)<0)out.push(n);};
    add(document.getElementById('waterExportMonthR119'));
    add(document.getElementById('waterManageMonthR119'));
    add(document.getElementById('waterExportMonth'));
    const panel=document.getElementById('waterManagePanel');
    if(panel)panel.querySelectorAll('select').forEach(add);
    document.querySelectorAll('select').forEach(function(s){
      const all=txt(s.innerText||s.textContent);
      if(/Chọn\s*Tháng|Chưa\s*có\s*dữ\s*liệu|Đang\s*tải/i.test(all))add(s);
    });
    return out;
  }

  function enableButtons(ok){
    const ids=['waterDownloadR119','waterExportDownloadR119','waterDownloadBtn'];
    ids.forEach(function(id){
      const b=document.getElementById(id);
      if(!b)return;
      b.disabled=!ok;
      b.classList.toggle('disabled',!ok);
      b.classList.toggle('r119Inactive',!ok);
      b.setAttribute('aria-disabled',ok?'false':'true');
    });
    const panel=document.getElementById('waterManagePanel');
    if(panel){
      panel.querySelectorAll('button').forEach(function(b){
        if(/^\s*TẢI FILE\s*$/i.test(txt(b.innerText||b.textContent))){
          b.disabled=!ok;
          b.classList.toggle('disabled',!ok);
          b.classList.toggle('r119Inactive',!ok);
          b.setAttribute('aria-disabled',ok?'false':'true');
        }
      });
    }
  }

  function apply(){
    const list=unique(months.concat(readCache()));
    if(!list.length)return false;
    const current=currentPeriod();
    let applied=false;

    selectorCandidates().forEach(function(select){
      const existing=Array.from(select.options||[]).map(function(o){return normalize(o.value)||normalize(txt(o.textContent).replace(/^Chọn\s*Tháng\s*:\s*/i,''));}).filter(Boolean);
      const same=existing.length===list.length&&existing.every(function(v,i){return v===list[i];});
      if(!same){
        select.innerHTML='';
        list.forEach(function(v){
          const o=document.createElement('option');
          o.value=v;
          o.textContent='Chọn Tháng: '+v;
          select.appendChild(o);
        });
      }
      if(current&&list.indexOf(current)>=0)select.value=current;
      else if(!valid(select.value))select.value=list[0];
      select.disabled=false;
      select.removeAttribute('disabled');
      select.setAttribute('data-month-force','1');
      applied=true;
    });

    if(applied){
      enableButtons(true);
      const st=document.getElementById('waterExportR119Status');
      if(st){
        st.textContent='Đã tải '+list.length+' kỳ từ FILE_CHI_SO_THANG';
        st.className='ok';
      }
      window.WATER_MONTH_FORCE_STATE={build:BUILD,months:list.slice(),current:current||''};
    }
    return applied;
  }

  function jsonp(){
    if(loading||navigator.onLine===false)return;
    loading=true;
    const cb='__waterMonthForce_'+Date.now()+'_'+Math.random().toString(36).slice(2);
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
          saveCache(got);
          apply();
          return;
        }
      }
      clearTimeout(retryTimer);
      retryTimer=setTimeout(jsonp,3000);
    }

    window[cb]=function(data){finish(null,data);};
    s.onerror=function(){finish(new Error('load'));};
    s.src=BACKEND_URL+'?api=months&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.head.appendChild(s);
  }

  function boot(){
    months=readCache();
    apply();
    jsonp();
    setInterval(function(){apply();if(!months.length)jsonp();},700);
    if(window.MutationObserver){
      new MutationObserver(function(){setTimeout(apply,0);}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
    }
  }

  document.addEventListener('click',function(e){
    const t=e.target;
    if(t&&(t.id==='waterTabManage'||(t.closest&&t.closest('#waterTabManage')))){
      setTimeout(apply,50);
      setTimeout(jsonp,80);
      setTimeout(apply,500);
    }
  },true);
  window.addEventListener('online',function(){setTimeout(jsonp,50);});
  window.addEventListener('pageshow',function(){setTimeout(boot,0);},{once:true});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){setTimeout(apply,0);setTimeout(jsonp,50);}});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.WATER_MONTH_FORCE_BUILD=BUILD;
})();
