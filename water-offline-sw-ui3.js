const CACHE='water-v879-core2';
const PAGE=new URL('v87-background.html',self.location.href).href;
const APP=new URL('app.html',self.location.href).href;
const UI=new URL('water-ui3.js',self.location.href).href;
const GUIDE=new URL('water-shot-guide.js',self.location.href).href;
const NET_GUARD=new URL('water-net-guard.js',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const QR_FALLBACK='https://raw.githubusercontent.com/cozmo/jsQR/master/dist/jsQR.js';
const BUILD='879-core2';
const BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

function patchPageHtml(text){
  let html=String(text||'');
  html=html.replace(/<meta name="water-build" content="[^"]*">/,'<meta name="water-build" content="'+BUILD+'">');
  html=html.replace(/const BACKEND_URL\s*=\s*"[^"]+";/,'const BACKEND_URL = "'+BACKEND+'";');
  html=html.replace(/const STAFF_CACHE_KEY='water_staff_list_v\d+';/,"const STAFF_CACHE_KEY='water_staff_list_v9';");

  html=html.replace(/<script[^>]+src=["']\.\/water-ui[123]\.js[^"']*["'][^>]*><\/script>\s*/g,'');
  html=html.replace(/<script[^>]+src=["']\.\/water-shot-guide\.js[^"']*["'][^>]*><\/script>\s*/g,'');
  html=html.replace(/<script[^>]+src=["']\.\/water-net-guard\.js[^"']*["'][^>]*><\/script>\s*/g,'');

  // Gỡ bộ đăng ký Service Worker cũ nằm trong trang lõi.
  html=html.replace(/<script>\s*\(function\(\)\{\s*const note=document\.createElement\('div'\);[\s\S]*?prepareOffline\(\);\s*\}\)\(\);\s*<\/script>\s*/,'');

  const progressHtml='  <div id="progressBar" role="status" aria-live="polite">Tổng: <b id="progressTotal">----</b> · Đã chụp: <b id="progressDone">----</b> · Chưa chụp: <b id="progressLeft">----</b> · Kỳ ghi: <b id="progressPeriod">--/----</b></div>';
  if(!html.includes('id="progressBar"')){
    html=html.replace('  </div>\n\n  <div class="camera">','  </div>\n\n'+progressHtml+'\n\n  <div class="camera">');
  }

  html=html.replace('canvas,iframe{display:none}\n</style>','canvas,iframe{display:none}\n#progressBar{background:#fff;padding:8px 3px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;font-weight:700;line-height:1.25;white-space:nowrap;letter-spacing:-.35px;overflow:hidden}\n#progressBar b{font-variant-numeric:tabular-nums}\n#syncStatus{margin-top:7px;border:1px solid #ddd;border-radius:10px;background:#f7f7f7;font-weight:700;text-align:center}\n#debug{padding:3px 5px}\n#appFooter{margin-top:5px;padding-top:5px;border-top:1px solid #eee;font-size:11px;color:#666;text-align:center}\n</style>');

  html=html.replace('<div id="statusMain">GHI SỐ NƯỚC V8.7.8</div>\n      <div id="statusSub">Không cần quét QR riêng. Chụp 1 ảnh có cả đồng hồ + QR.</div>','<div id="statusMain">SẴN SÀNG CHỤP</div>\n      <div id="statusSub">Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.</div>');
  html=html.replace(/\s*<div[^>]*>\s*V8\.7\.8\s*·\s*Lưu ảnh tối ưu\s*<\/div>/i,'');

  if(!html.includes('id="appFooter"')){
    html=html.replace('<div id="debug">Trạng thái camera và nhân sự</div>\n  </div>','<div id="debug">Trạng thái camera và nhân sự</div>\n    <div id="appFooter">Designed by Mr.Hoa - Hotline: 0915176386</div>\n  </div>');
  }

  const scripts=[
    '<script src="./water-net-guard.js?build='+BUILD+'"></script>',
    '<script src="./water-ui3.js?build='+BUILD+'"></script>',
    '<script src="./water-shot-guide.js?build='+BUILD+'"></script>'
  ].join('\n');
  html=html.replace('</body>',scripts+'\n</body>');
  return html;
}

async function fetchTimed(url,options={},ms=10000){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),ms);
  try{
    const r=await fetch(new Request(url,Object.assign({},options,{signal:ctl.signal})));
    if(!r||!r.ok)throw new Error('HTTP '+(r?r.status:'?')+' '+url);
    return r;
  }finally{
    clearTimeout(timer);
  }
}

