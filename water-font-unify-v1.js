(function(){
  'use strict';

  const BUILD='water-font-unify-v1-segoe';
  const STYLE_ID='waterUnifiedFontStyle';

  function install(){
    if(document.getElementById(STYLE_ID))return;

    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html,body,
      #app,
      #app button,
      #app input,
      #app select,
      #app textarea,
      #waterAuthGate,
      #waterAuthGate button,
      #waterAuthGate input,
      #waterAuthGate select,
      #waterAuthLogout,
      .modal,
      .modalIn,
      .modalIn button,
      .modalIn input,
      .modalIn select,
      #staffCompactList,
      #staffCompactList .staffCompactItem{
        font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
        font-style:normal!important;
        font-synthesis:none!important;
        text-rendering:optimizeLegibility!important;
        -webkit-font-smoothing:antialiased;
        -moz-osx-font-smoothing:grayscale;
      }

      #statusMain,
      .bottom button,
      .row button,
      #waterAuthGate .wa-brand-title,
      #waterAuthGate .wa-tab,
      .waterUnifiedMainTabFont{
        font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
        font-weight:700!important;
        font-style:normal!important;
        letter-spacing:0!important;
        text-shadow:none!important;
        font-synthesis:none!important;
      }

      #statusSub,
      #syncStatus,
      #progressBar,
      #appFooter,
      .top,
      #staffName{
        font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
        letter-spacing:0!important;
        font-style:normal!important;
        font-synthesis:none!important;
      }

      #statusSub{font-weight:600!important;}
      #statusMain{font-weight:700!important;}
      .bottom button,.row button{font-weight:700!important;}
    `;

    document.head.appendChild(style);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }

  setTimeout(install,0);
  window.WATER_FONT_UNIFY_BUILD=BUILD;
})();
