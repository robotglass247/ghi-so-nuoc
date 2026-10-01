(function(){
  'use strict';

  const BUILD='water-auth-compact-tabs-v3-floating-header-bottom-tabs';

  const style=document.createElement('style');
  style.id='waterAuthCompactTabsStyle';
  style.textContent=`
    #waterAuthGate{padding:14px!important;}
    #waterAuthGate .wa-card{
      width:min(360px,calc(100vw - 24px))!important;
      padding:12px 12px 14px!important;
      border-radius:18px!important;
      box-shadow:0 14px 36px rgba(15,23,42,.11)!important;
    }
    #waterAuthGate .wa-title{display:none!important;}

    #waterAuthGate .wa-brand-box{
      margin:-4px -4px 10px;
      padding:11px 10px 9px;
      background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);
      border:1px solid #e2e8f0;
      border-radius:14px;
      box-shadow:0 5px 14px rgba(15,23,42,.08);
    }
    #waterAuthGate .wa-brand-title{
      margin:0 0 3px;
      text-align:center;
      font:800 17px/1.2 Arial,sans-serif;
      color:#172033;
      letter-spacing:.1px;
      white-space:nowrap;
    }
    #waterAuthGate .wa-brand-box .wa-sub{
      margin:0!important;
      font-size:11.5px!important;
      line-height:1.3!important;
      text-align:center!important;
      color:#64748b!important;
    }

    #waterAuthGate label{
      margin:8px 4px 4px!important;
      font-size:12px!important;
    }
    #waterAuthGate select,#waterAuthGate input{
      height:39px!important;
      border-radius:9px!important;
      padding:0 11px!important;
      font-size:14px!important;
    }
    #waterAuthGate .wa-eye{
      top:2px!important;
      right:3px!important;
      width:35px!important;
      height:35px!important;
      font-size:16px!important;
    }
    #waterAuthGate .wa-main{
      height:41px!important;
      margin-top:10px!important;
      border-radius:9px!important;
      font-size:14px!important;
    }
    #waterAuthGate .wa-link{display:none!important;}
    #waterAuthGate .wa-msg{
      min-height:18px!important;
      margin-top:7px!important;
      font-size:12px!important;
      line-height:1.35!important;
    }

    #waterAuthGate .wa-tabs{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:3px;
      padding:3px;
      margin:10px 4px 0;
      background:#edf3f8;
      border:1px solid #dce5ee;
      border-radius:10px;
      box-shadow:inset 0 1px 2px rgba(15,23,42,.03);
    }
    #waterAuthGate .wa-tab{
      height:34px;
      border:0;
      border-radius:8px;
      background:transparent;
      color:#64748b;
      font:800 12px Arial,sans-serif;
      cursor:pointer;
      white-space:nowrap;
    }
    #waterAuthGate .wa-tab.active{
      background:#fff;
      color:#1f5c91;
      box-shadow:0 1px 5px rgba(15,23,42,.12);
    }

    /* Ở màn hình đăng nhập, thanh tab thay luôn nút ĐĂNG NHẬP lớn */
    #waterAuthGate .wa-card.wa-mode-login #waterAuthLogin{display:none!important;}

    @media (max-width:380px){
      #waterAuthGate .wa-brand-title{font-size:15.5px!important;}
    }
    @media (max-height:680px){
      #waterAuthGate{align-items:flex-start!important;overflow:auto;padding-top:8px!important;}
      #waterAuthGate .wa-card{margin:auto!important;padding-top:10px!important;}
      #waterAuthGate .wa-brand-box{padding-top:9px!important;padding-bottom:7px!important;margin-bottom:7px!important;}
      #waterAuthGate label{margin-top:6px!important;}
      #waterAuthGate select,#waterAuthGate input{height:37px!important;}
      #waterAuthGate .wa-main{height:39px!important;margin-top:8px!important;}
      #waterAuthGate .wa-tabs{margin-top:8px!important;}
    }
  `;
  document.head.appendChild(style);

  function enhance(){
    const card=document.querySelector('#waterAuthGate .wa-card');
    if(!card)return;

    const isChange=!!card.querySelector('#waterAuthSavePassword');
    card.classList.toggle('wa-mode-change',isChange);
    card.classList.toggle('wa-mode-login',!isChange);

    let brandBox=card.querySelector('.wa-brand-box');
    if(!brandBox){
      brandBox=document.createElement('div');
      brandBox.className='wa-brand-box';

      const brand=document.createElement('div');
      brand.className='wa-brand-title';
      brand.textContent='ĐĂNG NHẬP APP GHI CHỈ SỐ NƯỚC';
      brandBox.appendChild(brand);

      const sub=card.querySelector('.wa-sub');
      if(sub)brandBox.appendChild(sub);

      card.insertBefore(brandBox,card.firstChild);
    } else {
      const sub=card.querySelector(':scope > .wa-sub');
      if(sub)brandBox.appendChild(sub);
    }

    let tabs=card.querySelector('.wa-tabs');
    if(!tabs){
      tabs=document.createElement('div');
      tabs.className='wa-tabs';
      tabs.innerHTML=`
        <button class="wa-tab wa-tab-change" type="button">ĐỔI MẬT KHẨU</button>
        <button class="wa-tab wa-tab-login" type="button">ĐĂNG NHẬP</button>`;

      const msg=card.querySelector('.wa-msg');
      if(msg)card.insertBefore(tabs,msg);
      else card.appendChild(tabs);

      tabs.querySelector('.wa-tab-login').addEventListener('click',function(){
        const liveCard=document.querySelector('#waterAuthGate .wa-card');
        if(!liveCard)return;

        const back=liveCard.querySelector('#waterAuthBackLogin');
        if(back){
          back.click();
          return;
        }

        const login=liveCard.querySelector('#waterAuthLogin');
        if(login)login.click();
      });

      tabs.querySelector('.wa-tab-change').addEventListener('click',function(){
        const liveCard=document.querySelector('#waterAuthGate .wa-card');
        if(!liveCard)return;
        const change=liveCard.querySelector('#waterAuthChangeMode');
        if(change)change.click();
      });
    }

    /* renderLoginMode/renderChangeMode thay innerHTML nên luôn đưa tabs xuống sát thông báo */
    const msg=card.querySelector('.wa-msg');
    if(msg && tabs.nextElementSibling!==msg)card.insertBefore(tabs,msg);

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
