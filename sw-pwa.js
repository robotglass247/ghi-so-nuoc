self.addEventListener('install',function(event){
  self.skipWaiting();
});

self.addEventListener('activate',function(event){
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch',function(event){
  try{
    const url=new URL(event.request.url);

    if(url.origin===self.location.origin&&url.pathname.endsWith('/manifest-project.webmanifest')){
      const project=String(url.searchParams.get('project')||'').trim().toUpperCase();
      const projectName=String(url.searchParams.get('projectName')||'').trim();

      if(!/^[A-Z0-9_-]{2,40}$/.test(project)){
        event.respondWith(new Response(JSON.stringify({error:'INVALID_PROJECT_ID'}),{
          status:400,
          headers:{
            'Content-Type':'application/manifest+json; charset=utf-8',
            'Cache-Control':'no-store'
          }
        }));
        return;
      }

      const start='./pwa-start.html?project='+encodeURIComponent(project);
      const displayName=projectName
        ? 'Ghi Chỉ Số Nước - '+projectName
        : 'Ghi Chỉ Số Nước - '+project;

      const manifest={
        id:start,
        name:displayName,
        short_name:'Ghi Nước '+project,
        description:'Ứng dụng ghi chỉ số nước cho dự án '+project,
        start_url:start,
        scope:'./',
        display:'standalone',
        background_color:'#ffffff',
        theme_color:'#0b91e5',
        orientation:'any',
        prefer_related_applications:false,
        icons:[
          {
            src:'./water-app-icon.svg',
            sizes:'192x192',
            type:'image/svg+xml',
            purpose:'any'
          },
          {
            src:'./water-app-icon.svg',
            sizes:'512x512',
            type:'image/svg+xml',
            purpose:'any'
          },
          {
            src:'./water-app-icon.svg',
            sizes:'512x512',
            type:'image/svg+xml',
            purpose:'maskable'
          }
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
