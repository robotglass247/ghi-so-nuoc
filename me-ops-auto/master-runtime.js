(function(){
  'use strict';
  const c=window.MEOPS_PROJECT_CONFIG||{};

  function apply(){
    const product=c.projectName||'M&E OPS';
    const site=c.siteName||c.projectCode||'';
    document.title=site?product+' · '+site:product;
    const strong=document.querySelector('.brand strong');
    if(strong) strong.textContent=product;
    const small=document.querySelector('.brand small');
    if(small) small.textContent=site?(site+' · '+(c.brandSubtitle||'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT')):(c.brandSubtitle||'HỆ THỐNG QUẢN LÝ VẬN HÀNH KỸ THUẬT');
    document.documentElement.setAttribute('data-project-code',c.projectCode||'');
    document.documentElement.setAttribute('data-project-version',c.version||'');
  }

  function injectCatalogSetup(){
    try{
      if(document.querySelector('script[data-meops-catalog-setup]')) return;
      const s=document.createElement('script');
      s.src='./catalog-setup-v2.js?v=1';
      s.async=true;
      s.setAttribute('data-meops-catalog-setup','1');
      document.head.appendChild(s);
    }catch(e){
      console.error('[M&E OPS] Không nạp được Thiết lập dự án',e);
    }
  }

  function injectKpiLiveSync(){
    try{
      if(document.querySelector('script[data-meops-kpi-live-sync]')) return;
      const s=document.createElement('script');
      s.src='./kpi-live-sync-v1.js?v=1';
      s.async=true;
      s.setAttribute('data-meops-kpi-live-sync','1');
      document.head.appendChild(s);
    }catch(e){
      console.error('[M&E OPS] Không nạp được KPI Live Sync',e);
    }
  }

  function loadCatalogSetup(){
    injectCatalogSetup();
  }

  function hydrate(){
    try{
      if(!window.google||!google.script||!google.script.run){setTimeout(hydrate,350);return;}
      google.script.run.withSuccessHandler(function(x){
        const p=x&&x.project?x.project:null;
        if(p){
          if(p.projectName)c.projectName=p.projectName;
          if(p.siteName)c.siteName=p.siteName;
          if(p.projectCode)c.projectCode=p.projectCode;
          if(p.version)c.version=p.version;
          apply();
        }
      }).withFailureHandler(function(){}).getAppConfig();
    }catch(e){}
  }

  function start(){
    apply();
    setTimeout(loadCatalogSetup,250);
    setTimeout(injectKpiLiveSync,350);
    setTimeout(hydrate,650);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
