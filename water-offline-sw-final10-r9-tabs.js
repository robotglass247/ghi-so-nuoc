const BUILD='879-final10-r9-tabs';
const CACHE='water-v879-final10-postcapture-r4';

const PAGE=new URL('v87-background.html',self.location.href).href;
const APP=new URL('app.html',self.location.href).href;
const NAME=new URL('water-staff-header-nameonly-r5.js',self.location.href).href;
const LIVE=new URL('water-progress-live-r6.js',self.location.href).href;
const STYLE=new URL('water-shot-style-r7.js',self.location.href).href;
const TABS=new URL('water-top-tabs-r9.js',self.location.href).href;

const PAGE_PATH=new URL(PAGE).pathname;
const APP_PATH=new URL(APP).pathname;
const NAME_PATH=new URL(NAME).pathname;
const LIVE_PATH=new URL(LIVE).pathname;
const STYLE_PATH=new URL(STYLE).pathname;
const TABS_PATH=new URL(TABS).pathname;

function injectAddons(html){
  let out=String(html||'');

  // R9 thay projectbar cũ bằng thanh 3 tab thật.
  out=out.replace(/<script[^>]+src=["']\.\/water-project-bar-r8[abc]?\.js[^"']*["'][^>]*><\/script>\s*/gi,'');

  if(!out.includes('water-staff-header-nameonly-r5.js')){
    out=out.replace('</body>','<script src="./water-staff-header-nameonly-r5.js?build='+BUILD+'"></script>\n</body>');
  }
  if(!out.includes('water-progress-live-r6.js')){
    out=out.replace('</body>','<script src="./water-progress-live-r6.js?build='+BUILD+'"></script>\n</body>');
  }
  if(!out.includes('water-shot-style-r7.js')){
    out=out.replace('</body>','<script src="./water-shot-style-r7.js?build='+BUILD+'"></script>\n</body>');
  }
  if(!out.includes('water-top-tabs-r9.js')){
    out=out.replace('</body>','<script src="./water-top-tabs-r9.js?build='+BUILD+'"></script>\n</body>');
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
  self.skipWaiting();
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all([
      cacheFresh(cache,NAME),
      cacheFresh(cache,LIVE),
      cacheFresh(cache,STYLE),
      cacheFresh(cache,TABS)
    ]);
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{await self.clients.claim();}catch(e){}
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  const url=new URL(req.url);
  const sameOrigin=url.origin===self.location.origin;
  const isPage=req.mode==='navigate'&&sameOrigin&&url.pathname===PAGE_PATH;
  const isApp=req.mode==='navigate'&&sameOrigin&&url.pathname===APP_PATH;
  const isName=sameOrigin&&url.pathname===NAME_PATH;
  const isLive=sameOrigin&&url.pathname===LIVE_PATH;
  const isStyle=sameOrigin&&url.pathname===STYLE_PATH;
  const isTabs=sameOrigin&&url.pathname===TABS_PATH;

  if(!isPage&&!isApp&&!isName&&!isLive&&!isStyle&&!isTabs)return;
  event.stopImmediatePropagation();

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);

    if(isName||isLive||isStyle||isTabs){
      const key=isName?NAME:isLive?LIVE:isStyle?STYLE:TABS;
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

    const page=await cache.match(PAGE);
    if(page){
      const html=injectAddons(await page.clone().text());
      const headers=new Headers(page.headers);
      headers.set('content-type','text/html; charset=utf-8');
      return new Response(html,{status:page.status||200,statusText:page.statusText||'OK',headers});
    }

    try{
      const fresh=await fetch(PAGE,{cache:'reload'});
      const html=injectAddons(await fresh.clone().text());
      const headers=new Headers(fresh.headers);
      headers.set('content-type','text/html; charset=utf-8');
      return new Response(html,{status:fresh.status||200,statusText:fresh.statusText||'OK',headers});
    }catch(e){
      return Response.error();
    }
  })());
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING'){
    self.skipWaiting();
    return;
  }
  if(event.data!=='WATER_R9_TABS_STATUS'||!event.ports[0])return;

  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const [page,name,live,style,tabs]=await Promise.all([
      cache.match(PAGE),
      cache.match(NAME),
      cache.match(LIVE),
      cache.match(STYLE),
      cache.match(TABS)
    ]);
    event.ports[0].postMessage({ready:!!page&&!!name&&!!live&&!!style&&!!tabs,build:BUILD});
  })());
});

// Giữ nguyên toàn bộ lõi ổn định R7: camera, QR, offline, lưu ảnh và đồng bộ.
importScripts('./water-offline-sw-final10-postcapture-r7-shot-style.js?v='+BUILD);
