function labelFromMeter(meter){
  const m=String(meter||'').trim().toUpperCase();
  const z=m.match(/^(.+?)-(.+?)-N\d+$/i);
  return z?z[1]+'.'+z[2]:m;
}

function normalizeMeterCode(meter){
  let m=String(meter||'').trim().toUpperCase();
  if(!m)return '';

  // Chuẩn mới toàn hệ thống: bỏ hậu tố -N01 / -Nxx.
  // QR cũ vẫn đọc được và được quy về mã ngắn.
  m=m.replace(/-N\d+$/i,'');

  return m;
}

function parseQR(raw){
  const text=String(raw||'').trim();
  if(!text)return null;

  const f={};
  text.split('|').forEach(p=>{
    const i=p.indexOf('=');
    if(i>0)f[p.slice(0,i).trim().toUpperCase()]=p.slice(i+1).trim();
  });

  // Hỗ trợ cả QR mới dạng ngắn:
  // M=P3-201|T=...
  // và QR cũ:
  // WATERQR|V=4|MADH=P3-201-N01|TOKEN=...
  let meter=normalizeMeterCode(f.MADH||f.M||'');
  let token=String(f.TOKEN||f.T||'').trim();

  if(meter&&token){
    return {meter,token,label:labelFromMeter(meter)};
  }

  // Giữ tương thích QR URL cũ.
  try{
    const u=new URL(text);
    meter=normalizeMeterCode(u.searchParams.get('m')||'');
    token=(u.searchParams.get('t')||'').trim();

    if(meter&&token){
      return {meter,token,label:labelFromMeter(meter)};
    }
  }catch(e){}

  const um=text.match(/(?:^|\|)URL=(https?:\/\/[^|\s]+)/i);
  if(um&&um[1]){
    try{
      const u=new URL(um[1]);
      meter=normalizeMeterCode(u.searchParams.get('m')||'');
      token=(u.searchParams.get('t')||'').trim();

      if(meter&&token){
        return {meter,token,label:labelFromMeter(meter)};
      }
    }catch(e){}
  }

  return null;
}


async function initDetector(){
  detector=null;

  if('BarcodeDetector' in window){
    try{
      const formats=await withCameraTimeout(
        BarcodeDetector.getSupportedFormats(),1500,
        'Bộ quét QR chưa phản hồi.');

      if(formats&&formats.includes('qr_code')){
        detector=new BarcodeDetector({formats:['qr_code']});
      }
    }catch(e){}
  }
}

function stopLiveScan(){
  if(liveScanTimer){
    clearTimeout(liveScanTimer);
    liveScanTimer=null;
  }
}

function qrKey(qr){
  if(!qr)return '';
  return String(qr.meter||'')+'|'+String(qr.token||'');
}

function resetLiveQR(){
  liveQR=null;
  lastQRKey='';
  lastQRAt=0;
  lastQRHits=0;
}

function acceptLiveQR(raw,source){
  const qr=parseQR(raw);
  if(!qr)return null;

  const now=Date.now();
  const key=qrKey(qr);

  if(key===lastQRKey && (now-lastQRAt)<1100){
    lastQRHits++;
  }else{
    lastQRKey=key;
    lastQRHits=1;
  }

  lastQRAt=now;

  liveQR={
    raw:String(raw||''),
    qr,
    key,
    at:now,
    hits:lastQRHits,
    source:source||''
  };

  // Hai lần đọc liên tiếp giúp tránh nhận nhầm nhưng vẫn rất nhanh.
  if(lastQRHits>=2){
    byId('debug').textContent=
      '✓ QR OK: '+qr.label+' · có thể CHỤP ngay';

    byId('statusSub').textContent=
      'QR đã nhận chính xác: '+qr.label+' · bấm CHỤP.';
  }

  return liveQR;
}

async function nativeReadValid(source){
  if(!detector)return null;

  try{
    const codes=await detector.detect(source);

    if(codes&&codes.length){
      for(const code of codes){
        const raw=String(code&&code.rawValue||'').trim();
        const qr=parseQR(raw);

        if(qr){
          return {raw,qr,source:'BarcodeDetector'};
        }
      }
    }
  }catch(e){}

  return null;
}

