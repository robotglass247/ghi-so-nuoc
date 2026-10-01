(function(){
  'use strict';

  const BUILD='water-capture-compact-height-v3-ready-blue-logout-full';

  if(document.getElementById('waterCaptureCompactHeightStyle'))return;

  const style=document.createElement('style');
  style.id='waterCaptureCompactHeightStyle';
  style.textContent=`
    /* =====================================================
     * CHỤP SỐ - COMPACT + KHUNG BO + READY CARD + LOGOUT FULL
     * Chỉ chỉnh trình bày, không thay logic camera/chụp/sync/auth.
     * =================================================== */

    #app{
      min-height:0!important;
      height:100%!important;
      padding-bottom:0!important;
    }

    /* Vùng camera bo ngoài */
    #app .camera{
      min-height:0!important;
      margin:8px 10px 7px!important;
      border-radius:20px!important;
      overflow:hidden!important;
      background:#000!important;
    }

    /* Khung quét trắng */
    #app .guide{
      border-radius:20px!important;
      border-width:2px!important;
      box-sizing:border-box!important;
    }

    /* Khối thao tác dưới camera */
    #app .bottom{
      flex:0 0 auto!important;
      padding:7px 10px calc(12px + env(safe-area-inset-bottom, 0px))!important;
      background:#fff!important;
    }

    #app #startBtn,
    #app #shotBtn{
      font-size:17px!important;
      line-height:1.1!important;
      border-radius:16px!important;
    }

    /* SẴN SÀNG CHỤP: thấp hơn, có viền và nền xanh nhạt */
    #app #shotBtn:not(.waterSameMeterWarning){
      min-height:62px!important;
      padding:8px 10px!important;
      border:2px solid #c9d9e8!important;
      border-radius:16px!important;
      background:#eaf4ff!important;
      color:#111!important;
      box-shadow:none!important;
    }

    #app #shotBtn:not(.waterSameMeterWarning) .waterShotTitle{
      color:#111!important;
      font-size:18px!important;
      line-height:1.08!important;
    }

    #app #shotBtn:not(.waterSameMeterWarning) .waterShotSub{
      color:#56616f!important;
      font-size:13px!important;
      line-height:1.15!important;
      margin-top:2px!important;
    }

    #app .bottom .row{
      margin-top:7px!important;
      gap:8px!important;
    }

    #app .bottom .row button{
      min-height:42px!important;
      padding:9px 6px!important;
      font-size:13px!important;
      line-height:1.1!important;
      border-radius:14px!important;
    }

    #app #syncStatus{
      margin:5px 0 0!important;
      padding:4px 3px!important;
      min-height:20px!important;
      line-height:1.18!important;
      border-radius:10px!important;
    }

    #app #debug{
      margin-top:4px!important;
      min-height:14px!important;
      line-height:1.15!important;
    }

    #app #appFooter{
      margin-top:3px!important;
      padding:4px 0 2px!important;
      line-height:1.15!important;
    }

    /* ĐĂNG XUẤT: full ngang, lề đều hai bên */
    #waterAuthLogout{
      position:fixed!important;
      left:10px!important;
      right:10px!important;
      bottom:calc(8px + env(safe-area-inset-bottom, 0px))!important;
      width:auto!important;
      max-width:none!important;
      min-height:48px!important;
      margin:0!important;
      padding:9px 12px!important;
      border:1.5px solid #cfd8e3!important;
      border-radius:14px!important;
      background:#fff!important;
      color:#4b5563!important;
      font-family:Arial,sans-serif!important;
      font-size:16px!important;
      font-weight:800!important;
      line-height:1.1!important;
      text-align:center!important;
      box-shadow:0 2px 8px rgba(0,0,0,.08)!important;
      z-index:999999!important;
    }

    body{
      padding-bottom:env(safe-area-inset-bottom, 0px)!important;
    }

    /* Điện thoại */
    @media (max-width:600px){
      #app .camera{
        flex:1 1 auto!important;
        max-height:46vh!important;
      }

      #app .guide{
        width:min(82vw,460px)!important;
        height:min(34vh,270px)!important;
      }
    }

    @media (max-width:600px) and (max-height:820px){
      #app .camera{
        max-height:43vh!important;
        margin-top:7px!important;
        margin-bottom:6px!important;
      }

      #app .guide{
        height:min(32vh,255px)!important;
      }

      #app #progressBar{
        padding-top:5px!important;
        padding-bottom:5px!important;
      }

      #app .bottom{
        padding-top:6px!important;
      }

      #app #shotBtn:not(.waterSameMeterWarning){
        min-height:58px!important;
        padding:7px 9px!important;
      }
    }

    @media (max-width:600px) and (max-height:720px){
      #app .camera{
        max-height:39vh!important;
        margin-left:8px!important;
        margin-right:8px!important;
        border-radius:18px!important;
      }

      #app .guide{
        height:min(29vh,230px)!important;
        border-radius:18px!important;
      }

      #app .bottom{
        padding-top:5px!important;
        padding-bottom:calc(10px + env(safe-area-inset-bottom, 0px))!important;
      }

      #app #shotBtn:not(.waterSameMeterWarning){
        min-height:54px!important;
        padding:6px 8px!important;
      }

      #app #shotBtn:not(.waterSameMeterWarning) .waterShotTitle{
        font-size:17px!important;
      }

      #app .bottom .row button{
        min-height:39px!important;
        padding:8px 6px!important;
      }

      #waterAuthLogout{
        left:8px!important;
        right:8px!important;
        min-height:46px!important;
        font-size:15px!important;
      }
    }
  `;

  document.head.appendChild(style);
  window.WATER_CAPTURE_COMPACT_HEIGHT_BUILD=BUILD;
})();
