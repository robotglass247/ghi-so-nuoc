(function(){
'use strict';
const BUILD='water-auth-bql-v20-r2-stable-backend';
const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
const OLD_BQL_BACKEND='https://script.google.com/macros/s/AKfycbynFiXNX8wfYunObyMQ2Jp3PbOGhhaqBUfbZuHoNSazmnTiE_kNplRcUXTkOaqqTkxk/exec';
const P=new URLSearchParams(location.search);
const PROJECT=String(P.get('project')||P.get('projectId')||'').trim().toUpperCase();
const KEY='water_bql_auth_v20_'+PROJECT;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* R3 cũ còn hard-code backend thử nghiệm trong postApi().
 * Chỉ trên trang BQL, đổi form POST đó về backend V20 ổn định.
 * Không tác động Ứng dụng kỹ thuật vì file này chỉ được nạp ở Trang BQL. */
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
style.textContent=`html.waterAuthPending body>*:not(#waterBqlAuthGate){visibility:hidden!important}#waterBqlAuthGate{position:fixed;inset:0;z-index:2147483647;background:#f4f7fb;display:flex;align-items:center;justify-content:center;padding:18px;font-family:Arial,sans-serif;color:#172033}#waterBqlAuthGate .c{width:min(390px,calc(100vw - 28px));background:#fff;border:1px solid #dfe5ec;border-radius:16px;box-shadow:0 18px 45px rgba(0,0,0,.12);padding:22px 20px}#waterBqlAuthGate h2{text-align:center;margin:0 0 6px}#waterBqlAuthGate .sub{text-align:center;color:#64748b;font-size:13px;margin-bottom:16px}#waterBqlAuthGate label{display:block;font-size:13px;font-weight:700;margin:11px 0 6px}#waterBqlAuthGate select,#waterBqlAuthGate input{width:100%;height:46px;border:1px solid #cfd8e3;border-radius:9px;background:#fff;padding:0 12px;font-size:16px}#waterBqlAuthGate button.main{width:100%;height:47px;margin-top:16px;border:0;border-radius:9px;background:#0f5f8f;color:#fff;font-weight:800;font-size:16px}#waterBqlAuthGate .msg{min-height:20px;margin-top:10px;text-align:center;font-size:13px;font-weight:700;color:#b42318}#waterBqlLogout{position:fixed;right:8px;bottom:8px;z-index:999999;border:1px solid #d7dde5;border-radius:8px;background:#fff;padding:7px 10px;font:700 11px Arial;color:#475569;cursor:pointer}`;
document.head.appendChild(style);

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
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.WATER_BQL_AUTH_BUILD=BUILD;window.WATER_BQL_BACKEND=BACKEND;window.WATER_BQL_READ_SESSION=read;
})();
