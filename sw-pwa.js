self.addEventListener('install',function(event){self.skipWaiting();});
self.addEventListener('activate',function(event){event.waitUntil(self.clients.claim());});
self.addEventListener('fetch',function(event){
  try{
    const url=new URL(event.request.url);
    if(url.origin===self.location.origin&&url.pathname.endsWith('/manifest-project.webmanifest')){
      const project=String(url.searchParams.get('project')||'').trim().toUpperCase();
      const iconVersion=String(url.searchParams.get('icon')||'').trim().toLowerCase();
      if(!/^[A-Z0-9_-]{2,40}$/.test(project)){
        event.respondWith(new Response(JSON.stringify({error:'INVALID_PROJECT_ID'}),{
          status:400,
          headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-store'}
        }));
        return;
      }

      const isV2=iconVersion==='v2';
      const start=isV2
        ? './r1135-v20-direct.html?project='+encodeURIComponent(project)
        : './pwa-start.html?project='+encodeURIComponent(project);
      const iconSrc=isV2
        ? './icon-module-v2/icon-water-meter.svg?v=20261004-3'
        : './water-app-icon.svg';
      const manifest={
        id:isV2
          ? './icon-module-v2/app-id/'+encodeURIComponent(project)
          : start,
        name:'Ghi Chỉ Số Nước'+(isV2?'':' - '+project),
        short_name:'Ghi Chỉ Số Nước',
        description:'Ứng dụng ghi chỉ số nước cho dự án '+project,
        start_url:start,
        scope:'./',
        display:'standalone',
        background_color:'#f4f7fb',
        theme_color:'#23679d',
        orientation:'any',
        prefer_related_applications:false,
        icons:[
          {src:iconSrc,sizes:'any',type:'image/svg+xml',purpose:'any'},
          {src:iconSrc,sizes:'any',type:'image/svg+xml',purpose:'maskable'}
        ]
      };
      event.respondWith(new Response(JSON.stringify(manifest),{
        status:200,
        headers:{
          'Content-Type':'application/manifest+json; charset=utf-8',
          'Cache-Control':'no-store, max-age=0'
        }
      }));
      return;
    }
  }catch(e){}
});
