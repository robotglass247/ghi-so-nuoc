(function(){
  'use strict';

  const BUILD='879-final10-r9.2-default-capture-r1135-manage-source-fix4';
  const SHEET_ID='18R-6ulz85T34hXOu5B2GrYoqHrWiDV4BO6LojJp16_A';
  const MONTH_SHEET='FILE_CHI_SO_THANG';
  const MONTH_RANGE='J2:J40000';
  const MONTH_CACHE='water_manage_months_file_chi_so_v2';
  const BACKEND_URL='https://script.google.com/macros/s/AKfycbwoAdo6eDn_4sJkhnIVAwEmf5IEi15zsLSduKmpg02l7ZcRBYO27fE4HCuXUJUNp0g/exec';

  let captureApplied=false;
  let loading=false;
  let lastNetworkTry=0;
  let knownMonths=[];

  function txt(v){return String(v==null?'':v).trim();}
  function validPeriod(v){return /^(0?[1-9]|1[0-2])\/\d{4}$/.test(txt(v));}
  function score(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m ? Number(m[2])*12+Number(m[1]) : 0;
  }
  function uniqueMonths(list){
    return (list||[])
      .map(txt)
      .filter(validPeriod)
      .map(function(v){
        const m=v.match(/^(\d{1,2})\/(\d{4})$/);
        return String(Number(m[1])).padStart(2,'0')+'/'+m[2];
      })
      .filter(function(v,i,a){return a.indexOf(v)===i;})
      .sort(function(a,b){return score(b)-score(a);});
  }

  function openCaptureDefault(){
    if(captureApplied)return;
    const btn=document.getElementById('waterTabCapture');
    if(!btn)return;
    captureApplied=true;
    try{localStorage.setItem('water_active_main_tab_v1','capture');}catch(e){}
    btn.click();
  }

  function scheduleCapture(){
    setTimeout(openCaptureDefault,0);
    setTimeout(openCaptureDefault,120);
  }

  function cachedProgressPeriod(){
    try{
      const p=JSON.parse(localStorage.getItem('water_progress_ui3')||'{}');
      const v=txt(p&&p.period);
      return validPeriod(v)?v:'';
    }catch(e){return '';}
  }

  function currentPeriodFromManage(){
    // R9.8 layout thực tế dùng waterManageOverviewPeriod.
    const ids=[
      'waterManageOverviewPeriod',
      'waterManagePeriod',
      'progressPeriod',
      'waterProjectPeriod'
    ];

    for(let i=0;i<ids.length;i++){
      const n=document.getElementById(ids[i]);
      const v=txt(n&&n.textContent);
      if(validPeriod(v))return v;
    }

    const cached=cachedProgressPeriod();
    if(cached)return cached;

    const panel=document.getElementById('waterManagePanel');
    if(panel){
      const all=txt(panel.innerText||panel.textContent);
      const named=all.match(/Kỳ\s*ghi\s*(0?[1-9]|1[0-2])\/\d{4}/i);
      if(named)return named[0].match(/(0?[1-9]|1[0-2])\/\d{4}/)[0];

      const nodes=panel.querySelectorAll('.r98OverviewValue,.waterOverviewValue,b,strong,span,div');
      for(let i=0;i<nodes.length;i++){
        const v=txt(nodes[i].textContent);
        if(validPeriod(v))return v;
      }
    }

    return '';
  }

  function readCache(){
    try{return uniqueMonths(JSON.parse(localStorage.getItem(MONTH_CACHE)||'[]'));}
    catch(e){return [];}
  }

  function saveCache(list){
    try{localStorage.setItem(MONTH_CACHE,JSON.stringify(uniqueMonths(list)));}catch(e){}
  }

  function optionText(select){
    if(!select||!select.options||!select.options.length)return '';
    const i=select.selectedIndex>=0?select.selectedIndex:0;
    return txt(select.options[i]&&select.options[i].textContent);
  }

  function setDownloadReady(ok){
    const b=document.getElementById('waterDownloadR119');
    if(!b)return;
    b.disabled=!ok;
    b.classList.toggle('disabled',!ok);
    b.classList.toggle('r119Inactive',!ok);
    b.setAttribute('aria-disabled',ok?'false':'true');
    b.style.setProperty('display','flex','important');
    b.style.setProperty('visibility','visible','important');
  }

  function applyMonths(list,source){
    const select=document.getElementById('waterExportMonthR119');
    if(!select)return false;

    const current=currentPeriodFromManage();
    list=uniqueMonths((list||[]).concat(current?[current]:[]));
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
    else if(current&&list.indexOf(current)>=0)select.value=current;

    select.disabled=false;
    select.style.setProperty('display','block','important');
    select.style.setProperty('visibility','visible','important');
    setDownloadReady(true);

    knownMonths=list.slice();
    saveCache(list);

    const status=document.getElementById('waterExportR119Status');
    if(status){
      status.textContent='Nguồn kỳ: '+(source||'FILE_CHI_SO_THANG')+' • '+list.length+' kỳ';
      status.className='ok';
    }

    window.WATER_MANAGE_MONTH_SOURCE={
      sheet:MONTH_SHEET,
      source:source||'FILE_CHI_SO_THANG',
      months:list.slice(),
      build:BUILD
    };
    return true;
  }

  function jsonpUrl(url,cbPrefix,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb=cbPrefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('timeout'));},timeoutMs||12000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        err?reject(err):resolve(data);
      }

      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('load'));};
      s.src=url.replace('__CALLBACK__',encodeURIComponent(cb));
      document.head.appendChild(s);
    });
  }

  async function loadMonthsFromBackend(){
    const url=BACKEND_URL
      +'?api=months&callback=__CALLBACK__&_='+Date.now();
    const data=await jsonpUrl(url,'__waterManageMonthsApi',15000);
    if(!data||data.ok!==true||!Array.isArray(data.months))return [];
    return uniqueMonths(data.months);
  }

  async function loadMonthsFromSheet(){
    const url='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
      +'/gviz/tq?sheet='+encodeURIComponent(MONTH_SHEET)
      +'&range='+encodeURIComponent(MONTH_RANGE)
      +'&headers=0'
      +'&tqx=responseHandler:__CALLBACK__'
      +'&tq='+encodeURIComponent('select A where A is not null')
      +'&_='+Date.now();

    const data=await jsonpUrl(url,'__waterManageMonths',12000);
    const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
    return uniqueMonths(rows.map(function(r){
      const c=r&&r.c&&r.c[0];
      return c?(c.f!=null?c.f:c.v):'';
    }));
  }

  async function loadCurrentPeriodFromBackend(){
    const url=BACKEND_URL
      +'?api=progress&callback=__CALLBACK__&_='+Date.now();
    const data=await jsonpUrl(url,'__waterManageProgress',15000);
    return data&&data.ok===true&&validPeriod(data.period)?txt(data.period):'';
  }

  async function refreshManageMonths(force){
    const select=document.getElementById('waterExportMonthR119');
    if(!select)return;
    if(loading)return;

    const current=currentPeriodFromManage();
    const cached=readCache();
    if(current)cached.push(current);

    // Hiển thị ngay kỳ hiện tại/cache, không chờ mạng.
    if(cached.length)applyMonths(cached,'KỲ HIỆN TẠI / CACHE');

    const bad=/Chưa có dữ liệu|Đang tải/i.test(optionText(select));
    if(!force&&!bad&&knownMonths.length)return;

    const now=Date.now();
    if(!force&&now-lastNetworkTry<10000)return;
    lastNetworkTry=now;
    loading=true;

    // Nguồn CHÍNH: Apps Script đọc Sheet bằng quyền server.
    // Hoạt động cả khi file Google Sheet đang để Hạn chế.
    try{
      const apiMonths=await loadMonthsFromBackend();
      if(apiMonths.length){
        applyMonths(apiMonths,'WEB APP / FILE_CHI_SO_THANG');
        return;
      }
    }catch(e){}

    // Dự phòng cho deployment cũ chưa có api=months.
    try{
      const list=await loadMonthsFromSheet();
      if(list.length){
        applyMonths(list,'FILE_CHI_SO_THANG');
        return;
      }
    }catch(e){}

    // Dự phòng cuối: ít nhất phải hiện được kỳ đang chạy.
    try{
      const p=await loadCurrentPeriodFromBackend();
      if(p){
        applyMonths(knownMonths.concat(readCache(),[p]),'WEB APP / PROGRESS');
        return;
      }
    }catch(e){}

    const fallback=uniqueMonths(knownMonths.concat(readCache(),current?[current]:[]));
    if(fallback.length)applyMonths(fallback,'KỲ HIỆN TẠI / CACHE');
  }

  function repairManageSelector(){
    const select=document.getElementById('waterExportMonthR119');
    if(!select)return;

    const t=optionText(select);
    if(/Chưa có dữ liệu|Đang tải/i.test(t)||!select.options.length){
      const current=currentPeriodFromManage();
      const fallback=uniqueMonths(knownMonths.concat(readCache(),current?[current]:[]));
      if(fallback.length)applyMonths(fallback,'KỲ HIỆN TẠI / CACHE');
      refreshManageMonths(false);
    }
  }

  function startManageWatch(){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      repairManageSelector();
      if(tries>=600)clearInterval(timer);
    },500);

    if(window.MutationObserver){
      const obs=new MutationObserver(function(){repairManageSelector();});
      obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
    }

    document.addEventListener('click',function(e){
      const t=e.target;
      if(t&&(t.id==='waterTabManage'||(t.closest&&t.closest('#waterTabManage')))){
        setTimeout(function(){refreshManageMonths(true);},80);
        setTimeout(repairManageSelector,350);
        setTimeout(repairManageSelector,1200);
      }
    },true);

    window.addEventListener('online',function(){setTimeout(function(){refreshManageMonths(true);},100);});
    window.addEventListener('pageshow',function(){setTimeout(repairManageSelector,100);});
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible')setTimeout(repairManageSelector,100);
    });

    setTimeout(repairManageSelector,300);
    setTimeout(function(){refreshManageMonths(true);},1500);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){scheduleCapture();startManageWatch();},{once:true});
  }else{
    scheduleCapture();
    startManageWatch();
  }

  window.addEventListener('pageshow',scheduleCapture,{once:true});
  window.WATER_DEFAULT_CAPTURE_BUILD=BUILD;
})();
