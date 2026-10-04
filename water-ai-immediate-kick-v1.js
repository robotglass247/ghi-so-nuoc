(function(){
  'use strict';

  const BUILD='water-ai-immediate-kick-v1';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';

  const params=new URLSearchParams(location.search);
  const PROJECT_ID=String(
    params.get('project') ||
    params.get('projectId') ||
    window.WATER_PROJECT_ID ||
    ''
  ).trim().toUpperCase();

  const ENABLED=new Set(['PKG001']);
  let lastKickAt=0;
  let kickTimer=null;

  function requestId(){
    try{
      if(crypto&&typeof crypto.randomUUID==='function'){
        return 'aik_'+crypto.randomUUID().replace(/-/g,'');
      }
    }catch(e){}
    return 'aik_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);
  }

  function fireKick(){
    if(!ENABLED.has(PROJECT_ID))return;
    const now=Date.now();
    if(now-lastKickAt<800)return;
    lastKickAt=now;

    const frame=document.createElement('iframe');
    frame.name='waterAiKick_'+Math.random().toString(36).slice(2);
    frame.style.display='none';
    frame.setAttribute('aria-hidden','true');

    const form=document.createElement('form');
    form.method='POST';
    form.action=BACKEND;
    form.target=frame.name;
    form.style.display='none';

    const fields={
      api:'aikick',
      requestId:requestId(),
      project:PROJECT_ID,
      projectId:PROJECT_ID
    };

    Object.keys(fields).forEach(function(k){
      const input=document.createElement('input');
      input.type='hidden';
      input.name=k;
      input.value=fields[k];
      form.appendChild(input);
    });

    document.body.appendChild(frame);
    document.body.appendChild(form);

    try{form.submit();}catch(e){}

    setTimeout(function(){
      try{form.remove();}catch(e){}
      try{frame.remove();}catch(e){}
    },30000);
  }

  function scheduleKick(){
    clearTimeout(kickTimer);
    kickTimer=setTimeout(fireKick,80);
  }

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||typeof d!=='object')return;

    if(
      d.type==='WATER_UPLOAD_RESULT' &&
      d.ok===true
    ){
      scheduleKick();
      return;
    }

    if(
      (d.type==='WATER_BATCH_UPLOAD_RESULT' ||
       d.type==='WATER_TURBO_UPLOAD_RESULT') &&
      d.ok===true
    ){
      const rows=Array.isArray(d.results)?d.results:[];
      if(
        !rows.length ||
        rows.some(function(x){
          return x&&x.ok===true&&!x.duplicate;
        })
      ){
        scheduleKick();
      }
    }
  });

  window.WATER_AI_IMMEDIATE_KICK_BUILD=BUILD;
})();
