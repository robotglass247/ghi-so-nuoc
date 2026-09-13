(function(){
  'use strict';

  const BUILD='879-r10.2-project-no-code-image';
  const PROJECT_CACHE_KEY='water_project_row2';
  const PROJECT_IMAGE_CACHE_KEY='water_project_image_v1';
  let latestProjectRaw='';
  let latestProjectImage='';

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function normKey(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}

  function readCache(){
    try{
      if(!latestProjectRaw)latestProjectRaw=txt(localStorage.getItem(PROJECT_CACHE_KEY));
      if(!latestProjectImage)latestProjectImage=txt(localStorage.getItem(PROJECT_IMAGE_CACHE_KEY));
    }catch(e){}
  }

  function parseProject(raw){
    const out={name:'',code:'',address:'',unit:'',owner:''};
    const value=txt(raw);if(!value)return out;
    const parts=value.split(/\s*[·|\n]\s*/).map(txt).filter(Boolean);
    parts.forEach(function(part){
      const m=part.match(/^\s*([^:：]{1,40})\s*[:：]\s*(.+)\s*$/);if(!m)return;
      const key=normKey(m[1]),val=txt(m[2]);if(!val)return;
      if(/^(du an|ten du an|project|project name)$/.test(key))out.name=val;
      else if(/^(ma|ma du an|project code|code)$/.test(key))out.code=val;
      else if(/^(dia chi|address)$/.test(key))out.address=val;
      else if(/^(don vi qlvh|don vi quan ly|don vi quan ly van hanh|qlvh|ban quan ly|management unit)$/.test(key))out.unit=val;
      else if(/^(nguoi phu trach|nguoi quan ly|phu trach|responsible|owner)$/.test(key))out.owner=val;
    });
    if(!out.name&&value&&parts.length===1)out.name=value.replace(/^\s*dự\s*án\s*[:：]\s*/i,'').trim();
    return out;
  }

  function normalizeImageUrl(v){
    const u=txt(v);
    if(!/^https?:\/\//i.test(u))return '';

    if(/drive\.google\.com/i.test(u)){
      let m=u.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
      if(!m)m=u.match(/[?&]id=([A-Za-z0-9_-]+)/i);
      if(m&&m[1])return 'https://drive.google.com/uc?export=view&id='+encodeURIComponent(m[1]);
    }

    return u;
  }

  function ensureStyle(){
    if(el('waterProjectR102Style'))return;
    const s=document.createElement('style');s.id='waterProjectR102Style';
    s.textContent=`
      #waterProjectPanel .r102ProjectTitle{font-size:19px;font-weight:800;line-height:1.25;color:#18232d;margin:1px 0 10px;overflow-wrap:anywhere}
      #waterProjectPanel .r102InfoGrid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #edf0f2}
      #waterProjectPanel .r102Info{padding:9px 6px;border-bottom:1px solid #edf0f2;min-width:0}
      #waterProjectPanel .r102Info:nth-child(odd){border-right:1px solid #edf0f2;padding-left:0;padding-right:10px}
      #waterProjectPanel .r102Info:nth-child(even){padding-left:10px;padding-right:0}
      #waterProjectPanel .r102Info.wide{grid-column:1/-1;border-right:0!important;padding-left:0!important;padding-right:0!important}
      #waterProjectPanel .r102Label{display:block;color:#6a7783;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.25;margin-bottom:3px}
      #waterProjectPanel .r102Value{display:block;color:#18232d;font-size:12px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}
      #waterProjectPanel .r102Value.missing{color:#8b97a2;font-weight:500;font-style:italic}
      #waterProjectPanel .r102ProjectImageWrap{margin-top:12px}
      #waterProjectPanel .r102ImageLabel{display:block;color:#6a7783;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.25;margin:0 0 6px}
      #waterProjectPanel .r102ProjectImage{display:block;width:100%;max-height:230px;object-fit:cover;border-radius:10px;border:1px solid #e1e6ea;background:#f3f5f7;box-sizing:border-box}
      @media(max-width:360px){#waterProjectPanel .r102ProjectTitle{font-size:17px}#waterProjectPanel .r102Value{font-size:11.5px}#waterProjectPanel .r102ProjectImage{max-height:190px}}
    `;document.head.appendChild(s);
  }

  function val(v){const t=txt(v);return t?'<span class="r102Value">'+esc(t)+'</span>':'<span class="r102Value missing">Chưa cập nhật</span>';}
  function info(label,value,wide){return '<div class="r102Info'+(wide?' wide':'')+'"><span class="r102Label">'+esc(label)+'</span>'+val(value)+'</div>';}

  function imageBlock(url){
    const src=normalizeImageUrl(url);
    if(!src)return '';
    return '<div class="r102ProjectImageWrap" id="waterProjectImageWrap">'
      +'<span class="r102ImageLabel">Ảnh dự án</span>'
      +'<img id="waterProjectImage" class="r102ProjectImage" alt="Ảnh dự án" loading="lazy" decoding="async" fetchpriority="low" data-src="'+esc(src)+'">'
      +'</div>';
  }

  function armProjectImage(){
    const img=el('waterProjectImage');
    if(!img)return;
    const src=txt(img.getAttribute('data-src'));
    if(!src)return;

    function load(){
      if(img.getAttribute('src'))return;
      img.setAttribute('src',src);
    }

    img.addEventListener('error',function(){
      const wrap=el('waterProjectImageWrap');
      if(wrap)wrap.style.display='none';
    },{once:true});

    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(function(entries){
        for(let i=0;i<entries.length;i++){
          if(entries[i].isIntersecting){
            load();
            io.disconnect();
            break;
          }
        }
      },{rootMargin:'120px 0px'});
      io.observe(img);
    }else{
      load();
    }
  }

  function render(){
    const panel=el('waterProjectPanel');if(!panel)return;
    ensureStyle();readCache();
    const project=parseProject(latestProjectRaw);
    panel.innerHTML=`
      <div class="waterCard">
        <div class="waterCardTitle">Thông tin dự án</div>
        <div class="r102ProjectTitle">${esc(project.name||'Ghi số nước')}</div>
        <div class="r102InfoGrid">
          ${info('Địa chỉ',project.address,true)}
          ${info('Đơn vị quản lý vận hành',project.unit,true)}
          ${info('Người quản lý',project.owner,true)}
        </div>
        ${imageBlock(latestProjectImage)}
      </div>`;
    armProjectImage();
  }

  function schedule(){setTimeout(render,0);setTimeout(render,350);}
  window.addEventListener('message',function(event){
    const d=event&&event.data;if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project==='string'&&txt(d.project))latestProjectRaw=txt(d.project);
    if(typeof d.projectImage==='string')latestProjectImage=txt(d.projectImage);
    schedule();
  });
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.WATER_PROJECT_TAB_BUILD=BUILD;
})();
