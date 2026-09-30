(function(){
  'use strict';

  const BUILD='water-progress-authority-v1';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const POLL_MS=4000;

  let snapshot=null;
  let busy=false;
  let requestId='';

  function pid(){
    try{return String(window.WATER_PROJECT_ID||new URLSearchParams(location.search).get('project')||'').trim().toUpperCase();}
    catch(e){return String(window.WATER_PROJECT_ID||'').trim().toUpperCase();}
  }
  function periodNow(){
    try{
      const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',year:'numeric'}).formatToParts(new Date());
      return p.find(x=>x.type==='month').value+'/'+p.find(x=>x.type==='year').value;
    }catch(e){
      const d=new Date();return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
    }
  }
  function setText(id,v){
    const n=document.getElementById(id);
    if(!n)return;
    const s=String(v==null?'':v);
    if(n.textContent!==s)n.textContent=s;
  }
  function apply(){
    if(!snapshot||snapshot.ok!==true)return;
    const total=Math.max(0,Math.floor(Number(snapshot.total)||0));
    const done=Math.max(0,Math.min(total,Math.floor(Number(snapshot.captured)||0)));
    const left=Number.isFinite(Number(snapshot.remaining))?Math.max(0,Math.floor(Number(snapshot.remaining))):Math.max(0,total-done);
    setText('progressTotal',total);
    setText('progressDone',done);
    setText('progressLeft',left);
    setText('progressPeriod',String(snapshot.period||periodNow()).replace(/^0/,''));
  }
  function hidden(f,n,v){const i=document.createElement('input');i.type='hidden';i.name=n;i.value=String(v==null?'':v);f.appendChild(i);}
  function request(){
    const project=pid();
    if(!project||busy||navigator.onLine===false)return;
    busy=true;
    const id='auth_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    requestId=id;
    const target='waterProgressAuthority_'+Date.now();
    const iframe=document.createElement('iframe');iframe.name=target;iframe.style.display='none';document.body.appendChild(iframe);
    const form=document.createElement('form');form.method='POST';form.action=BACKEND;form.target=target;form.style.display='none';
    hidden(form,'api','uistate');hidden(form,'project',project);hidden(form,'projectId',project);hidden(form,'period',periodNow());hidden(form,'requestId',id);
    document.body.appendChild(form);
    try{form.submit();}catch(e){busy=false;try{form.remove();iframe.remove();}catch(_e){}return;}
    setTimeout(function(){try{form.remove();iframe.remove();}catch(e){}if(requestId===id){busy=false;requestId='';}},7000);
  }
  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE'||d.requestId!==requestId)return;
    snapshot=d.progress||null;
    busy=false;requestId='';
    apply();
  });

  const obs=new MutationObserver(function(){apply();});
  function startObserver(){
    const root=document.body||document.documentElement;
    if(root)obs.observe(root,{subtree:true,childList:true,characterData:true});
  }
  startObserver();
  setInterval(apply,250);
  setInterval(request,POLL_MS);
  setTimeout(request,200);
  window.addEventListener('online',function(){setTimeout(request,100);});
  window.addEventListener('pageshow',function(){setTimeout(request,100);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(request,100);});
  window.WATER_PROGRESS_AUTHORITY_BUILD=BUILD;
})();