function scanCanvasFromSource(source,sx,sy,sw,sh,targetW,filter=''){
  const c=byId('scanCanvas');

  const sourceW=
    source.videoWidth||
    source.naturalWidth||
    source.width||
    1;

  const sourceH=
    source.videoHeight||
    source.naturalHeight||
    source.height||
    1;

  sx=Math.max(0,Math.min(sourceW-1,sx));
  sy=Math.max(0,Math.min(sourceH-1,sy));
  sw=Math.max(1,Math.min(sourceW-sx,sw));
  sh=Math.max(1,Math.min(sourceH-sy,sh));

  const scale=Math.min(2.2,Math.max(0.25,targetW/sw));

  c.width=Math.max(1,Math.round(sw*scale));
  c.height=Math.max(1,Math.round(sh*scale));

  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.save();

  if(filter)ctx.filter=filter;

  ctx.drawImage(
    source,
    Math.round(sx),
    Math.round(sy),
    Math.round(sw),
    Math.round(sh),
    0,
    0,
    c.width,
    c.height
  );

  ctx.restore();
  return c;
}

function jsQRValid(canvas,attemptBoth=false){
  if(typeof jsQR!=='function')return null;

  try{
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const img=ctx.getImageData(0,0,canvas.width,canvas.height);

    const code=jsQR(
      img.data,
      canvas.width,
      canvas.height,
      {
        inversionAttempts:
          attemptBoth ? 'attemptBoth' : 'dontInvert'
      }
    );

    if(!code||!code.data)return null;

    const raw=String(code.data||'').trim();
    const qr=parseQR(raw);

    if(!qr)return null;

    return {
      raw,
      qr,
      source:'jsQR',
      location:code.location||null
    };
  }catch(e){
    return null;
  }
}

function videoSize(source){
  return {
    w:source.videoWidth||source.width||1,
    h:source.videoHeight||source.height||1
  };
}

async function quickScanSource(source){
  // 1) Native detector: ưu tiên vì nhanh và chính xác nhất trên Chrome Android.
  let hit=await nativeReadValid(source);
  if(hit)return hit;

  const {w,h}=videoSize(source);

  // 2) jsQR toàn ảnh, hạ về ~900 px để quét nhanh.
  let c=scanCanvasFromSource(
    source,
    0,0,w,h,
    900,
    ''
  );

  hit=jsQRValid(c,false);
  if(hit)return hit;

  // 3) Mỗi vòng chỉ quét thêm 1 ô 2x2.
  // Như vậy QR nhỏ vẫn được phóng to nhưng không làm treo máy.
  const tiles=[
    [0,0,.58,.58],
    [.42,0,.58,.58],
    [0,.42,.58,.58],
    [.42,.42,.58,.58]
  ];

  const t=tiles[liveScanCycle%tiles.length];

  c=scanCanvasFromSource(
    source,
    w*t[0],
    h*t[1],
    w*t[2],
    h*t[3],
    820,
    ''
  );

  hit=jsQRValid(c,false);
  if(hit)return hit;

  return null;
}

async function robustScanCaptured(full){
  // Bước 1: native trực tiếp trên ảnh vừa chụp.
  let hit=await nativeReadValid(full);
  if(hit)return hit;

  const w=full.width;
  const h=full.height;

  // Bước 2: toàn ảnh ở độ phân giải hợp lý.
  let c=scanCanvasFromSource(
    full,
    0,0,w,h,
    1350,
    ''
  );

  hit=jsQRValid(c,false);
  if(hit)return hit;

  // Bước 3: toàn ảnh tăng tương phản nhẹ.
  c=scanCanvasFromSource(
    full,
    0,0,w,h,
    1250,
    'grayscale(1) contrast(1.45)'
  );

  hit=jsQRValid(c,false);
  if(hit)return hit;

  // Bước 4: 4 ô chồng nhau để QR nhỏ được phóng lớn.
  const tiles=[
    [0,0,.60,.60],
    [.40,0,.60,.60],
    [0,.40,.60,.60],
    [.40,.40,.60,.60]
  ];

  for(const t of tiles){
    c=scanCanvasFromSource(
      full,
      w*t[0],
      h*t[1],
      w*t[2],
      h*t[3],
      1050,
      ''
    );

    hit=jsQRValid(c,false);
    if(hit)return hit;
  }

  // Bước cuối cùng mới thử ảnh đảo màu để không làm chậm trường hợp bình thường.
  c=scanCanvasFromSource(
    full,
    0,0,w,h,
    1100,
    'grayscale(1) contrast(1.65)'
  );

  hit=jsQRValid(c,true);
  if(hit)return hit;

  return null;
}

