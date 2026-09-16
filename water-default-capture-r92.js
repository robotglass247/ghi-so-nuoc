(function(){
  'use strict';

  const BUILD='879-final10-r9.2-default-capture-r1135-manage-source-fix';
  let applied=false;

  function openCaptureDefault(){
    if(applied)return;
    const btn=document.getElementById('waterTabCapture');
    if(!btn)return;
    applied=true;
    try{localStorage.setItem('water_active_main_tab_v1','capture');}catch(e){}
    btn.click();
  }

  function schedule(){
    setTimeout(openCaptureDefault,0);
    setTimeout(openCaptureDefault,120);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  }else{
    schedule();
  }

  window.addEventListener('pageshow',schedule,{once:true});
  window.WATER_DEFAULT_CAPTURE_BUILD=BUILD;

  /**********************************************************************
   * R11.35 HOTFIX - NGUỒN DANH SÁCH THÁNG TAB QUẢN LÝ
   *
   * Sau khi cấu trúc file quản lý thay đổi, danh sách kỳ chuẩn nằm ở:
   *   FILE_CHI_SO_THANG!J2:J
   * (tiêu đề J1 = DANH_SACH_KY).
   *
   * Module quản lý cũ vẫn có thể đang đọc TAI_CHI_SO_THANG nên trên App
   * hiện "Chọn Tháng: Chưa có dữ liệu" dù file quản lý đã có kỳ.
   * Hotfix này chỉ sửa nguồn danh sách tháng, không đụng lõi CHỤP SỐ.
   **********************************************************************/
  const MANAGE_SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const MANAGE_MONTH_SHEET='FILE_CHI_SO_THANG';
  const MANAGE_MONTH_RANGE='A1:L100';
  const MANAGE_MONTH_CACHE='water_manage_months_file_chi_so_v1';
  let manageLoading=false;
  let manageMonths=[];

  function mtxt(v){return String(v==null?'':v).trim();}
  function mcell(row,i){
    const c=row&&row.c&&row.c[i];
    return c ? (c.f!=null ? c.f : c.v) : '';
  }
  function mscore(v){
    const m=mtxt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m ? Number(m[2])*12+Number(m[1]) : 0;
  }
  function currentPeriodFromManage(){
    const nodes=[
      document.getElementById('waterManagePeriod'),
      document.getElementById('progressPeriod'),
      document.querySelector('[data-water-period]')
    ];
    for(let i=0;i<nodes.length;i++){
      const v=mtxt(nodes[i]&&nodes[i].textContent);
      if(/^\d{1,2}\/\d{4}$/.test(v))return v;
    }
    return '';
  }
  function normalizeMonths(list){
    return (list||[]).map(mtxt)
      .filter(v=>/^\d{1,2}\/\d{4}$/.test(v))
      .filter((v,i,a)=>a.indexOf(v)===i)
      .sort((a,b)=>mscore(b)-mscore(a));
  }
  function readMonthCache(){
    try{return normalizeMonths(JSON.parse(localStorage.getItem(MANAGE_MONTH_CACHE)||'[]'));}
    catch(e){return [];}
  }
  function saveMonthCache(list){
    try{localStorage.setItem(MANAGE_MONTH_CACHE,JSON.stringify(list||[]));}catch(e){}
  }
  function fileMonthJsonp(){
    return new Promise(function(resolve,reject){
      const cb='__waterFileChiSoMonths_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(()=>finish(new Error('timeout')),12000);
      function finish(err,data){
        if(done)return;done=true;clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        try{s.remove();}catch(e){}
        err?reject(err):resolve(data);
      }
      window[cb]=data=>finish(null,data);
      s.onerror=()=>finish(new Error('load'));
      s.src='https://docs.google.com/spreadsheets/d/'
        +encodeURIComponent(MANAGE_SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(MANAGE_MONTH_SHEET)
        +'&range='+encodeURIComponent(MANAGE_MONTH_RANGE)
        +'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent('select J where J is not null')
        +'&_='+Date.now();
      document.head.appendChild(s);
    });
  }
  function applyManageMonths(list,source){
    const select=document.getElementById('waterExportMonthR119');
    if(!select)return false;

    list=normalizeMonths(list);
    const current=currentPeriodFromManage();
    if(current&&!list.includes(current))list.push(current);
    list=normalizeMonths(list);
    if(!list.length)return false;

    const old=mtxt(select.value);
    select.innerHTML='';
    list.forEach(function(v){
      const o=document.createElement('option');
      o.value=v;
      o.textContent='Chọn Tháng: '+v;
      select.appendChild(o);
    });
    if(old&&list.includes(old))select.value=old;
    else if(current&&list.includes(current))select.value=current;

    select.disabled=false;
    select.style.setProperty('display','block','important');
    select.style.setProperty('visibility','visible','important');

    const download=document.getElementById('waterDownloadR119');
    if(download){
      download.disabled=false;
      download.classList.remove('disabled');
      download.classList.remove('r119Inactive');
      download.setAttribute('aria-disabled','false');
    }

    const status=document.getElementById('waterExportR119Status');
    if(status && /Chưa có dữ liệu|Không đọc được|Đang đọc dữ liệu|Đang tải/i.test(mtxt(status.textContent))){
      status.textContent='Nguồn kỳ: FILE_CHI_SO_THANG • '+list.length+' tháng';
      status.className='ok';
    }

    manageMonths=list;
    saveMonthCache(list);
    window.WATER_MANAGE_MONTH_SOURCE={sheet:MANAGE_MONTH_SHEET,source:source||'FILE_CHI_SO_THANG',months:list.slice()};
    return true;
  }
  async function refreshManageMonths(){
    if(manageLoading)return;
    const select=document.getElementById('waterExportMonthR119');
    if(!select)return;

    const visibleText=mtxt(select.options&&select.options.length ? select.options[select.selectedIndex>=0?select.selectedIndex:0].textContent : select.textContent);
    if(manageMonths.length && !/Chưa có dữ liệu|Đang tải/i.test(visibleText))return;

    manageLoading=true;
    try{
      const data=await fileMonthJsonp();
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
      const list=rows.map(r=>mtxt(mcell(r,9)));
      if(!applyManageMonths(list,'FILE_CHI_SO_THANG'))throw new Error('empty');
    }catch(e){
      const fallback=readMonthCache();
      const current=currentPeriodFromManage();
      if(current)fallback.push(current);
      applyManageMonths(fallback,'CACHE_CURRENT_PERIOD');
    }finally{
      manageLoading=false;
    }
  }

  // Module quản lý được mount khi bấm tab QUẢN LÝ, nên theo dõi nhẹ để
  // sửa ngay khi selector xuất hiện hoặc bị module cũ ghi lại "Chưa có dữ liệu".
  let manageTries=0;
  const manageTimer=setInterval(function(){
    manageTries++;
    const select=document.getElementById('waterExportMonthR119');
    if(select){
      const t=mtxt(select.options&&select.options.length ? select.options[select.selectedIndex>=0?select.selectedIndex:0].textContent : '');
      if(/Chưa có dữ liệu|Đang tải/i.test(t) || !select.options.length){
        refreshManageMonths();
      }
    }
    if(manageTries>=180)clearInterval(manageTimer);
  },1000);

  document.addEventListener('click',function(e){
    const t=e.target;
    if(t && (t.id==='waterTabManage' || (t.closest&&t.closest('#waterTabManage')))){
      setTimeout(refreshManageMonths,100);
      setTimeout(refreshManageMonths,800);
    }
  },true);
})();