/* ============================================================
MODULE_ID: 03A
MODULE_NAME: manage-data-card
VERSION: 1.0.0
STATUS: PASS-CANDIDATE
DEPENDENCIES: 03_manage-core-v1.js
RESPONSIBILITY: DỮ LIỆU GHI CHỈ SỐ DOM + CSS only
============================================================ */
(function(){
  'use strict';
  const core=window.WATER_MANAGE_CORE;
  if(!core)throw new Error('manage-data-card thiếu manage-core');

  function ensureStyle(){
    if(core.el('waterExportR118Style'))return;
    const s=document.createElement('style');
    s.id='waterExportR118Style';
    s.textContent=`
      #waterExportR118 .r118Title{margin:0 0 10px;text-align:center;color:#18232d;font-size:15px;font-weight:900;line-height:1.2}
      #waterExportR118 .r118TopRow,#waterExportR118 .r118ActionRow{display:flex;width:100%;gap:8px;align-items:center;box-sizing:border-box}
      #waterExportR118 .r118TopRow{margin-bottom:8px}
      #waterExportR118 .r118SelectWrap{position:relative;flex:1 1 auto;min-width:0;height:38px}
      #waterExportR118 .r118SelectWrap::after{content:"▼";position:absolute;right:11px;top:50%;transform:translateY(-50%);color:#42505d;font-size:10px;pointer-events:none}
      #waterExportR118 select,#waterExportR118 .r118System,#waterExportR118 .r118Action{height:38px!important;min-height:38px!important;max-height:38px!important;margin:0!important;border:1px solid #bdc7d1;border-radius:9px;box-sizing:border-box;box-shadow:none;font-family:Arial,sans-serif;font-size:11.5px;font-weight:800}
      #waterExportR118 select{display:block;width:100%;padding:0 32px 0 10px;outline:none;appearance:none!important;-webkit-appearance:none!important;-moz-appearance:none!important;background:#f7f8fa;color:#18232d}
      #waterExportR118 .r118System{flex:0 0 34%;min-width:110px;padding:0 8px;display:flex!important;align-items:center;justify-content:center;background:#f7f8fa;color:#18232d;cursor:pointer;visibility:visible!important;pointer-events:auto!important}
      #waterExportR118 .r118Action{flex:1 1 50%;display:flex;align-items:center;justify-content:center;padding:0 8px;background:#f7f8fa;color:#18232d;text-decoration:none!important;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
      #waterExportR118 .r118Action.disabled{opacity:.5;pointer-events:none}
      #waterExportR118Status{margin:8px 0 0;min-height:14px;text-align:center;color:#465461;font-size:10.5px;font-weight:700;line-height:1.3}
      #waterExportR118Status.ok{color:#2a6942} #waterExportR118Status.err{color:#a23a2a}
      @media(max-width:360px){#waterExportR118 .r118Title{font-size:14px}#waterExportR118 .r118TopRow,#waterExportR118 .r118ActionRow{gap:6px}#waterExportR118 .r118SelectWrap,#waterExportR118 select,#waterExportR118 .r118System,#waterExportR118 .r118Action{height:36px!important;min-height:36px!important;max-height:36px!important;font-size:10.8px}#waterExportR118 .r118System{min-width:102px;flex-basis:34%}#waterExportR118Status{font-size:10px;margin-top:7px}}
    `;
    document.head.appendChild(s);
  }

  function findTarget(){
    const direct=core.el('waterManageExportPlaceholder');
    if(direct)return direct;
    const current=core.el('waterExportR118');
    if(current)return current;
    return null;
  }

  function isMounted(){
    return !!(core.el('waterExportR118')&&core.el('waterExportMonthR118')&&core.el('waterDownloadR118')&&core.el('waterViewR118')&&core.el('waterSystemFileR118'));
  }

  function mount(){
    if(isMounted())return true;
    const card=findTarget();
    if(!card)return false;
    ensureStyle();
    card.id='waterExportR118';
    card.setAttribute('data-module','manage-data-card-v1');
    card.innerHTML=`
      <div class="r118Title">DỮ LIỆU GHI CHỈ SỐ</div>
      <div class="r118TopRow">
        <div class="r118SelectWrap"><select id="waterExportMonthR118" aria-label="Chọn tháng dữ liệu"><option value="">Chọn Tháng: Đang tải...</option></select></div>
        <button id="waterSystemFileR118" class="r118System" type="button">FILE HỆ THỐNG</button>
      </div>
      <div class="r118ActionRow">
        <a id="waterDownloadR118" class="r118Action disabled" href="#" role="button" aria-disabled="true">TẢI FILE</a>
        <a id="waterViewR118" class="r118Action" href="#" role="button" aria-label="Xem chỉ số trên Google Sheet quản lý">XEM CHỈ SỐ</a>
      </div>
      <div id="waterExportR118Status"></div>`;
    document.dispatchEvent(new CustomEvent('WATER_MANAGE_CARD_READY'));
    return true;
  }

  function keepMounted(){ if(!isMounted())mount(); }
  function start(){
    if(mount())return;
    let tries=0;
    const timer=setInterval(function(){tries++;if(mount()||tries>40)clearInterval(timer);},200);
  }
  if(window.MutationObserver){
    const obs=new MutationObserver(keepMounted);
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  window.WATER_MANAGE_CARD=Object.freeze({BUILD:'manage-data-card-v1.0.0',mount,isMounted});
})();
