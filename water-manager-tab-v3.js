(function(){
'use strict';
const BUILD='water-manager-tab-v3-round-consumption-font-v4';

function installMainTabFont(){
  if(window.WATER_MAIN_TAB_FONT_INSTALLED)return;
  window.WATER_MAIN_TAB_FONT_INSTALLED=true;

  const style=document.createElement('style');
  style.id='waterMainTabFontStyle';
  style.textContent=`
    .waterUnifiedMainTabFont{
      font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
      font-weight:700!important;
      font-style:normal!important;
      letter-spacing:0!important;
      text-shadow:none!important;
      font-kerning:normal!important;
      text-rendering:auto!important;
    }
  `;
  document.head.appendChild(style);

  function label(node){
    return String(node&&node.textContent||'')
      .replace(/\s+/g,' ')
      .trim()
      .toUpperCase();
  }

  function apply(){
    document.querySelectorAll('button,[role="tab"]').forEach(function(node){
      const t=label(node);
      if(t==='DỰ ÁN'||t==='CHỤP SỐ'||t==='QUẢN LÝ'){
        node.classList.add('waterUnifiedMainTabFont');
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',apply,{once:true});
  }else{
    apply();
  }

  const root=document.documentElement;
  if(root){
    const obs=new MutationObserver(apply);
    obs.observe(root,{subtree:true,childList:true});
  }

  [50,150,400,900,1800].forEach(function(ms){setTimeout(apply,ms);});
}

installMainTabFont();

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