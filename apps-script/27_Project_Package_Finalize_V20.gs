/**
 * M&E WATER V20 - PACKAGE FINALIZER R2
 * Mục tiêu trước khi đóng gói:
 * - Không phụ thuộc PROJECTS đã được ghi kịp thời bởi Provisioning.
 * - Sau khi TAO_DU_AN chuyển READY, tự khôi phục/chuẩn hóa Registry nếu thiếu.
 * - Tự tạo tài khoản QUẢN LÝ đầu tiên bằng mật khẩu đã hash.
 * - Tự cài trigger cấp mã nhân sự.
 * - Tự ghi PWA_INSTALL_URL / SECURITY_STATUS / SECURITY_MESSAGE / BQL_URL.
 * - Kiểm tra Sheet + Folder dự án + Folder ảnh + Router theo PROJECT_ID.
 *
 * R2 sửa lỗi phát hiện khi test PKG001: dự án READY ở TAO_DU_AN nhưng
 * PROJECTS chưa có dòng nên finalizer cũ chờ Registry và không hoàn tất.
 */

const V20_PACKAGE = Object.freeze({
  REGISTRY_ID:'1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0',
  REGISTRY_TAB:'PROJECTS',
  CREATE_TAB:'TAO_DU_AN',
  CREATE_CHECKBOX_A1:'B15',
  TEMPLATE_ID:'1xxpH0znT_aT0UP74fOY9Z4eFa5DnSk96TvJxOELllh4',
  PROJECTS_FOLDER_ID:'1vGm31fksUV53kL9OHPs7ThEId4IwuOt2',
  PWA_BASE_URL:'https://robotglass247.github.io/ghi-so-nuoc/install.html',
  APP_BASE_URL:'https://robotglass247.github.io/ghi-so-nuoc/r1135-v20-direct.html',
  BQL_BASE_URL:'https://robotglass247.github.io/ghi-so-nuoc/quan-ly-v20.html',
  FINALIZE_HANDLER:'v20PackageFinalizeOnEdit_'
});

function CAI_DAT_DONG_GOI_V20(){
  const reg=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID);
  const exists=ScriptApp.getProjectTriggers().some(function(t){
    return t.getHandlerFunction()===V20_PACKAGE.FINALIZE_HANDLER&&
      t.getTriggerSourceId()===reg.getId();
  });
  if(!exists){
    ScriptApp.newTrigger(V20_PACKAGE.FINALIZE_HANDLER)
      .forSpreadsheet(reg)
      .onEdit()
      .create();
  }
  const check=V20_PACKAGE_PRECHECK();
  const out={ok:check.ok,triggerCreated:!exists,precheck:check,build:'R2_CREATE_RESULT_RECOVERY'};
  Logger.log(JSON.stringify(out));
  return out;
}

function v20PackageFinalizeOnEdit_(e){
  if(!e||!e.range)return;
  const sh=e.range.getSheet();
  const ss=sh.getParent();
  if(ss.getId()!==V20_PACKAGE.REGISTRY_ID)return;
  if(sh.getName()!==V20_PACKAGE.CREATE_TAB)return;
  if(e.range.getA1Notation()!==V20_PACKAGE.CREATE_CHECKBOX_A1)return;
  if(String(e.value||'').toUpperCase()!=='TRUE')return;

  const projectId=v20PackageNormId_(sh.getRange('B2').getDisplayValue());
  if(!projectId)return;

  try{
    const result=v20PackageWaitCreateResultAndFinalize_(projectId,240);
    Logger.log(JSON.stringify(result));
  }catch(err){
    console.error(err&&err.stack?err.stack:err);
    try{
      v20PackageWriteCreateResult_(projectId,{
        security:'ERROR: '+String(err&&err.message?err.message:err)
      });
    }catch(_){}
  }
}

/**
 * Chờ trực tiếp vùng kết quả TAO_DU_AN D:E thay vì chờ PROJECTS.
 * Đây là điểm sửa chính của R2.
 */
