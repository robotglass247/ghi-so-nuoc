(function(){
  'use strict';

  const BUILD='water-capture-compact-height-v1';

  if(document.getElementById('waterCaptureCompactHeightStyle'))return;

  const style=document.createElement('style');
  style.id='waterCaptureCompactHeightStyle';
  style.textContent=`
    /* Thu gọn riêng khu CHỤP SỐ để thanh tab dưới luôn hiển thị đủ */
    #app{
      min-height:0!important;
    }

    #app .camera{
      min-height:0!important;
    }

    #app .bottom{
      flex:0 0 auto!important;
      padding:6px 10px 5px!important;
    }

    #app #startBtn,
    #app #shotBtn{
      padding:11px 9px!important;
      font-size:17px!important;
      line-height:1.1!important;
    }

    #app .bottom .row{
      margin-top:5px!important;
      gap:8px!important;
    }

    #app .bottom .row button{
      padding:8px 6px!important;
      font-size:13px!important;
      line-height:1.1!important;
    }

    #app #syncStatus{
      margin:3px 0 0!important;
      padding:3px 2px!important;
      min-height:18px!important;
      line-height:1.15!important;
    }

    #app #appFooter{
      margin-top:0!important;
      padding-top:2px!important;
      line-height:1.1!important;
    }

    /* Điện thoại thấp: thu thêm camera một chút, vẫn đủ vùng QR + mặt số */
    @media (max-width:600px) and (max-height:820px){
      #app .camera{
        flex:1 1 auto!important;
        max-height:44vh!important;
      }

      #app .guide{
        height:min(34vh,270px)!important;
      }

      #app #progressBar{
        padding-top:5px!important;
        padding-bottom:5px!important;
      }
    }

    @media (max-width:600px) and (max-height:720px){
      #app .camera{
        max-height:40vh!important;
      }

      #app .guide{
        height:min(31vh,240px)!important;
      }

      #app .bottom{
        padding-top:5px!important;
        padding-bottom:4px!important;
      }

      #app #startBtn,
      #app #shotBtn{
        padding:9px 8px!important;
        font-size:16px!important;
      }
    }
  `;

  document.head.appendChild(style);
  window.WATER_CAPTURE_COMPACT_HEIGHT_BUILD=BUILD;
})();
