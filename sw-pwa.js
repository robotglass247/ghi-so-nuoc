self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(event){event.waitUntil(self.clients.claim());});

async function getPassPngIcons(){
  try{
    const r=await fetch('./icon-module-v2/manifest-PKG001.webmanifest?v=20261004-pass-png',{cache:'no-store'});
    if(!r.ok)throw new Error('PASS_MANIFEST_'+r.status);
    const m=await r.json();
    const icons=Array.isArray(m.icons)?m.icons.filter(function(i){return i&&i.type==='image/png'&&i.src;}):[];
    const i192=icons.find(function(i){return String(i.sizes||'').indexOf('192x192')>=0;});
    const i512=icons.find(function(i){return String(i.sizes||'').indexOf('512x512')>=0;});
    if(i192&&i512){
      return [
        {src:i192.src,sizes:'192x192',type:'image/png',purpose:'any'},
        {src:i512.src,sizes:'512x512',type:'image/png',purpose:'any maskable'}
      ];
    }
  }catch(e){}
  return [
    {src:'./icon-module-v2/icon-water-meter.svg?v=package-v1-9',sizes:'any',type:'image/svg+xml',purpose:'any'},
    {src:'./icon-module-v2/icon-water-meter.svg?v=package-v1-9',sizes:'any',type:'image/svg+xml',purpose:'maskable'}
  ];
}

function manifestResponse(manifest){
  return new Response(JSON.stringify(manifest),{status:200,headers:{
    'Content-Type':'application/manifest+json; charset=utf-8',
    'Cache-Control':'no-store, max-age=0','Pragma':'no-cache'
  }});
}

function safeInstance(raw){
  return String(raw||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64);
}
function esc(s){
  return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
}
function parseVirtual(url){
  const marker='/icon-module-v2/package-v1/instances/';
  const pos=url.pathname.indexOf(marker);
  if(pos<0)return null;
  const tail=url.pathname.slice(pos+marker.length);
  const parts=tail.split('/');
  if(parts.length<3)return null;
  const project=String(parts[0]||'').toUpperCase();
  const instance=safeInstance(parts[1]);
  const file=String(parts[2]||'');
  if(!/^[A-Z0-9_-]{2,40}$/.test(project)||!instance)return null;
  return {project:project,instance:instance,file:file,repoBase:url.pathname.slice(0,pos)};
}

