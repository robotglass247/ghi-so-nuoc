from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"{label}: marker not found")
    return text.replace(old, new, 1)


# ============================================================
# 1) adapter-v4.js: cache-first delivery with source metadata.
# ============================================================
p = Path("me-ops-auto/adapter-v4.js")
s = p.read_text(encoding="utf-8")

s = replace_once(
    s,
    "const DASH_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;",
    "const DASH_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;",
    "dashboard cache ttl",
)
s = replace_once(
    s,
    "const PLAN_CACHE_MAX_AGE = 60 * 60 * 1000;",
    "const PLAN_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;",
    "plan cache ttl",
)

old = """  function readDashboardCache(){
    return readJsonCache(DASH_CACHE_KEY, DASH_CACHE_MAX_AGE);
  }
"""
new = """  function withDeliveryMeta(data, source, ts){
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
"""
s = replace_once(s, old, new, "delivery metadata helper")

# This exact expression occurs for both dashboard cache and plan cache.
s = s.replace(
    "state.success(cached.data);",
    "state.success(withDeliveryMeta(cached.data,'cache',cached.ts));",
)
if "state.success(cached.data);" in s:
    raise SystemExit("cache callback replacement incomplete")

old = """              if (typeof state.success === 'function'){
                state.success(data);
              }
"""
new = """              if (typeof state.success === 'function'){
                const delivered = (prop === 'getDashboardData' || prop === 'getMaintenancePlanData')
                  ? withDeliveryMeta(data,'live',Date.now())
                  : data;
                state.success(delivered);
              }
"""
s = replace_once(s, old, new, "live delivery callback")

s = s.replace("version:'WATER-SPEED-4'", "version:'WATER-PROGRESSIVE-1'", 1)
s = s.replace(
    "mode:'single-fixed-iframe + dashboard-cache + maintenance-cache + prefetch'",
    "mode:'cache-first + ordered-dashboard-refresh + serialized-background-rpc'",
    1,
)
s = s.replace("dashboardCacheMinutes:5", "dashboardCacheMinutes:10080", 1)
s = s.replace("maintenanceCacheMinutes:5", "maintenanceCacheMinutes:10080", 1)
p.write_text(s, encoding="utf-8")


# ============================================================
# 2) app.html: paint cache immediately, then refresh visible blocks
#    in user-priority order. Defer secondary data until primary paint.
# ============================================================
p = Path("me-ops-auto/app.html")
s = p.read_text(encoding="utf-8")

# Never display owner/department as a fake work type.
s = s.replace("r.workType || r.owner || '—'", "r.workType || '—'")

start = s.find("function loadData(force=false){")
end = s.find("function renderKpis(){", start)
if start < 0 or end < 0:
    raise SystemExit("app load/render block not found")

