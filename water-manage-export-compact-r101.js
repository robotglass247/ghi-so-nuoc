(function(){
  'use strict';
  const BUILD='879-r10.1-manage-export-compact';
  function apply(){
    if(document.getElementById('waterExportCompactR101Style'))return;
    const s=document.createElement('style');
    s.id='waterExportCompactR101Style';
    s.textContent=`
      #waterExportR100 .r100Title{
        margin:0 0 8px!important;
        font-size:15px!important;
        line-height:1.15!important;
      }
      #waterExportR100 .r100Row{
        grid-template-columns:minmax(0,1.65fr) minmax(92px,.85fr)!important;
        gap:8px!important;
        align-items:center!important;
      }
      #waterExportR100 select,
      #waterExportR100 button{
        height:38px!important;
        min-height:38px!important;
        border-radius:8px!important;
        font-size:12.5px!important;
        line-height:1!important;
      }
      #waterExportR100 select{
        padding:0 28px 0 10px!important;
      }
      #waterExportR100 button{
        padding:0 8px!important;
      }
      #waterExportR100Status{
        margin:7px 0 0!important;
        min-height:14px!important;
        font-size:10.5px!important;
        line-height:1.25!important;
      }
      @media(max-width:360px){
        #waterExportR100 .r100Row{
          grid-template-columns:minmax(0,1.6fr) minmax(88px,.8fr)!important;
          gap:6px!important;
        }
        #waterExportR100 select,
        #waterExportR100 button{
          height:36px!important;
          min-height:36px!important;
          font-size:11.5px!important;
        }
      }
    `;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  window.addEventListener('pageshow',apply);
  window.WATER_MANAGE_EXPORT_COMPACT_BUILD=BUILD;
})();
