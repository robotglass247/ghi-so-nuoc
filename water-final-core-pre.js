(function(){
  'use strict';
  // Giữ nguyên các hàm camera/QR của lõi SPEED3 trước khi nạp UI3.
  window.__WATER_FINAL_CORE_UI__={
    setStatus:window.setStatus,
    acceptLiveQR:window.acceptLiveQR,
    statusSub:document.getElementById('statusSub')
  };
})();
