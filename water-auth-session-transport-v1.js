(function(){
  'use strict';

  const BUILD='water-auth-session-transport-v2-defer-until-session';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const params=new URLSearchParams(location.search);
  const PROJECT_ID=String(
    params.get('project') ||
    params.get('projectId') ||
    window.WATER_PROJECT_ID ||
    ''
  ).trim().toUpperCase();

  const BYPASS_APIS=new Set([
    'authstaff',
    'login',
    'sessioncheck',
    'changepassword',
    'health',
    'ping'
  ]);

  const WAIT_TIMEOUT_MS=45000;
  const pendingForms=new WeakSet();
  const pendingElements=new Set();

  function readSession(){
    try{
      const raw=sessionStorage.getItem('water_auth_v3_'+PROJECT_ID);
      if(!raw)return null;
      const data=JSON.parse(raw);
      if(!data || !data.sessionToken)return null;
      return data;
    }catch(e){return null;}
  }

  function token(){
    const s=readSession();
    return s ? String(s.sessionToken||'').trim() : '';
  }

  function isBackend(url){
    try{
      const a=new URL(String(url||''),location.href);
      const b=new URL(BACKEND);
      return a.origin===b.origin && a.pathname===b.pathname;
    }catch(e){return false;}
  }

  function apiFromUrl(url){
    try{
      return String(
        new URL(String(url||''),location.href).searchParams.get('api') || ''
      ).trim().toLowerCase();
    }catch(e){return '';}
  }

  function apiFromForm(form){
    try{
      const node=form.querySelector('[name="api"]');
      return String(node&&node.value||'').trim().toLowerCase();
    }catch(e){return '';}
  }

  function bypassApi(api){
    return BYPASS_APIS.has(String(api||'').trim().toLowerCase());
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

  function putField(form,name,value){
    if(!form || !value)return;
    let input=null;
    try{
      input=form.querySelector(
        'input[name="'+name+'"],textarea[name="'+name+'"]'
      );
    }catch(e){}

    if(!input){
      input=document.createElement('input');
      input.type='hidden';
      input.name=name;
      form.appendChild(input);
    }

    if(!String(input.value||'').trim())input.value=value;
  }

  function ensureFormFields(form){
    if(!form || !isBackend(form.action))return;
    const t=token();
    if(!t)return;

    putField(form,'sessionToken',t);
    if(PROJECT_ID){
      putField(form,'project',PROJECT_ID);
      putField(form,'projectId',PROJECT_ID);
    }
  }

  function waitForToken(timeoutMs){
    const existing=token();
    if(existing)return Promise.resolve(existing);

    return new Promise(function(resolve,reject){
      let done=false;
      let timer=null;
      let poll=null;

      function finish(ok,value){
        if(done)return;
        done=true;
        try{window.removeEventListener('WATER_AUTH_OK',onAuth);}catch(e){}
        if(timer)clearTimeout(timer);
        if(poll)clearInterval(poll);
        if(ok)resolve(value);
        else reject(value instanceof Error ? value : new Error(String(value||'AUTH_REQUIRED')));
      }

      function check(){
        const t=token();
        if(t)finish(true,t);
      }

      function onAuth(){
        setTimeout(check,0);
      }

      window.addEventListener('WATER_AUTH_OK',onAuth);
      poll=setInterval(check,120);
      timer=setTimeout(function(){
        finish(false,new Error('AUTH_SESSION_TIMEOUT'));
      },Number(timeoutMs||WAIT_TIMEOUT_MS));
      check();
    });
  }

  function shouldDeferUrl(url){
    return isBackend(url) && !token() && !bypassApi(apiFromUrl(url));
  }

  function shouldDeferForm(form){
    return !!(
      form &&
      isBackend(form.action) &&
      !token() &&
      !bypassApi(apiFromForm(form))
    );
  }

  /* =========================================================
   * FORM POST
   * ======================================================= */
  try{
    const nativeSubmit=HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit=function(){
      const form=this;

      if(!shouldDeferForm(form)){
        ensureFormFields(form);
        return nativeSubmit.apply(form,arguments);
      }

      if(pendingForms.has(form))return;
      pendingForms.add(form);

      waitForToken().then(function(){
        ensureFormFields(form);
        try{nativeSubmit.call(form);}catch(e){}
      }).catch(function(){});
    };
  }catch(e){}

  try{
    const nativeRequestSubmit=HTMLFormElement.prototype.requestSubmit;
    if(nativeRequestSubmit){
      HTMLFormElement.prototype.requestSubmit=function(submitter){
        const form=this;

        if(!shouldDeferForm(form)){
          ensureFormFields(form);
          return nativeRequestSubmit.apply(form,arguments);
        }

        if(pendingForms.has(form))return;
        pendingForms.add(form);

        waitForToken().then(function(){
          ensureFormFields(form);
          try{nativeRequestSubmit.call(form,submitter);}catch(e){}
        }).catch(function(){});
      };
    }
  }catch(e){}

  /* =========================================================
   * FETCH
   * ======================================================= */
  try{
    const nativeFetch=window.fetch;
    if(nativeFetch){
      window.fetch=function(input,init){
        let url='';
        try{url=typeof input==='string' ? input : (input&&input.url)||'';}catch(e){}

        const run=function(){
          try{
            if(typeof input==='string'){
              return nativeFetch.call(window,secureUrl(input),init);
            }
            if(input && input.url && isBackend(input.url)){
              return nativeFetch.call(window,new Request(secureUrl(input.url),input),init);
            }
          }catch(e){}
          return nativeFetch.call(window,input,init);
        };

        if(shouldDeferUrl(url)){
          return waitForToken().then(run);
        }
        return run();
      };
    }
  }catch(e){}

  /* =========================================================
   * SCRIPT / IFRAME GET (JSONP, staffframe, batchstatus...)
   * ======================================================= */
  function patchSrc(proto){
    try{
      const d=Object.getOwnPropertyDescriptor(proto,'src');
      if(!d || !d.get || !d.set)return;

      Object.defineProperty(proto,'src',{
        configurable:d.configurable,
        enumerable:d.enumerable,
        get:d.get,
        set:function(v){
          const node=this;
          const raw=String(v||'');

          if(!shouldDeferUrl(raw)){
            return d.set.call(node,secureUrl(raw));
          }

          try{node.dataset.waterPendingBackendSrc=raw;}catch(e){}
          pendingElements.add(node);
          return raw;
        }
      });
    }catch(e){}
  }

  patchSrc(HTMLScriptElement.prototype);
  patchSrc(HTMLIFrameElement.prototype);

  function flushPendingElements(){
    const t=token();
    if(!t)return;

    Array.from(pendingElements).forEach(function(node){
      let raw='';
      try{raw=String(node.dataset.waterPendingBackendSrc||'');}catch(e){}
      if(!raw){
        pendingElements.delete(node);
        return;
      }

      try{
        delete node.dataset.waterPendingBackendSrc;
        node.src=secureUrl(raw);
      }catch(e){}
      pendingElements.delete(node);
    });
  }

  window.addEventListener('WATER_AUTH_OK',function(){
    setTimeout(flushPendingElements,0);
  });

  /* =========================================================
   * XHR: gắn token khi session đã có.
   * App V20 hiện không dùng XHR cho backend nghiệp vụ trước Auth.
   * ======================================================= */
  try{
    const nativeOpen=XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open=function(method,url){
      const args=Array.prototype.slice.call(arguments);
      args[1]=secureUrl(url);
      return nativeOpen.apply(this,args);
    };
  }catch(e){}

  window.WATER_AUTH_SESSION_TOKEN=function(){return token();};
  window.WATER_AUTH_SESSION_WAIT=function(ms){return waitForToken(ms);};
  window.WATER_AUTH_SESSION_TRANSPORT_BUILD=BUILD;
})();
