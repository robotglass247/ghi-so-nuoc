(function(){
  'use strict';

  const BUILD='879-r12.1-progress-dev-isolated';
  const BACKEND=String(window.WATER_R121_BACKEND_URL||'').trim();
  const POLL_MS=5000;
  let frame=null,form=null,timer=null,requestId='',running=false;

  function el(id){return document.getElementById(id);}
  function periodNow(){
    try{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',year:'numeric'}).formatToParts(new Date());return parts.find(x=>x.type==='month').value+'/'+parts.find(x=>x.type==='year').value;}
    catch(e){const d=new Date();return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
  }
  function render(data){
    if(!data||data.ok!==true)return false;
    const total=Math.max(0,Number(data.total)||0),done=Math.max(0,Math.min(total,Number(data.captured)||0)),left=Number.isFinite(Number(data.remaining))?Math.max(0,Number(data.remaining)):Math.max(0,total-done);
    if(el('progressTotal'))el('progressTotal').textContent=String(total);
    if(el('progressDone'))el('progressDone').textContent=String(done);
    if(el('progressLeft'))el('progressLeft').textContent=String(left);
    if(el('progressPeriod'))el('progressPeriod').textContent=String(data.period||periodNow()).replace(/^0/, '');
    try{localStorage.setItem('water_progress_ui3',JSON.stringify(data));}catch(e){}
    return true;
  }
  function disabled(){return !/^https:\/\/script\.google\.com\/macros\/s\//i.test(BACKEND);}
  function noteDisabled(){
    if(!disabled())return;
    const n=el('syncStatus');
    if(n&&!/DEV backend/i.test(String(n.textContent||'')))n.textContent='R12.1 DEV · Backend riêng chưa triển khai · chỉ lưu OFFLINE trên máy';
  }
  function cleanup(){clearTimeout(timer);timer=null;try{if(form)form.remove();}catch(e){}try{if(frame)frame.remove();}catch(e){}form=frame=null;requestId='';running=false;}
  function hidden(target,name,value){const i=document.createElement('input');i.type='hidden';i.name=name;i.value=String(value==null?'':value);target.appendChild(i);}
  function request(){
    if(disabled()||!navigator.onLine||running){noteDisabled();return;}
    running=true;const id='r121p_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);requestId=id;
    const target='r121Progress_'+Date.now();frame=document.createElement('iframe');frame.name=target;frame.style.display='none';document.body.appendChild(frame);
    form=document.createElement('form');form.method='POST';form.action=BACKEND;form.target=target;form.style.display='none';hidden(form,'api','uistate');hidden(form,'period',periodNow());hidden(form,'requestId',id);hidden(form,'reason','r121_dev_progress');document.body.appendChild(form);
    try{form.submit();}catch(e){cleanup();return;}timer=setTimeout(cleanup,7000);
  }
  window.addEventListener('message',function(ev){const d=ev&&ev.data;if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE'||d.requestId!==requestId)return;render(d.progress);cleanup();});
  window.addEventListener('online',()=>setTimeout(request,300));
  window.addEventListener('pageshow',()=>setTimeout(request,350));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(request,250);});
  noteDisabled();setTimeout(request,500);setInterval(()=>{if(document.visibilityState==='visible')request();},POLL_MS);
  window.WATER_LIVE_PROGRESS_BUILD=BUILD;
})();
