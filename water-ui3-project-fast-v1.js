(function(){
  'use strict';

  const BUILD='water-ui3-project-fast-v1-no-legacy-progress';

  function el(id){return document.getElementById(id);}

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
      if(String(node.textContent||'').trim()==='TRẠNG THÁI THỰC HIỆN')node.style.display='none';
    });
  }

  installGuideUi();

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

  const statusSub=el('statusSub');
  if(statusSub&&window.MutationObserver){
    new MutationObserver(function(){
      if(guideWriting)return;

      if(guideHold){
        showGuide('ĐÃ LƯU ẢNH','3. Ảnh đã lưu an toàn.');
        return;
      }

      const t=String(statusSub.textContent||'');
      if(t.indexOf('QR đã nhận chính xác:')>=0 || t.indexOf('có thể CHỤP')>=0){
        showGuide('NHẤN ĐỂ CHỤP','2. QR + mặt số đã nhận. Nhấn CHỤP.');
        return;
      }

      if(t.indexOf('Để đồng hồ + QR rõ trong khung')>=0 || t.indexOf('Đưa tem QR rõ vào khung')>=0){
        showReadyGuide();
      }
    }).observe(statusSub,{childList:true,characterData:true,subtree:true});
  }

  showGuide('SẴN SÀNG CHỤP','1. Đưa mặt đồng hồ + QR hiện rõ trong khung ảnh.');

  // Không còn CACHE_KEY, BACKEND cũ, renderCachedProgress(), submitUiState(),
  // timer 30 giây hay request tiến độ/nhân sự riêng. Nguồn duy nhất là
  // water-progress-authority-v1.js theo PROJECT_ID.

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

  window.WATER_UI3_FAST_BUILD=BUILD;
})();

/* STAFF_COMPACT_MAIN905 - giữ nguyên giao diện chọn nhân sự */
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
    rows.forEach(function(x){
      longest=Math.max(longest,measure(String(x.ten||'').trim(),'16px Arial'));
    });
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
    rows.forEach(function(x){
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
      rows.forEach(function(x){
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

        b.addEventListener('click',function(){
          sel.value=ma;
          list.querySelectorAll('.staffCompactItem').forEach(function(node){
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
  window.addEventListener('resize',function(){requestAnimationFrame(fitCompactStaff);});
  setTimeout(renderCompactStaff,0);
})();
