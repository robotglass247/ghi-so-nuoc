from pathlib import Path

# 1) Adapter: keep stale cache for instant paint, stop automatic plan prefetch.
p=Path('me-ops-auto/adapter-v4.js')
s=p.read_text(encoding='utf-8')
s=s.replace("const DASH_CACHE_MAX_AGE = 5 * 60 * 1000;", "const DASH_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;", 1)
s=s.replace("const PLAN_CACHE_MAX_AGE = 5 * 60 * 1000;", "const PLAN_CACHE_MAX_AGE = 60 * 60 * 1000;", 1)
s=s.replace("                writeDashboardCache(data);\n                prefetchMaintenanceDay();", "                writeDashboardCache(data);", 1)
p.write_text(s,encoding='utf-8')

# 2) Master runtime: avoid duplicate/background RPCs at startup; reuse login cache.
p=Path('me-ops-auto/master-runtime.js')
s=p.read_text(encoding='utf-8')
old="""  function start(){
    apply();
    setTimeout(loadCatalogSetup,250);
    setTimeout(injectKpiLiveSync,350);
    setTimeout(injectResultModule,450);
    setTimeout(injectTodayWorkType,520);
    setTimeout(hydrate,650);
  }
"""
new="""  function hydrateFromCache(){
    try{
      const project=String(c.projectCode||'').trim().toUpperCase();
      if(!project) return;
      const raw=localStorage.getItem('meops_public_project_v2_'+project);
      if(!raw) return;
      const box=JSON.parse(raw);
      const p=box&&box.data?box.data:null;
      if(!p) return;
      if(p.projectName)c.projectName=p.projectName;
      if(p.siteName)c.siteName=p.siteName;
      if(p.projectCode)c.projectCode=p.projectCode;
      if(p.version)c.version=p.version;
      apply();
    }catch(e){}
  }

  function start(){
    apply();
    hydrateFromCache();
    setTimeout(loadCatalogSetup,900);
    setTimeout(injectResultModule,1200);
    setTimeout(hydrate,10000);
  }
"""
if old not in s:
    raise SystemExit('master-runtime start block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# 3) Result module: load system list only when user touches selector.
p=Path('me-ops-auto/result-module-v2.js')
s=p.read_text(encoding='utf-8')
s=s.replace("  let operationType='Vận hành';", "  let operationType='Vận hành';\n  let systemsLoaded=false;\n  let systemsLoading=false;", 1)
old="""  function populateSystems(){
    const sel=byId('vh-system');
    if(!sel||!readyRpc()) return;
    google.script.run
      .withSuccessHandler(function(x){
        const systems=(x&&Array.isArray(x.systems))?x.systems:[];
        const chosen=systems.filter(function(s){return s.selected;});
        const rows=(chosen.length?chosen:systems);
        sel.innerHTML='<option value="">-- Chọn hệ thống --</option>'+rows.map(function(s){return '<option value="'+esc(s.name)+'">'+esc(s.name)+' ('+esc(s.code)+')</option>';}).join('');
      })
      .withFailureHandler(function(){})
      .getProjectCatalog();
  }
"""
new="""  function populateSystems(){
    const sel=byId('vh-system');
    if(!sel||!readyRpc()||systemsLoaded||systemsLoading) return;
    systemsLoading=true;
    google.script.run
      .withSuccessHandler(function(x){
        systemsLoading=false;
        systemsLoaded=true;
        const systems=(x&&Array.isArray(x.systems))?x.systems:[];
        const chosen=systems.filter(function(s){return s.selected;});
        const rows=(chosen.length?chosen:systems);
        sel.innerHTML='<option value="">-- Chọn hệ thống --</option>'+rows.map(function(s){return '<option value="'+esc(s.name)+'">'+esc(s.name)+' ('+esc(s.code)+')</option>';}).join('');
      })
      .withFailureHandler(function(){systemsLoading=false;})
      .getProjectCatalog();
  }
"""
if old not in s:
    raise SystemExit('result populateSystems block not found')
s=s.replace(old,new,1)
old="""    populateSystems();
    setType('Vận hành');
    return true;
"""
new="""    const systemSelect=byId('vh-system');
    if(systemSelect && systemSelect.getAttribute('data-lazy-systems')!=='1'){
      systemSelect.setAttribute('data-lazy-systems','1');
      systemSelect.addEventListener('pointerdown',populateSystems,{once:true});
      systemSelect.addEventListener('focus',populateSystems,{once:true});
    }
    setType('Vận hành');
    return true;
"""
if old not in s:
    raise SystemExit('result startup populateSystems call not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# 4) KPI 4-period table: defer its four requests until after dashboard paint.
p=Path('me-ops-auto/kpi-overview-v1.js')
s=p.read_text(encoding='utf-8')
s=s.replace("  let started = false;", "  let started = false;\n  let loadStarted = false;", 1)
old="""  function start(){
    if(started) return;
    started = true;
    injectStyle();
    render();
    watchHost();
    setTimeout(function(){ loadMode(0); }, 900);
  }
"""
new="""  function startLoad(){
    if(loadStarted) return;
    loadStarted=true;
    loadMode(0);
  }

  function scheduleStartLoad(){
    const kick=function(){setTimeout(startLoad,2800);};
    if(window.__MEOPS_DASHBOARD_READY__) kick();
    else window.addEventListener('meops:dashboard-ready',kick,{once:true});
    setTimeout(startLoad,10000);
  }

  function start(){
    if(started) return;
    started = true;
    injectStyle();
    render();
    watchHost();
    scheduleStartLoad();
  }
"""
if old not in s:
    raise SystemExit('kpi overview start block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# 5) App: reveal shell quickly, warn later, delay secondary incident feed, bust caches.
p=Path('me-ops-auto/app.html')
s=p.read_text(encoding='utf-8')
old="""  // Không để màn hình bị khóa vô thời hạn nếu Google Sheets / Apps Script phản hồi chậm.
  const slowTimer=setTimeout(()=>{
    if(finished) return;

    if(loading) loading.classList.add('hide');

    showDashboardWarning(
      'Dữ liệu đang phản hồi chậm. Dashboard đã được mở để bạn tiếp tục sử dụng; '+
      'khi máy chủ trả dữ liệu, màn hình sẽ tự cập nhật. Có thể bấm ↻ để thử lại.'
    );
  },15000);
"""
new="""  // Không khóa giao diện trong lúc chờ Apps Script: mở khung trang gần như ngay lập tức.
  const revealTimer=setTimeout(()=>{
    if(finished) return;
    if(loading) loading.classList.add('hide');
  },900);

  // Chỉ cảnh báo khi backend thực sự chậm; dữ liệu vẫn tự cập nhật khi phản hồi về.
  const slowTimer=setTimeout(()=>{
    if(finished) return;
    showDashboardWarning(
      'Dữ liệu đang phản hồi chậm. Bạn vẫn có thể dùng menu; '+
      'khi máy chủ trả dữ liệu, Dashboard sẽ tự cập nhật.'
    );
  },8000);
"""
if old not in s:
    raise SystemExit('app slow timer block not found')
s=s.replace(old,new,1)
s=s.replace("      clearTimeout(slowTimer);", "      clearTimeout(revealTimer);\n      clearTimeout(slowTimer);", 2)
s=s.replace("        DATA=data;\n        renderAll();", "        DATA=data;\n        renderAll();\n        window.__MEOPS_DASHBOARD_READY__=true;\n        window.dispatchEvent(new CustomEvent('meops:dashboard-ready'));", 1)
s=s.replace("  // Lấy thêm sự cố nhập trực tiếp từ sheet SU_CO.\n  loadIncidentFeed();", "  // Lấy thêm sự cố SU_CO sau khi Dashboard đã hiển thị để không chặn lần mở đầu.\n  clearTimeout(window.__meOpsIncidentFeedTimer);\n  window.__meOpsIncidentFeedTimer=setTimeout(loadIncidentFeed,1800);", 1)
s=s.replace('./master-runtime.js?v=3','./master-runtime.js?v=speed-1',1)
s=s.replace('./today-worktype-v1.js?v=3','./today-worktype-v1.js?v=speed-1',1)
s=s.replace('./adapter-v4.js?v=auto-v1','./adapter-v4.js?v=speed-1',1)
s=s.replace('./kpi-overview-v1.js?v=auto-v1','./kpi-overview-v1.js?v=speed-1',1)
p.write_text(s,encoding='utf-8')
