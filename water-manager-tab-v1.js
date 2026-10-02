(function(){
  'use strict';

  const BUILD='water-manager-tab-v1-app-session-sso';
  const params=new URLSearchParams(location.search);
  const PROJECT=String(params.get('project')||params.get('projectId')||window.WATER_PROJECT_ID||'').trim().toUpperCase();
  const APP_KEY='water_auth_v3_'+PROJECT;
  const BQL_KEY='water_bql_auth_v20_'+PROJECT;
  const MANAGER_URL='./quan-ly-v20-r6.html?project='+encodeURIComponent(PROJECT)+'&from=app&embed=1&v=app-sso-1';
  let overlay=null;
  let applying=false;

  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function readSession(){
    try{
      const d=JSON.parse(sessionStorage.getItem(APP_KEY)||'null');
      return d&&d.sessionToken&&d.staff?d:null;
    }catch(e){return null;}
  }
  function staff(){
    const s=readSession();
    return (window.WATER_AUTH_STAFF)||(s&&s.staff)||null;
  }
  function isManager(x){
    const r=norm(x&&(x.quyen||x.role||x.phanQuyen||x.permission));
    return r==='quan ly'||r==='bql'||r==='admin'||r==='quan tri'||r==='administrator';
  }
  function clickables(root){
    return Array.from((root||document).querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]'));
  }
  function labelOf(el){return norm(el&&(el.innerText||el.textContent||el.value||el.getAttribute('aria-label')||''));}
  function findDataCard(){
    const all=Array.from(document.querySelectorAll('section,div,main,article'));
    let best=null,bestScore=1e9;
    all.forEach(function(el){
      const t=norm(el.innerText||el.textContent||'');
      if(t.indexOf('du lieu ghi chi so')<0 || t.indexOf('xem chi so')<0)return;
      const score=(el.innerText||el.textContent||'').length;
      if(score<bestScore){best=el;bestScore=score;}
    });
    return best;
  }
  function findByLabel(root,label){
    const n=norm(label);
    return clickables(root).find(function(el){return labelOf(el)===n;})||null;
  }
  function removeOldStandaloneManager(root){
    Array.from(document.querySelectorAll('button,a,[role="button"],div')).forEach(function(el){
      if(el.id==='waterManagerTabV1')return;
      const n=labelOf(el);
      if(n.indexOf('trang quan ly chi so nuoc')===0){
        if(root&&root.contains(el))return;
        el.style.setProperty('display','none','important');
      }
    });
  }
  function styleButton(btn,allowed){
    btn.classList.add('waterManagerTabV1');
    btn.style.setProperty('font-weight','800','important');
    btn.style.setProperty('transition','opacity .15s ease,filter .15s ease','important');
    if(allowed){
      btn.disabled=false;
      btn.setAttribute('aria-disabled','false');
      btn.style.setProperty('opacity','1','important');
      btn.style.setProperty('filter','none','important');
      btn.style.setProperty('cursor','pointer','important');
      btn.title='Mở Trang quản lý bằng tài khoản đang đăng nhập';
    }else{
      btn.disabled=true;
      btn.setAttribute('aria-disabled','true');
      btn.style.setProperty('opacity','.42','important');
      btn.style.setProperty('filter','grayscale(1)','important');
      btn.style.setProperty('cursor','not-allowed','important');
      btn.title='Chỉ tài khoản Quản lý được sử dụng Trang quản lý';
    }
  }
  function makeManagerButton(card){
    let btn=document.getElementById('waterManagerTabV1');
    if(btn&&card.contains(btn))return btn;

    const old=findByLabel(card,'FILE HỆ THỐNG');
    if(old){
      const clone=old.cloneNode(true);
      clone.id='waterManagerTabV1';
      if(clone.tagName==='INPUT')clone.value='TRANG QUẢN LÝ';
      else clone.textContent='TRANG QUẢN LÝ';
      clone.removeAttribute('href');
      clone.removeAttribute('target');
      try{clone.type='button';}catch(e){}
      old.replaceWith(clone);
      return clone;
    }

    const view=findByLabel(card,'XEM CHỈ SỐ');
    const download=findByLabel(card,'TẢI FILE');
    const template=view||download;
    if(!template)return null;
    btn=template.cloneNode(true);
    btn.id='waterManagerTabV1';
    if(btn.tagName==='INPUT')btn.value='TRANG QUẢN LÝ';
    else btn.textContent='TRANG QUẢN LÝ';
    btn.removeAttribute('href');
    try{btn.type='button';}catch(e){}
    const parent=template.parentElement;
    if(parent)parent.insertBefore(btn,parent.firstChild);
    return btn;
  }
  function closeManager(){
    if(!overlay)return;
    try{overlay.remove();}catch(e){}
    overlay=null;
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
  }
  function openManager(){
    const s=readSession();
    const u=staff();
    if(!s||!isManager(u))return;

    try{
      sessionStorage.setItem(BQL_KEY,JSON.stringify({sessionToken:String(s.sessionToken||''),expiresAt:Number(s.expiresAt||0),staff:s.staff||u}));
      sessionStorage.setItem('water_manager_return_'+PROJECT,location.href);
    }catch(e){}

    closeManager();
    overlay=document.createElement('div');
    overlay.id='waterManagerOverlayV1';
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#f4f7f9;display:flex;flex-direction:column;font-family:Segoe UI,Tahoma,Arial,sans-serif;';

    const bar=document.createElement('div');
    bar.style.cssText='height:48px;min-height:48px;padding:6px 10px;background:#fff;border-bottom:1px solid #d6e0e7;display:flex;align-items:center;gap:10px;box-sizing:border-box;';
    const back=document.createElement('button');
    back.type='button';
    back.textContent='← ỨNG DỤNG GHI SỐ';
    back.style.cssText='height:34px;padding:0 12px;border:1px solid #c7d4dd;border-radius:8px;background:#fff;color:#173d59;font-weight:800;cursor:pointer;';
    back.onclick=closeManager;
    const title=document.createElement('div');
    title.textContent='TRANG QUẢN LÝ';
    title.style.cssText='font-weight:900;color:#1d3345;flex:1;text-align:center;';
    const who=document.createElement('div');
    who.textContent=txt(u&&u.ten)||txt(u&&u.ma)||'Quản lý';
    who.style.cssText='font-size:12px;font-weight:700;color:#607080;white-space:nowrap;';
    bar.append(back,title,who);

    const frame=document.createElement('iframe');
    frame.id='waterManagerFrameV1';
    frame.title='Trang quản lý chỉ số nước';
    frame.style.cssText='border:0;width:100%;flex:1;min-height:0;background:#f4f7f9;';
    frame.src='about:blank';
    overlay.append(bar,frame);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';

    try{frame.contentWindow.sessionStorage.setItem(BQL_KEY,sessionStorage.getItem(BQL_KEY)||'');}catch(e){}
    frame.src=MANAGER_URL;
    frame.addEventListener('load',function(){
      try{
        const d=frame.contentDocument;
        if(!d)return;
        const st=d.createElement('style');
        st.textContent='#waterBqlLogout{display:none!important}';
        d.head.appendChild(st);
      }catch(e){}
    });
  }
  function bind(btn){
    if(btn.dataset.waterManagerBound==='1')return;
    btn.dataset.waterManagerBound='1';
    btn.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if(!isManager(staff()))return false;
      openManager();
      return false;
    },true);
  }
  function apply(){
    if(applying)return;
    applying=true;
    try{
      const card=findDataCard();
      if(!card)return;
      const btn=makeManagerButton(card);
      if(!btn)return;
      bind(btn);
      styleButton(btn,isManager(staff()));
      removeOldStandaloneManager(card);
    }finally{applying=false;}
  }
  function schedule(){[0,80,220,600,1200].forEach(function(ms){setTimeout(apply,ms);});}

  window.addEventListener('WATER_AUTH_OK',schedule);
  document.addEventListener('DOMContentLoaded',schedule,{once:true});
  if(document.readyState!=='loading')schedule();
  if(window.MutationObserver){
    const ob=new MutationObserver(function(){setTimeout(apply,0);});
    function startObserver(){if(document.body)ob.observe(document.body,{childList:true,subtree:true});}
    if(document.body)startObserver();else document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  }

  window.WATER_MANAGER_TAB_BUILD=BUILD;
  window.WATER_MANAGER_TAB_OPEN=openManager;
})();
