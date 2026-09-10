const CACHE='water-v878-offline-ui1';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const UI=new URL('water-ui1.js',self.location.href).href;
const BUILD='878-ui1';

const LIVE_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';
const DATA_BACKEND='https://script.google.com/macros/s/AKfycbxNEVthu3eh0hdXEJat9ReqR3MrDJJDaWKXlsoE-NN6qe1-wqJvmVTYMwI5BITOLeQ/exec';

function patchPageHtml(text){
  let html=String(text||'');

  html=html.replace(
    /<meta name="water-build" content="[^"]*">/,
    '<meta name="water-build" content="'+BUILD+'">'
  );

  html=html.replace(
    /const BACKEND_URL\s*=\s*"[^"]+";/,
    'const BACKEND_URL = "'+LIVE_BACKEND+'";\n'+
    'const STAFF_BACKEND_URL = "'+DATA_BACKEND+'";\n'+
    'const PROGRESS_BACKEND_URL = "'+DATA_BACKEND+'";'
  );

  html=html.replace(
    /const STAFF_CACHE_KEY='water_staff_list_v\d+';/,
    "const STAFF_CACHE_KEY='water_staff_list_v7';"
  );

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

  html=html.replace(
    "if(source==='JSONP'||source==='Google iframe'){",
    "if(source!=='Cache'&&source!=='Dự phòng'){"
  );

  html=html.replace(
    /function waterStaffCallback\([^)]*\)\{[\s\S]*?\n\}/,
    "function waterStaffCallback(data){\n"+
    "  const list=Array.isArray(data)?data:(data&&Array.isArray(data.staff)?data.staff:[]);\n"+
    "  if(!list.length)return;\n"+
    "  staffPrimaryLoaded=true;\n"+
    "  setStaffList(list,'Apps Script mới');\n"+
    "}"
  );

  html=html.replace(
    "if(d&&d.type==='WATER_STAFF_LIST'){\n    setStaffList(d.staff,'Google iframe');",
    "if(d&&d.type==='WATER_STAFF_LIST'){\n    staffPrimaryLoaded=true;\n    setStaffList(d.staff,'Apps Script mới - iframe');"
  );

  html=html.replace(
    /function loadStaff\(force\)\{[\s\S]*?\n\}\n\nfunction renderStaff/,
    "function loadStaff(force){\n"+
    "  if(!staffList.length)loadLocalStaffFirst();\n"+
    "  if(force){\n"+
    "    byId('debug').textContent='Đang lấy danh sách nhân sự mới nhất từ Google Sheet...';\n"+
    "    byId('reloadStaffBtn').style.display='none';\n"+
    "  }\n"+
    "  if(!navigator.onLine){\n"+
    "    byId('debug').textContent='OFFLINE · dùng danh sách nhân sự đã lưu trên máy.';\n"+
    "    return;\n"+
    "  }\n"+
    "  const seq=++staffRequestSeq;\n"+
    "  staffPrimaryLoaded=false;\n"+
    "  const primary=document.createElement('script');\n"+
    "  primary.src=STAFF_BACKEND_URL+'?api=staff&callback=waterStaffCallback&_='+Date.now();\n"+
    "  primary.async=true;\n"+
    "  primary.onerror=()=>{};\n"+
    "  document.head.appendChild(primary);\n"+
    "  byId('staffFrame').src=STAFF_BACKEND_URL+'?api=staffframe&_='+Date.now();\n"+
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
    "  clearTimeout(staffLoadTimer);\n"+
    "  staffLoadTimer=setTimeout(()=>{\n"+
    "    renderStaff();\n"+
    "    updateStaffName();\n"+
    "    byId('reloadStaffBtn').style.display='none';\n"+
    "    byId('manualStaff').style.display='none';\n"+
    "    byId('staffSelect').style.display='block';\n"+
    "    if(!staffPrimaryLoaded)byId('debug').textContent='Chưa nhận được deployment mới · đang dùng danh sách dự phòng/cache.';\n"+
    "  },7000);\n"+
    "}\n\nfunction renderStaff"
  );

  html=html.replace(
    'canvas,iframe{display:none}\n</style>',
    'canvas,iframe{display:none}\n'+
    '#progressBar{background:#fff;padding:8px 10px;border-bottom:1px solid #ddd;text-align:center;font-size:13px;font-weight:700;line-height:1.35}\n'+
    '#progressBar b{font-variant-numeric:tabular-nums}\n'+
    '#syncStatus{margin-top:7px;border:1px solid #ddd;border-radius:10px;background:#f7f7f7;font-weight:700;text-align:center}\n'+
    '#debug{padding:3px 5px}\n'+
    '#appFooter{margin-top:5px;padding-top:5px;border-top:1px solid #eee;font-size:11px;color:#666;text-align:center}\n'+
    '</style>'
  );

  html=html.replace(
    '  </div>\n\n  <div class="camera">',
    '  </div>\n\n'+
    '  <div id="progressBar" role="status" aria-live="polite">'+
    'Tổng số đồng hồ: <b id="progressTotal">----</b> · '+
    'Đã chụp: <b id="progressDone">----</b> · '+
    'Chưa chụp: <b id="progressLeft">----</b>'+
    '</div>\n\n'+
    '  <div class="camera">'
  );

  html=html.replace(
    '<div id="statusMain">GHI SỐ NƯỚC V8.7.8</div>\n      <div id="statusSub">Không cần quét QR riêng. Chụp 1 ảnh có cả đồng hồ + QR.</div>',
    '<div id="statusMain">SẴN SÀNG CHỤP</div>\n      <div id="statusSub">1. Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.</div>'
  );

  html=html.replace(
    '<div style="font-size:12px;text-align:center;color:#555">V8.7.8 · Lưu ảnh tối ưu</div>',
    '<div style="font-size:11px;text-align:center;color:#777;margin-top:6px">TRẠNG THÁI THỰC HIỆN</div>'
  );

  html=html.replace(
    '<div id="debug">Trạng thái camera và nhân sự</div>\n  </div>',
    '<div id="debug">Trạng thái camera và nhân sự</div>\n'+
    '    <div id="appFooter">Designed by Mr.Hoa - Hotline: 0915176386</div>\n'+
    '  </div>'
  );

  html=html.replace(
    '</body>',
    '<script src="./water-ui1.js?build='+BUILD+'"></script>\n</body>'
  );

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
    if(!patched.includes(BUILD)||!patched.includes('progressBar')||!patched.includes('Designed by Mr.Hoa')||!patched.includes('PROGRESS_BACKEND_URL')||!patched.includes('water-ui1.js')){
      throw new Error('Bản giao diện '+BUILD+' chưa hợp lệ');
    }
    await cache.put(PAGE,new Response(patched,{status:200,headers:{'content-type':'text/html; charset=utf-8'}}));

    const ui=await fetch(new Request(UI+'?build='+BUILD,{cache:'reload'}));
    if(!ui.ok)throw new Error('Không tải được water-ui1.js');
    await cache.put(UI,ui.clone());

    const existingQR=await caches.match(QR);
    if(existingQR)await cache.put(QR,existingQR);
    else await cache.addAll([new Request(QR,{mode:'cors',cache:'reload'})]);
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
    const page=await cache.match(PAGE);
    const qr=await cache.match(QR);
    const ui=await cache.match(UI);
    let ready=!!page&&!!qr&&!!ui;
    if(page){
      const text=await page.clone().text();
      ready=ready&&text.includes(BUILD)&&text.includes('progressBar')&&text.includes('Designed by Mr.Hoa');
    }
    event.ports[0].postMessage({ready,build:BUILD});
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  const pagePath=new URL(PAGE).pathname;
  const uiPath=new URL(UI).pathname;
  const isPage=request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname===pagePath;
  const isUI=url.origin===self.location.origin&&url.pathname===uiPath;
  if(!isPage&&!isUI&&request.url!==QR)return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(isPage){
      try{
        const fresh=await fetchPatchedPage(request);
        if(fresh.ok){await cache.put(PAGE,fresh.clone());return fresh;}
      }catch(e){}
      const saved=await cache.match(PAGE);
      if(saved)return saved;
      const fallback=await fetch(request);
      if(fallback.ok)return htmlResponse(fallback,patchPageHtml(await fallback.text()));
      return fallback;
    }
    if(isUI){
      try{
        const fresh=await fetch(new Request(request,{cache:'reload'}));
        if(fresh.ok){await cache.put(UI,fresh.clone());return fresh;}
      }catch(e){}
      const saved=await cache.match(UI);
      if(saved)return saved;
      return fetch(request);
    }
    const saved=await cache.match(QR);
    if(saved)return saved;
    const response=await fetch(request);
    if(response.ok)await cache.put(QR,response.clone());
    return response;
  })());
});
