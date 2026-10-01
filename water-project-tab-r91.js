(function(){
  'use strict';

  const BUILD='water-project-tab-v20-layout-v5-dynamic';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  let currentData=null;
  let renderTimer=0;
  let lastError='';
  let busy=false;
  let ownRequestId='';
  let lastRenderKey='';

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function pid(){
    try{return txt(window.WATER_PROJECT_ID||new URLSearchParams(location.search).get('project')).toUpperCase();}
    catch(e){return txt(window.WATER_PROJECT_ID).toUpperCase();}
  }
  function cacheKey(){return 'water_project_backend_state_v5_'+pid();}
  function periodNow(){
    try{
      const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',year:'numeric'}).formatToParts(new Date());
      return p.find(function(x){return x.type==='month';}).value+'/'+p.find(function(x){return x.type==='year';}).value;
    }catch(e){const d=new Date();return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
  }

  function empty(){return {code:'',name:'',address:'',unit:'',owner:'',status:'',start:'',end:'',duration:'',note:'',updated:'',image:'',avgPeriod:''};}

  function parseProject(raw){
    const out=empty();
    const value=txt(raw);
    if(!value)return out;
    value.split(/\s*[·|\n]\s*/).map(txt).filter(Boolean).forEach(function(part){
      const m=part.match(/^\s*([^:：]{1,50})\s*[:：]\s*(.*)\s*$/);
      if(!m)return;
      const k=norm(m[1]),v=txt(m[2]);
      if(!v)return;
      if(/^(du an|ten du an|project|project name)$/.test(k))out.name=v;
      else if(/^(ma|ma du an|project id|project code|code)$/.test(k))out.code=v;
      else if(/^(dia chi|address)$/.test(k))out.address=v;
      else if(/^(don vi qlvh|don vi quan ly van hanh|don vi quan ly|qlvh)$/.test(k))out.unit=v;
      else if(/^(nguoi phu trach|nguoi quan ly|phu trach|owner)$/.test(k))out.owner=v;
      else if(/^(trang thai|status)$/.test(k))out.status=v;
      else if(/^(ngay bat dau|bat dau|start)$/.test(k))out.start=v;
      else if(/^(ngay ket thuc|ket thuc|end)$/.test(k))out.end=v;
      else if(/^(han ghi|han ghi ngay|duration)$/.test(k))out.duration=v.replace(/\s*ngày\s*$/i,'');
      else if(/^(ghi chu|note|notes)$/.test(k))out.note=v;
      else if(/^(cap nhat luc|cap nhat|updated|updated at)$/.test(k))out.updated=v;
      else if(/^(anh du an|project image|image)$/.test(k))out.image=v;
      else if(/^(ky tb tieu thu|ky trung binh tieu thu|average period)$/.test(k))out.avgPeriod=v;
    });
    if(!out.name&&value&&value.indexOf(':')<0)out.name=value;
    return out;
  }

  function validProject(data){
    const expected=pid();
    const actual=txt(data&&data.code).toUpperCase();
    return !!expected&&!!actual&&actual===expected;
  }

  function clearCache(){try{localStorage.removeItem(cacheKey());}catch(e){}}
  function saveCache(data){if(!validProject(data))return;try{localStorage.setItem(cacheKey(),JSON.stringify(data));}catch(e){}}
  function loadCache(){
    try{
      const x=JSON.parse(localStorage.getItem(cacheKey())||'null');
      if(x&&typeof x==='object'&&validProject(x)){currentData=x;return true;}
      clearCache();
    }catch(e){clearCache();}
    return false;
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
    if(el('waterProjectR105Style'))return;
    const s=document.createElement('style');s.id='waterProjectR105Style';
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
      #waterProjectPanel .r103ProjectImage{display:block;width:100%;max-height:230px;object-fit:cover;border-radius:10px;border:1px solid #e1e6ea;background:#f3f5f7;box-sizing:border-box;opacity:0;transition:opacity .18s ease}
      #waterProjectPanel .r103ProjectImage.loaded{opacity:1}
      #waterProjectPanel .r103ImageError{display:none;padding:10px;border:1px dashed #d8dee3;border-radius:9px;color:#8b97a2;font-size:11px;font-style:italic;text-align:center;background:#fafbfc}
      #waterProjectPanel .v20ProjectStatus{padding:12px;text-align:center;color:#657482;font-size:12px;font-weight:700}
      #waterProjectPanel .v20ProjectStatus.error{color:#a23a2a}
      @media(max-width:360px){#waterProjectPanel .r103ProjectTitle{font-size:17px}#waterProjectPanel .r103Value{font-size:11.5px}#waterProjectPanel .r103ProjectImage{max-height:190px}}
    `;
    document.head.appendChild(s);
  }

  function val(v){const t=txt(v);return t?'<span class="r103Value">'+esc(t)+'</span>':'<span class="r103Value missing">Chưa cập nhật</span>';}
  function info(label,value,wide){return '<div class="r103Info'+(wide?' wide':'')+'"><span class="r103Label">'+esc(label)+'</span>'+val(value)+'</div>';}

  function imageBlock(url){
    const src=normalizeImageUrl(url);
    if(!src)return '';
    const fallback=fallbackImageUrl(url);
    return '<div class="r103ProjectImageWrap" id="waterProjectImageWrap">'
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

    img.addEventListener('load',function(){img.classList.add('loaded');});
    img.addEventListener('error',function(){
      if(!triedFallback&&fallback&&img.src!==fallback){
        triedFallback=true;
        img.removeAttribute('src');
        setTimeout(function(){img.src=fallback;},0);
        return;
      }
      showError();
    });

    function load(){if(!img.getAttribute('src'))img.setAttribute('src',src);}
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(function(entries){
        for(let i=0;i<entries.length;i++){
          if(entries[i].isIntersecting){load();io.disconnect();break;}
        }
      },{rootMargin:'160px 0px'});
      io.observe(img);
    }else load();
  }

  function renderStatus(text,isError){
    const panel=el('waterProjectPanel');if(!panel)return;
    ensureStyle();
    panel.innerHTML='<div class="waterCard"><div class="v20ProjectStatus'+(isError?' error':'')+'">'+esc(text)+'</div></div>';
  }

  function render(){
    const panel=el('waterProjectPanel');if(!panel)return;
    if(!currentData){renderStatus(lastError||('Đang nhận thông tin dự án '+(pid()||'')+' từ hệ thống...'),!!lastError);return;}
    ensureStyle();

    const project=currentData;
    const normalizedImage=normalizeImageUrl(project.image);
    const renderKey=JSON.stringify([project.name,project.address,project.unit,project.owner,normalizedImage]);
    if(renderKey===lastRenderKey&&panel.querySelector('.r103ProjectCard')){
      armProjectImage();
      return;
    }

    panel.innerHTML=`
      <div class="waterCard r103ProjectCard">
        <div class="waterCardTitle">Thông tin dự án</div>
        <div class="r103ProjectTitle">${esc(project.name||'Ghi số nước')}</div>
        <div class="r103InfoGrid">
          ${info('Địa chỉ',project.address,true)}
          ${info('Đơn vị quản lý vận hành',project.unit,true)}
          ${info('Người quản lý',project.owner,true)}
        </div>
        ${imageBlock(project.image)}
      </div>`;

    lastRenderKey=renderKey;
    armProjectImage();
  }

  function schedule(){if(renderTimer)clearTimeout(renderTimer);renderTimer=setTimeout(function(){renderTimer=0;render();},60);}

  function hidden(form,name,value){const i=document.createElement('input');i.type='hidden';i.name=name;i.value=String(value==null?'':value);form.appendChild(i);}

  function requestProjectState(force){
    const project=pid();
    if(!project||navigator.onLine===false)return;
    if(busy&&!force)return;
    busy=true;
    lastError='';
    if(!currentData)schedule();

    const id='project_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    ownRequestId=id;
    const target='waterProjectState_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    const frame=document.createElement('iframe');frame.name=target;frame.style.display='none';
    const form=document.createElement('form');form.method='POST';form.action=BACKEND;form.target=target;form.style.display='none';
    hidden(form,'api','uistate');hidden(form,'project',project);hidden(form,'projectId',project);hidden(form,'period',periodNow());hidden(form,'requestId',id);
    document.body.appendChild(frame);document.body.appendChild(form);
    try{form.submit();}catch(e){busy=false;lastError='Không gửi được yêu cầu thông tin dự án '+project+'.';schedule();}

    setTimeout(function(){
      if(ownRequestId===id&&!currentData){lastError='Không nhận được dữ liệu dự án '+project+' từ backend sau 8 giây.';schedule();}
    },8000);
    setTimeout(function(){
      try{form.remove();frame.remove();}catch(e){}
      if(ownRequestId===id){busy=false;ownRequestId='';}
    },10000);
  }

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project!=='string'||!txt(d.project))return;

    const parsed=parseProject(d.project);
    const expected=pid();
    const actual=txt(parsed.code).toUpperCase();
    if(!actual||actual!==expected){
      if(currentData)return;
      clearCache();
      lastError=actual
        ? 'Backend trả sai dự án: nhận '+actual+', App đang mở '+expected+'.'
        : 'Backend chưa trả đúng Mã dự án '+expected+'.';
      schedule();
      return;
    }

    currentData=parsed;
    lastError='';
    if(typeof d.projectImage==='string'&&txt(d.projectImage))currentData.image=txt(d.projectImage);
    if(typeof d.projectNote==='string'&&txt(d.projectNote)&&!currentData.note)currentData.note=txt(d.projectNote);
    saveCache(currentData);
    schedule();
  });

  function install(){
    if(!currentData)loadCache();
    const tab=el('waterTabProject');
    if(tab&&!tab.dataset.wpdBackend){
      tab.dataset.wpdBackend='1';
      tab.addEventListener('click',function(){schedule();setTimeout(function(){requestProjectState(true);},20);});
    }
    const panel=el('waterProjectPanel');
    if(panel&&panel.classList.contains('active')){schedule();setTimeout(function(){requestProjectState(false);},120);}
  }

  window.addEventListener('pageshow',install);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')install();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

  window.refreshWaterProjectTab=function(){clearCache();currentData=null;lastError='';lastRenderKey='';schedule();requestProjectState(true);};
  window.WATER_PROJECT_TAB_BUILD=BUILD;
})();