async function getQrResponse(){
  // Ưu tiên bản đã có từ cache cũ để cập nhật không phụ thuộc CDN.
  try{
    const old=await caches.match(QR);
    if(old)return old.clone();
  }catch(e){}

  try{
    return await fetchTimed(QR,{mode:'cors',cache:'reload'},7000);
  }catch(e1){
    // Nếu jsDelivr lỗi, lấy cùng jsQR 1.4.0 từ GitHub chính chủ.
    return await fetchTimed(QR_FALLBACK,{mode:'cors',cache:'reload'},10000);
  }
}

async function installCore(){
  const cache=await caches.open(CACHE);

  const raw=await (await fetchTimed(PAGE+'?release='+BUILD,{cache:'reload'},10000)).text();
  const patched=patchPageHtml(raw);
  if(!patched.includes('water-net-guard.js')||!patched.includes('water-ui3.js')||!patched.includes('water-shot-guide.js')){
    throw new Error('Trang ứng dụng chưa vá đủ tài nguyên');
  }

  const [app,ui,guide,guard,qr]=await Promise.all([
    fetchTimed(APP+'?release='+BUILD,{cache:'reload'},10000),
    fetchTimed(UI+'?build='+BUILD,{cache:'reload'},10000),
    fetchTimed(GUIDE+'?build='+BUILD,{cache:'reload'},10000),
    fetchTimed(NET_GUARD+'?build='+BUILD,{cache:'reload'},10000),
    getQrResponse()
  ]);

  await Promise.all([
    cache.put(PAGE,new Response(patched,{status:200,headers:{'content-type':'text/html; charset=utf-8'}})),
    cache.put(APP,app.clone()),
    cache.put(UI,ui.clone()),
    cache.put(GUIDE,guide.clone()),
    cache.put(NET_GUARD,guard.clone()),
    cache.put(QR,qr.clone())
  ]);
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    // Chỉ activate khi TOÀN BỘ bộ Offline mới đã lưu thành công.
    // Nếu lỗi, worker cũ + cache cũ vẫn còn nguyên.
    await installCore();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    // Chỉ xóa cache cũ SAU KHI core2 đã cài thành công.
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('water-')&&k!==CACHE).map(k=>caches.delete(k)));
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
    const checks={
      page:!!(await cache.match(PAGE)),
      app:!!(await cache.match(APP)),
      ui:!!(await cache.match(UI)),
      guide:!!(await cache.match(GUIDE)),
      guard:!!(await cache.match(NET_GUARD)),
      qr:!!(await cache.match(QR))
    };
    const missing=Object.keys(checks).filter(k=>!checks[k]);
    event.ports[0].postMessage({
      ready:missing.length===0,
      build:BUILD,
      qrCached:checks.qr,
      missing
    });
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  const url=new URL(req.url);
  const pagePath=new URL(PAGE).pathname;
  const appPath=new URL(APP).pathname;
  const uiPath=new URL(UI).pathname;
  const guidePath=new URL(GUIDE).pathname;
  const guardPath=new URL(NET_GUARD).pathname;

  const isApp=req.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===appPath;
  const isPage=req.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===pagePath;
  const isUI=url.origin===self.location.origin&&url.pathname===uiPath;
  const isGuide=url.origin===self.location.origin&&url.pathname===guidePath;
  const isGuard=url.origin===self.location.origin&&url.pathname===guardPath;
  const isQR=req.url===QR;
  if(!isApp&&!isPage&&!isUI&&!isGuide&&!isGuard&&!isQR)return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=isApp?APP:isPage?PAGE:isUI?UI:isGuide?GUIDE:isGuard?NET_GUARD:isQR?QR:null;
    if(key){
      const saved=await cache.match(key);
      if(saved)return saved;
    }

    try{
      const fresh=await fetch(req);
      if(fresh&&fresh.ok&&key)await cache.put(key,fresh.clone());
      return fresh;
    }catch(e){
      return Response.error();
    }
  })());
});
