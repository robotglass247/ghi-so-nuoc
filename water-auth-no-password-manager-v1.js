(function(){
  'use strict';

  const BUILD='water-auth-no-password-manager-v3-text-security';

  function secureField(input){
    if(!input)return;

    try{
      if(input.type==='password')input.type='text';
    }catch(e){}

    input.classList.add('waterSecretField');
    input.setAttribute('autocomplete','off');
    input.setAttribute('autocorrect','off');
    input.setAttribute('autocapitalize','off');
    input.setAttribute('spellcheck','false');
    input.setAttribute('data-lpignore','true');
    input.setAttribute('data-1p-ignore','true');
    input.setAttribute('data-form-type','other');
    input.setAttribute('name','water_access_code_'+String(input.id||'field'));

    if(input.dataset.waterSecretVisible==='1'){
      input.style.setProperty('-webkit-text-security','none');
    }else{
      input.style.setProperty('-webkit-text-security','disc');
    }
  }

  function apply(){
    const gate=document.getElementById('waterAuthGate');
    if(!gate)return;

    const staff=gate.querySelector('#waterAuthStaff');
    if(staff){
      staff.setAttribute('autocomplete','off');
      staff.setAttribute('name','water_staff_name');
    }

    gate.querySelectorAll('input').forEach(function(input){
      const id=String(input.id||'');
      if(/Password/i.test(id))secureField(input);
    });
  }

  function scheduleApply(){
    [0,40,120,300,700].forEach(function(ms){
      setTimeout(apply,ms);
    });
  }

  // Chặn listener 👁 gốc của Auth để input không bị đổi lại thành type=password.
  document.addEventListener('click',function(ev){
    const btn=ev&&ev.target&&ev.target.closest?ev.target.closest('#waterAuthGate .wa-eye'):null;
    if(!btn)return;

    const input=document.getElementById(String(btn.dataset.for||''));
    if(!input)return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    secureField(input);
    const visible=input.dataset.waterSecretVisible!=='1';
    input.dataset.waterSecretVisible=visible?'1':'0';
    input.style.setProperty('-webkit-text-security',visible?'none':'disc');
    btn.setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');
  },true);

  // Sau khi đổi mode Đăng nhập / Đổi mật khẩu, Auth tạo lại input.
  document.addEventListener('click',function(ev){
    const node=ev&&ev.target&&ev.target.closest?ev.target.closest('.wa-tab,#waterAuthBackLogin,#waterAuthChangeMode'):null;
    if(node)scheduleApply();
  },true);

  document.addEventListener('focusin',function(ev){
    const input=ev&&ev.target;
    if(input&&input.matches&&input.matches('#waterAuthGate input')){
      const id=String(input.id||'');
      if(/Password/i.test(id))secureField(input);
    }
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',scheduleApply,{once:true});
  }else{
    scheduleApply();
  }

  window.WATER_AUTH_NO_PASSWORD_MANAGER_BUILD=BUILD;
})();
