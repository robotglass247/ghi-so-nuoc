(function(){
'use strict';

const BUILD='water-bql-r6-inline-actions-v1-2';
const $=id=>document.getElementById(id);

function addStyle(){
  if(document.getElementById('bqlInlineActionsStyle'))return;
  const s=document.createElement('style');
  s.id='bqlInlineActionsStyle';
  s.textContent=`
    .bqlDetailBox .actions{display:none!important}
    .bqlDetailBox table thead th:first-child,.bqlDetailBox table tbody td:first-child{display:none!important}
    .bqlDetailBox tr.bqlNeedsReview td{background:#fff8e8!important}
    .bqlDetailBox tr.bqlNeedsReview:hover td{background:#fff2d5!important}
    .bqlDetailBox tr.bqlAbnormalRow td{background:#fdecec!important}
    .bqlDetailBox tr.bqlAbnormalRow:hover td{background:#fadcdc!important}
    .bqlDetailBox tr.bqlNormalRow td{background:#fff!important}
    .bqlDetailBox tr.bqlNormalRow:hover td{background:#f8fbfd!important}
    .bqlDetailBox td.bqlCurrentEditing{background:#dff4ff!important;box-shadow:inset 0 0 0 2px #3187b7!important}
    .bqlInlineAction,.bqlInlineNote,.bqlEditInput{width:100%;border:1px solid #c7d2da;border-radius:6px;background:#fff;padding:7px 8px;font:600 11px "Segoe UI",Tahoma,Arial,sans-serif;color:#263d4c;line-height:1.2}
    .bqlInlineAction{min-width:145px;cursor:pointer}
    .bqlInlineNote{min-width:150px;font-weight:500}
    .bqlInlineNote.bqlNeedNote{border-color:#d86b55!important;background:#fff4f1!important;box-shadow:0 0 0 2px rgba(216,107,85,.12)}
    .bqlEditInput{font-weight:800;text-align:center;background:#f8fdff}
    .bqlEditHint{font-size:9px;font-weight:700;color:#276885;margin-top:4px;white-space:nowrap}
    .bqlDetailBox th:nth-child(12){min-width:165px}
    .bqlDetailBox th:nth-child(13){min-width:135px}
    .bqlDetailBox th:nth-child(14){min-width:180px}
    @media(max-width:760px){
      .bqlInlineAction,.bqlInlineNote,.bqlEditInput{font-size:11px;padding:7px 6px}
    }
  `;
  document.head.appendChild(s);
}

function status(msg,kind){
  const e=$('reviewStatus');
  if(!e)return;
  e.textContent=msg||'';
  e.className='status '+(kind||'');
}

function normText(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function currentUserName(){
  const s=(window.WATER_BQL_SESSION&&window.WATER_BQL_SESSION.staff)||window.WATER_BQL_AUTH_STAFF||null;
  return normText(s&&s.ten);
}
function setVerifier(tr){
  const name=currentUserName();
  if(name&&tr&&tr.cells&&tr.cells[12])tr.cells[12].textContent=name;
}

function displayToRaw(v){
  let s=normText(v).replace(/\s/g,'');
  if(!s)return '';
  if(/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))return s.replace(/\./g,'').replace(',','.');
  if(/^[-+]?\d+,\d+$/.test(s))return s.replace(',','.');
  return s;
}

function isProcessedState(v){return /ĐÃ KIỂM TRA|ĐÃ ĐỐI CHIẾU/i.test(normText(v))}
function isAbnormal(reason,state){
  const t=(normText(reason)+' '+normText(state)).toUpperCase();
  return /BẤT THƯỜNG|TIÊU THỤ CAO|TĂNG CAO|GIẢM BẤT THƯỜNG|VƯỢT NGƯỠNG/.test(t);
}
function isNeedsReview(reason,state){
  if(isProcessedState(state))return false;
  const t=(normText(reason)+' '+normText(state)).toUpperCase();
  return /CẦN|CHƯA|CHỜ|BẤT THƯỜNG|LỖI|YÊU CẦU|KIỂM TRA|ĐỐI CHIẾU/.test(t);
}

function withLegacyPrompts(values,confirmValue,fn){
  const oldPrompt=window.prompt,oldConfirm=window.confirm;
  const q=(values||[]).slice();
  window.prompt=function(){return q.length?q.shift():''};
  window.confirm=function(){return confirmValue!==false};
  try{return fn()}finally{window.prompt=oldPrompt;window.confirm=oldConfirm}
}

function selectLegacyRow(tr){
  const radio=tr.querySelector('input[type="radio"][data-client]');
  if(!radio)throw new Error('Không xác định được dòng dữ liệu.');
  radio.click();
}

function triggerLegacy(tr,action,note,newReading){
  const buttons={confirm:'confirmBtn',recapture:'recaptureBtn',edit:'editBtn'};
  const btnId=buttons[action];
  if(!btnId)return;
  try{
    selectLegacyRow(tr);
    setVerifier(tr);
    const btn=$(btnId);
    if(!btn)throw new Error('Không tìm thấy thao tác xử lý.');
    if(action==='edit')withLegacyPrompts([String(newReading),String(note)],true,()=>btn.click());
    else withLegacyPrompts([String(note||'')],true,()=>btn.click());
  }catch(e){status(e&&e.message?e.message:String(e),'err')}
}

function noteValue(tr){
  const input=tr&&tr.querySelector('.bqlInlineNote');
  return normText(input&&input.value);
}
function requireNote(tr){
  const input=tr.querySelector('.bqlInlineNote');
  const note=noteValue(tr);
  if(note){input.classList.remove('bqlNeedNote');return note}
  if(input){input.classList.add('bqlNeedNote');input.focus()}
  status('Nhập lý do tại cột Ghi chú trước khi xử lý.','err');
  return '';
}

function restoreCurrentCell(tr){
  const cell=tr.cells&&tr.cells[7];
  if(!cell)return;
  if(cell.dataset.bqlOriginalText!=null)cell.textContent=cell.dataset.bqlOriginalText;
  cell.classList.remove('bqlCurrentEditing');
}

function enterEditMode(tr,sel){
  const cell=tr.cells&&tr.cells[7];
  if(!cell)return;
  if(cell.dataset.bqlOriginalText==null)cell.dataset.bqlOriginalText=normText(cell.textContent);
  const raw=displayToRaw(cell.dataset.bqlOriginalText);
  cell.innerHTML='';
  cell.classList.add('bqlCurrentEditing');
  const inp=document.createElement('input');
  inp.className='bqlEditInput';inp.inputMode='decimal';inp.value=raw;inp.setAttribute('aria-label','Chỉ số kỳ này mới');
  const hint=document.createElement('div');hint.className='bqlEditHint';hint.textContent='Nhập số mới • Enter để lưu';
  cell.append(inp,hint);inp.focus();inp.select();
  inp.addEventListener('keydown',function(e){
    if(e.key==='Escape'){e.preventDefault();restoreCurrentCell(tr);sel.value='';return}
    if(e.key!=='Enter')return;
    e.preventDefault();
    const note=requireNote(tr);if(!note)return;
    const newReading=displayToRaw(inp.value);
    if(newReading===''||!Number.isFinite(Number(newReading))||Number(newReading)<0){status('Chỉ số mới không hợp lệ.','err');inp.focus();return}
    setVerifier(tr);
    status('Đang lưu chỉ số mới...');triggerLegacy(tr,'edit',note,newReading);
  });
}

function buildActionSelect(tr,cell){
  if(!cell)return;
  cell.innerHTML='';
  const sel=document.createElement('select');sel.className='bqlInlineAction';
  const first=document.createElement('option');first.value='';first.textContent='Kích chọn';sel.appendChild(first);
  [['recapture','Chụp lại ảnh'],['edit','Chỉnh sửa chỉ số'],['confirm','Chỉ số đúng']].forEach(function(x){const o=document.createElement('option');o.value=x[0];o.textContent=x[1];sel.appendChild(o)});
  cell.appendChild(sel);
  sel.addEventListener('change',function(){
    const action=sel.value;if(!action)return;
    setVerifier(tr);
    if(action==='edit'){
      enterEditMode(tr,sel);
      status('Ô CS kỳ này đã đổi màu. Nhập số mới, nhập lý do ở Ghi chú rồi nhấn Enter để lưu.');
      return;
    }
    restoreCurrentCell(tr);
    let note=noteValue(tr);
    if(action==='recapture'){
      note=requireNote(tr);if(!note){sel.value='';return}
      status('Đang gửi yêu cầu chụp lại ảnh...');
      triggerLegacy(tr,'recapture',note,'');
      return;
    }
    status('Đang xác nhận chỉ số đúng...');
    triggerLegacy(tr,'confirm',note,'');
  });
}

function buildNoteInput(cell){
  if(!cell)return null;
  const old=normText(cell.textContent);cell.innerHTML='';
  const input=document.createElement('input');input.type='text';input.className='bqlInlineNote';input.value=old==='—'?'':old;input.placeholder='Nhập ghi chú';cell.appendChild(input);
  input.addEventListener('input',()=>input.classList.remove('bqlNeedNote'));
  return input;
}

function transformRow(tr){
  if(!tr||tr.dataset.bqlInlineDone==='1')return;
  if(!tr.cells||tr.cells.length<14)return;
  const reasonCell=tr.cells[10],compareCell=tr.cells[11],noteCell=tr.cells[13];
  const reason=normText(reasonCell&&reasonCell.textContent),state=normText(compareCell&&compareCell.textContent);
  const abnormal=isAbnormal(reason,state),needsReview=isNeedsReview(reason,state);
  tr.classList.toggle('bqlAbnormalRow',abnormal);
  tr.classList.toggle('bqlNeedsReview',!abnormal&&needsReview);
  tr.classList.toggle('bqlNormalRow',!abnormal&&!needsReview);
  if(tr.cells[7]&&tr.cells[7].dataset.bqlOriginalText==null)tr.cells[7].dataset.bqlOriginalText=normText(tr.cells[7].textContent);
  buildNoteInput(noteCell);buildActionSelect(tr,compareCell);tr.dataset.bqlInlineDone='1';
}

function transform(){
  addStyle();
  const table=document.querySelector('.bqlDetailBox table'),body=$('reviewBody');
  if(!table||!body)return;
  const ths=table.querySelectorAll('thead th');
  if(ths[0])ths[0].style.display='none';
  if(ths[11])ths[11].textContent='Xác nhận xử lý';
  if(ths[12])ths[12].textContent='Người xác thực';
  if(ths[13])ths[13].textContent='Ghi chú';
  Array.from(body.rows||[]).forEach(transformRow);
  if($('reviewStatus')&&!normText($('reviewStatus').textContent))status('Nhập ghi chú và chọn cách xử lý tại từng dòng.');
}

function boot(){
  addStyle();
  const tryBind=function(){const body=$('reviewBody');if(!body){setTimeout(tryBind,250);return}transform();new MutationObserver(function(){transform()}).observe(body,{childList:true,subtree:false})};
  tryBind();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.WATER_BQL_INLINE_ACTIONS_BUILD=BUILD;
})();