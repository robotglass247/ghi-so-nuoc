/**
 * M&E WATER V20 - PACKAGE FINALIZER
 * Mục tiêu trước khi đóng gói:
 * - Sau khi TAO_DU_AN_V20 tạo dự án READY, tự tạo tài khoản QUẢN LÝ đầu tiên nếu sheet nhân sự còn trống.
 * - Tự cài trigger cấp mã nhân sự.
 * - Tự ghi PWA_INSTALL_URL / SECURITY_STATUS / SECURITY_MESSAGE / BQL_URL vào Registry.
 * - Kiểm tra Sheet + Folder dự án + Folder ảnh + Router đều cách ly đúng PROJECT_ID.
 *
 * File này KHÔNG thay logic TAO_DU_AN_V20 đang PASS.
 */

const V20_PACKAGE = Object.freeze({
  REGISTRY_ID:'1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0',
  REGISTRY_TAB:'PROJECTS',
  CREATE_TAB:'TAO_DU_AN',
  CREATE_CHECKBOX_A1:'B15',
  TEMPLATE_ID:'1xxpH0znT_aT0UP74fOY9Z4eFa5DnSk96TvJxOELllh4',
  PWA_BASE_URL:'https://robotglass247.github.io/ghi-so-nuoc/install.html',
  APP_BASE_URL:'https://robotglass247.github.io/ghi-so-nuoc/r1135-v20-direct.html',
  BQL_BASE_URL:'https://robotglass247.github.io/ghi-so-nuoc/quan-ly-v20.html',
  FINALIZE_HANDLER:'v20PackageFinalizeOnEdit_'
});

function CAI_DAT_DONG_GOI_V20(){
  const reg=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID);
  const exists=ScriptApp.getProjectTriggers().some(function(t){
    return t.getHandlerFunction()===V20_PACKAGE.FINALIZE_HANDLER&&t.getTriggerSourceId()===reg.getId();
  });
  if(!exists){
    ScriptApp.newTrigger(V20_PACKAGE.FINALIZE_HANDLER).forSpreadsheet(reg).onEdit().create();
  }
  const check=V20_PACKAGE_PRECHECK();
  Logger.log(JSON.stringify({ok:check.ok,triggerCreated:!exists,precheck:check}));
  return {ok:check.ok,triggerCreated:!exists,precheck:check};
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
    const result=v20PackageWaitAndFinalize_(projectId,240);
    Logger.log(JSON.stringify(result));
  }catch(err){
    console.error(err&&err.stack?err.stack:err);
    try{v20PackageWriteCreateResult_(projectId,{security:'ERROR: '+String(err&&err.message?err.message:err)});}catch(_){}
  }
}

function v20PackageWaitAndFinalize_(projectId,maxSeconds){
  const id=v20PackageNormId_(projectId);
  const limit=Math.max(30,Math.min(300,Number(maxSeconds||240)));
  for(let i=0;i<limit;i++){
    const row=v20PackageFindRegistryRow_(id);
    if(row){
      const sh=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID).getSheetByName(V20_PACKAGE.REGISTRY_TAB);
      const r=sh.getRange(row,1,1,Math.max(21,sh.getLastColumn())).getDisplayValues()[0];
      const status=String(r[5]||'').trim().toUpperCase();
      const createStatus=String(r[12]||'').trim().toUpperCase();
      if(status==='READY'&&createStatus==='READY')return V20_PACKAGE_FINALIZE_PROJECT(id);
      if(status==='ERROR'||createStatus==='ERROR'){
        throw new Error('Tạo dự án '+id+' đang ở trạng thái ERROR: '+String(r[15]||r[14]||''));
      }
    }
    Utilities.sleep(1000);
  }
  throw new Error('Quá thời gian chờ dự án '+id+' chuyển sang READY.');
}

