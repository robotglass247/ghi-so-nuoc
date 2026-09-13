(function(){
  'use strict';

  const BUILD='879-r9.8-manage-layout';
  const PROJECT_CACHE_KEY='water_project_row2';
  const PROJECT_NOTE_CACHE_KEY='water_project_note_v1';
  const PROGRESS_CACHE_KEY='water_progress_ui3';
  let latestProjectRaw='';
  let latestProjectNote='';
  let latestProgress=null;
  let latestStaff=[];
  let mounted=false;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function num(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
  function normKey(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}

  function readCache(){
    try{
      if(!latestProjectRaw)latestProjectRaw=txt(localStorage.getItem(PROJECT_CACHE_KEY));
      if(!latestProjectNote)latestProjectNote=txt(localStorage.getItem(PROJECT_NOTE_CACHE_KEY));
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

  function pendingCount(){const node=el('pending');return node?num(txt(node.textContent).replace(/[^0-9]/g,'')):0;}
  function currentStaffName(){const node=el('staffName');return node?txt(node.textContent).replace(/^Đang tải nhân sự\.\.\.$/i,''):'Chưa chọn';}
  function fmtDay(v){const t=txt(v);return /^\d{1,2}$/.test(t)?'Ngày '+t:(t||'Chưa cập nhật');}
  function fmtDuration(v){const t=txt(v);return /^\d+(?:[.,]\d+)?(?:\s*ngày)?$/i.test(t)?t.replace(/\s*ngày$/i,'')+' ngày':(t||'Chưa cập nhật');}

  function ensureStyle(){
    if(el('waterManageR98Style'))return;
    const s=document.createElement('style');s.id='waterManageR98Style';
    s.textContent=`
      #waterManagePanel .r98Schedule{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #edf0f2}
      #waterManagePanel .r98ScheduleItem{padding:10px 4px 3px;text-align:center;min-width:0}
      #waterManagePanel .r98ScheduleItem+.r98ScheduleItem{border-left:1px solid #edf0f2}
      #waterManagePanel .r98ScheduleLabel{display:block;font-size:9.5px;font-weight:800;color:#6a7783;text-transform:uppercase;line-height:1.2;margin-bottom:4px}
      #waterManagePanel .r98ScheduleValue{display:block;font-size:13px;font-weight:800;color:#18232d;line-height:1.3;overflow-wrap:anywhere}
      #waterManagePanel .r98OverviewGrid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #edf0f2;border-left:1px solid #edf0f2}
      #waterManagePanel .r98OverviewCell{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:9px 8px;border-right:1px solid #edf0f2;border-bottom:1px solid #edf0f2;min-width:0}
      #waterManagePanel .r98OverviewLabel{font-size:10.5px;font-weight:700;color:#65727e;line-height:1.25}
      #waterManagePanel .r98OverviewValue{font-size:13px;font-weight:800;color:#18232d;white-space:nowrap}
      #waterManagePanel .r98NoteText{font-size:12px;line-height:1.5;color:#293845;white-space:pre-wrap;overflow-wrap:anywhere}
      #waterManagePanel .r98NoteEmpty{font-size:11.5px;color:#8b97a2;font-style:italic}
      @media(max-width:360px){#waterManagePanel .r98ScheduleLabel{font-size:8.5px}#waterManagePanel .r98ScheduleValue{font-size:12px}#waterManagePanel .r98OverviewCell{padding:8px 6px}#waterManagePanel .r98OverviewLabel{font-size:9.5px}#waterManagePanel .r98OverviewValue{font-size:12px}}
    `;document.head.appendChild(s);
  }

  function mount(){
    const panel=el('waterManagePanel');if(!panel)return false;
    ensureStyle();
    if(!mounted){
      panel.innerHTML=`
        <div class="waterCard" id="waterManageStaffCard">
          <div class="waterCardTitle">QUẢN LÝ</div>
          <div class="waterManageRow"><span>Người đang thực hiện</span><b id="waterManageStaff">Chưa chọn</b></div>
          <div class="waterManageRow"><span>Nhân sự đang làm việc</span><b id="waterManageStaffCount">0</b></div>
        </div>

        <div class="waterCard" id="waterManageScheduleCard">
          <div class="waterCardTitle">LỊCH GHI SỐ</div>
          <div class="r98Schedule">
            <div class="r98ScheduleItem"><span class="r98ScheduleLabel">Ngày bắt đầu</span><span class="r98ScheduleValue" id="waterManageStart">Chưa cập nhật</span></div>
            <div class="r98ScheduleItem"><span class="r98ScheduleLabel">Ngày kết thúc</span><span class="r98ScheduleValue" id="waterManageEnd">Chưa cập nhật</span></div>
            <div class="r98ScheduleItem"><span class="r98ScheduleLabel">Hạn ghi</span><span class="r98ScheduleValue" id="waterManageDeadline">Chưa cập nhật</span></div>
          </div>
        </div>

        <div class="waterCard" id="waterManageOverviewCard">
          <div class="waterCardTitle">TỔNG QUAN KỲ GHI HIỆN TẠI</div>
          <div class="r98OverviewGrid">
            <div class="r98OverviewCell"><span class="r98OverviewLabel">Kỳ ghi</span><b class="r98OverviewValue" id="waterManageOverviewPeriod">--/----</b></div>
            <div class="r98OverviewCell"><span class="r98OverviewLabel">Tổng số đồng hồ</span><b class="r98OverviewValue" id="waterManageOverviewTotal">----</b></div>
            <div class="r98OverviewCell"><span class="r98OverviewLabel">Đã chụp</span><b class="r98OverviewValue" id="waterManageOverviewDone">----</b></div>
            <div class="r98OverviewCell"><span class="r98OverviewLabel">Chưa chụp</span><b class="r98OverviewValue" id="waterManageOverviewLeft">----</b></div>
          </div>
          <div class="waterProgressTrack" style="margin-top:10px"><div id="waterManageOverviewFill" style="height:100%;width:0;background:#174a7e;border-radius:99px"></div></div>
          <div id="waterManageOverviewProgress" style="margin-top:6px;text-align:center;font-size:12px;font-weight:800;color:#304254">Tiến độ: --%</div>
        </div>

        <div class="waterCard" id="waterManageOperationCard">
          <div class="waterCardTitle">TRẠNG THÁI VẬN HÀNH</div>
          <div class="waterManageRow"><span>Trạng thái dự án</span><b id="waterManageProjectStatus">Đang ghi số</b></div>
          <div class="waterManageRow"><span>Ảnh chờ đồng bộ trên máy</span><b id="waterManageOperationPending">0</b></div>
          <div class="waterManageRow"><span>Kết nối</span><b id="waterManageOperationNetwork">ONLINE</b></div>
        </div>

        <div class="waterCard" id="waterManageExportPlaceholder">
          <div class="waterCardTitle">TẢI FILE CHỈ SỐ</div>
          <div class="waterMuted">Đang tải chức năng xuất dữ liệu...</div>
        </div>

        <div class="waterCard" id="waterManageNoteCard">
          <div class="waterCardTitle">GHI CHÚ</div>
          <div id="waterManageProjectNote" class="r98NoteEmpty">Chưa có ghi chú.</div>
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
    const left=Math.max(0,total-done);
    const percent=total>0?Math.max(0,Math.min(100,Math.round(done*100/total))):0;

    if(el('waterManageStaff'))el('waterManageStaff').textContent=currentStaffName()||'Chưa chọn';
    if(el('waterManageStaffCount'))el('waterManageStaffCount').textContent=String(latestStaff.length||0);
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
    if(el('waterManageProjectNote')){
      const note=txt(latestProjectNote);
      el('waterManageProjectNote').textContent=note||'Chưa có ghi chú.';
      el('waterManageProjectNote').className=note?'r98NoteText':'r98NoteEmpty';
    }
  }

  function start(){if(mount())return;let tries=0;const timer=setInterval(function(){tries++;if(mount()||tries>30)clearInterval(timer);},200);}
  window.addEventListener('message',function(event){
    const d=event&&event.data;if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project==='string'&&txt(d.project))latestProjectRaw=txt(d.project);
    if(typeof d.projectNote==='string')latestProjectNote=txt(d.projectNote);
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
