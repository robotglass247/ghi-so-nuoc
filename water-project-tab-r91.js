(function(){
  'use strict';

  const BUILD='879-r9.1-project-tab';
  const PROJECT_CACHE_KEY='water_project_row2';
  const PROGRESS_CACHE_KEY='water_progress_ui3';

  let latestProjectRaw='';
  let latestProgress=null;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function n(v){const x=Number(v);return Number.isFinite(x)?Math.max(0,Math.floor(x)):0;}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function normKey(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}

  function readCache(){
    try{
      if(!latestProjectRaw)latestProjectRaw=txt(localStorage.getItem(PROJECT_CACHE_KEY));
      if(!latestProgress){
        const raw=localStorage.getItem(PROGRESS_CACHE_KEY);
        if(raw)latestProgress=JSON.parse(raw);
      }
    }catch(e){}
  }

  function parseProject(raw){
    const out={name:'',code:'',address:'',unit:'',owner:'',status:'',start:'',deadline:''};
    const value=txt(raw);
    if(!value)return out;

    const parts=value.split(/\s*[·|\n]\s*/).map(txt).filter(Boolean);
    const loose=[];

    parts.forEach(function(part){
      const m=part.match(/^\s*([^:：]{1,40})\s*[:：]\s*(.+)\s*$/);
      if(!m){loose.push(part);return;}
      const key=normKey(m[1]);
      const val=txt(m[2]);
      if(!val)return;

      if(/^(du an|ten du an|project|project name)$/.test(key))out.name=val;
      else if(/^(ma|ma du an|project code|code)$/.test(key))out.code=val;
      else if(/^(dia chi|address)$/.test(key))out.address=val;
      else if(/^(don vi qlvh|don vi quan ly|don vi quan ly van hanh|qlvh|ban quan ly|management unit)$/.test(key))out.unit=val;
      else if(/^(nguoi phu trach|phu trach|responsible|owner)$/.test(key))out.owner=val;
      else if(/^(trang thai|status)$/.test(key))out.status=val;
      else if(/^(ngay bat dau|bat dau|start|start date)$/.test(key))out.start=val;
      else if(/^(han ghi so|han hoan thanh|han|deadline|due date)$/.test(key))out.deadline=val;
      else loose.push(part);
    });

    if(loose.length){
      const fields=['name','code','address','unit','owner','status','start','deadline'];
      let i=0;
      loose.forEach(function(v){
        while(i<fields.length && out[fields[i]])i++;
        if(i<fields.length){out[fields[i]]=v;i++;}
      });
    }

    if(!out.name && value && parts.length===1)out.name=value.replace(/^\s*dự\s*án\s*[:：]\s*/i,'').trim();
    return out;
  }

  function ensureStyle(){
    if(el('waterProjectR91Style'))return;
    const s=document.createElement('style');
    s.id='waterProjectR91Style';
    s.textContent=`
      #waterProjectPanel .r91ProjectTitle{font-size:19px;font-weight:800;line-height:1.25;color:#18232d;margin:1px 0 10px;overflow-wrap:anywhere}
      #waterProjectPanel .r91Status{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:#e8f1fa;color:#174a7e;font-size:11px;font-weight:800;margin-bottom:10px}
      #waterProjectPanel .r91InfoGrid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #edf0f2}
      #waterProjectPanel .r91Info{padding:9px 6px;border-bottom:1px solid #edf0f2;min-width:0}
      #waterProjectPanel .r91Info:nth-child(odd){border-right:1px solid #edf0f2;padding-left:0;padding-right:10px}
      #waterProjectPanel .r91Info:nth-child(even){padding-left:10px;padding-right:0}
      #waterProjectPanel .r91Info.wide{grid-column:1/-1;border-right:0!important;padding-left:0!important;padding-right:0!important}
      #waterProjectPanel .r91Label{display:block;color:#6a7783;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.25;margin-bottom:3px}
      #waterProjectPanel .r91Value{display:block;color:#18232d;font-size:12px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}
      #waterProjectPanel .r91Value.missing{color:#8b97a2;font-weight:500;font-style:italic}
      #waterProjectPanel .r91Warn{padding:9px 0;border-bottom:1px solid #edf0f2;font-size:12px;line-height:1.4;color:#293845}
      #waterProjectPanel .r91Warn:last-child{border-bottom:0}
      #waterProjectPanel .r91Warn strong{color:#a04a00}
      #waterProjectPanel .r91Ok{font-size:12px;line-height:1.45;color:#2a6942}
      #waterProjectPanel .r91Sub{font-size:11px;color:#6a7783;line-height:1.4;margin-top:5px}
      @media(max-width:360px){#waterProjectPanel .r91ProjectTitle{font-size:17px}#waterProjectPanel .r91Value{font-size:11.5px}}
    `;
    document.head.appendChild(s);
  }

  function val(v){
    const t=txt(v);
    return t?'<span class="r91Value">'+esc(t)+'</span>':'<span class="r91Value missing">Chưa cập nhật</span>';
  }

  function info(label,value,wide){
    return '<div class="r91Info'+(wide?' wide':'')+'"><span class="r91Label">'+esc(label)+'</span>'+val(value)+'</div>';
  }

  function pendingCount(){
    const node=el('pending');
    return node?n(txt(node.textContent).replace(/[^0-9]/g,'')):0;
  }

  function deriveStatus(project,p){
    if(txt(project.status))return txt(project.status);
    const total=n(p.total);
    const done=Math.min(total,n(p.captured));
    if(total>0 && done>=total)return 'Hoàn thành kỳ ghi';
    if(total>0)return 'Đang ghi số';
    return 'Chưa có dữ liệu kỳ ghi';
  }

  function warnings(project,p){
    const list=[];
    const total=n(p.total);
    const done=Math.min(total,n(p.captured));
    const left=Number.isFinite(Number(p.remaining))?n(p.remaining):Math.max(0,total-done);
    const pending=pendingCount();
    const period=txt(p.period)||'hiện tại';

    if(!navigator.onLine)list.push('<strong>Mất kết nối:</strong> thiết bị đang OFFLINE; dữ liệu mới sẽ chờ đồng bộ.');
    if(pending>0)list.push('<strong>Chờ đồng bộ:</strong> '+pending+' ảnh đang lưu trên máy chưa gửi lên máy chủ.');
    if(total>0 && left>0)list.push('<strong>Tiến độ:</strong> còn '+left+' đồng hồ chưa chụp trong kỳ '+esc(period)+'.');

    const missing=[];
    if(!txt(project.code))missing.push('mã dự án');
    if(!txt(project.address))missing.push('địa chỉ');
    if(!txt(project.unit))missing.push('đơn vị QLVH');
    if(!txt(project.owner))missing.push('người phụ trách');
    if(!txt(project.start))missing.push('ngày bắt đầu');
    if(!txt(project.deadline))missing.push('hạn ghi số');
    if(missing.length)list.push('<strong>Hồ sơ dự án:</strong> cần cập nhật '+esc(missing.join(', '))+'.');
    return list;
  }

  function render(){
    const panel=el('waterProjectPanel');
    if(!panel)return;
    ensureStyle();
    readCache();

    const project=parseProject(latestProjectRaw);
    const p=latestProgress||{};
    const total=n(p.total);
    const done=Math.min(total,n(p.captured));
    const left=Number.isFinite(Number(p.remaining))?n(p.remaining):Math.max(0,total-done);
    const percent=total>0?Math.max(0,Math.min(100,Math.round(done*100/total))):0;
    const status=deriveStatus(project,p);
    const warn=warnings(project,p);

    panel.innerHTML=`
      <div class="waterCard">
        <div class="waterCardTitle">Thông tin dự án</div>
        <div class="r91ProjectTitle">${esc(project.name||'Ghi số nước')}</div>
        <div class="r91Status">${esc(status)}</div>
        <div class="r91InfoGrid">
          ${info('Mã dự án',project.code,false)}
          ${info('Kỳ ghi',txt(p.period)||'',false)}
          ${info('Địa chỉ',project.address,true)}
          ${info('Đơn vị quản lý vận hành',project.unit,true)}
          ${info('Người phụ trách',project.owner,true)}
          ${info('Ngày bắt đầu',project.start,false)}
          ${info('Hạn ghi số',project.deadline,false)}
        </div>
      </div>

      <div class="waterCard">
        <div class="waterCardTitle">Tổng quan kỳ ghi hiện tại</div>
        <div class="waterMetricGrid">
          <div class="waterMetric"><strong>${esc(txt(p.period)||'--/----')}</strong><span>Kỳ ghi</span></div>
          <div class="waterMetric"><strong>${total||'----'}</strong><span>Tổng đồng hồ</span></div>
          <div class="waterMetric"><strong>${total?done:'----'}</strong><span>Đã chụp</span></div>
          <div class="waterMetric"><strong>${total?left:'----'}</strong><span>Chưa chụp</span></div>
        </div>
        <div class="waterProgressTrack"><div style="height:100%;width:${total?percent:0}%;background:#174a7e;border-radius:99px"></div></div>
        <div id="waterProjectProgressText">Tiến độ: ${total?percent:'--'}%</div>
      </div>

      <div class="waterCard">
        <div class="waterCardTitle">Trạng thái vận hành</div>
        <div class="waterManageRow"><span>Ảnh chờ đồng bộ trên máy</span><b>${pendingCount()}</b></div>
        <div class="waterManageRow"><span>Kết nối</span><b>${navigator.onLine?'ONLINE':'OFFLINE'}</b></div>
      </div>

      <div class="waterCard">
        <div class="waterCardTitle">Cần xử lý / cập nhật</div>
        ${warn.length?warn.map(function(x){return '<div class="r91Warn">'+x+'</div>';}).join(''):'<div class="r91Ok">Không có cảnh báo vận hành cần xử lý.</div>'}
        <div class="r91Sub">Thông tin dự án được đọc tự động từ dữ liệu cấu hình; các mục chưa có sẽ hiển thị “Chưa cập nhật”.</div>
      </div>`;
  }

  function schedule(){setTimeout(render,0);setTimeout(render,350);}

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project==='string'&&txt(d.project))latestProjectRaw=txt(d.project);
    if(d.progress&&typeof d.progress==='object'&&d.progress.ok===true)latestProgress=d.progress;
    schedule();
  });

  window.addEventListener('online',schedule);
  window.addEventListener('offline',schedule);
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule();});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  window.WATER_PROJECT_TAB_BUILD=BUILD;
})();
