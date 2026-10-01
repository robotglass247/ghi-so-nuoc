(function(){
  'use strict';

  const BUILD='water-auth-login-v3-change-password-tab-session';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const SESSION_PREFIX='water_auth_v3_';
  const STAFF_CACHE_PREFIX='water_auth_staff_v3_';
  const STAFF_CACHE_MS=30*60*1000;

  const params=new URLSearchParams(location.search);
  const PROJECT_ID=String(
    params.get('project') ||
    params.get('projectId') ||
    window.WATER_PROJECT_ID ||
    ''
  ).trim().toUpperCase();

  document.documentElement.classList.add('waterAuthPending');

  const style=document.createElement('style');
  style.id='waterAuthStyle';
  style.textContent=`
    html.waterAuthPending body>*:not(#waterAuthGate){visibility:hidden!important;}
    #waterAuthGate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;}
    #waterAuthGate .wa-card{width:min(390px,calc(100vw - 28px));background:#fff;border:1px solid #dfe5ec;border-radius:16px;box-shadow:0 18px 45px rgba(0,0,0,.12);padding:22px 20px;}
    #waterAuthGate .wa-title{font-size:22px;font-weight:800;text-align:center;margin:0 0 6px;}
    #waterAuthGate .wa-sub{font-size:13px;color:#64748b;text-align:center;margin:0 0 18px;}
    #waterAuthGate label{display:block;font-size:13px;font-weight:700;margin:12px 0 6px;}
    #waterAuthGate select,#waterAuthGate input{box-sizing:border-box;width:100%;height:46px;border:1px solid #cfd8e3;border-radius:9px;background:#fff;padding:0 12px;font-size:16px;color:#111827;outline:none;}
    #waterAuthGate select:focus,#waterAuthGate input:focus{border-color:#1e5c94;box-shadow:0 0 0 3px rgba(30,92,148,.12);}
    #waterAuthGate .wa-pass-wrap{position:relative;}
    #waterAuthGate .wa-pass-wrap input{padding-right:48px;}
    #waterAuthGate .wa-eye{position:absolute;right:6px;top:5px;width:36px;height:36px;border:0;background:transparent;font-size:19px;cursor:pointer;}
    #waterAuthGate .wa-main{width:100%;height:47px;margin-top:16px;border:0;border-radius:9px;background:#1f5c91;color:#fff;font-size:16px;font-weight:800;cursor:pointer;}
    #waterAuthGate .wa-main:disabled{opacity:.6;cursor:wait;}
    #waterAuthGate .wa-link{display:block;width:100%;margin-top:10px;border:0;background:transparent;color:#1f5c91;font-size:14px;font-weight:700;cursor:pointer;text-decoration:underline;}
    #waterAuthGate .wa-msg{min-height:20px;margin-top:10px;text-align:center;font-size:13px;font-weight:700;color:#b42318;}
    #waterAuthGate .wa-msg.ok{color:#087a3e;}
    #waterAuthLogout{position:fixed;right:8px;bottom:8px;z-index:999999;border:1px solid #d7dde5;border-radius:8px;background:#fff;padding:6px 9px;font:700 11px Arial,sans-serif;color:#475569;box-shadow:0 2px 8px rgba(0,0,0,.08);cursor:pointer;}
  `;
  document.head.appendChild(style);

  function sessionKey(){return SESSION_PREFIX+PROJECT_ID;}
  function staffCacheKey(){return STAFF_CACHE_PREFIX+PROJECT_ID;}
  function requestId(prefix){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);}

  function postFrame(api,extra,expectedType,timeoutMs){
    return new Promise(function(resolve,reject){
      const rid=requestId('auth');
      const frame=document.createElement('iframe');
      frame.name='waterAuthFrame_'+rid;
      frame.style.display='none';

      const form=document.createElement('form');
      form.method='POST';
      form.action=BACKEND;
      form.target=frame.name;
      form.style.display='none';

      const fields=Object.assign({api:api,project:PROJECT_ID,projectId:PROJECT_ID,requestId:rid},extra||{});
      Object.keys(fields).forEach(function(k){
        const input=document.createElement('input');
        input.type='hidden';
        input.name=k;
        input.value=String(fields[k]==null?'':fields[k]);
        form.appendChild(input);
      });

      let done=false;
      const clean=function(){
        window.removeEventListener('message',onMessage);
        try{form.remove();}catch(e){}
        setTimeout(function(){try{frame.remove();}catch(e){}},50);
      };
      const onMessage=function(ev){
        const d=ev&&ev.data;
        if(!d || d.requestId!==rid)return;
        if(expectedType && d.type!==expectedType && d.type!=='WATER_AUTH_ERROR')return;
        if(done)return;
        done=true;
        clean();
        resolve(d);
      };

      window.addEventListener('message',onMessage);
      document.body.appendChild(frame);
      document.body.appendChild(form);
      setTimeout(function(){
        if(done)return;
        done=true;
        clean();
        reject(new Error('Không nhận được phản hồi đăng nhập.'));
      },timeoutMs||12000);
      form.submit();
    });
  }

  function normalizeStaff(rows){
    const out=[];
    const seen=new Set();
    (Array.isArray(rows)?rows:[]).forEach(function(x){
      const ma=String(x&&x.ma||'').trim().toUpperCase();
      const ten=String(x&&x.ten||'').trim();
      if(!ma||!ten||seen.has(ma))return;
      seen.add(ma);
      out.push({ma:ma,ten:ten});
    });
    out.sort(function(a,b){return a.ten.localeCompare(b.ten,'vi',{sensitivity:'base'});});
    return out;
  }

  function readStaffCache(){
    try{
      const raw=localStorage.getItem(staffCacheKey());
      if(!raw)return [];
      const obj=JSON.parse(raw);
      if(!obj || !Array.isArray(obj.rows))return [];
      if(Date.now()-Number(obj.savedAt||0)>STAFF_CACHE_MS)return [];
      return normalizeStaff(obj.rows);
    }catch(e){return [];}
  }

  function saveStaffCache(rows){
    try{localStorage.setItem(staffCacheKey(),JSON.stringify({savedAt:Date.now(),rows:normalizeStaff(rows)}));}catch(e){}
  }

  function readSession(){
    try{
      const raw=sessionStorage.getItem(sessionKey());
      if(!raw)return null;
      const data=JSON.parse(raw);
      if(!data || !data.sessionToken || !data.staff)return null;
      return data;
    }catch(e){return null;}
  }

  function saveSession(data){
    const item={sessionToken:String(data.sessionToken||''),expiresAt:Number(data.expiresAt||0),staff:data.staff||null};
    sessionStorage.setItem(sessionKey(),JSON.stringify(item));
    if(item.staff&&item.staff.ma){sessionStorage.setItem('water_staff',String(item.staff.ma).trim().toUpperCase());}
  }

  function clearSession(){
    try{sessionStorage.removeItem(sessionKey());}catch(e){}
    try{sessionStorage.removeItem('water_staff');}catch(e){}
  }

  function enforceIdentity(staff){
    if(!staff||!staff.ma)return;
    const code=String(staff.ma).trim().toUpperCase();
    try{sessionStorage.setItem('water_staff',code);}catch(e){}
    window.WATER_AUTH_STAFF=staff;

    const apply=function(){
      const sel=document.getElementById('staffSelect');
      if(sel)sel.value=code;
      document.querySelectorAll('.staffCompactItem').forEach(function(node){
        const same=String(node.dataset.ma||'').trim().toUpperCase()===code;
        node.style.display=same?'flex':'none';
        if(same){
          node.classList.add('isSelected');
          node.setAttribute('aria-selected','true');
          const c=node.querySelector('.staffCompactCheck');
          if(c)c.textContent='✓';
        }
      });
    };

    apply();
    if(window.MutationObserver){
      const ob=new MutationObserver(apply);
      ob.observe(document.body,{childList:true,subtree:true});
      window.WATER_AUTH_IDENTITY_OBSERVER=ob;
    }

    document.addEventListener('click',function(ev){
      const item=ev.target&&ev.target.closest?ev.target.closest('.staffCompactItem'):null;
      if(!item)return;
      const itemCode=String(item.dataset.ma||'').trim().toUpperCase();
      if(itemCode!==code){ev.preventDefault();ev.stopImmediatePropagation();}
    },true);
  }

  function addLogout(staff){
    let b=document.getElementById('waterAuthLogout');
    if(b)return;
    b=document.createElement('button');
    b.id='waterAuthLogout';
    b.type='button';
    b.textContent='Đăng xuất · '+String(staff&&staff.ten||'');
    b.addEventListener('click',function(){clearSession();location.reload();});
    document.body.appendChild(b);
  }

  function unlock(staff){
    enforceIdentity(staff);
    const gate=document.getElementById('waterAuthGate');
    if(gate)gate.remove();
    document.documentElement.classList.remove('waterAuthPending');
    addLogout(staff);
    window.WATER_AUTH_OK=true;
    window.dispatchEvent(new CustomEvent('WATER_AUTH_OK',{detail:{staff:staff,projectId:PROJECT_ID}}));
  }

  function passwordField(id,label,placeholder){
    return `<label for="${id}">${label}</label><div class="wa-pass-wrap"><input id="${id}" type="password" autocomplete="current-password" placeholder="${placeholder}"><button class="wa-eye" type="button" data-for="${id}" aria-label="Hiện mật khẩu">👁</button></div>`;
  }

  function createGate(){
    let gate=document.getElementById('waterAuthGate');
    if(gate)return gate;
    gate=document.createElement('div');
    gate.id='waterAuthGate';
    gate.innerHTML='<div class="wa-card"></div>';
    document.body.appendChild(gate);
    renderLoginMode();
    return gate;
  }

  function bindEyes(root){
    root.querySelectorAll('.wa-eye').forEach(function(btn){
      btn.addEventListener('click',function(){
        const input=root.querySelector('#'+btn.dataset.for);
        if(input)input.type=input.type==='password'?'text':'password';
      });
    });
  }

  function renderLoginMode(){
    const gate=document.getElementById('waterAuthGate');
    if(!gate)return;
    const card=gate.querySelector('.wa-card');
    card.innerHTML=`
      <div class="wa-title">ĐĂNG NHẬP</div>
      <div class="wa-sub">Dự án: <b>${PROJECT_ID||'Không xác định'}</b></div>
      <label for="waterAuthStaff">Họ và tên</label>
      <select id="waterAuthStaff"><option value="">Đang tải danh sách nhân sự...</option></select>
      ${passwordField('waterAuthPassword','Mật khẩu','Nhập mật khẩu')}
      <button id="waterAuthLogin" class="wa-main" type="button">ĐĂNG NHẬP</button>
      <button id="waterAuthChangeMode" class="wa-link" type="button">Đổi mật khẩu</button>
      <div id="waterAuthMsg" class="wa-msg"></div>`;
    bindEyes(card);
    card.querySelector('#waterAuthLogin').addEventListener('click',login);
    card.querySelector('#waterAuthChangeMode').addEventListener('click',renderChangeMode);
    card.querySelector('#waterAuthPassword').addEventListener('keydown',function(e){if(e.key==='Enter')login();});
    renderStaff(readStaffCache(),false);
    if(!readStaffCache().length)refreshStaffFromBackend();
  }

  function renderChangeMode(){
    const gate=document.getElementById('waterAuthGate');
    if(!gate)return;
    const card=gate.querySelector('.wa-card');
    card.innerHTML=`
      <div class="wa-title">ĐỔI MẬT KHẨU</div>
      <div class="wa-sub">Dự án: <b>${PROJECT_ID||'Không xác định'}</b></div>
      <label for="waterAuthStaff">Họ và tên</label>
      <select id="waterAuthStaff"></select>
      ${passwordField('waterAuthCurrentPassword','Mật khẩu hiện tại','Nhập mật khẩu hiện tại')}
      ${passwordField('waterAuthNewPassword','Mật khẩu mới','Từ 4 đến 64 ký tự')}
      ${passwordField('waterAuthConfirmPassword','Nhập lại mật khẩu mới','Nhập lại mật khẩu mới')}
      <button id="waterAuthSavePassword" class="wa-main" type="button">LƯU MẬT KHẨU MỚI</button>
      <button id="waterAuthBackLogin" class="wa-link" type="button">Quay lại đăng nhập</button>
      <div id="waterAuthMsg" class="wa-msg"></div>`;
    bindEyes(card);
    renderStaff(readStaffCache(),false);
    if(!readStaffCache().length)refreshStaffFromBackend();
    card.querySelector('#waterAuthSavePassword').addEventListener('click',changePassword);
    card.querySelector('#waterAuthBackLogin').addEventListener('click',renderLoginMode);
  }

  function renderStaff(rows,keepSelected){
    const gate=document.getElementById('waterAuthGate') || createGate();
    const select=gate.querySelector('#waterAuthStaff');
    if(!select)return [];
    const old=keepSelected?String(select.value||'').trim().toUpperCase():'';
    const list=normalizeStaff(rows);
    select.innerHTML='';
    list.forEach(function(x){
      const op=document.createElement('option');
      op.value=x.ma;
      op.textContent=x.ten;
      select.appendChild(op);
    });
    if(old && list.some(function(x){return x.ma===old;}))select.value=old;
    else if(list.length)select.selectedIndex=0;
    if(!list.length){
      const op=document.createElement('option');
      op.value='';
      op.textContent='Không có nhân sự';
      select.appendChild(op);
    }
    return list;
  }

  async function refreshStaffFromBackend(){
    const gate=document.getElementById('waterAuthGate') || createGate();
    const msg=gate.querySelector('#waterAuthMsg');
    try{
      const d=await postFrame('authstaff',{},'WATER_AUTH_STAFF_RESULT',12000);
      if(!d.ok)throw new Error(d.error||'Không tải được nhân sự.');
      const rows=renderStaff(d.staff,true);
      saveStaffCache(rows);
      if(msg){msg.classList.remove('ok');msg.textContent=rows.length?'':'Dự án chưa có nhân sự đang làm việc.';}
      return rows;
    }catch(err){
      if(!readStaffCache().length){
        renderStaff([],false);
        if(msg){msg.classList.remove('ok');msg.textContent=String(err&&err.message||err);}
      }
      return [];
    }
  }

  async function login(){
    const gate=document.getElementById('waterAuthGate') || createGate();
    const select=gate.querySelector('#waterAuthStaff');
    const pass=gate.querySelector('#waterAuthPassword');
    const btn=gate.querySelector('#waterAuthLogin');
    const msg=gate.querySelector('#waterAuthMsg');
    const staff=String(select&&select.value||'').trim().toUpperCase();
    const password=String(pass&&pass.value||'');

    if(!staff){msg.textContent='Dự án chưa có nhân sự để đăng nhập.';return;}
    if(!password){msg.textContent='Vui lòng nhập mật khẩu.';pass.focus();return;}

    btn.disabled=true;
    btn.textContent='ĐANG KIỂM TRA...';
    msg.classList.remove('ok');
    msg.textContent='';
    try{
      const d=await postFrame('login',{staff:staff,password:password},'WATER_AUTH_LOGIN_RESULT',12000);
      if(!d.ok){msg.textContent=d.error||'Đăng nhập không thành công.';pass.value='';pass.focus();return;}
      saveSession(d);
      location.reload();
    }catch(err){msg.textContent=String(err&&err.message||err);}
    finally{btn.disabled=false;btn.textContent='ĐĂNG NHẬP';}
  }

  async function changePassword(){
    const gate=document.getElementById('waterAuthGate') || createGate();
    const select=gate.querySelector('#waterAuthStaff');
    const current=gate.querySelector('#waterAuthCurrentPassword');
    const next=gate.querySelector('#waterAuthNewPassword');
    const confirm=gate.querySelector('#waterAuthConfirmPassword');
    const btn=gate.querySelector('#waterAuthSavePassword');
    const msg=gate.querySelector('#waterAuthMsg');

    const staff=String(select&&select.value||'').trim().toUpperCase();
    const currentPassword=String(current&&current.value||'');
    const newPassword=String(next&&next.value||'');
    const confirmPassword=String(confirm&&confirm.value||'');

    msg.classList.remove('ok');
    if(!staff){msg.textContent='Dự án chưa có nhân sự.';return;}
    if(!currentPassword){msg.textContent='Vui lòng nhập mật khẩu hiện tại.';current.focus();return;}
    if(newPassword.length<4 || newPassword.length>64){msg.textContent='Mật khẩu mới phải từ 4 đến 64 ký tự.';next.focus();return;}
    if(newPassword!==confirmPassword){msg.textContent='Hai lần nhập mật khẩu mới chưa khớp.';confirm.focus();return;}

    btn.disabled=true;
    btn.textContent='ĐANG LƯU...';
    msg.textContent='';
    try{
      const d=await postFrame('changepassword',{staff:staff,currentPassword:currentPassword,newPassword:newPassword},'WATER_AUTH_CHANGE_PASSWORD_RESULT',12000);
      if(!d.ok){msg.textContent=d.error||'Không đổi được mật khẩu.';current.value='';current.focus();return;}
      clearSession();
      renderLoginMode();
      const loginMsg=document.getElementById('waterAuthMsg');
      if(loginMsg){loginMsg.classList.add('ok');loginMsg.textContent='Đổi mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.';}
    }catch(err){msg.textContent=String(err&&err.message||err);}
    finally{btn.disabled=false;btn.textContent='LƯU MẬT KHẨU MỚI';}
  }

  async function validateSavedSession(){
    const current=readSession();
    if(!current)return false;
    try{
      const d=await postFrame('sessioncheck',{sessionToken:current.sessionToken},'WATER_AUTH_SESSION_RESULT',10000);
      if(!d.ok){clearSession();return false;}
      saveSession(d);
      unlock(d.staff);
      return true;
    }catch(err){return false;}
  }

  async function start(){
    createGate();
    if(!PROJECT_ID){return;}

    const cached=readStaffCache();
    if(cached.length)renderStaff(cached,false);
    refreshStaffFromBackend();

    const current=readSession();
    if(current){
      const ok=await validateSavedSession();
      if(ok)return;
    }
  }

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d || d.type!=='WATER_UI_STATE' || !Array.isArray(d.staff))return;
    const rows=normalizeStaff(d.staff);
    if(rows.length){saveStaffCache(rows);renderStaff(rows,true);}
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.WATER_AUTH_BUILD=BUILD;
})();