function virtualStartResponse(url,v){
  const appUrl=v.repoBase+'/r1135-v20-direct.html?project='+encodeURIComponent(v.project)+'&from=pwa-v9';
  const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#23679d"><title>Ghi Chỉ Số Nước</title></head><body><script>location.replace('+JSON.stringify(appUrl)+');<\/script></body></html>';
  return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

function virtualInstallResponse(url,v){
  const mode=url.searchParams.get('mode')==='mobile'?'mobile':'desktop';
  const projectName=String(url.searchParams.get('projectName')||'').slice(0,120);
  const attempt=Math.max(0,Math.min(3,parseInt(url.searchParams.get('attempt')||'0',10)||0));
  const manifestUrl=v.repoBase+'/manifest-project.webmanifest?project='+encodeURIComponent(v.project)+'&package=v1&mode='+mode+'&v=9&instance='+encodeURIComponent(v.instance);
  const appUrl=v.repoBase+'/r1135-v20-direct.html?project='+encodeURIComponent(v.project)+'&from=install-success';
  const baseInstances=v.repoBase+'/icon-module-v2/package-v1/instances/'+encodeURIComponent(v.project)+'/';
  const rootInstall=v.repoBase+'/install.html?project='+encodeURIComponent(v.project)+(projectName?'&projectName='+encodeURIComponent(projectName):'')+'&v=9';
  const iconUrl=v.repoBase+'/icon-module-v2/icon-water-meter.svg?v=pkg-v1-9';
  const label=mode==='mobile'?'CÀI TRÊN ĐIỆN THOẠI':'CÀI TRÊN MÁY TÍNH';
  const buttonLabel=attempt>0?'CÀI LẠI ICON':'CÀI ICON';
  const displayName='Dự án: '+v.project+(projectName?' - '+projectName:'');
  const html='<!doctype html>\n<html lang="vi"><head>\n'+
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
    '<meta name="theme-color" content="#23679d"><meta name="mobile-web-app-capable" content="yes">'+
    '<link rel="manifest" href="'+esc(manifestUrl)+'"><link rel="icon" href="'+esc(iconUrl)+'" type="image/svg+xml">'+
    '<title>Cài Ghi Chỉ Số Nước</title>'+ 
    '<script>window.__waterPwaPrompt=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__waterPwaPrompt=e;window.dispatchEvent(new Event("water-pwa-prompt-ready"));});<\/script>'+ 
    '<style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#f4f7fb;color:#172033;font-family:"Segoe UI",Tahoma,Arial,sans-serif}body{display:flex;align-items:center;justify-content:center;padding:20px}.card{width:min(430px,100%);background:#fff;border:1px solid #dce5ee;border-radius:22px;padding:22px 18px;box-shadow:0 16px 38px rgba(15,23,42,.10);text-align:center}.badge{display:inline-block;margin-bottom:12px;padding:6px 10px;border-radius:999px;background:#eef6ff;color:#23679d;font-size:12px;font-weight:800}.icon{width:96px;height:96px;display:block;margin:0 auto 12px;border-radius:22px}.title{font-size:21px;font-weight:900}.project{margin:7px 0 14px;color:#52657a;font-weight:700}.status{margin:0 0 10px;padding:12px;border:1px solid #e0e7ef;border-radius:12px;background:#f8fafc;color:#52657a;font-size:13px;line-height:1.55;text-align:left}button,a.btn{display:block;width:100%;min-height:52px;border-radius:13px;border:1px solid #cfd9e4;padding:14px 12px;margin-top:10px;font:800 16px/1.2 "Segoe UI",Tahoma,Arial,sans-serif;text-decoration:none;cursor:pointer}#installBtn{background:#23679d;color:#fff;border-color:#23679d}#installBtn:disabled{opacity:.55;cursor:not-allowed}#openBtn{background:#fff;color:#23679d}.back{display:block;margin-top:12px;color:#60758b;font-size:13px;text-decoration:none}.note{margin-top:12px;font-size:12px;color:#708196}</style>'+ 
    '</head><body><div class="card"><div class="badge">'+esc(label)+' - v9</div><img class="icon" src="'+esc(iconUrl)+'" alt="Icon Ghi Chỉ Số Nước"><div class="title">GHI CHỈ SỐ NƯỚC</div><div class="project">'+esc(displayName)+'</div><div id="status" class="status">Đang chuẩn bị hộp cài đặt...</div><button id="installBtn" type="button" disabled>'+esc(buttonLabel)+'</button><a id="openBtn" class="btn" href="'+esc(appUrl)+'">MỞ APP</a><a class="back" href="'+esc(rootInstall)+'">← Chọn lại thiết bị</a><div class="note">Bản Icon riêng: '+esc(v.instance)+'</div></div>'+ 
    '<script>(function(){"use strict";var project='+JSON.stringify(v.project)+',instance='+JSON.stringify(v.instance)+',mode='+JSON.stringify(mode)+',projectName='+JSON.stringify(projectName)+',attempt='+attempt+',appUrl='+JSON.stringify(appUrl)+',baseInstances='+JSON.stringify(baseInstances)+';var status=document.getElementById("status"),btn=document.getElementById("installBtn"),promptEvent=window.__waterPwaPrompt,done=false;function newInstance(){return "i"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}function nextUrl(){var n=newInstance();var q="?mode="+encodeURIComponent(mode)+"&attempt="+(attempt+1);if(projectName)q+="&projectName="+encodeURIComponent(projectName);return baseInstances+encodeURIComponent(n)+"/install.html"+q;}function activate(){if(window.__waterPwaPrompt)promptEvent=window.__waterPwaPrompt;if(!promptEvent)return false;btn.disabled=false;btn.textContent=attempt>0?"CÀI LẠI ICON":"CÀI ICON";status.textContent="Sẵn sàng cài đặt. Bấm "+btn.textContent+".";return true;}function finish(){if(done)return;done=true;try{localStorage.setItem("water_pwa_installed_"+project,"1");localStorage.setItem("water_pwa_last_instance_"+project,instance);}catch(e){}btn.disabled=true;status.textContent="Đã cài Icon thành công. Đang mở App...";setTimeout(function(){location.replace(appUrl);},900);}window.addEventListener("water-pwa-prompt-ready",activate);window.addEventListener("appinstalled",finish);activate();setTimeout(function(){if(promptEvent||done)return;if(attempt<1){status.textContent="Đang tự tạo bản Icon mới...";location.replace(nextUrl());return;}btn.disabled=false;btn.textContent="THỬ TẠO ICON MỚI";status.textContent="Chrome chưa mở hộp cài. Bấm THỬ TẠO ICON MỚI.";},5500);btn.addEventListener("click",async function(){activate();if(!promptEvent){location.replace(nextUrl());return;}var e=promptEvent;promptEvent=null;window.__waterPwaPrompt=null;try{await e.prompt();var c=await e.userChoice;if(c&&c.outcome==="accepted"){btn.disabled=true;status.textContent="Đã xác nhận cài đặt. Đang tạo Icon...";setTimeout(function(){if(!done)finish();},2500);}else{btn.disabled=false;status.textContent="Bạn đã hủy cài đặt.";}}catch(err){location.replace(nextUrl());}});try{localStorage.setItem("water_pwa_project",project);}catch(e){}})();<\/script></body></html>';
  return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, max-age=0','Pragma':'no-cache'}});
}

self.addEventListener('fetch',function(event){
  let url;
  try{url=new URL(event.request.url);}catch(e){return;}
  if(url.origin!==self.location.origin)return;

  const v=parseVirtual(url);
  if(v&&v.file==='start.html'){
    event.respondWith(Promise.resolve(virtualStartResponse(url,v)));return;
  }
  if(v&&v.file==='install.html'){
    event.respondWith(Promise.resolve(virtualInstallResponse(url,v)));return;
  }

  if(!url.pathname.endsWith('/manifest-project.webmanifest'))return;
  event.respondWith((async function(){
    const project=String(url.searchParams.get('project')||'').trim().toUpperCase();
    const iconVersion=String(url.searchParams.get('icon')||'').trim().toLowerCase();
    const packageVersion=String(url.searchParams.get('package')||'').trim().toLowerCase();
    const mode=String(url.searchParams.get('mode')||'').trim().toLowerCase();
    const instance=safeInstance(url.searchParams.get('instance'));

    if(!/^[A-Z0-9_-]{2,40}$/.test(project)){
      return new Response(JSON.stringify({error:'INVALID_PROJECT_ID'}),{status:400,headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-store'}});
    }

    if(packageVersion==='v1'){
      const pngIcons=await getPassPngIcons();
      let id='./icon-module-v2/package-v1/app-id/'+encodeURIComponent(project)+'-v1';
      let start='./icon-module-v2/package-v1/start.html?project='+encodeURIComponent(project);
      let scope='./';
      if(instance){
        const instanceBase='./icon-module-v2/package-v1/instances/'+encodeURIComponent(project)+'/'+encodeURIComponent(instance)+'/';
        id=instanceBase+'app';
        start=instanceBase+'start.html?project='+encodeURIComponent(project);
        scope=instanceBase;
      }
      return manifestResponse({
        id:id,
        name:'Ghi Chỉ Số Nước - '+project,
        short_name:'Ghi Chỉ Số Nước',
        description:'Ứng dụng Ghi Chỉ Số Nước - Dự án '+project,
        start_url:start,
        scope:scope,
        display:'standalone',
        background_color:'#f4f7fb',
        theme_color:'#23679d',
        orientation:mode==='mobile'?'portrait':'any',
        prefer_related_applications:false,
        icons:pngIcons
      });
    }

    const isV2=iconVersion==='v2';
    const start=isV2?'./r1135-v20-direct.html?project='+encodeURIComponent(project):'./pwa-start.html?project='+encodeURIComponent(project);
    const iconSrc=isV2?'./icon-module-v2/icon-water-meter.svg?v=20261004-3':'./water-app-icon.svg';
    return manifestResponse({
      id:isV2?'./icon-module-v2/app-id/'+encodeURIComponent(project):start,
      name:'Ghi Chỉ Số Nước'+(isV2?'':' - '+project),
      short_name:'Ghi Chỉ Số Nước',
      description:'Ứng dụng ghi chỉ số nước cho dự án '+project,
      start_url:start,
      scope:'./',display:'standalone',background_color:'#f4f7fb',theme_color:'#23679d',orientation:'any',prefer_related_applications:false,
      icons:[{src:iconSrc,sizes:'any',type:'image/svg+xml',purpose:'any'},{src:iconSrc,sizes:'any',type:'image/svg+xml',purpose:'maskable'}]
    });
  })());
});
