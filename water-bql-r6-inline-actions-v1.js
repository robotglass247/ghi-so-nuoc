(function(){
'use strict';

const BUILD='water-bql-r6-inline-actions-v1-1';
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
    .bqlDetailBox tr.bqlNormalRow td{background:#fff!important}
    .bqlDetailBox tr.bqlNormalRow:hover td{background:#f8fbfd!important}
    .bqlDetailBox td.bqlCurrentEditing{background:#fff0a8!important;box-shadow:inset 0 0 0 2px #e0a300!important}
    .bqlInlineAction,.bqlInlineNote,.bqlEditInput{width:100%;border:1px solid #c7d2da;border-radius:6px;background:#fff;padding:7px 8px;font:600 11px "Segoe UI",Tahoma,Arial,sans-serif;color:#263d4c;line-height:1.2}
    .bqlInlineAction{min-width:140px;cursor:pointer}
    .bqlInlineNote{min-width:150px;font-weight:500}
    .bqlInlineNote.bqlNeedNote{border-color:#d86b55!important;background:#fff4f1!important;box-shadow:0 0 0 2px rgba(216,107,85,.12)}
    .bqlEditInput{font-weight:800;text-align:center;background:#fffdf1}
    .bqlEditHint{font-size:9px;font-weight:700;color:#8a6411;margin-top:4px;white-space:nowrap}
    .bqlDetailBox th:nth-child(12){min-width:155px}
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

function displayToRaw(v){
  let s=normText(v).replace(/\s/g,'');
  if(!s)return '';
  if(/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))return s.replace(/\./g,'').replace(',','.');
  if(/^[-+]?\d+,\d+$/.test(s))return s.replace(',','.');
  return s;
}

function isProcessedState(v){return /ĐÃ KIỂM TRA|ĐÃ ĐỐI CHIẾU/i.test(normText(v))}
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
    const btn=$(btnId);
    if(!btn)throw new Error('Không tìm thấy thao tác xử lý.');
    if(action==='edit')withLegacyPrompts([String(newReading),String(note)],true,()=>btn.click());
    else withLegacyPrompts([String(note)],true,()=>btn.click());
  }catch(e){status(e&&e.message?e.message:String(e),'err')}
}

function requireNote(tr){
  const input=tr.querySelector('.bqlInlineNote');
  const note=normText(input&&input.value);
  if(note){input.classList.remove('bqlNeedNote');return note}
  if(input){input.classList.add('bqlNeedNote');input.focus()}
  status('Nhập lý do xử lý tại cột Ghi chú trước khi xác nhận.','err');
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
  const hint=document.createElement('div');hint.className='bqlEditHint';hint.textContent='Nhập số mới và nhấn Enter để lưu';
  cell.append(inp,hint);inp.focus();inp.select();
  inp.addEventListener('keydown',function(e){
    if(e.key==='Escape'){e.preventDefault();restoreCurrentCell(tr);sel.value='';return}
    if(e.key!=='Enter')return;
    e.preventDefault();
    const note=requireNote(tr);if(!note)return;
    const newReading=displayToRaw(inp.value);
    if(newReading===''||!Number.isFinite(Number(newReading))||Number(newReading)<0){status('Chỉ số mới không hợp lệ.','err');inp.focus();return}
    status('Đang lưu chỉ số mới...');triggerLegacy(tr,'edit',note,newReading);
  });
}

function buildActionSelect(tr,cell,needsReview){
  if(!cell)return;
  cell.innerHTML='';
  const sel=document.createElement('select');sel.className='bqlInlineAction';
  const first=document.createElement('option');first.value='';first.textContent=needsReview?'Xác nhận xử lý':'Đã xử lý';sel.appendChild(first);
  [['recapture','Chụp lại ảnh'],['edit','Sửa chỉ số'],['confirm','Chỉ số đúng']].forEach(function(x){const o=document.createElement('option');o.value=x[0];o.textContent=x[1];sel.appendChild(o)});
  cell.appendChild(sel);
  sel.addEventListener('change',function(){
    const action=sel.value;if(!action)return;
    if(action==='edit'){enterEditMode(tr,sel);status('Nhập chỉ số mới tại ô CS kỳ này, nhập lý do ở Ghi chú rồi nhấn Enter để lưu.');return}
    restoreCurrentCell(tr);
    const note=requireNote(tr);if(!note){sel.value='';return}
    status(action==='confirm'?'Đang xác nhận chỉ số đúng...':'Đang gửi yêu cầu chụp lại...');
    triggerLegacy(tr,action,note,'');
  });
}

function buildNoteInput(cell){
  if(!cell)return null;
  const old=normText(cell.textContent);cell.innerHTML='';
  const input=document.createElement('input');input.type='text';input.className='bqlInlineNote';input.value=old==='—'?'':old;input.placeholder='Nhập lý do xử lý';cell.appendChild(input);
  input.addEventListener('input',()=>input.classList.remove('bqlNeedNote'));
  return input;
}

function transformRow(tr){
  if(!tr||tr.dataset.bqlInlineDone==='1')return;
  if(!tr.cells||tr.cells.length<14)return;
  const reasonCell=tr.cells[10],compareCell=tr.cells[11],noteCell=tr.cells[13];
  const reason=normText(reasonCell&&reasonCell.textContent),state=normText(compareCell&&compareCell.textContent);
  const needsReview=isNeedsReview(reason,state);
  tr.classList.toggle('bqlNeedsReview',needsReview);tr.classList.toggle('bqlNormalRow',!needsReview);
  if(tr.cells[7]&&tr.cells[7].dataset.bqlOriginalText==null)tr.cells[7].dataset.bqlOriginalText=normText(tr.cells[7].textContent);
  buildNoteInput(noteCell);buildActionSelect(tr,compareCell,needsReview);tr.dataset.bqlInlineDone='1';
}

function transform(){
  addStyle();
  const table=document.querySelector('.bqlDetailBox table'),body=$('reviewBody');
  if(!table||!body)return;
  const ths=table.querySelectorAll('thead th');
  if(ths[0])ths[0].style.display='none';
  if(ths[11])ths[11].textContent='Đối chiếu';
  if(ths[13])ths[13].textContent='Ghi chú / Lý do';
  Array.from(body.rows||[]).forEach(transformRow);
}

function boot(){
  addStyle();
  const tryBind=function(){const body=$('reviewBody');if(!body){setTimeout(tryBind,250);return}transform();new MutationObserver(function(){transform()}).observe(body,{childList:true,subtree:false})};
  tryBind();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.WATER_BQL_INLINE_ACTIONS_BUILD=BUILD;
})();