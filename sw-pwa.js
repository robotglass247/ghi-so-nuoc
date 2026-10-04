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
    {src:'./icon-module-v2/icon-water-meter.svg?v=package-v1-8',sizes:'any',type:'image/svg+xml',purpose:'any'},
    {src:'./icon-module-v2/icon-water-meter.svg?v=package-v1-8',sizes:'any',type:'image/svg+xml',purpose:'maskable'}
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

function virtualStartResponse(url){
  const marker='/icon-module-v2/package-v1/instances/';
  const pos=url.pathname.indexOf(marker);
  if(pos<0)return null;
  const tail=url.pathname.slice(pos+marker.length);
  const parts=tail.split('/');
  if(parts.length<3||parts[2]!=='start.html')return null;
  const project=String(parts[0]||'').toUpperCase();
  const instance=safeInstance(parts[1]);
  if(!/^[A-Z0-9_-]{2,40}$/.test(project)||!instance)return null;
  const repoBase=url.pathname.slice(0,pos);
  const appUrl=repoBase+'/r1135-v20-direct.html?project='+encodeURIComponent(project)+'&from=pwa-v8';
  const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#23679d"><title>Ghi Chỉ Số Nước</title></head><body><script>location.replace('+JSON.stringify(appUrl)+');<\/script></body></html>';
  return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

self.addEventListener('fetch',function(event){
  let url;
  try{url=new URL(event.request.url);}catch(e){return;}
  if(url.origin!==self.location.origin)return;

  const virtual=virtualStartResponse(url);
  if(virtual){event.respondWith(Promise.resolve(virtual));return;}

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
        id=instanceBase;
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
