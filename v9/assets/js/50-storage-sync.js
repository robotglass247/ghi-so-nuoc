function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(STORAGE.dbName,1);
    req.onupgradeneeded=e=>{
      const d=e.target.result;
      if(!d.objectStoreNames.contains('queue'))d.createObjectStore('queue',{keyPath:'clientId'});
    };
    req.onsuccess=e=>{db=e.target.result;resolve(db)};
    req.onerror=()=>reject(req.error);
  });
}

function dbPut(record){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('queue','readwrite');
    tx.objectStore('queue').put(record);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
}

function dbAll(limit){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('queue','readonly');
    const req=limit?tx.objectStore('queue').getAll(null,limit):tx.objectStore('queue').getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}

function dbDelete(id){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('queue','readwrite');
    tx.objectStore('queue').delete(id);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
}

function dbCount(){
  return new Promise((resolve,reject)=>{
    const req=db.transaction('queue','readonly').objectStore('queue').count();
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

// Chủ sở hữu đã cho phép xóa ảnh test của mã đã bỏ ngày 08/09/2026.
// Giới hạn thời điểm để không xóa ảnh chụp mới trong tương lai.
function isApprovedOldTest(record){
  if(normalizeMeterCode(record.meter)!=='P3-3SH1')return false;
  const captured=Date.parse(record.capturedAt);
  return Number.isFinite(captured) && captured<=Date.parse('2026-09-08T16:38:10Z');
}

function removeApprovedOldTests(){
  return new Promise((resolve,reject)=>{
    let removed=0;
    const tx=db.transaction('queue','readwrite');
    const req=tx.objectStore('queue').openCursor();
    req.onsuccess=()=>{
      const cursor=req.result;
      if(!cursor)return;
      if(isApprovedOldTest(cursor.value)){
        cursor.delete();
        removed++;
      }
      cursor.continue();
    };
    tx.oncomplete=()=>resolve(removed);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error('Chưa dọn được ảnh test.'));
  });
}

async function updatePending(){
  const count=db?await dbCount():0;
  byId('pending').textContent=count;
}

function blobToDataURL(blob){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(blob);
  });
}


function sleep(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

function checkServerBatch(clientIds,timeoutMs=15000,signal){
  return new Promise((resolve,reject)=>{
    const ids=(clientIds||[])
      .map(x=>String(x||'').trim())
      .filter(Boolean)
      .slice(0,50);

    if(!ids.length){
      resolve(new Set());
      return;
    }

    const cb=
      'waterBatch_'+
      Date.now()+'_'
      +Math.random().toString(36).slice(2);

    let done=false;
    const script=document.createElement('script');

    const cleanup=()=>{
      if(signal)signal.removeEventListener('abort',abort);
      try{delete window[cb]}catch(e){}
      if(script.parentNode)script.parentNode.removeChild(script);
    };
    const abort=()=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('Đã kết thúc đối chiếu.'));
    };

    const timer=setTimeout(()=>{
      if(done)return;
      done=true;
      cleanup();
      reject(new Error('Máy chủ không trả kết quả đối chiếu.'));
    },timeoutMs);

    window[cb]=(data)=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      cleanup();

      if(!data||data.ok!==true||!Array.isArray(data.synced)){
        reject(new Error('Kết quả đối chiếu không hợp lệ.'));
        return;
      }

      resolve(
        new Set(
          data.synced.map(x=>String(x||'').trim())
        )
      );
    };

    script.async=true;
    script.src=
      BACKEND_URL+
      '?api=batchstatus'+
      '&ids='+encodeURIComponent(ids.join('~'))+
      '&callback='+encodeURIComponent(cb)+
      '&_='+Date.now();

    script.onerror=()=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('Không gọi được API đối chiếu.'));
    };

    if(signal){
      if(signal.aborted){abort();return;}
      signal.addEventListener('abort',abort,{once:true});
    }
    document.head.appendChild(script);
  });
}

async function waitOneClientSynced(clientId,maxMs=70000){
  const started=Date.now();

  while(Date.now()-started<maxMs){
    try{
      const set=await checkServerBatch([clientId],12000);
      if(set.has(clientId))return true;
    }catch(e){}

    await sleep(1800);
  }

  return false;
}


async function waitClientSyncedFast(clientId,maxMs=40000,signal){
  const started=Date.now();
  let receivedReply=false;
  let lastError='';

  while(Date.now()-started<maxMs){
    if(signal&&signal.aborted)throw new Error('Đã kết thúc đối chiếu.');
    try{
      // Apps Script thực tế có thể cần 12-15 giây khi khởi động nguội.
      const set=await checkServerBatch([clientId],18000,signal);
      receivedReply=true;
      if(set.has(clientId))return true;
    }catch(e){
      if(signal&&signal.aborted)throw e;
      lastError=String(e&&e.message||e);
    }

    await sleep(900);
  }

  throw new Error(receivedReply
    ? 'Máy chủ trả lời nhưng chưa có bản ghi này trong nhật ký'
    : 'Không nhận được phản hồi đối chiếu: '+lastError);
}

