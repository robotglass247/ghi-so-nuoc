/**
 * M&E WATER V20 - STAFF ADMIN
 * Chỉ được gọi từ bqlaction sau khi đã qua waterBqlRequireManagerV20_.
 * Không trả hash/mật khẩu về trình duyệt.
 */

const WATER_STAFF_ADMIN_V20 = Object.freeze({
  SHEET:'NHAN_SU_THUC_HIEN',
  AUDIT_SHEET:'NHAT_KY_QUAN_LY_NHAN_SU'
});

function waterBqlStaffActionV20_(p,g,requestId,action){
  const a=String(action||'').trim().toLowerCase();
  if(a==='stafflist')return waterStaffAdminListV20_(g,requestId);
  if(a==='staffsave')return waterStaffAdminSaveV20_(p,g,requestId);
  if(a==='staffresetpassword')return waterStaffAdminResetPasswordV20_(p,g,requestId);
  throw new Error('Thao tác Quản lý nhân sự không hợp lệ.');
}

function waterStaffAdminSheetV20_(ss){
  const sh=ss.getSheetByName(WATER_STAFF_ADMIN_V20.SHEET);
  if(!sh)throw new Error('Dự án thiếu sheet NHAN_SU_THUC_HIEN.');
  return sh;
}

function waterStaffAdminListV20_(g,requestId){
  const ss=waterOpenProject_(g.projectId),sh=waterStaffAdminSheetV20_(ss),last=sh.getLastRow();
  const out=[];
  if(last>=5){
    const data=sh.getRange(5,1,last-4,8).getDisplayValues();
    data.forEach(function(r){
      const code=waterBqlTextV20_(r[0]).toUpperCase();
      const name=waterBqlTextV20_(r[1]);
      if(!code&&!name)return;
      out.push({
        code:code,
        name:name,
        position:waterBqlTextV20_(r[2]),
        shift:waterBqlTextV20_(r[3]),
        email:waterBqlTextV20_(r[4]),
        status:waterBqlTextV20_(r[5]),
        role:waterBqlTextV20_(r[6]),
        hasPassword:!!waterBqlTextV20_(r[7])
      });
    });
  }
  out.sort(function(a,b){return String(a.code).localeCompare(String(b.code),'vi',{numeric:true,sensitivity:'base'});});
  return {type:'WATER_BQL_ACTION_RESULT',requestId:requestId,ok:true,action:'stafflist',projectId:g.projectId,staff:out};
}

function waterStaffAdminSaveV20_(p,g,requestId){
  const code=waterBqlTextV20_(p&&p.staffCode).toUpperCase();
  const name=waterStaffAdminCleanV20_(p&&p.name,100);
  const position=waterStaffAdminCleanV20_(p&&p.position,80);
  const shift=waterStaffAdminCleanV20_(p&&p.shift,50);
  const email=waterStaffAdminCleanV20_(p&&p.email,120);
  const status=waterStaffAdminStatusV20_(p&&p.status);
  const role=waterStaffAdminRoleV20_(p&&p.role);
  const initialPassword=String(p&&p.initialPassword!=null?p.initialPassword:'');

  if(!name)throw new Error('Họ và tên không được để trống.');
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Email không hợp lệ.');
  if(!status)throw new Error('Tình trạng nhân sự không hợp lệ.');
  if(!role)throw new Error('Phân quyền không hợp lệ.');

  const lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('Hệ thống đang xử lý. Vui lòng thử lại.');
  try{
    const ss=waterOpenProject_(g.projectId),sh=waterStaffAdminSheetV20_(ss);
    let row=code?waterStaffAdminFindRowV20_(sh,code):0;
    const isNew=!row;
    let staffCode=code;
    let before=null;

    if(code&&!row)throw new Error('Không tìm thấy nhân sự '+code+'.');

    if(isNew){
      if(initialPassword.length<4||initialPassword.length>64)throw new Error('Mật khẩu tạm phải từ 4 đến 64 ký tự.');
      if(typeof waterAuthPasswordHashV20_!=='function')throw new Error('Backend thiếu hàm mã hóa mật khẩu V20.');
      staffCode=waterStaffAdminNextCodeV20_(ss,sh);
      row=Math.max(5,sh.getLastRow()+1);
      const hash=waterAuthPasswordHashV20_(g.projectId,staffCode,initialPassword);
      sh.getRange(row,1,1,8).setValues([[staffCode,name,position,shift,email,status,role,hash]]);
    }else{
      const old=sh.getRange(row,1,1,8).getDisplayValues()[0];
      before={code:old[0],name:old[1],position:old[2],shift:old[3],email:old[4],status:old[5],role:old[6]};
      const self=String(g.staffCode||'').trim().toUpperCase()===staffCode;
      if(self&&waterBqlNormV20_(status)!=='dang lam viec')throw new Error('Không thể tự chuyển tài khoản đang đăng nhập sang trạng thái không hoạt động.');
      if(self&&!['quan ly','bql','admin','quan tri','administrator'].includes(waterBqlNormV20_(role)))throw new Error('Không thể tự hạ quyền tài khoản QUẢN LÝ đang đăng nhập.');
      sh.getRange(row,2,1,6).setValues([[name,position,shift,email,status,role]]);
    }

    SpreadsheetApp.flush();
    const after={code:staffCode,name:name,position:position,shift:shift,email:email,status:status,role:role};
    waterStaffAdminAuditV20_(ss,g,isNew?'THÊM NHÂN SỰ':'CẬP NHẬT NHÂN SỰ',staffCode,name,before,after);
    return {type:'WATER_BQL_ACTION_RESULT',requestId:requestId,ok:true,action:'staffsave',projectId:g.projectId,staff:after,message:isNew?'Đã thêm '+name+'.':'Đã cập nhật '+name+'.'};
  }finally{lock.releaseLock();}
}