function v20PackageWaitCreateResultAndFinalize_(projectId,maxSeconds){
  const id=v20PackageNormId_(projectId);
  const limit=Math.max(30,Math.min(300,Number(maxSeconds||240)));
  const regSS=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID);
  const sh=regSS.getSheetByName(V20_PACKAGE.CREATE_TAB);
  if(!sh)throw new Error('Không có sheet '+V20_PACKAGE.CREATE_TAB+'.');

  for(let i=0;i<limit;i++){
    const status=String(sh.getRange('E2').getDisplayValue()||'').trim().toUpperCase();
    const resultId=v20PackageNormId_(sh.getRange('E3').getDisplayValue());
    const sheetId=String(sh.getRange('E4').getDisplayValue()||'').trim();
    const errStep=String(sh.getRange('E10').getDisplayValue()||'').trim();
    const errMsg=String(sh.getRange('E11').getDisplayValue()||'').trim();

    if(status==='READY'&&resultId===id&&sheetId){
      return V20_PACKAGE_FINALIZE_FROM_CREATE_RESULT(id);
    }
    if(status==='ERROR'&&(!resultId||resultId===id)){
      throw new Error('Tạo dự án '+id+' lỗi'+(errStep?' tại '+errStep:'')+': '+(errMsg||'Không có mô tả lỗi.'));
    }
    Utilities.sleep(1000);
  }
  throw new Error('Quá thời gian chờ TAO_DU_AN hoàn tất dự án '+id+'.');
}

/**
 * Cho phép chạy tay để hoàn tất/recover một dự án vừa tạo từ TAO_DU_AN.
 */
function V20_PACKAGE_FINALIZE_FROM_CREATE_RESULT(projectId){
  const id=v20PackageNormId_(projectId||v20PackageReadCreateResult_().projectId);
  if(!id)throw new Error('Thiếu PROJECT_ID.');

  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Hệ thống đang bận. Vui lòng thử lại.');
  try{
    const created=v20PackageReadCreateResult_();
    if(v20PackageNormId_(created.projectId)!==id){
      throw new Error('Kết quả TAO_DU_AN không thuộc PROJECT_ID '+id+'.');
    }
    if(String(created.status||'').toUpperCase()!=='READY'){
      throw new Error('Dự án '+id+' chưa ở trạng thái READY.');
    }
    if(!created.sheetId)throw new Error('Kết quả tạo dự án thiếu SHEET_ID.');

    const regSS=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID);
    const reg=regSS.getSheetByName(V20_PACKAGE.REGISTRY_TAB);
    if(!reg)throw new Error('Không có sheet '+V20_PACKAGE.REGISTRY_TAB+'.');

    const input=v20PackageReadCreateInput_();
    const row=v20PackageEnsureRegistryRow_(id,reg,input,created);
    const rv=reg.getRange(row,1,1,Math.max(21,reg.getLastColumn())).getDisplayValues()[0];
    const ss=SpreadsheetApp.openById(created.sheetId);

    const manager=v20PackageEnsureInitialManager_(id,ss,rv);
    const trigger=v20PackageEnsureStaffTrigger_(ss);
    const isolation=v20PackageCheckIsolation_(id,row,reg,ss);

    const pwaUrl=V20_PACKAGE.PWA_BASE_URL+'?project='+encodeURIComponent(id);
    const bqlUrl=V20_PACKAGE.BQL_BASE_URL+'?project='+encodeURIComponent(id);
    const securityOk=isolation.ok&&manager.ok&&trigger.ok;
    const securityMessage=[].concat(
      isolation.messages||[],
      manager.message?[manager.message]:[],
      trigger.message?[trigger.message]:[]
    ).filter(Boolean).join(' | ');

    v20PackageSetRegistryField_(reg,row,'PWA_INSTALL_URL',pwaUrl);
    v20PackageSetRegistryField_(reg,row,'SECURITY_STATUS',securityOk?'OK':'CHECK');
    v20PackageSetRegistryField_(reg,row,'SECURITY_MESSAGE',securityMessage||'OK');
    v20PackageSetRegistryField_(reg,row,'BQL_URL',bqlUrl);

    v20PackageWriteCreateResult_(id,{
      managerCode:manager.code||'',
      managerPassword:manager.tempPassword||'Đã có tài khoản Quản lý',
      pwaUrl:pwaUrl,
      security:(securityOk?'OK':'CHECK')+(securityMessage?' - '+securityMessage:'')
    });

    const result={
      ok:securityOk,
      projectId:id,
      sheetId:created.sheetId,
      registryRow:row,
      manager:manager,
      staffTrigger:trigger,
      isolation:isolation,
      pwaInstallUrl:pwaUrl,
      appUrl:V20_PACKAGE.APP_BASE_URL+'?project='+encodeURIComponent(id),
      bqlUrl:bqlUrl,
      securityStatus:securityOk?'OK':'CHECK',
      build:'R2_CREATE_RESULT_RECOVERY'
    };
    Logger.log(JSON.stringify(result));
    return result;
  }finally{
    lock.releaseLock();
  }
}

