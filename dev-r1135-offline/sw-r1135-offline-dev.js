const CACHE='r1135-offline-shell-dev-v4';
const PROJECT_IMAGE_CACHE='r1135-project-image-dev-v2';
const DEV_ROOT=new URL('./',self.location.href);
const APP_ROOT=new URL('../',DEV_ROOT);
const START=new URL('index.html',DEV_ROOT).href;
const PASS_LOADER=new URL('r9-direct-1135.html',APP_ROOT).href;
const BASE_PAGE=new URL('v87-background.html',APP_ROOT).href;
const PROJECT_IMAGE_HELPER=new URL('project-image-offline-cache-dev.js',DEV_ROOT).href;
const MANAGE_VIEW_HELPER=new URL('manage-view-offline-lock-dev.js',DEV_ROOT).href;
const MANAGE_UNIFIED_HELPER=new URL('manage-unified-data-v1.js',DEV_ROOT).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

const ASSETS=[
  START,
  PASS_LOADER,
  BASE_PAGE,
  PROJECT_IMAGE_HELPER,
  MANAGE_VIEW_HELPER,
  MANAGE_UNIFIED_HELPER,
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
  html=html.replace("note.textContent='Đang chuẩn bị mở offline…';","note.style.display='none';note.textContent='';");
  html=html.replace(/\n\s*prepareOffline\(\);\s*\n/,'\n  /* offline handled by R11.35 DEV shell */\n');
  if(!html.includes('project-image-offline-cache-dev.js')){
    html=html.replace('</head>','<script src="./dev-r1135-offline/project-image-offline-cache-dev.js?v=2"></script>\n</head>');
  }
  if(!html.includes('manage-view-offline-lock-dev.js')){
    html=html.replace('</head>','<script src="./dev-r1135-offline/manage-view-offline-lock-dev.js?v=1"></script>\n</head>');
  }
  if(!html.includes('manage-unified-data-v1.js')){
    html=html.replace('</head>','<script src="./dev-r1135-offline/manage-unified-data-v1.js?v=1"></script>\n</head>');
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

function projectImageId(url){
  try{
    const u=new URL(url);
    if(u.hostname!=='drive.google.com')return '';
    if(u.pathname!=='/thumbnail'&&u.pathname!=='/uc')return '';
    return String(u.searchParams.get('id')||'').trim();
  }catch(e){return '';}
}

function projectImageKey(id){
  return new URL('__offline_project_image__/'+encodeURIComponent(id),DEV_ROOT).href;
}

async function saveProjectImage(url){
  const id=projectImageId(url);
  if(!id)return false;
  try{
    const req=new Request(url,{mode:'no-cors',cache:'reload',credentials:'omit'});
    const res=await fetch(req);
    if(!res)return false;
    if(!((res.status>=200&&res.status<400)||res.type==='opaque'))return false;
    const cache=await caches.open(PROJECT_IMAGE_CACHE);
    await cache.put(projectImageKey(id),res.clone());
    return true;
  }catch(e){return false;}
}

async function getSavedProjectImage(url){
  const id=projectImageId(url);
  if(!id)return null;
  const cache=await caches.open(PROJECT_IMAGE_CACHE);
  return await cache.match(projectImageKey(id),{ignoreVary:true});
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
    await Promise.all(keys.filter(k=>k.startsWith('r1135-project-image-dev-')&&k!==PROJECT_IMAGE_CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  const d=event&&event.data;
  if(!d||d.type!=='R1135_CACHE_PROJECT_IMAGE'||!Array.isArray(d.urls))return;
  event.waitUntil((async()=>{
    for(const url of d.urls){
      if(await saveProjectImage(String(url||'')))break;
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
  const imageId=projectImageId(req.url);
  if(!inDev&&!key&&!imageId)return;

  event.respondWith((async()=>{
    if(imageId){
      if(!self.navigator||self.navigator.onLine===false){
        const saved=await getSavedProjectImage(req.url);
        if(saved)return saved;
      }
      try{
        const network=await fetch(req);
        if(network&&((network.status>=200&&network.status<400)||network.type==='opaque')){
          const cache=await caches.open(PROJECT_IMAGE_CACHE);
          await cache.put(projectImageKey(imageId),network.clone());
        }
        return network;
      }catch(e){
        const saved=await getSavedProjectImage(req.url);
        if(saved)return saved;
        return Response.error();
      }
    }

    const cache=await caches.open(CACHE);
    const cacheKey=key||START;

    if(req.mode==='navigate'&&inDev){
      const saved=await cache.match(START);
      if(saved)return saved;
      return fetch(req);
    }

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
