const CACHE='water-v878-offline-ui3h';
const PAGE=new URL('v87-background.html',self.location.href).href;
const APP=new URL('app.html',self.location.href).href;
const UI=new URL('water-ui3.js',self.location.href).href;
const GUIDE=new URL('water-shot-guide.js',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const BUILD='878-ui3h';
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
  }else{
    html=html.replace(/\s*<div id="progressBar"[^>]*>[\s\S]*?<\/div>\s*\n\s*<div class="camera">/,'\n\n'+progressHtml+'\n\n  <div class="camera">');
  }

  html=html.replace('canvas,iframe{display:none}\n</style>','canvas,iframe{display:none}\n#progressBar{background:#fff;padding:8px 3px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;font-weight:700;line-height:1.25;white-space:nowrap;letter-spacing:-.35px;overflow:hidden}\n#progressBar b{font-variant-numeric:tabular-nums}\n#syncStatus{margin-top:7px;border:1px solid #ddd;border-radius:10px;background:#f7f7f7;font-weight:700;text-align:center}\n#debug{padding:3px 5px}\n#appFooter{margin-top:5px;padding-top:5px;border-top:1px solid #eee;font-size:11px;color:#666;text-align:center}\n</style>');

  html=html.replace('<div id="statusMain">GHI SỐ NƯỚC V8.7.8</div>\n      <div id="statusSub">Không cần quét QR riêng. Chụp 1 ảnh có cả đồng hồ + QR.</div>','<div id="statusMain">SẴN SÀNG CHỤP</div>\n      <div id="statusSub">Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.</div>');
  html=html.replace('<div style="font-size:12px;text-align:center;color:#555">V8.7.8 · Lưu ảnh tối ưu</div>','<div style="font-size:11px;text-align:center;color:#777;margin-top:6px">TRẠNG THÁI THỰC HIỆN</div>');

  if(!html.includes('id="appFooter"')){
    html=html.replace('<div id="debug">Trạng thái camera và nhân sự</div>\n  </div>','<div id="debug">Trạng thái camera và nhân sự</div>\n    <div id="appFooter">Designed by Mr.Hoa - Hotline: 0915176386</div>\n  </div>');
  }

  if(!html.includes('water-ui3.js')) html=html.replace('</body>','<script src="./water-ui3.js?build='+BUILD+'"></script>\n</body>');
  if(!html.includes('water-shot-guide.js')) html=html.replace('</body>','<script src="./water-shot-guide.js?build='+BUILD+'"></script>\n</body>');
  return html;
}

async function putText(cache,key,text,type='text/html; charset=utf-8'){
  await cache.put(key,new Response(text,{status:200,headers:{'content-type':type}}));
}

async function fetchWithTimeout(request,ms){
  const ctl=new AbortController();
  const t=setTimeout(()=>ctl.abort(),ms);
  try{return await fetch(new Request(request,{cache:'reload',signal:ctl.signal}));}
  finally{clearTimeout(t);}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);

    const raw=await fetch(new Request(PAGE+'?release='+BUILD,{cache:'reload'}));
    if(!raw.ok)throw new Error('Không tải được trang nền');
    const patched=patchPageHtml(await raw.text());
    if(!patched.includes(BUILD)||!patched.includes('progressBar')||!patched.includes('water-ui3.js')||!patched.includes('water-shot-guide.js'))throw new Error('UI3H chưa hợp lệ');
    await putText(cache,PAGE,patched);

    const app=await fetch(new Request(APP+'?install='+BUILD,{cache:'reload'}));
    if(!app.ok)throw new Error('Không tải được app.html');
    await cache.put(APP,app.clone());

    const ui=await fetch(new Request(UI+'?build='+BUILD,{cache:'reload'}));
    if(!ui.ok)throw new Error('Không tải được water-ui3.js');
    await cache.put(UI,ui.clone());

    const guide=await fetch(new Request(GUIDE+'?build='+BUILD,{cache:'reload'}));
    if(!guide.ok)throw new Error('Không tải được water-shot-guide.js');
    await cache.put(GUIDE,guide.clone());

    try{
      const qr=await fetch(new Request(QR,{mode:'cors',cache:'reload'}));
      if(qr&&qr.ok)await cache.put(QR,qr.clone());
    }catch(e){
      const old=await caches.match(QR);
      if(old)await cache.put(QR,old.clone());
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('water-v878-offline-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
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
        const fresh=await fetchWithTimeout(request,1400);
        if(fresh&&fresh.ok){await cache.put(APP,fresh.clone());return fresh;}
      }catch(e){}
      const saved=await cache.match(APP);
      if(saved)return saved;
      const page=await cache.match(PAGE);
      if(page)return page;
      return fetch(request);
    })());
    return;
  }

  if(isPage){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const saved=await cache.match(PAGE);
      if(saved)return saved;
      try{
        const fresh=await fetch(request);
        if(fresh&&fresh.ok){const text=patchPageHtml(await fresh.clone().text());await putText(cache,PAGE,text);return new Response(text,{status:200,headers:{'content-type':'text/html; charset=utf-8'}});}
        return fresh;
      }catch(e){return Response.error();}
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=isUI?UI:isGuide?GUIDE:QR;
    const saved=await cache.match(key);
    if(saved)return saved;
    const fresh=await fetch(request);
    if(fresh&&fresh.ok)await cache.put(key,fresh.clone());
    return fresh;
  })());
});
