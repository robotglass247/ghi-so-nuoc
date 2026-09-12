(function(){
  const note=document.createElement('div'); note.id='offlineReady'; note.style.cssText='font-size:12px;text-align:center;color:#555;padding:3px'; note.textContent='Đang chuẩn bị mở offline…';
  const anchor=document.getElementById('syncStatus'); if(anchor)anchor.after(note);
  async function prepareOffline(){
    if(!('serviceWorker' in navigator)){note.textContent='Trình duyệt chưa hỗ trợ Offline.';return;}
    try{
      await navigator.serviceWorker.register('./sw.js',{scope:'./'}); await navigator.serviceWorker.ready;
      const reg=await navigator.serviceWorker.ready; const worker=navigator.serviceWorker.controller||reg.active;
      if(!worker){note.textContent='Offline sẽ sẵn sàng sau lần tải lại tiếp theo.';return;}
      const ready=await new Promise(resolve=>{const ch=new MessageChannel();const t=setTimeout(()=>resolve(false),5000);ch.port1.onmessage=e=>{clearTimeout(t);resolve(!!(e.data&&e.data.ready))};worker.postMessage('WATER_OFFLINE_STATUS',[ch.port2])});
      note.textContent=ready?'✓ Sẵn sàng mở offline':'Chưa sẵn sàng Offline';
    }catch(e){note.textContent='Chưa sẵn sàng Offline; hãy mở lại khi có mạng.';}
  }
  prepareOffline();
})();
