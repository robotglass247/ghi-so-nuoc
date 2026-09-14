/* ============================================================
MODULE_ID: 03
MODULE_NAME: manage-core
VERSION: 1.0.0
STATUS: PASS-CANDIDATE / DO NOT MIX UI FEATURES
DEPENDENCIES: none
RESPONSIBILITY: shared constants + data helpers only
============================================================ */
(function(){
  'use strict';

  const CFG=Object.freeze({
    SHEET_ID:'1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY',
    DATA_SHEET:'TAI_CHI_SO_THANG',
    DATA_RANGE:'A3:J40000',
    MONTH_CACHE:'water_export_months_tai_chi_so_v1',
    MANAGER_SHEET_URL:'https://docs.google.com/spreadsheets/d/1YUYPIs7YtvM3rXGtI3FoTww_TW9DWDTlItY6tFHv5iw/edit#gid=1754101056&range=A2',
    SYSTEM_SHEET_URL:'https://docs.google.com/spreadsheets/d/1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY/edit#gid=1884007052',
    STAFF_SHEET:'NHAN_SU_THUC_HIEN',
    STAFF_RANGE:'A4:F30'
  });

  function el(id){ return document.getElementById(id); }
  function txt(v){ return String(v==null?'':v).trim(); }
  function cell(row,i){
    const c=row&&row.c&&row.c[i];
    return c ? (c.f!=null ? c.f : c.v) : '';
  }
  function periodScore(v){
    const m=txt(v).match(/^(\d{1,2})\/(\d{4})$/);
    return m ? Number(m[2])*12 + Number(m[1]) : 0;
  }
  function safeName(v){
    return txt(v).replace(/[^0-9A-Za-zÀ-ỹ_-]+/g,'_').replace(/^_+|_+$/g,'');
  }
  function norm(v){
    return txt(v)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d')
      .replace(/Đ/g,'D')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterTaiChiSo_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc TAI_CHI_SO_THANG.'));},20000);
      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
        try{ delete window[cb]; }catch(e){ window[cb]=undefined; }
        if(script.parentNode)script.parentNode.removeChild(script);
        err ? reject(err) : resolve(data);
      }
      window[cb]=function(data){finish(null,data);};
      script.onerror=function(){finish(new Error('Không đọc được dữ liệu tháng.'));};
      script.src='https://docs.google.com/spreadsheets/d/'
        +encodeURIComponent(CFG.SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(CFG.DATA_SHEET)
        +'&range='+encodeURIComponent(CFG.DATA_RANGE)
        +'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent(query)
        +'&_='+Date.now();
      document.head.appendChild(script);
    });
  }

  window.WATER_MANAGE_CORE=Object.freeze({
    BUILD:'manage-core-v1.0.0', CFG, el, txt, cell, periodScore, safeName, norm, jsonp
  });
})();
