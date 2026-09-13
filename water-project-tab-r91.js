(function(){
  'use strict';

  const BUILD='879-r10.3-project-image-stable';
  const PROJECT_CACHE_KEY='water_project_row2';
  const PROJECT_IMAGE_CACHE_KEY='water_project_image_v1';
  let latestProjectRaw='';
  let latestProjectImage='';
  let lastRenderKey='';
  let renderTimer=0;

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

  function driveFileId(v){
    const u=txt(v);
    let m=u.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    if(!m)m=u.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    return m&&m[1]?m[1]:'';
  }

  function normalizeImageUrl(v){
    const u=txt(v);
    if(!/^https?:\/\//i.test(u))return '';
    if(/drive\.google\.com/i.test(u)){
      const id=driveFileId(u);
      if(id)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1200';
    }
    return u;
  }

  function fallbackImageUrl(v){
    const id=driveFileId(v);
    return id?'https://drive.google.com/uc?export=view&id='+encodeURIComponent(id):'';
  }

  function ensureStyle(){
    if(el('waterProjectR103Style'))return;
    const s=document.createElement('style');s.id='waterProjectR103Style';
    s.textContent=`
      #waterProjectPanel .r103ProjectTitle{font-size:19px;font-weight:800;line-height:1.25;color:#18232d;margin:1px 0 10px;overflow-wrap:anywhere}
      #waterProjectPanel .r103InfoGrid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #edf0f2}
      #waterProjectPanel .r103Info{padding:9px 6px;border-bottom:1px solid #edf0f2;min-width:0}
      #waterProjectPanel .r103Info:nth-child(odd){border-right:1px solid #edf0f2;padding-left:0;padding-right:10px}
      #waterProjectPanel .r103Info:nth-child(even){padding-left:10px;padding-right:0}
      #waterProjectPanel .r103Info.wide{grid-column:1/-1;border-right:0!important;padding-left:0!important;padding-right:0!important}
      #waterProjectPanel .r103Label{display:block;color:#6a7783;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.25;margin-bottom:3px}
      #waterProjectPanel .r103Value{display:block;color:#18232d;font-size:12px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}
      #waterProjectPanel .r103Value.missing{color:#8b97a2;font-weight:500;font-style:italic}
      #waterProjectPanel .r103ProjectImageWrap{margin-top:12px}
      #waterProjectPanel .r103ImageLabel{display:block;color:#6a7783;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.25;margin:0 0 6px}
      #waterProjectPanel .r103ProjectImage{display:block;width:100%;max-height:230px;object-fit:cover;border-radius:10px;border:1px solid #e1e6ea;background:#f3f5f7;box-sizing:border-box;opacity:0;transition:opacity .18s ease}
      #waterProjectPanel .r103ProjectImage.loaded{opacity:1}
      #waterProjectPanel .r103ImageError{display:none;padding:10px;border:1px dashed #d8dee3;border-radius:9px;color:#8b97a2;font-size:11px;font-style:italic;text-align:center;background:#fafbfc}
      @media(max-width:360px){#waterProjectPanel .r103ProjectTitle{font-size:17px}#waterProjectPanel .r103Value{font-size:11.5px}#waterProjectPanel .r103ProjectImage{max-height:190px}}
    `;document.head.appendChild(s);
  }

  function val(v){const t=txt(v);return t?'<span class="r103Value">'+esc(t)+'</span>':'<span class="r103Value missing">Chưa cập nhật</span>';}
  function info(label,value,wide){return '<div class="r103Info'+(wide?' wide':'')+'"><span class="r103Label">'+esc(label)+'</span>'+val(value)+'</div>';}

  function imageBlock(url){
    const src=normalizeImageUrl(url);
    if(!src)return '';
    const fallback=fallbackImageUrl(url);
    return '<div class="r103ProjectImageWrap" id="waterProjectImageWrap">'
      +'<span class="r103ImageLabel">Ảnh dự án</span>'
      +'<img id="waterProjectImage" class="r103ProjectImage" alt="Ảnh dự án" loading="lazy" decoding="async" fetchpriority="low" data-src="'+esc(src)+'" data-fallback="'+esc(fallback)+'">'
      +'<div id="waterProjectImageError" class="r103ImageError">Không tải được ảnh dự án.</div>'
      +'</div>';
  }

  function armProjectImage(){
    const img=el('waterProjectImage');
    if(!img||img.dataset.armed==='1')return;
    img.dataset.armed='1';

    const src=txt(img.getAttribute('data-src'));
    const fallback=txt(img.getAttribute('data-fallback'));
    if(!src)return;

    let triedFallback=false;

    function showError(){
      img.style.display='none';
      const msg=el('waterProjectImageError');
      if(msg)msg.style.display='block';
    }

    img.addEventListener('load',function(){
      img.classList.add('loaded');
    });

    img.addEventListener('error',function(){
      if(!triedFallback&&fallback&&img.src!==fallback){
        triedFallback=true;
        img.removeAttribute('src');
        setTimeout(function(){img.src=fallback;},0);
        return;
      }
      showError();
    });

    function load(){
      if(img.getAttribute('src'))return;
      img.setAttribute('src',src);
    }

    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(function(entries){
        for(let i=0;i<entries.length;i++){
          if(entries[i].isIntersecting){
            load();
            io.disconnect();
            break;
          }
        }
      },{rootMargin:'160px 0px'});
      io.observe(img);
    }else{
      load();
    }
  }

  function render(){
    const panel=el('waterProjectPanel');if(!panel)return;
    ensureStyle();readCache();

    const normalizedImage=normalizeImageUrl(latestProjectImage);
    const renderKey=latestProjectRaw+'\n'+normalizedImage;
    if(renderKey===lastRenderKey&&panel.querySelector('.r103ProjectCard')){
      armProjectImage();
      return;
    }

    const project=parseProject(latestProjectRaw);
    panel.innerHTML=`
      <div class="waterCard r103ProjectCard">
        <div class="waterCardTitle">Thông tin dự án</div>
        <div class="r103ProjectTitle">${esc(project.name||'Ghi số nước')}</div>
        <div class="r103InfoGrid">
          ${info('Địa chỉ',project.address,true)}
          ${info('Đơn vị quản lý vận hành',project.unit,true)}
          ${info('Người quản lý',project.owner,true)}
        </div>
        ${imageBlock(latestProjectImage)}
      </div>`;

    lastRenderKey=renderKey;
    armProjectImage();
  }

  function schedule(){
    if(renderTimer)clearTimeout(renderTimer);
    renderTimer=setTimeout(function(){renderTimer=0;render();},60);
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;

    let changed=false;
    if(typeof d.project==='string'&&txt(d.project)&&txt(d.project)!==latestProjectRaw){
      latestProjectRaw=txt(d.project);
      changed=true;
    }
    if(typeof d.projectImage==='string'&&txt(d.projectImage)!==latestProjectImage){
      latestProjectImage=txt(d.projectImage);
      changed=true;
    }
    if(changed)schedule();
  });

  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();

  window.WATER_PROJECT_TAB_BUILD=BUILD;
})();
