function getStaffCode(){
  return(localStorage.getItem(STORAGE.staffKey)||'').trim().toUpperCase();
}

function setStaffList(list,source){
  if(!Array.isArray(list)||!list.length)return;

  const normalized=list.map(x=>({
    ma:String(x.ma||'').trim().toUpperCase(),
    ten:String(x.ten||'').trim()
  })).filter(x=>x.ma);

  if(!normalized.length)return;

  staffList=normalized;

  if(source==='POST uistate'){
    const current=getStaffCode();
    if(current && !staffList.some(x=>x.ma===current)){
      try{localStorage.removeItem(STORAGE.staffKey)}catch(e){}
      byId('staffName').textContent='Chưa chọn nhân sự';
      toast('NHÂN SỰ KHÔNG CÒN ĐANG LÀM VIỆC · CHỌN LẠI',2600);
    }
  }

  // Nếu tải được từ Apps Script thì lưu cache để lần sau/offline vẫn chọn được.
  if(source==='POST uistate'){
    try{
      localStorage.setItem(STAFF_CACHE_KEY,JSON.stringify(staffList));
    }catch(e){}
  }

  clearTimeout(staffLoadTimer);
  renderStaff();
  updateStaffName();
  byId('reloadStaffBtn').style.display='none';
  byId('manualStaff').style.display='none';
  byId('staffSelect').style.display='block';

  if(source==='Cache'||source==='Dự phòng'){
    byId('debug').textContent='Danh sách nhân sự sẵn sàng ('+source+'). Hệ thống vẫn đang cập nhật từ Apps Script...';
  }else{
    byId('debug').textContent='✓ Nhân sự đã cập nhật: '+staffList.length+' ('+source+')';
  }

  if(!getStaffCode())openStaff();
}

function loadLocalStaffFirst(){
  let cached=null;

  try{
    const raw=localStorage.getItem(STAFF_CACHE_KEY);
    if(raw)cached=JSON.parse(raw);
  }catch(e){}

  if(Array.isArray(cached)&&cached.length){
    setStaffList(cached,'Cache');
    return;
  }

  // Dự phòng hiện tại lấy theo sheet NHAN_SU_THUC_HIEN.
  setStaffList(STAFF_FALLBACK,'Dự phòng');
}

function waterStaffCallback(list){
  setStaffList(list,'JSONP');
}

window.addEventListener('message',event=>{
  const d=event.data;
  if(d&&d.type==='WATER_UI_STATE'){
    if(String(d.requestId||'')===String(staffUiRequestId||'') && Array.isArray(d.staff)){
      setStaffList(d.staff,'POST uistate');
    }
    return;
  }
  if(d&&d.type==='WATER_STAFF_LIST'){return;}

  if(!d||d.type!=='WATER_UPLOAD_RESULT'||!awaitingUpload)return;
  let trustedOrigin=false;
  try{
    const origin=new URL(event.origin);
    trustedOrigin=event.origin===location.origin ||
      (origin.protocol==='https:' &&
       (origin.hostname==='script.google.com' ||
        origin.hostname.endsWith('-script.googleusercontent.com')));
  }catch(e){}
  if(!trustedOrigin)return;
  if(String(d.clientId||'')!==String(awaitingUpload.clientId||''))return;

  clearTimeout(awaitingUpload.timer);
  const ok=d.ok;
  const resolve=awaitingUpload.resolve;
  const reject=awaitingUpload.reject;
  awaitingUpload=null;

  if(ok===true)resolve(d);
  else reject(new Error(d.error||'Đồng bộ lỗi.'));
});

function loadStaff(force){
  if(!staffList.length)loadLocalStaffFirst();
  if(force){
    byId('debug').textContent='Đang cập nhật nhân sự Đang làm việc...';
    byId('reloadStaffBtn').style.display='none';
  }
  if(!navigator.onLine){
    byId('debug').textContent='OFFLINE · dùng danh sách nhân sự đã lưu gần nhất.';
    return;
  }
  staffUiRequestId='v9staff_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
  const now=new Date();
  const period=String(now.getMonth()+1).padStart(2,'0')+'/'+now.getFullYear();
  const form=document.createElement('form');
  form.method='POST'; form.action=BACKEND_URL; form.target='staffFrame'; form.style.display='none';
  const values={api:'uistate',period,requestId:staffUiRequestId};
  Object.keys(values).forEach(k=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=values[k];form.appendChild(i)});
  document.body.appendChild(form); form.submit(); setTimeout(()=>{try{form.remove()}catch(e){}},60000);
  clearTimeout(staffLoadTimer);
  staffLoadTimer=setTimeout(()=>{
    renderStaff(); updateStaffName(); byId('staffSelect').style.display='block';
    byId('debug').textContent=staffList.length?'POST nhân sự chưa phản hồi · vẫn dùng cache gần nhất.':'Chưa có danh sách nhân sự · cần Online để cập nhật.';
  },15000);
}

function renderStaff(){
  const sel=byId('staffSelect');
  sel.innerHTML='<option value="">-- Chọn nhân sự --</option>';
  staffList.forEach(x=>{
    const op=document.createElement('option');
    op.value=x.ma;
    op.textContent=x.ten||'';
    sel.appendChild(op);
  });
  const old=getStaffCode();
  if(old)sel.value=old;
  requestAnimationFrame(fitStaffSelectSize);
}

function fitStaffSelectSize(){
  const sel=byId('staffSelect');
  if(!sel)return;
  const cs=getComputedStyle(sel);
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  ctx.font=[cs.fontStyle,cs.fontWeight,cs.fontSize,cs.fontFamily].join(' ');
  const texts=['-- Chọn nhân sự --',...staffList.map(x=>String(x.ten||'').trim())];
  let maxTextWidth=0;
  texts.forEach(text=>{maxTextWidth=Math.max(maxTextWidth,ctx.measureText(text).width)});
  const wanted=Math.ceil(maxTextWidth+50);
  const maxAllowed=Math.max(180,Math.min(window.innerWidth-68,430));
  const finalWidth=Math.min(Math.max(wanted,180),maxAllowed);
  sel.style.width=finalWidth+'px';
  const box=sel.closest('.modalIn');
  if(box)box.style.width=Math.min(finalWidth+32,window.innerWidth-36)+'px';
}

function openStaff(){
  renderStaff();
  byId('staffModal').style.display='flex';
  requestAnimationFrame(fitStaffSelectSize);

  // Mỗi lần mở danh sách nhân sự, tự lấy danh sách mới nhất từ Google Sheet
  if(navigator.onLine){
    loadStaff(true);
  }
}

function saveStaff(){
  const ma=(byId('staffSelect').value||'').trim().toUpperCase();
  if(!ma){
    alert('Vui lòng chọn nhân sự trong danh sách.');
    return;
  }
  localStorage.setItem(STORAGE.staffKey,ma);
  byId('staffModal').style.display='none';
  updateStaffName();
  toast('ĐÃ CHỌN NHÂN SỰ');
}

function updateStaffName(){
  const ma=getStaffCode();
  const x=staffList.find(a=>a.ma===ma);
  byId('staffName').textContent=x?x.ten:(ma?'Đang tải nhân sự...':'Chưa chọn nhân sự');
}
