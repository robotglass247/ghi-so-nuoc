(function(){
  'use strict';

  const BUILD='water-project-tab-backend-state-v2';
  let currentData=null;
  let renderTimer=0;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function pid(){
    try{return txt(window.WATER_PROJECT_ID||new URLSearchParams(location.search).get('project')).toUpperCase();}
    catch(e){return txt(window.WATER_PROJECT_ID).toUpperCase();}
  }
  function cacheKey(){return 'water_project_backend_state_v2_'+pid();}

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

    if(!out.code)out.code=pid();
    if(!out.name && value.indexOf(':')<0)out.name=value;
    return out;
  }

  function saveCache(data){try{localStorage.setItem(cacheKey(),JSON.stringify(data));}catch(e){}}
  function loadCache(){try{const x=JSON.parse(localStorage.getItem(cacheKey())||'null');if(x&&typeof x==='object'){currentData=x;return true;}}catch(e){}return false;}

  function driveFileId(v){const u=txt(v);let m=u.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);if(!m)m=u.match(/[?&]id=([A-Za-z0-9_-]+)/i);return m&&m[1]?m[1]:'';}
  function imageUrl(v){const u=txt(v);if(!/^https?:\/\//i.test(u))return '';if(/drive\.google\.com/i.test(u)){const id=driveFileId(u);if(id)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1200';}return u;}

  function ensureStyle(){
    if(el('waterProjectBackendStyle'))return;
    const s=document.createElement('style');s.id='waterProjectBackendStyle';
    s.textContent='#waterProjectPanel .wpdCard{background:#fff;border:1px solid #dce2e7;border-radius:12px;padding:12px;margin-bottom:9px;box-shadow:0 1px 4px rgba(0,0,0,.05)}#waterProjectPanel .wpdHead{font-size:12px;font-weight:900;color:#174a7e;margin-bottom:8px;text-transform:uppercase}#waterProjectPanel .wpdTitle{font-size:19px;font-weight:900;line-height:1.25;color:#18232d;margin:1px 0 10px;overflow-wrap:anywhere}#waterProjectPanel .wpdGrid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #edf0f2}#waterProjectPanel .wpdItem{padding:8px 7px;border-bottom:1px solid #edf0f2;min-width:0}#waterProjectPanel .wpdItem:nth-child(odd){border-right:1px solid #edf0f2;padding-left:0}#waterProjectPanel .wpdItem:nth-child(even){padding-right:0}#waterProjectPanel .wpdItem.wide{grid-column:1/-1;border-right:0!important;padding-left:0!important;padding-right:0!important}#waterProjectPanel .wpdLabel{display:block;color:#6a7783;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.2;margin-bottom:3px}#waterProjectPanel .wpdValue{display:block;color:#18232d;font-size:12px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}#waterProjectPanel .wpdMissing{color:#8b97a2;font-weight:500;font-style:italic}#waterProjectPanel .wpdImage{display:block;width:100%;max-height:230px;object-fit:cover;border-radius:10px;border:1px solid #e1e6ea;background:#f3f5f7;box-sizing:border-box;margin-top:12px}#waterProjectPanel .wpdStatus{padding:12px;text-align:center;color:#657482;font-size:12px;font-weight:700}@media(max-width:360px){#waterProjectPanel .wpdTitle{font-size:17px}#waterProjectPanel .wpdValue{font-size:11.5px}}';
    document.head.appendChild(s);
  }

  function value(v){const t=txt(v);return t?'<span class="wpdValue">'+esc(t)+'</span>':'<span class="wpdValue wpdMissing">Chưa cập nhật</span>';}
  function item(label,v,wide){return '<div class="wpdItem'+(wide?' wide':'')+'"><span class="wpdLabel">'+esc(label)+'</span>'+value(v)+'</div>';}
  function renderStatus(text){const panel=el('waterProjectPanel');if(!panel)return;ensureStyle();panel.innerHTML='<div class="wpdCard"><div class="wpdStatus">'+esc(text)+'</div></div>';}

  function render(){
    const panel=el('waterProjectPanel');if(!panel)return;
    if(!currentData){renderStatus('Đang nhận thông tin dự án '+(pid()||'')+' từ hệ thống...');return;}
    ensureStyle();
    const p=currentData;
    const img=imageUrl(p.image);
    panel.innerHTML='<div class="wpdCard">'
      +'<div class="wpdHead">Thông tin dự án</div>'
      +'<div class="wpdTitle">'+esc(p.name||p.code||'Ghi số nước')+'</div>'
      +'<div class="wpdGrid">'
      +item('Mã dự án',p.code,false)+item('Trạng thái',p.status,false)
      +item('Địa chỉ',p.address,true)+item('Đơn vị quản lý vận hành',p.unit,true)+item('Người phụ trách',p.owner,true)
      +item('Ngày bắt đầu',p.start,false)+item('Ngày kết thúc',p.end,false)
      +item('Hạn ghi (ngày)',p.duration,false)+item('Kỳ TB tiêu thụ',p.avgPeriod,false)
      +item('Ghi chú',p.note,true)+item('Cập nhật lúc',p.updated,true)
      +'</div>'+(img?'<img class="wpdImage" alt="Ảnh dự án" loading="lazy" decoding="async" src="'+esc(img)+'">':'')
      +'</div>';
  }

  function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(render,40);}

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project!=='string'||!txt(d.project))return;
    currentData=parseProject(d.project);
    if(typeof d.projectImage==='string'&&txt(d.projectImage))currentData.image=txt(d.projectImage);
    if(typeof d.projectNote==='string'&&txt(d.projectNote)&&!currentData.note)currentData.note=txt(d.projectNote);
    saveCache(currentData);
    schedule();
  });

  function install(){
    if(!currentData)loadCache();
    const tab=el('waterTabProject');
    if(tab&&!tab.dataset.wpdBackend){tab.dataset.wpdBackend='1';tab.addEventListener('click',schedule);}
    const panel=el('waterProjectPanel');
    if(panel&&panel.classList.contains('active'))schedule();
  }

  window.addEventListener('pageshow',install);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')install();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

  window.refreshWaterProjectTab=function(){try{localStorage.removeItem(cacheKey());}catch(e){}currentData=null;schedule();};
  window.WATER_PROJECT_TAB_BUILD=BUILD;
})();
