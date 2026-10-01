(function(){
  'use strict';

  const BUILD='water-auth-login-v1';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const SESSION_PREFIX='water_auth_v1_';

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
    #waterAuthGate{
      position:fixed;inset:0;z-index:2147483647;
      display:flex;align-items:center;justify-content:center;
      padding:18px;background:#f4f7fb;
      font-family:Arial,sans-serif;color:#172033;
    }
    #waterAuthGate .wa-card{
      width:min(390px,calc(100vw - 28px));
      background:#fff;border:1px solid #dfe5ec;border-radius:16px;
      box-shadow:0 18px 45px rgba(0,0,0,.12);
      padding:22px 20px;
    }
    #waterAuthGate .wa-title{
      font-size:22px;font-weight:800;text-align:center;margin:0 0 6px;
    }
    #waterAuthGate .wa-sub{
      font-size:13px;color:#64748b;text-align:center;margin:0 0 18px;
    }
    #waterAuthGate label{
      display:block;font-size:13px;font-weight:700;margin:12px 0 6px;
    }
    #waterAuthGate select,
    #waterAuthGate input{
      box-sizing:border-box;width:100%;height:46px;
      border:1px solid #cfd8e3;border-radius:9px;
      background:#fff;padding:0 12px;font-size:16px;color:#111827;
      outline:none;
    }
    #waterAuthGate select:focus,
    #waterAuthGate input:focus{
      border-color:#1e5c94;box-shadow:0 0 0 3px rgba(30,92,148,.12);
    }
    #waterAuthGate .wa-pass-wrap{position:relative;}
    #waterAuthGate .wa-pass-wrap input{padding-right:48px;}
    #waterAuthGate .wa-eye{
      position:absolute;right:6px;top:5px;width:36px;height:36px;
      border:0;background:transparent;font-size:19px;cursor:pointer;
    }
    #waterAuthGate .wa-login{
      width:100%;height:47px;margin-top:16px;border:0;border-radius:9px;
      background:#1f5c91;color:#fff;font-size:16px;font-weight:800;
      cursor:pointer;
    }
    #waterAuthGate .wa-login:disabled{opacity:.6;cursor:wait;}
    #waterAuthGate .wa-msg{
      min-height:20px;margin-top:10px;text-align:center;
      font-size:13px;font-weight:700;color:#b42318;
    }
    #waterAuthLogout{
      position:fixed;right:8px;bottom:8px;z-index:999999;
      border:1px solid #d7dde5;border-radius:8px;background:#fff;
      padding:6px 9px;font:700 11px Arial,sans-serif;color:#475569;
      box-shadow:0 2px 8px rgba(0,0,0,.08);cursor:pointer;
    }
  `;
  document.head.appendChild(style);

  function sessionKey(){
    return SESSION_PREFIX+PROJECT_ID;
  }

  function requestId(prefix){
    return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
  }

  function postFrame(api, extra, expectedType, timeoutMs){
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

      const fields=Object.assign({
        api:api,
        project:PROJECT_ID,
        projectId:PROJECT_ID,
        requestId:rid
      },extra||{});

      Object.keys(fields).forEach(function(k){
        const input=document.createElement('input');
        input.type='hidden';
        input.name=k;
        input.value=String(fields[k] == null ? '' : fields[k]);
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

  function readSession(){
    try{
      const raw=localStorage.getItem(sessionKey());
      if(!raw)return null;
      const data=JSON.parse(raw);
      if(!data || !data.sessionToken || !data.staff)return null;
      return data;
    }catch(e){return null;}
  }

  function saveSession(data){
    const item={
      sessionToken:String(data.sessionToken||''),
      expiresAt:Number(data.expiresAt||0),
      staff:data.staff||null
    };
    localStorage.setItem(sessionKey(),JSON.stringify(item));
    if(item.staff&&item.staff.ma){
      localStorage.setItem('water_staff',String(item.staff.ma).trim().toUpperCase());
    }
  }

  function clearSession(){
    try{localStorage.removeItem(sessionKey());}catch(e){}
    try{localStorage.removeItem('water_staff');}catch(e){}
  }

  function enforceIdentity(staff){
    if(!staff||!staff.ma)return;
    const code=String(staff.ma).trim().toUpperCase();
    try{localStorage.setItem('water_staff',code);}catch(e){}
    window.WATER_AUTH_STAFF=staff;

    const apply=function(){
      const sel=document.getElementById('staffSelect');
      if(sel){
        sel.value=code;
      }
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
      if(itemCode!==code){
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },true);
  }

  function addLogout(staff){
    let b=document.getElementById('waterAuthLogout');
    if(b)return;
    b=document.createElement('button');
    b.id='waterAuthLogout';
    b.type='button';
    b.textContent='Đăng xuất · '+String(staff&&staff.ten||'');
    b.addEventListener('click',function(){
      clearSession();
      location.reload();
    });
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

  function createGate(){
    let gate=document.getElementById('waterAuthGate');
    if(gate)return gate;

    gate=document.createElement('div');
    gate.id='waterAuthGate';
    gate.innerHTML=`
      <div class="wa-card">
        <div class="wa-title">ĐĂNG NHẬP</div>
        <div class="wa-sub">Dự án: <b>${PROJECT_ID||'Không xác định'}</b></div>

        <label for="waterAuthStaff">Họ và tên</label>
        <select id="waterAuthStaff">
          <option value="">Đang tải danh sách nhân sự...</option>
        </select>

        <label for="waterAuthPassword">Mật khẩu</label>
        <div class="wa-pass-wrap">
          <input id="waterAuthPassword" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu">
          <button id="waterAuthEye" class="wa-eye" type="button" aria-label="Hiện mật khẩu">👁</button>
        </div>

        <button id="waterAuthLogin" class="wa-login" type="button">ĐĂNG NHẬP</button>
        <div id="waterAuthMsg" class="wa-msg"></div>
      </div>
    `;
    document.body.appendChild(gate);

    const pass=gate.querySelector('#waterAuthPassword');
    const eye=gate.querySelector('#waterAuthEye');
    eye.addEventListener('click',function(){
      pass.type=pass.type==='password'?'text':'password';
    });

    pass.addEventListener('keydown',function(e){
      if(e.key==='Enter')gate.querySelector('#waterAuthLogin').click();
    });

    gate.querySelector('#waterAuthLogin').addEventListener('click',login);
    return gate;
  }

  async function loadStaff(){
    const gate=createGate();
    const select=gate.querySelector('#waterAuthStaff');
    const msg=gate.querySelector('#waterAuthMsg');

    if(!PROJECT_ID){
      select.innerHTML='<option value="">Không có PROJECT_ID</option>';
      msg.textContent='Đường dẫn App thiếu mã dự án.';
      return;
    }

    try{
      const d=await postFrame('authstaff',{},'WATER_AUTH_STAFF_RESULT',12000);
      if(!d.ok)throw new Error(d.error||'Không tải được nhân sự.');
      const rows=Array.isArray(d.staff)?d.staff:[];
      select.innerHTML='<option value="">-- Chọn Họ và tên --</option>';
      rows.forEach(function(x){
        const op=document.createElement('option');
        op.value=String(x.ma||'').trim().toUpperCase();
        op.textContent=String(x.ten||'').trim();
        select.appendChild(op);
      });
      if(!rows.length)msg.textContent='Dự án chưa có nhân sự đang làm việc.';
    }catch(err){
      select.innerHTML='<option value="">Không tải được nhân sự</option>';
      msg.textContent=String(err&&err.message||err);
    }
  }

  async function login(){
    const gate=createGate();
    const select=gate.querySelector('#waterAuthStaff');
    const pass=gate.querySelector('#waterAuthPassword');
    const btn=gate.querySelector('#waterAuthLogin');
    const msg=gate.querySelector('#waterAuthMsg');

    const staff=String(select.value||'').trim().toUpperCase();
    const password=String(pass.value||'');

    if(!staff){
      msg.textContent='Vui lòng chọn Họ và tên.';
      return;
    }
    if(!password){
      msg.textContent='Vui lòng nhập mật khẩu.';
      pass.focus();
      return;
    }

    btn.disabled=true;
    btn.textContent='ĐANG KIỂM TRA...';
    msg.textContent='';

    try{
      const d=await postFrame(
        'login',
        {staff:staff,password:password},
        'WATER_AUTH_LOGIN_RESULT',
        12000
      );

      if(!d.ok){
        msg.textContent=d.error||'Đăng nhập không thành công.';
        pass.value='';
        pass.focus();
        return;
      }

      saveSession(d);
      location.reload();

    }catch(err){
      msg.textContent=String(err&&err.message||err);
    }finally{
      btn.disabled=false;
      btn.textContent='ĐĂNG NHẬP';
    }
  }

  async function validateSavedSession(){
    const current=readSession();
    if(!current)return false;

    try{
      const d=await postFrame(
        'sessioncheck',
        {sessionToken:current.sessionToken},
        'WATER_AUTH_SESSION_RESULT',
        10000
      );

      if(!d.ok){
        clearSession();
        return false;
      }

      saveSession(d);
      unlock(d.staff);
      return true;

    }catch(err){
      return false;
    }
  }

  async function start(){
    createGate();

    if(!PROJECT_ID){
      await loadStaff();
      return;
    }

    const ok=await validateSavedSession();
    if(ok)return;

    await loadStaff();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }

  window.WATER_AUTH_BUILD=BUILD;
})();