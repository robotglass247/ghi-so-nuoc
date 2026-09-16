/* R11.35 DEV ONLY - cache project image for offline display.
   Does not change capture, camera, QR, queue or management functions. */
(function(){
  'use strict';

  const BUILD='r1135-project-image-offline-cache-v1';
  const IMAGE_KEY='water_project_image_v1';
  const SW_MESSAGE='R1135_CACHE_PROJECT_IMAGE';
  let lastRaw='';

  function txt(v){return String(v==null?'':v).trim();}

  function driveFileId(v){
    const u=txt(v);
    let m=u.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    if(!m)m=u.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    return m&&m[1]?m[1]:'';
  }

  function imageUrls(raw){
    raw=txt(raw);
    if(!raw)return [];
    const out=[];
    const id=driveFileId(raw);
    if(id){
      out.push('https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1200');
      out.push('https://drive.google.com/uc?export=view&id='+encodeURIComponent(id));
    }else if(/^https?:\/\//i.test(raw)){
      out.push(raw);
    }
    return Array.from(new Set(out));
  }

  function postToWorker(urls){
    if(!('serviceWorker' in navigator)||!urls.length)return;
    const worker=navigator.serviceWorker.controller;
    if(worker){
      try{worker.postMessage({type:SW_MESSAGE,urls:urls});}catch(e){}
      return;
    }
    navigator.serviceWorker.ready.then(function(reg){
      const w=reg.active||reg.waiting||reg.installing;
      if(w)try{w.postMessage({type:SW_MESSAGE,urls:urls});}catch(e){}
    }).catch(function(){});
  }

  function cacheRaw(raw){
    raw=txt(raw);
    if(!raw||raw===lastRaw)return;
    lastRaw=raw;
    if(!navigator.onLine)return;
    postToWorker(imageUrls(raw));
  }

  function readSaved(){
    try{cacheRaw(localStorage.getItem(IMAGE_KEY));}catch(e){}
  }

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.projectImage==='string'&&txt(d.projectImage))cacheRaw(d.projectImage);
  });

  window.addEventListener('online',function(){lastRaw='';readSaved();});
  window.addEventListener('pageshow',readSaved);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',readSaved,{once:true});
  else readSaved();

  window.WATER_PROJECT_IMAGE_OFFLINE_CACHE_BUILD=BUILD;
})();
