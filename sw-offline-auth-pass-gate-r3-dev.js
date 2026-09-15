/* OFFLINE DEV R3 — OFFLINE V2 shell + exclusive PASS AUTH system-file gate */
const CACHE='water-offline-auth-pass-gate-r3-dev-v1';
const APP_SHELL=[
  './r9-offline-auth-pass-gate-r3-dev.html',
  './v87-background.html?release=878-fast6&authpassgate=3',
  './frozen-v1-water-final-core-pre.js',
  './frozen-v1-water-ui3.js',
  './frozen-v1-water-final-core-post.js',
  './frozen-v1-water-camera-fast-final6.js',
  './frozen-v1-water-shot-guide-final10-postcapture-r4.js',
  './frozen-v1-water-staff-header-nameonly-r5.js',
  './frozen-v1-water-progress-live-r6.js',
  './frozen-v1-water-top-tabs-r9.js',
  './frozen-v1-water-project-tab-r91.js',
  './frozen-v1-water-project-sheet-r93.js',
  './frozen-v1-water-manage-layout.js',
  './03_manage-core-v1.js',
  './08_manage-status-v1.js',
  './03A_manage-data-card-v1.js',
  './04_month-selector-v1.js',
  './05_download-xlsx-v1.js',
  './06_view-sheet-v1.js',
  './09_auth-systemfile-gate-pass-r3-dev.js',
  './09_auth-sheets-config-prod.js',
  './09_auth-sheets-v1.js',
  './09_auth-unregistered-ux-v2.js',
  './frozen-v1-water-default-capture-r92.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    for(const url of APP_SHELL){
      try{
        const req=new Request(url,{cache:'reload'});
        const res=await fetch(req);
        if(res && (res.ok || res.type==='opaque')) await c.put(req,res.clone());
      }catch(e){}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('water-offline-auth-pass-gate-r3-dev-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

function isSameOrigin(url){
  try{return new URL(url).origin===self.location.origin;}catch(e){return false;}
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        const c=await caches.open(CACHE);
        c.put(new Request('./r9-offline-auth-pass-gate-r3-dev.html'),fresh.clone()).catch(()=>{});
        return fresh;
      }catch(e){
        return (await caches.match('./r9-offline-auth-pass-gate-r3-dev.html',{ignoreSearch:true})) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const same=isSameOrigin(req.url);
    const cached=await caches.match(req,{ignoreSearch:same});
    if(cached) return cached;
    try{
      const fresh=await fetch(req);
      if(fresh && (fresh.ok || fresh.type==='opaque')){
        const c=await caches.open(CACHE);
        c.put(req,fresh.clone()).catch(()=>{});
      }
      return fresh;
    }catch(e){
      return cached || Response.error();
    }
  })());
});