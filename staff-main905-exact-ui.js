(function(){
  'use strict';

  const BUILD='879-main905';
  const CACHE_KEY='water_progress_ui3';
  const BACKEND='https://script.google.com/macros/s/AKfycbxAH_a9-AcsKFAzEKkwhv_6xGOHrYyJwJbirqBuMhIP-39xZl-Cwg8ZuLclXkAFOM8/exec';

  function el(id){return document.getElementById(id);}

  /* ================================================================
   * UI3C - HƯỚNG DẪN NẰM TRONG CAMERA, KHÔNG CÒN TAB TRẮNG PHÍA TRÊN
   * ================================================================ */
  function installGuideUi(){
    const style=document.createElement('style');
    style.textContent=`
      .camera .status{
        top:auto !important;
        bottom:18px !important;
        left:12px !important;
        right:12px !important;
        background:transparent !important;
        border-radius:0 !important;
        padding:0 !important;
        color:#fff !important;
        text-align:center !important;
        z-index:4 !important;
        pointer-events:none !important;
        box-shadow:none !important;
        text-shadow:0 2px 5px rgba(0,0,0,.95) !important;
      }
      .camera #statusMain{
        color:#fff !important;
        font-size:20px !important;
        font-weight:800 !important;
        line-height:1.2 !important;
      }
      .camera #statusSub{
        color:#fff !important;
        font-size:13px !important;
        font-weight:700 !important;
        line-height:1.3 !important;
        margin-top:4px !important;
      }
      #syncStatus{
        margin:5px 0 0 !important;
        padding:5px 2px !important;
        min-height:22px !important;
        border:0 !important;
        border-radius:0 !important;
        background:transparent !important;
        color:#555 !important;
        font-size:12px !important;
        font-weight:600 !important;
        text-align:center !important;
        white-space:nowrap !important;
        overflow:hidden !important;
        text-overflow:ellipsis !important;
      }
      #debug,#captureEvidence,#offlineReady{display:none !important;}
      #appFooter{
        margin-top:2px !important;
        padding-top:4px !important;
        border-top:1px solid #eee !important;
        font-size:11px !important;
        color:#666 !important;
        text-align:center !important;
      }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.bottom > div').forEach(function(node){
      if(String(node.textContent||'').trim()==='TRẠNG THÁI THỰC HIỆN'){
        node.style.display='none';
      }
    });
  }

  installGuideUi();

  function periodNow(){
    try{
      const parts=new Intl.DateTimeFormat('en-GB',{
        timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',year:'numeric'
      }).formatToParts(new Date());
      return parts.find(x=>x.type==='month').value+'/'+parts.find(x=>x.type==='year').value;
    }catch(e){
      const d=new Date();
      return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
    }
  }

  function displayPeriod(value){
    const p=String(value||periodNow()).trim();
    const m=/^(0?[1-9]|1[0-2])\/(\d{4})$/.exec(p);
    return m ? String(Number(m[1]))+'/'+m[2] : p;
  }

  function displayCount(n){
    n=Math.max(0,Math.floor(Number(n)||0));
    return String(n);
  }

  function renderProgress(data){
    if(!data||data.ok!==true)return false;
    const total=Math.max(0,Number(data.total)||0);
    const done=Math.max(0,Math.min(total,Number(data.captured)||0));
    const left=Number.isFinite(Number(data.remaining))
      ? Math.max(0,Number(data.remaining))
      : Math.max(0,total-done);

    if(el('progressTotal'))el('progressTotal').textContent=displayCount(total);
    if(el('progressDone'))el('progressDone').textContent=displayCount(done);
    if(el('progressLeft'))el('progressLeft').textContent=displayCount(left);
    if(el('progressPeriod'))el('progressPeriod').textContent=displayPeriod(data.period);

    try{localStorage.setItem(CACHE_KEY,JSON.stringify(data));}catch(e){}
    return true;
  }

  function renderCachedProgress(){
    try{
      const data=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(data&&data.period===periodNow())return renderProgress(data);
    }catch(e){}
    return false;
  }

  function setActivity(text){
    try{
      if(typeof syncRunning!=='undefined'&&syncRunning)return;
    }catch(e){}
    const s=el('syncStatus');
    if(s)s.textContent=String(text||'');
  }

  /* ================================================================
   * 4 TRẠNG THÁI HƯỚNG DẪN CAMERA
   * ================================================================ */
  let guideTimer=null;
  let guideWriting=false;
  let guideHold=false;
  let hasSavedPhoto=false;

  function showGuide(title,sub){
    guideWriting=true;
    const main=el('statusMain');
    const detail=el('statusSub');
    if(main)main.textContent=title;
    if(detail)detail.textContent=sub;
    guideWriting=false;
  }

  function showReadyGuide(){
    showGuide(
      'SẴN SÀNG CHỤP',
      hasSavedPhoto
        ? '4. Đưa đồng hồ tiếp theo vào khung.'
        : '1. Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.'
    );
  }

  const baseSetStatus=window.setStatus;
  if(typeof baseSetStatus==='function'){
    const setStatusUI3C=function(a,b){
      const main=String(a||'');

      if(main==='SẴN SÀNG ĐỒNG HỒ TIẾP THEO'){
        clearTimeout(guideTimer);
        guideHold=true;
        hasSavedPhoto=true;
        showGuide('ĐÃ LƯU ẢNH','3. Ảnh đã lưu an toàn.');
        guideTimer=setTimeout(function(){
          guideHold=false;
          showGuide('SẴN SÀNG CHỤP','4. Đưa đồng hồ tiếp theo vào khung.');
        },1300);
        return;
      }

      if(main==='SẴN SÀNG CHỤP'){
        if(!guideHold)showReadyGuide();
        return;
      }

      if(main==='ĐANG CHỤP...' ||
         main.indexOf('ĐÃ NHẬN ')===0 ||
         main==='ĐANG KẾT NỐI CAMERA' ||
         main==='ĐANG HIỂN THỊ CAMERA'){
        return;
      }

      if(main==='ĐÃ GIỮ ẢNH CŨ'){
        clearTimeout(guideTimer);
        guideHold=false;
        hasSavedPhoto=true;
        showGuide('SẴN SÀNG CHỤP','4. Đưa đồng hồ tiếp theo vào khung.');
        return;
      }

      // Chỉ giữ thông báo lỗi/ngoại lệ cần thiết của cơ chế camera hiện tại.
      return baseSetStatus(a,b);
    };

    window.setStatus=setStatusUI3C;
    try{setStatus=setStatusUI3C;}catch(e){}
  }

  const baseAcceptLiveQR=window.acceptLiveQR;
  if(typeof baseAcceptLiveQR==='function'){
    const acceptLiveQRUI3C=function(raw,source){
      const result=baseAcceptLiveQR(raw,source);
      try{
        if(result&&result.hits>=2){
          clearTimeout(guideTimer);
          guideHold=false;
          showGuide('NHẤN ĐỂ CHỤP','2. QR + mặt số đã nhận. Nhấn CHỤP.');
        }
      }catch(e){}
      return result;
    };

    window.acceptLiveQR=acceptLiveQRUI3C;
    try{acceptLiveQR=acceptLiveQRUI3C;}catch(e){}
  }

  // Base camera có vài chỗ ghi trực tiếp statusSub, không đi qua setStatus.
  // Observer này chỉ sửa câu chữ hiển thị, không can thiệp QR/camera.
  const statusSub=el('statusSub');
  if(statusSub&&window.MutationObserver){
    new MutationObserver(function(){
      if(guideWriting)return;

      if(guideHold){
        showGuide('ĐÃ LƯU ẢNH','3. Ảnh đã lưu an toàn.');
        return;
      }

      const t=String(statusSub.textContent||'');
      if(t.indexOf('QR đã nhận chính xác:')>=0 ||
         t.indexOf('có thể CHỤP')>=0){
        showGuide('NHẤN ĐỂ CHỤP','2. QR + mặt số đã nhận. Nhấn CHỤP.');
        return;
      }

      if(t.indexOf('Để đồng hồ + QR rõ trong khung')>=0 ||
         t.indexOf('Đưa tem QR rõ vào khung')>=0){
        showReadyGuide();
      }
    }).observe(statusSub,{childList:true,characterData:true,subtree:true});
  }

  // Trạng thái đầu tiên khi mở ứng dụng.
  showGuide('SẴN SÀNG CHỤP','1. Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.');

  /* ================================================================
   * NHÂN SỰ + TIẾN ĐỘ QUA POST BRIDGE
   * ================================================================ */
  let bridgeFrame=null;
  let bridgeTimer=null;
  let bridgeSeq=0;
  let expectedRequestId='';

  function cleanupBridge(){
    clearTimeout(bridgeTimer);
    bridgeTimer=null;
    if(bridgeFrame){
      try{bridgeFrame.remove();}catch(e){}
      bridgeFrame=null;
    }
  }

  function hiddenInput(form,name,value){
    const i=document.createElement('input');
    i.type='hidden';
    i.name=name;
    i.value=String(value==null?'':value);
    form.appendChild(i);
  }

  function submitUiState(reason){
    if(!navigator.onLine){
      renderCachedProgress();
      return;
    }

    const seq=++bridgeSeq;
    cleanupBridge();

    const requestId='u'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
    expectedRequestId=requestId;

    const frame=document.createElement('iframe');
    const frameName='waterUiBridge_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    frame.name=frameName;
    frame.id=frameName;
    frame.style.display='none';
    frame.setAttribute('aria-hidden','true');
    document.body.appendChild(frame);
    bridgeFrame=frame;

    const form=document.createElement('form');
    form.method='POST';
    form.action=BACKEND;
    form.target=frameName;
    form.style.display='none';

    hiddenInput(form,'api','uistate');
    hiddenInput(form,'period',periodNow());
    hiddenInput(form,'requestId',requestId);
    hiddenInput(form,'reason',reason||'auto');

    document.body.appendChild(form);
    setActivity('Đang cập nhật nhân sự…');

    try{
      form.submit();
    }catch(err){
      try{form.remove();}catch(e){}
      cleanupBridge();
      setActivity('Không cập nhật được nhân sự. Ảnh vẫn được giữ an toàn.');
      return;
    }

    setTimeout(function(){try{form.remove();}catch(e){}},200);

    bridgeTimer=setTimeout(function(){
      if(seq!==bridgeSeq||expectedRequestId!==requestId)return;
      expectedRequestId='';
      cleanupBridge();
      renderCachedProgress();
      setActivity('Chưa nhận được dữ liệu mới từ Apps Script.');
    },20000);
  }

  function applyStaff(list){
    if(!Array.isArray(list)||!list.length)return false;

    try{
      if(typeof setStaffList==='function'){
        setStaffList(list,'POST bridge');
      }else if(typeof staffList!=='undefined'){
        staffList=list;
      }
    }catch(e){
      try{if(typeof staffList!=='undefined')staffList=list;}catch(_){}
    }

    try{if(typeof staffPrimaryLoaded!=='undefined')staffPrimaryLoaded=true;}catch(e){}
    try{if(typeof renderStaff==='function')renderStaff();}catch(e){}
    try{if(typeof updateStaffName==='function')updateStaffName();}catch(e){}
    return true;
  }

  window.addEventListener('message',function(event){
    const d=event&&event.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(!d.requestId||d.requestId!==expectedRequestId)return;

    const staffOk=applyStaff(d.staff);
    const progressOk=renderProgress(d.progress);

    expectedRequestId='';
    cleanupBridge();

    if(staffOk&&progressOk){
      setActivity('✓ Đã cập nhật '+d.staff.length+' nhân sự · kỳ '+displayPeriod(d.progress.period||periodNow()));
    }else if(staffOk){
      setActivity('✓ Đã cập nhật '+d.staff.length+' nhân sự.');
    }else if(progressOk){
      setActivity('✓ Đã cập nhật tiến độ ghi số.');
    }else{
      setActivity('Dữ liệu phản hồi chưa hợp lệ.');
    }
  });

  function loadStaffUI3(force){
    try{if(typeof staffLoadTimer!=='undefined')clearTimeout(staffLoadTimer);}catch(e){}

    try{
      if(typeof staffList!=='undefined'&&!staffList.length&&typeof loadLocalStaffFirst==='function'){
        loadLocalStaffFirst();
      }
      if(typeof renderStaff==='function')renderStaff();
      if(typeof updateStaffName==='function')updateStaffName();
    }catch(e){}

    if(force)setActivity('Đang cập nhật nhân sự…');
    submitUiState(force?'staff_manual':'staff_auto');
  }

  try{loadStaff=loadStaffUI3;}catch(e){}
  window.loadStaff=loadStaffUI3;
  window.loadWaterProgress=function(){submitUiState('progress');};
  window.loadWaterUiState=submitUiState;

  try{if(typeof staffLoadTimer!=='undefined')clearTimeout(staffLoadTimer);}catch(e){}

  renderCachedProgress();
  setTimeout(function(){submitUiState('startup');},800);
  setInterval(function(){submitUiState('interval');},30000);

  window.addEventListener('online',function(){
    setTimeout(function(){submitUiState('online');},600);
  });

  window.addEventListener('pageshow',function(){
    setTimeout(function(){submitUiState('pageshow');},900);
  });

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'){
      setTimeout(function(){submitUiState('visible');},700);
    }
  });

  const sync=el('syncBtn');
  if(sync)sync.addEventListener('click',function(){
    setTimeout(function(){submitUiState('after_sync');},3500);
    setTimeout(function(){submitUiState('after_sync_2');},9000);
  });

  const shot=el('shotBtn');
  if(shot)shot.addEventListener('click',function(){
    setTimeout(function(){submitUiState('after_shot');},3500);
    setTimeout(function(){submitUiState('after_shot_2');},9000);
  });

  // Nếu các dòng phụ được tạo động sau khi UI3C chạy, ẩn chúng ngay.
  if(window.MutationObserver){
    new MutationObserver(function(){
      ['debug','captureEvidence','offlineReady'].forEach(function(id){
        const node=el(id);
        if(node)node.style.display='none';
      });
      document.querySelectorAll('.bottom > div').forEach(function(node){
        if(String(node.textContent||'').trim()==='TRẠNG THÁI THỰC HIỆN')node.style.display='none';
      });
    }).observe(document.body,{childList:true,subtree:true});
  }
})();

/* STAFF_COMPACT_MAIN905 */
(function(){
  'use strict';

  const STYLE_ID='staffCompactMain905Style';
  const LIST_ID='staffCompactList';

  function addStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #staffSelect{display:none !important;}
      #staffModal .modalIn{
        width:max-content !important;
        max-width:calc(100vw - 24px) !important;
        padding:12px 14px !important;
      }
      #staffModal .modalTitle{
        margin:0 0 7px !important;
        white-space:nowrap !important;
        font-size:16px !important;
        line-height:1.15 !important;
      }
      #staffCompactList{
        margin:0 auto !important;
        border:1px solid #d6d6d6 !important;
        border-radius:8px !important;
        overflow-x:hidden !important;
        overflow-y:auto !important;
        max-height:min(48vh,320px) !important;
        background:#fff !important;
      }
      #staffCompactList .staffCompactItem{
        display:flex !important;
        align-items:center !important;
        gap:5px !important;
        width:100% !important;
        min-height:0 !important;
        height:auto !important;
        margin:0 !important;
        padding:5px 8px !important;
        border:0 !important;
        border-bottom:1px solid #e7e7e7 !important;
        border-radius:0 !important;
        background:#fff !important;
        color:#111 !important;
        font-family:Arial,sans-serif !important;
        font-size:16px !important;
        font-weight:400 !important;
        line-height:1.15 !important;
        text-align:left !important;
        white-space:nowrap !important;
        box-shadow:none !important;
      }
      #staffCompactList .staffCompactItem:last-child{border-bottom:0 !important;}
      #staffCompactList .staffCompactItem.isSelected{
        background:#eef6ff !important;
        font-weight:700 !important;
      }
      #staffCompactList .staffCompactCheck{
        display:inline-block !important;
        flex:0 0 16px !important;
        width:16px !important;
        text-align:center !important;
        font-size:14px !important;
        line-height:1 !important;
      }
      #staffCompactList .staffCompactName{
        display:block !important;
        overflow:hidden !important;
        text-overflow:ellipsis !important;
        white-space:nowrap !important;
      }
    `;
    document.head.appendChild(style);
  }

  function data(){
    try{return Array.isArray(staffList)?staffList:[];}catch(e){return [];}
  }

  function selectedCode(){
    try{
      if(typeof getStaffCode==='function')return String(getStaffCode()||'').trim().toUpperCase();
    }catch(e){}
    try{return String(localStorage.getItem('water_staff')||'').trim().toUpperCase();}catch(e){return '';}
  }

  function ensureList(){
    addStyle();
    const sel=document.getElementById('staffSelect');
    if(!sel)return null;
    sel.setAttribute('aria-hidden','true');
    sel.tabIndex=-1;
    let list=document.getElementById(LIST_ID);
    if(!list){
      list=document.createElement('div');
      list.id=LIST_ID;
      list.setAttribute('role','listbox');
      sel.insertAdjacentElement('afterend',list);
    }
    return list;
  }

  function measure(text,font){
    const c=document.createElement('canvas');
    const ctx=c.getContext('2d');
    ctx.font=font||'16px Arial';
    return ctx.measureText(String(text||'')).width;
  }

  function fitCompactStaff(){
    const list=ensureList();
    if(!list)return;
    const rows=data();
    let longest=0;
    rows.forEach(x=>{longest=Math.max(longest,measure(String(x.ten||'').trim(),'16px Arial'));});
    const nameWidth=Math.ceil(longest+16+5+18);
    const maxList=Math.max(180,window.innerWidth-56);
    const listWidth=Math.min(Math.max(nameWidth,180),maxList);
    list.style.width=listWidth+'px';

    const title=document.querySelector('#staffModal .modalTitle');
    const titleWidth=title?Math.ceil(measure(title.textContent||'','700 16px Arial')+8):0;
    const modal=document.querySelector('#staffModal .modalIn');
    if(modal){
      const modalWidth=Math.min(Math.max(listWidth+28,titleWidth+28),window.innerWidth-24);
      modal.style.width=modalWidth+'px';
    }
  }

  function renderCompactStaff(){
    const sel=document.getElementById('staffSelect');
    const list=ensureList();
    if(!sel||!list)return;

    const rows=data();
    const old=selectedCode();

    sel.innerHTML='<option value="">-- Chọn nhân sự --</option>';
    rows.forEach(x=>{
      const op=document.createElement('option');
      op.value=String(x.ma||'').trim().toUpperCase();
      op.textContent=String(x.ten||'').trim();
      sel.appendChild(op);
    });
    if(old)sel.value=old;

    list.innerHTML='';
    if(!rows.length){
      const empty=document.createElement('div');
      empty.textContent='Đang tải danh sách nhân sự...';
      empty.style.cssText='padding:6px 8px;font:16px/1.15 Arial;white-space:nowrap';
      list.appendChild(empty);
    }else{
      rows.forEach(x=>{
        const ma=String(x.ma||'').trim().toUpperCase();
        const ten=String(x.ten||'').trim();
        const b=document.createElement('button');
        b.type='button';
        b.className='staffCompactItem'+(ma===old?' isSelected':'');
        b.dataset.ma=ma;
        b.setAttribute('role','option');
        b.setAttribute('aria-selected',ma===old?'true':'false');

        const check=document.createElement('span');
        check.className='staffCompactCheck';
        check.textContent=ma===old?'✓':'';
        const name=document.createElement('span');
        name.className='staffCompactName';
        name.textContent=ten;
        b.append(check,name);

        b.addEventListener('click',()=>{
          sel.value=ma;
          list.querySelectorAll('.staffCompactItem').forEach(node=>{
            const on=node.dataset.ma===ma;
            node.classList.toggle('isSelected',on);
            node.setAttribute('aria-selected',on?'true':'false');
            const c=node.querySelector('.staffCompactCheck');
            if(c)c.textContent=on?'✓':'';
          });
        });
        list.appendChild(b);
      });
    }
    requestAnimationFrame(fitCompactStaff);
  }

  addStyle();
  window.renderStaff=renderCompactStaff;
  window.fitStaffSelectSize=fitCompactStaff;
  try{renderStaff=renderCompactStaff;}catch(e){}
  try{fitStaffSelectSize=fitCompactStaff;}catch(e){}
  window.addEventListener('resize',()=>requestAnimationFrame(fitCompactStaff));
  setTimeout(renderCompactStaff,0);
})();

