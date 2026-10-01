(function(){
  'use strict';

  const MODES = [
    {key:'day', label:'NGÀY'},
    {key:'week', label:'TUẦN'},
    {key:'month', label:'THÁNG'},
    {key:'year', label:'NĂM'}
  ];
  const currentYear = new Date().getFullYear();
  const state = {day:null, week:null, month:null, year:null};
  const errors = {day:false, week:false, month:false, year:false};
  let observer = null;
  let started = false;

  function num(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function metrics(data){
    const s = (data && data.summary) || {};
    const total = num(s.total);
    const completed = num(s.completed);
    const overdue = num(s.overdue);
    const incomplete = Math.max(0, total - completed);
    const inTime = Math.max(0, incomplete - overdue);
    const pct = total > 0 ? Math.round(completed * 100 / total) : 0;
    return {total, completed, incomplete, overdue, inTime, pct};
  }

  function esc(v){
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function cell(mode, key){
    if(errors[mode]) return '<td class="kpi4-error">Lỗi</td>';
    if(!state[mode]) return '<td class="kpi4-loading">…</td>';
    const m = metrics(state[mode]);
    const value = m[key];
    if(key === 'pct'){
      return '<td class="kpi4-pct"><strong>'+value+'%</strong><span class="kpi4-bar"><i style="width:'+Math.max(0,Math.min(100,value))+'%"></i></span></td>';
    }
    return '<td>'+value+'</td>';
  }

  function periodSub(mode){
    const d = state[mode];
    if(!d || !d.label) return '<span class="kpi4-sub">Đang tải</span>';
    return '<span class="kpi4-sub">'+esc(d.label)+'</span>';
  }

  function build(){
    return '<div class="kpi4-card card" data-kpi-overview="1">'
      + '<div class="kpi4-head"><div><h3>KPI BẢO TRÌ · TỔNG HỢP 4 KỲ</h3><p>Cùng một công thức cho Ngày · Tuần · Tháng · Năm</p></div><button type="button" class="kpi4-open" data-go="maintenance">Xem kế hoạch →</button></div>'
      + '<div class="kpi4-table-wrap"><table class="kpi4-table"><thead><tr><th>CHỈ TIÊU</th>'
      + MODES.map(x=>'<th>'+x.label+periodSub(x.key)+'</th>').join('')
      + '</tr></thead><tbody>'
      + '<tr class="kpi4-total"><th>Tổng kế hoạch</th>'+MODES.map(x=>cell(x.key,'total')).join('')+'</tr>'
      + '<tr class="kpi4-done"><th>Hoàn thành</th>'+MODES.map(x=>cell(x.key,'completed')).join('')+'</tr>'
      + '<tr class="kpi4-pending"><th>Chưa hoàn thành</th>'+MODES.map(x=>cell(x.key,'incomplete')).join('')+'</tr>'
      + '<tr class="kpi4-overdue"><th>Quá hạn</th>'+MODES.map(x=>cell(x.key,'overdue')).join('')+'</tr>'
      + '<tr class="kpi4-intime"><th>Còn trong hạn</th>'+MODES.map(x=>cell(x.key,'inTime')).join('')+'</tr>'
      + '<tr class="kpi4-rate"><th>Tỷ lệ hoàn thành</th>'+MODES.map(x=>cell(x.key,'pct')).join('')+'</tr>'
      + '</tbody></table></div>'
      + '<div class="kpi4-foot">Quá hạn = công việc trong kỳ chưa hoàn thành và đã qua hạn. Còn trong hạn = chưa hoàn thành nhưng chưa quá hạn.</div>'
      + '</div>';
  }

  function injectStyle(){
    if(document.getElementById('kpi-overview-v1-style')) return;
    const style = document.createElement('style');
    style.id = 'kpi-overview-v1-style';
    style.textContent = `
      .kpis.kpi4-host{display:block!important;grid-template-columns:none!important;margin-top:10px}
      .kpi4-card{padding:14px 14px 10px;overflow:hidden}
      .kpi4-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .kpi4-head h3{margin:0;color:#15345d;font-size:16px;line-height:1.2}
      .kpi4-head p{margin:4px 0 0;color:#70839a;font-size:11px;font-weight:600}
      .kpi4-open{border:0;background:#eef5ff;color:#2477f3;border-radius:9px;padding:8px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}
      .kpi4-table-wrap{width:100%;overflow:hidden;border:1px solid #dbe7f5;border-radius:12px}
      .kpi4-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12px;background:#fff}
      .kpi4-table th,.kpi4-table td{border-right:1px solid #e6eef7;border-bottom:1px solid #e6eef7;padding:10px 7px;text-align:center;color:#234264;vertical-align:middle}
      .kpi4-table tr:last-child th,.kpi4-table tr:last-child td{border-bottom:0}
      .kpi4-table th:last-child,.kpi4-table td:last-child{border-right:0}
      .kpi4-table thead th{background:#eef4fb;color:#15345d;font-size:11px;font-weight:800;line-height:1.15}
      .kpi4-table thead th:first-child,.kpi4-table tbody th{width:28%;text-align:left;padding-left:12px}
      .kpi4-table tbody th{background:#f9fbfe;font-weight:750;line-height:1.15}
      .kpi4-table td{font-size:17px;font-weight:750}
      .kpi4-sub{display:block;margin-top:3px;color:#7a8ea7;font-size:8.5px;font-weight:600;line-height:1.15;min-height:10px}
      .kpi4-done td{color:#15985a}
      .kpi4-overdue td{color:#d83a3c}
      .kpi4-pending td{color:#c47b00}
      .kpi4-intime td{color:#2477f3}
      .kpi4-rate td{color:#15345d}
      .kpi4-pct strong{display:block;font-size:15px;line-height:1}
      .kpi4-bar{display:block;height:5px;margin:6px auto 0;max-width:78px;border-radius:99px;background:#e8eef5;overflow:hidden}
      .kpi4-bar i{display:block;height:100%;border-radius:inherit;background:#22b86a}
      .kpi4-loading{color:#93a3b5!important;font-weight:600!important}
      .kpi4-error{color:#d83a3c!important;font-size:11px!important}
      .kpi4-foot{padding-top:8px;color:#7b8da2;font-size:9.5px;line-height:1.35}
      @media(max-width:760px){
        .kpis.kpi4-host{margin-top:7px}
        .kpi4-card{padding:10px 7px 8px;border-radius:12px}
        .kpi4-head{align-items:center;margin-bottom:7px;gap:6px}
        .kpi4-head h3{font-size:13px}
        .kpi4-head p{font-size:9px;margin-top:2px}
        .kpi4-open{padding:7px 6px;font-size:9px;min-height:34px}
        .kpi4-table-wrap{border-radius:9px}
        .kpi4-table{font-size:9.5px}
        .kpi4-table th,.kpi4-table td{padding:7px 3px}
        .kpi4-table thead th{font-size:9px}
        .kpi4-table thead th:first-child,.kpi4-table tbody th{width:31%;padding-left:6px}
        .kpi4-table tbody th{font-size:9.5px}
        .kpi4-table td{font-size:13px}
        .kpi4-sub{font-size:7px;line-height:1.05;min-height:8px}
        .kpi4-pct strong{font-size:11px}
        .kpi4-bar{height:4px;margin-top:4px;max-width:48px}
        .kpi4-foot{font-size:8px;padding-top:6px}
      }
      @media(max-width:390px){
        .kpi4-card{padding-left:4px;padding-right:4px}
        .kpi4-table th,.kpi4-table td{padding:6px 2px}
        .kpi4-table thead th{font-size:8.2px}
        .kpi4-table tbody th{font-size:8.8px}
        .kpi4-table td{font-size:12px}
        .kpi4-sub{font-size:6.5px}
      }
    `;
    document.head.appendChild(style);
  }

  function render(){
    const host = document.getElementById('kpis');
    if(!host) return false;
    host.classList.add('kpi4-host');
    const current = host.querySelector('[data-kpi-overview="1"]');
    const html = build();
    if(current){
      current.outerHTML = html;
    }else{
      host.innerHTML = html;
    }
    return true;
  }

  function watchHost(){
    const host = document.getElementById('kpis');
    if(!host) return;
    if(observer) observer.disconnect();
    observer = new MutationObserver(function(){
      if(!host.querySelector('[data-kpi-overview="1"]')){
        render();
      }
    });
    observer.observe(host,{childList:true});
  }

  function loadMode(index){
    if(index >= MODES.length) return;
    const mode = MODES[index].key;
    const year = mode === 'year' ? currentYear : null;
    if(!window.google || !google.script || !google.script.run){
      errors[mode] = true;
      render();
      setTimeout(()=>loadMode(index+1),0);
      return;
    }

    google.script.run
      .withSuccessHandler(function(data){
        state[mode] = data || {};
        errors[mode] = false;
        render();
        setTimeout(()=>loadMode(index+1),0);
      })
      .withFailureHandler(function(){
        errors[mode] = true;
        render();
        setTimeout(()=>loadMode(index+1),0);
      })
      .getMaintenancePlanData(mode, year);
  }

  function start(){
    if(started) return;
    started = true;
    injectStyle();
    render();
    watchHost();
    setTimeout(function(){ loadMode(0); }, 900);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start, {once:true});
  }else{
    start();
  }
})();
