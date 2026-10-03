from pathlib import Path
import re

APP = Path('me-ops-auto/app.html')
ADAPTER = Path('me-ops-auto/adapter-v4.js')


def sub1(text, pattern, repl, label):
    new, n = re.subn(pattern, repl, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'Không tìm thấy hoặc tìm thấy nhiều hơn 1 vị trí: {label} ({n})')
    return new


# =========================================================
# 1) Adapter: ưu tiên tác vụ người dùng + dedupe + cache sự cố
# =========================================================
adapter = ADAPTER.read_text(encoding='utf-8')

if 'WATER-PROGRESSIVE-3' not in adapter:
    adapter = adapter.replace(
        "  const MAINT_RESULT_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;\n",
        "  const MAINT_RESULT_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;\n\n"
        "  const INCIDENT_CACHE_KEY = 'meops_incident_feed_v1_' + (PROJECT_ID || 'NO_PROJECT');\n"
        "  const INCIDENT_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;\n"
    )

    adapter = adapter.replace(
        "  const WRITE_METHODS = new Set([\n    'saveIncident',\n    'saveMaintenanceReport',\n    'saveOperation'\n  ]);",
        "  const WRITE_METHODS = new Set([\n"
        "    'saveIncident',\n"
        "    'saveMaintenanceReport',\n"
        "    'saveOperation',\n"
        "    'applyProjectCatalog',\n"
        "    'saveProjectCatalogTask'\n"
        "  ]);"
    )

    adapter = adapter.replace(
        "  let maintenanceInitialInFlight = null;\n",
        "  const inFlight = new Map();\n"
    )

    adapter = adapter.replace(
        "  function clearMaintenanceResultCache(){\n"
        "    try{ localStorage.removeItem(MAINT_RESULT_CACHE_KEY); }catch(e){}\n"
        "  }\n",
        "  function clearMaintenanceResultCache(){\n"
        "    try{ localStorage.removeItem(MAINT_RESULT_CACHE_KEY); }catch(e){}\n"
        "  }\n\n"
        "  function readIncidentCache(){\n"
        "    return readJsonCache(INCIDENT_CACHE_KEY, INCIDENT_CACHE_MAX_AGE);\n"
        "  }\n\n"
        "  function writeIncidentCache(data){\n"
        "    if(data && typeof data === 'object') writeJsonCache(INCIDENT_CACHE_KEY, data);\n"
        "  }\n\n"
        "  function clearIncidentCache(){\n"
        "    try{ localStorage.removeItem(INCIDENT_CACHE_KEY); }catch(e){}\n"
        "  }\n"
    )

    adapter = sub1(
        adapter,
        r"  function priorityFor\(method\)\{.*?\n  \}\n\n  function makeId\(",
        """  function activeView(){
    try{
      if(window.__MEOPS_ACTIVE_VIEW__) return String(window.__MEOPS_ACTIVE_VIEW__);
      const active = document.querySelector('.view.active');
      return active && active.dataset ? String(active.dataset.view || 'home') : 'home';
    }catch(e){
      return 'home';
    }
  }

  function priorityFor(method){
    const view = activeView();

    // Tác vụ ghi và tác vụ người dùng đang trực tiếp chờ luôn đứng trước tải nền.
    if(WRITE_METHODS.has(method)) return 100;
    if(method === 'getMaintenanceInitialData') return view === 'result' ? 99 : 86;
    if(method === 'getMaintenancePlanData') return view === 'maintenance' ? 98 : 12;
    if(method === 'getDashboardData') return 95;
    if(method === 'getIncidentFeed') return view === 'incidents' ? 97 : 28;
    if(method === 'getProjectCatalog' || method === 'getProjectCatalogTasks'){
      const setupOpen = !!document.getElementById('meops-catalog-setup-modal') || !!document.getElementById('meops-catalog-task-editor-modal');
      return (view === 'result' || setupOpen) ? 96 : 36;
    }
    if(method === 'getAppConfig') return view === 'result' ? 78 : 18;
    return 55;
  }

  function makeId(""",
        'priorityFor'
    )

    adapter = adapter.replace(
        "    const task = queue.shift();\n",
        "    const task = queue.shift();\n    task.started = true;\n"
    )

    adapter = sub1(
        adapter,
        r"  function rpc\(method,args,options\)\{.*?\n  \}\n\n  function prefetchMaintenanceDay\(",
        """  function rpcKey(method,args){
    if(WRITE_METHODS.has(method)) return '';
    try{ return method + '|' + JSON.stringify(args || []); }
    catch(e){ return method; }
  }

  function insertTask(task){
    const index = queue.findIndex(function(q){
      return Number(q.priority || 0) < Number(task.priority || 0);
    });
    if(index < 0) queue.push(task);
    else queue.splice(index,0,task);
  }

  function rpc(method,args,options){
    const priority = options && Number.isFinite(options.priority)
      ? Number(options.priority)
      : priorityFor(method);

    const key = rpcKey(method,args);
    const existing = key ? inFlight.get(key) : null;

    if(existing){
      // Nếu cùng yêu cầu đang nằm trong hàng đợi nền mà người dùng vừa mở màn hình,
      // nâng ngay độ ưu tiên thay vì tạo thêm một request trùng.
      const task = existing.task;
      if(task && !task.started && priority > Number(task.priority || 0)){
        task.priority = priority;
        const idx = queue.indexOf(task);
        if(idx >= 0){
          queue.splice(idx,1);
          insertTask(task);
        }
      }
      return existing.promise;
    }

    let taskRef = null;
    const promise = new Promise(function(resolve,reject){
      const task = {
        method:method,
        args:args || [],
        resolve:resolve,
        reject:reject,
        priority:priority,
        order:++seq,
        started:false
      };
      taskRef = task;
      insertTask(task);
      pump();
    });

    if(key){
      const entry = {promise:promise, task:taskRef};
      inFlight.set(key, entry);
      promise.finally(function(){
        if(inFlight.get(key) === entry) inFlight.delete(key);
      }).catch(function(){});
    }

    return promise;
  }

  function prefetchMaintenanceDay(""",
        'rpc/dedupe'
    )

    adapter = sub1(
        adapter,
        r"  function prefetchMaintenanceDay\(\)\{.*?\n  \}\n\n  function prefetchMaintenanceResult\(",
        """  function prefetchMaintenanceDay(){
    if(planPrefetchStarted) return;
    planPrefetchStarted = true;

    // Ngày/Tuần/Tháng là các chế độ người dùng mở thường xuyên.
    // Nạp nối tiếp sau dữ liệu chính để không tranh đường truyền lúc khởi động.
    const jobs = [
      ['day', null],
      ['week', null],
      ['month', null]
    ];
    let index = 0;

    function next(){
      if(index >= jobs.length) return;
      const args = jobs[index++];
      if(readPlanCache(args)){
        setTimeout(next,120);
        return;
      }

      rpc('getMaintenancePlanData', args, {priority:8})
        .then(function(data){ writePlanCache(args, data); })
        .catch(function(){})
        .finally(function(){ setTimeout(next,350); });
    }

    setTimeout(next,1800);
  }

  function prefetchMaintenanceResult(""",
        'prefetch maintenance common modes'
    )

    adapter = sub1(
        adapter,
        r"  function makeRunner\(state\)\{.*?\n  \}\n\n  window\.google =",
        """  function makeRunner(state){
    const base = {
      withSuccessHandler(fn){
        return makeRunner({success:fn,failure:state.failure});
      },
      withFailureHandler(fn){
        return makeRunner({success:state.success,failure:fn});
      },
      withUserObject(){
        return makeRunner(state);
      }
    };

    return new Proxy(base,{
      get(target,prop){
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return target[prop];

        return function(){
          const originalArgs = Array.prototype.slice.call(arguments);
          let rpcArgs = originalArgs.slice();
          let servedCache = false;

          if(prop === 'getDashboardData' && rpcArgs[0] !== true){
            const cached = readDashboardCache();
            if(cached && typeof state.success === 'function'){
              servedCache = true;
              Promise.resolve().then(function(){
                state.success(withDeliveryMeta(cached.data,'cache',cached.ts));
              });
            }
          }

          if(prop === 'getMaintenancePlanData'){
            if(planForceRefresh){
              rpcArgs[2] = true;
              planForceRefresh = false;
            }else{
              const cached = readPlanCache(rpcArgs);
              if(cached && typeof state.success === 'function'){
                servedCache = true;
                Promise.resolve().then(function(){
                  state.success(withDeliveryMeta(cached.data,'cache',cached.ts));
                });
              }
            }
          }

          if(prop === 'getIncidentFeed'){
            const cached = readIncidentCache();
            if(cached && typeof state.success === 'function'){
              servedCache = true;
              Promise.resolve().then(function(){
                state.success(withDeliveryMeta(cached.data,'cache',cached.ts));
              });
            }
          }

          rpc(prop,rpcArgs)
            .then(function(data){
              if(prop === 'getDashboardData') writeDashboardCache(data);
              if(prop === 'getMaintenancePlanData') writePlanCache(originalArgs, data);
              if(prop === 'getMaintenanceInitialData') writeMaintenanceResultCache(data);
              if(prop === 'getIncidentFeed') writeIncidentCache(data);

              if(WRITE_METHODS.has(prop)){
                clearDashboardCache();
                clearPlanCaches();
                clearMaintenanceResultCache();
                clearIncidentCache();
                planForceRefresh = true;
                resultPrefetchStarted = false;
                try{
                  window.dispatchEvent(new CustomEvent('meops:data-changed',{detail:{method:prop}}));
                }catch(e){}
              }

              if (typeof state.success === 'function'){
                const delivered = (
                  prop === 'getDashboardData' ||
                  prop === 'getMaintenancePlanData' ||
                  prop === 'getIncidentFeed'
                ) ? withDeliveryMeta(data,'live',Date.now()) : data;
                state.success(delivered);
              }
            })
            .catch(function(err){
              console.error('[M&E OPS WATER SPEED 6]',prop,err);
              if (!servedCache && typeof state.failure === 'function') state.failure(err);
            });
        };
      }
    });
  }

  window.google =""",
        'makeRunner'
    )

    adapter = adapter.replace("version:'WATER-PROGRESSIVE-2'", "version:'WATER-PROGRESSIVE-3'")
    adapter = adapter.replace(
        "mode:'cache-first + prioritized-user-rpc + result-prefetch'",
        "mode:'stale-while-revalidate + active-view-priority + dedupe + ordered-prefetch'"
    )
    adapter = adapter.replace(
        "    resultCacheMinutes:43200\n",
        "    resultCacheMinutes:43200,\n    incidentCacheMinutes:10080\n"
    )

    ADAPTER.write_text(adapter, encoding='utf-8')