new_block = r'''let __dashboardRenderToken=0;

function setDashboardSyncStatus(message,state='syncing'){
  let el=document.getElementById('dashboard-sync-status');
  if(!el){
    el=document.createElement('div');
    el.id='dashboard-sync-status';
    el.style.cssText=[
      'position:fixed','right:16px','bottom:16px','z-index:9997',
      'max-width:min(88vw,420px)','padding:8px 11px','border-radius:10px',
      'font-size:11.5px','font-weight:700','line-height:1.35',
      'box-shadow:0 8px 24px rgba(20,60,110,.13)','transition:opacity .2s ease',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(el);
  }
  const palette=state==='done'
    ? ['#eefaf3','#bfe9cf','#147a48']
    : state==='warn'
      ? ['#fff8e6','#ffd27a','#7a5200']
      : ['#eef5ff','#bfd7f8','#1f5fae'];
  el.style.background=palette[0];
  el.style.border='1px solid '+palette[1];
  el.style.color=palette[2];
  el.style.opacity='1';
  el.textContent=message;
  clearTimeout(window.__meOpsSyncHideTimer);
  if(state==='done'){
    window.__meOpsSyncHideTimer=setTimeout(()=>{
      if(el) el.style.opacity='0';
    },1500);
  }
}

function renderDashboardMeta(source='live'){
  safeDashboardRender('Ngày dữ liệu',()=>{
    const el=document.getElementById('todayLabel');
    if(el && DATA && DATA.meta) el.textContent='— '+(DATA.meta.date||'');
  });

  safeDashboardRender('Nguồn dữ liệu',()=>{
    const el=document.getElementById('source');
    if(el && DATA && DATA.meta){
      const prefix=source==='cache' ? 'Dữ liệu lần trước' : 'Dữ liệu mới';
      el.textContent=prefix+' · Nguồn: '+(DATA.meta.title||'')+
        ' · Cập nhật: '+(DATA.meta.generatedAt||'');
    }
  });
}

function renderAll(options={}){
  const source=options.source||'live';
  const loadSecondary=options.loadSecondary!==false;
  safeDashboardRender('KPI',renderKpis);
  safeDashboardRender('Truy cập nhanh',renderQuick);
  safeDashboardRender('Công việc hôm nay',renderTasks);
  safeDashboardRender('Tab cảnh báo',renderTabs);
  safeDashboardRender('Danh sách cảnh báo',()=>renderAlerts(currentAlert));
  safeDashboardRender('Tiến độ công việc',renderProgress);
  safeDashboardRender('Kế hoạch bảo trì',renderMaintenance);
  safeDashboardRender('Thống kê sự cố',renderIncidents);
  safeDashboardRender('Tài sản - Thiết bị',renderAssets);
  safeDashboardRender('Các trang chi tiết',()=>renderPages(loadSecondary));
  renderDashboardMeta(source);
}

function renderCachedDashboard(data){
  DATA=data;
  __dashboardRenderToken++;
  renderAll({source:'cache',loadSecondary:false});
  setDashboardSyncStatus('Đang hiển thị dữ liệu lần trước · đang cập nhật dữ liệu mới…','syncing');
  window.__MEOPS_DASHBOARD_CACHE_READY__=true;
  window.dispatchEvent(new CustomEvent('meops:dashboard-cache-ready'));
}

function renderFreshDashboardInOrder(data){
  DATA=data;
  const token=++__dashboardRenderToken;

  const stage=(delay,message,fn)=>setTimeout(()=>{
    if(token!==__dashboardRenderToken) return;
    setDashboardSyncStatus(message,'syncing');
    fn();
  },delay);

  stage(0,'Đang cập nhật 1/4 · KPI…',()=>{
    safeDashboardRender('KPI',renderKpis);
    renderDashboardMeta('live');
  });

  stage(70,'Đang cập nhật 2/4 · Công việc hôm nay…',()=>{
    safeDashboardRender('Công việc hôm nay',renderTasks);
  });

  stage(140,'Đang cập nhật 3/4 · Cảnh báo cần xử lý…',()=>{
    safeDashboardRender('Tab cảnh báo',renderTabs);
    safeDashboardRender('Danh sách cảnh báo',()=>renderAlerts(currentAlert));
  });

  stage(210,'Đang cập nhật 4/4 · Thống kê và tài sản…',()=>{
    safeDashboardRender('Truy cập nhanh',renderQuick);
    safeDashboardRender('Tiến độ công việc',renderProgress);
    safeDashboardRender('Kế hoạch bảo trì',renderMaintenance);
    safeDashboardRender('Thống kê sự cố',renderIncidents);
    safeDashboardRender('Tài sản - Thiết bị',renderAssets);
  });

  setTimeout(()=>{
    if(token!==__dashboardRenderToken) return;
    safeDashboardRender('Các trang chi tiết',()=>renderPages(true));
    renderDashboardMeta('live');
    window.__MEOPS_DASHBOARD_READY__=true;
    window.dispatchEvent(new CustomEvent('meops:dashboard-ready'));
    setDashboardSyncStatus('Dữ liệu mới đã cập nhật ✓','done');
  },280);
}

function loadData(force=false){
  const loading=document.getElementById('loading');
  const loader=loading ? loading.querySelector('.loader') : null;
  let liveFinished=false;
  let cacheShown=false;

  if(loading && !DATA) loading.classList.remove('hide');
  else if(loading) loading.classList.add('hide');

  if(loader){
    loader.style.color='';
    loader.textContent='Đang tải dữ liệu M&E OPS...';
  }

  const revealTimer=setTimeout(()=>{
    if(liveFinished) return;
    if(loading) loading.classList.add('hide');
  },650);

  const slowTimer=setTimeout(()=>{
    if(liveFinished) return;
    if(cacheShown || DATA){
      setDashboardSyncStatus('Dữ liệu gần nhất đang hiển thị · máy chủ vẫn đang đồng bộ…','syncing');
    }else{
      showDashboardWarning(
        'Dữ liệu mới đang phản hồi chậm. Bạn vẫn có thể dùng menu; '+
        'màn hình sẽ tự cập nhật khi máy chủ phản hồi.'
      );
    }
  },7000);

  google.script.run
    .withSuccessHandler(data=>{
      const delivery=(data&&data.__meopsDelivery)||{};
      const isCache=!force && delivery.source==='cache';

      if(isCache){
        cacheShown=true;
        clearTimeout(revealTimer);
        if(loading) loading.classList.add('hide');
        try{
          renderCachedDashboard(data);
        }catch(err){
          console.error('[M&E OPS] Lỗi render cache Dashboard',err);
        }
        return;
      }

      liveFinished=true;
      clearTimeout(revealTimer);
      clearTimeout(slowTimer);
      if(loading) loading.classList.add('hide');

      try{
        renderFreshDashboardInOrder(data);
      }catch(err){
        console.error('[M&E OPS] Lỗi render Dashboard',err);
        showDashboardWarning(
          'Dashboard nhận được dữ liệu nhưng có lỗi hiển thị: '+
          (err && err.message ? err.message : String(err))
        );
      }
    })
    .withFailureHandler(err=>{
      liveFinished=true;
      clearTimeout(revealTimer);
      clearTimeout(slowTimer);
      if(loading) loading.classList.add('hide');

      if(cacheShown || DATA){
        setDashboardSyncStatus('Đang hiển thị dữ liệu lần trước · chưa cập nhật được dữ liệu mới','warn');
      }else{
        showDashboardWarning(
          'Lỗi tải dữ liệu: '+(err && err.message ? err.message : String(err))
        );
      }
    })
    .getDashboardData(force);
}

document.getElementById('refresh').onclick=()=>loadData(true);

'''
s = s[:start] + new_block + s[end:]

