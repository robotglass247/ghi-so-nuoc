/* ============================================================
MODULE_ID: 09-TRANSPORT
MODULE_NAME: auth-post-nocors
VERSION: 1.0.0-DEV
STATUS: DEV ONLY
PURPOSE:
  Intercept only the AUTH hidden form submission used by Module 09 v1.3.0
  and send it as a simple cross-origin POST with fetch(mode:'no-cors').
  The response is intentionally not read; Module 09 polls the short JSONP
  result using the nonce.
RULE:
  Never load this file in Production.
============================================================ */
(function(){
  'use strict';

  if(window.WATER_AUTH_POST_NOCORS) return;

  const nativeSubmit=HTMLFormElement.prototype.submit;

  HTMLFormElement.prototype.submit=function(){
    try{
      const form=this;
      const target=String(form.target||'');
      const action=String(form.action||'');
      const cfg=window.WATER_AUTH_CONFIG||{};

      const isAuthPost=
        target==='waterAuthPostFrame' &&
        cfg.AUTH_GATEWAY_URL &&
        action.indexOf(cfg.AUTH_GATEWAY_URL)===0;

      if(!isAuthPost){
        return nativeSubmit.call(form);
      }

      const body=new URLSearchParams();
      Array.prototype.forEach.call(form.elements||[],function(el){
        if(!el||!el.name||el.disabled) return;
        body.append(el.name,String(el.value==null?'':el.value));
      });

      fetch(cfg.AUTH_GATEWAY_URL,{
        method:'POST',
        mode:'no-cors',
        credentials:'omit',
        cache:'no-store',
        body:body
      }).catch(function(err){
        console.error('AUTH no-cors POST failed',err);
      });

      return undefined;
    }catch(err){
      console.error('AUTH transport fallback',err);
      return nativeSubmit.call(this);
    }
  };

  window.WATER_AUTH_POST_NOCORS=Object.freeze({
    BUILD:'auth-post-nocors-v1.0.0-dev'
  });
})();
