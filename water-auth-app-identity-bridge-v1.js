(function(){
  'use strict';

  const BUILD='water-auth-app-identity-bridge-v4-no-observer';
  const BACKEND='https://script.google.com/macros/s/AKfycbyGukOADD3lJlR8amVhF3Slw-TLkAJmK77h5zv96wq3M1Z3yRGHIrRQnmS0SyjhGVoGcg/exec';
  const PROJECT_ID=String(
    new URLSearchParams(location.search).get('project') ||
    new URLSearchParams(location.search).get('projectId') ||
    window.WATER_PROJECT_ID ||
    ''
  ).trim().toUpperCase();

  let lockedStaff=null;

  function installStaffLockStyle(){
    if(document.getElementById('waterAuthStaffLockStyle'))return;
    const style=document.createElement('style');
    style.id='waterAuthStaffLockStyle';
    style.textContent=`
      #staffModal{display:none!important;}
      button[onclick*="openStaff"]{display:none!important;}
      html.waterAuthStaffLocked #staffModal{display:none!important;}
      html.waterAuthStaffLocked button[onclick*="openStaff"]{display:none!important;}
    `;
    document.head.appendChild(style);
  }

  installStaffLockStyle();

  function sessionKey(){
    return 'water_auth_v3_'+PROJECT_ID;
  }

  function clearIdentity(){
    try{localStorage.removeItem('water_staff');}catch(e){}
    try{sessionStorage.removeItem('water_staff');}catch(e){}
    window.WATER_AUTH_STAFF=null;
    lockedStaff=null;
  }

  function setIdentity(staff){
    const code=String(staff&&staff.ma||'').trim().toUpperCase();
    if(!code)return;
    lockedStaff=staff;
    try{localStorage.setItem('water_staff',code);}catch(e){}
    try{sessionStorage.setItem('water_staff',code);}catch(e){}
    window.WATER_AUTH_STAFF=staff;
  }

  function saveSession(data){
    const item={
      sessionToken:String(data&&data.sessionToken||''),
      expiresAt:Number(data&&data.expiresAt||0),
      staff:data&&data.staff||null
    };
    try{sessionStorage.setItem(sessionKey(),JSON.stringify(item));}catch(e){}
    if(item.staff)setIdentity(item.staff);
  }

  function clearSession(){
    try{sessionStorage.removeItem(sessionKey());}catch(e){}
    clearIdentity();
    document.documentElement.classList.remove('waterAuthStaffLocked');
  }

  function requestId(){
    return 'appauth_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
  }

  function postLogin(staff,password){
    return new Promise(function(resolve,reject){
      const rid=requestId();
      const frame=document.createElement('iframe');
      frame.name='waterAppAuthFrame_'+rid;
      frame.style.display='none';

      const form=document.createElement('form');
      form.method='POST';
      form.action=BACKEND;
      form.target=frame.name;
      form.style.display='none';

      const fields={
        api:'login',
        project:PROJECT_ID,
        projectId:PROJECT_ID,
        requestId:rid,
        staff:staff,
        password:password
      };

      Object.keys(fields).forEach(function(k){
        const input=document.createElement('input');
        input.type='hidden';
        input.name=k;
        input.value=String(fields[k]==null?'':fields[k]);
        form.appendChild(input);
      });

      let done=false;
      const cleanup=function(){
        window.removeEventListener('message',onMessage);
        try{form.remove();}catch(e){}
        setTimeout(function(){try{frame.remove();}catch(e){}},50);
      };

      const onMessage=function(ev){
        const d=ev&&ev.data;
        if(!d || d.requestId!==rid)return;
        if(d.type!=='WATER_AUTH_LOGIN_RESULT' && d.type!=='WATER_AUTH_ERROR')return;
        if(done)return;
        done=true;
        cleanup();
        resolve(d);
      };

      window.addEventListener('message',onMessage);
      document.body.appendChild(frame);
      document.body.appendChild(form);

      setTimeout(function(){
        if(done)return;
        done=true;
        cleanup();
        reject(new Error('Không nhận được phản hồi đăng nhập.'));
      },12000);

      form.submit();
    });
  }

  function lockedOpenStaff(){
    if(lockedStaff)lockLegacyStaffPicker(lockedStaff);
    return false;
  }

  function lockLegacyStaffPicker(staff){
    const code=String(staff&&staff.ma||'').trim().toUpperCase();
    const name=String(staff&&staff.ten||'').trim();
    if(!code)return;

    setIdentity(staff);
    document.documentElement.classList.add('waterAuthStaffLocked');

    const sel=document.getElementById('staffSelect');
    if(sel)sel.value=code;

    const modal=document.getElementById('staffModal');
    if(modal){
      modal.style.setProperty('display','none','important');
      modal.setAttribute('aria-hidden','true');
    }

    document.querySelectorAll('button[onclick*="openStaff"]').forEach(function(btn){
      btn.style.setProperty('display','none','important');
      btn.setAttribute('aria-hidden','true');
      btn.tabIndex=-1;
    });

    const label=document.getElementById('staffName');
    if(label)label.textContent=name||code;

    try{
      if(typeof window.openStaff==='function' && window.openStaff!==lockedOpenStaff && !window.WATER_AUTH_ORIGINAL_OPEN_STAFF){
        window.WATER_AUTH_ORIGINAL_OPEN_STAFF=window.openStaff;
      }
      window.openStaff=lockedOpenStaff;
      try{openStaff=lockedOpenStaff;}catch(e){}
    }catch(e){}
  }

  function settleIdentity(staff){
    [0,80,250,600,1200,2500,5000].forEach(function(ms){
      setTimeout(function(){
        if(window.WATER_AUTH_OK)lockLegacyStaffPicker(staff);
      },ms);
    });
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

  function openApp(staff){
    setIdentity(staff);

    const gate=document.getElementById('waterAuthGate');
    if(gate)gate.remove();

    document.documentElement.classList.remove('waterAuthPending');
    window.WATER_AUTH_OK=true;

    lockLegacyStaffPicker(staff);
    settleIdentity(staff);
    addLogout(staff);

    window.dispatchEvent(
      new CustomEvent('WATER_AUTH_OK',{
        detail:{staff:staff,projectId:PROJECT_ID}
      })
    );
  }

  async function directLogin(){
    const gate=document.getElementById('waterAuthGate');
    if(!gate)return;

    const card=gate.querySelector('.wa-card');
    if(!card)return;

    const back=card.querySelector('#waterAuthBackLogin');
    if(back){
      back.click();
      return;
    }

    const select=card.querySelector('#waterAuthStaff');
    const pass=card.querySelector('#waterAuthPassword');
    const msg=card.querySelector('#waterAuthMsg');
    const tab=card.querySelector('.wa-tab-login');

    const staff=String(select&&select.value||'').trim().toUpperCase();
    const password=String(pass&&pass.value||'');

    if(!staff){
      if(msg)msg.textContent='Dự án chưa có nhân sự để đăng nhập.';
      return;
    }

    if(!password){
      if(msg)msg.textContent='Vui lòng nhập mật khẩu.';
      if(pass)pass.focus();
      return;
    }

    if(tab){
      tab.disabled=true;
      tab.textContent='ĐANG KIỂM TRA...';
    }
    if(msg){
      msg.classList.remove('ok');
      msg.textContent='';
    }

    try{
      const d=await postLogin(staff,password);
      if(!d.ok){
        if(msg)msg.textContent=d.error||'Đăng nhập không thành công.';
        if(pass){pass.value='';pass.focus();}
        return;
      }

      saveSession(d);
      openApp(d.staff);
    }catch(err){
      if(msg)msg.textContent=String(err&&err.message||err);
    }finally{
      const liveTab=document.querySelector('#waterAuthGate .wa-tab-login');
      if(liveTab){
        liveTab.disabled=false;
        liveTab.textContent='ĐĂNG NHẬP';
      }
    }
  }

  // Không giữ mã nhân sự cũ trước khi Auth xác thực.
  clearIdentity();

  // Đăng nhập trực tiếp từ tab ĐĂNG NHẬP của giao diện Auth.
  document.addEventListener('click',function(ev){
    const tab=ev&&ev.target&&ev.target.closest?ev.target.closest('.wa-tab-login'):null;
    if(!tab)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    directLogin();
  },true);

  document.addEventListener('keydown',function(ev){
    if(!ev || ev.key!=='Enter')return;
    const target=ev.target;
    if(!target || target.id!=='waterAuthPassword')return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    directLogin();
  },true);

  // F5 trong cùng tab: Auth V3 sessioncheck phát WATER_AUTH_OK.
  window.addEventListener('WATER_AUTH_OK',function(ev){
    const detail=ev&&ev.detail;
    if(detail&&detail.staff){
      lockLegacyStaffPicker(detail.staff);
      settleIdentity(detail.staff);
    }
  });

  document.addEventListener('click',function(ev){
    const node=ev&&ev.target&&ev.target.closest?ev.target.closest('#waterAuthLogout'):null;
    if(node)clearSession();
  },true);

  window.WATER_AUTH_IDENTITY_BRIDGE_BUILD=BUILD;
})();