/**
 * Tương thích tên hàm cũ nếu đang dùng từ shortcut/test cũ.
 */
function V20_PACKAGE_FINALIZE_PROJECT(projectId){
  return V20_PACKAGE_FINALIZE_FROM_CREATE_RESULT(projectId);
}

function v20PackageReadCreateResult_(){
  const ss=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID);
  const sh=ss.getSheetByName(V20_PACKAGE.CREATE_TAB);
  if(!sh)throw new Error('Không có sheet '+V20_PACKAGE.CREATE_TAB+'.');
  return {
    status:String(sh.getRange('E2').getDisplayValue()||'').trim(),
    projectId:v20PackageNormId_(sh.getRange('E3').getDisplayValue()),
    sheetId:String(sh.getRange('E4').getDisplayValue()||'').trim(),
    sheetUrl:String(sh.getRange('E5').getDisplayValue()||'').trim(),
    projectFolderUrl:String(sh.getRange('E6').getDisplayValue()||'').trim(),
    photoFolderUrl:String(sh.getRange('E7').getDisplayValue()||'').trim(),
    appUrl:String(sh.getRange('E8').getDisplayValue()||'').trim(),
    lastCheck:String(sh.getRange('E9').getDisplayValue()||'').trim(),
    errorStep:String(sh.getRange('E10').getDisplayValue()||'').trim(),
    errorMessage:String(sh.getRange('E11').getDisplayValue()||'').trim(),
    version:String(sh.getRange('E12').getDisplayValue()||'').trim()
  };
}

function v20PackageReadCreateInput_(){
  const ss=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID);
  const sh=ss.getSheetByName(V20_PACKAGE.CREATE_TAB);
  if(!sh)throw new Error('Không có sheet '+V20_PACKAGE.CREATE_TAB+'.');
  const rows=sh.getRange('A2:B12').getDisplayValues();
  const map={};
  rows.forEach(function(r){map[String(r[0]||'').trim()]=String(r[1]||'').trim();});
  return {
    projectId:v20PackageNormId_(map.PROJECT_ID),
    projectName:String(map.PROJECT_NAME||'').trim(),
    address:String(map.PROJECT_ADDRESS||'').trim(),
    unit:String(map.DON_VI_QLVH||'').trim(),
    manager:String(map.NGUOI_PHU_TRACH||'').trim(),
    notes:String(map.GHI_CHU||'').trim(),
    ownerEmail:String(map.OWNER_EMAIL||'').trim()
  };
}

function v20PackageEnsureRegistryRow_(projectId,reg,input,created){
  const id=v20PackageNormId_(projectId);
  let row=v20PackageFindRegistryRow_(id,reg);
  const projectFolderId=v20PackageExtractDriveId_(created.projectFolderUrl,'folders');
  const photoFolderId=v20PackageExtractDriveId_(created.photoFolderUrl,'folders');
  const appUrl=created.appUrl||V20_PACKAGE.APP_BASE_URL+'?project='+encodeURIComponent(id);

  if(!projectFolderId)throw new Error('Không lấy được PROJECT_FOLDER_ID từ kết quả tạo dự án.');
  if(!photoFolderId)throw new Error('Không lấy được PHOTO_FOLDER_ID từ kết quả tạo dự án.');

  if(!row){
    row=reg.getLastRow()+1;
    reg.getRange(row,1,1,17).setValues([[
      id,
      input.projectName||id,
      created.sheetId,
      '',
      input.ownerEmail||'',
      'READY',
      created.version||'V20',
      new Date(),
      input.notes||'Tạo tự động V20',
      projectFolderId,
      photoFolderId,
      appUrl,
      'READY',
      new Date(),
      '',
      '',
      V20_PACKAGE.TEMPLATE_ID
    ]]);
  }else{
    const current=reg.getRange(row,1,1,17).getDisplayValues()[0];
    const values=[
      id,
      current[1]||input.projectName||id,
      current[2]||created.sheetId,
      current[3]||'',
      current[4]||input.ownerEmail||'',
      'READY',
      current[6]||created.version||'V20',
      current[7]||new Date(),
      current[8]||input.notes||'Tạo tự động V20',
      current[9]||projectFolderId,
      current[10]||photoFolderId,
      current[11]||appUrl,
      'READY',
      new Date(),
      '',
      '',
      current[16]||V20_PACKAGE.TEMPLATE_ID
    ];
    reg.getRange(row,1,1,17).setValues([values]);
  }
  SpreadsheetApp.flush();
  return row;
}

