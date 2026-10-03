(function(){
  'use strict';

  const BACKEND_URL = String((window.MEOPS_PROJECT_CONFIG && window.MEOPS_PROJECT_CONFIG.backendUrl) || '__MEOPS_AUTO_BACKEND_URL__').trim();
  const PROJECT_ID = String((window.MEOPS_PROJECT_CONFIG && window.MEOPS_PROJECT_CONFIG.projectCode) || '').trim().toUpperCase();

  const DASH_CACHE_KEY = 'meops_dashboard_water_cache_v3_overdue_current_' + (PROJECT_ID || 'NO_PROJECT');
  const DASH_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  const PLAN_CACHE_PREFIX = 'meops_plan_water_cache_v4_' + (PROJECT_ID || 'NO_PROJECT') + '_';
  const PLAN_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  // Dùng cùng khóa với form Nhập kết quả để prefetch có thể được dùng ngay.
  const MAINT_RESULT_CACHE_KEY = 'meops_maintenance_initial_v1_' + (PROJECT_ID || 'NO_PROJECT');
  const MAINT_RESULT_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

  const INCIDENT_CACHE_KEY = 'meops_incident_feed_v1_' + (PROJECT_ID || 'NO_PROJECT');
  const INCIDENT_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  const WRITE_METHODS = new Set([
    'saveIncident',
    'saveMaintenanceReport',
    'saveOperation',
    'applyProjectCatalog',
    'saveProjectCatalogTask'
  ]);

  let seq = 0;
  let pending = null;
  const queue = [];
  let fixedFrame = null;

  let planForceRefresh = false;
  let planPrefetchStarted = false;
  let resultPrefetchStarted = false;
  const inFlight = new Map();

  try{
    const pre = document.createElement('link');
    pre.rel = 'preconnect';
    pre.href = 'https://script.google.com';
    document.head.appendChild(pre);
  }catch(e){}

  function readJsonCache(key, maxAge){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return null;
      const saved = JSON.parse(raw);
      if(!saved || !saved.data || !saved.ts) return null;
      const age = Date.now() - Number(saved.ts || 0);
      if(age < 0 || age > maxAge) return null;
      return saved;
    }catch(e){
      return null;
    }
  }

  function writeJsonCache(key, data){
    try{
      if(!data || typeof data !== 'object') return;
      localStorage.setItem(key, JSON.stringify({
        ts: Date.now(),
        data: data
      }));
    }catch(e){}
  }

  function withDeliveryMeta(data, source, ts){
    if(!data || typeof data !== 'object') return data;
    const out = Object.assign({}, data);
    out.__meopsDelivery = {
      source: source || 'live',
      ts: Number(ts || Date.now())
    };
    return out;
  }

  function readDashboardCache(){
    return readJsonCache(DASH_CACHE_KEY, DASH_CACHE_MAX_AGE);
  }

  function writeDashboardCache(data){
    writeJsonCache(DASH_CACHE_KEY, data);
  }

  function clearDashboardCache(){
    try{ localStorage.removeItem(DASH_CACHE_KEY); }catch(e){}
  }

  function readMaintenanceResultCache(){
    return readJsonCache(MAINT_RESULT_CACHE_KEY, MAINT_RESULT_CACHE_MAX_AGE);
  }

  function writeMaintenanceResultCache(data){
    if(data && Array.isArray(data.tasks)){
      writeJsonCache(MAINT_RESULT_CACHE_KEY, data);
    }
  }

  function clearMaintenanceResultCache(){
    try{ localStorage.removeItem(MAINT_RESULT_CACHE_KEY); }catch(e){}
  }

  function readIncidentCache(){
    return readJsonCache(INCIDENT_CACHE_KEY, INCIDENT_CACHE_MAX_AGE);
  }

  function writeIncidentCache(data){
    if(data && typeof data === 'object') writeJsonCache(INCIDENT_CACHE_KEY, data);
  }

  function clearIncidentCache(){
    try{ localStorage.removeItem(INCIDENT_CACHE_KEY); }catch(e){}
  }

  function planCacheKey(args){
    const mode = String((args && args[0]) || 'day').toLowerCase();
    const year = (args && args[1] !== undefined && args[1] !== null && args[1] !== '')
      ? String(args[1])
      : 'current';
    return PLAN_CACHE_PREFIX + mode + '_' + year;
  }

  function readPlanCache(args){
    return readJsonCache(planCacheKey(args), PLAN_CACHE_MAX_AGE);
  }

  function writePlanCache(args, data){
    writeJsonCache(planCacheKey(args), data);
  }

  function clearPlanCaches(){
    try{
      const remove = [];
      for(let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if(k && k.indexOf(PLAN_CACHE_PREFIX) === 0) remove.push(k);
      }
      remove.forEach(k => localStorage.removeItem(k));
    }catch(e){}
  }

  function activeView(){
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

  function makeId(){
    return 'meops_' + Date.now() + '_' + (++seq) + '_' + Math.random().toString(36).slice(2,9);
  }

  function ensureFrame(){
    if (fixedFrame && fixedFrame.isConnected) return fixedFrame;

    fixedFrame = document.createElement('iframe');
    fixedFrame.id = 'meopsWaterFrame';
    fixedFrame.name = 'meopsWaterFrame';
    fixedFrame.title = 'M&E OPS data channel';
    fixedFrame.style.display = 'none';
    fixedFrame.setAttribute('aria-hidden','true');

    (document.body || document.documentElement).appendChild(fixedFrame);
    return fixedFrame;
  }

  function timeoutFor(method){
    if (method === 'getDashboardData') return 90000;
    if (method === 'getMaintenancePlanData') return 90000;
    if (method === 'getMaintenanceInitialData') return 90000;
    if (WRITE_METHODS.has(method)) return 120000;
    return 60000;
  }

  function pump(){
    if (pending || !queue.length) return;

    const task = queue.shift();
    task.started = true;
    const frame = ensureFrame();
    const requestId = makeId();
    const started = performance.now();

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = BACKEND_URL;
    form.target = frame.name;
    form.style.display = 'none';
    form.acceptCharset = 'UTF-8';

    const fields = {
      api: 'meopsrpc',
      requestId: requestId,
      action: task.method,
      args: JSON.stringify(task.args || []),
      project: PROJECT_ID
    };

    Object.keys(fields).forEach(function(name){
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = fields[name];
      form.appendChild(input);
    });

    (document.body || document.documentElement).appendChild(form);

    const timer = setTimeout(function(){
      if (!pending || pending.id !== requestId) return;

      const p = pending;
      pending = null;

      p.reject(new Error(
        'Máy chủ chưa phản hồi sau ' +
        Math.round((performance.now() - started) / 1000) +
        ' giây.'
      ));

      setTimeout(pump,0);
    }, timeoutFor(task.method));

    pending = {
      id: requestId,
      method: task.method,
      resolve: task.resolve,
      reject: task.reject,
      timer: timer
    };

    try{
      form.submit();
    }catch(err){
      clearTimeout(timer);
      pending = null;
      task.reject(err);
      setTimeout(pump,0);
    }

    setTimeout(function(){
      try{ form.remove(); }catch(e){}
    },60000);
  }

  window.addEventListener('message', function(event){
    const d = event.data;

    if (!d || d.type !== 'MEOPS_RPC_RESULT' || !pending) return;
    if (String(d.requestId || '') !== String(pending.id || '')) return;

    const p = pending;
    pending = null;
    clearTimeout(p.timer);

    if (d.ok) p.resolve(d.data);
    else p.reject(new Error(d.error || 'Backend M&E OPS trả lỗi.'));

    setTimeout(pump,0);
  });

  function rpcKey(method,args){
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

  function prefetchMaintenanceDay(){
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

  function prefetchMaintenanceResult(){
    if(resultPrefetchStarted) return;
    resultPrefetchStarted = true;

    // Nếu đã có dữ liệu dùng ngay thì không cần tranh tài nguyên lúc khởi động.
    if(readMaintenanceResultCache()) return;

    setTimeout(function(){
      rpc('getMaintenanceInitialData', [], {priority:85})
        .then(function(data){
          writeMaintenanceResultCache(data);
        })
        .catch(function(){
          // Đây chỉ là prefetch. Khi người dùng mở tab sẽ tự thử lại.
        });
    }, 250);
  }

  function makeRunner(state){
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

  window.google = window.google || {};
  window.google.script = window.google.script || {};

  Object.defineProperty(window.google.script,'run',{
    configurable:true,
    get:function(){
      return makeRunner({success:null,failure:null});
    }
  });

  // Sau khi Dashboard chính hoàn tất, nạp trước danh sách Nhập kết quả.
  // KPI/Kế hoạch nền được lùi lại để không tranh đường truyền với tác vụ người dùng.
  window.addEventListener('meops:dashboard-ready', function(){
    prefetchMaintenanceResult();
    prefetchMaintenanceDay();
  }, {once:true});

  window.MEOPS_STANDALONE = {
    version:'WATER-PROGRESSIVE-3',
    mode:'stale-while-revalidate + active-view-priority + dedupe + ordered-prefetch',
    backendUrl:BACKEND_URL,
    dashboardCacheMinutes:10080,
    maintenanceCacheMinutes:10080,
    resultCacheMinutes:43200,
    incidentCacheMinutes:10080
  };
})();