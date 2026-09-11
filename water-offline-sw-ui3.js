const CACHE='water-v879-stable1';
const APP=new URL('app.html',self.location.href).href;
const BASE=new URL('v87-background.html',self.location.href).href;
const UI=new URL('water-ui3.js',self.location.href).href;
const GUIDE=new URL('water-shot-guide.js',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const BUILD='879-stable1';

async function fetchFresh(url){
  const r=await fetch(new Request(url,{cache:'reload'}));
  if(!r||!r.ok)throw new Error('HTTP '+(r?r.status:'?')+' '+url);
  return r;
}

async function installCore(){
  const cache=await caches.open(CACHE);
  const items=[APP,BASE,UI,GUIDE];
  for(const url of items){
    const r=await fetchFresh(url+'?install='+BUILD);
    await cache.put(url,r.clone());
  }
  try{
    const qr=await fetch(new Request(QR,{mode:'cors',cache:'reload'}));
    if(qr&&qr.ok)await cache.put(QR,qr.clone());
  }catch(e){}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await installCore();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('water-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING'){
    self.skipWaiting();
    return;
  }
  if(event.data!=='WATER_OFFLINE_STATUS'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const app=await cache.match(APP);
    const base=await cache.match(BASE);
    const ui=await cache.match(UI);
    const guide=await cache.match(GUIDE);
    const qr=await cache.match(QR);
    event.ports[0].postMessage({ready:!!app&&!!base&&!!ui&&!!guide,build:BUILD,qrCached:!!qr});
  })());
});

async function networkWithTimeout(request,ms){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),ms);
  try{return await fetch(new Request(request,{cache:'no-store',signal:ctl.signal}));}
  finally{clearTimeout(timer);}
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const appPath=new URL(APP).pathname;
  const basePath=new URL(BASE).pathname;
  const uiPath=new URL(UI).pathname;
  const guidePath=new URL(GUIDE).pathname;

  const isApp=req.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===appPath;
  const isBase=url.origin===self.location.origin&&url.pathname===basePath;
  const isUI=url.origin===self.location.origin&&url.pathname===uiPath;
  const isGuide=url.origin===self.location.origin&&url.pathname===guidePath;
  const isQR=req.url===QR;
  if(!isApp&&!isBase&&!isUI&&!isGuide&&!isQR)return;

  if(isApp){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await networkWithTimeout(req,700);
        if(fresh&&fresh.ok){
          await cache.put(APP,fresh.clone());
          return fresh;
        }
      }catch(e){}
      const saved=await cache.match(APP);
      if(saved)return saved;
      return Response.error();
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=isBase?BASE:isUI?UI:isGuide?GUIDE:QR;
    const saved=await cache.match(key);
    if(saved)return saved;
    try{
      const fresh=await fetch(req);
      if(fresh&&fresh.ok)await cache.put(key,fresh.clone());
      return fresh;
    }catch(e){
      return Response.error();
    }
  })());
});
