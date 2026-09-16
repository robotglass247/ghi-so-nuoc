const CACHE='r1135-offline-shell-dev-v2';
const PROJECT_IMAGE_CACHE='r1135-project-image-dev-v1';
const DEV_ROOT=new URL('./',self.location.href);
const APP_ROOT=new URL('../',DEV_ROOT);
const START=new URL('index.html',DEV_ROOT).href;
const PASS_LOADER=new URL('r9-direct-1135.html',APP_ROOT).href;
const BASE_PAGE=new URL('v87-background.html',APP_ROOT).href;
const PROJECT_IMAGE_HELPER=new URL('project-image-offline-cache-dev.js',DEV_ROOT).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

const ASSETS=[
  START,
  PASS_LOADER,
  BASE_PAGE,
  PROJECT_IMAGE_HELPER,
  new URL('water-final-core-pre.js',APP_ROOT).href,
  new URL('water-ui3.js',APP_ROOT).href,
  new URL('water-final-core-post.js',APP_ROOT).href,
  new URL('water-camera-fast-final6.js',APP_ROOT).href,
  new URL('water-shot-guide-final10-postcapture-r4.js',APP_ROOT).href,
  new URL('water-staff-header-nameonly-r5.js',APP_ROOT).href,
  new URL('water-progress-live-r6.js',APP_ROOT).href,
  new URL('water-top-tabs-r9.js',APP_ROOT).href,
  new URL('water-project-tab-r91.js',APP_ROOT).href,
  new URL('water-project-sheet-r93.js',APP_ROOT).href,
  new URL('water-default-capture-r92.js',APP_ROOT).href,
  QR
];

function isBasePage(url){
  return url.origin===APP_ROOT.origin && url.pathname===new URL(BASE_PAGE).pathname;
}

function patchBaseHtml(text){
  let html=String(text||'');
  // DEV shell này tự quản lý offline. Không cho lớp giao diện 3 tab đăng ký lại
  // service worker gốc ở phạm vi toàn app vì sẽ gây xung đột cache.
  html=html.replace("note.textContent='Đang chuẩn bị mở offline…';","note.style.display='none';note.textContent='';");
  html=html.replace(/\n\s*prepareOffline\(\);\s*\n/,'\n  /* offline handled by R11.35 DEV shell */\n');

  // Chỉ bổ sung lớp cache ảnh DỰ ÁN. Không sửa module DỰ ÁN PASS và không đụng CHỤP SỐ.
  if(!html.includes('project-image-offline-cache-dev.js')){
    html=html.replace('</head>','<script src="./dev-r1135-offline/project-image-offline-cache-dev.js?v=1"></script>\n</head>');
  }
  return html;
}

function htmlResponse(response,text){
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.delete('content-length');
  return new Response(text,{status:response.status,statusText:response.statusText,headers});
}

async function fetchCanonical(url){
  const req=new Request(url,{cache:'reload'});
  const res=await fetch(req);
  if(!res.ok)throw new Error('HTTP '+res.status+' '+url);
  if(isBasePage(new URL(url))){
    return htmlResponse(res,patchBaseHtml(await res.text()));
  }
  return res;
}

function isProjectImageUrl(url){
  try{
    const u=new URL(url);
    if(u.hostname!=='drive.google.com')return false;
    return u.pathname==='/thumbnail'||u.pathname==='/uc';
  }catch(e){return false;}
}

async function cacheProjectImageUrl(url){
  if(!isProjectImageUrl(url))return false;
  const cache=await caches.open(PROJECT_IMAGE_CACHE);
  try{
    const req=new Request(url,{mode:'no-cors',cache:'reload',credentials:'omit'});
    const res=await fetch(req);
    // Opaque response (status 0) vẫn cache được và dùng lại cho <img> khi offline.
    if(res&&((res.status>=200&&res.status<400)||res.type==='opaque')){
      await cache.put(url,res.clone());
      return true;
    }
  }catch(e){}
  return false;
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const url of ASSETS){
      const res=await fetchCanonical(url);
      await cache.put(url,res.clone());
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('r1135-offline-shell-dev-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  const d=event&&event.data;
  if(!d||d.type!=='R1135_CACHE_PROJECT_IMAGE'||!Array.isArray(d.urls))return;
  event.waitUntil((async()=>{
    for(const url of d.urls){
      await cacheProjectImageUrl(String(url||''));
    }
  })());
});

function canonicalFor(requestUrl){
  const u=new URL(requestUrl);
  if(u.href===QR)return QR;
  if(u.origin!==APP_ROOT.origin)return null;

  const known=ASSETS.find(x=>{
    const k=new URL(x);
    return k.origin===u.origin&&k.pathname===u.pathname;
  });
  return known||null;
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  const u=new URL(req.url);
  const inDev=u.origin===DEV_ROOT.origin&&u.pathname.startsWith(DEV_ROOT.pathname);
  const key=canonicalFor(req.url);
  const projectImage=isProjectImageUrl(req.url);
  if(!inDev&&!key&&!projectImage)return;

  event.respondWith((async()=>{
    // Ảnh dự án: giống dữ liệu đã đọc trước đó - ưu tiên bản đã tải về khi offline.
    if(projectImage){
      const cache=await caches.open(PROJECT_IMAGE_CACHE);
      const saved=await cache.match(req.url);
      if(saved)return saved;
      try{
        const network=await fetch(req);
        if(network&&((network.status>=200&&network.status<400)||network.type==='opaque')){
          await cache.put(req.url,network.clone());
        }
        return network;
      }catch(e){
        return Response.error();
      }
    }

    const cache=await caches.open(CACHE);
    const cacheKey=key||START;

    // Điều hướng DEV: ưu tiên cache để chắc chắn mở được khi mất mạng.
    if(req.mode==='navigate'&&inDev){
      const saved=await cache.match(START);
      if(saved)return saved;
      return fetch(req);
    }

    // Các file của đúng R11.35: dùng bản đã cache; không thay lõi CHỤP SỐ.
    if(key){
      const saved=await cache.match(cacheKey);
      if(saved)return saved;
      try{
        const fresh=await fetchCanonical(cacheKey);
        await cache.put(cacheKey,fresh.clone());
        return fresh;
      }catch(e){
        return Response.error();
      }
    }

    return fetch(req);
  })());
});
