const CACHE='water-v878-offline-fast6-staff2';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

// Giữ nguyên backend đang chạy ổn cho upload/đồng bộ và dùng luôn POST uistate cho nhân sự.
const LIVE_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

function patchPageHtml(text){
  let html=String(text||'');

  html=html.replace(
    /<meta name="water-build" content="[^"]*">/,
    '<meta name="water-build" content="878-fast6-staff2">'
  );

  // Không đổi backend upload/đồng bộ.
  html=html.replace(
    /const BACKEND_URL\s*=\s*"[^"]+";/,
    'const BACKEND_URL = "'+LIVE_BACKEND+'";'
  );

  // Cache nhân sự riêng cho STAFF2 để không dùng lại danh sách cũ.
  html=html.replace(
    /const STAFF_CACHE_KEY='water_staff_list_v\d+';/,
    "const STAFF_CACHE_KEY='water_staff_list_staff2_v1';"
  );

  // Không dùng fallback nhân sự tĩnh ở STAFF2; offline dùng cache Online gần nhất.
  html=html.replace(
    /const STAFF_FALLBACK=\[[\s\S]*?\n\];/,
    'const STAFF_FALLBACK=[];'
  );

  // Iframe đích cho POST uistate.
  html=html.replace(
    '<iframe id="staffFrame" title="staff"></iframe>',
    '<iframe name="staffFrame" id="staffFrame" title="staff"></iframe>'
  );

  html=html.replace(
    /let staffLoadTimer=null;/,
    'let staffLoadTimer=null;\nlet staffUiRequestId="";'
  );

  // Danh sách POST là nguồn chính: cập nhật cache và loại người không còn Đang làm việc.
  html=html.replace(
    '  staffList=normalized;\n\n  // Nếu tải được từ Apps Script',
    "  staffList=normalized;\n\n  if(source==='POST uistate'){\n"+
    "    const current=getStaffCode();\n"+
    "    if(current && !staffList.some(x=>x.ma===current)){\n"+
    "      try{localStorage.removeItem('water_staff');}catch(e){}\n"+
    "      byId('staffName').textContent='Chưa chọn nhân sự';\n"+
    "      toast('NHÂN SỰ KHÔNG CÒN ĐANG LÀM VIỆC · CHỌN LẠI',2600);\n"+
    "    }\n"+
    "  }\n\n  // Nếu tải được từ Apps Script"
  );

  html=html.replace(
    /if\(source==='JSONP'\|\|source==='Google iframe'\)\{/,
    "if(source==='POST uistate'){"
  );

  // WATER_UI_STATE là kênh nhân sự chính; bỏ qua kênh GET/iframe cũ.
  html=html.replace(
    /window\.addEventListener\('message',event=>\{\n  const d=event\.data;\n  if\(d&&d\.type==='WATER_STAFF_LIST'\)\{\n    setStaffList\(d\.staff,'Google iframe'\);\n    return;\n  \}/,
    "window.addEventListener('message',event=>{\n"+
    "  const d=event.data;\n"+
    "  if(d&&d.type==='WATER_UI_STATE'){\n"+
    "    if(String(d.requestId||'')===String(staffUiRequestId||'') && Array.isArray(d.staff)){\n"+
    "      setStaffList(d.staff,'POST uistate');\n"+
    "    }\n"+
    "    return;\n"+
    "  }\n"+
    "  if(d&&d.type==='WATER_STAFF_LIST'){ return; }"
  );

  // Thay cơ chế tải nhân sự bằng POST uistate đã test PASS.
  html=html.replace(
    /function loadStaff\(force\)\{[\s\S]*?\n\}\n\nfunction renderStaff/,
    "function loadStaff(force){\n"+
    "  if(!staffList.length)loadLocalStaffFirst();\n"+
    "\n"+
    "  if(force){\n"+
    "    byId('debug').textContent='Đang cập nhật nhân sự Đang làm việc...';\n"+
    "    byId('reloadStaffBtn').style.display='none';\n"+
    "  }\n"+
    "\n"+
    "  if(!navigator.onLine){\n"+
    "    byId('debug').textContent='OFFLINE · dùng danh sách nhân sự đã lưu từ lần Online gần nhất.';\n"+
    "    return;\n"+
    "  }\n"+
    "\n"+
    "  staffUiRequestId='staff2_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);\n"+
    "  const now=new Date();\n"+
    "  const period=String(now.getMonth()+1).padStart(2,'0')+'/'+now.getFullYear();\n"+
    "\n"+
    "  const form=document.createElement('form');\n"+
    "  form.method='POST';\n"+
    "  form.action=BACKEND_URL;\n"+
    "  form.target='staffFrame';\n"+
    "  form.style.display='none';\n"+
    "\n"+
    "  const values={api:'uistate',period,requestId:staffUiRequestId};\n"+
    "  Object.keys(values).forEach(k=>{\n"+
    "    const input=document.createElement('input');\n"+
    "    input.type='hidden';\n"+
    "    input.name=k;\n"+
    "    input.value=values[k];\n"+
    "    form.appendChild(input);\n"+
    "  });\n"+
    "\n"+
    "  document.body.appendChild(form);\n"+
    "  form.submit();\n"+
    "  setTimeout(()=>{try{form.remove()}catch(e){}},60000);\n"+
    "\n"+
    "  clearTimeout(staffLoadTimer);\n"+
    "  staffLoadTimer=setTimeout(()=>{\n"+
    "    renderStaff();\n"+
    "    updateStaffName();\n"+
    "    byId('staffSelect').style.display='block';\n"+
    "    if(!staffList.length){\n"+
    "      byId('debug').textContent='Chưa có cache nhân sự · cần Online để tải danh sách Đang làm việc.';\n"+
    "    }else{\n"+
    "      byId('debug').textContent='POST nhân sự chưa phản hồi · vẫn giữ cache gần nhất.';\n"+
    "    }\n"+
    "  },15000);\n"+
    "}\n\nfunction renderStaff"
  );

  // Khi không có cache và đang offline, không đưa nhân sự tĩnh lên App.
  html=html.replace(
    "  // Dự phòng hiện tại lấy theo sheet NHAN_SU_THUC_HIEN.\n  setStaffList(STAFF_FALLBACK,'Dự phòng');",
    "  if(!navigator.onLine){\n"+
    "    staffList=[];\n"+
    "    renderStaff();\n"+
    "    updateStaffName();\n"+
    "    byId('debug').textContent='OFFLINE · chưa có cache nhân sự. Hãy Online một lần để cập nhật.';\n"+
    "  }"
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
    const raw=await fetch(new Request(PAGE+'?release=878-fast6-staff2',{cache:'reload'}));
    if(!raw.ok)throw new Error('Không tải được trang V8.7.8');

    const patched=patchPageHtml(await raw.text());
    if(
      !patched.includes('878-fast6-staff2') ||
      !patched.includes("water_staff_list_staff2_v1") ||
      !patched.includes("d.type==='WATER_UI_STATE'") ||
      !patched.includes("api:'uistate'") ||
      !patched.includes('NHÂN SỰ KHÔNG CÒN ĐANG LÀM VIỆC')
    ){
      throw new Error('Bản vá STAFF2 chưa hợp lệ');
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
      ready=ready&&
        text.includes('878-fast6-staff2')&&
        text.includes("water_staff_list_staff2_v1")&&
        text.includes("api:'uistate'");
    }
    event.ports[0].postMessage({ready,build:'878-fast6-staff2'});
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