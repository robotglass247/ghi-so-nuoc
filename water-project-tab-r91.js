(function(){
  'use strict';

  const BUILD='879-r12.1-project-module';
  const PROJECT_CACHE_KEY='water_project_row2';
  const PROJECT_NOTE_CACHE_KEY='water_project_note_v1';
  const PROJECT_IMAGE_CACHE_KEY='water_project_image_v1';
  const PROGRESS_CACHE_KEY='water_progress_ui3';

  let projectRaw='';
  let projectNote='';
  let projectImage='';
  let progress=null;
  let renderTimer=0;
  let lastKey='';

  function el(id){ return document.getElementById(id); }
  function txt(v){ return String(v==null?'':v).trim(); }
  function esc(v){ return txt(v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function norm(v){ return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim(); }
  function num(v){ const n=Number(v); return Number.isFinite(n)?Math.max(0,Math.floor(n)):0; }
  function pct(done,total){ return total>0?Math.max(0,Math.min(100,Math.round(done*100/total))):0; }

  function parseProject(raw){
    const out={name:'',code:'',address:'',unit:'',owner:'',status:'',start:'',end:'',duration:''};
    const value=txt(raw);
    if(!value)return out;

    value.split(/\s*[·|\n]\s*/).map(txt).filter(Boolean).forEach(function(part){
      const m=part.match(/^\s*([^:：]{1,50})\s*[:：]\s*(.+)\s*$/);
      if(!m)return;
      const key=norm(m[1]), val=txt(m[2]);
      if(!val)return;
      if(/^(du an|ten du an|project|project name)$/.test(key))out.name=val;
      else if(/^(ma|ma du an|project code|code)$/.test(key))out.code=val;
      else if(/^(dia chi|address)$/.test(key))out.address=val;
      else if(/^(don vi qlvh|don vi quan ly|don vi quan ly van hanh|qlvh|ban quan ly|management unit)$/.test(key))out.unit=val;
      else if(/^(nguoi phu trach|nguoi quan ly|phu trach|responsible|owner)$/.test(key))out.owner=val;
      else if(/^(trang thai|status)$/.test(key))out.status=val;
      else if(/^(ngay bat dau|bat dau|start)$/.test(key))out.start=val;
      else if(/^(ngay ket thuc|ket thuc|end)$/.test(key))out.end=val;
      else if(/^(han ghi|han ghi ngay|duration)$/.test(key))out.duration=val.replace(/\s*ngày\s*$/i,'');
    });

    if(!out.name && value.indexOf('·')<0 && value.indexOf('|')<0){
      out.name=value.replace(/^\s*dự\s*án\s*[:：]\s*/i,'').trim();
    }
    return out;
  }

  function readCache(){
    try{
      if(!projectRaw)projectRaw=txt(localStorage.getItem(PROJECT_CACHE_KEY));
      if(!projectNote)projectNote=txt(localStorage.getItem(PROJECT_NOTE_CACHE_KEY));
      if(!projectImage)projectImage=txt(localStorage.getItem(PROJECT_IMAGE_CACHE_KEY));
      if(!progress){
        const raw=localStorage.getItem(PROGRESS_CACHE_KEY);
        if(raw)progress=JSON.parse(raw);
      }
    }catch(e){}
  }

  function driveFileId(v){
    const u=txt(v);
    let m=u.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    if(!m)m=u.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    return m&&m[1]?m[1]:'';
  }

  function imageUrl(v){
    const u=txt(v);
    if(!/^https?:\/\//i.test(u))return '';
    if(/drive\.google\.com/i.test(u)){
      const id=driveFileId(u);
      if(id)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1200';
    }
    return u;
  }

  function imageFallback(v){
    const id=driveFileId(v);
    return id?'https://drive.google.com/uc?export=view&id='+encodeURIComponent(id):'';
  }

  function ensureStyle(){
    if(el('waterProjectR121Style'))return;
    const s=document.createElement('style');
    s.id='waterProjectR121Style';
    s.textContent=`
      #waterProjectPanel{padding:8px!important}
      #waterProjectPanel .r121Card{margin-bottom:8px;padding:10px}
      #waterProjectPanel .r121Title{font-size:17px;font-weight:900;color:#172b3d;line-height:1.25;margin:0 0 8px;overflow-wrap:anywhere}
      #waterProjectPanel .r121Sub{font-size:10.5px;font-weight:800;color:#174a7e;text-transform:uppercase;margin-bottom:6px}
      #waterProjectPanel .r121Rows{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #edf0f2}
      #waterProjectPanel .r121Info{min-width:0;padding:7px 6px;border-bottom:1px solid #edf0f2}
      #waterProjectPanel .r121Info:nth-child(odd){border-right:1px solid #edf0f2;padding-left:0;padding-right:10px}
      #waterProjectPanel .r121Info:nth-child(even){padding-left:10px;padding-right:0}
      #waterProjectPanel .r121Info.wide{grid-column:1/-1;border-right:0!important;padding-left:0!important;padding-right:0!important}
      #waterProjectPanel .r121Label{display:block;color:#6a7783;font-size:9.5px;font-weight:700;text-transform:uppercase;line-height:1.2;margin-bottom:2px}
      #waterProjectPanel .r121Value{display:block;color:#18232d;font-size:12px;font-weight:800;line-height:1.3;overflow-wrap:anywhere}
      #waterProjectPanel .r121Missing{color:#99a3ac;font-weight:500;font-style:italic}
      #waterProjectPanel .r121Schedule{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #e1e6ea;border-radius:9px;overflow:hidden}
      #waterProjectPanel .r121ScheduleCell{min-width:0;text-align:center;padding:7px 4px;background:#fafbfd;border-right:1px solid #e1e6ea}
      #waterProjectPanel .r121ScheduleCell:last-child{border-right:0}
      #waterProjectPanel .r121ScheduleCell b{display:block;font-size:12px;color:#172b3d;line-height:1.2;overflow-wrap:anywhere}
      #waterProjectPanel .r121ScheduleCell span{display:block;font-size:9px;color:#6a7783;margin-top:2px;white-space:nowrap}
      #waterProjectPanel .r121Metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
      #waterProjectPanel .r121Metric{padding:7px 2px;text-align:center;background:#f7f9fb;border:1px solid #e2e7eb;border-radius:9px;min-width:0}
      #waterProjectPanel .r121Metric b{display:block;font-size:15px;line-height:1.05;color:#15283a;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}
      #waterProjectPanel .r121Metric span{display:block;margin-top:3px;font-size:9px;color:#66737f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #waterProjectPanel .r121Track{height:8px;background:#e2e7eb;border-radius:99px;overflow:hidden;margin-top:7px}
      #waterProjectPanel .r121Fill{height:100%;background:#174a7e;border-radius:99px}
      #waterProjectPanel .r121Pct{text-align:center;font-size:10.5px;font-weight:800;color:#304254;margin-top:4px}
      #waterProjectPanel .r121Note{font-size:11px;line-height:1.4;color:#3f4d59;white-space:pre-line;overflow-wrap:anywhere}
      #waterProjectPanel .r121Image{display:block;width:100%;max-height:210px;object-fit:cover;border-radius:9px;border:1px solid #e1e6ea;background:#f3f5f7;margin-top:8px}
      #waterProjectPanel .r121ImageError{display:none;padding:9px;border:1px dashed #d8dee3;border-radius:9px;color:#8b97a2;font-size:10.5px;font-style:italic;text-align:center;background:#fafbfc;margin-top:8px}
      @media(max-width:360px){
        #waterProjectPanel .r121Title{font-size:16px}
        #waterProjectPanel .r121Value{font-size:11.5px}
        #waterProjectPanel .r121Metric b{font-size:14px}
        #waterProjectPanel .r121Metrics{gap:4px}
      }
    `;
    document.head.appendChild(s);
  }

  function value(v){
    const t=txt(v);
    return t?'<span class="r121Value">'+esc(t)+'</span>':'<span class="r121Value r121Missing">Chưa cập nhật</span>';
  }

  function info(label,v,wide){
    return '<div class="r121Info'+(wide?' wide':'')+'"><span class="r121Label">'+esc(label)+'</span>'+value(v)+'</div>';
  }

  function armImage(){
    const img=el('waterProjectImageR121');
    if(!img||img.dataset.armed==='1')return;
    img.dataset.armed='1';
    const fallback=txt(img.dataset.fallback);
    let tried=false;
    img.addEventListener('error',function(){
      if(!tried&&fallback){ tried=true; img.src=fallback; return; }
      img.style.display='none';
      const e=el('waterProjectImageErrorR121');
      if(e)e.style.display='block';
    });
  }

  function render(){
    const panel=el('waterProjectPanel');
    if(!panel)return false;
    readCache();
    ensureStyle();

    const p=parseProject(projectRaw);
    const pg=progress&&typeof progress==='object'?progress:{};
    const total=num(pg.total);
    const done=Math.min(total,num(pg.captured!=null?pg.captured:pg.done));
    const left=Number.isFinite(Number(pg.remaining))?num(pg.remaining):Math.max(0,total-done);
    const percent=pct(done,total);
    const period=txt(pg.period)||'--/----';
    const src=imageUrl(projectImage);
    const fallback=imageFallback(projectImage);

    const key=[projectRaw,projectNote,projectImage,period,total,done,left].join('\n');
    if(key===lastKey && panel.querySelector('[data-r121-project="1"]'))return true;

    panel.innerHTML=`
      <div class="waterCard r121Card" data-r121-project="1">
        <div class="r121Sub">THÔNG TIN DỰ ÁN</div>
        <div class="r121Title">${esc(p.name||'Ghi số nước')}</div>
        <div class="r121Rows">
          ${info('Mã dự án',p.code,false)}
          ${info('Trạng thái',p.status,false)}
          ${info('Địa chỉ',p.address,true)}
          ${info('Đơn vị quản lý vận hành',p.unit,true)}
          ${info('Người phụ trách',p.owner,true)}
        </div>
        ${src?'<img id="waterProjectImageR121" class="r121Image" src="'+esc(src)+'" data-fallback="'+esc(fallback)+'" alt="Ảnh dự án" loading="lazy" decoding="async"><div id="waterProjectImageErrorR121" class="r121ImageError">Không tải được ảnh dự án.</div>':''}
      </div>

      <div class="waterCard r121Card">
        <div class="r121Sub">LỊCH GHI SỐ</div>
        <div class="r121Schedule">
          <div class="r121ScheduleCell"><b>${esc(p.start||'—')}</b><span>Ngày bắt đầu</span></div>
          <div class="r121ScheduleCell"><b>${esc(p.end||'—')}</b><span>Ngày kết thúc</span></div>
          <div class="r121ScheduleCell"><b>${esc(p.duration?p.duration+' ngày':'—')}</b><span>Hạn ghi</span></div>
        </div>
      </div>

      <div class="waterCard r121Card">
        <div class="r121Sub">TỔNG QUAN KỲ GHI HIỆN TẠI</div>
        <div class="r121Metrics">
          <div class="r121Metric"><b>${esc(period)}</b><span>Kỳ ghi</span></div>
          <div class="r121Metric"><b>${total||'—'}</b><span>Tổng</span></div>
          <div class="r121Metric"><b>${total?done:'—'}</b><span>Đã chụp</span></div>
          <div class="r121Metric"><b>${total?left:'—'}</b><span>Chưa chụp</span></div>
        </div>
        <div class="r121Track"><div class="r121Fill" style="width:${total?percent:0}%"></div></div>
        <div class="r121Pct">Tiến độ: ${total?percent:'--'}%</div>
      </div>

      ${projectNote?'<div class="waterCard r121Card"><div class="r121Sub">GHI CHÚ DỰ ÁN</div><div class="r121Note">'+esc(projectNote)+'</div></div>':''}
    `;

    lastKey=key;
    armImage();
    return true;
  }

  function schedule(delay){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(function(){renderTimer=0;render();},delay==null?40:delay);
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    let changed=false;
    if(typeof d.project==='string'&&txt(d.project)!==projectRaw){ projectRaw=txt(d.project); changed=true; }
    if(typeof d.projectNote==='string'&&txt(d.projectNote)!==projectNote){ projectNote=txt(d.projectNote); changed=true; }
    if(typeof d.projectImage==='string'&&txt(d.projectImage)!==projectImage){ projectImage=txt(d.projectImage); changed=true; }
    if(d.progress&&typeof d.progress==='object'){ progress=d.progress; changed=true; }
    if(changed)schedule(25);
  });

  window.addEventListener('pageshow',function(){schedule(60);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule(60);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){schedule(0);},{once:true});
  else schedule(0);

  window.WATER_PROJECT_TAB_BUILD=BUILD;
  window.WATER_PROJECT_MODULE_BUILD=BUILD;
})();