function scheduleLiveScan(delayMs=170){
  stopLiveScan();

  liveScanTimer=setTimeout(async ()=>{
    if(!stream||shotRunning){
      scheduleLiveScan(220);
      return;
    }

    if(liveScanBusy){
      scheduleLiveScan(120);
      return;
    }

    const v=byId('video');

    if(!v||v.readyState<2||!v.videoWidth){
      scheduleLiveScan(180);
      return;
    }

    liveScanBusy=true;

    try{
      liveScanCycle++;

      const hit=await quickScanSource(v);

      if(hit){
        acceptLiveQR(hit.raw,hit.source);
      }else if(liveQR && (Date.now()-liveQR.at)>1300){
        // QR đã ra khỏi khung: bỏ trạng thái sẵn sàng cũ.
        resetLiveQR();

        byId('debug').textContent=
          'Đưa tem QR rõ vào khung · hệ thống đang quét tự động';

        byId('statusSub').textContent=
          'Để đồng hồ + QR rõ trong khung. Khi hiện QR OK thì bấm CHỤP.';
      }
    }catch(e){
    }finally{
      liveScanBusy=false;
      scheduleLiveScan(170);
    }
  },delayMs);
}

async function waitLiveScanIdle(maxMs=220){
  const t0=Date.now();

  while(liveScanBusy && (Date.now()-t0)<maxMs){
    await sleep(20);
  }
}

