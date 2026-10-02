(function(){
  'use strict';

  const BUILD='water-auth-session-transport-v1';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const params=new URLSearchParams(location.search);
  const PROJECT_ID=String(params.get('project')||params.get('projectId')||window.WATER_PROJECT_ID||'').trim().toUpperCase();

  function readSession(){
    try{
      const raw=sessionStorage.getItem('water_auth_v3_'+PROJECT_ID);
      if(!raw)return null;
      const data=JSON.parse(raw);
      if(!data||!data.sessionToken)return null;
      return data;
    }catch(e){return null;}
  }

  function token(){
    const s=readSession();
    return s?String(s.sessionToken||'').trim():'';
  }

  function isBackend(url){
    try{
      const a=new URL(String(url||''),location.href);
      const b=new URL(BACKEND);
      return a.origin===b.origin && a.pathname===b.pathname;
    }catch(e){return false;}
  }

  function secureUrl(url){
    if(!isBackend(url))return url;
    const t=token();
    if(!t)return url;
    try{
      const u=new URL(String(url||''),location.href);
      if(!u.searchParams.get('sessionToken'))u.searchParams.set('sessionToken',t);
      if(PROJECT_ID){
        if(!u.searchParams.get('project'))u.searchParams.set('project',PROJECT_ID);
        if(!u.searchParams.get('projectId'))u.searchParams.set('projectId',PROJECT_ID);
      }
      return u.toString();
    }catch(e){return url;}
  }

  function ensureFormFields(form){
    if(!form||!isBackend(form.action))return;
    const t=token();
    if(!t)return;
    function put(name,value){
      let input=form.querySelector('input[name="'+name+'"],textarea[name="'+name+'"]');
      if(!input){
        input=document.createElement('input');
        input.type='hidden';
        input.name=name;
        form.appendChild(input);
      }
      if(!String(input.value||'').trim())input.value=value;
    }
    put('sessionToken',t);
    if(PROJECT_ID){put('project',PROJECT_ID);put('projectId',PROJECT_ID);}
  }

  try{
    const nativeSubmit=HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit=function(){
      ensureFormFields(this);
      return nativeSubmit.apply(this,arguments);
    };
  }catch(e){}

  try{
    const nativeRequestSubmit=HTMLFormElement.prototype.requestSubmit;
    if(nativeRequestSubmit){
      HTMLFormElement.prototype.requestSubmit=function(){
        ensureFormFields(this);
        return nativeRequestSubmit.apply(this,arguments);
      };
    }
  }catch(e){}

  try{
    const nativeFetch=window.fetch;
    if(nativeFetch){
      window.fetch=function(input,init){
        try{
          if(typeof input==='string')input=secureUrl(input);
          else if(input&&input.url&&isBackend(input.url))input=new Request(secureUrl(input.url),input);
        }catch(e){}
        return nativeFetch.call(this,input,init);
      };
    }
  }catch(e){}

  try{
    const nativeOpen=XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open=function(method,url){
      const args=Array.prototype.slice.call(arguments);
      args[1]=secureUrl(url);
      return nativeOpen.apply(this,args);
    };
  }catch(e){}

  function patchSrc(proto){
    try{
      const d=Object.getOwnPropertyDescriptor(proto,'src');
      if(!d||!d.get||!d.set)return;
      Object.defineProperty(proto,'src',{
        configurable:d.configurable,
        enumerable:d.enumerable,
        get:d.get,
        set:function(v){return d.set.call(this,secureUrl(v));}
      });
    }catch(e){}
  }
  patchSrc(HTMLScriptElement.prototype);
  patchSrc(HTMLIFrameElement.prototype);

  window.WATER_AUTH_SESSION_TOKEN=function(){return token();};
  window.WATER_AUTH_SESSION_TRANSPORT_BUILD=BUILD;
})();
