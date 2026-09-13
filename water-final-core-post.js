(function(){
  'use strict';
  const saved=window.__WATER_FINAL_CORE_UI__||{};

  // Trả lại đúng hàm lõi sau khi UI3 đã nạp xong.
  if(typeof saved.setStatus==='function'){
    window.setStatus=saved.setStatus;
    try{setStatus=saved.setStatus;}catch(e){}
  }
  if(typeof saved.acceptLiveQR==='function'){
    window.acceptLiveQR=saved.acceptLiveQR;
    try{acceptLiveQR=saved.acceptLiveQR;}catch(e){}
  }

  // Tách observer hướng dẫn cũ của UI3 khỏi statusSub đang dùng thật.
  // Core luôn truy cập statusSub bằng id nên clone này không đổi logic lõi.
  const current=document.getElementById('statusSub');
  if(current && saved.statusSub===current && current.parentNode){
    const fresh=current.cloneNode(true);
    current.replaceWith(fresh);
  }
})();
