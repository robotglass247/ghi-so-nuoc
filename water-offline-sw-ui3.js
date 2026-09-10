const CACHE='water-v878-offline-ui3e';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const UI=new URL('water-ui3.js',self.location.href).href;
const GUIDE=new URL('water-shot-guide.js',self.location.href).href;
const BUILD='878-ui3e';
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

function htmlResponse(response,text){
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.delete('content-length');
  return new Response(text,{status:response.status,statusText:response.statusText,headers});
}

async function fetchPatchedPage(request){
  const response=await fetch(new Request(request,{cache:'reload'}));
  if(!response.ok)return response;
  return htmlResponse(response,patchPageHtml(await response.text()));
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const raw=await fetch(new Request(PAGE+'?release='+BUILD,{cache:'reload'}));
    if(!raw.ok)throw new Error('Không tải được trang V8.7.8');
    const patched=patchPageHtml(await raw.text());
    if(!patched.includes(BUILD)||!patched.includes('progressBar')||!patched.includes('progressPeriod')||!patched.includes('water-ui3.js')||!patched.includes('water-shot-guide.js')||!patched.includes(BACKEND))throw new Error('Bản UI3E chưa hợp lệ');
    await cache.put(PAGE,new Response(patched,{status:200,headers:{'content-type':'text/html; charset=utf-8'}}));

    const ui=await fetch(new Request(UI+'?build='+BUILD,{cache:'reload'}));
    if(!ui.ok)throw new Error('Không tải được water-ui3.js');
    await cache.put(UI,ui.clone());

    const guide=await fetch(new Request(GUIDE+'?build='+BUILD,{cache:'reload'}));
    if(!guide.ok)throw new Error('Không tải được water-shot-guide.js');
    await cache.put(GUIDE,guide.clone());

    const oldQR=await caches.match(QR);
    if(oldQR)await cache.put(QR,oldQR); else await cache.add(new Request(QR,{mode:'cors',cache:'reload'}));
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
  if(event.data==='SKIP_WAITING'){self.skipWaiting();return;}
  if(event.data!=='WATER_OFFLINE_STATUS'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const page=await cache.match(PAGE),ui=await cache.match(UI),guide=await cache.match(GUIDE),qr=await cache.match(QR);
    let ready=!!page&&!!ui&&!!guide&&!!qr;
    if(page){const text=await page.clone().text();ready=ready&&text.includes(BUILD)&&text.includes('water-ui3.js')&&text.includes('water-shot-guide.js')&&text.includes('progressBar')&&text.includes('progressPeriod');}
    event.ports[0].postMessage({ready,build:BUILD});
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url),pagePath=new URL(PAGE).pathname,uiPath=new URL(UI).pathname,guidePath=new URL(GUIDE).pathname;
  const isPage=request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===pagePath;
  const isUI=url.origin===self.location.origin&&url.pathname===uiPath;
  const isGuide=url.origin===self.location.origin&&url.pathname===guidePath;
  if(!isPage&&!isUI&&!isGuide&&request.url!==QR)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(isPage){
      try{const fresh=await fetchPatchedPage(request);if(fresh.ok){await cache.put(PAGE,fresh.clone());return fresh;}}catch(e){}
      const saved=await cache.match(PAGE);if(saved)return saved;
      const fallback=await fetch(request);if(fallback.ok)return htmlResponse(fallback,patchPageHtml(await fallback.text()));return fallback;
    }
    if(isUI||isGuide){
      const target=isUI?UI:GUIDE;
      try{const fresh=await fetch(new Request(request,{cache:'reload'}));if(fresh.ok){await cache.put(target,fresh.clone());return fresh;}}catch(e){}
      const saved=await cache.match(target);if(saved)return saved;return fetch(request);
    }
    const saved=await cache.match(QR);if(saved)return saved;
    const response=await fetch(request);if(response.ok)await cache.put(QR,response.clone());return response;
  })());
});
