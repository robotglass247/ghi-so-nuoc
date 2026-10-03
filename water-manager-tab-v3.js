(function(){
'use strict';
const BUILD='water-manager-tab-v3-round-consumption-v3';

function roundConsumption(v){
  if(v===null||v===undefined||v==='')return v;
  const n=typeof v==='number'?v:Number(String(v).replace(',','.'));
  return Number.isFinite(n)?Math.round(n):v;
}

function installMonthDataRounder(){
  if(window.WATER_MONTHDATA_ROUNDER_INSTALLED)return;
  window.WATER_MONTHDATA_ROUNDER_INSTALLED=true;

  const head=document.head;
  if(!head)return;
  const nativeAppend=head.appendChild.bind(head);

  head.appendChild=function(node){
    try{
      if(node&&node.tagName==='SCRIPT'&&node.src){
        const u=new URL(node.src,location.href);
        if(String(u.searchParams.get('api')||'').toLowerCase()==='monthdata'){
          const cb=String(u.searchParams.get('callback')||'');
          const original=cb&&window[cb];
          if(typeof original==='function'){
            window[cb]=function(data){
              try{
                if(data&&Array.isArray(data.rows)){
                  data.rows.forEach(function(r){
                    if(Array.isArray(r)&&r.length>6)r[6]=roundConsumption(r[6]);
                  });
                }
              }catch(e){}
              return original(data);
            };
          }
        }
      }
    }catch(e){}
    return nativeAppend(node);
  };
}

installMonthDataRounder();

function load(src,done){
  const s=document.createElement('script');
  s.src=src;
  s.async=false;
  if(done)s.onload=done;
  document.head.appendChild(s);
}
const stamp=Date.now();
load('./water-manager-bql-message-relay-v1.js?v=2&bridge='+stamp,function(){
  load('./water-manager-embed-pass-v1.js?v=1&bridge='+stamp);
});
window.WATER_MANAGER_TAB_V3_BUILD=BUILD;
})();