function waterStaffAdminResetPasswordV20_(p,g,requestId){
  const code=waterBqlTextV20_(p&&p.staffCode).toUpperCase();
  const newPassword=String(p&&p.newPassword!=null?p.newPassword:'');
  if(!code)throw new Error('Thiếu Mã nhân sự.');
  if(newPassword.length<4||newPassword.length>64)throw new Error('Mật khẩu mới phải từ 4 đến 64 ký tự.');
  if(typeof waterAuthPasswordHashV20_!=='function')throw new Error('Backend thiếu hàm mã hóa mật khẩu V20.');

  const lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('Hệ thống đang xử lý. Vui lòng thử lại.');
  try{
    const ss=waterOpenProject_(g.projectId),sh=waterStaffAdminSheetV20_(ss),row=waterStaffAdminFindRowV20_(sh,code);
    if(!row)throw new Error('Không tìm thấy nhân sự '+code+'.');
    const name=waterBqlTextV20_(sh.getRange(row,2).getDisplayValue());
    const hash=waterAuthPasswordHashV20_(g.projectId,code,newPassword);
    sh.getRange(row,8).setValue(hash);
    SpreadsheetApp.flush();
    waterStaffAdminAuditV20_(ss,g,'ĐẶT LẠI MẬT KHẨU',code,name,null,{code:code,name:name,passwordReset:true});
    return {type:'WATER_BQL_ACTION_RESULT',requestId:requestId,ok:true,action:'staffresetpassword',projectId:g.projectId,staffCode:code,message:'Đã đặt lại mật khẩu cho '+name+'.'};
  }finally{lock.releaseLock();}
}

function waterStaffAdminFindRowV20_(sh,code){
  const c=String(code||'').trim().toUpperCase(),last=sh.getLastRow();
  if(!c||last<5)return 0;
  const vals=sh.getRange(5,1,last-4,1).getDisplayValues();
  for(let i=0;i<vals.length;i++)if(String(vals[i][0]||'').trim().toUpperCase()===c)return i+5;
  return 0;
}

function waterStaffAdminNextCodeV20_(ss,sh){
  if(typeof waterStaffReadSequenceV20_==='function'&&typeof waterStaffFormatCodeV20_==='function'){
    let seq=Number(waterStaffReadSequenceV20_(ss,sh)||0)+1;
    const code=waterStaffFormatCodeV20_(seq);
    if(typeof waterStaffSaveSequenceV20_==='function')waterStaffSaveSequenceV20_(ss,seq);
    return code;
  }
  let max=0,last=sh.getLastRow();
  if(last>=5){
    sh.getRange(5,1,last-4,1).getDisplayValues().forEach(function(r){const m=String(r[0]||'').trim().toUpperCase().match(/^NS(\d+)$/);if(m)max=Math.max(max,Number(m[1]||0));});
  }
  return 'NS'+String(max+1).padStart(3,'0');
}

function waterStaffAdminCleanV20_(v,max){
  return String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max||120);
}
function waterStaffAdminStatusV20_(v){
  const n=waterBqlNormV20_(v);
  if(n==='dang lam viec')return 'Đang làm việc';
  if(n==='tam nghi')return 'Tạm nghỉ';
  if(n==='nghi viec')return 'Nghỉ việc';
  return '';
}
function waterStaffAdminRoleV20_(v){
  const n=waterBqlNormV20_(v);
  if(['quan ly','bql','admin','quan tri','administrator'].indexOf(n)>=0)return 'QUẢN LÝ';
  if(['nhan vien','ktv','ky thuat vien','ca truong'].indexOf(n)>=0)return 'NHÂN VIÊN';
  return '';
}

function waterStaffAdminAuditV20_(ss,g,action,code,name,before,after){
  let sh=ss.getSheetByName(WATER_STAFF_ADMIN_V20.AUDIT_SHEET);
  if(!sh){
    sh=ss.insertSheet(WATER_STAFF_ADMIN_V20.AUDIT_SHEET);
    sh.getRange(1,1,1,7).setValues([['Thời gian','Người thao tác','Hành động','Mã nhân sự','Họ và tên','Trước','Sau']]);
    sh.setFrozenRows(1);
  }
  const actor=waterBqlActorV20_(g);
  sh.appendRow([new Date(),actor,action,code,name,before?JSON.stringify(before):'',after?JSON.stringify(after):'']);
}
