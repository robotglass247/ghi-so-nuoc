function scheduleAutoSync(delayMs=650){
  if(!navigator.onLine || !db)return;

  clearTimeout(autoSyncTimer);

  autoSyncTimer=setTimeout(async ()=>{
    // Gửi ảnh đã lưu độc lập với việc chụp ảnh tiếp theo.
    await syncQueue({auto:true});
  },delayMs);
}

async function captureAndSave(){
  if(shotRunning)return;

  const staff=getStaffCode();
  if(!staff){
    openStaff();
    return;
  }

  const v=byId('video');
  if(!v.videoWidth||!v.videoHeight){
    alert('Camera chưa sẵn sàng.');
    return;
  }

  if(!liveQR || liveQR.hits<2 || Date.now()-liveQR.at>=950){
    toast('ĐỢI QR OK RỒI BẤM CHỤP',1400);
    return;
  }

  shotRunning=true;
  const captureStarted=performance.now();
  let choiceWaitMs=0;
  byId('shotBtn').disabled=true;

  try{
    setStatus(
      'ĐANG CHỤP...',
      'Đang xác nhận QR trên đúng ảnh vừa chụp.'
    );

    const shot=await captureQRFastAndAccurate();
    const full=shot.full;
    const qr=shot.qr;

    if(!qr){
      throw new Error(
        'Chưa nhận được QR hợp lệ. Giữ máy yên, tránh lóa và đưa QR rõ hơn trong khung.'
      );
    }

    const capturedAt=new Date().toISOString();
    const previous=readCaptureReceipt(qr.meter,capturedAt);
    let replaceClientId='';
    if(previous){
      const choiceStarted=performance.now();
      const replace=await askDuplicate(qr.meter,capturedAt);
      choiceWaitMs+=performance.now()-choiceStarted;
      if(!replace){
        setStatus('ĐÃ GIỮ ẢNH CŨ','Tiếp tục với đồng hồ tiếp theo.');
        resetLiveQR();
        scheduleLiveScan(120);
        return;
      }
      replaceClientId=String(previous.clientId||'').trim();
      if(!replaceClientId)throw new Error('Thiếu mã ảnh cũ. Ảnh thay thế chưa được lưu.');
    }

    setStatus('ĐÃ NHẬN '+qr.label,'Đang lưu ảnh đồng hồ...');

    // Khung chụp đã có đúng kích thước lưu; không vẽ lại lần thứ hai.
    const save=full;

    const blob=await new Promise((resolve,reject)=>{
      save.toBlob(b=>b?resolve(b):reject(new Error('Không tạo được ảnh.')),'image/jpeg',0.84);
    });

    const clientId=qr.meter+'_'+Date.now()+'_'+Math.random().toString(36).slice(2);

    const record={
      clientId,
      meter:normalizeMeterCode(qr.meter),
      token:qr.token,
      label:qr.label,
      staff,
      capturedAt,
      replaceClientId,
      sentAt:0,
      image:blob
    };
    await dbPut(record);
    byId('captureEvidence').textContent='V9.0.0 · '+(record.replaceClientId?'CHỤP THAY THẾ':'ẢNH MỚI')+' · '+record.meter+' · Mã gửi: '+record.clientId+(record.replaceClientId?' · Thay ảnh: '+record.replaceClientId:'');
    rememberCapture(record);

    await updatePending();
    const savedSeconds=(Math.max(0,performance.now()-captureStarted-choiceWaitMs)/1000).toFixed(1);
    toast('✓ '+qr.label+' - ĐÃ LƯU '+savedSeconds+' GIÂY',1800);
    setStatus('SẴN SÀNG ĐỒNG HỒ TIẾP THEO','Đưa đồng hồ + QR tiếp theo vào khung. Khi hiện QR OK thì bấm CHỤP.');

    // Luôn lưu local trước. ONLINE thì đồng bộ nền; OFFLINE giữ trong Chờ.
    lastCaptureAt=Date.now();

    resetLiveQR();
    scheduleLiveScan(120);

    if(navigator.onLine){
      byId('debug').textContent='ĐÃ LƯU · tự đồng bộ nền, tiếp tục chụp đồng hồ tiếp theo.';
      scheduleAutoSync(100);
    }else{
      byId('debug').textContent='OFFLINE · đã lưu an toàn trong Chờ.';
    }

  }catch(err){
    setStatus('CHƯA LƯU',''+(err&&err.message?err.message:err));
    alert(err&&err.message?err.message:err);

    resetLiveQR();
    scheduleLiveScan(120);
  }finally{
    shotRunning=false;
    byId('shotBtn').disabled=false;
  }
}

const captureReceipts=new Map();
let duplicateDialogChain=Promise.resolve();

function capturePeriod(date){
  const d=new Date(date);
  if(!Number.isFinite(d.getTime()))throw new Error('Thời gian chụp không hợp lệ.');
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',year:'numeric'}).formatToParts(d);
  return parts.find(p=>p.type==='month').value+'/'+parts.find(p=>p.type==='year').value;
}
function captureKey(meter,date){return STORAGE.capturePrefix+normalizeMeterCode(meter)+':'+capturePeriod(date);}
function readCaptureReceipt(meter,date){
  const key=captureKey(meter,date);
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved&&saved.clientId)return saved;
  }catch(e){}
  return captureReceipts.get(key)||null;
}
function rememberCapture(record){
  const key=captureKey(record.meter,record.capturedAt);
  const saved={clientId:record.clientId,capturedAt:record.capturedAt};
  captureReceipts.set(key,saved);
  try{localStorage.setItem(key,JSON.stringify(saved));}catch(e){}
}
function restoreQueuedReceipts(){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('queue','readonly');
    const req=tx.objectStore('queue').openCursor();
    req.onsuccess=()=>{
      const cursor=req.result;
      if(!cursor)return;
      const item=cursor.value;
      try{
        const old=readCaptureReceipt(item.meter,item.capturedAt);
        if(!old||Date.parse(old.capturedAt)<Date.parse(item.capturedAt))rememberCapture(item);
      }catch(e){}
      cursor.continue();
    };
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
}
function askDuplicate(meter,date){
  const result=duplicateDialogChain.then(()=>new Promise(resolve=>{
    byId('duplicateDetail').textContent=normalizeMeterCode(meter)+' đã có ảnh trong kỳ '+capturePeriod(date)+'. Chọn thay thế nếu ảnh vừa chụp rõ hơn. Ảnh mới sẽ thay ảnh cũ sau khi Google đọc hợp lệ; ảnh lỗi sẽ được giữ để kiểm tra.';
    byId('duplicateModal').style.display='flex';
    const finish=replace=>{
      byId('duplicateModal').style.display='none';
      byId('keepPhotoBtn').onclick=null;
      byId('replacePhotoBtn').onclick=null;
      resolve(replace);
    };
    byId('keepPhotoBtn').onclick=()=>finish(false);
    byId('replacePhotoBtn').onclick=()=>finish(true);
  }));
  duplicateDialogChain=result.catch(()=>{});
  return result;
}
