const CACHE='water-v878-offline-fast6';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

// Giữ backend cũ cho upload/đồng bộ đang chạy ổn.
const LIVE_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

// Deployment đang được khai báo trong Ma.gs mới nhất của dự án.
// Chỉ dùng làm nguồn CHÍNH để tải danh sách nhân sự động.
const STAFF_BACKEND='https://script.google.com/macros/s/AKfycbxNEVthu3eh0hdXEJat9ReqR3MrDJJDaWKXlsoE-NN6qe1-wqJvmVTYMwI5BITOLeQ/exec';

function patchPageHtml(text){
  let html=String(text||'');

  html=html.replace(
    /<meta name="water-build" content="[^"]*">/,
    '<meta name="water-build" content="878-fast6">'
  );

  // Không đổi BACKEND_URL của upload/đồng bộ.
  html=html.replace(
    /const BACKEND_URL\s*=\s*"[^"]+";/,
    'const BACKEND_URL = "'+LIVE_BACKEND+'";\n'+
    'const STAFF_BACKEND_URL = "'+STAFF_BACKEND+'";'
  );

  html=html.replace(
    /const STAFF_CACHE_KEY='water_staff_list_v\d+';/,
    "const STAFF_CACHE_KEY='water_staff_list_v6';"
  );

  // Fallback chỉ dùng khi cả hai API đều không phản hồi.
  html=html.replace(
    /const STAFF_FALLBACK=\[[\s\S]*?\n\];/,
    "const STAFF_FALLBACK=[\n"+
    "  {ma:'NS001',ten:'Nguyễn Văn Sĩ'},\n"+
    "  {ma:'NS002',ten:'Trần Văn Long'},\n"+
    "  {ma:'NS003',ten:'Nguyễn Ngọc Hóa'},\n"+
    "  {ma:'NS004',ten:'Vũ Văn Tùng'}\n"+
    "];"
  );

  html=html.replace(
    /let staffLoadTimer=null;/,
    "let staffLoadTimer=null;\nlet staffPrimaryLoaded=false;\nlet staffRequestSeq=0;"
  );

  // Callback nguồn chính (deployment mới). Nguồn mới luôn có quyền cập nhật,
  // kể cả khi danh sách giảm vì nhân sự nghỉ việc.
  html=html.replace(
    /function waterStaffCallback\([^)]*\)\{[\s\S]*?\n\}/,
    "function waterStaffCallback(data){\n"+
    "  const list=Array.isArray(data)?data:(data&&Array.isArray(data.staff)?data.staff:[]);\n"+
    "  if(!list.length)return;\n"+
    "  staffPrimaryLoaded=true;\n"+
    "  setStaffList(list,'Apps Script mới');\n"+
    "}"
  );

  // Nếu iframe của nguồn chính trả dữ liệu thì đánh dấu đã có nguồn chính.
  html=html.replace(
    "if(d&&d.type==='WATER_STAFF_LIST'){\n    setStaffList(d.staff,'Google iframe');",
    "if(d&&d.type==='WATER_STAFF_LIST'){\n    staffPrimaryLoaded=true;\n    setStaffList(d.staff,'Apps Script mới - iframe');"
  );

  // Thay toàn bộ cơ chế tải nhân sự:
  // 1) hỏi deployment mới trước;
  // 2) nếu sau 3 giây chưa có phản hồi mới hỏi deployment cũ;
  // 3) mỗi lần bấm ĐỔI NHÂN SỰ đều gọi lại, có timestamp chống cache.
  html=html.replace(
    /function loadStaff\(force\)\{[\s\S]*?\n\}\n\nfunction renderStaff/,
    "function loadStaff(force){\n"+
    "  if(!staffList.length)loadLocalStaffFirst();\n"+
    "\n"+
    "  if(force){\n"+
    "    byId('debug').textContent='Đang lấy danh sách nhân sự mới nhất từ Google Sheet...';\n"+
    "    byId('reloadStaffBtn').style.display='none';\n"+
    "  }\n"+
    "\n"+
    "  if(!navigator.onLine){\n"+
    "    byId('debug').textContent='OFFLINE · dùng danh sách nhân sự đã lưu trên máy.';\n"+
    "    return;\n"+
    "  }\n"+
    "\n"+
    "  const seq=++staffRequestSeq;\n"+
    "  staffPrimaryLoaded=false;\n"+
    "\n"+
    "  // NGUỒN CHÍNH: deployment hiện có trong Ma.gs mới nhất.\n"+
    "  const primary=document.createElement('script');\n"+
    "  primary.src=STAFF_BACKEND_URL+'?api=staff&callback=waterStaffCallback&_='+Date.now();\n"+
    "  primary.async=true;\n"+
    "  primary.onerror=()=>{};\n"+
    "  document.head.appendChild(primary);\n"+
    "\n"+
    "  byId('staffFrame').src=STAFF_BACKEND_URL+'?api=staffframe&_='+Date.now();\n"+
    "\n"+
    "  // Chỉ dùng deployment cũ làm dự phòng nếu nguồn chính chưa trả.\n"+
    "  setTimeout(()=>{\n"+
    "    if(seq!==staffRequestSeq||staffPrimaryLoaded)return;\n"+
    "    const cb='waterStaffLegacy_'+seq+'_'+Date.now();\n"+
    "    const s=document.createElement('script');\n"+
    "    window[cb]=(data)=>{\n"+
    "      try{\n"+
    "        if(seq!==staffRequestSeq||staffPrimaryLoaded)return;\n"+
    "        const list=Array.isArray(data)?data:(data&&Array.isArray(data.staff)?data.staff:[]);\n"+
    "        if(list.length)setStaffList(list,'Apps Script cũ - dự phòng');\n"+
    "      }finally{\n"+
    "        try{delete window[cb]}catch(e){}\n"+
    "        if(s.parentNode)s.parentNode.removeChild(s);\n"+
    "      }\n"+
    "    };\n"+
    "    s.async=true;\n"+
    "    s.src=BACKEND_URL+'?api=staff&callback='+encodeURIComponent(cb)+'&_='+Date.now();\n"+
    "    s.onerror=()=>{try{delete window[cb]}catch(e){}};\n"+
    "    document.head.appendChild(s);\n"+
    "  },3000);\n"+
    "\n"+
    "  clearTimeout(staffLoadTimer);\n"+
    "  staffLoadTimer=setTimeout(()=>{\n"+
    "    renderStaff();\n"+
    "    updateStaffName();\n"+
    "    byId('reloadStaffBtn').style.display='none';\n"+
    "    byId('manualStaff').style.display='none';\n"+
    "    byId('staffSelect').style.display='block';\n"+
    "    if(!staffPrimaryLoaded){\n"+
    "      byId('debug').textContent='Chưa nhận được deployment mới · đang dùng danh sách dự phòng/cache.';\n"+
    "    }\n"+
    "  },7000);\n"+
    "}\n\nfunction renderStaff"
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
    const raw=await fetch(new Request(PAGE+'?release=878-fast6',{cache:'reload'}));
    if(!raw.ok)throw new Error('Không tải được trang V8.7.8');

    const patched=patchPageHtml(await raw.text());
    if(
      !patched.includes('878-fast6') ||
      !patched.includes('STAFF_BACKEND_URL') ||
      !patched.includes('Apps Script mới') ||
      !patched.includes("water_staff_list_v6")
    ){
      throw new Error('Bản vá nhân sự fast6 chưa hợp lệ');
    }

    await cache.put(PAGE,new Response(patched,{
      status:200,
      headers:{'content-type':'text/html; charset=utf-8'}
    }));

    const existingQR=await caches.match(QR);
    if(existingQR)await cache.put(QR,existingQR);
    else await cache.addAll([new Request(QR,{mode:'cors',cache:'reload'})]);

    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys
      .filter(k=>k.startsWith('water-v878-offline-')&&k!==CACHE)
      .map(k=>caches.delete(k)));
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
      ready=ready&&text.includes('878-fast6')&&text.includes('STAFF_BACKEND_URL');
    }
    event.ports[0].postMessage({ready,build:'878-fast6'});
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  const isPage=request.mode==='navigate'&&
    url.origin===self.location.origin&&
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