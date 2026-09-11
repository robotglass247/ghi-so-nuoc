const CACHE='water-v878-offline-ui3h';
const PAGE=new URL('v87-background.html',self.location.href).href;
const APP=new URL('app.html',self.location.href).href;
const UI=new URL('water-ui3.js',self.location.href).href;
const GUIDE=new URL('water-shot-guide.js',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const BUILD='878-ui3h';

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    // Không tải mạng trong bước install. app.html sẽ chủ động seed cache.
    // Nhờ vậy Service Worker luôn có thể cài/activate kể cả khi một CDN chậm.
    await caches.open(CACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
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
    const page=await cache.match(PAGE);
    const app=await cache.match(APP);
    const ui=await cache.match(UI);
    const guide=await cache.match(GUIDE);
    const qr=await cache.match(QR);

    event.ports[0].postMessage({
      ready:!!page&&!!app&&!!ui&&!!guide,
      build:BUILD,
      qrCached:!!qr
    });
  })());
});

async function networkThenCache(request,key){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request);
    if(response&&response.ok){
      await cache.put(key,response.clone());
      return response;
    }
  }catch(e){}
  return await cache.match(key);
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  const pagePath=new URL(PAGE).pathname;
  const appPath=new URL(APP).pathname;
  const uiPath=new URL(UI).pathname;
  const guidePath=new URL(GUIDE).pathname;

  const isApp=request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===appPath;
  const isPage=request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===pagePath;
  const isUI=url.origin===self.location.origin&&url.pathname===uiPath;
  const isGuide=url.origin===self.location.origin&&url.pathname===guidePath;
  const isQR=request.url===QR;

  if(!isApp&&!isPage&&!isUI&&!isGuide&&!isQR)return;

  if(isApp){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);

      // ONLINE: ưu tiên file app.html mới nhất.
      if(self.navigator&&self.navigator.onLine){
        const fresh=await networkThenCache(request,APP);
        if(fresh)return fresh;
      }

      // OFFLINE: mở đúng app.html đã seed.
      const savedApp=await cache.match(APP);
      if(savedApp)return savedApp;

      // Fallback cuối: nếu app launcher chưa có nhưng trang ứng dụng đã cache,
      // trả thẳng trang ứng dụng thay vì báo lỗi mạng.
      const savedPage=await cache.match(PAGE);
      if(savedPage)return savedPage;

      try{return await fetch(request);}catch(e){
        return new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;background:#111;color:#fff;text-align:center;padding:35px 18px">Chưa có bản ứng dụng offline trên thiết bị.<br>Hãy kết nối Internet và mở app.html một lần.</body>',
          {status:200,headers:{'content-type':'text/html; charset=utf-8'}}
        );
      }
    })());
    return;
  }

  if(isPage){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const saved=await cache.match(PAGE);
      if(saved)return saved;
      try{return await fetch(request);}catch(e){return Response.error();}
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=isUI?UI:isGuide?GUIDE:QR;
    const saved=await cache.match(key);
    if(saved)return saved;

    try{
      const fresh=await fetch(request);
      if(fresh&&fresh.ok)await cache.put(key,fresh.clone());
      return fresh;
    }catch(e){
      return Response.error();
    }
  })());
});
