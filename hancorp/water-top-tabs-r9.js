(function(){
  'use strict';

  const BUILD='879-final10-r9-tabs';
  const ACTIVE_KEY='water_active_main_tab_v1';
  const PROJECT_CACHE_KEY='water_project_row2';
  const PROGRESS_CACHE_KEY='water_progress_ui3';

  let latestProject='';
  let latestProgress=null;
  let latestStaff=[];

  function el(id){return document.getElementById(id);}
  function text(v){return String(v==null?'':v).trim();}
  function num(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
  function pct(done,total){return total>0?Math.max(0,Math.min(100,Math.round(done*100/total))):0;}

  function style(){
    if(el('waterMainTabsStyle'))return;
    const s=document.createElement('style');
    s.id='waterMainTabsStyle';
    s.textContent=`
      #waterMainTabs{flex:0 0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:6px 7px;background:#eef2f6;border-bottom:1px solid #cfd7df;z-index:20}
      #waterMainTabs button{min-width:0;width:auto;margin:0;padding:9px 4px;border:1px solid #bdc7d1;border-radius:9px;background:#fff;color:#263746;font:800 13px/1.1 Arial,sans-serif;box-shadow:none}
      #waterMainTabs button.active{background:#174a7e;color:#fff;border-color:#174a7e}
      .waterMainPanel{display:none;flex:1 1 auto;min-height:0;overflow:auto;background:#f4f6f8;padding:10px;color:#18232d;font-family:Arial,sans-serif}
      .waterMainPanel.active{display:block}
      .waterCard{background:#fff;border:1px solid #dce2e7;border-radius:12px;padding:12px;margin-bottom:9px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      .waterCardTitle{font-size:13px;font-weight:800;color:#174a7e;margin-bottom:7px;text-transform:uppercase}
      #waterProjectName{font-size:16px;font-weight:800;line-height:1.35;overflow-wrap:anywhere}
      #waterProjectMeta{font-size:12px;color:#5a6875;line-height:1.5;margin-top:5px;overflow-wrap:anywhere}
      .waterMetricGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .waterMetric{background:#f7f9fb;border:1px solid #e2e7eb;border-radius:10px;padding:9px;text-align:center}
      .waterMetric strong{display:block;font-size:20px;line-height:1.1;color:#15283a;font-variant-numeric:tabular-nums}
      .waterMetric span{display:block;margin-top:4px;font-size:11px;color:#66737f}
      .waterProgressTrack{height:10px;background:#e2e7eb;border-radius:99px;overflow:hidden;margin-top:9px}
      #waterProjectProgressFill{height:100%;width:0;background:#174a7e;border-radius:99px;transition:width .2s ease}
      #waterProjectProgressText{margin-top:6px;text-align:center;font-size:12px;font-weight:800;color:#304254}
      .waterManageRow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #edf0f2;font-size:13px}
      .waterManageRow:last-child{border-bottom:0}
      .waterManageRow b{max-width:62%;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .waterMuted{color:#6a7783;font-size:12px;line-height:1.45}
      #waterProjectBar{display:none!important}
      @media (max-width:360px){#waterMainTabs button{font-size:12px;padding:8px 2px}.waterMainPanel{padding:8px}.waterMetric strong{font-size:18px}}
    `;
    document.head.appendChild(s);
  }

  function makeButton(id,label,tab){
    const b=document.createElement('button');
    b.id=id;
    b.type='button';
    b.textContent=label;
    b.dataset.tab=tab;
    b.setAttribute('role','tab');
    b.setAttribute('aria-selected','false');
    b.addEventListener('click',function(){selectTab(tab,true);});
    return b;
  }

  function makeProjectPanel(){
    const p=document.createElement('section');
    p.id='waterProjectPanel';
    p.className='waterMainPanel';
    p.dataset.panel='project';
    p.innerHTML=`
      <div class="waterCard">
        <div class="waterCardTitle">Thông tin dự án</div>
        <div id="waterProjectName">Đang tải thông tin dự án...</div>
        <div id="waterProjectMeta">Dữ liệu được lấy tự động từ hồ sơ dự án.</div>
      </div>
      <div class="waterCard">
        <div class="waterCardTitle">Tổng quan kỳ ghi hiện tại</div>
        <div class="waterMetricGrid">
          <div class="waterMetric"><strong id="waterProjectPeriod">--/----</strong><span>Kỳ ghi</span></div>
          <div class="waterMetric"><strong id="waterProjectTotal">----</strong><span>Tổng đồng hồ</span></div>
          <div class="waterMetric"><strong id="waterProjectDone">----</strong><span>Đã chụp</span></div>
          <div class="waterMetric"><strong id="waterProjectLeft">----</strong><span>Chưa chụp</span></div>
        </div>
        <div class="waterProgressTrack"><div id="waterProjectProgressFill"></div></div>
        <div id="waterProjectProgressText">Tiến độ: --%</div>
      </div>
      <div class="waterCard">
        <div class="waterCardTitle">Trạng thái vận hành</div>
        <div class="waterManageRow"><span>Ảnh chờ đồng bộ trên máy</span><b id="waterProjectPending">0</b></div>
        <div class="waterManageRow"><span>Kết nối</span><b id="waterProjectNetwork">ONLINE</b></div>
      </div>`;
    return p;
  }

  function makeManagePanel(){
    const p=document.createElement('section');
    p.id='waterManagePanel';
    p.className='waterMainPanel';
    p.dataset.panel='manage';
    p.innerHTML=`
      <div class="waterCard">
        <div class="waterCardTitle">Quản lý</div>
        <div class="waterManageRow"><span>Người đang thực hiện</span><b id="waterManageStaff">Chưa chọn</b></div>
        <div class="waterManageRow"><span>Nhân sự đang làm việc</span><b id="waterManageStaffCount">0</b></div>
        <div class="waterManageRow"><span>Ảnh chờ đồng bộ</span><b id="waterManagePending">0</b></div>
        <div class="waterManageRow"><span>Kỳ ghi hiện tại</span><b id="waterManagePeriod">--/----</b></div>
        <div class="waterManageRow"><span>Tiến độ</span><b id="waterManageProgress">--%</b></div>
      </div>
      <div class="waterCard">
        <div class="waterCardTitle">Nguyên tắc dữ liệu</div>
        <div class="waterMuted">Đồng bộ ảnh, AI xử lý ảnh và duyệt/chốt là các trạng thái riêng. Có ảnh không đồng nghĩa chỉ số đã hợp lệ.</div>
      </div>`;
    return p;
  }

  function ensureTabs(){
    const app=el('app');
    if(!app)return false;
    style();

    let tabs=el('waterMainTabs');
    if(!tabs){
      tabs=document.createElement('nav');
      tabs.id='waterMainTabs';
      tabs.setAttribute('role','tablist');
      tabs.setAttribute('aria-label','Chức năng chính');
      tabs.appendChild(makeButton('waterTabProject','DỰ ÁN','project'));
      tabs.appendChild(makeButton('waterTabCapture','CHỤP SỐ','capture'));
      tabs.appendChild(makeButton('waterTabManage','QUẢN LÝ','manage'));

      const top=app.querySelector('.top');
      if(top&&top.nextSibling)app.insertBefore(tabs,top.nextSibling);
      else if(top)app.appendChild(tabs);
      else app.insertBefore(tabs,app.firstChild);
    }

    if(!el('waterProjectPanel')){
      const panel=makeProjectPanel();
      if(tabs.nextSibling)app.insertBefore(panel,tabs.nextSibling);
      else app.appendChild(panel);
    }

    if(!el('waterManagePanel')){
      const panel=makeManagePanel();
      const project=el('waterProjectPanel');
      if(project&&project.nextSibling)app.insertBefore(panel,project.nextSibling);
      else app.appendChild(panel);
    }

    return true;
  }

  function captureNodes(){
    const app=el('app');
    if(!app)return [];
    return [el('progressBar'),app.querySelector('.camera'),app.querySelector('.bottom')].filter(Boolean);
  }

  function setVisible(node,on){
    if(!node)return;
    if(on){
      const old=node.dataset.waterDisplay;
      node.style.display=old||'';
    }else{
      if(node.style.display&&node.style.display!=='none')node.dataset.waterDisplay=node.style.display;
      node.style.display='none';
    }
  }

  function selectTab(tab,persist){
    if(!ensureTabs())return;
    if(!['project','capture','manage'].includes(tab))tab='project';

    document.querySelectorAll('#waterMainTabs button').forEach(function(b){
      const active=b.dataset.tab===tab;
      b.classList.toggle('active',active);
      b.setAttribute('aria-selected',active?'true':'false');
    });

    const pp=el('waterProjectPanel');
    const mp=el('waterManagePanel');
    if(pp)pp.classList.toggle('active',tab==='project');
    if(mp)mp.classList.toggle('active',tab==='manage');

    captureNodes().forEach(function(n){setVisible(n,tab==='capture');});

    if(persist){try{localStorage.setItem(ACTIVE_KEY,tab);}catch(e){}}
    if(tab==='project'||tab==='manage')refreshSummary();
  }

  function projectLabel(raw){
    const v=text(raw);
    if(!v)return 'Ghi số nước';
    return v;
  }

  function renderProject(){
    const p=latestProgress||{};
    const total=num(p.total);
    const done=Math.min(total,num(p.captured));
    const left=Number.isFinite(Number(p.remaining))?num(p.remaining):Math.max(0,total-done);
    const percent=pct(done,total);

    if(el('waterProjectName'))el('waterProjectName').textContent=projectLabel(latestProject);
    if(el('waterProjectMeta'))el('waterProjectMeta').textContent=latestProject?'Thông tin dự án đang dùng cho kỳ ghi số hiện tại.':'Chưa nhận được thông tin dự án từ máy chủ.';
    if(el('waterProjectPeriod'))el('waterProjectPeriod').textContent=text(p.period)||'--/----';
    if(el('waterProjectTotal'))el('waterProjectTotal').textContent=total||'----';
    if(el('waterProjectDone'))el('waterProjectDone').textContent=total?done:'----';
    if(el('waterProjectLeft'))el('waterProjectLeft').textContent=total?left:'----';
    if(el('waterProjectProgressFill'))el('waterProjectProgressFill').style.width=percent+'%';
    if(el('waterProjectProgressText'))el('waterProjectProgressText').textContent='Tiến độ: '+(total?percent:'--')+'%';
  }

  function currentStaffName(){
    const node=el('staffName');
    return node?text(node.textContent).replace(/^Đang tải nhân sự\.\.\.$/i,''):'';
  }

  function pendingCount(){
    const node=el('pending');
    return node?num(text(node.textContent).replace(/[^0-9]/g,'')):0;
  }

  function refreshSummary(){
    ensureTabs();
    try{
      if(!latestProject)latestProject=text(localStorage.getItem(PROJECT_CACHE_KEY));
      if(!latestProgress){
        const raw=localStorage.getItem(PROGRESS_CACHE_KEY);
        if(raw)latestProgress=JSON.parse(raw);
      }
    }catch(e){}

    renderProject();

    const pending=pendingCount();
    const online=navigator.onLine;
    const staffName=currentStaffName()||'Chưa chọn';
    const p=latestProgress||{};
    const total=num(p.total);
    const done=Math.min(total,num(p.captured));
    const percent=pct(done,total);

    if(el('waterProjectPending'))el('waterProjectPending').textContent=String(pending);
    if(el('waterProjectNetwork'))el('waterProjectNetwork').textContent=online?'ONLINE':'OFFLINE';
    if(el('waterManageStaff'))el('waterManageStaff').textContent=staffName;
    if(el('waterManageStaffCount'))el('waterManageStaffCount').textContent=String(latestStaff.length||0);
    if(el('waterManagePending'))el('waterManagePending').textContent=String(pending);
    if(el('waterManagePeriod'))el('waterManagePeriod').textContent=text(p.period)||'--/----';
    if(el('waterManageProgress'))el('waterManageProgress').textContent=(total?percent:'--')+'%';
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(typeof d.project==='string'&&text(d.project))latestProject=text(d.project);
    if(d.progress&&typeof d.progress==='object'&&d.progress.ok===true)latestProgress=d.progress;
    if(Array.isArray(d.staff))latestStaff=d.staff.slice();
    refreshSummary();
  });

  function init(){
    if(!ensureTabs())return;
    refreshSummary();
    let active='project';
    try{active=text(localStorage.getItem(ACTIVE_KEY))||'project';}catch(e){}
    selectTab(active,false);

    const pending=el('pending');
    const staff=el('staffName');
    if(window.MutationObserver){
      const obs=new MutationObserver(refreshSummary);
      if(pending)obs.observe(pending,{childList:true,characterData:true,subtree:true});
      if(staff)obs.observe(staff,{childList:true,characterData:true,subtree:true});
    }
  }

  window.addEventListener('online',refreshSummary);
  window.addEventListener('offline',refreshSummary);
  window.addEventListener('pageshow',function(){setTimeout(init,0);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(init,0);});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.WATER_TOP_TABS_BUILD=BUILD;
})();
