self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(event){event.waitUntil(self.clients.claim());});
self.addEventListener('message',function(event){if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});

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
    {src:'./icon-module-v2/icon-water-meter.svg?v=package-v1-11',sizes:'any',type:'image/svg+xml',purpose:'any'},
    {src:'./icon-module-v2/icon-water-meter.svg?v=package-v1-11',sizes:'any',type:'image/svg+xml',purpose:'maskable'}
  ];
}

function manifestResponse(manifest){
  return new Response(JSON.stringify(manifest),{status:200,headers:{
    'Content-Type':'application/manifest+json; charset=utf-8',
    'Cache-Control':'no-store, max-age=0','Pragma':'no-cache'
  }});
}
function safeInstance(raw){return String(raw||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64);}

self.addEventListener('fetch',function(event){
  let url;
  try{url=new URL(event.request.url);}catch(e){return;}
  if(url.origin!==self.location.origin||!url.pathname.endsWith('/manifest-project.webmanifest'))return;

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
      if(instance){
        const reinstallBase='./icon-module-v2/package-v1/reinstall/';
        return manifestResponse({
          id:reinstallBase+'app/'+encodeURIComponent(project)+'/'+encodeURIComponent(instance),
          name:'Ghi Chỉ Số Nước - '+project,
          short_name:'Ghi Chỉ Số Nước',
          description:'Ứng dụng Ghi Chỉ Số Nước - Dự án '+project,
          start_url:reinstallBase+'start.html?project='+encodeURIComponent(project)+'&instance='+encodeURIComponent(instance),
          scope:reinstallBase,
          display:'standalone',
          background_color:'#f4f7fb',
          theme_color:'#23679d',
          orientation:mode==='mobile'?'portrait':'any',
          prefer_related_applications:false,
          icons:pngIcons
        });
      }
      return manifestResponse({
        id:'./icon-module-v2/package-v1/app-id/'+encodeURIComponent(project)+'-v1',
        name:'Ghi Chỉ Số Nước - '+project,
        short_name:'Ghi Chỉ Số Nước',
        description:'Ứng dụng Ghi Chỉ Số Nước - Dự án '+project,
        start_url:'./icon-module-v2/package-v1/start.html?project='+encodeURIComponent(project),
        scope:'./',
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
