(function(){
  'use strict';

  const BUILD='water-project-tab-dynamic-v1';
  const REGISTRY_ID='1nuiVdh4iwZORzBkHxVvorkio3oJVJ0E8hemKsp_3Sq0';
  const REGISTRY_SHEET='PROJECTS';
  const PROJECT_SHEET='THONG_TIN_DU_AN';

  let currentData=null;
  let loading=false;
  let loadedProject='';
  let renderTimer=0;

  function el(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function pid(){
    try{return txt(window.WATER_PROJECT_ID||new URLSearchParams(location.search).get('project')).toUpperCase();}
    catch(e){return txt(window.WATER_PROJECT_ID).toUpperCase();}
  }
  function cacheKey(){return 'water_project_dynamic_v1_'+pid();}

  function cell(row,i){
    const c=row&&row.c&&row.c[i];
    if(!c)return '';
    return txt(c.f!=null?c.f:c.v);
  }

  function jsonp(spreadsheetId,sheet,query,timeoutMs){
    return new Promise(function(resolve,reject){
      const cb='__waterProjectDynamic_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu dự án.'));},timeoutMs||12000);

      function finish(err,data){
        if(done)return;
        done=true;
        clearTimeout(timer);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        if(s.parentNode)s.parentNode.removeChild(s);
        err?reject(err):resolve(data);
      }

      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không đọc được dữ liệu dự án.'));};
      s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(spreadsheetId)
        +'/gviz/tq?sheet='+encodeURIComponent(sheet)
        +'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent(query)
        +'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function resolveSheetId(projectId){
    const safe=String(projectId).replace(/'/g,"''");
    const data=await jsonp(REGISTRY_ID,REGISTRY_SHEET,"select A,C where A = '"+safe+"' limit 1",10000);
    const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
    if(!rows.length)throw new Error('Không tìm thấy PROJECT_ID '+projectId+' trong PROJECT_REGISTRY.');
    const sheetId=cell(rows[0],1);
    if(!sheetId)throw new Error('Dự án '+projectId+' chưa có SHEET_ID.');
    return sheetId;
  }

  async function loadProjectRow(sheetId,projectId){
    const safe=String(projectId).replace(/'/g,"''");
    let data=await jsonp(sheetId,PROJECT_SHEET,"select A,B,C,D,E,F,G,H,I,J,K,L,M where A = '"+safe+"' limit 1",12000);
    let rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];

    // Dự phòng cho file vừa nhân bản nhưng cột A chưa được cập nhật PROJECT_ID.
    if(!rows.length){
      data=await jsonp(sheetId,PROJECT_SHEET,'select A,B,C,D,E,F,G,H,I,J,K,L,M where B is not null limit 1',12000);
      rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
    }
    if(!rows.length)throw new Error('Sheet THONG_TIN_DU_AN chưa có dữ liệu.');

    const r=rows[0];
    return {
      code:cell(r,0),
      name:cell(r,1),
      address:cell(r,2),
      unit:cell(r,3),
      owner:cell(r,4),
      status:cell(r,5),
      start:cell(r,6),
      end:cell(r,7),
      duration:cell(r,8),
      note:cell(r,9),
      updated:cell(r,10),
      image:cell(r,11),
      avgPeriod:cell(r,12)
    };
  }

  function driveFileId(v){
    const u=txt(v);
    let m=u.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    if(!m)m=u.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    return m&&m[1]?m[1]:'';
  }

  function normalizeImageUrl(v){
    const u=txt(v);
    if(!/^https?:\/\//i.test(u))return '';
    if(/drive\.google\.com/i.test(u)){
      const id=driveFileId(u);
      if(id)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1200';
    }
    return u;
  }

  function fallbackImageUrl(v){
    const id=driveFileId(v);
    return id?'https://drive.google.com/uc?export=view&id='+encodeURIComponent(id):'';
  }

  function ensureStyle(){
    if(el('waterProjectDynamicStyle'))return;
    const s=document.createElement('style');
    s.id='waterProjectDynamicStyle';
    s.textContent=`
      #waterProjectPanel .wpdCard{background:#fff;border:1px solid #dce2e7;border-radius:12px;padding:12px;margin-bottom:9px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      #waterProjectPanel .wpdHead{font-size:12px;font-weight:900;color:#174a7e;margin-bottom:8px;text-transform:uppercase}
      #waterProjectPanel .wpdTitle{font-size:19px;font-weight:900;line-height:1.25;color:#18232d;margin:1px 0 10px;overflow-wrap:anywhere}
      #waterProjectPanel .wpdGrid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #edf0f2}
      #waterProjectPanel .wpdItem{padding:8px 7px;border-bottom:1px solid #edf0f2;min-width:0}
      #waterProjectPanel .wpdItem:nth-child(odd){border-right:1px solid #edf0f2;padding-left:0}
      #waterProjectPanel .wpdItem:nth-child(even){padding-right:0}
      #waterProjectPanel .wpdItem.wide{grid-column:1/-1;border-right:0!important;padding-left:0!important;padding-right:0!important}
      #waterProjectPanel .wpdLabel{display:block;color:#6a7783;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.2;margin-bottom:3px}
      #waterProjectPanel .wpdValue{display:block;color:#18232d;font-size:12px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}
      #waterProjectPanel .wpdMissing{color:#8b97a2;font-weight:500;font-style:italic}
      #waterProjectPanel .wpdImage{display:block;width:100%;max-height:230px;object-fit:cover;border-radius:10px;border:1px solid #e1e6ea;background:#f3f5f7;box-sizing:border-box;margin-top:12px}
      #waterProjectPanel .wpdStatus{padding:12px;text-align:center;color:#657482;font-size:12px;font-weight:700}
      #waterProjectPanel .wpdError{color:#a23a2a}
      @media(max-width:360px){#waterProjectPanel .wpdTitle{font-size:17px}#waterProjectPanel .wpdValue{font-size:11.5px}}
    `;
    document.head.appendChild(s);
  }

  function value(v){
    const t=txt(v);
    return t?'<span class="wpdValue">'+esc(t)+'</span>':'<span class="wpdValue wpdMissing">Chưa cập nhật</span>';
  }
  function item(label,v,wide){
    return '<div class="wpdItem'+(wide?' wide':'')+'"><span class="wpdLabel">'+esc(label)+'</span>'+value(v)+'</div>';
  }

  function imageHtml(raw){
    const src=normalizeImageUrl(raw);
    if(!src)return '';
    const fb=fallbackImageUrl(raw);
    return '<img class="wpdImage" alt="Ảnh dự án" loading="lazy" decoding="async" src="'+esc(src)+'"'
      +(fb?' onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src=\''+esc(fb)+'\';}else{this.style.display=\'none\';}"':'')+'>';
  }

  function renderStatus(text,isError){
    const panel=el('waterProjectPanel');if(!panel)return;
    ensureStyle();
    panel.innerHTML='<div class="wpdCard"><div class="wpdStatus'+(isError?' wpdError':'')+'">'+esc(text)+'</div></div>';
  }

  function render(){
    const panel=el('waterProjectPanel');
    if(!panel||!currentData)return;
    ensureStyle();
    const p=currentData;
    panel.innerHTML=`
      <div class="wpdCard">
        <div class="wpdHead">Thông tin dự án</div>
        <div class="wpdTitle">${esc(p.name||p.code||'Ghi số nước')}</div>
        <div class="wpdGrid">
          ${item('Mã dự án',p.code,false)}
          ${item('Trạng thái',p.status,false)}
          ${item('Địa chỉ',p.address,true)}
          ${item('Đơn vị quản lý vận hành',p.unit,true)}
          ${item('Người phụ trách',p.owner,true)}
          ${item('Ngày bắt đầu',p.start,false)}
          ${item('Ngày kết thúc',p.end,false)}
          ${item('Hạn ghi (ngày)',p.duration,false)}
          ${item('Kỳ TB tiêu thụ',p.avgPeriod,false)}
          ${item('Ghi chú',p.note,true)}
          ${item('Cập nhật lúc',p.updated,true)}
        </div>
        ${imageHtml(p.image)}
      </div>`;
  }

  function saveCache(projectId,data){
    try{localStorage.setItem(cacheKey(),JSON.stringify({projectId:projectId,data:data,at:Date.now()}));}catch(e){}
  }
  function loadCache(){
    try{
      const x=JSON.parse(localStorage.getItem(cacheKey())||'null');
      if(x&&x.projectId===pid()&&x.data){currentData=x.data;return true;}
    }catch(e){}
    return false;
  }

  async function load(force){
    const projectId=pid();
    if(!projectId){renderStatus('Thiếu PROJECT_ID trên đường dẫn App.',true);return;}
    if(loading)return;
    if(!force&&loadedProject===projectId&&currentData){render();return;}

    if(!currentData&&loadCache())render();
    loading=true;
    if(!currentData)renderStatus('Đang tải thông tin dự án '+projectId+'...',false);

    try{
      const sheetId=await resolveSheetId(projectId);
      const data=await loadProjectRow(sheetId,projectId);
      currentData=data;
      loadedProject=projectId;
      saveCache(projectId,data);
      render();
    }catch(e){
      if(currentData){render();}
      else renderStatus(String(e&&e.message||e),true);
    }finally{
      loading=false;
    }
  }

  function schedule(force){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(function(){load(!!force);},40);
  }

  function install(){
    const tab=el('waterTabProject');
    if(tab&&!tab.dataset.wpdDynamic){
      tab.dataset.wpdDynamic='1';
      tab.addEventListener('click',function(){schedule(false);});
    }

    // Chỉ tải khi Tab DỰ ÁN đang được mở; không làm chậm màn hình CHỤP SỐ.
    const panel=el('waterProjectPanel');
    if(panel&&panel.classList.contains('active'))schedule(false);
  }

  window.addEventListener('pageshow',install);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')install();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();

  window.refreshWaterProjectTab=function(){schedule(true);};
  window.WATER_PROJECT_TAB_BUILD=BUILD;
})();
