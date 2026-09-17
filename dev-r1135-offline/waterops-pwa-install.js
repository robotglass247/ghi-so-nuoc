(function(){
  'use strict';

  const BUILD='waterops-pro-pwa-v4';
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

  function showInstalledFallback(){
    if(isStandalone())return;
    let done=document.getElementById('wateropsInstalledDone');
    if(done)return;
    done=document.createElement('div');
    done.id='wateropsInstalledDone';
    done.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f4f6fa;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arial,sans-serif;text-align:center';
    done.innerHTML='<div style="max-width:420px;background:#fff;border:1px solid #d8e0e8;border-radius:18px;padding:24px 18px;box-shadow:0 8px 28px rgba(0,0,0,.12)"><div style="font-size:20px;font-weight:900;color:#174a7e">ĐÃ CÀI WATEROPS PRO</div><div style="margin-top:10px;font-size:14px;line-height:1.5;color:#4d5b68">Đóng trình duyệt và mở icon <b>WATEROPS PRO</b> trên màn hình điện thoại.</div></div>';
    document.body.appendChild(done);
  }

  function leaveBrowserAfterInstall(){
    try{localStorage.setItem('waterops_pwa_installed','1');}catch(e){}
    setTimeout(function(){
      if(isStandalone())return;
      try{window.close();}catch(e){}
      setTimeout(function(){
        if(isStandalone()||document.visibilityState==='hidden')return;
        try{
          if(history.length>1){
            history.back();
            setTimeout(function(){
              if(document.visibilityState!=='hidden')showInstalledFallback();
            },700);
            return;
          }
        }catch(e){}
        showInstalledFallback();
      },220);
    },300);
  }

  function buildPanel(){
    if(isStandalone()||panel||document.getElementById('wateropsInstallPanel'))return;

    const box=document.createElement('div');
    box.id='wateropsInstallPanel';
    box.style.cssText='position:fixed;left:12px;right:12px;bottom:14px;z-index:2147483000;background:#fff;color:#18232d;border:1px solid #cfd8e3;border-radius:16px;box-shadow:0 10px 32px rgba(0,0,0,.22);padding:14px 14px 12px;font-family:Arial,sans-serif;max-width:520px;margin:auto';
    box.innerHTML=''
      +'<button type="button" data-waterops-close aria-label="Đóng" style="position:absolute;right:8px;top:7px;border:0;background:transparent;font-size:22px;line-height:1;width:34px;height:34px;padding:0;color:#5d6975">×</button>'
      +'<div data-waterops-title style="font-size:17px;font-weight:900;color:#174a7e;padding-right:36px">CÀI WATEROPS PRO</div>'
      +'<div data-waterops-body style="font-size:13px;line-height:1.45;margin-top:5px;color:#4d5b68">Cài ứng dụng lên màn hình</div>'
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
        showMessage('CÀI WATEROPS PRO','Trên Chrome Android: bấm menu <b>⋮</b> → <b>Cài đặt và tạo lối tắt</b> → <b>Cài đặt</b>.');
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
    leaveBrowserAfterInstall();
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
