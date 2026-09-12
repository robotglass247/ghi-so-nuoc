const CACHE='water-v9current-ERP_MAIN-901';
const APP=new URL('./index.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  try{const r=await fetch(new Request(APP,{cache:'reload'}));if(r&&r.ok)await c.put(APP,r.clone())}catch(e){}
  try{const r=await fetch(new Request(QR,{mode:'cors',cache:'reload'}));if(r&&r.ok)await c.put(QR,r.clone())}catch(e){}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.filter(k=>k.startsWith('water-v9current-ERP_MAIN-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data==='WATER_OFFLINE_STATUS'&&event.ports&&event.ports[0]){
    event.ports[0].postMessage({ready:true,build:'v9-current-901'});
  }
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  const inScope=u.origin===self.location.origin&&u.pathname.startsWith(new URL('./',self.location.href).pathname);
  if(!inScope&&req.url!==QR)return;
  event.respondWith((async()=>{
    const c=await caches.open(CACHE);
    if(req.mode==='navigate'){
      try{const f=await fetch(req);if(f&&f.ok)await c.put(APP,f.clone());return f}catch(e){return (await c.match(APP))||Response.error()}
    }
    const hit=await c.match(req);
    if(hit)return hit;
    try{const f=await fetch(req);if(f&&f.ok)await c.put(req,f.clone());return f}catch(e){return Response.error()}
  })());
});
