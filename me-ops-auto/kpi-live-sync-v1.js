(function(){
  'use strict';

  let live=null;
  let loading=false;
  let observer=null;
  let lastFetch=0;

  function readyRpc(){
    return !!(window.google && google.script && google.script.run);
  }

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }

  function setCell(selector,value){
    const row=document.querySelector(selector);
    const td=row&&row.querySelector('td');
    if(td) td.textContent=String(value);
  }

  function applyLive(){
    if(!live) return;
    const host=document.querySelector('[data-kpi-overview="1"]');
    if(!host) return;

    const k=live.kpi||{};
    const total=Number(k.todayTotal||0);
    const completed=Number(k.todayDone||0);
    const incomplete=Math.max(0,total-completed);
    // Công việc có Ngày KH = hôm nay chưa được coi là quá hạn trong ngày hiện tại.
    const overdue=0;
    const inTime=Math.max(0,incomplete-overdue);
    const pct=total>0?Math.round(completed*100/total):0;

    setCell('.kpi4-total',total);
    setCell('.kpi4-done',completed);
    setCell('.kpi4-pending',incomplete);
    setCell('.kpi4-overdue',overdue);
    setCell('.kpi4-intime',inTime);

    const rate=document.querySelector('.kpi4-rate td');
    if(rate){
      rate.classList.add('kpi4-pct');
      rate.innerHTML='<strong>'+pct+'%</strong><span class="kpi4-bar"><i style="width:'+Math.max(0,Math.min(100,pct))+'%"></i></span>';
    }

    const sub=document.querySelector('.kpi4-table thead th:nth-child(2) .kpi4-sub');
    if(sub){
      const d=(live.meta&&live.meta.date)||'';
      sub.textContent=d?('Ngày '+d):'Hôm nay';
    }

    host.setAttribute('data-day-source','dashboard-live');
  }

  function fetchLive(force){
    if(loading || !readyRpc()) return;
    const now=Date.now();
    if(!force && now-lastFetch<5000) return;
    loading=true;
    lastFetch=now;

    google.script.run
      .withSuccessHandler(function(data){
        loading=false;
        live=data||{};
        applyLive();
      })
      .withFailureHandler(function(){
        loading=false;
      })
      .getDashboardData(true);
  }

  function watchKpi(){
    const host=document.getElementById('kpis');
    if(!host){setTimeout(watchKpi,400);return;}
    if(observer) observer.disconnect();
    observer=new MutationObserver(function(){
      if(live) requestAnimationFrame(applyLive);
    });
    observer.observe(host,{childList:true,subtree:true});
  }

  function watchCatalogApply(){
    const docObserver=new MutationObserver(function(muts){
      for(const m of muts){
        const t=(m.target&&m.target.textContent)||'';
        if(t.indexOf('Đã áp dụng')>=0 || t.indexOf('ĐÃ ÁP DỤNG')>=0){
          setTimeout(function(){fetchLive(true);},700);
          break;
        }
      }
    });
    docObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  function start(){
    watchKpi();
    watchCatalogApply();
    const wait=function(){
      if(!readyRpc()){setTimeout(wait,350);return;}
      // Chờ module KPI dựng bảng trước rồi đồng bộ số ngày bằng dữ liệu live.
      setTimeout(function(){fetchLive(true);},1200);
    };
    wait();

    window.addEventListener('meops:data-changed',function(){fetchLive(true);});
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible') fetchLive(false);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
