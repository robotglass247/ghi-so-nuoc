/* R11.35 DEV ONLY - cache project image for offline display.
   Does not change capture, camera, QR, queue or management functions. */
(function(){
  'use strict';

  const BUILD='r1135-project-image-offline-cache-v2';
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

  function warmBrowserImage(url){
    try{
      const img=new Image();
      img.decoding='async';
      img.loading='eager';
      img.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px';
      img.onload=img.onerror=function(){try{img.remove();}catch(e){}};
      document.documentElement.appendChild(img);
      img.src=url;
    }catch(e){}
  }

  function postToWorker(urls){
    if(!('serviceWorker' in navigator)||!urls.length)return;
    const send=function(worker){
      if(!worker)return;
      try{worker.postMessage({type:SW_MESSAGE,urls:urls});}catch(e){}
    };
    if(navigator.serviceWorker.controller){
      send(navigator.serviceWorker.controller);
    }else{
      navigator.serviceWorker.ready.then(function(reg){
        send(reg.active||reg.waiting||reg.installing);
      }).catch(function(){});
    }
  }

  function cacheRaw(raw){
    raw=txt(raw);
    if(!raw||raw===lastRaw)return;
    lastRaw=raw;
    if(!navigator.onLine)return;
    const urls=imageUrls(raw);
    if(!urls.length)return;

    // Hai đường đảm bảo ảnh thật sự được tải ngay trong lần chạy online đầu tiên:
    // 1) yêu cầu Service Worker tải và lưu;
    // 2) tạo ảnh ẩn để phát sinh request trình duyệt thực tế qua Service Worker.
    postToWorker(urls);
    urls.forEach(warmBrowserImage);
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
  setTimeout(readSaved,600);
  setTimeout(function(){lastRaw='';readSaved();},2200);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',readSaved,{once:true});
  else readSaved();

  window.WATER_PROJECT_IMAGE_OFFLINE_CACHE_BUILD=BUILD;
})();
