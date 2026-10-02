(function(){
  'use strict';
  const BUILD='water-pwa-bootstrap-v1';
  const params=new URLSearchParams(location.search);
  const project=String(params.get('project')||params.get('projectId')||'').trim().toUpperCase();
  if(project){
    try{localStorage.setItem('water_pwa_project',project);}catch(e){}
  }

  try{
    if(!document.querySelector('link[rel="manifest"]')){
      const link=document.createElement('link');
      link.rel='manifest';
      link.href='./manifest.webmanifest';
      document.head.appendChild(link);
    }
  }catch(e){}

  if('serviceWorker' in navigator){
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('./sw-pwa.js',{scope:'./'}).catch(function(){});
    },{once:true});
  }

  try{
    if(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches){
      document.documentElement.classList.add('waterPwaStandalone');
    }
  }catch(e){}

  window.WATER_PWA_BOOTSTRAP_BUILD=BUILD;
})();
