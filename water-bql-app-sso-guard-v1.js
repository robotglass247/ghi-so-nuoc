(function(){
  'use strict';

  const BUILD='water-bql-app-sso-guard-v1';
  const p=new URLSearchParams(location.search);
  const PROJECT=String(p.get('project')||p.get('projectId')||'').trim().toUpperCase();
  const FROM_APP=String(p.get('from')||'').toLowerCase()==='app' && String(p.get('embed')||'')==='1';
  const APP_KEY='water_auth_v3_'+PROJECT;
  const BQL_KEY='water_bql_auth_v20_'+PROJECT;

  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function roleAllowed(staff){
    const r=norm(staff&&(staff.quyen||staff.role||staff.phanQuyen||staff.permission));
    return r==='quan ly'||r==='bql'||r==='admin'||r==='quan tri'||r==='administrator';
  }
  function read(key){
    try{
      const d=JSON.parse(sessionStorage.getItem(key)||'null');
      return d&&d.sessionToken&&d.staff?d:null;
    }catch(e){return null;}
  }
  function deny(message){
    try{sessionStorage.removeItem(BQL_KEY);}catch(e){}
    document.documentElement.classList.add('waterAuthPending');
    let g=document.getElementById('waterBqlAuthGate');
    if(!g){g=document.createElement('div');g.id='waterBqlAuthGate';document.body.appendChild(g);}
    g.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f4f7fb;display:flex;align-items:center;justify-content:center;padding:18px;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#172033;';
    g.innerHTML='<div style="width:min(390px,calc(100vw - 28px));background:#fff;border:1px solid #dfe5ec;border-radius:16px;box-shadow:0 18px 45px rgba(0,0,0,.12);padding:24px 20px;text-align:center"><div style="font-size:20px;font-weight:800;margin-bottom:9px">TRANG QUẢN LÝ</div><div style="font-size:14px;line-height:1.5;color:#64748b">'+txt(message||'Tài khoản không có quyền truy cập Trang quản lý.')+'</div></div>';
  }

  // Khi đi từ Ứng dụng Ghi Số: dùng đúng session đang đăng nhập, không yêu cầu nhập lại.
  if(FROM_APP){
    const app=read(APP_KEY);
    if(app&&roleAllowed(app.staff)){
      try{sessionStorage.setItem(BQL_KEY,JSON.stringify(app));}catch(e){}
      const st=document.createElement('style');
      st.id='waterBqlAppSsoPendingStyle';
      st.textContent='#waterBqlAuthGate .c{opacity:0!important;pointer-events:none!important}#waterBqlAuthGate:after{content:"Đang mở Trang quản lý...";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:800 15px Segoe UI,Tahoma,Arial,sans-serif;color:#42576a}';
      document.head.appendChild(st);
    }else{
      document.addEventListener('DOMContentLoaded',function(){deny('Phiên hiện tại không có quyền Quản lý. Vui lòng quay lại Ứng dụng Ghi Số.');},{once:true});
    }
  }

  // Listener đăng ký trước auth R6 để chặn tài khoản Nhân viên kể cả khi mở URL trực tiếp.
  window.addEventListener('WATER_BQL_AUTH_OK',function(ev){
    const staff=ev&&ev.detail&&ev.detail.staff;
    if(!roleAllowed(staff)){
      try{ev.stopImmediatePropagation();}catch(e){}
      deny('Tài khoản '+(txt(staff&&staff.ten)||txt(staff&&staff.ma)||'này')+' không có quyền Quản lý.');
      return;
    }
    const st=document.getElementById('waterBqlAppSsoPendingStyle');
    if(st)st.remove();
  });

  if(FROM_APP){
    setTimeout(function(){
      if(window.WATER_BQL_AUTH_OK)return;
      const app=read(APP_KEY);
      if(!app||!roleAllowed(app.staff))return;
      deny('Không xác thực được phiên Quản lý. Vui lòng quay lại Ứng dụng Ghi Số và mở lại Trang quản lý.');
    },15000);
  }

  window.WATER_BQL_APP_SSO_GUARD_BUILD=BUILD;
})();
