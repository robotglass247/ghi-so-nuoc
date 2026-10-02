(function(){
  'use strict';

  const STYLE_ID='meops-catalog-setup-style';
  const MODAL_ID='meops-catalog-setup-modal';
  let catalog=null;

  function readyRpc(){
    return !!(window.google && google.script && google.script.run);
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .meops-cat-side{margin-top:6px;border:1px solid #dbe7f5!important;background:#f7fbff!important;color:#1f5fae!important}
      .meops-cat-mask{position:fixed;inset:0;background:rgba(13,35,62,.46);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px}
      .meops-cat-modal{width:min(980px,96vw);max-height:90vh;overflow:hidden;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(10,35,70,.28);display:flex;flex-direction:column}
      .meops-cat-head{padding:16px 18px;border-bottom:1px solid #e2eaf4;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .meops-cat-head h2{margin:0;color:#15345d;font-size:20px}.meops-cat-head p{margin:5px 0 0;color:#6f8299;font-size:12px;line-height:1.45}
      .meops-cat-close{border:0;background:#f0f4f8;border-radius:9px;width:34px;height:34px;cursor:pointer;font-size:18px;color:#45627f}
      .meops-cat-tools{padding:10px 18px;border-bottom:1px solid #edf2f7;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .meops-cat-tools button,.meops-cat-apply{border:1px solid #cfdced;background:#fff;border-radius:10px;padding:8px 11px;font-weight:700;color:#315271;cursor:pointer}
      .meops-cat-tools button:hover{background:#f2f7fd}.meops-cat-count{margin-left:auto;color:#637b94;font-size:12px;font-weight:700}
      .meops-cat-body{padding:14px 18px;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;background:#f8fbff}
      .meops-cat-item{border:1px solid #dce7f3;background:#fff;border-radius:12px;padding:11px 12px;display:flex;gap:10px;align-items:flex-start;cursor:pointer}
      .meops-cat-item:hover{border-color:#98bce8}.meops-cat-item input{width:18px;height:18px;margin-top:2px;accent-color:#2477f3}.meops-cat-main{min-width:0;flex:1}.meops-cat-name{font-weight:800;color:#193c64;font-size:13px}.meops-cat-meta{margin-top:3px;color:#788ba1;font-size:11px;line-height:1.35}.meops-cat-badge{display:inline-block;margin-top:6px;background:#eef5ff;color:#2477f3;padding:3px 7px;border-radius:99px;font-size:10px;font-weight:800}
      .meops-cat-foot{padding:12px 18px;border-top:1px solid #e2eaf4;display:flex;gap:10px;align-items:center;justify-content:flex-end}.meops-cat-msg{margin-right:auto;color:#607790;font-size:12px;line-height:1.4}.meops-cat-apply{background:#2477f3;color:#fff;border-color:#2477f3;padding:10px 16px}.meops-cat-apply:disabled{opacity:.55;cursor:wait}
      @media(max-width:700px){.meops-cat-body{grid-template-columns:1fr;padding:10px}.meops-cat-mask{padding:5px}.meops-cat-modal{width:100%;max-height:96vh;border-radius:14px}.meops-cat-tools{padding:9px 10px}.meops-cat-head,.meops-cat-foot{padding:12px}.meops-cat-count{width:100%;margin-left:0}}
    `;
    document.head.appendChild(s);
  }

  function runner(method,args){
    return new Promise(function(resolve,reject){
      let r=google.script.run.withSuccessHandler(resolve).withFailureHandler(function(e){reject(e instanceof Error?e:new Error(String((e&&e.message)||e||'Lỗi M&E OPS')));});
      r[method].apply(r,args||[]);
    });
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

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function closeModal(){const m=document.getElementById(MODAL_ID);if(m)m.remove();}

  function openModal(){
    if(!readyRpc()) { alert('Kênh dữ liệu M&E OPS chưa sẵn sàng. Vui lòng thử lại sau vài giây.'); return; }
    closeModal();
    addStyle();
    const mask=document.createElement('div');
    mask.className='meops-cat-mask'; mask.id=MODAL_ID;
    mask.innerHTML='<div class="meops-cat-modal"><div class="meops-cat-head"><div><h2>Thiết lập hệ thống M&E của dự án</h2><p>Chọn các hệ thống thực tế có tại dự án. M&E OPS sẽ lấy công việc vận hành/bảo trì tương ứng sang DANH_MUC và sinh kế hoạch. Nội dung đã chỉnh của các hệ thống còn được chọn sẽ được giữ lại.</p></div><button class="meops-cat-close" type="button">×</button></div><div class="meops-cat-tools"><button type="button" data-act="core">Chọn hệ thống cốt lõi</button><button type="button" data-act="all">Chọn tất cả</button><button type="button" data-act="none">Bỏ chọn</button><span class="meops-cat-count">Đang tải…</span></div><div class="meops-cat-body"><div class="empty">Đang tải danh mục chuẩn…</div></div><div class="meops-cat-foot"><div class="meops-cat-msg">Danh mục dự án là bản riêng; khách hàng có thể chỉnh công việc, tần suất và hướng dẫn cho phù hợp hiện trạng.</div><button class="meops-cat-apply" type="button">ÁP DỤNG VÀO KẾ HOẠCH</button></div></div>';
    document.body.appendChild(mask);
    mask.querySelector('.meops-cat-close').addEventListener('click',closeModal);
    mask.addEventListener('click',function(e){if(e.target===mask)closeModal();});
    mask.querySelector('[data-act="core"]').addEventListener('click',function(){setBy(function(x){return x.getAttribute('data-level')==='CỐT LÕI';});});
    mask.querySelector('[data-act="all"]').addEventListener('click',function(){setBy(function(){return true;});});
    mask.querySelector('[data-act="none"]').addEventListener('click',function(){setBy(function(){return false;});});
    mask.querySelector('.meops-cat-apply').addEventListener('click',applySelection);
    runner('getProjectCatalog',[]).then(function(x){catalog=x||{systems:[]};renderSystems();}).catch(function(err){mask.querySelector('.meops-cat-body').innerHTML='<div class="empty">Không tải được danh mục: '+esc(err.message)+'</div>';});
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
      msg.textContent='Đã áp dụng '+codes.length+' hệ thống · '+Number((r&&r.catalogRows)||0)+' công việc · '+Number(p.rows||0)+' dòng kế hoạch. Công việc theo OEM/điều kiện vẫn nằm trong DANH_MUC để người dùng lập lịch phù hợp.';
      btn.disabled=false; btn.textContent='ĐÃ ÁP DỤNG ✓';
      setTimeout(function(){btn.textContent='ÁP DỤNG LẠI';},1600);
    }).catch(function(err){
      msg.textContent='Lỗi: '+err.message;
      btn.disabled=false; btn.textContent='THỬ LẠI';
    });
  }

  function init(){
    addStyle(); sidebarButton();
    if(!document.querySelector('[data-meops-catalog-btn]')) setTimeout(init,700);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
