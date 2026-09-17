(function(){
  'use strict';

  const BUILD='waterops-pro-pwa-v1';
  let deferredPrompt=null;
  let panel=null;

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
  }

  function isIOS(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent||'');
  }

  function setTitle(){
    try{document.title='WaterOps Pro';}catch(e){}
  }

  function removePanel(){
    if(panel&&panel.parentNode)panel.parentNode.removeChild(panel);
    panel=null;
  }

  function showMessage(title,body){
    if(!panel)return;
    const t=panel.querySelector('[data-waterops-title]');
    const b=panel.querySelector('[data-waterops-body]');
    if(t)t.textContent=title;
    if(b)b.innerHTML=body;
  }

  function buildPanel(){
    if(isStandalone()||panel||document.getElementById('wateropsInstallPanel'))return;

    const box=document.createElement('div');
    box.id='wateropsInstallPanel';
    box.style.cssText='position:fixed;left:12px;right:12px;bottom:14px;z-index:2147483000;background:#fff;color:#18232d;border:1px solid #cfd8e3;border-radius:16px;box-shadow:0 10px 32px rgba(0,0,0,.22);padding:14px 14px 12px;font-family:Arial,sans-serif;max-width:520px;margin:auto';
    box.innerHTML=''
      +'<button type="button" data-waterops-close aria-label="Đóng" style="position:absolute;right:8px;top:7px;border:0;background:transparent;font-size:22px;line-height:1;width:34px;height:34px;padding:0;color:#5d6975">×</button>'
      +'<div data-waterops-title style="font-size:17px;font-weight:900;color:#174a7e;padding-right:36px">CÀI WATEROPS PRO</div>'
      +'<div data-waterops-body style="font-size:13px;line-height:1.45;margin-top:5px;color:#4d5b68">Cài ứng dụng lên màn hình điện thoại. Từ lần sau mở bằng icon và không hiện thanh địa chỉ trình duyệt.</div>'
      +'<button type="button" data-waterops-install style="margin-top:11px;width:100%;border:0;border-radius:11px;background:#174a7e;color:#fff;font:800 15px Arial;padding:12px 10px">CÀI WATEROPS PRO</button>';

    document.body.appendChild(box);
    panel=box;

    box.querySelector('[data-waterops-close]').addEventListener('click',removePanel);
    box.querySelector('[data-waterops-install]').addEventListener('click',async function(){
      if(deferredPrompt){
        try{
          deferredPrompt.prompt();
          const result=await deferredPrompt.userChoice;
          if(result&&result.outcome==='accepted')removePanel();
        }catch(e){}
        deferredPrompt=null;
        return;
      }

      if(isIOS()){
        showMessage('CÀI WATEROPS PRO','Trên iPhone/iPad: bấm <b>Chia sẻ</b> của Safari → chọn <b>Thêm vào Màn hình chính</b> → <b>Thêm</b>.');
      }else{
        showMessage('CÀI WATEROPS PRO','Mở menu trình duyệt <b>⋮</b> → chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b>.');
      }
    });
  }

  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();
    deferredPrompt=e;
    setTimeout(buildPanel,100);
  });

  window.addEventListener('appinstalled',function(){
    deferredPrompt=null;
    removePanel();
  });

  window.addEventListener('pageshow',function(){
    setTitle();
    if(!isStandalone())setTimeout(buildPanel,1600);
  });

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible')setTitle();
  });

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      setTitle();
      if(!isStandalone())setTimeout(buildPanel,1600);
    },{once:true});
  }else{
    setTitle();
    if(!isStandalone())setTimeout(buildPanel,1600);
  }

  window.WATEROPS_PWA_BUILD=BUILD;
})();
