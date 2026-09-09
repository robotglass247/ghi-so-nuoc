const CACHE='water-v875-offline-2';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const page=await fetch(new Request(PAGE+'?release=875-endpoint2',{cache:'reload'}));
    if(!page.ok||!(await page.clone().text()).includes('<meta name="water-build" content="875-endpoint2">'))throw new Error('V875 page not published yet');
    await cache.addAll([new Request(QR,{mode:'cors',cache:'reload'})]);
    await cache.put(PAGE,page);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
});
self.addEventListener('message',event=>{
  if(event.data!=='WATER_OFFLINE_STATUS'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const ready=!!(await cache.match(PAGE))&&!!(await cache.match(QR));
    event.ports[0].postMessage({ready});
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  const isPage=request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===new URL(PAGE).pathname;
  if(!isPage&&request.url!==QR)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const saved=await cache.match(isPage?PAGE:QR);
    if(saved)return saved;
    const response=await fetch(request);
    if(response.ok)await cache.put(isPage?PAGE:QR,response.clone());
    return response;
  })());
});
