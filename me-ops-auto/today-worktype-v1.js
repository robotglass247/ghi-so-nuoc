(function(){
  'use strict';

  const PROJECT_ID=String((window.MEOPS_PROJECT_CONFIG&&window.MEOPS_PROJECT_CONFIG.projectCode)||'').trim().toUpperCase();
  const CACHE_KEY='meops_today_worktype_v2_'+(PROJECT_ID||'NO_PROJECT');
  const CACHE_MAX_AGE=24*60*60*1000;
  let typeMap={};
  let loading=false;
  let loaded=false;
  let patched=false;
  let refreshTimer=null;

  function esc(v){
    return String(v==null?'':v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function norm(v){
    return String(v==null?'':v)
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D')
      .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }

  function key(system,task){ return norm(system)+'|'+norm(task); }
  function readyRpc(){ return !!(window.google&&google.script&&google.script.run); }

  function readCache(){
    try{
      const raw=localStorage.getItem(CACHE_KEY);
      if(!raw) return;
      const x=JSON.parse(raw);
      if(!x||!x.ts||!x.map||Date.now()-Number(x.ts)>CACHE_MAX_AGE) return;
      typeMap=x.map||{};
    }catch(e){}
  }

  function writeCache(){
    try{ localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),map:typeMap})); }catch(e){}
  }

  function todayRows(){
    try{
      return (typeof DATA!=='undefined'&&DATA&&Array.isArray(DATA.todayTasks))?DATA.todayTasks:[];
    }catch(e){ return []; }
  }

  function updateHeaders(){
    const dash=document.getElementById('todayRows');
    if(dash){
      const ths=dash.closest('table')?.querySelectorAll('thead th');
      if(ths&&ths.length>=7) ths[5].textContent='Loại công việc';
    }
    const full=document.getElementById('fullToday');
    if(full){
      const ths=full.closest('table')?.querySelectorAll('thead th');
      if(ths&&ths.length>=6) ths[4].textContent='Loại công việc';
    }
  }

  function typeFor(r){
    const direct=String((r&&r.workType)||'').trim();
    if(direct) return direct;
    return String(typeMap[key(r&&r.system,r&&r.task)]||'').trim();
  }

  function renderDashboardToday(){
    updateHeaders();
    const host=document.getElementById('todayRows');
    if(!host) return;
    const rows=todayRows();
    if(!rows.length){
      host.innerHTML='<tr><td colspan="7" class="empty">Không có công việc kế hoạch hôm nay.</td></tr>';
      return;
    }
    host.innerHTML=rows.map(function(r){
      const wt=typeFor(r);
      const statusClassName=(typeof statusClass==='function')?statusClass(r.status,r.percent):'';
      return '<tr>'+
        '<td>'+esc(r.stt)+'</td>'+
        '<td>'+esc(r.time)+'</td>'+
        '<td>'+esc(r.system)+'</td>'+
        '<td>'+esc(r.task)+'</td>'+
        '<td>'+esc(r.area)+'</td>'+
        '<td>'+esc(wt||(loading?'Đang tải…':'—'))+'</td>'+
        '<td><span class="status '+esc(statusClassName)+'">'+esc(r.status)+'</span></td>'+
      '</tr>';
    }).join('');
  }

  function renderFullToday(){
    updateHeaders();
    const host=document.getElementById('fullToday');
    if(!host) return;
    const rows=todayRows();
    if(!rows.length){
      host.innerHTML='<tr><td colspan="6" class="empty">Không có dữ liệu.</td></tr>';
      return;
    }
    host.innerHTML=rows.map(function(r){
      const wt=typeFor(r);
      const statusClassName=(typeof statusClass==='function')?statusClass(r.status,r.percent):'';
      return '<tr>'+
        '<td>'+esc(r.stt)+'</td>'+
        '<td>'+esc(r.system)+'</td>'+
        '<td>'+esc(r.task)+'</td>'+
        '<td>'+esc(r.area)+'</td>'+
        '<td>'+esc(wt||(loading?'Đang tải…':'—'))+'</td>'+
        '<td><span class="status '+esc(statusClassName)+'">'+esc(r.status)+'</span></td>'+
      '</tr>';
    }).join('');
  }

  function renderAll(){
    renderDashboardToday();
    renderFullToday();
  }

  function rpc(method,args){
    return new Promise(function(resolve,reject){
      if(!readyRpc()) return reject(new Error('RPC chưa sẵn sàng'));
      let r=google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(function(e){reject(e instanceof Error?e:new Error(String((e&&e.message)||e||'Lỗi M&E OPS')));});
      r[method].apply(r,args||[]);
    });
  }

  function findSystemCode(systems,name){
    const want=norm(name);
    const exact=(systems||[]).find(function(s){return norm(s&&s.name)===want;});
    if(exact) return String(exact.code||'');
    const loose=(systems||[]).find(function(s){
      const n=norm(s&&s.name);
      return n&&want&&(n.indexOf(want)>=0||want.indexOf(n)>=0);
    });
    return loose?String(loose.code||''):'';
  }

  function scheduleLoadTypes(delay){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(loadTypes,Math.max(0,Number(delay||0)));
  }

  function loadTypes(){
    if(loading||loaded) return;
    const rows=todayRows();
    if(!rows.length) return;
    if(rows.every(function(r){return String(r.workType||'').trim();})){
      loaded=true;
      renderAll();
      return;
    }
    if(!readyRpc()){setTimeout(loadTypes,350);return;}

    loading=true;
    renderAll();

    rpc('getProjectCatalog',[]).then(function(catalog){
      const systems=(catalog&&Array.isArray(catalog.systems))?catalog.systems:[];
      const codes=[];
      rows.forEach(function(r){
        const code=findSystemCode(systems,r.system);
        if(code&&codes.indexOf(code)<0) codes.push(code);
      });
      let chain=Promise.resolve();
      codes.forEach(function(code){
        chain=chain.then(function(){
          return rpc('getProjectCatalogTasks',[code]).then(function(res){
            const tasks=(res&&Array.isArray(res.tasks))?res.tasks:[];
            const systemNames=systems.filter(function(s){return String(s.code||'')===code;}).map(function(s){return s.name;});
            rows.forEach(function(r){
              const sameSystem=systemNames.some(function(n){
                const a=norm(n),b=norm(r.system);
                return a===b||(a&&b&&(a.indexOf(b)>=0||b.indexOf(a)>=0));
              });
              if(!sameSystem) return;
              const target=tasks.find(function(t){return norm(t&&t.task)===norm(r.task);}) ||
                tasks.find(function(t){
                  const a=norm(t&&t.task), b=norm(r.task);
                  return a&&b&&(a.indexOf(b)>=0||b.indexOf(a)>=0);
                });
              if(target&&target.type) typeMap[key(r.system,r.task)]=String(target.type);
            });
            renderAll();
          }).catch(function(err){console.warn('[M&E OPS TODAY TYPE]',code,err);});
        });
      });
      return chain;
    }).then(function(){
      loaded=true;
      loading=false;
      writeCache();
      renderAll();
    }).catch(function(err){
      loading=false;
      loaded=true;
      console.warn('[M&E OPS TODAY TYPE]',err);
      renderAll();
    });
  }

  function patchRender(){
    if(patched) return true;
    if(typeof renderTasks!=='function') return false;
    const original=renderTasks;
    window.renderTasks=function(){
      original.apply(this,arguments);
      renderAll();
      scheduleLoadTypes(window.__MEOPS_DASHBOARD_READY__?900:2200);
    };
    patched=true;
    return true;
  }

  function start(){
    readCache();
    updateHeaders();
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(patchRender()||tries>100){
        clearInterval(timer);
        renderAll();
        if(window.__MEOPS_DASHBOARD_READY__) scheduleLoadTypes(900);
        else window.addEventListener('meops:dashboard-ready',function(){scheduleLoadTypes(900);},{once:true});
        setTimeout(function(){scheduleLoadTypes(0);},12000);
      }
    },100);

    document.addEventListener('click',function(e){
      const b=e.target&&e.target.closest?e.target.closest('[data-view],[data-go]'):null;
      if(b&&(b.getAttribute('data-view')==='today'||b.getAttribute('data-go')==='today')){
        setTimeout(function(){renderAll();scheduleLoadTypes(60);},0);
      }
    });

    window.addEventListener('meops:data-changed',function(){
      try{localStorage.removeItem(CACHE_KEY);}catch(e){}
      typeMap={}; loaded=false; loading=false;
      renderAll();
      scheduleLoadTypes(900);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
