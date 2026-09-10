const CACHE='water-v878-offline-fast2';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const page=await fetch(new Request(PAGE+'?release=878-fast2',{cache:'reload'}));
    if(!page.ok||!(await page.clone().text()).includes('<meta name="water-build" content="878-fast2">')){
      throw new Error('V8.7.8 fast2 page not published yet');
    }

    const existingQR=await caches.match(QR);
    if(existingQR)await cache.put(QR,existingQR);
    else await cache.addAll([new Request(QR,{mode:'cors',cache:'reload'})]);

    await cache.put(PAGE,page);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    // Xóa cache offline cũ của ứng dụng, không đụng IndexedDB hàng chờ ảnh.
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(k=>k.startsWith('water-v878-offline-') && k!==CACHE)
        .map(k=>caches.delete(k))
    );
    await self.clients.claim();
  })());
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
  const isPage=
    request.mode==='navigate' &&
    url.origin===self.location.origin &&
    url.pathname===new URL(PAGE).pathname;

  if(!isPage&&request.url!==QR)return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);

    // Khi online, ưu tiên lấy HTML mới để các thay đổi như danh sách nhân sự
    // có hiệu lực ngay. Nếu mạng lỗi mới dùng bản offline.
    if(isPage){
      try{
        const fresh=await fetch(new Request(request,{cache:'reload'}));
        if(fresh.ok){
          await cache.put(PAGE,fresh.clone());
          return fresh;
        }
      }catch(e){}

      const saved=await cache.match(PAGE);
      if(saved)return saved;
      return fetch(request);
    }

    const saved=await cache.match(QR);
    if(saved)return saved;

    const response=await fetch(request);
    if(response.ok)await cache.put(QR,response.clone());
    return response;
  })());
});
