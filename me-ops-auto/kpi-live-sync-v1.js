(function(){
  'use strict';

  const MODES=[
    {key:'day',year:null},
    {key:'week',year:null},
    {key:'month',year:null},
    {key:'year',year:new Date().getFullYear()}
  ];
  const state={day:null,week:null,month:null,year:null};
  let loading=false;
  let rerun=false;
  let observer=null;
  let lastFetch=0;
  let refreshTimer=null;

  function readyRpc(){
    return !!(window.google && google.script && google.script.run);
  }

  function num(v){
    const n=Number(v);
    return Number.isFinite(n)?n:0;
  }

  function metrics(data){
    const s=(data&&data.summary)||{};
    const total=num(s.total);
    const completed=num(s.completed);
    const overdue=num(s.overdue);
    const incomplete=Math.max(0,total-completed);
    const inTime=Math.max(0,incomplete-overdue);
    const pct=total>0?Math.round(completed*100/total):0;
    return {total:total,completed:completed,incomplete:incomplete,overdue:overdue,inTime:inTime,pct:pct};
  }

  function clearCaches(){
    try{
      const remove=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(k.indexOf('meops_plan_')===0 || k.indexOf('meops_dashboard_')===0) remove.push(k);
      }
      remove.forEach(function(k){localStorage.removeItem(k);});
    }catch(e){}
  }

  function rpcPlan(mode,year){
    return new Promise(function(resolve,reject){
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(function(e){reject(e instanceof Error?e:new Error(String((e&&e.message)||e||'Lỗi KPI')));})
        .getMaintenancePlanData(mode,year,true);
    });
  }

  function rowCell(rowClass,index){
    const row=document.querySelector(rowClass);
    if(!row) return null;
    const cells=row.querySelectorAll('td');
    return cells[index]||null;
  }

  function applyMode(mode,index){
    const data=state[mode];
    if(!data) return;
    const m=metrics(data);
    const map=[
      ['.kpi4-total',m.total],
      ['.kpi4-done',m.completed],
      ['.kpi4-pending',m.incomplete],
      ['.kpi4-overdue',m.overdue],
      ['.kpi4-intime',m.inTime]
    ];
    map.forEach(function(x){
      const td=rowCell(x[0],index);
      if(td) td.textContent=String(x[1]);
    });

    const rate=rowCell('.kpi4-rate',index);
    if(rate){
      rate.classList.add('kpi4-pct');
      rate.innerHTML='<strong>'+m.pct+'%</strong><span class="kpi4-bar"><i style="width:'+Math.max(0,Math.min(100,m.pct))+'%"></i></span>';
    }

    const sub=document.querySelector('.kpi4-table thead th:nth-child('+(index+2)+') .kpi4-sub');
    if(sub && data.label) sub.textContent=String(data.label);
  }

  function applyAll(){
    const host=document.querySelector('[data-kpi-overview="1"]');
    if(!host) return;
    MODES.forEach(function(x,i){applyMode(x.key,i);});
    host.setAttribute('data-kpi-source','maintenance-live-all-4');
  }

  function fetchAll(force){
    if(!readyRpc()) return;
    if(loading){rerun=rerun||!!force;return;}
    const now=Date.now();
    if(!force && now-lastFetch<5000) return;
    loading=true;
    lastFetch=now;
    if(force) clearCaches();

    let chain=Promise.resolve();
    MODES.forEach(function(x){
      chain=chain.then(function(){
        return rpcPlan(x.key,x.year).then(function(data){
          state[x.key]=data||{};
          applyAll();
        });
      });
    });

    chain.catch(function(err){
      console.error('[M&E OPS KPI LIVE]',err);
    }).finally(function(){
      loading=false;
      applyAll();
      if(rerun){rerun=false;setTimeout(function(){fetchAll(true);},250);}
    });
  }

  function scheduleRefresh(delay){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(function(){fetchAll(true);},delay||450);
  }

  function watchKpi(){
    const host=document.getElementById('kpis');
    if(!host){setTimeout(watchKpi,400);return;}
    if(observer) observer.disconnect();
    observer=new MutationObserver(function(){
      if(state.day||state.week||state.month||state.year) requestAnimationFrame(applyAll);
    });
    observer.observe(host,{childList:true,subtree:true});
  }

  function watchCatalogChanges(){
    const docObserver=new MutationObserver(function(muts){
      for(const m of muts){
        const t=(m.target&&m.target.textContent)||'';
        if(t.indexOf('Đã áp dụng')>=0 || t.indexOf('ĐÃ ÁP DỤNG')>=0 || t.indexOf('ĐÃ LƯU')>=0 || t.indexOf('Đã lưu')>=0){
          scheduleRefresh(650);
          break;
        }
      }
    });
    docObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  function start(){
    watchKpi();
    watchCatalogChanges();
    const wait=function(){
      if(!readyRpc()){setTimeout(wait,350);return;}
      setTimeout(function(){fetchAll(true);},1300);
    };
    wait();

    window.addEventListener('meops:data-changed',function(){scheduleRefresh(250);});
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible') fetchAll(false);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
