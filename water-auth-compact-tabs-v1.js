(function(){
  'use strict';

  const BUILD='water-auth-compact-tabs-v4-balanced-mobile';

  /* =========================================================
   * GIAO DIỆN AUTH - COMPACT / CÂN ĐỐI MOBILE
   * Không thay đổi logic đăng nhập / đổi mật khẩu
   * ======================================================= */

  const style=document.createElement('style');
  style.id='waterAuthCompactTabsStyle';

  style.textContent=`

    /* ===== TOÀN MÀN HÌNH ===== */
    #waterAuthGate{
      padding:14px!important;
    }

    /* ===== KHUNG ĐĂNG NHẬP ===== */
    #waterAuthGate .wa-card{
      width:min(360px,calc(100vw - 24px))!important;
      padding:12px 14px 15px!important;
      border-radius:20px!important;
      border:1px solid #e0e6ee!important;
      box-shadow:
        0 16px 38px rgba(15,23,42,.11)!important;
    }

    /* Ẩn tiêu đề cũ của Auth V3 */
    #waterAuthGate .wa-title{
      display:none!important;
    }


    /* =====================================================
     * KHỐI TIÊU ĐỀ NỔI
     * =================================================== */

    #waterAuthGate .wa-brand-box{
      margin:-3px -3px 14px;
      padding:13px 10px 10px;

      background:
        linear-gradient(
          180deg,
          #ffffff 0%,
          #f8fbff 100%
        );

      border:1px solid #dfe7ef;
      border-radius:17px;

      box-shadow:
        0 5px 14px rgba(15,23,42,.07);
    }

    #waterAuthGate .wa-brand-title{
      margin:0 0 4px;

      text-align:center;

      font-family:Arial,sans-serif;
      font-size:17px;
      font-weight:800;
      line-height:1.2;

      color:#172033;

      letter-spacing:.05px;

      white-space:nowrap;
    }

    #waterAuthGate .wa-brand-box .wa-sub{
      margin:0!important;

      text-align:center!important;

      font-size:12px!important;
      font-weight:500!important;
      line-height:1.3!important;

      color:#65758b!important;
    }


    /* =====================================================
     * LABEL
     * =================================================== */

    #waterAuthGate label{
      display:block!important;

      margin:
        9px
        4px
        5px!important;

      font-size:12.5px!important;
      font-weight:700!important;

      color:#172033!important;
    }


    /* =====================================================
     * SELECT + INPUT
     * =================================================== */

    #waterAuthGate select,
    #waterAuthGate input{

      box-sizing:border-box!important;

      width:100%!important;
      height:42px!important;

      padding:
        0
        12px!important;

      border:
        1px solid
        #ccd6e2!important;

      border-radius:11px!important;

      background:#fff!important;

      color:#172033!important;

      font-size:15px!important;

      outline:none!important;
    }


    #waterAuthGate select:focus,
    #waterAuthGate input:focus{

      border-color:#23679d!important;

      box-shadow:
        0 0 0 3px
        rgba(35,103,157,.10)!important;
    }


    /* =====================================================
     * MẬT KHẨU + ICON MẮT
     * =================================================== */

    #waterAuthGate .wa-pass-wrap{
      position:relative!important;
    }

    #waterAuthGate .wa-pass-wrap input{
      padding-right:46px!important;
    }

    #waterAuthGate .wa-eye{

      position:absolute!important;

      top:3px!important;
      right:4px!important;

      width:36px!important;
      height:36px!important;

      padding:0!important;

      border:0!important;

      background:transparent!important;

      font-size:17px!important;

      cursor:pointer!important;
    }


    /* =====================================================
     * NÚT LƯU MẬT KHẨU
     * =================================================== */

    #waterAuthGate .wa-main{

      width:100%!important;
      height:43px!important;

      margin-top:12px!important;

      padding:0 10px!important;

      border:0!important;
      border-radius:11px!important;

      background:#23679d!important;

      color:#fff!important;

      font-size:14px!important;
      font-weight:800!important;

      cursor:pointer!important;
    }

    #waterAuthGate .wa-main:disabled{
      opacity:.55!important;
      cursor:wait!important;
    }


    /* Link cũ của Auth V3 không hiển thị */
    #waterAuthGate .wa-link{
      display:none!important;
    }


    /* =====================================================
     * THÔNG BÁO
     * =================================================== */

    #waterAuthGate .wa-msg{

      min-height:18px!important;

      margin-top:8px!important;

      text-align:center!important;

      font-size:12px!important;
      font-weight:700!important;
      line-height:1.35!important;
    }


    /* =====================================================
     * THANH ĐỔI MẬT KHẨU | ĐĂNG NHẬP
     * =================================================== */

    #waterAuthGate .wa-tabs{

      display:grid!important;

      grid-template-columns:
        minmax(0,1fr)
        minmax(0,1fr)!important;

      gap:4px!important;

      width:100%!important;

      box-sizing:border-box!important;

      margin:12px 0 0!important;

      padding:4px!important;

      background:#edf3f8!important;

      border:
        1px solid
        #dce5ee!important;

      border-radius:13px!important;

      box-shadow:
        inset 0 1px 2px
        rgba(15,23,42,.035)!important;
    }


    #waterAuthGate .wa-tab{

      display:flex!important;

      align-items:center!important;
      justify-content:center!important;

      width:100%!important;
      height:40px!important;

      min-width:0!important;

      box-sizing:border-box!important;

      margin:0!important;
      padding:0 6px!important;

      border:0!important;

      border-radius:10px!important;

      background:transparent!important;

      color:#697b91!important;

      font-family:Arial,sans-serif!important;

      font-size:13px!important;
      font-weight:800!important;
      line-height:1!important;

      text-align:center!important;

      white-space:nowrap!important;

      cursor:pointer!important;

      transition:
        background .16s ease,
        color .16s ease,
        box-shadow .16s ease!important;
    }


    #waterAuthGate .wa-tab.active{

      background:#ffffff!important;

      color:#23679d!important;

      box-shadow:
        0 1px 5px
        rgba(15,23,42,.13),
        inset 0 0 0 1px
        rgba(208,219,230,.65)!important;
    }


    /* =====================================================
     * Ở MÀN HÌNH ĐĂNG NHẬP
     * THANH TAB THAY NÚT ĐĂNG NHẬP LỚN
     * =================================================== */

    #waterAuthGate
    .wa-card.wa-mode-login
    #waterAuthLogin{

      display:none!important;
    }


    /* =====================================================
     * ĐĂNG XUẤT
     * =================================================== */

    #waterAuthLogout{

      border-radius:9px!important;

      font-size:11px!important;
    }


    /* =====================================================
     * MÀN HÌNH NHỎ
     * =================================================== */

    @media (max-width:380px){

      #waterAuthGate .wa-card{
        padding:
          11px
          12px
          14px!important;
      }

      #waterAuthGate .wa-brand-title{
        font-size:15.5px!important;
      }

      #waterAuthGate .wa-tab{
        font-size:12px!important;
      }

    }


    /* =====================================================
     * ĐIỆN THOẠI MÀN HÌNH THẤP
     * =================================================== */

    @media (max-height:700px){

      #waterAuthGate{

        align-items:flex-start!important;

        overflow-y:auto!important;

        padding-top:8px!important;

        padding-bottom:8px!important;
      }


      #waterAuthGate .wa-card{

        margin:auto!important;

        padding-top:10px!important;
      }


      #waterAuthGate .wa-brand-box{

        margin-bottom:8px!important;

        padding-top:9px!important;
        padding-bottom:7px!important;
      }


      #waterAuthGate label{

        margin-top:6px!important;
      }


      #waterAuthGate select,
      #waterAuthGate input{

        height:39px!important;
      }


      #waterAuthGate .wa-main{

        height:40px!important;

        margin-top:9px!important;
      }


      #waterAuthGate .wa-tabs{

        margin-top:9px!important;
      }


      #waterAuthGate .wa-tab{

        height:37px!important;
      }

    }

  `;

  document.head.appendChild(style);


  /* =========================================================
   * TẠO / CẬP NHẬT GIAO DIỆN
   * ======================================================= */

  function enhance(){

    const card=
      document.querySelector(
        '#waterAuthGate .wa-card'
      );

    if(!card)return;


    const isChange=
      !!card.querySelector(
        '#waterAuthSavePassword'
      );


    card.classList.toggle(
      'wa-mode-change',
      isChange
    );

    card.classList.toggle(
      'wa-mode-login',
      !isChange
    );


    /* =====================================================
     * KHỐI TIÊU ĐỀ
     * =================================================== */

    let brandBox=
      card.querySelector(
        '.wa-brand-box'
      );


    if(!brandBox){

      brandBox=
        document.createElement('div');

      brandBox.className=
        'wa-brand-box';


      const brand=
        document.createElement('div');

      brand.className=
        'wa-brand-title';

      brand.textContent=
        'ĐĂNG NHẬP APP GHI CHỈ SỐ NƯỚC';


      brandBox.appendChild(
        brand
      );


      const sub=
        card.querySelector(
          '.wa-sub'
        );


      if(sub){

        brandBox.appendChild(
          sub
        );

      }


      card.insertBefore(
        brandBox,
        card.firstChild
      );

    }else{

      /* Sau khi Auth đổi mode,
         .wa-sub được tạo lại.
         Đưa lại vào header. */

      const children=
        Array.from(
          card.children
        );


      const sub=
        children.find(
          function(node){

            return (
              node &&
              node.classList &&
              node.classList.contains(
                'wa-sub'
              )
            );

          }
        );


      if(sub){

        brandBox.appendChild(
          sub
        );

      }

    }


    /* =====================================================
     * TẠO THANH TAB
     * =================================================== */

    let tabs=
      card.querySelector(
        '.wa-tabs'
      );


    if(!tabs){

      tabs=
        document.createElement(
          'div'
        );


      tabs.className=
        'wa-tabs';


      tabs.innerHTML=`

        <button
          class="wa-tab wa-tab-change"
          type="button">
          ĐỔI MẬT KHẨU
        </button>

        <button
          class="wa-tab wa-tab-login"
          type="button">
          ĐĂNG NHẬP
        </button>

      `;


      const msg=
        card.querySelector(
          '.wa-msg'
        );


      if(msg){

        card.insertBefore(
          tabs,
          msg
        );

      }else{

        card.appendChild(
          tabs
        );

      }


      /* ===============================================
       * TAB ĐĂNG NHẬP
       * ============================================= */

      tabs
        .querySelector(
          '.wa-tab-login'
        )
        .addEventListener(
          'click',
          function(){

            const liveCard=
              document.querySelector(
                '#waterAuthGate .wa-card'
              );


            if(!liveCard)return;


            /* Nếu đang ở màn đổi mật khẩu
               thì chuyển về đăng nhập */

            const back=
              liveCard.querySelector(
                '#waterAuthBackLogin'
              );


            if(back){

              back.click();

              return;

            }


            /* Nếu đang ở màn đăng nhập
               thì thực hiện đăng nhập */

            const login=
              liveCard.querySelector(
                '#waterAuthLogin'
              );


            if(login){

              login.click();

            }

          }
        );


      /* ===============================================
       * TAB ĐỔI MẬT KHẨU
       * ============================================= */

      tabs
        .querySelector(
          '.wa-tab-change'
        )
        .addEventListener(
          'click',
          function(){

            const liveCard=
              document.querySelector(
                '#waterAuthGate .wa-card'
              );


            if(!liveCard)return;


            /* Nếu đã ở màn đổi mật khẩu
               thì không làm gì */

            if(
              liveCard.querySelector(
                '#waterAuthSavePassword'
              )
            ){

              return;

            }


            const change=
              liveCard.querySelector(
                '#waterAuthChangeMode'
              );


            if(change){

              change.click();

            }

          }
        );

    }


    /* =====================================================
     * ĐƯA TAB VỀ ĐÚNG VỊ TRÍ
     * =================================================== */

    const msg=
      card.querySelector(
        '.wa-msg'
      );


    if(
      msg &&
      tabs.nextElementSibling !== msg
    ){

      card.insertBefore(
        tabs,
        msg
      );

    }


    /* =====================================================
     * TRẠNG THÁI TAB ACTIVE
     * =================================================== */

    const loginTab=
      tabs.querySelector(
        '.wa-tab-login'
      );


    const changeTab=
      tabs.querySelector(
        '.wa-tab-change'
      );


    if(loginTab){

      loginTab.classList.toggle(
        'active',
        !isChange
      );

    }


    if(changeTab){

      changeTab.classList.toggle(
        'active',
        isChange
      );

    }

  }


  /* =========================================================
   * THEO DÕI AUTH V3 RENDER LẠI GIAO DIỆN
   * ======================================================= */

  const observer=
    new MutationObserver(
      function(){

        requestAnimationFrame(
          enhance
        );

      }
    );


  function start(){

    observer.observe(
      document.documentElement,
      {
        childList:true,
        subtree:true
      }
    );


    enhance();

  }


  if(
    document.readyState ===
    'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      start,
      {
        once:true
      }
    );

  }else{

    start();

  }


  window.WATER_AUTH_COMPACT_TABS_BUILD=
    BUILD;

})();
