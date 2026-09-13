(function(){
  'use strict';

  const BUILD='879-r9.6-project-info-only';
  const PROJECT_CACHE_KEY='water_project_row2';
  const PROGRESS_CACHE_KEY='water_progress_ui3';
  let latestProjectRaw='';
  let latestProgress=null;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function normKey(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}

  function readCache(){
    try{
      if(!latestProjectRaw)latestProjectRaw=txt(localStorage.getItem(PROJECT_CACHE_KEY));
      if(!latestProgress){const raw=localStorage.getItem(PROGRESS_CACHE_KEY);if(raw)latestProgress=JSON.parse(raw);}
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
      else if(/^(nguoi phu trach|phu trach|responsible|owner)$/.test(key))out.owner=val;
    });
    if(!out.name&&value&&parts.length===1)out.name=value.replace(/^\s*dự\s*án\s*[:：]\s*/i,'').trim();
    return out;
  }

  function ensureStyle(){
    if(el('waterProjectR96Style'))return;
    const s=document.createElement('style');s.id='waterProjectR96Style';
    s.textContent=`
      #waterProjectPanel .r96ProjectTitle{font-size:19px;font-weight:800;line-height:1.25;color:#18232d;margin:1px 0 10px;overflow-wrap:anywhere}
      #waterProjectPanel .r96InfoGrid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #edf0f2}
      #waterProjectPanel .r96Info{padding:9px 6px;border-bottom:1px solid #edf0f2;min-width:0}
      #waterProjectPanel .r96Info:nth-child(odd){border-right:1px solid #edf0f2;padding-left:0;padding-right:10px}
      #waterProjectPanel .r96Info:nth-child(even){padding-left:10px;padding-right:0}
      #waterProjectPanel .r96Info.wide{grid-column:1/-1;border-right:0!important;padding-left:0!important;padding-right:0!important}
      #waterProjectPanel .r96Label{display:block;color:#6a7783;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.25;margin-bottom:3px}
      #waterProjectPanel .r96Value{display:block;color:#18232d;font-size:12px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}
      #waterProjectPanel .r96Value.missing{color:#8b97a2;font-weight:500;font-style:italic}
      @media(max-width:360px){#waterProjectPanel .r96ProjectTitle{font-size:17px}#waterProjectPanel .r96Value{font-size:11.5px}}
    `;document.head.appendChild(s);
  }

  function val(v){const t=txt(v);return t?'<span class="r96Value">'+esc(t)+'</span>':'<span class="r96Value missing">Chưa cập nhật</span>';}
  function info(label,value,wide){return '<div class="r96Info'+(wide?' wide':'')+'"><span class="r96Label">'+esc(label)+'</span>'+val(value)+'</div>';}

  function render(){
    const panel=el('waterProjectPanel');if(!panel)return;
    ensureStyle();readCache();
    const project=parseProject(latestProjectRaw),p=latestProgress||{};
    panel.innerHTML=`
      <div class="waterCard">
        <div class="waterCardTitle">Thông tin dự án</div>
        <div class="r96ProjectTitle">${esc(project.name||'Ghi số nước')}</div>
        <div class="r96InfoGrid">
          ${info('Mã dự án',project.code,false)}
          ${info('Kỳ ghi',txt(p.period)||'',false)}
          ${info('Địa chỉ',project.address,true)}
          ${info('Đơn vị quản lý vận hành',project.unit,true)}
          ${info('Người phụ trách',project.owner,true)}
        </div>
      </div>`;
  }

  function schedule(){setTimeout(render,0);setTimeout(render,350);}
  window.addEventListener('message',function(event){
    const d=event&&event.data;if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project==='string'&&txt(d.project))latestProjectRaw=txt(d.project);
    if(d.progress&&typeof d.progress==='object'&&d.progress.ok===true)latestProgress=d.progress;
    schedule();
  });
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.WATER_PROJECT_TAB_BUILD=BUILD;
})();
