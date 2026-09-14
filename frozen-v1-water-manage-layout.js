(function(){
  'use strict';

  const BUILD='879-r10.10-manage-compact-autoheight';
  const NOTE_CACHE_KEY='water_project_note_v1';
  const CURRENT_STAFF_CACHE_KEY='water_manage_current_staff_v1';

  let mounted=false;
  let latestProject='';
  let latestProjectNote='';
  let latestCurrentStaffName='';
  let latestStaff=[];
  let latestState={};
  let scheduleLocked=false;
  let scheduleSnapshot=null;

  function el(id){ return document.getElementById(id); }
  function txt(v){ return String(v==null?'':v).trim(); }

  function esc(v){
    return txt(v).replace(/[&<>"']/g,function(c){
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[c];
    });
  }

  function num(v, fallback){
    const n=Number(v);
    return Number.isFinite(n)?n:(fallback==null?0:fallback);
  }

  function norm(v){
    return txt(v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function parseProject(raw){
    const out={
      status:'',
      start:'',
      end:'',
      duration:''
    };

    txt(raw)
      .split(/\s*[·|\n]\s*/)
      .map(txt)
      .filter(Boolean)
      .forEach(function(part){
        const m=part.match(/^\s*([^:：]{1,50})\s*[:：]\s*(.+)\s*$/);
        if(!m)return;

        const key=norm(m[1]);
        const value=txt(m[2]);

        if(!value)return;

        if(/^(trang thai|status)$/.test(key)){
          out.status=value;
        }else if(/^(ngay bat dau|bat dau|start)$/.test(key)){
          out.start=value;
        }else if(/^(ngay ket thuc|ket thuc|end)$/.test(key)){
          out.end=value;
        }else if(/^(han ghi|han ghi ngay|duration)$/.test(key)){
          out.duration=value.replace(/\s*ngày\s*$/i,'');
        }
      });

    return out;
  }

  function readCachedNote(){
    try{
      return txt(localStorage.getItem(NOTE_CACHE_KEY));
    }catch(e){
      return '';
    }
  }

  function readCachedCurrentStaff(){
    try{
      return txt(localStorage.getItem(CURRENT_STAFF_CACHE_KEY));
    }catch(e){
      return '';
    }
  }

  function saveCurrentStaff(name){
    name=txt(name);
    if(!name)return;

    latestCurrentStaffName=name;

    try{
      localStorage.setItem(CURRENT_STAFF_CACHE_KEY,name);
    }catch(e){}
  }

  function readCachedProgress(){
    try{
      return JSON.parse(localStorage.getItem('water_progress_ui3')||'{}') || {};
    }catch(e){
      return {};
    }
  }

  function pick(obj, keys, fallback){
    if(!obj || typeof obj!=='object')return fallback;

    for(let i=0;i<keys.length;i++){
      const k=keys[i];
      if(obj[k]!==undefined && obj[k]!==null && txt(obj[k])!==''){
        return obj[k];
      }
    }

    return fallback;
  }

  function progressFromState(){
    const cache=readCachedProgress();
    const p=(latestState.progress && typeof latestState.progress==='object')
      ? latestState.progress
      : latestState;

    const period=txt(
      pick(p,['period','ky','periodLabel','month'],
        pick(cache,['period','ky','periodLabel','month'],'')
      )
    );

    const total=num(
      pick(p,['total','totalMeters','tong','tongSoDongHo'],
        pick(cache,['total','totalMeters','tong','tongSoDongHo'],0)
      ),
      0
    );

    const done=num(
      pick(p,['done','captured','capturedCount','daChup','completed'],
        pick(cache,['done','captured','capturedCount','daChup','completed'],0)
      ),
      0
    );

    // Theo quy tắc đã chốt: Chưa chụp = Tổng số đồng hồ - Đã chụp.
    const left=Math.max(0,total-done);
    const percent=total>0 ? Math.max(0,Math.min(100,Math.round(done*100/total))) : 0;

    return {period,total,done,left,percent};
  }

  function currentStaffNameFromState(state){
    return txt(
      pick(state,[
        'currentStaffName',
        'currentStaff',
        'staffName',
        'operatorName',
        'workerName',
        'nguoiThucHien'
      ],'')
    );
  }

  function currentStaffName(){
    return txt(
      latestCurrentStaffName ||
      readCachedCurrentStaff()
    );
  }

  function staffCount(){
    if(Array.isArray(latestStaff) && latestStaff.length){
      return latestStaff.length;
    }

    const v=pick(latestState,[
      'staffCount',
      'activeStaffCount',
      'nhanSuCount'
    ],'');

    return txt(v)==='' ? 0 : num(v,0);
  }

  function pendingCount(){
    const v=pick(latestState,[
      'pending',
      'pendingCount',
      'queue',
      'queueCount',
      'waiting',
      'waitingCount'
    ],0);

    if(Array.isArray(v))return v.length;
    return num(v,0);
  }

  function ensureStyle(){
    if(el('waterManageR107Style'))return;

    const s=document.createElement('style');
    s.id='waterManageR107Style';
    s.textContent=`
      #waterManagePanel .r107Card{
        margin-bottom:12px;
      }

      #waterManagePanel .r107Rows{
        width:100%;
      }

      #waterManagePanel .r107Line{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:5px 0;
        border-bottom:1px solid #edf0f2;
      }

      #waterManagePanel .r107Line:last-child{
        border-bottom:0;
      }

      #waterManagePanel .r107LineLabel{
        min-width:0;
        color:#18232d;
        font-size:12px;
        line-height:1.15;
        font-weight:500;
      }

      #waterManagePanel .r107LineValue{
        flex:0 0 auto;
        color:#18232d;
        font-size:12px;
        line-height:1.15;
        font-weight:800;
        text-align:right;
        overflow-wrap:anywhere;
      }

      #waterManagePanel .r107Schedule{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        border:1px solid #e6eaed;
      }

      #waterManagePanel .r107ScheduleCell{
        min-width:0;
        padding:5px 5px;
        text-align:center;
        border-right:1px solid #e6eaed;
      }

      #waterManagePanel .r107ScheduleCell:last-child{
        border-right:0;
      }

      #waterManagePanel .r107ScheduleLabel{
        display:block;
        color:#6c7781;
        font-size:10px;
        line-height:1.1;
        font-weight:700;
        margin-bottom:2px;
        white-space:nowrap;
      }

      #waterManagePanel .r107ScheduleValue{
        display:block;
        color:#18232d;
        font-size:12.5px;
        line-height:1.1;
        font-weight:800;
        white-space:nowrap;
      }

      /* ===== TỔNG QUAN KỲ GHI HIỆN TẠI ===== */
      #waterManageOverviewCard .r107OverviewGrid{
        display:grid;
        grid-template-columns:1fr 1fr;
        border-top:1px solid #e6eaed;
        border-left:1px solid #e6eaed;
      }

      #waterManageOverviewCard .r107OverviewCell{
        min-width:0;
        min-height:0;
        height:auto;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:7px;
        padding:5px 7px;
        border-right:1px solid #e6eaed;
        border-bottom:1px solid #e6eaed;
        box-sizing:border-box;
      }

      /* SỬA TRỰC TIẾP 4 NHÃN:
         Kỳ ghi / Tổng số đồng hồ / Đã chụp / Chưa chụp */
      #waterManageOverviewCard .r107OverviewLabel{
        min-width:0;
        color:#687480;
        font-size:14px !important;
        line-height:1.05 !important;
        font-weight:800 !important;
        white-space:nowrap !important;
        letter-spacing:-0.15px;
      }

      #waterManageOverviewCard .r107OverviewValue{
        flex:0 0 auto;
        color:#18232d;
        font-size:15px;
        line-height:1.05;
        font-weight:900;
        text-align:right;
        white-space:nowrap;
      }

      #waterManageOverviewCard .r108PendingRow{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:6px 7px;
        border-left:1px solid #e6eaed;
        border-right:1px solid #e6eaed;
        border-bottom:1px solid #e6eaed;
        box-sizing:border-box;
      }

      #waterManageOverviewCard .r108PendingLabel{
        min-width:0;
        color:#687480;
        font-size:13.5px;
        line-height:1.05;
        font-weight:800;
      }

      #waterManageOverviewCard .r108PendingValue{
        flex:0 0 auto;
        color:#18232d;
        font-size:15px;
        line-height:1.05;
        font-weight:900;
        text-align:right;
      }

      #waterManageOverviewCard .r107ProgressTrack{
        height:11px;
        margin-top:8px;
        overflow:hidden;
        border-radius:999px;
        background:#dfe5e9;
      }

      #waterManageOverviewCard .r107ProgressFill{
        height:100%;
        width:0;
        border-radius:inherit;
        background:#225b91;
        transition:width .25s ease;
      }

      #waterManageOverviewCard .r107ProgressText{
        margin-top:5px;
        text-align:center;
        color:#26333e;
        font-size:13px;
        line-height:1.2;
        font-weight:800;
      }

      #waterManageProjectNote{
        color:#18232d;
        font-size:12px;
        line-height:1.3;
        overflow-wrap:anywhere;
      }

      #waterManageProjectNote.missing{
        color:#8b97a2;
        font-style:italic;
      }

      /* R10.10: ô tự co đúng theo nội dung, không kéo cao bởi CSS nền */
      #waterManagePanel .r107Line,
      #waterManagePanel .r107ScheduleCell,
      #waterManageOverviewCard .r107OverviewCell,
      #waterManageOverviewCard .r108PendingRow{
        height:auto !important;
        min-height:0 !important;
      }

      #waterManagePanel .r107LineLabel,
      #waterManagePanel .r107LineValue,
      #waterManagePanel .r107ScheduleLabel,
      #waterManagePanel .r107ScheduleValue,
      #waterManageOverviewCard .r107OverviewLabel,
      #waterManageOverviewCard .r107OverviewValue,
      #waterManageOverviewCard .r108PendingLabel,
      #waterManageOverviewCard .r108PendingValue{
        margin-top:0 !important;
        margin-bottom:0 !important;
      }

      @media(max-width:390px){
        #waterManageOverviewCard .r107OverviewCell{
          padding:5px 6px;
          gap:5px;
        }

        #waterManageOverviewCard .r107OverviewLabel{
          font-size:13.5px !important;
          letter-spacing:-0.25px;
        }

        #waterManageOverviewCard .r107OverviewValue{
          font-size:15.5px;
        }
      }

      @media(max-width:360px){
        #waterManageOverviewCard .r107OverviewCell{
          padding:4px 5px;
          gap:4px;
        }

        #waterManageOverviewCard .r107OverviewLabel{
          font-size:12.7px !important;
          letter-spacing:-0.35px;
        }

        #waterManageOverviewCard .r107OverviewValue{
          font-size:15px;
        }

        #waterManagePanel .r107ScheduleLabel{
          font-size:9.5px;
        }

        #waterManagePanel .r107ScheduleValue{
          font-size:12px;
        }
      }
    `;

    document.head.appendChild(s);
  }

  function mount(){
    const panel=el('waterManagePanel');
    if(!panel)return false;

    if(mounted && el('waterManageOverviewCard')){
      return true;
    }

    ensureStyle();

    panel.innerHTML=`
      <div class="waterCard r107Card" id="waterManageStaffCard">
        <div class="waterCardTitle">QUẢN LÝ</div>

        <div class="r107Rows">
          <div class="r107Line">
            <span class="r107LineLabel">Người đang thực hiện</span>
            <span class="r107LineValue" id="waterManageStaff">—</span>
          </div>

          <div class="r107Line">
            <span class="r107LineLabel">Nhân sự đang làm việc</span>
            <span class="r107LineValue" id="waterManageStaffCount">0</span>
          </div>
        </div>
      </div>

      <div class="waterCard r107Card" id="waterManageScheduleCard">
        <div class="waterCardTitle">LỊCH GHI SỐ</div>

        <div class="r107Schedule">
          <div class="r107ScheduleCell">
            <span class="r107ScheduleLabel">Ngày bắt đầu</span>
            <span class="r107ScheduleValue" id="waterManageStart">—</span>
          </div>

          <div class="r107ScheduleCell">
            <span class="r107ScheduleLabel">Ngày kết thúc</span>
            <span class="r107ScheduleValue" id="waterManageEnd">—</span>
          </div>

          <div class="r107ScheduleCell">
            <span class="r107ScheduleLabel">Hạn ghi</span>
            <span class="r107ScheduleValue" id="waterManageDeadline">—</span>
          </div>
        </div>
      </div>

      <div class="waterCard r107Card" id="waterManageOverviewCard">
        <div class="waterCardTitle">TỔNG QUAN KỲ GHI HIỆN TẠI</div>

        <div class="r107OverviewGrid">
          <div class="r107OverviewCell">
            <span class="r107OverviewLabel">Kỳ ghi</span>
            <span class="r107OverviewValue" id="waterManagePeriod">—</span>
          </div>

          <div class="r107OverviewCell">
            <span class="r107OverviewLabel">Tổng số đồng hồ</span>
            <span class="r107OverviewValue" id="waterManageTotal">0</span>
          </div>

          <div class="r107OverviewCell">
            <span class="r107OverviewLabel">Đã chụp</span>
            <span class="r107OverviewValue" id="waterManageDone">0</span>
          </div>

          <div class="r107OverviewCell">
            <span class="r107OverviewLabel">Chưa chụp</span>
            <span class="r107OverviewValue" id="waterManageLeft">0</span>
          </div>
        </div>

        <div class="r108PendingRow">
          <span class="r108PendingLabel">Ảnh chờ đồng bộ trên máy</span>
          <span class="r108PendingValue" id="waterManagePending">0</span>
        </div>

        <div class="r107ProgressTrack">
          <div class="r107ProgressFill" id="waterManageProgressFill"></div>
        </div>

        <div class="r107ProgressText">
          Tiến độ: <span id="waterManageProgressPercent">0%</span>
        </div>
      </div>

      <div class="waterCard r107Card" id="waterManageExportPlaceholder">
        <div class="waterCardTitle">TẢI FILE CHỈ SỐ</div>
      </div>

      <div class="waterCard r107Card" id="waterManageNoteCard">
        <div class="waterCardTitle">GHI CHÚ</div>
        <div id="waterManageProjectNote" class="missing">Chưa có ghi chú.</div>
      </div>
    `;

    mounted=true;
    updateAll();
    return true;
  }

  function setText(id,value,fallback){
    const n=el(id);
    if(!n)return;
    n.textContent=txt(value) || (fallback==null?'—':fallback);
  }

  function scheduleFromProject(raw){
    const p=parseProject(raw);

    if(!p.start && !p.end && !p.duration){
      return null;
    }

    return {
      start:p.start ? 'Ngày '+p.start.replace(/^Ngày\s*/i,'') : '—',
      end:p.end ? 'Ngày '+p.end.replace(/^Ngày\s*/i,'') : '—',
      duration:p.duration ? p.duration+' ngày' : '—'
    };
  }

  function renderScheduleSnapshot(){
    if(!scheduleSnapshot)return;

    setText(
      'waterManageStart',
      scheduleSnapshot.start,
      '—'
    );

    setText(
      'waterManageEnd',
      scheduleSnapshot.end,
      '—'
    );

    setText(
      'waterManageDeadline',
      scheduleSnapshot.duration,
      '—'
    );
  }

  function updateScheduleOnce(){
    /*
      R10.9:
      - Chỉ chốt LỊCH GHI SỐ 1 lần trong mỗi lần mở App.
      - Nếu cache dự án có sẵn thì chốt ngay lúc mount.
      - Nếu chưa có, đợi bản tin project hợp lệ đầu tiên rồi khóa.
      - Các WATER_UI_STATE sau đó KHÔNG render lịch nữa => hết nháy.
    */
    if(scheduleLocked){
      renderScheduleSnapshot();
      return;
    }

    const snap=scheduleFromProject(latestProject);
    if(!snap)return;

    scheduleSnapshot=snap;
    scheduleLocked=true;
    renderScheduleSnapshot();
  }


  function updateOverview(){
    const p=progressFromState();

    setText('waterManagePeriod',p.period,'—');
    setText('waterManageTotal',p.total,'0');
    setText('waterManageDone',p.done,'0');
    setText('waterManageLeft',p.left,'0');

    const fill=el('waterManageProgressFill');
    if(fill)fill.style.width=p.percent+'%';

    setText('waterManageProgressPercent',p.percent+'%','0%');
  }

  function updateStaff(){
    /*
      Giống GHI CHÚ:
      - Chỉ thay "Người đang thực hiện" khi có tên hợp lệ.
      - Bản tin tạm thiếu tên KHÔNG được xóa tên đang hiển thị.
    */
    const stableName=currentStaffName();
    const staffNode=el('waterManageStaff');

    if(staffNode && stableName){
      if(txt(staffNode.textContent)!==stableName){
        staffNode.textContent=stableName;
      }
    }

    setText(
      'waterManageStaffCount',
      staffCount(),
      '0'
    );
  }

  function updateOperation(){
    setText(
      'waterManagePending',
      pendingCount(),
      '0'
    );

    setText(
      'waterManageConnection',
      navigator.onLine ? 'ONLINE' : 'OFFLINE',
      navigator.onLine ? 'ONLINE' : 'OFFLINE'
    );
  }

  function updateNote(){
    const note=txt(latestProjectNote || readCachedNote());
    const n=el('waterManageProjectNote');

    if(!n)return;

    if(note){
      n.textContent=note;
      n.classList.remove('missing');
    }else{
      n.textContent='Chưa có ghi chú.';
      n.classList.add('missing');
    }
  }

  function updateAll(){
    if(!mounted)return;
    updateStaff();
    updateScheduleOnce();
    updateOverview();
    updateOperation();
    updateNote();
  }

  function handleState(d){
    if(!d || typeof d!=='object')return;

    // Giữ tên hợp lệ cuối cùng trước khi latestState bị thay bởi bản tin mới.
    const incomingStaffName=currentStaffNameFromState(d);
    if(incomingStaffName){
      saveCurrentStaff(incomingStaffName);
    }

    latestState=d;

    if(typeof d.project==='string' && txt(d.project)){
      // Chỉ dùng project mới nếu lịch chưa chốt trong lần mở App này.
      if(!scheduleLocked){
        latestProject=txt(d.project);
      }
    }

    if(typeof d.projectNote==='string'){
      latestProjectNote=txt(d.projectNote);
      try{
        localStorage.setItem(NOTE_CACHE_KEY,latestProjectNote);
      }catch(e){}
    }

    if(Array.isArray(d.staff)){
      latestStaff=d.staff.slice();
    }

    if(!mounted)mount();
    updateAll();
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d || typeof d!=='object' || d.type!=='WATER_UI_STATE')return;
    handleState(d);
  });

  window.addEventListener('online',updateOperation);
  window.addEventListener('offline',updateOperation);

  function start(){
    try{
      latestProject=txt(localStorage.getItem('water_project_row2'));
      latestProjectNote=txt(localStorage.getItem(NOTE_CACHE_KEY));
      latestCurrentStaffName=readCachedCurrentStaff();
    }catch(e){}

    if(mount())return;

    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(mount() || tries>30){
        clearInterval(timer);
      }
    },200);
  }

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      start,
      {once:true}
    );
  }else{
    start();
  }

  window.WATER_MANAGE_LAYOUT_BUILD=BUILD;
})();
