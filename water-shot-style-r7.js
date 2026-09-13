(function(){
  'use strict';

  const BUILD='879-final10-postcapture-r7-shot-style';
  const STYLE_ID='waterShotStyleR7';

  if(document.getElementById(STYLE_ID))return;

  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    #shotBtn:not(.waterSameMeterWarning){
      background:#e8f5e9 !important;
      color:#1b5e20 !important;
      border:2px solid #43a047 !important;
      border-radius:13px !important;
      box-shadow:0 2px 8px rgba(0,0,0,.12) !important;
    }

    #shotBtn:not(.waterSameMeterWarning):disabled{
      opacity:1 !important;
      background:#f1f8f2 !important;
      color:#2e6b35 !important;
      border-color:#7fb987 !important;
    }

    #shotBtn:not(.waterSameMeterWarning):not(:disabled){
      background:#dff3e3 !important;
      color:#145c27 !important;
      border-color:#2e8b42 !important;
      box-shadow:0 0 0 2px rgba(46,139,66,.10),0 3px 10px rgba(0,0,0,.14) !important;
    }

    #shotBtn:not(.waterSameMeterWarning) .waterShotTitle{
      color:inherit !important;
    }

    #shotBtn:not(.waterSameMeterWarning) .waterShotSub{
      color:#426449 !important;
    }
  `;
  document.head.appendChild(style);

  window.WATER_SHOT_STYLE_BUILD=BUILD;
})();
