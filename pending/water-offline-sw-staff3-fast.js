const CACHE='water-v878-offline-fast6-staff3';
const PAGE=new URL('v87-background.html',self.location.href).href;
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

// Giữ nguyên backend upload/đồng bộ SPEED3. STAFF3 chỉ thêm POST staffonly nhẹ.
const LIVE_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

function patchPageHtml(text){
  let html=String(text||'');

  html=html.replace(
    /<meta name="water-build" content="[^"]*">/,
    '<meta name="water-build" content="878-fast6-staff3">'
  );

  html=html.replace(
    /const BACKEND_URL\s*=\s*"[^"]+";/,
    'const BACKEND_URL = "'+LIVE_BACKEND+'";'
  );

  html=html.replace(
    /const STAFF_CACHE_KEY='[^']+';/,
    "const STAFF_CACHE_KEY='water_staff_list_staff3_v1';"
  );

  // STAFF3 không dùng fallback tĩnh; offline dùng cache Online gần nhất.
  html=html.replace(
    /const STAFF_FALLBACK=\[[\s\S]*?\n\];/,
    'const STAFF_FALLBACK=[];'
  );

  html=html.replace(
    '<iframe id="staffFrame" title="staff"></iframe>',
    '<iframe name="staffFrame" id="staffFrame" title="staff"></iframe>'
  );

  // Giao diện danh sách nhân sự: chỉ tên, cao vừa chữ, ngang theo tên dài nhất.
  html=html.replace(
    '</style>',
    `
#staffModal .modalIn{
  width:max-content;
  max-width:94vw;
  padding:12px 14px;
}
#staffSelect{
  display:block;
  width:auto;
  max-width:88vw;
  min-width:150px;
  height:34px;
  padding:4px 30px 4px 8px;
  margin:4px auto 0;
  font-size:16px;
  line-height:1.2;
}
</style>`
  );

  const staff3Script = String.raw`
<script>
(function(){
  let staffFastRequestId='';
  let staffFastInFlight=false;
  let staffFastStartedAt=0;
  let staffFastTimeout=null;
  let staffFastPollTimer=null;

  function fitStaffSelect(){
    const sel=byId('staffSelect');
    if(!sel)return;
    const probe=document.createElement('span');
    probe.style.cssText='position:fixed;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;font:16px Arial,sans-serif;';
    document.body.appendChild(probe);
    let max=0;
    staffList.forEach(x=>{
      probe.textContent=String(x.ten||x.ma||'');
      max=Math.max(max,probe.getBoundingClientRect().width);
    });
    probe.textContent='-- Chọn nhân sự --';
    max=Math.max(max,probe.getBoundingClientRect().width);
    probe.remove();
    const width=Math.max(150,Math.min(window.innerWidth*0.88,Math.ceil(max+54)));
    sel.style.width=width+'px';
  }

  window.setStaffList=function(list,source){
    if(!Array.isArray(list))return;
    const normalized=list.map(x=>({
      ma:String(x&&x.ma||'').trim().toUpperCase(),
      ten:String(x&&x.ten||'').trim()
    })).filter(x=>x.ma && x.ten);

    if(source!=='POST staffonly' && !normalized.length)return;
    staffList=normalized;

    if(source==='POST staffonly'){
      try{localStorage.setItem(STAFF_CACHE_KEY,JSON.stringify(staffList));}catch(e){}
      const current=getStaffCode();
      if(current && !staffList.some(x=>x.ma===current)){
        try{localStorage.removeItem('water_staff');}catch(e){}
        byId('staffName').textContent='Chưa chọn nhân sự';
        toast('NHÂN SỰ KHÔNG CÒN ĐANG LÀM VIỆC · CHỌN LẠI',2600);
      }
    }

    clearTimeout(staffLoadTimer);
    renderStaff();
    updateStaffName();
    byId('reloadStaffBtn').style.display='none';
    byId('manualStaff').style.display='none';
    byId('staffSelect').style.display='block';
    fitStaffSelect();

    if(source==='POST staffonly'){
      byId('debug').textContent='✓ Nhân sự đã cập nhật: '+staffList.length+' người';
    }else if(source==='Cache'){
      byId('debug').textContent='Danh sách nhân sự từ cache · đang cập nhật bản mới nhất...';
    }
  };

  window.renderStaff=function(){
    const sel=byId('staffSelect');
    sel.innerHTML='<option value="">-- Chọn nhân sự --</option>';
    staffList.forEach(x=>{
      const op=document.createElement('option');
      op.value=x.ma;
      op.textContent=x.ten || x.ma;
      sel.appendChild(op);
    });
    const old=getStaffCode();
    if(old)sel.value=old;
    fitStaffSelect();
  };

  window.updateStaffName=function(){
    const ma=getStaffCode();
    const x=staffList.find(a=>a.ma===ma);
    byId('staffName').textContent=x?(x.ten||x.ma):(ma?'Chưa xác nhận nhân sự':'Chưa chọn nhân sự');
  };

  function finishFastRequest(requestId){
    if(String(requestId||'')!==String(staffFastRequestId||''))return false;
    staffFastInFlight=false;
    clearTimeout(staffFastTimeout);
    staffFastTimeout=null;
    return true;
  }

  window.addEventListener('message',event=>{
    const d=event.data;
    if(!d || d.type!=='WATER_STAFF_ONLY')return;
    if(!finishFastRequest(d.requestId))return;
    if(Array.isArray(d.staff)){
      setStaffList(d.staff,'POST staffonly');
      const ms=Number(d.serverMs||0);
      byId('debug').textContent='✓ Nhân sự cập nhật'+(ms?' · server '+ms+' ms':'');
    }
  });

  window.loadStaff=function(force){
    if(!staffList.length)loadLocalStaffFirst();

    if(!navigator.onLine){
      byId('debug').textContent='OFFLINE · dùng danh sách nhân sự đã lưu từ lần Online gần nhất.';
      return;
    }

    if(staffFastInFlight && (Date.now()-staffFastStartedAt)<12000)return;

    if(force){
      byId('debug').textContent='Đang cập nhật nhân sự...';
      byId('reloadStaffBtn').style.display='none';
    }

    staffFastRequestId='staff3_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
    staffFastInFlight=true;
    staffFastStartedAt=Date.now();

    const form=document.createElement('form');
    form.method='POST';
    form.action=BACKEND_URL;
    form.target='staffFrame';
    form.style.display='none';

    const values={api:'staffonly',requestId:staffFastRequestId};
    Object.keys(values).forEach(k=>{
      const input=document.createElement('input');
      input.type='hidden';
      input.name=k;
      input.value=values[k];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    setTimeout(()=>{try{form.remove()}catch(e){}},30000);

    clearTimeout(staffFastTimeout);
    const thisId=staffFastRequestId;
    staffFastTimeout=setTimeout(()=>{
      if(String(thisId)!==String(staffFastRequestId))return;
      staffFastInFlight=false;
      byId('debug').textContent=staffList.length
        ? 'Backend nhân sự phản hồi chậm · vẫn giữ danh sách gần nhất.'
        : 'Backend nhân sự chưa phản hồi.';
    },12000);
  };

  function startStaffFastPoll(){
    clearInterval(staffFastPollTimer);
    staffFastPollTimer=setInterval(()=>{
      const modal=byId('staffModal');
      if(!modal || modal.style.display!=='flex')return;
      if(!navigator.onLine)return;
      loadStaff(false);
    },4000);
  }

  window.openStaff=function(){
    renderStaff();
    byId('staffModal').style.display='flex';
    fitStaffSelect();
    if(navigator.onLine)loadStaff(true);
    startStaffFastPoll();
  };

  window.saveStaff=function(){
    const ma=(byId('staffSelect').value||'').trim().toUpperCase();
    if(!ma){
      alert('Vui lòng chọn nhân sự trong danh sách.');
      return;
    }
    localStorage.setItem('water_staff',ma);
    byId('staffModal').style.display='none';
    clearInterval(staffFastPollTimer);
    staffFastPollTimer=null;
    updateStaffName();
    toast('ĐÃ CHỌN NHÂN SỰ');
  };

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible' && navigator.onLine){
      const modal=byId('staffModal');
      if(modal && modal.style.display==='flex')loadStaff(false);
    }
  });

  window.addEventListener('online',()=>{
    const modal=byId('staffModal');
    if(modal && modal.style.display==='flex')loadStaff(false);
  });
})();
</script>`;

  html=html.replace('</body>',staff3Script+'\n</body>');
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
    const raw=await fetch(new Request(PAGE+'?release=878-fast6-staff3',{cache:'reload'}));
    if(!raw.ok)throw new Error('Không tải được trang V8.7.8');

    const patched=patchPageHtml(await raw.text());
    if(
      !patched.includes('878-fast6-staff3') ||
      !patched.includes("water_staff_list_staff3_v1") ||
      !patched.includes("api:'staffonly'") ||
      !patched.includes("d.type!=='WATER_STAFF_ONLY'") ||
      !patched.includes('op.textContent=x.ten || x.ma')
    ){
      throw new Error('Bản vá STAFF3 chưa hợp lệ');
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
        text.includes('878-fast6-staff3')&&
        text.includes("water_staff_list_staff3_v1")&&
        text.includes("api:'staffonly'");
    }
    event.ports[0].postMessage({ready,build:'878-fast6-staff3'});
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