function v20PackageEnsureInitialManager_(projectId,ss,registryRowValues){
  const sh=ss.getSheetByName('NHAN_SU_THUC_HIEN');
  if(!sh)throw new Error('Dự án thiếu sheet NHAN_SU_THUC_HIEN.');

  const last=Math.max(4,sh.getLastRow());
  let rows=[];
  if(last>=5){
    rows=sh.getRange(5,1,last-4,8).getDisplayValues().filter(function(r){
      return String(r[0]||'').trim()||String(r[1]||'').trim();
    });
  }

  const managers=rows.filter(function(r){
    return v20PackageNormText_(r[5])==='dang lam viec'&&
      ['quan ly','bql','admin','quan tri','administrator'].indexOf(v20PackageNormText_(r[6]))>=0;
  });
  if(managers.length){
    return {
      ok:true,created:false,
      code:String(managers[0][0]||'').trim().toUpperCase(),
      name:String(managers[0][1]||'').trim(),
      message:'Đã có tài khoản QUẢN LÝ.'
    };
  }

  if(rows.length){
    return {
      ok:false,created:false,code:'',name:'',
      message:'Đã có nhân sự nhưng chưa có tài khoản QUẢN LÝ đang hoạt động.'
    };
  }

  if(typeof waterAuthPasswordHashV20_!=='function'){
    throw new Error('Backend thiếu waterAuthPasswordHashV20_; không tạo mật khẩu rõ cho dự án mới.');
  }

  const info=ss.getSheetByName('THONG_TIN_DU_AN');
  const name=String(info?info.getRange('E2').getDisplayValue():'').trim()||'Quản lý dự án';
  const email=String((registryRowValues&&registryRowValues[4])||'').trim();
  const code='NS001';
  const tempPassword=v20PackageTempPassword_();
  const stored=waterAuthPasswordHashV20_(projectId,code,tempPassword);

  sh.getRange(5,1,1,8).setValues([[
    code,name,'Quản lý','',email,'Đang làm việc','QUẢN LÝ',stored
  ]]);
  SpreadsheetApp.flush();
  if(typeof waterStaffSaveSequenceV20_==='function'){
    try{waterStaffSaveSequenceV20_(ss,1);}catch(_){}
  }
  return {
    ok:true,created:true,code:code,name:name,tempPassword:tempPassword,
    message:'Đã tạo tài khoản QUẢN LÝ ban đầu '+code+'.'
  };
}

function v20PackageEnsureStaffTrigger_(ss){
  if(typeof xuLyMaNhanSuProject_!=='function'){
    return {ok:false,created:false,message:'Thiếu module tự cấp Mã nhân sự.'};
  }
  const handler='xuLyMaNhanSuProject_';
  const exists=ScriptApp.getProjectTriggers().some(function(t){
    return t.getHandlerFunction()===handler&&t.getTriggerSourceId()===ss.getId();
  });
  if(!exists){
    ScriptApp.newTrigger(handler).forSpreadsheet(ss).onEdit().create();
  }
  return {ok:true,created:!exists,message:'Trigger Mã nhân sự: OK.'};
}

