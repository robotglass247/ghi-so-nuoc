(function(){
  'use strict';

  const BUILD='879-r9.6-manage-layout';
  const PROJECT_CACHE_KEY='water_project_row2';
  const PROGRESS_CACHE_KEY='water_progress_ui3';
  let latestProjectRaw='';
  let latestProgress=null;
  let latestStaff=[];
  let mounted=false;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function num(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function normKey(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}

  function readCache(){
    try{
      if(!latestProjectRaw)latestProjectRaw=txt(localStorage.getItem(PROJECT_CACHE_KEY));
      if(!latestProgress){const raw=localStorage.getItem(PROGRESS_CACHE_KEY);if(raw)latestProgress=JSON.parse(raw);}
    }catch(e){}
  }

  function parseProject(raw){
    const out={status:'',start:'',end:'',deadline:''};
    txt(raw).split(/\s*[·|\n]\s*/).map(txt).filter(Boolean).forEach(function(part){
      const m=part.match(/^\s*([^:：]{1,40})\s*[:：]\s*(.+)\s*$/);if(!m)return;
      const key=normKey(m[1]),val=txt(m[2]);if(!val)return;
      if(/^(trang thai|status)$/.test(key))out.status=val;
      else if(/^(ngay bat dau|bat dau|start|start date)$/.test(key))out.start=val;
      else if(/^(ngay ket thuc|ket thuc|end|end date)$/.test(key))out.end=val;
      else if(/^(han ghi|han ghi so|han hoan thanh|han|deadline|due date)$/.test(key))out.deadline=val;
    });
    return out;
  }

  function pendingCount(){
    const node=el('pending');
    return node?num(txt(node.textContent).replace(/[^0-9]/g,'')):0;
  }

  function currentStaffName(){
    const node=el('staffName');
    return node?txt(node.textContent).replace(/^Đang tải nhân sự\.\.\.$/i,''):'Chưa chọn';
  }

  function fmtDay(v){const t=txt(v);return /^\d{1,2}$/.test(t)?'Ngày '+t:(t||'Chưa cập nhật');}
  function fmtDuration(v){const t=txt(v);return /^\d+(?:[.,]\d+)?$/.test(t)?t+' ngày':(t||'Chưa cập nhật');}

  function ensureStyle(){
    if(el('waterManageR96Style'))return;
    const s=document.createElement('style');s.id='waterManageR96Style';
    s.textContent=`
      #waterManagePanel .r96Schedule{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #edf0f2}
      #waterManagePanel .r96ScheduleItem{padding:10px 4px 2px;text-align:center;min-width:0}
      #waterManagePanel .r96ScheduleItem+.r96ScheduleItem{border-left:1px solid #edf0f2}
      #waterManagePanel .r96ScheduleLabel{display:block;font-size:9.5px;font-weight:800;color:#6a7783;text-transform:uppercase;line-height:1.2;margin-bottom:4px}
      #waterManagePanel .r96ScheduleValue{display:block;font-size:13px;font-weight:800;color:#18232d;line-height:1.3;overflow-wrap:anywhere}
      #waterManagePanel .r96ManageSub{font-size:11px;color:#6a7783;line-height:1.4;margin-top:7px}
      @media(max-width:360px){#waterManagePanel .r96ScheduleLabel{font-size:8.5px}#waterManagePanel .r96ScheduleValue{font-size:12px}}
    `;document.head.appendChild(s);
  }

  function mount(){
    const panel=el('waterManagePanel');if(!panel)return false;
    ensureStyle();
    if(!mounted){
      panel.innerHTML=`
        <div class="waterCard" id="waterManageScheduleCard">
          <div class="waterCardTitle">LỊCH GHI SỐ</div>
          <div class="r96Schedule">
            <div class="r96ScheduleItem"><span class="r96ScheduleLabel">Ngày bắt đầu</span><span class="r96ScheduleValue" id="waterManageStart">Chưa cập nhật</span></div>
            <div class="r96ScheduleItem"><span class="r96ScheduleLabel">Ngày kết thúc</span><span class="r96ScheduleValue" id="waterManageEnd">Chưa cập nhật</span></div>
            <div class="r96ScheduleItem"><span class="r96ScheduleLabel">Hạn ghi</span><span class="r96ScheduleValue" id="waterManageDeadline">Chưa cập nhật</span></div>
          </div>
          <div class="r96ManageSub">Lịch định kỳ theo hồ sơ dự án.</div>
        </div>

        <div class="waterCard" id="waterManageOverviewCard">
          <div class="waterCardTitle">TỔNG QUAN KỲ GHI HIỆN TẠI</div>
          <div class="waterMetricGrid">
            <div class="waterMetric"><strong id="waterManageOverviewPeriod">--/----</strong><span>Kỳ ghi</span></div>
            <div class="waterMetric"><strong id="waterManageOverviewTotal">----</strong><span>Tổng đồng hồ</span></div>
            <div class="waterMetric"><strong id="waterManageOverviewDone">----</strong><span>Đã chụp</span></div>
            <div class="waterMetric"><strong id="waterManageOverviewLeft">----</strong><span>Chưa chụp</span></div>
          </div>
          <div class="waterProgressTrack"><div id="waterManageOverviewFill" style="height:100%;width:0;background:#174a7e;border-radius:99px"></div></div>
          <div id="waterManageOverviewProgress" style="margin-top:6px;text-align:center;font-size:12px;font-weight:800;color:#304254">Tiến độ: --%</div>
        </div>

        <div class="waterCard" id="waterManageOperationCard">
          <div class="waterCardTitle">TRẠNG THÁI VẬN HÀNH</div>
          <div class="waterManageRow"><span>Trạng thái dự án</span><b id="waterManageProjectStatus">Đang ghi số</b></div>
          <div class="waterManageRow"><span>Ảnh chờ đồng bộ trên máy</span><b id="waterManageOperationPending">0</b></div>
          <div class="waterManageRow"><span>Kết nối</span><b id="waterManageOperationNetwork">ONLINE</b></div>
        </div>

        <div class="waterCard" id="waterManageStaffCard">
          <div class="waterCardTitle">QUẢN LÝ</div>
          <div class="waterManageRow"><span>Người đang thực hiện</span><b id="waterManageStaff">Chưa chọn</b></div>
          <div class="waterManageRow"><span>Nhân sự đang làm việc</span><b id="waterManageStaffCount">0</b></div>
        </div>

        <div class="waterCard" id="waterManageExportPlaceholder">
          <div class="waterCardTitle">TẢI FILE CHỈ SỐ</div>
          <div class="waterMuted">Đang tải chức năng xuất dữ liệu...</div>
        </div>`;
      mounted=true;
    }
    render();
    return true;
  }

  function render(){
    if(!mounted)return;
    readCache();
    const project=parseProject(latestProjectRaw),p=latestProgress||{};
    const total=num(p.total),done=Math.min(total,num(p.captured));
    const left=Number.isFinite(Number(p.remaining))?num(p.remaining):Math.max(0,total-done);
    const percent=total>0?Math.max(0,Math.min(100,Math.round(done*100/total))):0;

    if(el('waterManageStart'))el('waterManageStart').textContent=fmtDay(project.start);
    if(el('waterManageEnd'))el('waterManageEnd').textContent=fmtDay(project.end);
    if(el('waterManageDeadline'))el('waterManageDeadline').textContent=fmtDuration(project.deadline);
    if(el('waterManageOverviewPeriod'))el('waterManageOverviewPeriod').textContent=txt(p.period)||'--/----';
    if(el('waterManageOverviewTotal'))el('waterManageOverviewTotal').textContent=total||'----';
    if(el('waterManageOverviewDone'))el('waterManageOverviewDone').textContent=total?done:'----';
    if(el('waterManageOverviewLeft'))el('waterManageOverviewLeft').textContent=total?left:'----';
    if(el('waterManageOverviewFill'))el('waterManageOverviewFill').style.width=(total?percent:0)+'%';
    if(el('waterManageOverviewProgress'))el('waterManageOverviewProgress').textContent='Tiến độ: '+(total?percent:'--')+'%';
    if(el('waterManageProjectStatus'))el('waterManageProjectStatus').textContent=txt(project.status)||(total>0&&done>=total?'Hoàn thành kỳ ghi':'Đang ghi số');
    if(el('waterManageOperationPending'))el('waterManageOperationPending').textContent=String(pendingCount());
    if(el('waterManageOperationNetwork'))el('waterManageOperationNetwork').textContent=navigator.onLine?'ONLINE':'OFFLINE';
    if(el('waterManageStaff'))el('waterManageStaff').textContent=currentStaffName()||'Chưa chọn';
    if(el('waterManageStaffCount'))el('waterManageStaffCount').textContent=String(latestStaff.length||0);
  }

  function start(){
    if(mount())return;
    let tries=0;const timer=setInterval(function(){tries++;if(mount()||tries>30)clearInterval(timer);},200);
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project==='string'&&txt(d.project))latestProjectRaw=txt(d.project);
    if(d.progress&&typeof d.progress==='object'&&d.progress.ok===true)latestProgress=d.progress;
    if(Array.isArray(d.staff))latestStaff=d.staff.slice();
    if(!mounted)mount();else render();
  });
  window.addEventListener('online',render);window.addEventListener('offline',render);window.addEventListener('pageshow',function(){setTimeout(function(){mount();render();},0);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(function(){mount();render();},0);});
  if(window.MutationObserver){const obs=new MutationObserver(function(){if(!mounted)mount();});obs.observe(document.documentElement,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.WATER_MANAGE_LAYOUT_BUILD=BUILD;
})();
