(function(){
  'use strict';

  const STYLE_ID='meops-result-v2-style';
  let operationType='Vận hành';
  let systemsLoaded=false;
  let systemsLoading=false;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function byId(id){return document.getElementById(id);}
  function readyRpc(){return !!(window.google&&google.script&&google.script.run);}

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #resultModule .meops-op-type-wrap{grid-column:1/-1}
      #resultModule .meops-op-type-label{display:block;font-size:12px;font-weight:800;color:#315271;margin-bottom:7px}
      #resultModule .meops-op-types{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #resultModule .meops-op-type{border:1px solid #cfdeee;background:#fff;color:#315271;border-radius:10px;padding:10px 8px;font-weight:800;cursor:pointer;min-height:44px}
      #resultModule .meops-op-type.active{border-color:#2477f3;background:#eef5ff;color:#1764c0;box-shadow:inset 0 0 0 1px rgba(36,119,243,.12)}
      #resultModule .meops-op-help{font-size:11px;color:#70839a;margin-top:6px;line-height:1.4}
      #resultModule .meops-op-incident-ref{display:none}
      #resultModule .meops-op-incident-ref.show{display:block}
      #resultModule .meops-op-summary{grid-column:1/-1;border:1px solid #dce7f3;background:#f8fbff;border-radius:11px;padding:10px 12px;color:#47647f;font-size:12px;line-height:1.45}
      #resultModule .meops-op-summary b{color:#173f6b}
      @media(max-width:760px){#resultModule .meops-op-types{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function setType(type){
    operationType=type||'Vận hành';
    document.querySelectorAll('#resultModule [data-meops-op-type]').forEach(function(b){
      b.classList.toggle('active',b.getAttribute('data-meops-op-type')===operationType);
    });
    const ref=document.querySelector('#resultModule .meops-op-incident-ref');
    document.querySelectorAll('#resultModule .meops-op-incident-ref').forEach(function(x){x.classList.toggle('show',operationType==='Khắc phục sự cố');});
    const btn=byId('btn-save-operation');
    if(btn) btn.textContent=operationType==='Vận hành'?'Lưu kết quả vận hành':(operationType==='Bảo trì sửa chữa'?'Lưu kết quả sửa chữa':'Lưu kết quả khắc phục');
    const summary=byId('meops-op-summary');
    if(summary){
      const text=operationType==='Vận hành'
        ? 'Ghi nhận kiểm tra/chạy máy/chỉ số vận hành thường xuyên.'
        : operationType==='Bảo trì sửa chữa'
          ? 'Ghi nhận sửa chữa hoặc bảo trì phát sinh ngoài kế hoạch bảo trì định kỳ.'
          : 'Ghi nhận việc xử lý/khắc phục cho một sự cố đã được báo trước đó.';
      summary.innerHTML='<b>'+esc(operationType)+'</b> · '+esc(text);
    }
  }

  function populateSystems(){
    const sel=byId('vh-system');
    if(!sel||!readyRpc()||systemsLoaded||systemsLoading) return;
    systemsLoading=true;
    google.script.run
      .withSuccessHandler(function(x){
        systemsLoading=false;
        systemsLoaded=true;
        const systems=(x&&Array.isArray(x.systems))?x.systems:[];
        const chosen=systems.filter(function(s){return s.selected;});
        const rows=(chosen.length?chosen:systems);
        sel.innerHTML='<option value="">-- Chọn hệ thống --</option>'+rows.map(function(s){return '<option value="'+esc(s.name)+'">'+esc(s.name)+' ('+esc(s.code)+')</option>';}).join('');
      })
      .withFailureHandler(function(){systemsLoading=false;})
      .getProjectCatalog();
  }

  function installUi(){
    const root=byId('resultModule');
    const panel=byId('result-panel-vanhanh');
    if(!root||!panel) return false;
    if(root.getAttribute('data-result-v2')==='1') return true;
    root.setAttribute('data-result-v2','1');
    addStyle();

    const intro=root.querySelector('.result-head p');
    if(intro) intro.textContent='Bảo trì · Vận hành & xử lý · Báo sự cố trong cùng hệ thống M&E OPS.';

    root.querySelectorAll('.result-tab-btn').forEach(function(btn){
      const key=btn.getAttribute('data-result-tab');
      if(key==='vanhanh') btn.textContent='⚙️ Vận hành & xử lý';
      if(key==='suco') btn.textContent='⚠️ Báo sự cố';
    });

    const panelHead=panel.querySelector('.result-panel-head');
    if(panelHead){
      const h=panelHead.querySelector('h3'); if(h) h.textContent='Vận hành & xử lý';
      const p=panelHead.querySelector('p'); if(p) p.textContent='Ghi nhận vận hành, bảo trì sửa chữa hoặc khắc phục sự cố tại thiết bị/vị trí.';
    }

    const incidentHead=byId('result-panel-suco')?.querySelector('.result-panel-head');
    if(incidentHead){
      const h=incidentHead.querySelector('h3'); if(h) h.textContent='Báo sự cố';
      const p=incidentHead.querySelector('p'); if(p) p.textContent='Tạo sự cố/tồn tại mới. Việc xử lý sau đó được ghi ở mục “Khắc phục sự cố”.';
    }

    const grid=panel.querySelector('.result-grid');
    const qrBox=grid&&grid.querySelector('.result-qr-box');
    if(grid&&qrBox){
      const typeWrap=document.createElement('div');
      typeWrap.className='meops-op-type-wrap';
      typeWrap.innerHTML='<span class="meops-op-type-label">Loại công việc *</span><div class="meops-op-types"><button type="button" class="meops-op-type active" data-meops-op-type="Vận hành">⚙️ Vận hành</button><button type="button" class="meops-op-type" data-meops-op-type="Bảo trì sửa chữa">🔧 Bảo trì sửa chữa</button><button type="button" class="meops-op-type" data-meops-op-type="Khắc phục sự cố">🧯 Khắc phục sự cố</button></div><div id="meops-op-summary" class="meops-op-summary"><b>Vận hành</b> · Ghi nhận kiểm tra/chạy máy/chỉ số vận hành thường xuyên.</div>';
      grid.insertBefore(typeWrap,qrBox);

      const systemField=document.createElement('div');
      systemField.className='result-field';
      systemField.innerHTML='<label for="vh-system">Hệ thống *</label><select id="vh-system"><option value="">-- Chọn hệ thống --</option></select>';
      grid.insertBefore(systemField,qrBox);

      const assetField=document.createElement('div');
      assetField.className='result-field';
      assetField.innerHTML='<label for="vh-asset">Thiết bị / Vị trí *</label><input id="vh-asset" placeholder="Ví dụ: Bơm CHWP-01 · Phòng máy tầng hầm">';
      grid.insertBefore(assetField,qrBox);

      const incidentField=document.createElement('div');
      incidentField.className='result-field meops-op-incident-ref';
      incidentField.innerHTML='<label for="vh-incident-ref">Mã sự cố liên quan</label><input id="vh-incident-ref" placeholder="Ví dụ: SC-20261002-...">';
      grid.insertBefore(incidentField,qrBox);

      const spacer=document.createElement('div');
      spacer.className='result-field meops-op-incident-ref';
      spacer.innerHTML='<label>&nbsp;</label><div class="meops-op-help">Nếu khắc phục từ một sự cố đã báo, nhập mã sự cố để liên kết lịch sử.</div>';
      grid.insertBefore(spacer,qrBox);
    }

    const qrLabel=panel.querySelector('label[for="vh-qr"]');
    if(qrLabel) qrLabel.textContent='Mã QR / Mã thiết bị (nếu có)';
    const qrInput=byId('vh-qr');
    if(qrInput) qrInput.placeholder='Quét QR hoặc nhập mã thiết bị';
    const qrSmall=qrInput&&qrInput.parentElement?qrInput.parentElement.querySelector('.result-small'):null;
    if(qrSmall) qrSmall.textContent='QR giúp xác định nhanh thiết bị; có thể để trống nếu đã nhập thiết bị/vị trí.';

    const statusLabel=panel.querySelector('label[for="vh-status"]');
    if(statusLabel) statusLabel.textContent='Trạng thái sau thực hiện *';
    const resultLabel=panel.querySelector('label[for="vh-result"]');
    if(resultLabel) resultLabel.textContent='Kết quả / Chỉ số / Nội dung đã thực hiện';

    root.querySelectorAll('[data-meops-op-type]').forEach(function(b){b.addEventListener('click',function(){setType(b.getAttribute('data-meops-op-type'));});});
    const systemSelect=byId('vh-system');
    if(systemSelect && systemSelect.getAttribute('data-lazy-systems')!=='1'){
      systemSelect.setAttribute('data-lazy-systems','1');
      systemSelect.addEventListener('pointerdown',populateSystems,{once:true});
      systemSelect.addEventListener('focus',populateSystems,{once:true});
    }
    setType('Vận hành');
    return true;
  }

  function installBehavior(){
    if(typeof window.resultSubmitOperation!=='function') return false;
    if(window.__MEOPS_RESULT_V2_BEHAVIOR__) return true;
    window.__MEOPS_RESULT_V2_BEHAVIOR__=true;

    window.resultSubmitOperation=function(){
      const btn=byId('btn-save-operation');
      const payload={
        activityType:operationType,
        systemName:(byId('vh-system')&&byId('vh-system').value)||'',
        asset:(byId('vh-asset')&&byId('vh-asset').value)||'',
        incidentRef:(byId('vh-incident-ref')&&byId('vh-incident-ref').value)||'',
        qrCode:(byId('vh-qr')&&byId('vh-qr').value)||'',
        status:(byId('vh-status')&&byId('vh-status').value)||'',
        result:(byId('vh-result')&&byId('vh-result').value)||'',
        note:(byId('vh-note')&&byId('vh-note').value)||'',
        operator:(byId('vh-operator')&&byId('vh-operator').value)||''
      };
      if(!payload.activityType) return window.resultSetMessage('vh-message','error','Chưa chọn loại công việc.');
      if(!payload.systemName.trim()) return window.resultSetMessage('vh-message','error','Chưa chọn hệ thống.');
      if(!payload.asset.trim()&&!payload.qrCode.trim()) return window.resultSetMessage('vh-message','error','Hãy nhập Thiết bị/Vị trí hoặc quét mã QR.');
      if(!payload.status) return window.resultSetMessage('vh-message','error','Chưa chọn trạng thái sau thực hiện.');
      if(!payload.operator.trim()) return window.resultSetMessage('vh-message','error','Chưa nhập người thực hiện.');
      if(payload.activityType==='Khắc phục sự cố'&&!payload.result.trim()) return window.resultSetMessage('vh-message','error','Hãy ghi nội dung đã khắc phục.');

      btn.disabled=true; btn.textContent='Đang lưu...';
      google.script.run
        .withSuccessHandler(function(res){
          btn.disabled=false; setType(operationType);
          window.resultSetMessage('vh-message','success',((res&&res.message)||'Đã lưu.')+' Mã: '+((res&&res.id)||''));
          window.resultClearOperation(false);
          try{if(typeof window.loadData==='function')window.loadData(true);}catch(e){}
        })
        .withFailureHandler(function(err){
          btn.disabled=false; setType(operationType);
          window.resultSetMessage('vh-message','error',typeof window.resultErrorText==='function'?window.resultErrorText(err):String((err&&err.message)||err||'Lỗi'));
        })
        .saveOperation(payload);
    };

    window.resultClearOperation=function(clearMessage){
      ['vh-qr','vh-asset','vh-incident-ref','vh-result','vh-note'].forEach(function(id){const e=byId(id);if(e)e.value='';});
      const st=byId('vh-status'); if(st)st.value='';
      if(clearMessage!==false){const m=byId('vh-message');if(m)m.innerHTML='';}
    };
    return true;
  }

  function boot(){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      const ui=installUi();
      const behavior=installBehavior();
      if((ui&&behavior)||tries>120) clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
