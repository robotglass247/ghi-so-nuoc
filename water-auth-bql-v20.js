(function(){
'use strict';
const BUILD='water-auth-bql-v20-r5-manager-layout';
const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
const OLD_BQL_BACKEND='https://script.google.com/macros/s/AKfycbynFiXNX8wfYunObyMQ2Jp3PbOGhhaqBUfbZuHoNSazmnTiE_kNplRcUXTkOaqqTkxk/exec';
const P=new URLSearchParams(location.search);
const PROJECT=String(P.get('project')||P.get('projectId')||'').trim().toUpperCase();
const KEY='water_bql_auth_v20_'+PROJECT;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Chỉ trên Trang BQL: đổi mọi POST backend thử nghiệm về backend V20 ổn định. */
try{
  const nativeSubmit=HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit=function(){
    try{
      const a=String(this&&this.action||'');
      if(a.indexOf(OLD_BQL_BACKEND)===0)this.action=BACKEND;
    }catch(e){}
    return nativeSubmit.call(this);
  };
}catch(e){}

document.documentElement.classList.add('waterAuthPending');
const style=document.createElement('style');
style.textContent=`html.waterAuthPending body>*:not(#waterBqlAuthGate){visibility:hidden!important}#waterBqlAuthGate{position:fixed;inset:0;z-index:2147483647;background:#f4f7fb;display:flex;align-items:center;justify-content:center;padding:18px;font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#172033}#waterBqlAuthGate .c{width:min(390px,calc(100vw - 28px));background:#fff;border:1px solid #dfe5ec;border-radius:16px;box-shadow:0 18px 45px rgba(0,0,0,.12);padding:22px 20px}#waterBqlAuthGate h2{text-align:center;margin:0 0 6px;font-weight:700}#waterBqlAuthGate .sub{text-align:center;color:#64748b;font-size:13px;margin-bottom:16px;font-weight:400}#waterBqlAuthGate label{display:block;font-size:13px;font-weight:600;margin:11px 0 6px}#waterBqlAuthGate select,#waterBqlAuthGate input{width:100%;height:46px;border:1px solid #cfd8e3;border-radius:9px;background:#fff;padding:0 12px;font-size:16px;font-family:"Segoe UI",Tahoma,Arial,sans-serif;font-weight:400}#waterBqlAuthGate button.main{width:100%;height:47px;margin-top:16px;border:0;border-radius:9px;background:#0f5f8f;color:#fff;font-weight:600;font-size:16px;font-family:"Segoe UI",Tahoma,Arial,sans-serif}#waterBqlAuthGate .msg{min-height:20px;margin-top:10px;text-align:center;font-size:13px;font-weight:600;color:#b42318}#waterBqlLogout{position:fixed;right:18px;bottom:14px;z-index:999999;border:1px solid #d7dde5;border-radius:8px;background:#fff;padding:8px 12px;font:500 12px "Segoe UI",Tahoma,Arial,sans-serif;color:#475569;cursor:pointer}`;
document.head.appendChild(style);

/* BQL R5 - bố cục theo mẫu A: Header -> 3 khối -> Kiểm tra & Đối chiếu. */
const managerStyle=document.createElement('style');
managerStyle.textContent=`
html,body,button,input,select,textarea{font-family:"Segoe UI",Tahoma,Arial,sans-serif!important}
body{background:#f5f7f9!important;color:#172033!important;font-weight:400}
.top{position:static!important;background:transparent!important;border:0!important;padding:12px 18px 0!important}
.topin{max-width:none!important;width:100%!important;margin:0!important;min-height:68px!important;padding:12px 22px!important;background:#fff!important;border:1px solid #2d3640!important;border-radius:12px!important;box-shadow:0 1px 1px rgba(0,0,0,.03)!important}
.brand b{font-size:20px!important;font-weight:700!important;letter-spacing:0!important}
.brand small{font-size:12px!important;font-weight:400!important;margin-top:3px!important;color:#607080!important}
.badge{font-size:13px!important;font-weight:700!important;background:#eaf5fb!important;color:#0f5f8f!important;border-radius:999px!important;padding:8px 13px!important}
.wrap{max-width:none!important;width:100%!important;margin:0!important;padding:20px 22px 28px!important}
.tabs{display:none!important}
#overview,#progress,#issues,#report,#review{display:none!important}
#bqlLayoutV5{display:block!important}
.bqlSummaryGrid{display:grid;grid-template-columns:1.05fr 1.05fr 1.05fr;gap:56px;align-items:stretch;max-width:1120px;margin:0 0 18px 10px}
.bqlSummaryBox{background:#fff;border:1px solid #303840;border-radius:0;min-height:178px;padding:12px 18px}
.bqlSummaryBox h3{font-size:16px;font-weight:500;margin:0 0 22px;text-align:center;color:#111}
.bqlSummaryList{display:grid;grid-template-columns:1fr auto;column-gap:14px;row-gap:7px;font-size:14px;line-height:1.15}
.bqlSummaryList .label{color:#111}
.bqlSummaryList .value{font-weight:600;color:#172033;text-align:right;min-width:30px}
.bqlReportActions{display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.bqlPeriodBox{display:flex;flex-direction:column;gap:10px;align-items:stretch}
.bqlPeriodBox label{font-size:12px;font-weight:600;color:#5a6772}
.bqlPeriodBox select{height:40px;border:1px solid #c8d2da;border-radius:7px;background:#fff;padding:0 10px;font-size:13px;font-weight:400}
.bqlDetailBox{background:#fff;border:1px solid #2d3640;border-radius:0;padding:10px 14px 14px;margin:0 0 0 0;width:100%}
.bqlDetailBox .box{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
.bqlDetailBox .box h3{font-size:14px!important;font-weight:700!important;margin:0 0 10px!important;color:#364958!important}
.bqlDetailBox .filters{grid-template-columns:repeat(6,minmax(110px,1fr))!important;gap:8px!important}
.bqlDetailBox .f label{font-size:10px!important;font-weight:600!important;margin-bottom:4px!important;color:#647481!important}
.bqlDetailBox .f select,.bqlDetailBox .f input{height:34px!important;font-size:11px!important;font-weight:400!important;padding:0 8px!important;border-radius:6px!important}
.bqlDetailBox .actions{gap:7px!important;margin:10px 0!important}
.bqlDetailBox .btn{min-height:34px!important;padding:7px 12px!important;font-size:11px!important;font-weight:600!important;border-radius:6px!important}
.bqlDetailBox .status{font-size:11px!important;font-weight:500!important;padding:6px 0!important}
.bqlDetailBox .tableWrap{max-height:calc(100vh - 430px)!important;min-height:250px!important;border-radius:4px!important;border:1px solid #e2e8ee!important}
.bqlDetailBox table{width:100%!important;min-width:1150px!important}
.bqlDetailBox th,.bqlDetailBox td{padding:7px 8px!important;font-size:10.5px!important}
.bqlDetailBox th{font-weight:600!important;background:#f8ead8!important}
.bqlDetailBox td{font-weight:400!important}
.bqlDetailBox td.noteCell{max-width:230px!important}
.bqlDetailBox .pill,.bqlDetailBox .imgBtn{font-size:9.5px!important;font-weight:600!important}
.bqlDetailBox .note{display:none!important}
#bqlCsvBtnWrap .btn{min-height:36px!important;padding:8px 13px!important;font-size:12px!important;font-weight:600!important}
#bqlReportStatus,#bqlPeriodStatus{font-size:11px;color:#647481;line-height:1.35}
@media(max-width:1050px){
  .bqlSummaryGrid{gap:16px;max-width:none;margin-left:0}
}
@media(max-width:760px){
  .top{padding:7px 7px 0!important}.topin{padding:10px 12px!important;min-height:60px!important;border-radius:9px!important}.brand b{font-size:16px!important}.brand small{font-size:11px!important}.badge{font-size:11px!important;padding:6px 8px!important}
  .wrap{padding:10px 7px 18px!important}.bqlSummaryGrid{grid-template-columns:1fr;gap:9px;margin:0 0 10px}.bqlSummaryBox{min-height:auto;border-color:#d5dde4;padding:12px 14px;border-radius:8px}.bqlSummaryBox h3{text-align:left;font-size:14px;font-weight:700;margin-bottom:12px}.bqlDetailBox{border-color:#d5dde4;border-radius:8px;padding:10px}.bqlDetailBox .filters{grid-template-columns:repeat(2,1fr)!important}.bqlDetailBox .tableWrap{max-height:58vh!important;min-height:300px!important}#waterBqlLogout{right:8px!important;bottom:8px!important}
}
`;
document.head.appendChild(managerStyle);

function buildManagerLayout(){
  if(document.getElementById('bqlLayoutV5'))return;
  const wrap=document.querySelector('.wrap');
  const overview=document.getElementById('overview');
  const review=document.getElementById('review');
  const report=document.getElementById('report');
  if(!wrap||!overview||!review||!report)return;

  const layout=document.createElement('div');layout.id='bqlLayoutV5';
  const grid=document.createElement('div');grid.className='bqlSummaryGrid';

  const totalBox=document.createElement('section');totalBox.className='bqlSummaryBox';
  totalBox.innerHTML='<h3>TỔNG QUAN</h3><div class="bqlSummaryList">'+
    '<div class="label">Tổng đồng hồ:</div><div class="value" id="bqlSumTotal">0</div>'+
    '<div class="label">Đã chụp:</div><div class="value" id="bqlSumDone">0</div>'+
    '<div class="label">Chưa chụp:</div><div class="value" id="bqlSumNotShot">0</div>'+
    '<div class="label">Đang chờ:</div><div class="value" id="bqlSumWaiting">0</div>'+
    '<div class="label">Cần xử lý:</div><div class="value" id="bqlSumIssues">0</div>'+
    '</div>';

  const reportBox=document.createElement('section');reportBox.className='bqlSummaryBox';
  reportBox.innerHTML='<h3>BÁO CÁO</h3><div class="bqlReportActions" id="bqlCsvBtnWrap"></div><div id="bqlReportStatus"></div>';

  const periodBox=document.createElement('section');periodBox.className='bqlSummaryBox';
  periodBox.innerHTML='<h3>KỲ GHI SỐ</h3><div class="bqlPeriodBox"><label>Chọn kỳ</label><div id="bqlPeriodSelectWrap"></div><div id="bqlPeriodStatus"></div></div>';

  grid.append(totalBox,reportBox,periodBox);

  const detail=document.createElement('section');detail.className='bqlDetailBox';
  const reviewBox=review.querySelector('.box');
  if(reviewBox)detail.appendChild(reviewBox);

  layout.append(grid,detail);wrap.prepend(layout);

  const mainMonth=document.getElementById('mainMonth');
  const mainStatus=document.getElementById('mainStatus');
  if(mainMonth)document.getElementById('bqlPeriodSelectWrap').appendChild(mainMonth);
  if(mainStatus)document.getElementById('bqlPeriodStatus').appendChild(mainStatus);

  const csvBtn=document.getElementById('csvBtn');
  const reportStatus=document.getElementById('reportStatus');
  if(csvBtn)document.getElementById('bqlCsvBtnWrap').appendChild(csvBtn);
  if(reportStatus)document.getElementById('bqlReportStatus').appendChild(reportStatus);

  function num(id){const e=document.getElementById(id),n=Number(String(e&&e.textContent||'0').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
  function sync(){
    const total=num('cTotal'),done=num('cDone'),checked=num('cChecked'),issues=num('cIssues');
    const notShot=Math.max(0,total-done);
    const waiting=Math.max(0,done-checked-issues);
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
    set('bqlSumTotal',total);set('bqlSumDone',done);set('bqlSumNotShot',notShot);set('bqlSumWaiting',waiting);set('bqlSumIssues',issues);
  }
  ['cTotal','cDone','cChecked','cIssues'].forEach(id=>{const e=document.getElementById(id);if(e)new MutationObserver(sync).observe(e,{childList:true,subtree:true,characterData:true})});
  sync();
}

function rid(){return 'bqlauth_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10)}
function post(api,extra,type,timeout){return new Promise((resolve,reject)=>{const id=rid(),fr=document.createElement('iframe'),fm=document.createElement('form');fr.name='bqlauthFrame_'+id;fr.style.display='none';fm.method='POST';fm.action=BACKEND;fm.target=fr.name;fm.style.display='none';const fields=Object.assign({api,project:PROJECT,projectId:PROJECT,requestId:id},extra||{});Object.keys(fields).forEach(k=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);fm.appendChild(i)});let done=false;const timer=setTimeout(()=>finish(new Error('Không nhận được phản hồi đăng nhập.')),timeout||15000);function clean(){window.removeEventListener('message',onmsg);try{fm.remove()}catch(e){}setTimeout(()=>{try{fr.remove()}catch(e){}},50)}function finish(err,data){if(done)return;done=true;clearTimeout(timer);clean();err?reject(err):resolve(data)}function onmsg(ev){const d=ev&&ev.data;if(!d||d.requestId!==id)return;if(type&&d.type!==type&&d.type!=='WATER_AUTH_ERROR')return;finish(null,d)}window.addEventListener('message',onmsg);document.body.appendChild(fr);document.body.appendChild(fm);fm.submit()})}
function read(){try{const x=JSON.parse(sessionStorage.getItem(KEY)||'null');return x&&x.sessionToken&&x.staff?x:null}catch(e){return null}}
function save(d){const x={sessionToken:String(d.sessionToken||''),expiresAt:Number(d.expiresAt||0),staff:d.staff||null};sessionStorage.setItem(KEY,JSON.stringify(x));window.WATER_BQL_SESSION=x;return x}
function clear(){try{sessionStorage.removeItem(KEY)}catch(e){}window.WATER_BQL_SESSION=null}
function normalize(rows){const seen=new Set(),a=[];(Array.isArray(rows)?rows:[]).forEach(x=>{const ma=String(x&&x.ma||'').trim().toUpperCase(),ten=String(x&&x.ten||'').trim();if(!ma||!ten||seen.has(ma))return;seen.add(ma);a.push({ma,ten})});return a.sort((a,b)=>a.ten.localeCompare(b.ten,'vi',{sensitivity:'base'}))}
function gate(){let g=$('waterBqlAuthGate');if(g)return g;g=document.createElement('div');g.id='waterBqlAuthGate';g.innerHTML='<div class="c"><h2>ĐĂNG NHẬP QUẢN LÝ</h2><div class="sub">Dự án: <b>'+esc(PROJECT||'Không xác định')+'</b></div><label>Họ và tên</label><select id="waterBqlStaff"><option>Đang tải...</option></select><label>Mật khẩu</label><input id="waterBqlPass" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu"><button class="main" id="waterBqlLogin">ĐĂNG NHẬP</button><div class="msg" id="waterBqlMsg"></div></div>';document.body.appendChild(g);$('waterBqlLogin').onclick=login;$('waterBqlPass').onkeydown=e=>{if(e.key==='Enter')login()};return g}
function renderStaff(rows){const s=$('waterBqlStaff'),a=normalize(rows);if(!s)return;s.innerHTML='';if(!a.length){s.innerHTML='<option value="">Không có nhân sự</option>';return}a.forEach(x=>{const o=document.createElement('option');o.value=x.ma;o.textContent=x.ma+' - '+x.ten;s.appendChild(o)})}
async function loadStaff(){try{const d=await post('authstaff',{},'WATER_AUTH_STAFF_RESULT');if(!d||!d.ok)throw new Error(d&&d.error||'Không tải được nhân sự.');renderStaff(d.staff)}catch(e){renderStaff([]);$('waterBqlMsg').textContent=e.message||String(e)}}
async function login(){const ma=String($('waterBqlStaff').value||'').trim().toUpperCase(),pw=String($('waterBqlPass').value||''),m=$('waterBqlMsg'),b=$('waterBqlLogin');if(!ma){m.textContent='Chưa có nhân sự để đăng nhập.';return}if(!pw){m.textContent='Vui lòng nhập mật khẩu.';return}b.disabled=true;m.textContent='Đang kiểm tra...';try{const d=await post('login',{staff:ma,password:pw},'WATER_AUTH_LOGIN_RESULT');if(!d||!d.ok){m.textContent=d&&d.error||'Đăng nhập không thành công.';return}save(d);location.reload()}catch(e){m.textContent=e.message||String(e)}finally{b.disabled=false}}
function logoutButton(staff){let b=$('waterBqlLogout');if(b)return;b=document.createElement('button');b.id='waterBqlLogout';b.textContent='Đăng xuất · '+String(staff&&staff.ten||'');b.onclick=()=>{clear();location.reload()};document.body.appendChild(b)}
function unlock(staff){const g=$('waterBqlAuthGate');if(g)g.remove();document.documentElement.classList.remove('waterAuthPending');logoutButton(staff);window.WATER_BQL_AUTH_OK=true;window.WATER_BQL_AUTH_STAFF=staff;window.dispatchEvent(new CustomEvent('WATER_BQL_AUTH_OK',{detail:{staff,projectId:PROJECT}}))}
async function validate(){const x=read();if(!x)return false;try{const d=await post('sessioncheck',{sessionToken:x.sessionToken},'WATER_AUTH_SESSION_RESULT',12000);if(!d||!d.ok){clear();return false}save(d);unlock(d.staff);return true}catch(e){return false}}
async function start(){gate();if(!PROJECT){$('waterBqlMsg').textContent='Thiếu PROJECT_ID.';return}loadStaff();if(await validate())return}
function init(){buildManagerLayout();start()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.WATER_BQL_AUTH_BUILD=BUILD;window.WATER_BQL_BACKEND=BACKEND;window.WATER_BQL_READ_SESSION=read;
})();
