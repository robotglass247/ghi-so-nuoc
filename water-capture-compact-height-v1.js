(function(){
  'use strict';

  const BUILD='water-capture-compact-height-v2-frame-bottom-safe';

  if(document.getElementById('waterCaptureCompactHeightStyle'))return;

  const style=document.createElement('style');
  style.id='waterCaptureCompactHeightStyle';
  style.textContent=`
    /* =====================================================
     * CHỤP SỐ - COMPACT NHƯNG GIỮ KHUNG BO + KHOẢNG CHÂN
     * Chỉ chỉnh trình bày, không thay logic camera/chụp/sync.
     * =================================================== */

    #app{
      min-height:0!important;
      height:100%!important;
      padding-bottom:0!important;
    }

    /* Khôi phục cảm giác card/khung bo cho vùng camera */
    #app .camera{
      min-height:0!important;
      margin:8px 10px 7px!important;
      border-radius:20px!important;
      overflow:hidden!important;
      background:#000!important;
    }

    /* Giữ khung quét bo rõ, cân vào vùng camera */
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
      padding:11px 9px!important;
      font-size:17px!important;
      line-height:1.1!important;
      border-radius:16px!important;
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

    /* Tạo khoảng thở ở chân app, tránh thanh dưới/nút đăng xuất dính mép */
    body{
      padding-bottom:env(safe-area-inset-bottom, 0px)!important;
    }

    /* Điện thoại: giữ camera thấp vừa đủ để phần dưới không bị khuyết */
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

      #app #startBtn,
      #app #shotBtn{
        padding:9px 8px!important;
        font-size:16px!important;
      }

      #app .bottom .row button{
        min-height:39px!important;
        padding:8px 6px!important;
      }
    }
  `;

  document.head.appendChild(style);
  window.WATER_CAPTURE_COMPACT_HEIGHT_BUILD=BUILD;
})();
