(function(){
  'use strict';

  const BUILD='water-auth-no-password-manager-v2-light';

  function tuneInput(input){
    if(!input)return;
    input.setAttribute('autocomplete','one-time-code');
    input.setAttribute('autocorrect','off');
    input.setAttribute('autocapitalize','off');
    input.setAttribute('spellcheck','false');
    input.setAttribute('aria-autocomplete','none');
    input.setAttribute('data-lpignore','true');
    input.setAttribute('data-1p-ignore','true');
    input.setAttribute('data-form-type','other');
    input.setAttribute('name','water_access_code_'+String(input.id||'password'));
  }

  function apply(root){
    root=root||document;
    const staff=root.querySelector&&root.querySelector('#waterAuthStaff');
    if(staff){
      staff.setAttribute('autocomplete','off');
      staff.setAttribute('name','water_staff_name');
      staff.setAttribute('data-form-type','other');
    }

    if(root.querySelectorAll){
      root.querySelectorAll('#waterAuthGate input[type="password"]').forEach(tuneInput);
    }
  }

  function settle(){
    [0,60,180,450,900].forEach(function(ms){
      setTimeout(function(){apply(document);},ms);
    });
  }

  document.addEventListener('focusin',function(ev){
    const t=ev&&ev.target;
    if(t&&t.matches&&t.matches('#waterAuthGate input[type="password"]'))tuneInput(t);
  },true);

  document.addEventListener('click',function(ev){
    const t=ev&&ev.target&&ev.target.closest?ev.target.closest('.wa-tab-change,.wa-tab-login,#waterAuthChangeMode,#waterAuthBackLogin'):null;
    if(!t)return;
    setTimeout(function(){apply(document);},0);
    setTimeout(function(){apply(document);},80);
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',settle,{once:true});
  }else{
    settle();
  }

  window.WATER_AUTH_NO_PASSWORD_MANAGER_BUILD=BUILD;
})();
