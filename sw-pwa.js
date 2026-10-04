self.addEventListener('install',function(event){self.skipWaiting();});
self.addEventListener('activate',function(event){event.waitUntil(self.clients.claim());});
self.addEventListener('fetch',function(event){
  try{
    const url=new URL(event.request.url);
    if(url.origin===self.location.origin&&url.pathname.endsWith('/manifest-project.webmanifest')){
      const project=String(url.searchParams.get('project')||'').trim().toUpperCase();
      if(!/^[A-Z0-9_-]{2,40}$/.test(project)){
        event.respondWith(new Response(JSON.stringify({error:'INVALID_PROJECT_ID'}),{
          status:400,
          headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-store'}
        }));
        return;
      }
      const start='./pwa-start.html?project='+encodeURIComponent(project);
      const manifest={
        id:start,
        name:'Ứng dụng Ghi Chỉ Số Nước - '+project,
        short_name:'Ghi Nước '+project,
        description:'Ứng dụng ghi chỉ số nước cho dự án '+project,
        start_url:start,
        scope:'./',
        display:'standalone',
        background_color:'#f4f7fb',
        theme_color:'#23679d',
        orientation:'portrait',
        icons:[{
          src:'./water-app-icon.svg',
          sizes:'any',
          type:'image/svg+xml',
          purpose:'any maskable'
        }]
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