function v20PackageCheckIsolation_(projectId,row,reg,projectSS){
  const id=v20PackageNormId_(projectId);
  const r=reg.getRange(row,1,1,Math.max(21,reg.getLastColumn())).getDisplayValues()[0];
  const sheetId=String(r[2]||'').trim();
  const projectFolderId=String(r[9]||'').trim();
  const photoFolderId=String(r[10]||'').trim();
  const errors=[];
  const messages=[];

  if(!sheetId)errors.push('Thiếu SHEET_ID.');
  if(!projectFolderId)errors.push('Thiếu PROJECT_FOLDER_ID.');
  if(!photoFolderId)errors.push('Thiếu PHOTO_FOLDER_ID.');
  if(projectSS&&projectSS.getId()!==sheetId)errors.push('Sheet đang mở không khớp Registry.');

  let projectFolder=null,photoFolder=null,file=null;
  try{projectFolder=DriveApp.getFolderById(projectFolderId);}catch(e){errors.push('Không mở được PROJECT_FOLDER_ID.');}
  try{photoFolder=DriveApp.getFolderById(photoFolderId);}catch(e){errors.push('Không mở được PHOTO_FOLDER_ID.');}
  try{file=DriveApp.getFileById(sheetId);}catch(e){errors.push('Không mở được SHEET_ID.');}

  if(projectFolder){
    if(!v20PackageHasParent_(projectFolder,V20_PACKAGE.PROJECTS_FOLDER_ID)){
      errors.push('PROJECT_FOLDER không nằm trong thư mục dự án gốc.');
    }else messages.push('Project folder đúng.');
  }
  if(projectFolder&&photoFolder){
    if(!v20PackageHasParent_(photoFolder,projectFolderId)){
      errors.push('Folder ảnh không nằm trong Project folder.');
    }else messages.push('Folder ảnh đúng dự án.');
  }
  if(projectFolder&&file){
    if(!v20PackageHasParent_(file,projectFolderId)){
      errors.push('Google Sheet không nằm trong Project folder.');
    }else messages.push('Sheet đúng Project folder.');
  }

  if(typeof waterOpenProject_==='function'){
    try{
      const routed=waterOpenProject_(id);
      if(!routed||routed.getId()!==sheetId)errors.push('Router Sheet mở sai dự án.');
      else messages.push('Router Sheet đúng.');
    }catch(e){errors.push('Router Sheet lỗi: '+String(e&&e.message?e.message:e));}
  }else errors.push('Thiếu waterOpenProject_.');

  if(typeof waterProjectPhotoFolder_==='function'){
    try{
      const routedFolder=waterProjectPhotoFolder_(id);
      if(!routedFolder||routedFolder.getId()!==photoFolderId){
        errors.push('Router ảnh mở sai dự án.');
      }else messages.push('Router ảnh đúng.');
    }catch(e){errors.push('Router ảnh lỗi: '+String(e&&e.message?e.message:e));}
  }else errors.push('Thiếu waterProjectPhotoFolder_.');

  return {ok:errors.length===0,errors:errors,messages:errors.length?errors:messages};
}

function v20PackageHasParent_(item,parentId){
  if(!item||!parentId)return false;
  const parents=item.getParents();
  while(parents.hasNext()){
    if(parents.next().getId()===parentId)return true;
  }
  return false;
}

function v20PackageSetRegistryField_(sh,row,header,value){
  const lastCol=Math.max(1,sh.getLastColumn());
  const headers=sh.getRange(1,1,1,lastCol).getDisplayValues()[0];
  let col=headers.findIndex(function(x){return String(x||'').trim()===header;})+1;
  if(!col){
    col=lastCol+1;
    sh.getRange(1,col).setValue(header);
  }
  sh.getRange(row,col).setValue(value==null?'':value);
}

function v20PackageWriteCreateResult_(projectId,data){
  const ss=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID);
  const sh=ss.getSheetByName(V20_PACKAGE.CREATE_TAB);
  if(!sh)return;
  const current=v20PackageNormId_(sh.getRange('B2').getDisplayValue());
  if(current!==v20PackageNormId_(projectId))return;
  sh.getRange('D13:E16').setValues([
    ['MÃ QUẢN LÝ',String(data&&data.managerCode||'')],
    ['MẬT KHẨU TẠM',String(data&&data.managerPassword||'')],
    ['PWA CÀI ĐẶT',String(data&&data.pwaUrl||'')],
    ['AN TOÀN / CÁCH LY',String(data&&data.security||'')]
  ]);
}

function v20PackageFindRegistryRow_(projectId,sh){
  const id=v20PackageNormId_(projectId);
  const reg=sh||SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID).getSheetByName(V20_PACKAGE.REGISTRY_TAB);
  if(!reg||reg.getLastRow()<2)return 0;
  const found=reg.getRange(2,1,reg.getLastRow()-1,1)
    .createTextFinder(id)
    .matchEntireCell(true)
    .matchCase(false)
    .findNext();
  return found?found.getRow():0;
}

function v20PackageExtractDriveId_(url,kind){
  const s=String(url||'').trim();
  if(!s)return '';
  let m;
  if(kind==='folders'){
    m=/\/folders\/([A-Za-z0-9_-]+)/.exec(s);
    if(m)return m[1];
  }
  m=/\/d\/([A-Za-z0-9_-]+)/.exec(s);
  return m?m[1]:'';
}

function v20PackageTempPassword_(){
  return Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
}

function v20PackageNormId_(v){
  return String(v||'').trim().toUpperCase().replace(/\s+/g,'_');
}

