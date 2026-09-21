(function(){
  'use strict';

  const BUILD='879-r10.4-project-image-once-per-open';
  const SHEET_ID='18R-6ulz85T34hXOu5B2GrYoqHrWiDV4BO6LojJp16_A';
  const SHEET_NAME='THONG_TIN_DU_AN';
  const CACHE_KEY='water_project_info_sheet_v2';
  const NOTE_CACHE_KEY='water_project_note_v1';
  const IMAGE_CACHE_KEY='water_project_image_v1';

  let directRaw='';
  let directNote='';
  let directImage='';
  let loading=false;
  let loaded=false;
  let imageCheckedThisOpen=false;

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

      const timer=setTimeout(function(){
        finish(new Error('Hết thời gian đọc Google Sheets.'));
      },12000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);

        try{delete window[cb];}
        catch(e){window[cb]=undefined;}

        if(script.parentNode)script.parentNode.removeChild(script);
        err?reject(err):resolve(data);
      }

      window[cb]=function(data){finish(null,data);};
      script.onerror=function(){finish(new Error('Không đọc được Google Sheets.'));};

      script.src='https://docs.google.com/spreadsheets/d/'
        +encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(sheet)
        +'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent(query)
        +'&_='+Date.now();

      document.head.appendChild(script);
    });
  }

  function parseRow(row,includeImage){
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
      note:cell(row,9),
      image:includeImage?cell(row,11):directImage
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

    return {
      raw:parts.join(' · '),
      note:p.note,
      image:p.image
    };
  }

  function publish(raw,note,image){
    raw=txt(raw);
    note=txt(note);
    image=txt(image);

    if(!raw)return;

    directRaw=raw;
    directNote=note;
    directImage=image;

    try{
      localStorage.setItem(CACHE_KEY,raw);
      localStorage.setItem('water_project_row2',raw);
      localStorage.setItem(NOTE_CACHE_KEY,note);
      localStorage.setItem(IMAGE_CACHE_KEY,image);
    }catch(e){}

    window.postMessage({
      type:'WATER_UI_STATE',
      project:raw,
      projectNote:note,
      projectImage:image,
      _r104Project:true
    },'*');
  }

  function loadCache(){
    try{
      const c=txt(localStorage.getItem(CACHE_KEY));
      const n=txt(localStorage.getItem(NOTE_CACHE_KEY));
      const i=txt(localStorage.getItem(IMAGE_CACHE_KEY));

      if(c){
        directRaw=c;
        directNote=n;
        directImage=i;
        publish(c,n,i);
      }
    }catch(e){}
  }

  async function load(includeImage){
    if(loading)return;

    includeImage=!!includeImage && !imageCheckedThisOpen;
    loading=true;

    try{
      const query=includeImage
        ? "select A,B,C,D,E,F,G,H,I,J,K,L where B is not null limit 1"
        : "select A,B,C,D,E,F,G,H,I,J,K where B is not null limit 1";

      const data=await jsonp(SHEET_NAME,query);
      const row=data&&data.table&&data.table.rows&&data.table.rows[0];
      const parsed=parseRow(row,includeImage);

      if(includeImage)imageCheckedThisOpen=true;

      if(parsed.raw){
        loaded=true;
        publish(parsed.raw,parsed.note,parsed.image);
      }

    }catch(e){
      // Giữ cache/backend nếu Google Sheets tạm thời không phản hồi.
      // Nếu lần đọc ảnh đầu tiên lỗi, không ép tải lại liên tục trong cùng phiên.
      if(includeImage)imageCheckedThisOpen=true;
    }finally{
      loading=false;
    }
  }

  window.addEventListener('message',function(ev){
    const d=ev&&ev.data;
    if(!d||typeof d!=='object'||d.type!=='WATER_UI_STATE')return;
    if(d._r104Project)return;

    if(directRaw){
      setTimeout(function(){
        publish(directRaw,directNote,directImage);
      },0);
    }else if(!loaded){
      setTimeout(function(){load(false);},0);
    }
  });

  function start(){
    loadCache();
    // Chỉ lần này mới đọc cột ẢNH DỰ ÁN trong mỗi lần mở App.
    load(true);
  }

  // Các lần quay lại App chỉ làm mới thông tin chữ, không đọc/tải lại ảnh.
  window.addEventListener('pageshow',function(){
    setTimeout(function(){load(false);},100);
  });

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'){
      setTimeout(function(){load(false);},100);
    }
  });

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }

  window.WATER_PROJECT_SHEET_BUILD=BUILD;
})();
