(function(){
  'use strict';

  const MODULE_ID='water-system-denied-notice-r1131';
  const VERSION='1.0.0';
  const DENIED_MESSAGE='Bạn chưa được cấp quyền, Vui lòng liên hệ quản lý';

  function showDeniedNotice(){
    let notice=document.getElementById('waterSystemDeniedNoticeR1131');

    if(!notice){
      notice=document.createElement('div');
      notice.id='waterSystemDeniedNoticeR1131';
      notice.setAttribute('role','alert');
      notice.setAttribute('aria-live','assertive');

      Object.assign(notice.style,{
        position:'fixed',
        left:'50%',
        top:'50%',
        transform:'translate(-50%,-50%)',
        zIndex:'2147483647',
        width:'calc(100% - 40px)',
        maxWidth:'390px',
        boxSizing:'border-box',
        padding:'18px 20px',
        borderRadius:'14px',
        background:'rgba(20,20,20,.94)',
        color:'#fff',
        fontFamily:'Arial,sans-serif',
        fontSize:'16px',
        fontWeight:'700',
        lineHeight:'1.45',
        textAlign:'center',
        boxShadow:'0 10px 30px rgba(0,0,0,.28)'
      });

      document.body.appendChild(notice);
    }

    notice.textContent=DENIED_MESSAGE;
    notice.style.display='block';

    clearTimeout(showDeniedNotice._timer);
    showDeniedNotice._timer=setTimeout(function(){
      try{
        if(notice && notice.parentNode){
          notice.parentNode.removeChild(notice);
        }
      }catch(e){}

      const manageTab=document.getElementById('waterTabManage');
      if(manageTab && typeof manageTab.click==='function'){
        manageTab.click();
      }
    },2000);
  }

  document.addEventListener('click',function(ev){
    const target=ev.target && ev.target.closest
      ? ev.target.closest('#waterSystemFileR118')
      : null;

    if(!target)return;

    // Được cấp quyền: để nguyên handler R11.31 xử lý.
    if(target.getAttribute('data-system-access')==='allowed'){
      return;
    }

    // Chưa được cấp quyền: chỉ chặn thao tác này và hiện thông báo riêng.
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

    showDeniedNotice();
  },true);

  window.WATER_SYSTEM_DENIED_NOTICE_BUILD=MODULE_ID+'@'+VERSION;
})();
