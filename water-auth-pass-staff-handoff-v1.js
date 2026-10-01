(function(){
  'use strict';

  const BUILD='water-auth-pass-staff-handoff-v1';
  let running=false;
  let completedFor='';

  function norm(v){return String(v==null?'':v).trim().toUpperCase();}
  function wait(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}

  async function handoff(staff){
    const code=norm(staff&&staff.ma);
    const name=String(staff&&staff.ten||'').trim();
    if(!code || running || completedFor===code)return;

    running=true;
    try{
      // Đợi đúng luồng CHỤP SỐ PASS nạp xong: staffSelect + saveStaff().
      const started=Date.now();
      let sel=null;
      let saveFn=null;

      while(Date.now()-started<5000){
        sel=document.getElementById('staffSelect');
        saveFn=window.saveStaff;
        if(sel && typeof saveFn==='function')break;
        await wait(80);
      }

      if(!sel || typeof saveFn!=='function')return;

      // Nếu danh sách nhân sự của App chưa tải kịp, thêm đúng nhân sự đã xác thực
      // để saveStaff() vẫn đi qua đúng luồng PASS.
      let option=Array.from(sel.options||[]).find(function(op){
        return norm(op.value)===code;
      });
      if(!option){
        option=document.createElement('option');
        option.value=code;
        option.textContent=name||code;
        sel.appendChild(option);
      }

      sel.value=code;

      // Gọi chính hàm saveStaff() đã được FINAL10 PASS bọc để tự mở camera.
      saveFn.call(window);
      completedFor=code;

      // Giữ tên hiển thị theo người đã đăng nhập.
      const label=document.getElementById('staffName');
      if(label && name)label.textContent=name;
    }catch(e){
      // Không phá App nếu handoff thất bại; chỉ để lần WATER_AUTH_OK sau thử lại.
    }finally{
      running=false;
    }
  }

  window.addEventListener('WATER_AUTH_OK',function(ev){
    const staff=ev&&ev.detail&&ev.detail.staff || window.WATER_AUTH_STAFF;
    handoff(staff);
  });

  // Trường hợp module nạp sau Auth.
  if(window.WATER_AUTH_OK && window.WATER_AUTH_STAFF){
    handoff(window.WATER_AUTH_STAFF);
  }

  window.WATER_AUTH_PASS_STAFF_HANDOFF_BUILD=BUILD;
})();
