(function(){
  'use strict';

  const STYLE_ID='meops-catalog-setup-v2-style';
  const MODAL_ID='meops-catalog-setup-modal';
  const EDITOR_ID='meops-catalog-task-editor-modal';
  let catalog=null;
  let editorTasks=[];
  let editorCurrent=null;

  function readyRpc(){ return !!(window.google && google.script && google.script.run); }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function runner(method,args){
    return new Promise(function(resolve,reject){
      let r=google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(function(e){reject(e instanceof Error?e:new Error(String((e&&e.message)||e||'Lỗi M&E OPS')));});
      r[method].apply(r,args||[]);
    });
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .meops-cat-side{margin-top:6px;border:1px solid #dbe7f5!important;background:#f7fbff!important;color:#1f5fae!important}
      .meops-cat-mask{position:fixed;inset:0;background:rgba(13,35,62,.46);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px}
      .meops-cat-modal{width:min(1040px,96vw);max-height:92vh;overflow:hidden;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(10,35,70,.28);display:flex;flex-direction:column}
      .meops-cat-head{padding:16px 18px;border-bottom:1px solid #e2eaf4;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .meops-cat-head h2{margin:0;color:#15345d;font-size:20px}.meops-cat-head p{margin:5px 0 0;color:#6f8299;font-size:12px;line-height:1.45}
      .meops-cat-close{border:0;background:#f0f4f8;border-radius:9px;width:34px;height:34px;cursor:pointer;font-size:18px;color:#45627f}
      .meops-cat-tools{padding:10px 18px;border-bottom:1px solid #edf2f7;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .meops-cat-tools button,.meops-cat-apply,.meops-editor-save{border:1px solid #cfdced;background:#fff;border-radius:10px;padding:8px 11px;font-weight:700;color:#315271;cursor:pointer}
      .meops-cat-tools button:hover{background:#f2f7fd}.meops-cat-edit-btn{background:#eef5ff!important;color:#1f5fae!important;border-color:#bdd5f4!important}
      .meops-cat-count{margin-left:auto;color:#637b94;font-size:12px;font-weight:700}
      .meops-cat-body{padding:14px 18px;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;background:#f8fbff}
      .meops-cat-item{border:1px solid #dce7f3;background:#fff;border-radius:12px;padding:11px 12px;display:flex;gap:10px;align-items:flex-start;cursor:pointer}
      .meops-cat-item:hover{border-color:#98bce8}.meops-cat-item input{width:18px;height:18px;margin-top:2px;accent-color:#2477f3}
      .meops-cat-main{min-width:0;flex:1}.meops-cat-name{font-weight:800;color:#193c64;font-size:13px}.meops-cat-meta{margin-top:3px;color:#788ba1;font-size:11px;line-height:1.35}
      .meops-cat-badge{display:inline-block;margin-top:6px;background:#eef5ff;color:#2477f3;padding:3px 7px;border-radius:99px;font-size:10px;font-weight:800}
      .meops-cat-foot{padding:12px 18px;border-top:1px solid #e2eaf4;display:flex;gap:10px;align-items:center;justify-content:flex-end}
      .meops-cat-msg{margin-right:auto;color:#607790;font-size:12px;line-height:1.4}.meops-cat-apply,.meops-editor-save{background:#2477f3;color:#fff;border-color:#2477f3;padding:10px 16px}
      .meops-cat-apply:disabled,.meops-editor-save:disabled{opacity:.55;cursor:wait}
      .meops-editor-modal{width:min(1180px,97vw);max-height:94vh}
      .meops-editor-toolbar{padding:10px 16px;border-bottom:1px solid #e7eef7;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .meops-editor-toolbar label{font-size:12px;font-weight:800;color:#315271}
      .meops-editor-toolbar select{min-width:280px;border:1px solid #cbdced;border-radius:9px;padding:9px 10px;color:#17365d;background:#fff}
      .meops-editor-layout{display:grid;grid-template-columns:340px minmax(0,1fr);min-height:0;flex:1}
      .meops-task-list{overflow:auto;border-right:1px solid #e4edf6;background:#f8fbff;padding:10px}
      .meops-task-row{width:100%;text-align:left;border:1px solid #dce7f3;background:#fff;border-radius:10px;padding:9px 10px;margin-bottom:7px;cursor:pointer}
      .meops-task-row:hover,.meops-task-row.active{border-color:#83afe8;background:#eef5ff}
      .meops-task-code{font-size:10px;color:#7b8fa6;font-weight:800}.meops-task-title{font-size:12px;color:#193c64;font-weight:800;margin-top:2px;line-height:1.35}
      .meops-task-meta{font-size:10px;color:#73879e;margin-top:4px}
      .meops-editor-form{overflow:auto;padding:14px 16px 18px}
      .meops-editor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}
      .meops-editor-field{min-width:0}.meops-editor-field.full{grid-column:1/-1}
      .meops-editor-field label{display:block;font-size:11px;font-weight:800;color:#315271;margin-bottom:5px}
      .meops-editor-field input,.meops-editor-field select,.meops-editor-field textarea{width:100%;border:1px solid #cbdced;border-radius:9px;padding:9px 10px;color:#17365d;background:#fff;font:inherit;font-size:12px}
      .meops-editor-field textarea{min-height:82px;resize:vertical}.meops-editor-field textarea.tall{min-height:120px}
      .meops-editor-actions{display:flex;gap:10px;align-items:center;margin-top:12px}.meops-editor-status{font-size:11px;color:#607790;line-height:1.4}
      .meops-empty{padding:18px;color:#7a8ea7;text-align:center}
      @media(max-width:760px){
        .meops-cat-body{grid-template-columns:1fr;padding:10px}.meops-cat-mask{padding:4px}.meops-cat-modal{width:100%;max-height:97vh;border-radius:14px}
        .meops-cat-tools,.meops-cat-head,.meops-cat-foot{padding:10px}.meops-cat-count{width:100%;margin-left:0}
        .meops-editor-layout{grid-template-columns:1fr}.meops-task-list{max-height:220px;border-right:0;border-bottom:1px solid #e4edf6}
        .meops-editor-grid{grid-template-columns:1fr}.meops-editor-field.full{grid-column:auto}.meops-editor-toolbar select{min-width:0;width:100%}
      }
    `;
    document.head.appendChild(s);
  }

  function sidebarButton(){
    if(document.querySelector('[data-meops-catalog-btn]')) return;
    const side=document.querySelector('.sidebar');
    if(!side) return;
    const b=document.createElement('button');
    b.className='sidebtn meops-cat-side';
    b.type='button';
    b.setAttribute('data-meops-catalog-btn','1');
    b.innerHTML='<span class="sideico">🧩</span><span>Thiết lập dự án</span>';
    b.addEventListener('click',openModal);
    const footer=side.querySelector('.sidefooter');
    if(footer) side.insertBefore(b,footer); else side.appendChild(b);
  }

  function selectedCodes(){
    return Array.from(document.querySelectorAll('#'+MODAL_ID+' input[data-code]:checked')).map(function(x){return x.getAttribute('data-code');});
  }
  function updateCount(){
    const el=document.querySelector('#'+MODAL_ID+' .meops-cat-count');
    if(el) el.textContent='Đã chọn '+selectedCodes().length+' / '+((catalog&&catalog.systems&&catalog.systems.length)||0)+' hệ thống';
  }
  function setBy(fn){
    document.querySelectorAll('#'+MODAL_ID+' input[data-code]').forEach(function(x){x.checked=!!fn(x);});
    updateCount();
  }
  function renderSystems(){
    const body=document.querySelector('#'+MODAL_ID+' .meops-cat-body');
    if(!body) return;
    const systems=(catalog&&catalog.systems)||[];
    body.innerHTML=systems.map(function(s){
      const checked=s.selected?' checked':'';
      const level=String(s.level||'');
      return '<label class="meops-cat-item"><input type="checkbox" data-code="'+esc(s.code)+'" data-level="'+esc(level)+'"'+checked+'><span class="meops-cat-main"><span class="meops-cat-name">'+esc(s.name)+'</span><span class="meops-cat-meta">'+esc(s.code)+' · '+esc(s.group||'')+' · '+esc(s.scope||'')+'</span><span class="meops-cat-badge">'+Number(s.taskCount||0)+' công việc · '+esc(level||'TÙY DỰ ÁN')+'</span></span></label>';
    }).join('');
    body.querySelectorAll('input[data-code]').forEach(function(x){x.addEventListener('change',updateCount);});
    updateCount();
  }
  function closeModal(){const m=document.getElementById(MODAL_ID);if(m)m.remove();}
  function closeEditor(){const m=document.getElementById(EDITOR_ID);if(m)m.remove();}

  function openModal(){
    if(!readyRpc()){alert('Kênh dữ liệu M&E OPS chưa sẵn sàng. Vui lòng thử lại sau vài giây.');return;}
    closeModal(); addStyle();
    const mask=document.createElement('div');
    mask.className='meops-cat-mask'; mask.id=MODAL_ID;
    mask.innerHTML='<div class="meops-cat-modal"><div class="meops-cat-head"><div><h2>Thiết lập hệ thống M&E của dự án</h2><p>Chọn các hệ thống thực tế có tại dự án. M&E OPS sẽ lấy công việc vận hành/bảo trì tương ứng sang DANH_MUC và sinh kế hoạch. Dữ liệu của dự án là bản riêng.</p></div><button class="meops-cat-close" type="button">×</button></div><div class="meops-cat-tools"><button type="button" data-act="core">Chọn hệ thống cốt lõi</button><button type="button" data-act="all">Chọn tất cả</button><button type="button" data-act="none">Bỏ chọn</button><button type="button" class="meops-cat-edit-btn" data-act="edit">📝 Chỉnh công việc & hướng dẫn</button><span class="meops-cat-count">Đang tải…</span></div><div class="meops-cat-body"><div class="meops-empty">Đang tải danh mục chuẩn…</div></div><div class="meops-cat-foot"><div class="meops-cat-msg">Khách hàng có thể chỉnh công việc, tần suất và hướng dẫn riêng cho dự án mà không ảnh hưởng MASTER.</div><button class="meops-cat-apply" type="button">ÁP DỤNG VÀO KẾ HOẠCH</button></div></div>';
    document.body.appendChild(mask);
    mask.querySelector('.meops-cat-close').addEventListener('click',closeModal);
    mask.addEventListener('click',function(e){if(e.target===mask)closeModal();});
    mask.querySelector('[data-act="core"]').addEventListener('click',function(){setBy(function(x){return x.getAttribute('data-level')==='CỐT LÕI';});});
    mask.querySelector('[data-act="all"]').addEventListener('click',function(){setBy(function(){return true;});});
    mask.querySelector('[data-act="none"]').addEventListener('click',function(){setBy(function(){return false;});});
    mask.querySelector('[data-act="edit"]').addEventListener('click',openEditor);
    mask.querySelector('.meops-cat-apply').addEventListener('click',applySelection);
    runner('getProjectCatalog',[]).then(function(x){catalog=x||{systems:[]};renderSystems();}).catch(function(err){
      mask.querySelector('.meops-cat-body').innerHTML='<div class="meops-empty">Không tải được danh mục: '+esc(err.message)+'</div>';
    });
  }

  function clearLocalCaches(){
    try{
      const remove=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(k.indexOf('meops_dashboard_')===0 || k.indexOf('meops_plan_')===0) remove.push(k);
      }
      remove.forEach(function(k){localStorage.removeItem(k);});
    }catch(e){}
  }

  function applySelection(){
    const modal=document.getElementById(MODAL_ID); if(!modal)return;
    const btn=modal.querySelector('.meops-cat-apply');
    const msg=modal.querySelector('.meops-cat-msg');
    const codes=selectedCodes();
    btn.disabled=true; btn.textContent='ĐANG TẠO KẾ HOẠCH…';
    msg.textContent='Đang đồng bộ '+codes.length+' hệ thống. Không đóng trang trong lúc xử lý.';
    runner('applyProjectCatalog',[codes,new Date().getFullYear()]).then(function(r){
      clearLocalCaches();
      const p=(r&&r.plan)||{};
      msg.textContent='Đã áp dụng '+codes.length+' hệ thống · '+Number((r&&r.catalogRows)||0)+' công việc · '+Number(p.rows||0)+' dòng kế hoạch · '+Number(p.unscheduledCatalogTasks||0)+' công việc chờ người dùng chọn lịch cụ thể.';
      btn.disabled=false; btn.textContent='ĐÃ ÁP DỤNG ✓';
      setTimeout(function(){btn.textContent='ÁP DỤNG LẠI';},1600);
      return runner('getProjectCatalog',[]);
    }).then(function(x){if(x){catalog=x;renderSystems();}}).catch(function(err){
      msg.textContent='Lỗi: '+err.message;
      btn.disabled=false; btn.textContent='THỬ LẠI';
    });
  }

  function systemOptions(){
    const systems=(catalog&&catalog.systems)||[];
    return systems.map(function(s){return '<option value="'+esc(s.code)+'">'+esc(s.name)+' ('+esc(s.code)+')</option>';}).join('');
  }

  function openEditor(){
    if(!catalog || !Array.isArray(catalog.systems)){ alert('Danh mục hệ thống chưa tải xong.'); return; }
    closeEditor(); addStyle();
    const mask=document.createElement('div');
    mask.className='meops-cat-mask'; mask.id=EDITOR_ID;
    mask.innerHTML='<div class="meops-cat-modal meops-editor-modal"><div class="meops-cat-head"><div><h2>Chỉnh công việc & hướng dẫn của dự án</h2><p>Mọi thay đổi chỉ áp dụng cho database dự án hiện tại. Mã công việc được giữ cố định để bảo toàn liên kết dữ liệu.</p></div><button class="meops-cat-close" type="button">×</button></div><div class="meops-editor-toolbar"><label>Hệ thống</label><select id="meops-editor-system">'+systemOptions()+'</select><span class="meops-editor-status" id="meops-editor-top-status"></span></div><div class="meops-editor-layout"><div class="meops-task-list" id="meops-task-list"><div class="meops-empty">Chọn hệ thống để tải công việc.</div></div><div class="meops-editor-form" id="meops-editor-form"><div class="meops-empty">Chọn một công việc ở danh sách bên trái.</div></div></div></div>';
    document.body.appendChild(mask);
    mask.querySelector('.meops-cat-close').addEventListener('click',closeEditor);
    mask.addEventListener('click',function(e){if(e.target===mask)closeEditor();});
    const sel=mask.querySelector('#meops-editor-system');
    const selected=(catalog.systems||[]).find(function(s){return s.selected;});
    if(selected) sel.value=selected.code;
    sel.addEventListener('change',function(){loadEditorTasks(sel.value);});
    loadEditorTasks(sel.value);
  }

  function loadEditorTasks(systemCode){
    editorCurrent=null; editorTasks=[];
    const list=document.getElementById('meops-task-list');
    const form=document.getElementById('meops-editor-form');
    const st=document.getElementById('meops-editor-top-status');
    if(list) list.innerHTML='<div class="meops-empty">Đang tải công việc…</div>';
    if(form) form.innerHTML='<div class="meops-empty">Đang tải…</div>';
    if(st) st.textContent='';
    runner('getProjectCatalogTasks',[systemCode]).then(function(r){
      editorTasks=(r&&Array.isArray(r.tasks))?r.tasks:[];
      renderTaskList();
      if(editorTasks.length) selectTask(editorTasks[0].code);
      else if(form) form.innerHTML='<div class="meops-empty">Hệ thống này chưa có công việc.</div>';
    }).catch(function(err){
      if(list) list.innerHTML='<div class="meops-empty">Không tải được công việc. Backend cần phiên bản V4.3.<br>'+esc(err.message)+'</div>';
      if(form) form.innerHTML='<div class="meops-empty">Hãy cập nhật Apps Script V4.3 rồi thử lại.</div>';
    });
  }

  function renderTaskList(){
    const list=document.getElementById('meops-task-list'); if(!list)return;
    list.innerHTML=editorTasks.map(function(t){
      return '<button type="button" class="meops-task-row'+(editorCurrent&&editorCurrent.code===t.code?' active':'')+'" data-task-code="'+esc(t.code)+'"><div class="meops-task-code">'+esc(t.code)+'</div><div class="meops-task-title">'+esc(t.task||'(Chưa đặt tên)')+'</div><div class="meops-task-meta">'+esc(t.frequency||'Chưa có tần suất')+' · '+esc(t.type||'')+'</div></button>';
    }).join('') || '<div class="meops-empty">Không có công việc.</div>';
    list.querySelectorAll('[data-task-code]').forEach(function(b){b.addEventListener('click',function(){selectTask(b.getAttribute('data-task-code'));});});
  }

  function selectTask(code){
    editorCurrent=editorTasks.find(function(t){return t.code===code;})||null;
    renderTaskList(); renderTaskForm();
  }

  function renderTaskForm(){
    const form=document.getElementById('meops-editor-form'); if(!form)return;
    const t=editorCurrent;
    if(!t){form.innerHTML='<div class="meops-empty">Chọn một công việc.</div>';return;}
    const freq=['Ngày','Tuần','Tháng','Quý','6 tháng','Năm','Theo OEM / giờ máy','Theo quy định','Theo tình trạng','Trước mỗi lần dùng'];
    const types=['Vận hành','Kiểm tra','Bảo trì','Thử nghiệm','Kiểm định'];
    const pri=['Thấp','Trung bình','Cao','Khẩn cấp'];
    function opts(arr,val){return arr.map(function(x){return '<option'+(String(x)===String(val)?' selected':'')+'>'+esc(x)+'</option>';}).join('');}
    form.innerHTML='<div class="meops-editor-grid">'+
      '<div class="meops-editor-field"><label>Mã công việc</label><input id="ec-code" value="'+esc(t.code)+'" disabled></div>'+
      '<div class="meops-editor-field"><label>Phân hệ / Thiết bị</label><input id="ec-subsystem" value="'+esc(t.subsystem)+'"></div>'+
      '<div class="meops-editor-field full"><label>Tên công việc</label><input id="ec-task" value="'+esc(t.task)+'"></div>'+
      '<div class="meops-editor-field"><label>Loại công việc</label><select id="ec-type">'+opts(types,t.type)+'</select></div>'+
      '<div class="meops-editor-field"><label>Tần suất</label><select id="ec-frequency">'+opts(freq,t.frequency)+'</select></div>'+
      '<div class="meops-editor-field"><label>Tháng gợi ý</label><input id="ec-months" value="'+esc(t.months)+'" placeholder="Ví dụ: 3,6,9,12"></div>'+
      '<div class="meops-editor-field"><label>Bộ phận phụ trách</label><input id="ec-dept" value="'+esc(t.dept)+'"></div>'+
      '<div class="meops-editor-field"><label>Mức độ</label><select id="ec-priority">'+opts(pri,t.priority)+'</select></div>'+
      '<div class="meops-editor-field"><label>Kích hoạt</label><select id="ec-active"><option value="true"'+(t.active?' selected':'')+'>Có</option><option value="false"'+(!t.active?' selected':'')+'>Không</option></select></div>'+
      '<div class="meops-editor-field full"><label>Hướng dẫn thực hiện</label><textarea class="tall" id="ec-guide">'+esc(t.guide)+'</textarea></div>'+
      '<div class="meops-editor-field full"><label>An toàn / PPE</label><textarea id="ec-safety">'+esc(t.safety)+'</textarea></div>'+
      '<div class="meops-editor-field full"><label>Tiêu chuẩn kết quả</label><textarea id="ec-result">'+esc(t.resultStandard)+'</textarea></div>'+
      '<div class="meops-editor-field full"><label>Dụng cụ / Tài liệu</label><textarea id="ec-tools">'+esc(t.tools)+'</textarea></div>'+
    '</div><div class="meops-editor-actions"><button type="button" class="meops-editor-save">LƯU THAY ĐỔI</button><div class="meops-editor-status" id="meops-editor-save-status">Thay đổi được lưu vào database riêng của dự án.</div></div>';
    form.querySelector('.meops-editor-save').addEventListener('click',saveEditorTask);
  }

  function val(id){const e=document.getElementById(id);return e?String(e.value||'').trim():'';}
  function saveEditorTask(){
    if(!editorCurrent)return;
    const btn=document.querySelector('#'+EDITOR_ID+' .meops-editor-save');
    const st=document.getElementById('meops-editor-save-status');
    const payload={
      code:editorCurrent.code,
      subsystem:val('ec-subsystem'), task:val('ec-task'), type:val('ec-type'), frequency:val('ec-frequency'), months:val('ec-months'),
      dept:val('ec-dept'), priority:val('ec-priority'), active:val('ec-active')!=='false', applicable:editorCurrent.applicable!==false,
      guide:val('ec-guide'), safety:val('ec-safety'), resultStandard:val('ec-result'), tools:val('ec-tools')
    };
    if(!payload.task){if(st)st.textContent='Tên công việc không được để trống.';return;}
    btn.disabled=true;btn.textContent='ĐANG LƯU…';if(st)st.textContent='Đang lưu dữ liệu dự án…';
    runner('saveProjectCatalogTask',[payload]).then(function(r){
      Object.assign(editorCurrent,payload); renderTaskList();
      if(st)st.textContent=(r&&r.message)||'Đã lưu.';
      btn.disabled=false;btn.textContent='ĐÃ LƯU ✓'; setTimeout(function(){if(btn){btn.textContent='LƯU THAY ĐỔI';}},1300);
    }).catch(function(err){
      if(st)st.textContent='Lỗi: '+err.message; btn.disabled=false;btn.textContent='THỬ LẠI';
    });
  }

  function init(){
    addStyle(); sidebarButton();
    if(!document.querySelector('[data-meops-catalog-btn]')) setTimeout(init,700);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();