function V20_PACKAGE_FINALIZE_PROJECT(projectId){
  const id=v20PackageNormId_(projectId);
  if(!id)throw new Error('Thiếu PROJECT_ID.');

  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Hệ thống đang bận. Vui lòng thử lại.');
  try{
    const regSS=SpreadsheetApp.openById(V20_PACKAGE.REGISTRY_ID);
    const reg=regSS.getSheetByName(V20_PACKAGE.REGISTRY_TAB);
    const row=v20PackageFindRegistryRow_(id,reg);
    if(!row)throw new Error('Không tìm thấy '+id+' trong PROJECTS.');

    const rv=reg.getRange(row,1,1,Math.max(21,reg.getLastColumn())).getDisplayValues()[0];
    const sheetId=String(rv[2]||'').trim();
    if(!sheetId)throw new Error('Dự án '+id+' thiếu SHEET_ID.');
    const ss=SpreadsheetApp.openById(sheetId);

    const manager=v20PackageEnsureInitialManager_(id,ss,rv);
    const trigger=v20PackageEnsureStaffTrigger_(id,ss);
    const isolation=v20PackageCheckIsolation_(id,row,reg,ss);

    const pwaUrl=V20_PACKAGE.PWA_BASE_URL+'?project='+encodeURIComponent(id);
    const bqlUrl=V20_PACKAGE.BQL_BASE_URL+'?project='+encodeURIComponent(id);
    const securityOk=isolation.ok&&manager.ok;
    const securityMessage=[].concat(isolation.messages||[],manager.message?[manager.message]:[],trigger.message?[trigger.message]:[]).filter(Boolean).join(' | ');

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
      sheetId:sheetId,
      manager:manager,
      staffTrigger:trigger,
      isolation:isolation,
      pwaInstallUrl:pwaUrl,
      appUrl:V20_PACKAGE.APP_BASE_URL+'?project='+encodeURIComponent(id),
      bqlUrl:bqlUrl,
      securityStatus:securityOk?'OK':'CHECK'
    };
    Logger.log(JSON.stringify(result));
    return result;
  }finally{
    lock.releaseLock();
  }
}

function v20PackageEnsureInitialManager_(projectId,ss,registryRowValues){
  const sh=ss.getSheetByName('NHAN_SU_THUC_HIEN');
  if(!sh)throw new Error('Dự án thiếu sheet NHAN_SU_THUC_HIEN.');

  const last=Math.max(4,sh.getLastRow());
  let rows=[];
  if(last>=5)rows=sh.getRange(5,1,last-4,8).getDisplayValues().filter(function(r){
    return String(r[0]||'').trim()||String(r[1]||'').trim();
  });

  const managers=rows.filter(function(r){
    return v20PackageNormText_(r[5])==='dang lam viec'&&['quan ly','bql','admin','quan tri','administrator'].indexOf(v20PackageNormText_(r[6]))>=0;
  });
  if(managers.length){
    return {ok:true,created:false,code:String(managers[0][0]||'').trim().toUpperCase(),name:String(managers[0][1]||'').trim(),message:'Đã có tài khoản QUẢN LÝ.'};
  }

  if(rows.length){
    return {ok:false,created:false,code:'',name:'',message:'Đã có nhân sự nhưng chưa có tài khoản QUẢN LÝ đang hoạt động.'};
  }

  const info=ss.getSheetByName('THONG_TIN_DU_AN');
  const name=String(info?info.getRange('E2').getDisplayValue():'').trim()||'Quản lý dự án';
  const email=String((registryRowValues&&registryRowValues[4])||'').trim();
  const code='NS001';
  const tempPassword=v20PackageTempPassword_();
  let stored=tempPassword;
  if(typeof waterAuthPasswordHashV20_==='function'){
    stored=waterAuthPasswordHashV20_(projectId,code,tempPassword);
  }

  sh.getRange(5,1,1,8).setValues([[code,name,'Quản lý','',email,'Đang làm việc','QUẢN LÝ',stored]]);
  SpreadsheetApp.flush();
  if(typeof waterStaffSaveSequenceV20_==='function'){
    try{waterStaffSaveSequenceV20_(ss,1);}catch(_){}
  }
  return {ok:true,created:true,code:code,name:name,tempPassword:tempPassword,message:'Đã tạo tài khoản QUẢN LÝ ban đầu '+code+'.'};
}

function v20PackageEnsureStaffTrigger_(projectId,ss){
  if(typeof caiTriggerMaNhanSuProject_==='function'){
    try{
      const r=caiTriggerMaNhanSuProject_(projectId);
      return {ok:true,created:!!(r&&r.triggerCreated),message:'Trigger Mã nhân sự: OK.'};
    }catch(err){
      return {ok:false,created:false,message:'Trigger Mã nhân sự lỗi: '+String(err&&err.message?err.message:err)};
    }
  }

  if(typeof xuLyMaNhanSuProject_!=='function'){
    return {ok:false,created:false,message:'Thiếu module tự cấp Mã nhân sự.'};
  }
  const handler='xuLyMaNhanSuProject_';
  const exists=ScriptApp.getProjectTriggers().some(function(t){
    return t.getHandlerFunction()===handler&&t.getTriggerSourceId()===ss.getId();
  });
  if(!exists)ScriptApp.newTrigger(handler).forSpreadsheet(ss).onEdit().create();
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
    if(!v20PackageHasParent_(projectFolder,V20_PROV&&V20_PROV.PROJECTS_FOLDER_ID?V20_PROV.PROJECTS_FOLDER_ID:'1vGm31fksUV53kL9OHPs7ThEId4IwuOt2')){
      errors.push('PROJECT_FOLDER không nằm trong thư mục dự án gốc.');
    }else messages.push('Project folder đúng.');
  }
  if(projectFolder&&photoFolder){
    if(!v20PackageHasParent_(photoFolder,projectFolderId))errors.push('Folder ảnh không nằm trong Project folder.');
    else messages.push('Folder ảnh đúng dự án.');
  }
  if(projectFolder&&file){
    if(!v20PackageHasParent_(file,projectFolderId))errors.push('Google Sheet không nằm trong Project folder.');
    else messages.push('Sheet đúng Project folder.');
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
      if(!routedFolder||routedFolder.getId()!==photoFolderId)errors.push('Router ảnh mở sai dự án.');
      else messages.push('Router ảnh đúng.');
    }catch(e){errors.push('Router ảnh lỗi: '+String(e&&e.message?e.message:e));}
  }else errors.push('Thiếu waterProjectPhotoFolder_.');

  return {ok:errors.length===0,errors:errors,messages:errors.length?errors:messages};
}

