/**
 * M&E WATER V20 - BQL MANAGEMENT API
 * Protected BQL web actions for each PROJECT_ID.
 * Reuses GHI_SO_HANG_THANG X:AD and NHAT_KY_CHINH_SUA_V2.
 */
const WATER_BQL_V20 = Object.freeze({
  MAIN_SHEET:'GHI_SO_HANG_THANG', QUEUE_SHEET:'HANG_DOI_ANH_V87',
  AUDIT_SHEET:'NHAT_KY_CHINH_SUA_V2', INFO_SHEET:'THONG_TIN_DU_AN', MAX_ROWS_RETURN:5000
});

function waterBqlMaybeHandlePostV20_(p){
  const api=String(p&&p.api?p.api:'').trim().toLowerCase();
  if(api!=='bqldata'&&api!=='bqlaction')return null;
  const requestId=String(p&&p.requestId?p.requestId:'').trim();
  if(!/^[A-Za-z0-9_-]{8,120}$/.test(requestId))return waterBqlHtmlV20_({type:'WATER_BQL_ERROR',requestId,ok:false,code:'BAD_REQUEST_ID',error:'Mã yêu cầu không hợp lệ.'});
  let guard;
  try{guard=waterBqlRequireManagerV20_(p);}catch(err){return waterBqlHtmlV20_({type:'WATER_BQL_ERROR',requestId,ok:false,code:'AUTH_ERROR',error:String(err&&err.message?err.message:err)});}
  if(!guard.ok)return waterBqlHtmlV20_({type:'WATER_BQL_ERROR',requestId,ok:false,authRequired:guard.code==='NO_SESSION'||guard.code==='INVALID_SESSION',code:guard.code||'FORBIDDEN',error:guard.error||'Không có quyền truy cập Trang Quản lý/BQL.'});
  try{
    if(api==='bqldata')return waterBqlHtmlV20_(waterBqlDataV20_(p,guard,requestId));
    return waterBqlHtmlV20_(waterBqlActionV20_(p,guard,requestId));
  }catch(err){return waterBqlHtmlV20_({type:api==='bqldata'?'WATER_BQL_DATA_RESULT':'WATER_BQL_ACTION_RESULT',requestId,ok:false,code:'BQL_ERROR',error:String(err&&err.message?err.message:err)});}
}

