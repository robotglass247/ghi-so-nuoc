(function(){
  'use strict';

  const BUILD='879-r9.8-project-sheet-note';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const SHEET_NAME='THONG_TIN_DU_AN';
  const CACHE_KEY='water_project_info_sheet_v2';
  const NOTE_CACHE_KEY='water_project_note_v1';
  let directRaw='';
  let directNote='';
  let loading=false;
  let loaded=false;

  function txt(v){return String(v==null?'':v).trim();}
  function cell(row,i){
    const c=row&&row.c&&row.c[i];
    if(!c)return '';
    return txt(c.f!=null?c.f:c.v);
  }

  function jsonp(sheet,query){
    return new Promise(function(resolve,reject){
      const cb='__waterGviz_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc Google Sheets.'));},12000);
      function finish(err,data){
        if(done)return;done=true;clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(script.parentNode)script.parentNode.removeChild(script);
        err?reject(err):resolve(data);
      }
      window[cb]=function(data){finish(null,data);};
      script.onerror=function(){finish(new Error('Không đọc được Google Sheets.'));};
      script.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)+'&tq='+encodeURIComponent(query)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }

  function parseRow(row){
    const p={
      code:cell(row,0),
      name:cell(row,1),
      address:cell(row,2),
      unit:cell(row,3),
      owner:cell(row,4),
      status:cell(row,5),
      start:cell(row,6),
      end:cell(row,7),
      duration:cell(row,8),
      note:cell(row,9)
    };
    const parts=[];
    if(p.name)parts.push('Dự án: '+p.name);
    if(p.code)parts.push('Mã dự án: '+p.code);
    if(p.address)parts.push('Địa chỉ: '+p.address);
    if(p.unit)parts.push('Đơn vị QLVH: '+p.unit);
    if(p.owner)parts.push('Người phụ trách: '+p.owner);
    if(p.status)parts.push('Trạng thái: '+p.status);
    if(p.start)parts.push('Ngày bắt đầu: '+p.start);
    if(p.end)parts.push('Ngày kết thúc: '+p.end);
    if(p.duration)parts.push('Hạn ghi: '+p.duration+' ngày');
    return {raw:parts.join(' · '),note:p.note};
  }

  function publish(raw,note){
    raw=txt(raw);note=txt(note);
    if(!raw)return;
    directRaw=raw;
    directNote=note;
    try{
      localStorage.setItem(CACHE_KEY,raw);
      localStorage.setItem('water_project_row2',raw);
      localStorage.setItem(NOTE_CACHE_KEY,note);
    }catch(e){}
    window.postMessage({type:'WATER_UI_STATE',project:raw,projectNote:note,_r98Project:true},'*');
  }

  function loadCache(){
    try{
      const c=txt(localStorage.getItem(CACHE_KEY));
      const n=txt(localStorage.getItem(NOTE_CACHE_KEY));
      if(c){directRaw=c;directNote=n;publish(c,n);}
    }catch(e){}
  }

  async function load(){
    if(loading)return;
    loading=true;
    try{
      const data=await jsonp(SHEET_NAME,"select A,B,C,D,E,F,G,H,I,J,K where B is not null limit 1");
      const row=data&&data.table&&data.table.rows&&data.table.rows[0];
      const parsed=parseRow(row);
      if(parsed.raw){loaded=true;publish(parsed.raw,parsed.note);}
    }catch(e){
      // Giữ cache/backend nếu Google Sheets tạm thời không phản hồi.
    }finally{
      loading=false;
    }
  }

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(d._r98Project)return;
    if(directRaw)setTimeout(function(){publish(directRaw,directNote);},0);
    else if(!loaded)setTimeout(load,0);
  });

  function start(){loadCache();load();}
  window.addEventListener('pageshow',function(){setTimeout(load,100);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(load,100);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.WATER_PROJECT_SHEET_BUILD=BUILD;
})();
