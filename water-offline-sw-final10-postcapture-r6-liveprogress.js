const BUILD='879-final10-postcapture-r6-liveprogress';
const CACHE='water-v879-final10-postcapture-r4';
const PAGE_R4=new URL('v87-background.html',self.location.href).href;
const APP_R4=new URL('app.html',self.location.href).href;
const NAME=new URL('water-staff-header-nameonly-r5.js',self.location.href).href;
const LIVE=new URL('water-progress-live-r6.js',self.location.href).href;

const APP_PATH=new URL(APP_R4).pathname;
const NAME_PATH=new URL(NAME).pathname;
const LIVE_PATH=new URL(LIVE).pathname;

function injectAddons(html){
  let out=String(html||'');

  if(!out.includes('water-staff-header-nameonly-r5.js')){
    out=out.replace(
      '</body>',
      '<script src="./water-staff-header-nameonly-r5.js?build='+BUILD+'"></script>\n</body>'
    );
  }

  if(!out.includes('water-progress-live-r6.js')){
    out=out.replace(
      '</body>',
      '<script src="./water-progress-live-r6.js?build='+BUILD+'"></script>\n</body>'
    );
  }

  return out;
}

async function cacheFresh(cache,url){
  try{
    const r=await fetch(new Request(url+'?build='+BUILD,{cache:'reload'}));
    if(r&&r.ok)await cache.put(url,r.clone());
  }catch(e){}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all([
      cacheFresh(cache,NAME),
      cacheFresh(cache,LIVE)
    ]);
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  const url=new URL(req.url);
  const isApp=req.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===APP_PATH;
  const isName=url.origin===self.location.origin&&url.pathname===NAME_PATH;
  const isLive=url.origin===self.location.origin&&url.pathname===LIVE_PATH;

  if(!isApp&&!isName&&!isLive)return;

  event.stopImmediatePropagation();

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);

    if(isName||isLive){
      const key=isName?NAME:LIVE;
      const saved=await cache.match(key);
      if(saved)return saved;

      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok)await cache.put(key,fresh.clone());
        return fresh;
      }catch(e){
        return Response.error();
      }
    }

    const page=await cache.match(PAGE_R4);
    if(page){
      const html=injectAddons(await page.clone().text());
      const headers=new Headers(page.headers);
      headers.set('content-type','text/html; charset=utf-8');
      return new Response(html,{
        status:page.status||200,
        statusText:page.statusText||'OK',
        headers
      });
    }

    try{return await fetch(req);}catch(e){return Response.error();}
  })());
});

self.addEventListener('message',event=>{
  if(event.data!=='WATER_LIVEPROGRESS_STATUS'||!event.ports[0])return;

  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const [page,name,live]=await Promise.all([
      cache.match(PAGE_R4),
      cache.match(NAME),
      cache.match(LIVE)
    ]);

    event.ports[0].postMessage({
      ready:!!page&&!!name&&!!live,
      build:BUILD
    });
  })());
});

importScripts('./water-offline-sw-final10-postcapture-r5-nameonly.js?v='+BUILD);
