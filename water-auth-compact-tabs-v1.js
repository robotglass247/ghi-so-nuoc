(function(){
  'use strict';

  const BUILD='water-auth-compact-tabs-v1';

  const style=document.createElement('style');
  style.id='waterAuthCompactTabsStyle';
  style.textContent=`
    #waterAuthGate{padding:14px!important;}
    #waterAuthGate .wa-card{
      width:min(360px,calc(100vw - 24px))!important;
      padding:18px 18px 16px!important;
      border-radius:18px!important;
      box-shadow:0 14px 36px rgba(15,23,42,.11)!important;
    }
    #waterAuthGate .wa-title{display:none!important;}
    #waterAuthGate .wa-sub{
      margin:8px 0 12px!important;
      font-size:12.5px!important;
    }
    #waterAuthGate label{
      margin:9px 0 5px!important;
      font-size:12.5px!important;
    }
    #waterAuthGate select,#waterAuthGate input{
      height:42px!important;
      border-radius:10px!important;
      padding:0 11px!important;
      font-size:15px!important;
    }
    #waterAuthGate .wa-eye{
      top:3px!important;
      right:4px!important;
      width:36px!important;
      height:36px!important;
      font-size:17px!important;
    }
    #waterAuthGate .wa-main{
      height:44px!important;
      margin-top:12px!important;
      border-radius:10px!important;
      font-size:15px!important;
    }
    #waterAuthGate .wa-link{display:none!important;}
    #waterAuthGate .wa-msg{
      min-height:18px!important;
      margin-top:8px!important;
      font-size:12.5px!important;
      line-height:1.35!important;
    }
    #waterAuthGate .wa-tabs{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:4px;
      padding:4px;
      margin:0;
      background:#eef3f8;
      border:1px solid #dde5ee;
      border-radius:12px;
    }
    #waterAuthGate .wa-tab{
      height:38px;
      border:0;
      border-radius:9px;
      background:transparent;
      color:#64748b;
      font:700 13px Arial,sans-serif;
      cursor:pointer;
      white-space:nowrap;
    }
    #waterAuthGate .wa-tab.active{
      background:#fff;
      color:#1f5c91;
      box-shadow:0 1px 5px rgba(15,23,42,.10);
    }
    @media (max-height:680px){
      #waterAuthGate{align-items:flex-start!important;overflow:auto;padding-top:10px!important;}
      #waterAuthGate .wa-card{margin:auto!important;padding-top:14px!important;}
      #waterAuthGate .wa-sub{margin-bottom:8px!important;}
      #waterAuthGate label{margin-top:7px!important;}
      #waterAuthGate select,#waterAuthGate input{height:40px!important;}
      #waterAuthGate .wa-main{height:42px!important;margin-top:10px!important;}
    }
  `;
  document.head.appendChild(style);

  function enhance(){
    const card=document.querySelector('#waterAuthGate .wa-card');
    if(!card)return;

    const isChange=!!card.querySelector('#waterAuthSavePassword');
    let tabs=card.querySelector('.wa-tabs');

    if(!tabs){
      tabs=document.createElement('div');
      tabs.className='wa-tabs';
      tabs.innerHTML=`
        <button class="wa-tab wa-tab-login" type="button">Đăng nhập</button>
        <button class="wa-tab wa-tab-change" type="button">Đổi mật khẩu</button>`;
      card.insertBefore(tabs,card.firstChild);

      tabs.querySelector('.wa-tab-login').addEventListener('click',function(){
        const back=card.querySelector('#waterAuthBackLogin');
        if(back)back.click();
      });

      tabs.querySelector('.wa-tab-change').addEventListener('click',function(){
        const change=card.querySelector('#waterAuthChangeMode');
        if(change)change.click();
      });
    }

    const loginTab=tabs.querySelector('.wa-tab-login');
    const changeTab=tabs.querySelector('.wa-tab-change');
    if(loginTab)loginTab.classList.toggle('active',!isChange);
    if(changeTab)changeTab.classList.toggle('active',isChange);
  }

  const observer=new MutationObserver(function(){
    requestAnimationFrame(enhance);
  });

  function start(){
    observer.observe(document.documentElement,{childList:true,subtree:true});
    enhance();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.WATER_AUTH_COMPACT_TABS_BUILD=BUILD;
})();
