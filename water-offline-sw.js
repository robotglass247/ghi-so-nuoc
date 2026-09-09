const CACHE='water-v878-offline-1';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const page=await fetch(new Request(PAGE+'?release=878-check1',{cache:'reload'}));
    if(!page.ok||!(await page.clone().text()).includes('<meta name="water-build" content="878-check1">'))throw new Error('V875 page not published yet');
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
    if(saved){
      const requested=isPage?url.searchParams.get('build'):null;
      if(!requested||(await saved.clone().text()).includes('content="'+requested+'"'))return saved;
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),3000);
      try{
        const fresh=await fetch(new Request(request,{cache:'reload',signal:controller.signal}));
        if(fresh.ok){await cache.put(PAGE,fresh.clone());return fresh;}
      }catch(e){}finally{clearTimeout(timer);}
      return saved;
    }
    const response=await fetch(request);
    if(response.ok)await cache.put(isPage?PAGE:QR,response.clone());
    return response;
  })());
});
