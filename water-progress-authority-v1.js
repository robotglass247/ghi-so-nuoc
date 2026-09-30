(function(){
  'use strict';

  const BUILD='water-progress-authority-v3-staff-select-fix';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const POLL_MS=4000;

  let snapshot=null;
  let staffSnapshot=null;
  let lastStaffSignature='';
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
  function applyProgress(){
    if(!snapshot||snapshot.ok!==true)return;
    const total=Math.max(0,Math.floor(Number(snapshot.total)||0));
    const done=Math.max(0,Math.min(total,Math.floor(Number(snapshot.captured)||0)));
    const left=Number.isFinite(Number(snapshot.remaining))?Math.max(0,Math.floor(Number(snapshot.remaining))):Math.max(0,total-done);
    setText('progressTotal',total);
    setText('progressDone',done);
    setText('progressLeft',left);
    setText('progressPeriod',String(snapshot.period||periodNow()).replace(/^0/,''));
  }
  function cleanStaff(){
    if(!Array.isArray(staffSnapshot)||!staffSnapshot.length)return [];
    return staffSnapshot.map(function(x){return {ma:String(x&&x.ma||'').trim().toUpperCase(),ten:String(x&&x.ten||'').trim()};}).filter(function(x){return !!x.ma;});
  }
  function applyStaff(force){
    const clean=cleanStaff();
    if(!clean.length)return;
    const signature=JSON.stringify(clean);

    // Không render lại select mỗi 4 giây vì sẽ làm mất lựa chọn người dùng đang thao tác.
    if(!force && signature===lastStaffSignature)return;

    let selectedNow='';
    try{
      const sel=document.getElementById('staffSelect');
      if(sel)selectedNow=String(sel.value||'').trim().toUpperCase();
    }catch(e){}

    try{
      const current=(localStorage.getItem('water_staff')||'').trim().toUpperCase();
      if(current && !clean.some(function(x){return x.ma===current;})) localStorage.removeItem('water_staff');
    }catch(e){}

    try{
      if(typeof setStaffList==='function') setStaffList(clean,'Google iframe');
      if(typeof renderStaff==='function') renderStaff();

      // Nếu modal đang mở và người dùng đã chạm chọn, giữ nguyên lựa chọn đó.
      if(selectedNow && clean.some(function(x){return x.ma===selectedNow;})){
        const sel=document.getElementById('staffSelect');
        if(sel)sel.value=selectedNow;
      }

      if(typeof updateStaffName==='function') updateStaffName();
      lastStaffSignature=signature;
    }catch(e){}
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
    staffSnapshot=Array.isArray(d.staff)?d.staff:null;
    busy=false;requestId='';
    applyProgress();
    applyStaff(false);
  });

  function installProjectStaffLoader(){
    const projectLoadStaff=function(force){
      try{
        if(typeof staffList!=='undefined' && (!staffList||!staffList.length) && typeof loadLocalStaffFirst==='function') loadLocalStaffFirst();
        if(force && document.getElementById('debug')) document.getElementById('debug').textContent='Đang cập nhật nhân sự từ dữ liệu dự án '+pid()+'...';
      }catch(e){}
      request();
      setTimeout(function(){applyStaff(false);},250);
    };
    try{window.loadStaff=projectLoadStaff;}catch(e){}
    try{loadStaff=projectLoadStaff;}catch(e){}
    window.refreshWaterProjectStaff=function(){lastStaffSignature='';request();};
  }

  const obs=new MutationObserver(function(){applyProgress();});
  function startObserver(){
    const root=document.body||document.documentElement;
    if(root)obs.observe(root,{subtree:true,childList:true,characterData:true});
  }
  startObserver();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){installProjectStaffLoader();setTimeout(request,100);});
  else installProjectStaffLoader();
  setInterval(applyProgress,250);
  setInterval(request,POLL_MS);
  setTimeout(request,200);
  window.addEventListener('online',function(){setTimeout(request,100);});
  window.addEventListener('pageshow',function(){setTimeout(request,100);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(request,100);});
  window.WATER_PROGRESS_AUTHORITY_BUILD=BUILD;
})();
