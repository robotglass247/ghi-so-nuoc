/* ============================================================
MODULE_ID: 04
MODULE_NAME: month-selector
VERSION: 1.0.0
STATUS: PASS/FROZEN CANDIDATE
DEPENDENCIES: 03_manage-core-v1.js, 08_manage-status-v1.js, 03A_manage-data-card-v1.js
RESPONSIBILITY: month list only
SOURCE: R11.29 PASS logic
============================================================ */
(function(){
  'use strict';
  const core=window.WATER_MANAGE_CORE, ui=window.WATER_MANAGE_STATUS;
  if(!core||!ui)throw new Error('month-selector thiếu dependency');
  let loading=false;

  function setDownloadDisabled(disabled){
    const link=core.el('waterDownloadR118');
    if(!link)return;
    link.classList.toggle('disabled',!!disabled);
    link.setAttribute('aria-disabled',disabled?'true':'false');
  }

  function setMonths(list){
    const select=core.el('waterExportMonthR118');
    if(!select)return [];
    list=(list||[]).map(core.txt)
      .filter(function(v){return /^\d{1,2}\/\d{4}$/.test(v);})
      .filter(function(v,i,a){return a.indexOf(v)===i;})
      .sort(function(a,b){return core.periodScore(b)-core.periodScore(a);});
    select.innerHTML='';
    if(!list.length){
      const o=document.createElement('option');o.value='';o.textContent='Chọn Tháng: Chưa có dữ liệu';select.appendChild(o);setDownloadDisabled(true);return [];
    }
    list.forEach(function(v){const o=document.createElement('option');o.value=v;o.textContent='Chọn Tháng: '+v;select.appendChild(o);});
    setDownloadDisabled(false);
    try{localStorage.setItem(core.CFG.MONTH_CACHE,JSON.stringify(list));}catch(e){}
    return list;
  }

  async function loadMonths(){
    if(loading)return;
    loading=true;
    const select=core.el('waterExportMonthR118');
    if(select)select.disabled=true;
    try{
      const data=await core.jsonp('select J where J is not null');
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
      const months=rows.map(function(r){return core.txt(core.cell(r,0));}).filter(Boolean);
      setMonths(months);
      ui.clear();
    }catch(e){
      let cached=[];
      try{cached=JSON.parse(localStorage.getItem(core.CFG.MONTH_CACHE)||'[]');}catch(_e){}
      setMonths(cached);
      ui.set(cached.length?'':'Không đọc được danh sách tháng.',cached.length?'':'err');
    }finally{
      loading=false;
      if(select)select.disabled=false;
    }
  }

  function bind(){
    const select=core.el('waterExportMonthR118');
    if(!select||select.dataset.monthModuleBound==='1')return false;
    select.dataset.monthModuleBound='1';
    loadMonths();
    return true;
  }
  document.addEventListener('WATER_MANAGE_CARD_READY',bind);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  if(window.MutationObserver)new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});

  window.WATER_MANAGE_MONTH=Object.freeze({BUILD:'month-selector-v1.0.0',setMonths,loadMonths,bind});
})();