function v20PackageNormText_(v){
  return String(v==null?'':v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/đ/g,'d')
    .replace(/\s+/g,' ')
    .trim();
}

function V20_PACKAGE_PRECHECK(){
  const errors=[];
  const warnings=[];
  if(typeof TAO_DU_AN_V20!=='function')warnings.push('Chưa nạp TAO_DU_AN_V20.');
  if(typeof waterOpenProject_!=='function')warnings.push('Chưa nạp waterOpenProject_.');
  if(typeof waterProjectPhotoFolder_!=='function')warnings.push('Chưa nạp waterProjectPhotoFolder_.');
  if(typeof waterAuthPasswordHashV20_!=='function')warnings.push('Chưa nạp waterAuthPasswordHashV20_.');
  if(typeof waterBqlStaffActionV20_!=='function')warnings.push('Chưa nạp waterBqlStaffActionV20_.');
  if(typeof xuLyMaNhanSuProject_!=='function')warnings.push('Chưa nạp xuLyMaNhanSuProject_.');

  let master;
  try{master=SpreadsheetApp.openById(V20_PACKAGE.TEMPLATE_ID);}catch(e){errors.push('Không mở được MASTER_TEMPLATE_WATER_V20_PASS.');}
  if(master){
    ['GHI_SO_HANG_THANG','DANH_MUC_DONG_HO','NHAN_SU_THUC_HIEN','THONG_TIN_DU_AN']
      .forEach(function(n){if(!master.getSheetByName(n))errors.push('MASTER thiếu '+n+'.');});

    const staff=master.getSheetByName('NHAN_SU_THUC_HIEN');
    if(staff&&staff.getRange('A5:H20').getDisplayValues().some(function(r){
      return r.some(function(v){return String(v||'').trim()!=='';});
    }))errors.push('MASTER không sạch: NHAN_SU_THUC_HIEN có dữ liệu từ dòng 5.');

    const meters=master.getSheetByName('DANH_MUC_DONG_HO');
    if(meters&&meters.getRange('B3:F20').getDisplayValues().some(function(r){
      return r.some(function(v){return String(v||'').trim()!=='';});
    }))errors.push('MASTER không sạch: DANH_MUC_DONG_HO có dữ liệu.');

    const main=master.getSheetByName('GHI_SO_HANG_THANG');
    if(main&&main.getRange('A2:F20').getDisplayValues().some(function(r){
      return r.some(function(v){return String(v||'').trim()!=='';});
    }))errors.push('MASTER không sạch: GHI_SO_HANG_THANG có dữ liệu.');
  }

  return {
    ok:errors.length===0,
    errors:errors,
    warnings:warnings,
    pwaMode:'PROJECT_SPECIFIC_MANIFEST',
    finalizerMode:'CREATE_RESULT_RECOVERY_R2'
  };
}

function V20_PACKAGE_CHECK_PROJECT(projectId){
  const id=v20PackageNormId_(projectId);
  const reg=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID).getSheetByName(V20_PACKAGE.REGISTRY_TAB);
  const row=v20PackageFindRegistryRow_(id,reg);
  if(!row)throw new Error('Không tìm thấy '+id+'.');
  const r=reg.getRange(row,1,1,Math.max(21,reg.getLastColumn())).getDisplayValues()[0];
  const ss=SpreadsheetApp.openById(String(r[2]||'').trim());
  const staff=ss.getSheetByName('NHAN_SU_THUC_HIEN');
  const data=staff&&staff.getLastRow()>=5?staff.getRange(5,1,staff.getLastRow()-4,8).getDisplayValues():[];
  const managers=data.filter(function(x){
    return v20PackageNormText_(x[5])==='dang lam viec'&&v20PackageNormText_(x[6])==='quan ly';
  });
  const isolation=v20PackageCheckIsolation_(id,row,reg,ss);
  return {
    ok:isolation.ok&&managers.length>0,
    projectId:id,
    managerCount:managers.length,
    activeStaff:data.filter(function(x){return v20PackageNormText_(x[5])==='dang lam viec';}).length,
    isolation:isolation,
    pwaInstallUrl:V20_PACKAGE.PWA_BASE_URL+'?project='+encodeURIComponent(id),
    appUrl:V20_PACKAGE.APP_BASE_URL+'?project='+encodeURIComponent(id),
    build:'R2_CREATE_RESULT_RECOVERY'
  };
}
