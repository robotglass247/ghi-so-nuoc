importScripts('./config/project.config.js');
const CFG=self.WATER_PROJECT_CONFIG||{};
const PROJECT=String(CFG.projectId||'DEFAULT').replace(/[^A-Za-z0-9_-]/g,'_');
const VER=String(CFG.appVersion||'9.0.0');
const CACHE='water-'+PROJECT+'-'+VER;
const LOCAL=[
 './','./index.html','./assets/app.css','./config/project.config.js',
 './assets/js/00-runtime.js','./assets/js/10-ui.js','./assets/js/20-qr-camera.js',
 './assets/js/30-capture.js','./assets/js/40-staff.js','./assets/js/50-storage-sync.js',
 './assets/js/60-app.js','./assets/js/70-offline-register.js','./ack.html'
];
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(LOCAL);try{await c.add(new Request(QR,{mode:'cors'}))}catch(e){}await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('water-'+PROJECT+'-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data==='WATER_OFFLINE_STATUS'&&e.ports&&e.ports[0])e.ports[0].postMessage({ready:true,build:VER,project:PROJECT})});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);const local=u.origin===self.location.origin;if(!local&&r.url!==QR)return;e.respondWith((async()=>{const c=await caches.open(CACHE);if(r.mode==='navigate'){try{const f=await fetch(r);if(f.ok)await c.put('./index.html',f.clone());return f}catch(err){return (await c.match('./index.html'))||(await c.match('./'))}}const hit=await c.match(r);if(hit)return hit;try{const f=await fetch(r);if(f.ok)await c.put(r,f.clone());return f}catch(err){return hit}})())});
