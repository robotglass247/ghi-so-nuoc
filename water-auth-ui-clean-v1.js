(function(){
  'use strict';

  function cleanPlaceholder(){
    var select=document.getElementById('waterAuthStaff');
    if(!select)return false;

    var first=select.querySelector('option[value=""]');
    if(first && first.textContent.trim()!==''){
      first.textContent='';
    }
    return true;
  }

  function start(){
    cleanPlaceholder();
    if(!window.MutationObserver)return;

    var ob=new MutationObserver(function(){
      cleanPlaceholder();
    });

    ob.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
