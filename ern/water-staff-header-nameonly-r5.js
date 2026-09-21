(function(){
  'use strict';

  const BUILD='879-final10-postcapture-r5-nameonly';
  let writing=false;

  function el(id){return document.getElementById(id);}

  function selectedName(){
    let code='';
    try{if(typeof getStaffCode==='function')code=String(getStaffCode()||'').trim();}catch(e){}

    let list=[];
    try{if(typeof staffList!=='undefined'&&Array.isArray(staffList))list=staffList;}catch(e){}

    const found=code ? list.find(function(x){return x&&String(x.ma||'').trim()===code;}) : null;
    const name=found ? String(found.ten||'').trim() : '';

    if(name)return name;
    if(code)return 'Đang tải nhân sự...';
    return 'Chưa chọn nhân sự';
  }

  function renderNameOnly(){
    const node=el('staffName');
    if(!node||writing)return;
    const text=selectedName();
    if(String(node.textContent||'')===text)return;
    writing=true;
    node.textContent=text;
    writing=false;
  }

  const base=window.updateStaffName;
  if(typeof base==='function'){
    const wrapped=function(){
      let result;
      try{result=base.apply(this,arguments);}finally{renderNameOnly();}
      return result;
    };
    window.updateStaffName=wrapped;
    try{updateStaffName=wrapped;}catch(e){}
  }

  const node=el('staffName');
  if(node&&window.MutationObserver){
    new MutationObserver(function(){renderNameOnly();})
      .observe(node,{childList:true,characterData:true,subtree:true});
  }

  window.addEventListener('pageshow',renderNameOnly);
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible')renderNameOnly();
  });
  setTimeout(renderNameOnly,0);
  setTimeout(renderNameOnly,700);
  setInterval(renderNameOnly,3000);

  window.WATER_STAFF_HEADER_NAMEONLY_BUILD=BUILD;
})();
