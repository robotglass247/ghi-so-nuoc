(function(){
  'use strict';

  const BUILD='water-project-router-v2';
  const NEW_BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const OLD_BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

  const qs=new URLSearchParams(window.location.search||'');
  const project=String(qs.get('project')||'').trim().toUpperCase();

  window.WATER_PROJECT_ROUTER_BUILD=BUILD;
  window.WATER_PROJECT_ID=project;
  window.WATER_BACKEND_URL=NEW_BACKEND;

  if(!project){
    console.warn('[WATER ROUTER] Missing project parameter.');
    return;
  }

  function isBackendUrl(raw){
    const s=String(raw||'');
    return s.indexOf(NEW_BACKEND)===0 || s.indexOf(OLD_BACKEND)===0;
  }

  function withProject(raw){
    const s=String(raw||'');
    if(!isBackendUrl(s))return s;
    try{
      const u=new URL(s,window.location.href);
      u.searchParams.set('project',project);
      return u.toString();
    }catch(e){
      const sep=s.indexOf('?')>=0?'&':'?';
      return s+sep+'project='+encodeURIComponent(project);
    }
  }

  // Tách cache giao diện theo dự án.
  try{
    const activeKey='water_active_project_v1';
    const previous=String(localStorage.getItem(activeKey)||'').trim().toUpperCase();
    if(previous && previous!==project){
      [
        'water_staff_list_v1',
        'water_staff',
        'water_project_info_sheet_v2',
        'water_project_row2',
        'water_project_note_v1',
        'water_project_image_v1',
        'water_progress_ui3'
      ].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });

      // Các biên nhận chụp cũ không được dùng chéo dự án.
      try{
        for(let i=localStorage.length-1;i>=0;i--){
          const k=localStorage.key(i);
          if(k && k.indexOf('water_capture_v86:')===0){
            localStorage.removeItem(k);
          }
        }
      }catch(e){}
    }
    localStorage.setItem(activeKey,project);
  }catch(e){}

  // Tách IndexedDB hàng chờ ảnh theo PROJECT_ID.
  // Queue cũ vẫn được giữ nguyên trong DB cũ, nhưng TEST5 sẽ dùng DB riêng.
  try{
    if(window.indexedDB && typeof window.indexedDB.open==='function'){
      const nativeIdbOpen=window.indexedDB.open.bind(window.indexedDB);
      window.indexedDB.open=function(name,version){
        let routedName=String(name||'');
        if(routedName==='water_meter_v6'){
          routedName='water_meter_v6_'+project;
        }
        return arguments.length>1
          ? nativeIdbOpen(routedName,version)
          : nativeIdbOpen(routedName);
      };
    }
  }catch(e){
    console.warn('[WATER ROUTER] IndexedDB patch failed',e);
  }

  function patchSrc(proto){
    try{
      const d=Object.getOwnPropertyDescriptor(proto,'src');
      if(!d||!d.get||!d.set)return;
      Object.defineProperty(proto,'src',{
        configurable:d.configurable,
        enumerable:d.enumerable,
        get:d.get,
        set:function(v){ return d.set.call(this,withProject(v)); }
      });
    }catch(e){
      console.warn('[WATER ROUTER] src patch failed',e);
    }
  }

  if(window.HTMLScriptElement)patchSrc(HTMLScriptElement.prototype);
  if(window.HTMLIFrameElement)patchSrc(HTMLIFrameElement.prototype);

  function ensureProjectField(form){
    try{
      if(!form||!isBackendUrl(form.action))return;
      let input=form.querySelector('input[name="project"],textarea[name="project"]');
      if(!input){
        input=document.createElement('input');
        input.type='hidden';
        input.name='project';
        form.appendChild(input);
      }
      input.value=project;
    }catch(e){}
  }

  try{
    const nativeSubmit=HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit=function(){
      ensureProjectField(this);
      return nativeSubmit.apply(this,arguments);
    };

    if(HTMLFormElement.prototype.requestSubmit){
      const nativeRequestSubmit=HTMLFormElement.prototype.requestSubmit;
      HTMLFormElement.prototype.requestSubmit=function(){
        ensureProjectField(this);
        return nativeRequestSubmit.apply(this,arguments);
      };
    }
  }catch(e){
    console.warn('[WATER ROUTER] form patch failed',e);
  }

  try{
    const nativeFetch=window.fetch;
    if(typeof nativeFetch==='function'){
      window.fetch=function(input,init){
        if(typeof input==='string')input=withProject(input);
        else if(input instanceof Request && isBackendUrl(input.url)){
          input=new Request(withProject(input.url),input);
        }
        return nativeFetch.call(this,input,init);
      };
    }
  }catch(e){
    console.warn('[WATER ROUTER] fetch patch failed',e);
  }

  window.addEventListener('submit',function(ev){
    ensureProjectField(ev.target);
  },true);

  console.log('[WATER ROUTER]',BUILD,'project='+project,'db=water_meter_v6_'+project);
})();
