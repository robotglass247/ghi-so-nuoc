(function(){
'use strict';

const BUILD='water-manager-staff-admin-v1';
const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
const qs=new URLSearchParams(location.search);
const PROJECT=String(qs.get('project')||qs.get('projectId')||'').trim().toUpperCase();
let staffRows=[];
let initialized=false;
let loading=false;

function txt(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function byId(id){return document.getElementById(id);}
function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
function isManagerRole(v){return ['quan ly','bql','admin','quan tri','administrator'].indexOf(norm(v))>=0;}
function session(){
  try{
    if(typeof window.WATER_BQL_READ_SESSION==='function')return window.WATER_BQL_READ_SESSION();
    return window.WATER_BQL_SESSION||null;
  }catch(e){return null;}
}
function currentStaff(){
  const s=session();
  return s&&s.staff?s.staff:(window.WATER_BQL_AUTH_STAFF||null);
}
function isManager(){
  const s=session(),st=currentStaff();
  return !!(s&&s.sessionToken&&isManagerRole(st&&(st.quyen||st.role||st.phanQuyen||st.permission)));
}
function rid(){return 'staffadm_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

function postAction(action,extra,timeoutMs){
  return new Promise(function(resolve,reject){
    const s=session();
    if(!s||!s.sessionToken){reject(new Error('Phiên đăng nhập không hợp lệ.'));return;}
    if(!isManager()){reject(new Error('Chỉ tài khoản QUẢN LÝ mới được quản lý nhân sự.'));return;}

    const id=rid();
    const fr=document.createElement('iframe');
    const fm=document.createElement('form');
    fr.name='waterStaffAdminFrame_'+id;
    fr.style.display='none';
    fm.method='POST';
    fm.action=BACKEND;
    fm.target=fr.name;
    fm.style.display='none';

    const fields=Object.assign({
      api:'bqlaction',
      action:action,
      requestId:id,
      project:PROJECT,
      projectId:PROJECT,
      sessionToken:s.sessionToken
    },extra||{});

    Object.keys(fields).forEach(function(k){
      const input=document.createElement('input');
      input.type='hidden';
      input.name=k;
      input.value=String(fields[k]==null?'':fields[k]);
      fm.appendChild(input);
    });

    let done=false;
    const timer=setTimeout(function(){finish(new Error('Hết thời gian chờ Quản lý nhân sự.'));},timeoutMs||20000);
    function clean(){
      window.removeEventListener('message',onMessage);
      try{fm.remove();}catch(e){}
      setTimeout(function(){try{fr.remove();}catch(e){}},50);
    }
    function finish(err,data){
      if(done)return;
      done=true;
      clearTimeout(timer);
      clean();
      if(err)reject(err);else resolve(data);
    }
    function onMessage(ev){
      const d=ev&&ev.data;
      if(!d||d.requestId!==id)return;
      if(d.type!=='WATER_BQL_ACTION_RESULT'&&d.type!=='WATER_BQL_ERROR')return;
      if(d.authRequired){finish(new Error('Phiên đăng nhập đã hết hạn.'));return;}
      if(d.ok===false){finish(new Error(d.error||'Không thực hiện được thao tác nhân sự.'));return;}
      finish(null,d);
    }

    window.addEventListener('message',onMessage);
    document.body.appendChild(fr);
    document.body.appendChild(fm);
    fm.submit();
  });
}

function addStyle(){
  if(byId('waterStaffAdminStyle'))return;
  const s=document.createElement('style');
  s.id='waterStaffAdminStyle';
  s.textContent=`
    .summary.waterStaffAdminReady{grid-template-columns:minmax(0,1.35fr) repeat(3,minmax(0,.95fr))!important}
    .box.staffAdminBox{background:#f7f6ff!important;display:flex;flex-direction:column;min-width:0}
    .staffAdminBox .staffAdminOpen{width:100%;background:#5a57a6!important;border-color:#5a57a6!important;color:#fff!important}
    .staffAdminBox .staffAdminHint{margin-top:4px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .waterStaffModal{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.64);display:none;align-items:center;justify-content:center;padding:14px;font-family:"Segoe UI",Tahoma,Arial,sans-serif}
    .waterStaffModal.show{display:flex}
    .waterStaffPanel{width:min(1220px,98vw);max-height:94vh;display:flex;flex-direction:column;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden}
    .waterStaffHead{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#eef3f8;border-bottom:1px solid #d7e0e8}
    .waterStaffHead h3{margin:0;flex:1;font-size:16px;color:#173d59}
    .waterStaffClose{border:0;background:transparent;font-size:26px;line-height:1;cursor:pointer;color:#405463;padding:0 4px}
    .waterStaffTools{display:flex;gap:7px;padding:9px 12px;border-bottom:1px solid #e1e7ec;align-items:center;flex-wrap:wrap}
    .waterStaffTools button,.waterStaffFormActions button,.waterStaffAct{height:31px;padding:0 10px;border:1px solid #b9cad7;border-radius:6px;background:#fff;color:#234256;font-weight:700;cursor:pointer;font-size:12px}
    .waterStaffTools .primary,.waterStaffFormActions .primary{background:#176f9a;border-color:#176f9a;color:#fff}
    #waterStaffAdminStatus{flex:1;min-width:180px;font-size:12px;color:#607080;text-align:right}
    #waterStaffAdminStatus.ok{color:#157347}#waterStaffAdminStatus.err{color:#b42318}
    .waterStaffEditor{display:none;padding:10px 12px;background:#fbfcfd;border-bottom:1px solid #e1e7ec}
    .waterStaffEditor.show{display:block}
    .waterStaffFormGrid{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:8px}
    .waterStaffField label{display:block;margin:0 0 3px;font-size:11px;font-weight:800;color:#4c6070}
    .waterStaffField input,.waterStaffField select{width:100%;height:32px;border:1px solid #c8d3dc;border-radius:6px;background:#fff;padding:0 8px;font-size:12px;box-sizing:border-box}
    .waterStaffField input[readonly]{background:#f0f3f5;color:#677581}
    .waterStaffFormActions{display:flex;justify-content:flex-end;gap:7px;margin-top:8px}
    .waterStaffTableWrap{overflow:auto;min-height:180px;max-height:62vh}
    .waterStaffTable{border-collapse:collapse;width:100%;min-width:920px;table-layout:fixed}
    .waterStaffTable th,.waterStaffTable td{border-right:1px solid #dce4ea;border-bottom:1px solid #e5ebef;padding:6px 7px;font-size:12px;line-height:1.2;vertical-align:middle;text-align:left}
    .waterStaffTable th{position:sticky;top:0;z-index:2;background:#dcebf5;color:#234256;font-weight:800;text-align:center}
    .waterStaffTable td:nth-child(1),.waterStaffTable td:nth-child(6),.waterStaffTable td:nth-child(7),.waterStaffTable td:nth-child(8){text-align:center}
    .waterStaffTable th:nth-child(1){width:78px}.waterStaffTable th:nth-child(2){width:190px}.waterStaffTable th:nth-child(3){width:125px}.waterStaffTable th:nth-child(4){width:110px}.waterStaffTable th:nth-child(5){width:220px}.waterStaffTable th:nth-child(6){width:120px}.waterStaffTable th:nth-child(7){width:110px}.waterStaffTable th:nth-child(8){width:160px}
    .waterStaffAct{height:27px;padding:0 7px;margin:1px 2px;font-size:11px}
    .waterStaffAct.reset{color:#7c4b00;border-color:#dfc28a;background:#fffaf0}
    .waterStaffEmpty{padding:28px;text-align:center;color:#667784;font-size:13px}
    @media(max-width:1100px){.summary.waterStaffAdminReady{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:760px){
      .summary.waterStaffAdminReady{grid-template-columns:1fr!important}
      .waterStaffPanel{width:100%;max-height:96vh}.waterStaffFormGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
      #waterStaffAdminStatus{width:100%;text-align:left}.waterStaffTableWrap{max-height:58vh}
    }
  `;
  document.head.appendChild(s);
}

function setStatus(message,kind){
  const e=byId('waterStaffAdminStatus');
  if(!e)return;
  e.textContent=message||'';
  e.className=kind||'';
}

function createTopBox(){
  const summary=document.querySelector('.summary');
  if(!summary||byId('waterStaffAdminBox'))return;
  summary.classList.add('waterStaffAdminReady');
  const box=document.createElement('section');
  box.className='box staffAdminBox';
  box.id='waterStaffAdminBox';
  box.innerHTML='<h3>QUẢN LÝ NHÂN SỰ</h3><button class="btn primary staffAdminOpen" id="waterStaffAdminOpen" type="button">MỞ QUẢN LÝ</button><div class="status staffAdminHint">Thêm • Sửa • Phân quyền • Đặt lại mật khẩu</div>';
  summary.appendChild(box);
  byId('waterStaffAdminOpen').addEventListener('click',openModal);
}

function createModal(){
  if(byId('waterStaffAdminModal'))return;
  const modal=document.createElement('div');
  modal.id='waterStaffAdminModal';
  modal.className='waterStaffModal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.innerHTML=`
    <div class="waterStaffPanel">
      <div class="waterStaffHead"><h3>QUẢN LÝ NHÂN SỰ</h3><button class="waterStaffClose" id="waterStaffAdminClose" type="button" aria-label="Đóng">×</button></div>
      <div class="waterStaffTools">
        <button class="primary" id="waterStaffAdd" type="button">+ THÊM NHÂN SỰ</button>
        <button id="waterStaffReload" type="button">LÀM MỚI</button>
        <div id="waterStaffAdminStatus">Chưa tải dữ liệu.</div>
      </div>
      <div class="waterStaffEditor" id="waterStaffEditor">
        <div class="waterStaffFormGrid">
          <div class="waterStaffField"><label>Mã nhân sự</label><input id="waterStaffCode" readonly placeholder="Tự động"></div>
          <div class="waterStaffField"><label>Họ và tên *</label><input id="waterStaffName" maxlength="100"></div>
          <div class="waterStaffField"><label>Chức vụ</label><input id="waterStaffPosition" maxlength="80"></div>
          <div class="waterStaffField"><label>Ca làm việc</label><input id="waterStaffShift" maxlength="50"></div>
          <div class="waterStaffField"><label>Email</label><input id="waterStaffEmail" type="email" maxlength="120"></div>
          <div class="waterStaffField"><label>Tình trạng</label><select id="waterStaffStatus"><option>Đang làm việc</option><option>Tạm nghỉ</option><option>Nghỉ việc</option></select></div>
          <div class="waterStaffField"><label>Phân quyền</label><select id="waterStaffRole"><option>NHÂN VIÊN</option><option>QUẢN LÝ</option></select></div>
          <div class="waterStaffField" id="waterStaffPasswordField"><label>Mật khẩu tạm *</label><input id="waterStaffPassword" type="password" maxlength="64" autocomplete="new-password" placeholder="Từ 4 ký tự"></div>
        </div>
        <div class="waterStaffFormActions"><button id="waterStaffCancel" type="button">HỦY</button><button class="primary" id="waterStaffSave" type="button">LƯU</button></div>
      </div>
      <div class="waterStaffTableWrap"><table class="waterStaffTable"><thead><tr><th>Mã NS</th><th>Họ và tên</th><th>Chức vụ</th><th>Ca làm việc</th><th>Email</th><th>Tình trạng</th><th>Phân quyền</th><th>Thao tác</th></tr></thead><tbody id="waterStaffBody"></tbody></table><div class="waterStaffEmpty" id="waterStaffEmpty" hidden>Chưa có nhân sự.</div></div>
    </div>`;
  document.body.appendChild(modal);

  byId('waterStaffAdminClose').addEventListener('click',closeModal);
  byId('waterStaffAdd').addEventListener('click',function(){showEditor(null);});
  byId('waterStaffReload').addEventListener('click',loadStaff);
  byId('waterStaffCancel').addEventListener('click',hideEditor);
  byId('waterStaffSave').addEventListener('click',saveEditor);
  modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal.classList.contains('show'))closeModal();});
}

function openModal(){
  createModal();
  byId('waterStaffAdminModal').classList.add('show');
  loadStaff();
}
function closeModal(){
  const m=byId('waterStaffAdminModal');
  if(m)m.classList.remove('show');
  hideEditor();
}
function hideEditor(){
  const e=byId('waterStaffEditor');
  if(e)e.classList.remove('show');
}
function showEditor(row){
  const isNew=!row;
  byId('waterStaffCode').value=isNew?'':txt(row.code);
  byId('waterStaffName').value=isNew?'':txt(row.name);
  byId('waterStaffPosition').value=isNew?'':txt(row.position);
  byId('waterStaffShift').value=isNew?'':txt(row.shift);
  byId('waterStaffEmail').value=isNew?'':txt(row.email);
  byId('waterStaffStatus').value=isNew?'Đang làm việc':(txt(row.status)||'Đang làm việc');
  byId('waterStaffRole').value=isNew?'NHÂN VIÊN':(txt(row.role)||'NHÂN VIÊN');
  byId('waterStaffPassword').value='';
  byId('waterStaffPasswordField').style.display=isNew?'block':'none';
  byId('waterStaffEditor').dataset.mode=isNew?'new':'edit';
  byId('waterStaffEditor').classList.add('show');
  byId('waterStaffName').focus();
}

function renderStaff(){
  const body=byId('waterStaffBody'),empty=byId('waterStaffEmpty');
  if(!body)return;
  body.innerHTML='';
  staffRows.forEach(function(r){
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+esc(r.code)+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.position)+'</td><td>'+esc(r.shift)+'</td><td>'+esc(r.email)+'</td><td>'+esc(r.status)+'</td><td><b>'+esc(r.role)+'</b></td><td><button class="waterStaffAct" data-act="edit" type="button">Sửa</button><button class="waterStaffAct reset" data-act="reset" type="button">Đặt lại MK</button></td>';
    tr.querySelector('[data-act="edit"]').addEventListener('click',function(){showEditor(r);});
    tr.querySelector('[data-act="reset"]').addEventListener('click',function(){resetPassword(r);});
    body.appendChild(tr);
  });
  if(empty)empty.hidden=staffRows.length>0;
}

async function loadStaff(){
  if(loading)return;
  loading=true;
  setStatus('Đang tải danh sách nhân sự...');
  try{
    const d=await postAction('stafflist',{},18000);
    staffRows=Array.isArray(d.staff)?d.staff:[];
    renderStaff();
    setStatus('Đã tải '+staffRows.length+' nhân sự.','ok');
  }catch(err){
    setStatus(txt(err&&err.message)||'Không tải được nhân sự.','err');
  }finally{loading=false;}
}

async function saveEditor(){
  const mode=byId('waterStaffEditor').dataset.mode||'new';
  const code=txt(byId('waterStaffCode').value).toUpperCase();
  const name=txt(byId('waterStaffName').value);
  const position=txt(byId('waterStaffPosition').value);
  const shift=txt(byId('waterStaffShift').value);
  const email=txt(byId('waterStaffEmail').value);
  const status=txt(byId('waterStaffStatus').value);
  const role=txt(byId('waterStaffRole').value);
  const initialPassword=String(byId('waterStaffPassword').value||'');
  if(!name){alert('Vui lòng nhập Họ và tên.');byId('waterStaffName').focus();return;}
  if(mode==='new'&&initialPassword.length<4){alert('Mật khẩu tạm phải từ 4 ký tự.');byId('waterStaffPassword').focus();return;}
  const btn=byId('waterStaffSave');btn.disabled=true;
  setStatus('Đang lưu nhân sự...');
  try{
    const d=await postAction('staffsave',{staffCode:code,name:name,position:position,shift:shift,email:email,status:status,role:role,initialPassword:mode==='new'?initialPassword:''},20000);
    hideEditor();
    setStatus(d.message||'Đã lưu nhân sự.','ok');
    await loadStaff();
  }catch(err){setStatus(txt(err&&err.message)||'Không lưu được nhân sự.','err');}
  finally{btn.disabled=false;}
}

async function resetPassword(row){
  const p=window.prompt('Nhập mật khẩu mới cho '+txt(row.name)+' (từ 4 đến 64 ký tự):','');
  if(p===null)return;
  if(String(p).length<4||String(p).length>64){alert('Mật khẩu mới phải từ 4 đến 64 ký tự.');return;}
  if(!window.confirm('Xác nhận đặt lại mật khẩu cho '+txt(row.name)+'?'))return;
  setStatus('Đang đặt lại mật khẩu cho '+txt(row.name)+'...');
  try{
    const d=await postAction('staffresetpassword',{staffCode:txt(row.code),newPassword:String(p)},20000);
    setStatus(d.message||'Đã đặt lại mật khẩu.','ok');
  }catch(err){setStatus(txt(err&&err.message)||'Không đặt lại được mật khẩu.','err');}
}

function init(){
  if(initialized)return;
  if(!isManager())return;
  const summary=document.querySelector('.summary');
  if(!summary)return;
  initialized=true;
  addStyle();
  createTopBox();
  createModal();
  window.WATER_MANAGER_STAFF_ADMIN_BUILD=BUILD;
}

function schedule(){[0,100,250,500,900,1500,2500].forEach(function(ms){setTimeout(init,ms);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.addEventListener('WATER_BQL_AUTH_OK',schedule);
window.addEventListener('pageshow',schedule);
})();