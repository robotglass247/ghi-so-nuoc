const CACHE='water-v878-offline-fast4';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

// Deployment thực tế đang dùng của ứng dụng.
const LIVE_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
const OTHER_BACKEND='https://script.google.com/macros/s/AKfycbxNEVthu3eh0hdXEJat9ReqR3MrDJJDaWKXlsoE-NN6qe1-wqJvmVTYMwI5BITOLeQ/exec';

function patchPageHtml(text){
  let html=String(text||'');

  html=html.replace(
    /<meta name="water-build" content="[^"]*">/,
    '<meta name="water-build" content="878-fast4">'
  );

  // Ép mọi bản HTML về đúng deployment đang chạy thực tế.
  html=html.split(OTHER_BACKEND).join(LIVE_BACKEND);

  // Mỗi bản mới dùng cache nhân sự mới; dữ liệu online vẫn được tải lại
  // mỗi lần người dùng bấm ĐỔI NHÂN SỰ.
  html=html.replace(
    /const STAFF_CACHE_KEY='water_staff_list_v\d+';/,
    "const STAFF_CACHE_KEY='water_staff_list_v4';"
  );

  // Chỉ là dữ liệu dự phòng khi mất mạng/API chậm. Danh sách chính vẫn
  // phải lấy động từ NHAN_SU_THUC_HIEN qua ?api=staff.
  html=html.replace(
    /const STAFF_FALLBACK=\[[\s\S]*?\n\];/,
    "const STAFF_FALLBACK=[\n"+
    "  {ma:'NS001',ten:'Nguyễn Văn Sĩ'},\n"+
    "  {ma:'NS002',ten:'Trần Văn Long'},\n"+
    "  {ma:'NS003',ten:'Nguyễn Ngọc Hóa'},\n"+
    "  {ma:'NS004',ten:'Vũ Văn Tùng'},\n"+
    "  {ma:'NS005',ten:'Minh Trang'}\n"+
    "];"
  );

  // Tương thích cả API trả trực tiếp mảng và API trả {staff:[...]}.
  html=html.replace(
    /function waterStaffCallback\(list\)\{\s*setStaffList\(list,'JSONP'\);\s*\}/,
    "function waterStaffCallback(data){\n"+
    "  const list=Array.isArray(data)?data:(data&&Array.isArray(data.staff)?data.staff:[]);\n"+
    "  if(list.length)setStaffList(list,'JSONP');\n"+
    "}"
  );

  return html;
}

function htmlResponse(response,text){
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.delete('content-length');
  return new Response(text,{
    status:response.status,
    statusText:response.statusText,
    headers
  });
}

async function fetchPatchedPage(request){
  const response=await fetch(new Request(request,{cache:'reload'}));
  if(!response.ok)return response;
  const html=patchPageHtml(await response.text());
  return htmlResponse(response,html);
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);

    const raw=await fetch(new Request(PAGE+'?release=878-fast4',{cache:'reload'}));
    if(!raw.ok)throw new Error('Không tải được trang V8.7.8');

    const patched=patchPageHtml(await raw.text());
    if(
      !patched.includes('<meta name="water-build" content="878-fast4">') ||
      !patched.includes(LIVE_BACKEND) ||
      !patched.includes("{ma:'NS005',ten:'Minh Trang'}") ||
      !patched.includes("water_staff_list_v4")
    ){
      throw new Error('Bản vá nhân sự fast4 chưa hợp lệ');
    }

    await cache.put(
      PAGE,
      new Response(patched,{
        status:200,
        headers:{'content-type':'text/html; charset=utf-8'}
      })
    );

    const existingQR=await caches.match(QR);
    if(existingQR)await cache.put(QR,existingQR);
    else await cache.addAll([new Request(QR,{mode:'cors',cache:'reload'})]);

    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(k=>k.startsWith('water-v878-offline-') && k!==CACHE)
        .map(k=>caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data!=='WATER_OFFLINE_STATUS'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const page=await cache.match(PAGE);
    const qr=await cache.match(QR);
    let ready=!!page&&!!qr;

    if(page){
      const text=await page.clone().text();
      ready=ready&&
        text.includes('878-fast4')&&
        text.includes(LIVE_BACKEND)&&
        text.includes("water_staff_list_v4");
    }

    event.ports[0].postMessage({ready,build:'878-fast4'});
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  const isPage=
    request.mode==='navigate' &&
    url.origin===self.location.origin &&
    url.pathname===new URL(PAGE).pathname;

  if(!isPage&&request.url!==QR)return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);

    if(isPage){
      try{
        const fresh=await fetchPatchedPage(request);
        if(fresh.ok){
          await cache.put(PAGE,fresh.clone());
          return fresh;
        }
      }catch(e){}

      const saved=await cache.match(PAGE);
      if(saved)return saved;

      const fallback=await fetch(request);
      if(fallback.ok){
        const patched=patchPageHtml(await fallback.text());
        return htmlResponse(fallback,patched);
      }
      return fallback;
    }

    const saved=await cache.match(QR);
    if(saved)return saved;

    const response=await fetch(request);
    if(response.ok)await cache.put(QR,response.clone());
    return response;
  })());
});