function postRecordByHiddenForm(values){
  const form=document.createElement('form');
  form.method='POST';
  form.action=BACKEND_URL;
  form.target='uploadFrame';
  form.style.display='none';

  Object.keys(values).forEach(k=>{
    const input=document.createElement('textarea');
    input.name=k;
    input.value=values[k]==null?'':String(values[k]);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();

  // Không xóa sớm: Samsung Internet có thể cần thời gian tải ảnh Base64 lớn
  // và Apps Script thường mất 12-15 giây khi khởi động nguội.
  setTimeout(()=>{
    try{form.remove()}catch(e){}
  },60000);
}


function postRecordNoWait(item,imageData){
  const values={
    clientId:item.clientId,
    meter:normalizeMeterCode(item.meter),
    token:item.token,
    staff:item.staff,
    capturedAt:item.capturedAt,
      replaceClientId:item.replaceClientId||'',
    image:imageData
  };

  // Dùng biểu mẫu ẩn làm kênh chính. fetch(mode:'no-cors') chỉ trả về
  // opaque response nên có thể báo thành công dù Apps Script không nhận POST.
  // Lịch sử trên thiết bị này cho thấy POST biểu mẫu đã tới được máy chủ.
  postRecordByHiddenForm(values);
}


function postRecordAndWaitAck(item,imageData,timeoutMs=25000){
  return new Promise((resolve,reject)=>{
    // Chỉ xử lý 1 bản ghi mỗi lượt nên không để 2 ACK chồng nhau.
    if(awaitingUpload){
      reject(new Error('Đang chờ xác nhận bản ghi trước.'));
      return;
    }

    const frame=byId('uploadFrame');
    let frameLoadHandler=null;

    const cleanup=()=>{
      if(frameLoadHandler){
        frame.removeEventListener('load',frameLoadHandler);
      }
    };

    const timer=setTimeout(()=>{
      if(!awaitingUpload)return;

      const current=awaitingUpload;
      awaitingUpload=null;
      cleanup();

      current.reject(
        new Error('Máy chủ chưa gửi xác nhận về trình duyệt.')
      );
    },timeoutMs);

    awaitingUpload={
      clientId:item.clientId,
      timer,
      resolve:(data)=>{
        cleanup();
        resolve(data);
      },
      reject:(err)=>{
        cleanup();
        reject(err);
      }
    };

    // Fallback: nếu backend vẫn chuyển được sang ack.html thì cũng nhận.
    frameLoadHandler=()=>{
      try{
        const href=frame.contentWindow.location.href;
        const u=new URL(href);

        if(
          u.pathname.endsWith('/ghi-so-nuoc/ack.html') &&
          u.searchParams.get('ok')==='1' &&
          u.searchParams.get('clientId')===item.clientId
        ){
          if(awaitingUpload &&
             String(awaitingUpload.clientId)===String(item.clientId)){
            clearTimeout(awaitingUpload.timer);
            const r=awaitingUpload.resolve;
            awaitingUpload=null;
            cleanup();
            r({ok:true,clientId:item.clientId,via:'ack-page'});
          }
        }
      }catch(e){}
    };

    frame.addEventListener('load',frameLoadHandler);

    const form=document.createElement('form');
    form.method='POST';
    form.action=BACKEND_URL;
    form.target='uploadFrame';
    form.style.display='none';

    const values={
      clientId:item.clientId,
      meter:normalizeMeterCode(item.meter),
      token:item.token,
      staff:item.staff,
      capturedAt:item.capturedAt,
      replaceClientId:item.replaceClientId||'',
      image:imageData
    };



    Object.keys(values).forEach(k=>{
      const input=document.createElement('textarea');
      input.name=k;
      input.value=values[k]==null?'':String(values[k]);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    setTimeout(()=>{
      try{form.remove()}catch(e){}
    },60000);
  });
}


async function uploadAndConfirm(item,data){
  const controller=new AbortController();
  let statusTimer;
  const ack=postRecordAndWaitAck(item,data,20000).then(result=>{
    if(!result||result.ok!==true)throw new Error('Chưa xác nhận lưu ảnh.');
    return true;
  });
  const status=new Promise((resolve,reject)=>{
    statusTimer=setTimeout(()=>{
      waitClientSyncedFast(item.clientId,40000,controller.signal).then(resolve,reject);
    },3000);
  });
  try{
    return await Promise.any([ack,status]);
  }catch(e){
    throw new Error('Chưa nhận xác nhận lưu từ máy chủ. Ảnh vẫn trong hàng chờ.');
  }finally{
    clearTimeout(statusTimer);
    controller.abort();
    if(awaitingUpload&&awaitingUpload.clientId===item.clientId){
      const pending=awaitingUpload;
      awaitingUpload=null;
      clearTimeout(pending.timer);
      pending.reject(new Error('Đã kết thúc lượt gửi.'));
    }
  }
}

async function syncQueue(options={}){
  const manualMode=!!(options&&options.manual);

  if(!db){
    byId('syncStatus').textContent='Chưa mở được bộ nhớ ảnh. Không xóa dữ liệu trình duyệt.';
    return;
  }
  if(syncRunning){
    syncRequested=true;
    if(manualMode){
      manualSyncRequested=true;
      byId('syncStatus').textContent='Đang đồng bộ ('+Math.round((Date.now()-syncStartedAt)/1000)+' giây). Đã nhận yêu cầu kiểm tra lại sau lượt này.';
    }
    return;
  }
  clearTimeout(autoSyncTimer);

  if(!navigator.onLine){
    byId('syncStatus').textContent='OFFLINE · dữ liệu đang nằm an toàn trong Chờ.';
    return;
  }

  syncRequested=false;
  syncRunning=true;
  syncStartedAt=Date.now();
  byId('syncBtn').textContent='ĐANG ĐỒNG BỘ…';
  byId('syncStatus').textContent='Đang kiểm tra hàng chờ trên điện thoại…';

  try{
    let list=await dbAll(1);

    if(!list.length){
      await updatePending();
      byId('syncStatus').textContent='✓ ĐÃ GỬI HẾT ẢNH · GOOGLE XỬ LÝ AI Ở NỀN';
      return;
    }

    const item=list[0];
    byId('captureEvidence').textContent='V9.0.0 · '+(item.replaceClientId?'GỬI THAY THẾ':'GỬI ẢNH MỚI')+' · '+item.meter+' · Mã gửi: '+item.clientId+(item.replaceClientId?' · Thay ảnh: '+item.replaceClientId:'');
    /***************************************************************
     * BƯỚC 1: Bản mới được gửi NGAY, không mất thêm một lượt gọi
     * batchstatus trước khi gửi. sentAt ngăn tải lại ảnh dung lượng lớn.
     ***************************************************************/
    // Nếu một lần gửi không tới được máy chủ, cho phép gửi lại sau 90 giây.
    // clientId bảo đảm backend không tạo bản ghi trùng.
    const shouldSend=
      manualMode ||
      !item.sentAt ||
      (Date.now()-Number(item.sentAt))>90000;

    let uploadConfirmed=false;
    if(shouldSend){
      byId('syncStatus').textContent=
        'TỰ ĐỘNG ĐỒNG BỘ · đang gửi '+(item.label||item.meter)+'...';

      const data=await blobToDataURL(item.image);
      item.sentAt=Date.now();
      await dbPut(item);
      uploadConfirmed=await uploadAndConfirm(item,data);
    }else{
      byId('syncStatus').textContent=
        'ĐÃ THỬ GỬI · chưa được máy chủ xác nhận '+(item.label||item.meter)+'...';
    }

    /***************************************************************
     * BƯỚC 2: Hỏi trực tiếp NHAT_KY_DONG_BO với thời gian chờ phù hợp
     * tốc độ thực tế của Apps Script (có thể 12-15 giây khi khởi động).
     ***************************************************************/
    const ok=uploadConfirmed || await waitClientSyncedFast(item.clientId,40000);

    if(ok){
      await dbDelete(item.clientId);
      await updatePending();

      const remaining=await dbCount();

      if(!remaining){
        byId('syncStatus').textContent='✓ ĐÃ GỬI HẾT ẢNH · GOOGLE XỬ LÝ AI Ở NỀN';
        return;
      }

      byId('syncStatus').textContent=
        '✓ GOOGLE ĐÃ NHẬN ẢNH '+(item.label||item.meter)+
        ' · còn '+remaining+' trong Chờ';

      // Xử lý ngay bản tiếp theo, nhưng vẫn nhường camera.
      scheduleAutoSync(100);
      return;
    }

    /***************************************************************
     * Nếu chưa xác nhận được:
     * - KHÔNG xóa dữ liệu.
     * - KHÔNG báo "tạm dừng".
     * - Tự thử lại sau vài giây. Vì clientId chống trùng nên an toàn.
     ***************************************************************/
    await updatePending();
    byId('syncStatus').textContent=
      'Đang chờ máy chủ xác nhận · dữ liệu vẫn an toàn trong Chờ.';

    if(navigator.onLine){
      scheduleAutoSync(3000);
    }

  }catch(e){
    await updatePending();

    byId('syncStatus').textContent=
      'Lỗi đồng bộ: '+String(e&&e.message||e)+'. Ảnh được giữ trong Chờ.';

    if(navigator.onLine){
      scheduleAutoSync(3000);
    }

  }finally{
    syncRunning=false;
    byId('syncBtn').textContent='ĐỒNG BỘ NGAY';
    if(manualSyncRequested){
      manualSyncRequested=false;
      clearTimeout(autoSyncTimer);
      autoSyncTimer=setTimeout(()=>syncQueue({manual:true}),450);
    }else if(syncRequested){
      syncRequested=false;
      scheduleAutoSync(100);
    }
  }
}
