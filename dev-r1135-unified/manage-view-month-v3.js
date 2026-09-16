/* DEV ONLY - XEM CHI SO theo dung thang dang chon, cung nguon TAI_CHI_SO_THANG.
   V3 chi chinh giao dien XEM: bo dong Nguon, cot/dong tu co theo noi dung. */
(function(){
  'use strict';

  const BUILD='r1135-view-month-v3';
  const SHEET_ID='1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY';
  const DATA_SHEET='TAI_CHI_SO_THANG';
  const DATA_RANGE='A3:J40000';
  const MONTH_IDS=['waterExportMonthR119','waterExportMonthR118'];
  const VIEW_IDS=['waterViewR119','waterViewR118'];
  const STATUS_IDS=['waterExportR119Status','waterExportR118Status'];
  let busy=false;

  function txt(v){return String(v==null?'':v).trim();}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function norm(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
  function cell(row,i){const c=row&&row.c&&row.c[i];return c?(c.f!=null?c.f:c.v):'';}
  function byIds(ids){for(const id of ids){const n=document.getElementById(id);if(n)return n;}return null;}
  function periodNow(){const s=byIds(MONTH_IDS);return txt(s&&s.value);}
  function status(message,kind){const n=byIds(STATUS_IDS);if(!n)return;n.className=kind||'';n.textContent=message||'';}

  function findView(node){
    let el=node&&node.nodeType===1?node:null;
    while(el&&el!==document.documentElement){
      if(VIEW_IDS.indexOf(el.id)>=0)return el;
      const label=norm(el.innerText||el.textContent||el.getAttribute('aria-label')||'');
      if(label==='xem chi so')return el;
      el=el.parentElement;
    }
    return null;
  }

  function jsonp(query){
    return new Promise(function(resolve,reject){
      const cb='__waterViewMonthV3_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){finish(new Error('Hết thời gian đọc dữ liệu tháng.'));},20000);
      function finish(err,data){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);err?reject(err):resolve(data);}
      window[cb]=function(data){finish(null,data);};
      s.onerror=function(){finish(new Error('Không đọc được dữ liệu tháng.'));};
      s.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)
        +'/gviz/tq?sheet='+encodeURIComponent(DATA_SHEET)
        +'&range='+encodeURIComponent(DATA_RANGE)
        +'&headers=1&tqx=responseHandler:'+encodeURIComponent(cb)
        +'&tq='+encodeURIComponent(query)+'&_='+Date.now();
      document.head.appendChild(s);
    });
  }

  async function loadPeriod(period){
    const safe=period.replace(/'/g,"''");
    const data=await jsonp("select B,C,D,E,F,G,H,I,J where J = '"+safe+"'");
    const rows=data&&data.table&&Array.isArray(data.table.rows)?data.table.rows:[];
    return rows.filter(function(r){return txt(cell(r,8))===period;});
  }

  function writeLoading(win,period){
    try{
      win.document.open();
      win.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xem chỉ số '+esc(period)+'</title></head><body style="font-family:Arial,sans-serif;padding:24px;text-align:center;color:#263746"><b>Đang đọc chỉ số tháng '+esc(period)+'...</b></body></html>');
      win.document.close();
    }catch(e){}
  }

  function render(win,period,rows){
    const head=['TT','Tòa','Tầng','Căn hộ','Mã đồng hồ','Chỉ số kỳ trước','Chỉ số kỳ này','Tiêu thụ m³','Ảnh đồng hồ'];
    let body='';
    rows.forEach(function(r,i){
      const vals=[];for(let c=0;c<8;c++)vals.push(txt(cell(r,c)));
      body+='<tr><td>'+(i+1)+'</td>'
        +'<td>'+esc(vals[0])+'</td><td>'+esc(vals[1])+'</td><td>'+esc(vals[2])+'</td><td>'+esc(vals[3])+'</td>'
        +'<td>'+esc(vals[4])+'</td><td>'+esc(vals[5])+'</td><td>'+esc(vals[6])+'</td>'
        +'<td>'+(vals[7]?'<a href="'+esc(vals[7])+'" target="_blank" rel="noopener">XEM ẢNH</a>':'')+'</td></tr>';
    });
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chỉ số nước '+esc(period)+'</title>'
      +'<style>html,body{margin:0;min-height:100%;background:#f5f7fa;color:#18232d;font-family:Arial,sans-serif}.wrap{padding:14px}.title{text-align:center;font-weight:900;font-size:18px;margin:4px 0 12px}.tableWrap{overflow:auto;background:#fff;border:1px solid #dfe5ea;border-radius:10px;-webkit-overflow-scrolling:touch}table{border-collapse:collapse;table-layout:auto;width:max-content;min-width:100%}th,td{box-sizing:border-box;border-bottom:1px solid #e6eaed;border-right:1px solid #eef1f3;padding:7px 10px;font-size:12px;line-height:1.35;text-align:center;white-space:nowrap;width:auto;height:auto;vertical-align:middle}th{position:sticky;top:0;z-index:1;background:#eef2f5;font-weight:900}td a{font-weight:900;color:#225b91}.back{display:block;width:auto;min-width:190px;max-width:100%;margin:14px auto 0;padding:11px 18px;border:1px solid #aab3bc;border-radius:9px;background:#fff;font-weight:800}</style></head><body>'
      +'<div class="wrap"><div class="title">CHỈ SỐ NƯỚC THÁNG '+esc(period)+'</div>'
      +'<div class="tableWrap"><table><thead><tr>'+head.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>'
      +'<button class="back" onclick="window.close()">← QUAY LẠI ỨNG DỤNG</button></div></body></html>';
    win.document.open();win.document.write(html);win.document.close();
  }

  function onViewClick(ev){
    const btn=findView(ev.target);if(!btn)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    if(busy)return false;
    if(navigator.onLine===false){status('Cần kết nối Internet để Xem chỉ số.','err');return false;}
    const period=periodNow();
    if(!/^\d{1,2}\/\d{4}$/.test(period)){status('Anh chọn tháng cần xem trước.','err');return false;}
    const win=window.open('','_blank');
    if(!win){status('Trình duyệt đang chặn cửa sổ XEM CHỈ SỐ.','err');return false;}
    writeLoading(win,period);
    busy=true;status('Đang đọc dữ liệu tháng '+period+'...','');
    loadPeriod(period).then(function(rows){
      if(!rows.length)throw new Error('Không có dữ liệu của tháng '+period+'.');
      render(win,period,rows);
      status('Đang xem đúng dữ liệu tháng '+period+' • '+rows.length+' dòng.','ok');
    }).catch(function(e){
      try{win.document.body.innerHTML='<div style="padding:24px;font:700 15px Arial;color:#a23a2a">'+esc(e&&e.message||'Không xem được dữ liệu.')+'</div>';}catch(_e){}
      status(txt(e&&e.message)||'Không xem được dữ liệu.','err');
    }).finally(function(){busy=false;});
    return false;
  }

  window.addEventListener('click',onViewClick,true);
  window.WATER_MANAGE_VIEW_MONTH_BUILD=BUILD;
})();
