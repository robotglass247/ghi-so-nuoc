(function(){
  'use strict';

  const BUILD='879-final10-postcapture-r8c-projectbar-direct';
  const BAR_ID='waterProjectBar';
  const TEXT_ID='waterProjectText';
  const CACHE_KEY='water_project_row2';

  function ensureBar(){
    let bar=document.getElementById(BAR_ID);
    if(bar)return bar;

    const app=document.getElementById('app');
    if(!app)return null;

    const style=document.createElement('style');
    style.id='waterProjectBarStyle';
    style.textContent=`
      #waterProjectBar{
        flex:0 0 auto !important;
        min-height:32px !important;
        padding:6px 10px !important;
        display:flex !important;
        align-items:center !important;
        justify-content:center !important;
        box-sizing:border-box !important;
        background:#174a7e !important;
        border-bottom:2px solid #0e3154 !important;
        color:#fff !important;
        text-align:center !important;
        font-family:Arial,sans-serif !important;
        font-size:14px !important;
        font-weight:800 !important;
        line-height:1.2 !important;
        letter-spacing:.05px !important;
        white-space:nowrap !important;
        overflow:hidden !important;
        text-overflow:ellipsis !important;
        box-shadow:0 2px 6px rgba(0,0,0,.16) !important;
        z-index:8 !important;
      }
      #waterProjectText{
        display:block !important;
        max-width:100% !important;
        overflow:hidden !important;
        text-overflow:ellipsis !important;
        white-space:nowrap !important;
      }
    `;
    document.head.appendChild(style);

    bar=document.createElement('div');
    bar.id=BAR_ID;
    bar.setAttribute('role','status');
    bar.setAttribute('aria-live','polite');

    const text=document.createElement('span');
    text.id=TEXT_ID;

    let cached='';
    try{cached=String(localStorage.getItem(CACHE_KEY)||'').trim();}catch(e){}

    text.textContent=cached||'Đang tải thông tin dự án...';
    bar.appendChild(text);

    app.insertBefore(bar,app.firstChild);
    return bar;
  }

  function setProject(value){
    const text=String(value||'').trim();
    if(!text)return false;

    ensureBar();

    const node=document.getElementById(TEXT_ID);
    if(node)node.textContent=text;

    try{localStorage.setItem(CACHE_KEY,text);}catch(e){}
    return true;
  }

  ensureBar();

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project!=='string')return;
    setProject(d.project);
  });

  window.addEventListener('pageshow',ensureBar);

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible')ensureBar();
  });

  window.WATER_PROJECT_BAR_BUILD=BUILD;
})();