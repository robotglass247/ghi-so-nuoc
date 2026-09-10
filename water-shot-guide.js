(function(){
  'use strict';

  function el(id){ return document.getElementById(id); }

  function cleanGuideText(text){
    return String(text || '').replace(/^\s*[1-4]\.\s*/, '').trim();
  }

  function getApartmentCode(){
    // Ưu tiên biến toàn cục nếu app gốc đã có
    const candidates = [
      window.currentCanHo,
      window.currentApartment,
      window.currentApartmentCode,
      window.selectedApartment,
      window.selectedCanHo,
      window.lastApartmentCode,
      window.lastCanHo
    ];

    for(const v of candidates){
      if(v && String(v).trim()) return String(v).trim();
    }

    // Thử đọc từ các ô/nhãn hay dùng trong app
    const domIds = [
      'canHo',
      'canHoText',
      'apartmentCode',
      'apartmentText',
      'selectedApartment',
      'selectedCanHo',
      'qrResult',
      'meterLabel'
    ];

    for(const id of domIds){
      const node = el(id);
      if(node){
        const txt = (node.value || node.textContent || '').trim();
        if(txt) return txt;
      }
    }

    return '';
  }

  function install(){
    const statusBox  = document.querySelector('.camera .status');
    const statusMain = el('statusMain');
    const statusSub  = el('statusSub');
    const shotBtn    = el('shotBtn');
    const cameraBox  = document.querySelector('.camera');
    const frameBox   = document.querySelector('.camera .frame');

    if(!statusMain || !statusSub || !shotBtn) return;

    const style = document.createElement('style');
    style.textContent = `
      .camera .status{
        display:none !important;
      }

      /* Khung camera cân giữa màn hình */
      .camera{
        position:relative !important;
        display:flex !important;
        align-items:center !important;
        justify-content:center !important;
        overflow:hidden !important;
      }

      .camera .frame{
        position:absolute !important;
        left:50% !important;
        top:50% !important;
        transform:translate(-50%,-50%) !important;
        width:min(86vw, 680px) !important;
        height:min(58vh, 520px) !important;
        border:4px solid rgba(255,255,255,.9) !important;
        border-radius:20px !important;
        box-sizing:border-box !important;
        pointer-events:none !important;
      }

      #shotBtn{
        min-height:82px !important;
        padding:10px 12px !important;
        display:none;
        flex-direction:column !important;
        align-items:center !important;
        justify-content:center !important;
        gap:4px !important;
        line-height:1.15 !important;
        text-align:center !important;
      }

      #shotBtn .waterShotTitle{
        display:block;
        font-size:20px;
        font-weight:800;
        line-height:1.1;
      }

      #shotBtn .waterShotSub{
        display:block;
        margin-top:2px;
        font-size:12px;
        font-weight:600;
        line-height:1.22;
        color:#555;
      }
    `;
    document.head.appendChild(style);

    function ensureButtonLayout(){
      let title = shotBtn.querySelector('.waterShotTitle');
      let sub   = shotBtn.querySelector('.waterShotSub');

      if(!title || !sub){
        shotBtn.textContent = '';
        title = document.createElement('span');
        title.className = 'waterShotTitle';

        sub = document.createElement('span');
        sub.className = 'waterShotSub';

        shotBtn.appendChild(title);
        shotBtn.appendChild(sub);
      }

      return { title, sub };
    }

    function buildTitle(){
      const main = String(statusMain.textContent || 'SẴN SÀNG CHỤP').trim();
      const apt  = getApartmentCode();

      // Nếu đang ở trạng thái NHẤN ĐỂ CHỤP và đã có mã căn hộ
      if(main === 'NHẤN ĐỂ CHỤP' && apt){
        return apt + ' - NHẤN ĐỂ CHỤP';
      }

      return main;
    }

    function mirror(){
      const parts = ensureButtonLayout();
      parts.title.textContent = buildTitle();
      parts.sub.textContent   = cleanGuideText(statusSub.textContent);
    }

    mirror();

    if(window.MutationObserver){
      const obs = new MutationObserver(mirror);
      obs.observe(statusMain, { childList:true, characterData:true, subtree:true });
      obs.observe(statusSub,  { childList:true, characterData:true, subtree:true });
    }

    // App gốc đôi khi chuyển display:block -> ép lại thành flex
    const displayObserver = new MutationObserver(function(){
      if(shotBtn.style.display === 'block') shotBtn.style.display = 'flex';
      mirror();
    });

    displayObserver.observe(shotBtn, { attributes:true, attributeFilter:['style'] });

    // Cập nhật liên tục để bắt kịp khi app đổi mã căn hộ sau khi quét QR
    setInterval(mirror, 300);

    if(shotBtn.style.display === 'block') shotBtn.style.display = 'flex';
    if(statusBox) statusBox.setAttribute('aria-hidden', 'true');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', install, { once:true });
  }else{
    install();
  }
})();
