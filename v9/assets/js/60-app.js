function updateNet(){
  byId('net').textContent=navigator.onLine?'● ONLINE':'● OFFLINE';
}

window.addEventListener('online',()=>{
  updateNet();
  byId('debug').textContent='ĐÃ CÓ MẠNG · hệ thống tự đồng bộ, không cần bấm nút.';
  scheduleAutoSync(500);
});

window.addEventListener('offline',()=>{
  clearTimeout(autoSyncTimer);
  updateNet();
  byId('debug').textContent='OFFLINE · ảnh sẽ lưu trong Chờ, khi có mạng sẽ tự đồng bộ.';
});

// Trình duyệt có thể tạm ngưng tác vụ khi khóa màn hình.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')scheduleAutoSync(100);
});
window.addEventListener('pageshow',()=>scheduleAutoSync(100));
setInterval(()=>{
  if(db && navigator.onLine && !syncRunning && document.visibilityState==='visible'){
    scheduleAutoSync(100);
  }
},15000);

async function init(){
  updateNet();
  await initDetector();
  await openDB();
  const removedTests=await removeApprovedOldTests();
  if(removedTests)toast('ĐÃ XÓA '+removedTests+' ẢNH TEST P3-3SH1',4000);
  await restoreQueuedReceipts();
  await updatePending();
  loadLocalStaffFirst();
  loadStaff(false);
  updateStaffName();

  if(navigator.onLine){
    scheduleAutoSync(1200);
  }else{
    byId('debug').textContent='OFFLINE · ảnh sẽ lưu trong Chờ, khi có mạng sẽ tự đồng bộ.';
  }
}

const captureEvidence=document.createElement('div');
captureEvidence.id='captureEvidence';
captureEvidence.style.cssText='font-size:13px;padding:6px;color:#165675;overflow-wrap:anywhere';
captureEvidence.textContent='V9.0.0 · Sẵn sàng kiểm tra chụp thay thế';
byId('syncStatus').after(captureEvidence);
init();