s = replace_once(s, "function renderPages(){", "function renderPages(loadSecondary=true){", "renderPages signature")
old = """  // Lấy thêm sự cố SU_CO sau khi Dashboard đã hiển thị để không chặn lần mở đầu.
  clearTimeout(window.__meOpsIncidentFeedTimer);
  window.__meOpsIncidentFeedTimer=setTimeout(loadIncidentFeed,1800);
"""
new = """  // Dữ liệu phụ chỉ chạy sau khi dữ liệu chính đã hiển thị xong.
  if(loadSecondary){
    clearTimeout(window.__meOpsIncidentFeedTimer);
    window.__meOpsIncidentFeedTimer=setTimeout(loadIncidentFeed,1800);
  }
"""
s = replace_once(s, old, new, "secondary incident feed")

# Lazy-load the heavy maintenance result dataset instead of competing at startup.
s = replace_once(
    s,
    "prepareSearchInput();\n\n\n\nsetIssueRequired();\n\n\n\nload();",
    """prepareSearchInput();\n\n\n\nsetIssueRequired();\n\n\n\nlet __maintenanceResultLoading=false;\nfunction ensureMaintenanceResultLoaded(){\n  if(data || __maintenanceResultLoading) return;\n  __maintenanceResultLoading=true;\n  Promise.resolve(load()).finally(()=>{__maintenanceResultLoading=false;});\n}\n\ndocument.addEventListener('click',e=>{\n  const target=e.target&&e.target.closest?e.target.closest('[data-go=\"result\"],[data-result-tab=\"baotri\"]'):null;\n  if(target) setTimeout(ensureMaintenanceResultLoaded,0);\n});""",
    "lazy maintenance result load",
)

# App config for result entry is also secondary: load only when Result is opened.
s = replace_once(
    s,
    "openResultTab('baotri');\nresultLoadConfig();",
    """openResultTab('baotri');\nlet __resultConfigLoaded=false;\nfunction ensureResultConfigLoaded(){\n  if(__resultConfigLoaded) return;\n  __resultConfigLoaded=true;\n  resultLoadConfig();\n}\ndocument.addEventListener('click',e=>{\n  const target=e.target&&e.target.closest?e.target.closest('[data-go=\"result\"],[data-result-tab]'):null;\n  if(target) setTimeout(ensureResultConfigLoaded,0);\n});""",
    "lazy result config",
)

