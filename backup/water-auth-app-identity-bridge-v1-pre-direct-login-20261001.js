(function(){
  'use strict';

  const BUILD='water-auth-app-identity-bridge-v1';

  function clearIdentity(){
    try{localStorage.removeItem('water_staff');}catch(e){}
  }

  function setIdentity(staff){
    const code=String(staff&&staff.ma||'').trim().toUpperCase();
    if(!code)return;
    try{localStorage.setItem('water_staff',code);}catch(e){}
  }

  // Mỗi lần mở App, xóa mã nhân sự cũ trước khi Auth xác thực phiên/tab.
  clearIdentity();

  // Sau khi Auth V3 xác thực thành công, đồng bộ đúng mã nhân sự cho lõi CHỤP SỐ.
  window.addEventListener('WATER_AUTH_OK',function(ev){
    const detail=ev&&ev.detail;
    setIdentity(detail&&detail.staff);
  });

  // Đăng xuất phải xóa luôn nhận diện legacy của App.
  document.addEventListener('click',function(ev){
    const node=ev&&ev.target&&ev.target.closest?ev.target.closest('#waterAuthLogout'):null;
    if(node)clearIdentity();
  },true);

  window.WATER_AUTH_IDENTITY_BRIDGE_BUILD=BUILD;
})();