function withCameraTimeout(promise,ms,message,onLate){
  return new Promise((resolve,reject)=>{
    let finished=false;
    const timer=setTimeout(()=>{
      finished=true;
      const error=new Error(message);
      error.name='TimeoutError';
      reject(error);
    },ms);
    Promise.resolve(promise).then(value=>{
      if(finished){if(onLate)onLate(value);return;}
      finished=true;
      clearTimeout(timer);
      resolve(value);
    },error=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function startCamera(){
  if(cameraStarting)return;
  const staff=getStaffCode();

  if(!staff){
    openStaff();
    return;
  }

  cameraStarting=true;
  let waitingForPlayback=false;
  byId('startBtn').disabled=true;
  byId('startBtn').textContent='ĐANG MỞ CAMERA…';
  try{
    stopLiveScan();
    if(stream && !stream.getVideoTracks().some(track=>track.readyState==='live')){
      stream.getTracks().forEach(track=>track.stop());
      stream=null;
    }
    setStatus('ĐANG KẾT NỐI CAMERA','Nếu Chrome hỏi quyền camera, hãy chọn Cho phép.');

    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
      throw new Error('Trình duyệt không hỗ trợ camera trực tiếp.');
    }

    // 1080p cho kết quả thực tế tốt hơn 4K:
    // nét nhanh hơn, FPS ổn định hơn và xử lý QR nhẹ hơn nhiều.
    const common={
      facingMode:{ideal:'environment'},
      width:{ideal:1920},
      height:{ideal:1080},
      frameRate:{ideal:30,max:30}
    };

    if(!stream)stream=await withCameraTimeout(
      navigator.mediaDevices.getUserMedia({video:common,audio:false}),
      15000,
      'Chrome chưa trả camera sau 15 giây. Kiểm tra quyền camera và đóng ứng dụng khác đang dùng camera, rồi thử lại.',
      lateStream=>lateStream.getTracks().forEach(track=>track.stop())
    );

    const v=byId('video');
    setStatus('ĐANG HIỂN THỊ CAMERA','Đã kết nối camera; đang chờ hình ảnh.');
    v.muted=true;
    v.playsInline=true;
    if(v.srcObject!==stream)v.srcObject=stream;
    waitingForPlayback=true;
    try{
      await withCameraTimeout(v.play(),6000,'Camera đã kết nối nhưng Chrome chưa phát hình. Bấm Bắt đầu để thử lại.');
    }catch(e){
      // Chrome có thể ngắt play() trong lúc nguồn video vừa được gắn.
      // Thử lại trên cùng nguồn, không mở thêm luồng camera.
      if(e.name!=='AbortError' || v.srcObject!==stream)throw e;
      await sleep(150);
      await withCameraTimeout(v.play(),4000,'Chrome vẫn chưa phát được hình camera. Bấm Bắt đầu để thử lại.');
    }
    waitingForPlayback=false;
    v.controls=false;

    try{
      const track=stream.getVideoTracks()[0];
      const caps=track.getCapabilities
        ? track.getCapabilities()
        : {};

      const adv={};

      if(
        Array.isArray(caps.focusMode) &&
        caps.focusMode.includes('continuous')
      ){
        adv.focusMode='continuous';
      }

      if(
        Array.isArray(caps.exposureMode) &&
        caps.exposureMode.includes('continuous')
      ){
        adv.exposureMode='continuous';
      }

      if(
        Array.isArray(caps.whiteBalanceMode) &&
        caps.whiteBalanceMode.includes('continuous')
      ){
        adv.whiteBalanceMode='continuous';
      }

      if(Object.keys(adv).length){
        await withCameraTimeout(track.applyConstraints({
          advanced:[adv]
        }),1000,'Camera chưa áp dụng chế độ lấy nét.');
      }
    }catch(e){}

    resetLiveQR();

    byId('startBtn').style.display='none';
    byId('shotBtn').style.display='block';

    setStatus(
      'SẴN SÀNG CHỤP',
      'Để đồng hồ + QR rõ trong khung. Khi hiện QR OK thì bấm CHỤP.'
    );

    byId('debug').textContent=
      detector
        ? 'Đang quét QR tự động · chế độ nhanh'
        : 'Đang quét QR tự động · chế độ tương thích';

    scheduleLiveScan(80);

  }catch(err){
    stopLiveScan();
    if(waitingForPlayback && stream && stream.getVideoTracks().some(track=>track.readyState==='live')){
      byId('startBtn').style.display='block';
      byId('shotBtn').style.display='none';
      byId('video').controls=true;
      setStatus('BẤM HIỂN THỊ CAMERA','Camera đã kết nối. Bấm nút bên dưới để Chrome phát hình.');
      return;
    }
    waitingForPlayback=false;
    if(stream){
      stream.getTracks().forEach(track=>track.stop());
      stream=null;
    }
    byId('video').srcObject=null;
    byId('startBtn').style.display='block';
    byId('shotBtn').style.display='none';
    setStatus(
      'KHÔNG MỞ ĐƯỢC CAMERA',
      String(err&&err.message?err.message:err)
    );

    alert(
      'Không mở được camera: '+
      (err&&err.message?err.message:err)
    );
  }finally{
    cameraStarting=false;
    byId('startBtn').disabled=false;
    byId('startBtn').textContent=waitingForPlayback?'HIỂN THỊ CAMERA':'BẮT ĐẦU GHI SỐ';
  }
}

function captureFrame(){
  const v=byId('video');
  const full=byId('shotCanvas');

  const scale=Math.min(1,1600/Math.max(v.videoWidth,v.videoHeight));
  full.width=Math.round(v.videoWidth*scale);
  full.height=Math.round(v.videoHeight*scale);

  const ctx=full.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(v,0,0,full.width,full.height);

  return full;
}

async function captureQRFastAndAccurate(){
  stopLiveScan();

  // Chụp ảnh TRƯỚC, sau đó xác nhận QR.
  // Như vậy mã dùng để lưu gắn với đúng ảnh vừa chụp.
  const full=captureFrame();

  // Nếu QR nền vừa được xác nhận 2 lần liên tiếp,
  // chỉ cần kiểm tra nhanh trên chính ảnh vừa chụp.
  const cached=
    liveQR &&
    liveQR.hits>=2 &&
    (Date.now()-liveQR.at)<950
      ? liveQR
      : null;

  if(cached){
    // Native xác nhận lại thường chỉ mất rất ít thời gian.
    let hit=await nativeReadValid(full);

    if(hit && qrKey(hit.qr)===cached.key){
      return {full,raw:hit.raw,qr:hit.qr};
    }

    // Nếu native không đọc lại được vì đúng lúc ảnh rung,
    // dùng QR nền rất mới (<0,95 s) đã được đọc 2 lần liên tiếp.
    return {
      full,
      raw:cached.raw,
      qr:cached.qr
    };
  }

  // QR chưa sẵn sàng: tiếp tục quét nền, không giữ nút chụp
  // để chạy nhiều lượt xử lý ảnh có thể làm máy chậm.
  return {
    full,
    raw:'',
    qr:null
  };
}
