const CACHE='water-v878-offline-ui3i';
const PAGE=new URL('v87-background.html',self.location.href).href;
const APP=new URL('app.html',self.location.href).href;
const UI=new URL('water-ui3.js',self.location.href).href;
const GUIDE=new URL('water-shot-guide.js',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const BUILD='878-ui3i';
const BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

function patchPageHtml(text){
  let html=String(text||'');
  html=html.replace(/<meta name="water-build" content="[^"]*">/,'<meta name="water-build" content="'+BUILD+'">');
  html=html.replace(/const BACKEND_URL\s*=\s*"[^"]+";/,'const BACKEND_URL = "'+BACKEND+'";');
  html=html.replace(/const STAFF_CACHE_KEY='water_staff_list_v\d+';/,"const STAFF_CACHE_KEY='water_staff_list_v9';");
  html=html.replace(/<script[^>]+src=["']\.\/water-ui[12]\.js[^"']*["'][^>]*><\/script>\s*/g,'');
  html=html.replace(/<script[^>]+src=["']\.\/water-shot-guide\.js[^"']*["'][^>]*><\/script>\s*/g,'');

  const progressHtml='  <div id="progressBar" role="status" aria-live="polite">Tổng: <b id="progressTotal">----</b> · Đã chụp: <b id="progressDone">----</b> · Chưa chụp: <b id="progressLeft">----</b> · Kỳ ghi: <b id="progressPeriod">--/----</b></div>';
  if(!html.includes('id="progressBar"')){
    html=html.replace('  </div>\n\n  <div class="camera">','  </div>\n\n'+progressHtml+'\n\n  <div class="camera">');
  }

  html=html.replace('canvas,iframe{display:none}\n</style>','canvas,iframe{display:none}\n#progressBar{background:#fff;padding:8px 3px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;font-weight:700;line-height:1.25;white-space:nowrap;letter-spacing:-.35px;overflow:hidden}\n#progressBar b{font-variant-numeric:tabular-nums}\n#syncStatus{margin-top:7px;border:1px solid #ddd;border-radius:10px;background:#f7f7f7;font-weight:700;text-align:center}\n#debug{padding:3px 5px}\n#appFooter{margin-top:5px;padding-top:5px;border-top:1px solid #eee;font-size:11px;color:#666;text-align:center}\n</style>');

  html=html.replace('<div id="statusMain">GHI SỐ NƯỚC V8.7.8</div>\n      <div id="statusSub">Không cần quét QR riêng. Chụp 1 ảnh có cả đồng hồ + QR.</div>','<div id="statusMain">SẴN SÀNG CHỤP</div>\n      <div id="statusSub">Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.</div>');

  // Bỏ hoàn toàn dòng phiên bản/ghi chú nằm trên tab trạng thái.
  html=html.replace(/\s*<div[^>]*>\s*V8\.7\.8\s*·\s*Lưu ảnh tối ưu\s*<\/div>/i,'');

  if(!html.includes('id="appFooter"')){
    html=html.replace('<div id="debug">Trạng thái camera và nhân sự</div>\n  </div>','<div id="debug">Trạng thái camera và nhân sự</div>\n    <div id="appFooter">Designed by Mr.Hoa - Hotline: 0915176386</div>\n  </div>');
  }

  if(!html.includes('water-ui3.js'))html=html.replace('</body>','<script src="./water-ui3.js?build='+BUILD+'"></script>\n</body>');
  if(!html.includes('water-shot-guide.js'))html=html.replace('</body>','<script src="./water-shot-guide.js?build='+BUILD+'"></script>\n</body>');
  return html;
}

async function fetchText(url){
  const r=await fetch(new Request(url,{cache:'reload'}));
  if(!r.ok)throw new Error('HTTP '+r.status+' '+url);
  return await r.text();
}

async function cacheCurrent(){
  const cache=await caches.open(CACHE);

  const jobs=[];
  jobs.push((async()=>{
    const raw=await fetchText(PAGE+'?release='+BUILD);
    const patched=patchPageHtml(raw);
    if(!patched.includes('progressBar')||!patched.includes('water-ui3.js')||!patched.includes('water-shot-guide.js'))throw new Error('Trang vá chưa hợp lệ');
    await cache.put(PAGE,new Response(patched,{status:200,headers:{'content-type':'text/html; charset=utf-8'}}));
  })());

  jobs.push((async()=>{
    const r=await fetch(new Request(APP+'?release='+BUILD,{cache:'reload'}));
    if(r.ok)await cache.put(APP,r.clone());
  })());

  jobs.push((async()=>{
    const r=await fetch(new Request(UI+'?build='+BUILD,{cache:'reload'}));
    if(r.ok)await cache.put(UI,r.clone());
  })());

  jobs.push((async()=>{
    const r=await fetch(new Request(GUIDE+'?build='+BUILD,{cache:'reload'}));
    if(r.ok)await cache.put(GUIDE,r.clone());
  })());

  jobs.push((async()=>{
    try{
      const r=await fetch(new Request(QR,{mode:'cors',cache:'reload'}));
      if(r.ok)await cache.put(QR,r.clone());
    }catch(e){
      const old=await caches.match(QR);
      if(old)await cache.put(QR,old.clone());
    }
  })());

  await Promise.allSettled(jobs);
}

async function findAnyCachedPage(){
  const current=await caches.open(CACHE);
  const hit=await current.match(PAGE);
  if(hit)return hit;

  const keys=(await caches.keys()).filter(k=>k.startsWith('water-v878-offline-ui3')).sort().reverse();
  for(const key of keys){
    try{
      const c=await caches.open(key);
      const r=await c.match(PAGE);
      if(r)return r;
    }catch(e){}
  }
  return null;
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await cacheCurrent();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
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
    event.ports[0].postMessage({ready:!!page&&!!app&&!!ui&&!!guide,build:BUILD,qrCached:!!qr});
  })());
});

async function fetchWithTimeout(request,ms){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),ms);
  try{return await fetch(new Request(request,{cache:'no-store',signal:ctl.signal}));}
  finally{clearTimeout(timer);}
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
      try{
        const fresh=await fetchWithTimeout(request,1600);
        if(fresh&&fresh.ok){
          await cache.put(APP,fresh.clone());
          return fresh;
        }
      }catch(e){}

      // Nếu mạng không có: vào thẳng ứng dụng, không chạy launcher.
      const page=await findAnyCachedPage();
      if(page)return page;

      const savedApp=await cache.match(APP);
      if(savedApp)return savedApp;

      return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;background:#111;color:#fff;text-align:center;padding:36px 18px">Chưa có dữ liệu ứng dụng offline trên thiết bị.<br>Hãy kết nối Internet và mở lại app.html.</body>',{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
    })());
    return;
  }

  if(isPage){
    event.respondWith((async()=>{
      const cached=await findAnyCachedPage();
      if(cached)return cached;
      try{
        const fresh=await fetch(request);
        if(fresh&&fresh.ok){
          const text=patchPageHtml(await fresh.clone().text());
          const cache=await caches.open(CACHE);
          const out=new Response(text,{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
          await cache.put(PAGE,out.clone());
          return out;
        }
      }catch(e){}
      return Response.error();
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=isUI?UI:isGuide?GUIDE:QR;
    const saved=await cache.match(key) || await caches.match(key);
    if(saved)return saved;
    try{
      const fresh=await fetch(request);
      if(fresh&&fresh.ok)await cache.put(key,fresh.clone());
      return fresh;
    }catch(e){return Response.error();}
  })());
});
