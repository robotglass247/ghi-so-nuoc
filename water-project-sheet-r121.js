(function(){
  'use strict';

  const BUILD='879-r12.1-project-sheet-dev';
  const SHEET_ID='1Mu10P8GyQHHy4NlrQVG90C3Uwa8f2G6wjfb0idKO9PM';
  const SHEET_NAME='THONG_TIN_DU_AN';
  const CACHE_KEY='water_r121_project_info_v1';
  const NOTE_CACHE_KEY='water_r121_project_note_v1';
  const IMAGE_CACHE_KEY='water_r121_project_image_v1';
  let directRaw='',directNote='',directImage='',loading=false,imageChecked=false;

  function txt(v){return String(v==null?'':v).trim();}
  function cell(row,i){const c=row&&row.c&&row.c[i];return c?txt(c.f!=null?c.f:c.v):'';}

  function jsonp(includeImage){
    return new Promise(function(resolve,reject){
      const cb='__waterR121Gviz_'+Date.now()+'_'+Math.random().toString(36).slice(2),script=document.createElement('script');
      let done=false;
      const timer=setTimeout(()=>finish(new Error('timeout')),10000);
      function finish(err,data){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){}if(script.parentNode)script.parentNode.removeChild(script);err?reject(err):resolve(data);}
      window[cb]=data=>finish(null,data);script.onerror=()=>finish(new Error('sheet'));
      const query=includeImage?"select A,B,C,D,E,F,G,H,I,J,K,L where B is not null limit 1":"select A,B,C,D,E,F,G,H,I,J,K where B is not null limit 1";
      script.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(SHEET_NAME)+'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)+'&tq='+encodeURIComponent(query)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }

  function parse(row,includeImage){
    const p={code:cell(row,0),name:cell(row,1),address:cell(row,2),unit:cell(row,3),owner:cell(row,4),status:cell(row,5),start:cell(row,6),end:cell(row,7),duration:cell(row,8),note:cell(row,9),image:includeImage?cell(row,11):directImage};
    const parts=[];
    if(p.name)parts.push('Dự án: '+p.name);if(p.code)parts.push('Mã dự án: '+p.code);if(p.address)parts.push('Địa chỉ: '+p.address);if(p.unit)parts.push('Đơn vị QLVH: '+p.unit);if(p.owner)parts.push('Người phụ trách: '+p.owner);if(p.status)parts.push('Trạng thái: '+p.status);if(p.start)parts.push('Ngày bắt đầu: '+p.start);if(p.end)parts.push('Ngày kết thúc: '+p.end);if(p.duration)parts.push('Hạn ghi: '+p.duration+' ngày');
    return {raw:parts.join(' · '),note:p.note,image:p.image};
  }

  function publish(p){
    if(!p||!txt(p.raw))return;directRaw=txt(p.raw);directNote=txt(p.note);directImage=txt(p.image);
    try{localStorage.setItem(CACHE_KEY,directRaw);localStorage.setItem('water_project_row2',directRaw);localStorage.setItem(NOTE_CACHE_KEY,directNote);localStorage.setItem(IMAGE_CACHE_KEY,directImage);localStorage.setItem('water_project_note_v1',directNote);localStorage.setItem('water_project_image_v1',directImage);}catch(e){}
    window.postMessage({type:'WATER_UI_STATE',project:directRaw,projectNote:directNote,projectImage:directImage,_r121Project:true},'*');
  }

  async function load(includeImage){
    if(loading)return;includeImage=!!includeImage&&!imageChecked;loading=true;
    try{const data=await jsonp(includeImage),row=data&&data.table&&data.table.rows&&data.table.rows[0],p=parse(row,includeImage);if(includeImage)imageChecked=true;publish(p);}catch(e){if(includeImage)imageChecked=true;}finally{loading=false;}
  }

  function start(){
    try{const raw=localStorage.getItem(CACHE_KEY),note=localStorage.getItem(NOTE_CACHE_KEY),image=localStorage.getItem(IMAGE_CACHE_KEY);if(raw)publish({raw,note,image});}catch(e){}
    load(true);
  }

  window.addEventListener('message',function(ev){const d=ev&&ev.data;if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE'||d._r121Project)return;if(directRaw)setTimeout(()=>publish({raw:directRaw,note:directNote,image:directImage}),0);});
  window.addEventListener('pageshow',()=>setTimeout(()=>load(false),120));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>load(false),120);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.WATER_PROJECT_SHEET_BUILD=BUILD;
})();