old = """if (['baotri','vanhanh','suco'].includes(requestedResultTab)){
  try{ go('result'); }catch(e){}
  openResultTab(requestedResultTab);
}
"""
new = """if (['baotri','vanhanh','suco'].includes(requestedResultTab)){
  try{ go('result'); }catch(e){}
  openResultTab(requestedResultTab);
  ensureResultConfigLoaded();
  if(requestedResultTab==='baotri') ensureMaintenanceResultLoaded();
}
"""
s = replace_once(s, old, new, "requested result tab lazy load")

for old, new in [
    ('./master-runtime.js?v=speed-1', './master-runtime.js?v=progressive-1'),
    ('./today-worktype-v1.js?v=speed-1', './today-worktype-v1.js?v=progressive-1'),
    ('./adapter-v4.js?v=speed-1', './adapter-v4.js?v=progressive-1'),
    ('./kpi-overview-v1.js?v=speed-1', './kpi-overview-v1.js?v=progressive-1'),
]:
    s = replace_once(s, old, new, f"cache bust {old}")

p.write_text(s, encoding="utf-8")


# ============================================================
# 3) today-worktype-v1.js: show cached work types immediately; refresh
#    only after the primary dashboard sequence or explicit Today click.
# ============================================================
p = Path("me-ops-auto/today-worktype-v1.js")
s = p.read_text(encoding="utf-8")
s = replace_once(s, "const CACHE_MAX_AGE=10*60*1000;", "const CACHE_MAX_AGE=24*60*60*1000;", "worktype cache ttl")
s = replace_once(s, "  let patched=false;", "  let patched=false;\n  let refreshTimer=null;", "worktype refresh timer")
s = replace_once(
    s,
    "  function loadTypes(){\n",
    """  function scheduleLoadTypes(delay){\n    clearTimeout(refreshTimer);\n    refreshTimer=setTimeout(loadTypes,Math.max(0,Number(delay||0)));\n  }\n\n  function loadTypes(){\n""",
    "worktype scheduler",
)

old = """  function patchRender(){
    if(patched) return true;
    if(typeof renderTasks!=='function') return false;
    const original=renderTasks;
    window.renderTasks=function(){
      original.apply(this,arguments);
      renderAll();
      loadTypes();
    };
    patched=true;
    return true;
  }
"""
new = """  function patchRender(){
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
"""
s = replace_once(s, old, new, "worktype render patch")

start = s.find("  function start(){")
end = s.find("\n  if(document.readyState==='loading')", start)
if start < 0 or end < 0:
    raise SystemExit("worktype start block not found")
new_start = """  function start(){
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
"""
s = s[:start] + new_start + s[end:]
p.write_text(s, encoding="utf-8")


# ============================================================
# 4) kpi-overview-v1.js: cache can paint immediately, but a cache+live
#    double callback must advance the four-period chain only once.
# ============================================================
p = Path("me-ops-auto/kpi-overview-v1.js")
s = p.read_text(encoding="utf-8")
old = """    google.script.run
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
"""
new = """    let advanced=false;
    const advance=function(){
      if(advanced) return;
      advanced=true;
      setTimeout(()=>loadMode(index+1),0);
    };

    google.script.run
      .withSuccessHandler(function(data){
        state[mode] = data || {};
        errors[mode] = false;
        render();
        advance();
      })
      .withFailureHandler(function(){
        errors[mode] = true;
        render();
        advance();
      })
      .getMaintenancePlanData(mode, year);
"""
s = replace_once(s, old, new, "kpi callback guard")

old = """  function scheduleStartLoad(){
    const kick=function(){setTimeout(startLoad,2800);};
    if(window.__MEOPS_DASHBOARD_READY__) kick();
    else window.addEventListener('meops:dashboard-ready',kick,{once:true});
    setTimeout(startLoad,10000);
  }
"""
new = """  function scheduleStartLoad(){
    // Cached KPI periods can appear immediately. Live plan RPCs still use the
    // adapter's FIFO channel and therefore do not overtake the dashboard call.
    setTimeout(startLoad,260);
  }
"""
s = replace_once(s, old, new, "kpi schedule")
p.write_text(s, encoding="utf-8")

print("Progressive cache-first loading patch prepared successfully.")