function waterBqlRequireManagerV20_(p){
  if(typeof waterAuthRequireSessionV20_!=='function')return {ok:false,code:'SESSION_GUARD_MISSING',error:'Backend chưa bật Session Guard V20.'};
  const g=waterAuthRequireSessionV20_(p); if(!g||!g.ok)return g||{ok:false,code:'NO_SESSION',error:'Chưa đăng nhập.'};
  const role=waterBqlNormV20_(g.role||(g.staff&&g.staff.quyen));
  if(['quan ly','bql','admin','quan tri','administrator'].indexOf(role)<0)return {ok:false,code:'ROLE_DENIED',error:'Tài khoản không có phân quyền QUẢN LÝ/BQL.'};
  return g;
}
function waterBqlNormV20_(v){return String(v==null?'':v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
function waterBqlTextV20_(v){return String(v==null?'':v).trim();}
function waterBqlMeterKeyV20_(v){if(typeof waterMeterCompareKey_==='function')return waterMeterCompareKey_(v);return String(v==null?'':v).trim().toUpperCase().replace(/[–—−]/g,'-').replace(/-?N\d+$/i,'').replace(/[- ._]/g,'');}
function waterBqlActorV20_(g){const c=waterBqlTextV20_(g&&g.staffCode).toUpperCase(),n=waterBqlTextV20_(g&&g.staffName);return c&&n?c+' - '+n:(n||c||'QUẢN LÝ');}
function waterBqlNumberOrBlankV20_(v){return typeof v==='number'&&Number.isFinite(v)?v:'';}
function waterBqlCanonPeriodV20_(v){const m=/^(\d{1,2})\/(\d{4})$/.exec(String(v||'').trim());if(!m)return '';const mm=Number(m[1]);return mm>=1&&mm<=12?String(mm).padStart(2,'0')+'/'+m[2]:'';}
function waterBqlLastRowV20_(sh){const max=sh.getMaxRows(),chunk=1000;if(max<2)return 1;for(let end=max;end>=2;end-=chunk){const start=Math.max(2,end-chunk+1),a=sh.getRange(start,6,end-start+1,1).getDisplayValues();for(let i=a.length-1;i>=0;i--)if(waterBqlTextV20_(a[i][0]))return start+i;}return 1;}

function waterBqlDataV20_(p,g,requestId){
  const ss=waterOpenProject_(g.projectId),sh=ss.getSheetByName(WATER_BQL_V20.MAIN_SHEET);if(!sh)throw new Error('Dự án thiếu GHI_SO_HANG_THANG.');
  const last=waterBqlLastRowV20_(sh),vals=last>1?sh.getRange(2,1,last-1,34).getValues():[],disp=last>1?sh.getRange(2,1,last-1,34).getDisplayValues():[];
  const ms={};vals.forEach(r=>{const x=waterBqlTextV20_(r[1]);if(x)ms[x]=1;});
  const score=v=>{const m=/^(0[1-9]|1[0-2])\/(\d{4})$/.exec(String(v||''));return m?Number(m[2])*12+Number(m[1]):0;};
  const months=Object.keys(ms).sort((a,b)=>score(b)-score(a));let period=waterBqlCanonPeriodV20_(p&&p.period);if(!period&&months.length)period=months[0];
  const rows=[];
  for(let i=0;i<vals.length&&rows.length<WATER_BQL_V20.MAX_ROWS_RETURN;i++){
    const r=vals[i],d=disp[i];if(!waterBqlTextV20_(r[5])||(period&&waterBqlTextV20_(r[1])!==period))continue;
    const o={sheetRow:i+2,timestamp:waterBqlTextV20_(d[0]),period:waterBqlTextV20_(d[1]),tower:waterBqlTextV20_(d[2]),floor:waterBqlTextV20_(d[3]),apartment:waterBqlTextV20_(d[4]),meter:waterBqlTextV20_(d[5]),previous:waterBqlNumberOrBlankV20_(r[6]),current:waterBqlNumberOrBlankV20_(r[7]),consumption:waterBqlNumberOrBlankV20_(r[8]),image:waterBqlTextV20_(d[9]),staffCode:waterBqlTextV20_(d[10]),staffName:waterBqlTextV20_(d[11]),confidence:waterBqlNumberOrBlankV20_(r[13]),aiStatus:waterBqlTextV20_(d[14]),aiNote:waterBqlTextV20_(d[15]),fileId:waterBqlTextV20_(d[17]),clientId:waterBqlTextV20_(d[18]),syncStatus:waterBqlTextV20_(d[19]),aiProcessStatus:waterBqlTextV20_(d[20]),assessment:waterBqlTextV20_(d[22]),checked:r[23]===true,reviewResult:waterBqlTextV20_(d[24]),confirmer:waterBqlTextV20_(d[25]),confirmedAt:waterBqlTextV20_(d[26]),reviewNote:waterBqlTextV20_(d[27]),approvedHash:waterBqlTextV20_(d[28]),currentHash:waterBqlTextV20_(d[29]),baseline:waterBqlNumberOrBlankV20_(r[30]),baselineDelta:waterBqlNumberOrBlankV20_(r[31])};
    o.needsReview=waterBqlNeedsReviewV20_(o);rows.push(o);
  }
  const info=ss.getSheetByName(WATER_BQL_V20.INFO_SHEET),ir=info?info.getRange('A2:E2').getDisplayValues()[0]:[];
  return {type:'WATER_BQL_DATA_RESULT',requestId,ok:true,projectId:g.projectId,projectName:waterBqlTextV20_(ir[1]),period,months,rows,user:{code:g.staffCode||'',name:g.staffName||'',role:g.role||''}};
}
function waterBqlNeedsReviewV20_(r){if(r.previous===''||r.current===''||r.consumption===''||!r.image)return true;if(Number(r.current)<Number(r.previous))return true;if(/CẦN|LỖI|SAI|CHỤP LẠI/i.test(r.aiStatus||''))return true;if(/BẤT THƯỜNG|LỖI|SAI|THIẾU/i.test(r.assessment||''))return true;if(/CẦN ĐỐI CHIẾU/i.test(r.reviewResult||''))return true;return false;}

function waterBqlActionV20_(p,g,requestId){
  const action=String(p&&p.action?p.action:'').trim().toLowerCase();
  if(['stafflist','staffsave','staffresetpassword'].indexOf(action)>=0){
    if(typeof waterBqlStaffActionV20_!=='function')throw new Error('Backend thiếu module Quản lý nhân sự V20.');
    return waterBqlStaffActionV20_(p,g,requestId,action);
  }
  if(['confirm','recapture','edit'].indexOf(action)<0)throw new Error('Thao tác BQL không hợp lệ.');
  const period=waterBqlCanonPeriodV20_(p&&p.period),meter=waterBqlTextV20_(p&&p.meter),expected=waterBqlTextV20_(p&&p.clientId),note=waterBqlCleanNoteV20_(p&&p.note);if(!period||!meter)throw new Error('Thiếu Kỳ hoặc Mã đồng hồ.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw new Error('Hệ thống đang xử lý. Vui lòng thử lại.');
  try{
    const ss=waterOpenProject_(g.projectId),sh=ss.getSheetByName(WATER_BQL_V20.MAIN_SHEET);if(!sh)throw new Error('Dự án thiếu GHI_SO_HANG_THANG.');
    const row=waterBqlFindMainRowV20_(sh,period,meter);if(!row)throw new Error('Không tìm thấy bản ghi hiện tại của đồng hồ '+meter+' kỳ '+period+'.');
    let r=sh.getRange(row,1,1,34).getValues()[0],cid=waterBqlTextV20_(r[18]);if(expected&&cid&&expected!==cid)return {type:'WATER_BQL_ACTION_RESULT',requestId,ok:false,code:'STALE_DATA',error:'Dữ liệu đã thay đổi do có lần chụp mới. Hãy Làm mới trước khi thao tác.'};
    const before=waterBqlSnapshotV20_(r),actor=waterBqlActorV20_(g);
    if(action==='confirm')waterBqlConfirmV20_(ss,sh,row,r,actor,note,g);else if(action==='recapture')waterBqlRecaptureV20_(ss,sh,row,r,actor,note,g);else waterBqlEditV20_(ss,sh,row,r,actor,note,p&&p.newReading,g);
    SpreadsheetApp.flush();r=sh.getRange(row,1,1,34).getValues()[0];
    return {type:'WATER_BQL_ACTION_RESULT',requestId,ok:true,action,projectId:g.projectId,period,meter:waterBqlTextV20_(r[5]),clientId:waterBqlTextV20_(r[18]),before,after:waterBqlSnapshotV20_(r),actor};
  }finally{lock.releaseLock();}
}
function waterBqlFindMainRowV20_(sh,period,meter){const last=waterBqlLastRowV20_(sh);if(last<2)return 0;const k=waterBqlMeterKeyV20_(meter),a=sh.getRange(2,2,last-1,5).getDisplayValues();for(let i=a.length-1;i>=0;i--)if(waterBqlTextV20_(a[i][0])===period&&waterBqlMeterKeyV20_(a[i][4])===k)return i+2;return 0;}
function waterBqlSnapshotV20_(r){return {previous:waterBqlNumberOrBlankV20_(r[6]),current:waterBqlNumberOrBlankV20_(r[7]),consumption:waterBqlNumberOrBlankV20_(r[8]),image:waterBqlTextV20_(r[9]),aiStatus:waterBqlTextV20_(r[14]),assessment:waterBqlTextV20_(r[22]),checked:r[23]===true,reviewResult:waterBqlTextV20_(r[24]),confirmer:waterBqlTextV20_(r[25]),confirmedAt:r[26]||'',reviewNote:waterBqlTextV20_(r[27]),approvedHash:waterBqlTextV20_(r[28]),currentHash:waterBqlTextV20_(r[29])};}
function waterBqlValidReadingV20_(r){const p=waterBqlNumberOrBlankV20_(r[6]),c=waterBqlNumberOrBlankV20_(r[7]),u=waterBqlNumberOrBlankV20_(r[8]);return p!==''&&c!==''&&u!==''&&Number(c)>=Number(p)&&Math.abs(Number(u)-(Number(c)-Number(p)))<0.001;}
function waterBqlRowNeedsCompareV20_(r){const a=waterBqlTextV20_(r[14]),w=waterBqlTextV20_(r[22]);if(/CẦN KIỂM TRA|CẦN KIỂ TRA|LỖI AI/i.test(a)&&!/CẦN KIỂM TRA - TIÊU THỤ CAO|KIỂM TRA TĂNG CAO|CẦN KIỂM TRA THAY THẾ/i.test(a))return true;return /TIÊU THỤ TĂNG BẤT THƯỜNG|TIÊU THỤ GIẢM BẤT THƯỜNG/i.test(w);}
function waterBqlReasonFromRowV20_(r){const w=waterBqlTextV20_(r[22]);if(/BẤT THƯỜNG/i.test(w))return w;return waterBqlTextV20_(r[14])||'BQL đã đối chiếu dữ liệu.';}
function waterBqlConfirmV20_(ss,sh,row,r,actor,note,g){if(!waterBqlValidReadingV20_(r))throw new Error('Dữ liệu chỉ số chưa hợp lệ để xác nhận.');if(!waterBqlTextV20_(r[9])||!waterBqlTextV20_(r[17]))throw new Error('Thiếu ảnh/File ID để đối chiếu.');const q=waterBqlQueueForRowV20_(ss,r),hash=waterBqlHashV20_(r,q),need=waterBqlRowNeedsCompareV20_(r),finalNote=note||(need?waterBqlReasonFromRowV20_(r):'BQL xác nhận dữ liệu đúng.');sh.getRange(row,26,1,3).setValues([[actor,new Date(),finalNote]]);sh.getRange(row,30).setValue(hash);if(need){sh.getRange(row,24).clearContent();sh.getRange(row,29).setValue(hash);}else{sh.getRange(row,24).setValue(true);sh.getRange(row,29).clearContent();}waterBqlAuditV20_(ss,r,g,'BQL_WEB_CONFIRM',r[7],r[7],finalNote,{hash,needsCompare:need});}
function waterBqlRecaptureV20_(ss,sh,row,r,actor,note,g){const reason=note||'BQL yêu cầu chụp lại ảnh/chỉ số để đối chiếu.';sh.getRange(row,15).setValue('CẦN KIỂM TRA - BQL YÊU CẦU CHỤP LẠI');sh.getRange(row,24).clearContent();sh.getRange(row,26,1,3).setValues([[actor,new Date(),'YÊU CẦU CHỤP LẠI: '+reason]]);sh.getRange(row,29).clearContent();const u=sh.getRange(row,1,1,34).getValues()[0],hash=waterBqlHashV20_(u,waterBqlQueueForRowV20_(ss,u));sh.getRange(row,30).setValue(hash);waterBqlAuditV20_(ss,r,g,'BQL_WEB_RECAPTURE',r[7],r[7],reason,{hash});}
function waterBqlEditV20_(ss,sh,row,r,actor,note,newReadingRaw,g){const nr=Number(String(newReadingRaw==null?'':newReadingRaw).replace(',','.'));if(!Number.isFinite(nr)||nr<0)throw new Error('Chỉ số mới không hợp lệ.');const prev=waterBqlNumberOrBlankV20_(r[6]);if(prev!==''&&nr<Number(prev))throw new Error('Chỉ số mới không được nhỏ hơn chỉ số kỳ trước.');const old=waterBqlNumberOrBlankV20_(r[7]),reason=note||'BQL điều chỉnh chỉ số sau khi đối chiếu ảnh.';sh.getRange(row,8).setValue(nr).setNumberFormat('0.0000');sh.getRange(row,15).setValue('AI ĐÃ ĐỌC - CHỜ ĐỐI CHIẾU');sh.getRange(row,24).clearContent();sh.getRange(row,26,1,3).setValues([[actor,new Date(),'BQL SỬA CHỈ SỐ: '+reason]]);sh.getRange(row,29).clearContent();SpreadsheetApp.flush();const u=sh.getRange(row,1,1,34).getValues()[0],hash=waterBqlHashV20_(u,waterBqlQueueForRowV20_(ss,u));sh.getRange(row,30).setValue(hash);waterBqlAuditV20_(ss,r,g,'BQL_WEB_EDIT',old,nr,reason,{hash});}
function waterBqlQueueForRowV20_(ss,r){const q=ss.getSheetByName(WATER_BQL_V20.QUEUE_SHEET);if(!q||q.getLastRow()<2)return [];const p=waterBqlTextV20_(r[1]),k=waterBqlMeterKeyV20_(r[5]),a=q.getRange(2,1,q.getLastRow()-1,Math.min(27,q.getLastColumn())).getValues();return a.filter(x=>waterBqlTextV20_(x[1])===p&&waterBqlMeterKeyV20_(x[5])===k);}
function waterBqlHashV20_(r,q){const f=[1,5,6,7,8,9,13,14,15,16,17,18,20,22,27],c=JSON.stringify([f.map(i=>r[i]),(q||[]).map(x=>[x[7],x[14],x[17],x[18],x[20],x[25],x[26]]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,c,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function waterBqlCleanNoteV20_(v){return String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,500);}
function waterBqlAuditV20_(ss,r,g,source,oldReading,newReading,reason,extra){const sh=ss.getSheetByName(WATER_BQL_V20.AUDIT_SHEET);if(!sh||sh.getRange('A1').getDisplayValue()!=='Thời gian sửa')throw new Error('Không tìm thấy NHAT_KY_CHINH_SUA_V2 đúng cấu trúc.');const actor=waterBqlActorV20_(g),meta=JSON.stringify(Object.assign({id:Utilities.getUuid(),projectId:g.projectId,staffCode:g.staffCode||'',role:g.role||'',aiStatus:waterBqlTextV20_(r[14]),reviewResult:waterBqlTextV20_(r[24])},extra||{})),safe=v=>typeof v==='string'&&/^[=+@-]/.test(v)?"'"+v:v;sh.appendRow([new Date(),waterBqlTextV20_(r[1]),waterBqlTextV20_(r[5]),oldReading,newReading,actor,reason,waterBqlTextV20_(r[9]),waterBqlTextV20_(r[9]),waterBqlTextV20_(r[18]),source,meta].map(safe));}
function waterBqlHtmlV20_(obj){const payload=JSON.stringify(obj||{}).replace(/</g,'\\u003c').replace(/-->/g,'--\\u003e');return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){var m='+payload+';try{window.top.postMessage(m,"*");}catch(e){}try{window.parent.postMessage(m,"*");}catch(e){}})();<\/script></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}