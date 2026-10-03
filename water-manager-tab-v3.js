(function(){
'use strict';
const BUILD='water-manager-tab-v3-capture-font-v6';

function installMainTabFont(){
  if(window.WATER_MAIN_TAB_FONT_INSTALLED)return;
  window.WATER_MAIN_TAB_FONT_INSTALLED=true;

  const style=document.createElement('style');
  style.id='waterMainTabFontStyle';
  style.textContent=`
    .waterUnifiedMainTabFont{
      font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
      font-weight:700!important;
      font-style:normal!important;
      letter-spacing:0!important;
      text-shadow:none!important;
      font-kerning:normal!important;
      text-rendering:auto!important;
    }
  `;
  document.head.appendChild(style);

  function label(node){
    return String(node&&node.textContent||'')
      .replace(/\s+/g,' ')
      .trim()
      .toUpperCase();
  }

  function apply(){
    document.querySelectorAll('button,[role="tab"]').forEach(function(node){
      const t=label(node);
      if(t==='DỰ ÁN'||t==='CHỤP SỐ'||t==='QUẢN LÝ'){
        node.classList.add('waterUnifiedMainTabFont');
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',apply,{once:true});
  }else{
    apply();
  }

  const root=document.documentElement;
  if(root){
    const obs=new MutationObserver(apply);
    obs.observe(root,{subtree:true,childList:true});
  }

  [50,150,400,900,1800].forEach(function(ms){setTimeout(apply,ms);});
}

installMainTabFont();

function installAuthFontAndProjectName(){
  if(window.WATER_AUTH_FONT_PROJECT_NAME_INSTALLED)return;
  window.WATER_AUTH_FONT_PROJECT_NAME_INSTALLED=true;

  const style=document.createElement('style');
  style.id='waterAuthUnifiedFontStyle';
  style.textContent=`
    #waterAuthGate,
    #waterAuthGate *{
      font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
      font-style:normal!important;
      letter-spacing:0!important;
      text-shadow:none!important;
      font-kerning:normal!important;
      text-rendering:auto!important;
    }
    #waterAuthGate .wa-brand-title{
      font-weight:700!important;
    }
    #waterAuthGate .wa-tab,
    #waterAuthGate label,
    #waterAuthGate .wa-main{
      font-weight:700!important;
    }
    #waterAuthGate .wa-sub{
      font-weight:500!important;
    }
  `;
  document.head.appendChild(style);

  let projectName='';

  function txt(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}

  function projectNameFromRaw(raw){
    if(raw&&typeof raw==='object'){
      const direct=txt(raw.name||raw.projectName||raw.tenDuAn||raw.ten_du_an);
      if(direct)return direct;
      raw=raw.project||raw.raw||'';
    }

    const s=txt(raw);
    if(!s)return '';

    let m=s.match(/(?:^|·)\s*Dự\s*án\s*:\s*([^·]+)/i);
    if(m&&txt(m[1]))return txt(m[1]);

    m=s.match(/(?:^|·)\s*Tên\s*dự\s*án\s*:\s*([^·]+)/i);
    if(m&&txt(m[1]))return txt(m[1]);

    if(s.indexOf('·')<0 && s.length<=120)return s;
    return '';
  }

  function updateProjectLabel(){
    if(!projectName)return;
    const gate=document.getElementById('waterAuthGate');
    if(!gate)return;
    const sub=gate.querySelector('.wa-sub');
    if(!sub)return;

    const current=txt(sub.textContent);
    const wanted='Dự án: '+projectName;
    if(current===wanted)return;

    sub.textContent='';
    sub.appendChild(document.createTextNode('Dự án: '));
    const b=document.createElement('b');
    b.textContent=projectName;
    sub.appendChild(b);
  }

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    const name=projectNameFromRaw(d.project);
    if(!name)return;
    projectName=name;
    updateProjectLabel();
    [50,150,400,900].forEach(function(ms){
      setTimeout(updateProjectLabel,ms);
    });
  });

  try{
    const cached=txt(localStorage.getItem('water_project_info_sheet_v2'));
    const name=projectNameFromRaw(cached);
    if(name)projectName=name;
  }catch(e){}

  function startObserve(){
    const root=document.documentElement;
    if(!root)return;
    const obs=new MutationObserver(function(){
      if(projectName)updateProjectLabel();
    });
    obs.observe(root,{subtree:true,childList:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      startObserve();
      updateProjectLabel();
    },{once:true});
  }else{
    startObserve();
    updateProjectLabel();
  }
}

installAuthFontAndProjectName();

function installCaptureUnifiedFont(){
  if(window.WATER_CAPTURE_UNIFIED_FONT_INSTALLED)return;
  window.WATER_CAPTURE_UNIFIED_FONT_INSTALLED=true;

  const style=document.createElement('style');
  style.id='waterCaptureUnifiedFontStyle';
  style.textContent=`
    #statusMain,
    #statusSub,
    #syncStatus,
    #appFooter,
    .waterCaptureUnifiedFont{
      font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
      font-style:normal!important;
      letter-spacing:0!important;
      font-kerning:normal!important;
      text-rendering:auto!important;
    }
    .waterCaptureUnifiedFont{
      text-shadow:none!important;
    }
  `;
  document.head.appendChild(style);

  function text(node){
    return String(node&&node.textContent||'')
      .replace(/\s+/g,' ')
      .trim()
      .toUpperCase();
  }

  function isCaptureLabel(t){
    return t==='SẴN SÀNG CHỤP ĐỒNG HỒ' ||
      t==='ĐƯA ĐỒNG HỒ + QR VÀO KHUNG.' ||
      t==='ĐƯA ĐỒNG HỒ + QR VÀO KHUNG' ||
      t==='ĐỒNG BỘ NGAY' ||
      t==='ĐĂNG XUẤT';
  }

  function apply(){
    document.querySelectorAll('button,h1,h2,h3,h4,p,div,span').forEach(function(node){
      if(node.id==='waterAuthGate'||node.closest&&node.closest('#waterAuthGate'))return;
      const t=text(node);
      if(isCaptureLabel(t))node.classList.add('waterCaptureUnifiedFont');
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',apply,{once:true});
  }else{
    apply();
  }

  const root=document.documentElement;
  if(root){
    let queued=false;
    const obs=new MutationObserver(function(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(function(){queued=false;apply();});
    });
    obs.observe(root,{subtree:true,childList:true,characterData:true});
  }

  [50,150,400,900,1800].forEach(function(ms){setTimeout(apply,ms);});
}

installCaptureUnifiedFont();

function roundConsumption(v){
  if(v===null||v===undefined||v==='')return v;
  const n=typeof v==='number'?v:Number(String(v).replace(',','.'));
  return Number.isFinite(n)?Math.round(n):v;
}

function installMonthDataRounder(){
  if(window.WATER_MONTHDATA_ROUNDER_INSTALLED)return;
  window.WATER_MONTHDATA_ROUNDER_INSTALLED=true;

  const head=document.head;
  if(!head)return;
  const nativeAppend=head.appendChild.bind(head);

  head.appendChild=function(node){
    try{
      if(node&&node.tagName==='SCRIPT'&&node.src){
        const u=new URL(node.src,location.href);
        if(String(u.searchParams.get('api')||'').toLowerCase()==='monthdata'){
          const cb=String(u.searchParams.get('callback')||'');
          const original=cb&&window[cb];
          if(typeof original==='function'){
            window[cb]=function(data){
              try{
                if(data&&Array.isArray(data.rows)){
                  data.rows.forEach(function(r){
                    if(Array.isArray(r)&&r.length>6)r[6]=roundConsumption(r[6]);
                  });
                }
              }catch(e){}
              return original(data);
            };
          }
        }
      }
    }catch(e){}
    return nativeAppend(node);
  };
}

installMonthDataRounder();

function load(src,done){
  const s=document.createElement('script');
  s.src=src;
  s.async=false;
  if(done)s.onload=done;
  document.head.appendChild(s);
}
const stamp=Date.now();
load('./water-manager-bql-message-relay-v1.js?v=2&bridge='+stamp,function(){
  load('./water-manager-embed-pass-v1.js?v=1&bridge='+stamp);
});
window.WATER_MANAGER_TAB_V3_BUILD=BUILD;
})();