function v20PackageHasParent_(item,parentId){
  if(!item||!parentId)return false;
  const parents=item.getParents();
  while(parents.hasNext())if(parents.next().getId()===parentId)return true;
  return false;
}

function v20PackageSetRegistryField_(sh,row,header,value){
  let lastCol=Math.max(1,sh.getLastColumn());
  let headers=sh.getRange(1,1,1,lastCol).getDisplayValues()[0];
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
  const found=reg.getRange(2,1,reg.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).matchCase(false).findNext();
  return found?found.getRow():0;
}

function v20PackageTempPassword_(){
  return Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
}

function v20PackageNormId_(v){
  return String(v||'').trim().toUpperCase().replace(/\s+/g,'_');
}

function v20PackageNormText_(v){
  return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}

function V20_PACKAGE_PRECHECK(){
  const errors=[];
  const warnings=[];
  const requiredFunctions=[
    'TAO_DU_AN_V20','waterOpenProject_','waterProjectPhotoFolder_',
    'waterAuthPasswordHashV20_','waterBqlStaffActionV20_','xuLyMaNhanSuProject_'
  ];
  requiredFunctions.forEach(function(name){
    try{if(typeof globalThis[name]!=='function')warnings.push('Chưa nạp hàm '+name+'.');}catch(_){warnings.push('Chưa nạp hàm '+name+'.');}
  });

  let master;
  try{master=SpreadsheetApp.openById(V20_PACKAGE.TEMPLATE_ID);}catch(e){errors.push('Không mở được MASTER_TEMPLATE_WATER_V20_PASS.');}
  if(master){
    const required=['GHI_SO_HANG_THANG','DANH_MUC_DONG_HO','NHAN_SU_THUC_HIEN','THONG_TIN_DU_AN'];
    required.forEach(function(n){if(!master.getSheetByName(n))errors.push('MASTER thiếu '+n+'.');});

    const staff=master.getSheetByName('NHAN_SU_THUC_HIEN');
    if(staff&&staff.getRange('A5:H20').getDisplayValues().some(function(r){return r.some(function(v){return String(v||'').trim()!=='';});})){
      errors.push('MASTER không sạch: NHAN_SU_THUC_HIEN có dữ liệu từ dòng 5.');
    }
    const meters=master.getSheetByName('DANH_MUC_DONG_HO');
    if(meters&&meters.getRange('B3:F20').getDisplayValues().some(function(r){return r.some(function(v){return String(v||'').trim()!=='';});})){
      errors.push('MASTER không sạch: DANH_MUC_DONG_HO có dữ liệu.');
    }
    const main=master.getSheetByName('GHI_SO_HANG_THANG');
    if(main&&main.getRange('A2:F20').getDisplayValues().some(function(r){return r.some(function(v){return String(v||'').trim()!=='';});})){
      errors.push('MASTER không sạch: GHI_SO_HANG_THANG có dữ liệu.');
    }
  }
  return {ok:errors.length===0,errors:errors,warnings:warnings,pwaMode:'PROJECT_SPECIFIC_MANIFEST'};
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
  const managers=data.filter(function(x){return v20PackageNormText_(x[5])==='dang lam viec'&&v20PackageNormText_(x[6])==='quan ly';});
  const isolation=v20PackageCheckIsolation_(id,row,reg,ss);
  return {
    ok:isolation.ok&&managers.length>0,
    projectId:id,
    managerCount:managers.length,
    activeStaff:data.filter(function(x){return v20PackageNormText_(x[5])==='dang lam viec';}).length,
    isolation:isolation,
    pwaInstallUrl:V20_PACKAGE.PWA_BASE_URL+'?project='+encodeURIComponent(id),
    appUrl:V20_PACKAGE.APP_BASE_URL+'?project='+encodeURIComponent(id)
  };
}
