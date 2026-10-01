(function(){
  'use strict';

  const BUILD='water-auth-no-password-manager-v1';

  function apply(root){
    root=root||document;

    const staff=root.querySelector&&root.querySelector('#waterAuthStaff');
    if(staff){
      staff.setAttribute('autocomplete','off');
      staff.setAttribute('name','water_staff_name');
    }

    if(root.querySelectorAll){
      root.querySelectorAll('#waterAuthGate input[type="password"]').forEach(function(input){
        input.setAttribute('autocomplete','one-time-code');
        input.setAttribute('autocorrect','off');
        input.setAttribute('autocapitalize','off');
        input.setAttribute('spellcheck','false');
        input.setAttribute('name','water_access_code_'+String(input.id||'password'));
        input.setAttribute('data-lpignore','true');
        input.setAttribute('data-1p-ignore','true');
      });
    }
  }

  function settle(){
    [0,40,120,300,700,1500,3000].forEach(function(ms){
      setTimeout(function(){apply(document);},ms);
    });
  }

  if(window.MutationObserver){
    const ob=new MutationObserver(function(records){
      let changed=false;
      for(const r of records){
        if(r.addedNodes&&r.addedNodes.length){changed=true;break;}
      }
      if(changed)apply(document);
    });
    ob.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',settle,{once:true});
  }else{
    settle();
  }

  window.WATER_AUTH_NO_PASSWORD_MANAGER_BUILD=BUILD;
})();
