(function(){
  'use strict';

  const BUILD='water-progress-project-v1';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const POLL_MS=4000;

  let busy=false;
  let activeId='';
  let frame=null;
  let form=null;

  function el(id){return document.getElementById(id);}
  function projectId(){
    try{
      return String(window.WATER_PROJECT_ID || new URLSearchParams(location.search).get('project') || '').trim().toUpperCase();
    }catch(e){return String(window.WATER_PROJECT_ID||'').trim().toUpperCase();}
  }
  function periodNow(){
    try{
      const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',year:'numeric'}).formatToParts(new Date());
      return parts.find(x=>x.type==='month').value+'/'+parts.find(x=>x.type==='year').value;
    }catch(e){
      const d=new Date();
      return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
    }
  }
  function hidden(frm,name,value){
    const i=document.createElement('input');
    i.type='hidden';i.name=name;i.value=String(value==null?'':value);frm.appendChild(i);
  }
  function clean(){
    try{if(form)form.remove();}catch(e){}
    try{if(frame)frame.remove();}catch(e){}
    form=null;frame=null;busy=false;activeId='';
  }
  function render(data){
    if(!data||data.ok!==true)return;
    const total=Math.max(0,Number(data.total)||0);
    const done=Math.max(0,Math.min(total,Number(data.captured)||0));
    const left=Number.isFinite(Number(data.remaining))?Math.max(0,Number(data.remaining)):Math.max(0,total-done);
    if(el('progressTotal'))el('progressTotal').textContent=String(Math.floor(total));
    if(el('progressDone'))el('progressDone').textContent=String(Math.floor(done));
    if(el('progressLeft'))el('progressLeft').textContent=String(Math.floor(left));
    if(el('progressPeriod'))el('progressPeriod').textContent=String(data.period||periodNow()).replace(/^0/,'');
    try{localStorage.setItem('water_progress_ui3_'+projectId(),JSON.stringify(data));}catch(e){}
  }
  function request(){
    const pid=projectId();
    if(!pid||busy||navigator.onLine===false)return;
    busy=true;
    const id='pp'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
    activeId=id;
    const target='waterProjectProgress_'+Date.now();
    const f=document.createElement('iframe');
    f.name=target;f.style.display='none';f.setAttribute('aria-hidden','true');document.body.appendChild(f);frame=f;
    const frm=document.createElement('form');
    frm.method='POST';frm.action=BACKEND;frm.target=target;frm.style.display='none';
    hidden(frm,'api','uistate');
    hidden(frm,'project',pid);
    hidden(frm,'projectId',pid);
    hidden(frm,'period',periodNow());
    hidden(frm,'requestId',id);
    document.body.appendChild(frm);form=frm;
    try{frm.submit();}catch(e){clean();return;}
    setTimeout(function(){if(activeId===id)clean();},8000);
  }
  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE'||d.requestId!==activeId)return;
    render(d.progress);
    clean();
  });
  window.addEventListener('online',function(){setTimeout(request,150);});
  window.addEventListener('pageshow',function(){setTimeout(request,200);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(request,150);});
  setTimeout(request,250);
  setInterval(function(){if(document.visibilityState==='visible')request();},POLL_MS);
  window.WATER_PROJECT_PROGRESS_BUILD=BUILD;
})();