# =========================================================
# 2) App: kế hoạch bảo trì cache-first thật sự, không xóa dữ liệu cũ
# =========================================================
app = APP.read_text(encoding='utf-8')

if 'MEOPS_SWR_ALL_V1' not in app:
    app = sub1(
        app,
        r"function loadMaintenancePlan\(mode='day', year=null\)\{.*?\n\}\n\nfunction renderMaintenancePlanData",
        """/* MEOPS_SWR_ALL_V1 */
function loadMaintenancePlan(mode='day', year=null){
  const previousMode=maintenanceState.mode;
  const previousYear=maintenanceState.year;
  const wasLoaded=maintenanceState.loaded;

  if(mode==='year' && year!==null && year!==undefined && year!==''){
    maintenanceState.year=Number(year);
  }

  // Ngày/Tuần/Tháng dùng khóa "current" để chia sẻ đúng cache với KPI.
  // Chỉ chế độ Năm mới truyền năm cụ thể.
  const requestYear=mode==='year'
    ? Number(maintenanceState.year || new Date().getFullYear())
    : null;

  const sameView=wasLoaded && previousMode===mode && (
    mode!=='year' || Number(previousYear)===Number(requestYear)
  );

  maintenanceState.mode=mode;

  document.querySelectorAll('[data-maint-mode]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.maintMode===mode);
  });

  const yearBtn=document.getElementById('maintenanceYearButton');
  if(yearBtn){
    yearBtn.classList.toggle('active',mode==='year');
  }

  const rows=document.getElementById('maintenancePlanRows');
  const updated=document.getElementById('maintenancePlanUpdated');
  let cacheShown=false;

  // Hiển thị ngay dữ liệu đã tải lần trước trước khi gọi máy chủ.
  try{
    const project=String((window.MEOPS_PROJECT_CONFIG&&window.MEOPS_PROJECT_CONFIG.projectCode)||'').trim().toUpperCase()||'NO_PROJECT';
    const cacheYear=requestYear!==null ? String(requestYear) : 'current';
    const cacheKey='meops_plan_water_cache_v4_'+project+'_'+mode+'_'+cacheYear;
    const raw=localStorage.getItem(cacheKey);
    if(raw){
      const box=JSON.parse(raw);
      if(box&&box.data&&box.ts&&Date.now()-Number(box.ts)<=7*24*60*60*1000){
        const cachedData=Object.assign({},box.data,{
          __meopsDelivery:{source:'cache',ts:Number(box.ts)}
        });
        renderMaintenancePlanData(cachedData);
        cacheShown=true;
      }
    }
  }catch(e){}

  // Nếu đang refresh đúng kỳ đang xem thì giữ nguyên bảng cũ, chỉ báo đang cập nhật.
  // Chỉ hiện màn hình "Đang tải" khi thật sự chưa có dữ liệu nào để xem.
  if(!cacheShown){
    if(rows && !sameView){
      rows.innerHTML='<tr><td colspan="9" class="plan-loading">Đang tải kế hoạch...</td></tr>';
    }else if(updated && sameView){
      updated.textContent='Đang cập nhật dữ liệu mới…';
    }
  }

  google.script.run
    .withSuccessHandler(data=>{
      const delivery=(data&&data.__meopsDelivery)||{};
      if(delivery.source==='cache') cacheShown=true;
      renderMaintenancePlanData(data);
    })
    .withFailureHandler(err=>{
      if(cacheShown || sameView){
        if(updated) updated.textContent='Đang dùng dữ liệu lần trước · chưa cập nhật được dữ liệu mới';
      }else if(rows){
        rows.innerHTML='<tr><td colspan="9" class="empty" style="color:#d33">Lỗi tải kế hoạch: '+escapeHtml(err.message||err)+'</td></tr>';
      }
    })
    .getMaintenancePlanData(mode,requestYear);
}

function renderMaintenancePlanData""",
        'loadMaintenancePlan'
    )

    app = app.replace(
        "  document.getElementById('maintenancePlanUpdated').textContent=\n    'Cập nhật: '+data.generatedAt;",
        "  const planUpdatedEl=document.getElementById('maintenancePlanUpdated');\n"
        "  if(planUpdatedEl){\n"
        "    const delivery=(data&&data.__meopsDelivery)||{};\n"
        "    planUpdatedEl.textContent=delivery.source==='cache'\n"
        "      ? 'Dữ liệu lần trước · đang cập nhật…'\n"
        "      : 'Cập nhật: '+data.generatedAt;\n"
        "  }"
    )

    app = app.replace(
        "function go(view){\n"
        "  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));\n"
        "  document.querySelectorAll('[data-go]').forEach(b=>b.classList.toggle('active',b.dataset.go===view));\n\n"
        "  if(view==='maintenance' && !maintenanceState.loaded){\n"
        "    loadMaintenancePlan('day');\n"
        "  }\n\n"
        "  window.scrollTo({top:0,behavior:'smooth'});\n"
        "}",
        "function go(view){\n"
        "  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));\n"
        "  document.querySelectorAll('[data-go]').forEach(b=>b.classList.toggle('active',b.dataset.go===view));\n"
        "  window.__MEOPS_ACTIVE_VIEW__=view;\n"
        "  try{window.dispatchEvent(new CustomEvent('meops:view-changed',{detail:{view:view}}));}catch(e){}\n\n"
        "  if(view==='maintenance'){\n"
        "    clearTimeout(window.__meopsMaintenanceRefreshTimer);\n"
        "    window.__meopsMaintenanceRefreshTimer=setTimeout(()=>{\n"
        "      const mode=maintenanceState.loaded ? (maintenanceState.mode||'day') : 'day';\n"
        "      const year=mode==='year' ? maintenanceState.year : null;\n"
        "      loadMaintenancePlan(mode,year);\n"
        "    },40);\n"
        "  }\n\n"
        "  if(view==='incidents'){\n"
        "    clearTimeout(window.__meopsIncidentForegroundTimer);\n"
        "    window.__meopsIncidentForegroundTimer=setTimeout(()=>{\n"
        "      try{if(typeof loadIncidentFeed==='function') loadIncidentFeed();}catch(e){}\n"
        "    },60);\n"
        "  }\n\n"
        "  window.scrollTo({top:0,behavior:'smooth'});\n"
        "}"
    )

    app = app.replace('<meta name="meops-static-version" content="4">', '<meta name="meops-static-version" content="5">')
    for old in (
        './adapter-v4.js?v=progressive-1',
        './adapter-v4.js?v=speed-1',
        './adapter-v4.js?v=speed-2',
    ):
        app = app.replace(old,'./adapter-v4.js?v=swr-3')

    APP.write_text(app, encoding='utf-8')

print('MEOPS_SWR_ALL_V1 applied successfully')
