(function(){
  'use strict';

  const BUILD='water-shot-ready-style-v1';
  if(document.getElementById('waterShotReadyStyle'))return;

  const style=document.createElement('style');
  style.id='waterShotReadyStyle';
  style.textContent=`
    /* Chỉ chỉnh hình thức nút CHỤP/SẴN SÀNG, không thay logic */
    #shotBtn:not(.waterSameMeterWarning){
      background:#eaf4ff!important;
      border:1px solid #c6d4e3!important;
      border-radius:13px!important;
      color:#111827!important;
      box-shadow:none!important;
    }

    #shotBtn:not(.waterSameMeterWarning) .waterShotTitle{
      color:#111827!important;
    }

    #shotBtn:not(.waterSameMeterWarning) .waterShotSub{
      color:#4b5563!important;
    }

    #shotBtn:not(.waterSameMeterWarning):disabled{
      opacity:1!important;
      background:#eef6ff!important;
      border-color:#d0dce8!important;
    }
  `;

  document.head.appendChild(style);
  window.WATER_SHOT_READY_STYLE_BUILD=BUILD;
})();

(function(){
  'use strict';

  function loadOnce(id,src){
    if(document.getElementById(id))return;
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    s.async=false;
    document.head.appendChild(s);
  }

  loadOnce('waterClearAllPendingRuntime','./water-clear-all-pending-v1.js?v=2');
  loadOnce('waterClearPendingActionRowRuntime','./water-clear-pending-action-row-v1.js?v=1');
})();
