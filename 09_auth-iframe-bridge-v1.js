/* ============================================================
MODULE_ID: 09-BRIDGE
MODULE_NAME: auth-iframe-bridge
VERSION: 1.0.0-DEV
STATUS: DEV ONLY
PURPOSE:
  Apps Script HtmlService can return from a nested iframe.
  Module 09 v1.1.1 expects event.source === gatewayFrame.contentWindow.
  This bridge safely re-dispatches the validated-shaped message with
  the expected source so the existing DEV auth module can receive it.
RULE: Never load this module in Production.
============================================================ */
(function(){
  'use strict';

  function onGatewayMessage(ev){
    const msg=ev&&ev.data;
    if(!msg||msg.type!=='WATER_AUTH_GATEWAY_RESULT') return;
    if(msg.__waterAuthBridge===1) return;
    if(!msg.nonce||typeof msg.nonce!=='string') return;
    if(!msg.payload||typeof msg.payload!=='object') return;

    const frame=document.getElementById('waterAuthGatewayFrame');
    if(!frame||!frame.contentWindow) return;

    const forwarded={
      type:'WATER_AUTH_GATEWAY_RESULT',
      nonce:msg.nonce,
      payload:msg.payload,
      __waterAuthBridge:1
    };

    try{
      const synthetic=new MessageEvent('message',{
        data:forwarded,
        origin:String(ev.origin||''),
        source:frame.contentWindow
      });
      window.dispatchEvent(synthetic);
    }catch(_e){
      try{
        const synthetic=document.createEvent('MessageEvent');
        synthetic.initMessageEvent(
          'message',true,true,forwarded,String(ev.origin||''),'',frame.contentWindow,null
        );
        window.dispatchEvent(synthetic);
      }catch(__e){}
    }
  }

  window.addEventListener('message',onGatewayMessage,false);

  window.WATER_AUTH_IFRAME_BRIDGE=Object.freeze({
    BUILD:'auth-iframe-bridge-v1.0.0-dev'
  });
})();
