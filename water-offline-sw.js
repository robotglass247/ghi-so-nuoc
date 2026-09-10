const CACHE='water-v878-offline-fast3';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

const OLD_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
const NEW_BACKEND='https://script.google.com/macros/s/AKfycbxNEVthu3eh0hdXEJat9ReqR3MrDJJDaWKXlsoE-NN6qe1-wqJvmVTYMwI5BITOLeQ/exec';

function patchPageHtml(text){
  let html=String(text||'');

  html=html.replace(
    /<meta name="water-build" content="[^"]*">/,
    '<meta name="water-build" content="878-fast3">'
  );

  html=html.split(OLD_BACKEND).join(NEW_BACKEND);

  html=html.replace(
    "const STAFF_CACHE_KEY='water_staff_list_v1';",
    "const STAFF_CACHE_KEY='water_staff_list_v3';"
  );

  html=html.replace(
    "  {ma:'NS003',ten:'Nguyễn Ngọc Hóa'}\n];",
    "  {ma:'NS003',ten:'Nguyễn Ngọc Hóa'},\n  {ma:'NS004',ten:'Vũ Văn Tùng'}\n];"
  );

  return html;
}

function htmlResponse(response,text){
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.delete('content-length');
  return new Response(text,{
    status:response.status,
    statusText:response.statusText,
    headers
  });
}

async function fetchPatchedPage(request){
  const response=await fetch(new Request(request,{cache:'reload'}));
  if(!response.ok)return response;
  const html=patchPageHtml(await response.text());
  return htmlResponse(response,html);
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);

    const raw=await fetch(new Request(PAGE+'?release=878-fast3',{cache:'reload'}));
    if(!raw.ok)throw new Error('Không tải được trang V8.7.8');

    const patched=patchPageHtml(await raw.text());
    if(
      !patched.includes('<meta name="water-build" content="878-fast3">') ||
      !patched.includes(NEW_BACKEND) ||
      !patched.includes("{ma:'NS004',ten:'Vũ Văn Tùng'}") ||
      !patched.includes("water_staff_list_v3")
    ){
      throw new Error('Bản vá nhân sự fast3 chưa hợp lệ');
    }

    await cache.put(
      PAGE,
      new Response(patched,{
        status:200,
        headers:{'content-type':'text/html; charset=utf-8'}
      })
    );

    const existingQR=await caches.match(QR);
    if(existingQR)await cache.put(QR,existingQR);
    else await cache.addAll([new Request(QR,{mode:'cors',cache:'reload'})]);

    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
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
    const page=await cache.match(PAGE);
    const qr=await cache.match(QR);
    let ready=!!page&&!!qr;

    if(page){
      const text=await page.clone().text();
      ready=ready&&
        text.includes('878-fast3')&&
        text.includes(NEW_BACKEND)&&
        text.includes("{ma:'NS004',ten:'Vũ Văn Tùng'}");
    }

    event.ports[0].postMessage({ready,build:'878-fast3'});
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

    if(isPage){
      try{
        const fresh=await fetchPatchedPage(request);
        if(fresh.ok){
          await cache.put(PAGE,fresh.clone());
          return fresh;
        }
      }catch(e){}

      const saved=await cache.match(PAGE);
      if(saved)return saved;

      const fallback=await fetch(request);
      if(fallback.ok){
        const patched=patchPageHtml(await fallback.text());
        return htmlResponse(fallback,patched);
      }
      return fallback;
    }

    const saved=await cache.match(QR);
    if(saved)return saved;

    const response=await fetch(request);
    if(response.ok)await cache.put(QR,response.clone());
    return response;
  })());
});
