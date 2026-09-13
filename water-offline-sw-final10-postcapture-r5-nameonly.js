const ADDON_BUILD='879-final10-postcapture-r5-nameonly';
const R4_CACHE='water-v879-final10-postcapture-r4';
const PAGE_R4=new URL('v87-background.html',self.location.href).href;
const APP_R4=new URL('app.html',self.location.href).href;
const ADDON=new URL('water-staff-header-nameonly-r5.js',self.location.href).href;
const ADDON_PATH=new URL(ADDON).pathname;
const APP_PATH=new URL(APP_R4).pathname;

function injectAddon(html){
  let out=String(html||'');
  if(out.includes('water-staff-header-nameonly-r5.js'))return out;
  return out.replace('</body>','<script src="./water-staff-header-nameonly-r5.js?build='+ADDON_BUILD+'"></script>\n</body>');
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    try{
      const cache=await caches.open(R4_CACHE);
      const r=await fetch(new Request(ADDON+'?build='+ADDON_BUILD,{cache:'reload'}));
      if(r&&r.ok)await cache.put(ADDON,r.clone());
    }catch(e){}
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  const isApp=req.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===APP_PATH;
  const isAddon=url.origin===self.location.origin&&url.pathname===ADDON_PATH;
  if(!isApp&&!isAddon)return;

  event.stopImmediatePropagation();
  event.respondWith((async()=>{
    const cache=await caches.open(R4_CACHE);

    if(isAddon){
      const saved=await cache.match(ADDON);
      if(saved)return saved;
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok)await cache.put(ADDON,fresh.clone());
        return fresh;
      }catch(e){return Response.error();}
    }

    const page=await cache.match(PAGE_R4);
    if(page){
      const html=injectAddon(await page.clone().text());
      const headers=new Headers(page.headers);
      headers.set('content-type','text/html; charset=utf-8');
      return new Response(html,{status:page.status||200,statusText:page.statusText||'OK',headers});
    }

    try{return await fetch(req);}catch(e){return Response.error();}
  })());
});

self.addEventListener('message',event=>{
  if(event.data!=='WATER_NAMEONLY_STATUS'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(R4_CACHE);
    const [page,addon]=await Promise.all([cache.match(PAGE_R4),cache.match(ADDON)]);
    event.ports[0].postMessage({ready:!!page&&!!addon,build:ADDON_BUILD});
  })());
});

importScripts('./water-offline-sw-final10-postcapture-r4.js?v='+ADDON_BUILD);
