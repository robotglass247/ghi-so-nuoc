/* ============================================================
MODULE_ID: 05
MODULE_NAME: download-xlsx
VERSION: 1.0.0
STATUS: PASS/FROZEN CANDIDATE
DEPENDENCIES: 03_manage-core-v1.js, 08_manage-status-v1.js, 04_month-selector-v1.js
RESPONSIBILITY: create/download XLSX only
SOURCE: R11.8 + R11.24 + R11.28 + R11.29 PASS logic
============================================================ */
(function(){
  'use strict';
  const core=window.WATER_MANAGE_CORE, ui=window.WATER_MANAGE_STATUS;
  if(!core||!ui)throw new Error('download-xlsx thiếu dependency');

  function setDisabled(disabled){
    const link=core.el('waterDownloadR118');
    if(!link)return;
    link.classList.toggle('disabled',!!disabled);
    link.setAttribute('aria-disabled',disabled?'true':'false');
  }

  function loadXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise(function(resolve,reject){
      const urls=['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'];
      let i=0;
      function next(){
        if(window.XLSX)return resolve(window.XLSX);
        if(i>=urls.length)return reject(new Error('Không tải được thư viện tạo file Excel.'));
        const s=document.createElement('script');s.src=urls[i++];s.async=true;
        s.onload=function(){window.XLSX?resolve(window.XLSX):next();};s.onerror=next;document.head.appendChild(s);
      }
      next();
    });
  }

  function buildRealXls(period,rows,XLSX){
    const aoa=[
      ['CHI SỐ NƯỚC THÁNG '+period,'','','','','','',''],
      ['','','','','','','',''],
      ['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³']
    ];
    rows.forEach(function(r,index){
      const vals=[];for(let i=0;i<7;i++)vals.push(core.txt(core.cell(r,i)));
      aoa.push([String(index+1),vals[0],vals[1],vals[2],vals[3],vals[4],vals[5],vals[6]]);
    });
    const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!ref']='A1:H'+aoa.length;
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:7}}];
    ws['!cols']=[{wch:7},{wch:12},{wch:10},{wch:14},{wch:18},{wch:17},{wch:17},{wch:14}];
    ws['!rows']=[{hpt:24},{hpt:18},{hpt:30}];
    for(let r=3;r<aoa.length;r++)for(let c=0;c<=4;c++){const addr=XLSX.utils.encode_cell({r:r,c:c});if(ws[addr]){ws[addr].t='s';ws[addr].v=String(ws[addr].v==null?'':ws[addr].v);ws[addr].z='@';}}
    if(aoa.length>=4)ws['!autofilter']={ref:'A3:H'+aoa.length};
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,('CHI_SO_'+period.replace('/','_')).slice(0,31));return wb;
  }

  async function downloadSelected(){
    const select=core.el('waterExportMonthR118');
    const link=core.el('waterDownloadR118');
    const period=core.txt(select&&select.value);
    if(!period){ui.set('Anh chọn tháng cần tải trước.','err');return;}
    if(!navigator.onLine){ui.set('Thiết bị đang OFFLINE. Cần Internet để tải file.','err');return;}

    const isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(String(navigator.userAgent||''));
    let downloadWindow=null;
    if(isMobile){
      try{
        downloadWindow=window.open('about:blank','_blank');
        if(downloadWindow&&downloadWindow.document){downloadWindow.document.open();downloadWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đang tạo file...</title></head><body style="font-family:Arial,sans-serif;padding:24px;text-align:center"><h3>Đang tạo file chỉ số nước...</h3><p>Vui lòng chờ vài giây.</p></body></html>');downloadWindow.document.close();}
      }catch(_e){downloadWindow=null;}
    }

    setDisabled(true);
    const old=link?link.textContent:'Tải File';
    if(link)link.textContent='Đang tạo...';
    ui.set('Đang tạo file...','');
    try{
      const q="select B,C,D,E,F,G,H where J = '"+period.replace(/'/g,"''")+"'";
      const data=await core.jsonp(q);
      const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
      if(!rows.length)throw new Error('Không có dữ liệu của tháng '+period+'.');
      const XLSX=await loadXlsx();
      const wb=buildRealXls(period,rows,XLSX);
      const ws=wb.Sheets[wb.SheetNames[0]];
      const range=XLSX.utils.decode_range(ws['!ref']||'A1:A1');
      if(range.e.c!==7)throw new Error('Khóa xuất R11.8 phát hiện file không đúng 8 cột.');
      for(let rr=0;rr<=range.e.r;rr++){if(ws['I'+(rr+1)])throw new Error('Khóa xuất R11.8 phát hiện cột I/Ảnh.');}
      const fileName='R118_KHONG_ANH_'+core.safeName(period.replace('/','-'))+'.xlsx';
      const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array',compression:true});
      const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob);
      function safeHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
      let handedToMobile=false;
      if(downloadWindow&&!downloadWindow.closed){
        try{
          const fileEsc=safeHtml(fileName),urlEsc=safeHtml(url);
          downloadWindow.document.open();
          downloadWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tải file chỉ số</title></head><body style="font-family:Arial,sans-serif;padding:24px;text-align:center"><h3>File đã sẵn sàng</h3><a id="waterMobileDownload" href="'+urlEsc+'" download="'+fileEsc+'" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border:1px solid #225b91;border-radius:10px;font-weight:800;text-decoration:none;color:#225b91">TẢI FILE '+fileEsc+'</a><p style="font-size:13px;color:#596774;margin-top:16px">Nếu máy chưa tự tải, chạm nút TẢI FILE ở trên.</p><button id="waterBackToApp" type="button" style="display:flex;align-items:center;justify-content:center;width:100%;max-width:336px;min-height:46px;margin:22px auto 0;padding:0 18px;border:1px solid #9aa8b5;border-radius:10px;background:#fff;font-size:15px;font-weight:800;color:#263746">← QUAY LẠI ỨNG DỤNG</button><script>var back=document.getElementById("waterBackToApp");if(back){back.onclick=function(){try{if(window.opener&&!window.opener.closed){window.opener.focus();}}catch(e){}try{window.close();}catch(e){}};}setTimeout(function(){var a=document.getElementById("waterMobileDownload");if(a){try{a.click();}catch(e){}}},120);</'+'script></body></html>');
          downloadWindow.document.close();handedToMobile=true;
        }catch(_e){handedToMobile=false;}
      }
      if(!handedToMobile){
        const a=document.createElement('a');a.href=url;a.download=fileName;a.style.display='none';document.body.appendChild(a);try{a.click();}catch(_e){}setTimeout(function(){if(a.parentNode)a.parentNode.removeChild(a);},1500);
        const n=core.el('waterExportR118Status');
        if(n){n.className='ok';n.innerHTML='';const t=document.createElement('span');t.textContent='File đã sẵn sàng tải • ';const manual=document.createElement('a');manual.href=url;manual.download=fileName;manual.textContent='NHẤN ĐỂ LƯU FILE';manual.style.fontWeight='900';manual.style.textDecoration='underline';n.appendChild(t);n.appendChild(manual);}
      }else ui.set('File đã sẵn sàng tải.','ok');
      setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},60000);
    }catch(e){
      try{if(downloadWindow&&!downloadWindow.closed)downloadWindow.close();}catch(_e){}
      ui.set(core.txt(e&&e.message)||'Không tạo được file tải.','err');
    }finally{
      if(link)link.textContent=old||'Tải File';
      setDisabled(false);
    }
  }

  function bind(){
    const link=core.el('waterDownloadR118');
    if(!link||link.dataset.downloadModuleBound==='1')return false;
    link.dataset.downloadModuleBound='1';
    link.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();if(link.classList.contains('disabled'))return false;downloadSelected();return false;},false);
    return true;
  }
  document.addEventListener('WATER_MANAGE_CARD_READY',bind);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  if(window.MutationObserver)new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});

  window.WATER_MANAGE_DOWNLOAD=Object.freeze({BUILD:'download-xlsx-v1.0.0',bind,buildRealXls,downloadSelected});
})();
