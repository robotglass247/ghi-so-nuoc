const LAB_BUILD='20261004-pwa-lab-v1';

self.addEventListener('install',function(){
  self.skipWaiting();
});

self.addEventListener('activate',function(event){
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch',function(event){
  try{
    const url=new URL(event.request.url);
    if(url.origin!==self.location.origin)return;
    if(!url.pathname.endsWith('/pwa-lab-v1/manifest.webmanifest'))return;

    const project=String(url.searchParams.get('project')||'').trim().toUpperCase();
    const projectName=String(url.searchParams.get('projectName')||'').trim();

    if(!/^[A-Z0-9_-]{2,40}$/.test(project)){
      event.respondWith(new Response(JSON.stringify({error:'INVALID_PROJECT_ID'}),{
        status:400,
        headers:{
          'Content-Type':'application/manifest+json; charset=utf-8',
          'Cache-Control':'no-store, max-age=0'
        }
      }));
      return;
    }

    const start='./app-v1.html?project='+encodeURIComponent(project)+'&from=pwa-lab-v1';
    const manifest={
      id:'./app-v1.html?project='+encodeURIComponent(project),
      name:'Ghi Chỉ số Nước',
      short_name:'Ghi Chỉ số Nước',
      description:projectName
        ? 'Ứng dụng ghi chỉ số nước - '+projectName+' ('+project+')'
        : 'Ứng dụng ghi chỉ số nước cho dự án '+project,
      start_url:start,
      scope:'./',
      display:'standalone',
      background_color:'#f4f7fb',
      theme_color:'#23679d',
      orientation:'any',
      prefer_related_applications:false,
      icons:[
        {src:'./icon-v1.svg',sizes:'192x192',type:'image/svg+xml',purpose:'any'},
        {src:'./icon-v1.svg',sizes:'512x512',type:'image/svg+xml',purpose:'any'},
        {src:'./icon-v1.svg',sizes:'512x512',type:'image/svg+xml',purpose:'maskable'}
      ]
    };

    event.respondWith(new Response(JSON.stringify(manifest),{
      status:200,
      headers:{
        'Content-Type':'application/manifest+json; charset=utf-8',
        'Cache-Control':'no-store, max-age=0',
        'X-Water-PWA-Lab-Build':LAB_BUILD
      }
    }));
  }catch(e){}
});
