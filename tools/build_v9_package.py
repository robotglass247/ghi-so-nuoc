from pathlib import Path
import re, shutil

ROOT=Path('.')
SRC=ROOT/'v87-background.html'
OUT=ROOT/'v9-package'
if OUT.exists(): shutil.rmtree(OUT)
(OUT/'assets/js').mkdir(parents=True,exist_ok=True)
(OUT/'config').mkdir(parents=True,exist_ok=True)

html=SRC.read_text(encoding='utf-8')
style=re.search(r'<style>([\s\S]*?)</style>',html).group(1).strip()+"\n"
# First inline script = application core
scripts=re.findall(r'<script>([\s\S]*?)</script>',html)
core=next(s for s in scripts if 'const BACKEND_URL' in s)
offline=next((s for s in scripts if 'prepareOffline' in s), '')

# Body markup before first application script
body=re.search(r'<body>([\s\S]*?)<script>\s*const BACKEND_URL',html).group(1)
body=body.replace('<iframe id="staffFrame" title="staff"></iframe>', '<iframe name="staffFrame" id="staffFrame" title="staff"></iframe>')
body=body.replace('GHI SỐ NƯỚC V8.7.8','GHI SỐ NƯỚC V9.0.0')
body=body.replace('V8.7.8 · Lưu ảnh tối ưu','V9.0.0 · Modular')

# Extract current backend URL + fallback staff for initial project config
m=re.search(r'const BACKEND_URL\s*=\s*"([^"]+)";',core)
backend=m.group(1)
fb=re.search(r'const STAFF_FALLBACK=\[([\s\S]*?)\];',core).group(1).strip()

project_cfg=f'''/* CHỈ SỬA FILE NÀY KHI NHÂN BẢN DỰ ÁN */\n(function(g){{\n  g.WATER_PROJECT_CONFIG={{\n    projectId:'ERP_MAIN',\n    projectName:'Ghi số nước',\n    appVersion:'9.0.0',\n    backendUrl:{backend!r},\n    staffFallback:[\n{fb}\n    ],\n    features:{{offline:true,duplicateCheck:true,autoSync:true}}\n  }};\n}})(globalThis);\n'''
(OUT/'config/project.config.js').write_text(project_cfg,encoding='utf-8')
(OUT/'assets/app.css').write_text(style,encoding='utf-8')

# State declarations from original core
state=re.search(r'(let stream=null;[\s\S]*?)function byId',core).group(1)
runtime=f'''/* CORE RUNTIME - KHÔNG CHỨA THÔNG TIN RIÊNG DỰ ÁN */\nconst APP_CONFIG=globalThis.WATER_PROJECT_CONFIG||{{}};\nconst PROJECT_ID=String(APP_CONFIG.projectId||'DEFAULT').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'_');\nconst APP_VERSION=String(APP_CONFIG.appVersion||'9.0.0');\nconst BACKEND_URL=String(APP_CONFIG.backendUrl||'').trim();\nconst STAFF_CACHE_KEY='water:'+PROJECT_ID+':staff-list:v1';\nconst STAFF_FALLBACK=Array.isArray(APP_CONFIG.staffFallback)?APP_CONFIG.staffFallback:[];\nconst STORAGE={{\n  staffKey:'water:'+PROJECT_ID+':staff-selected',\n  capturePrefix:'water:'+PROJECT_ID+':capture:',\n  dbName:'water_'+PROJECT_ID+'_v1'\n}};\nif(!BACKEND_URL) throw new Error('Thiếu backendUrl trong config/project.config.js');\n{state}\nlet staffUiRequestId='';\n'''
(OUT/'assets/js/00-runtime.js').write_text(runtime,encoding='utf-8')

# Split original core by stable markers
markers=[
 ('10-ui.js','function byId','function labelFromMeter'),
 ('20-qr-camera.js','function labelFromMeter','function scheduleAutoSync'),
 ('30-capture.js','function scheduleAutoSync','function getStaffCode'),
 ('40-staff.js','function getStaffCode','function openDB'),
 ('50-storage-sync.js','function openDB','function updateNet'),
 ('60-app.js','function updateNet',None),
]

def chunk(start,end):
    a=core.index(start)
    b=core.index(end,a) if end else len(core)
    return core[a:b].strip()+"\n"

chunks={name:chunk(start,end) for name,start,end in markers}

# Project namespace replacements
for k,v in list(chunks.items()):
    v=v.replace("localStorage.getItem('water_staff')", "localStorage.getItem(STORAGE.staffKey)")
    v=v.replace("localStorage.setItem('water_staff',ma)", "localStorage.setItem(STORAGE.staffKey,ma)")
    v=v.replace("'water_capture_v86:'+normalizeMeterCode(meter)+':'+capturePeriod(date)", "STORAGE.capturePrefix+normalizeMeterCode(meter)+':'+capturePeriod(date)")
    v=v.replace("indexedDB.open('water_meter_v6',1)", "indexedDB.open(STORAGE.dbName,1)")
    v=v.replace('V8.7.8 · ','V9.0.0 · ')
    chunks[k]=v

# Integrate STAFF2 POST uistate directly, no service-worker patching.
staff=chunks['40-staff.js']
staff=staff.replace("if(source==='JSONP'||source==='Google iframe'){", "if(source==='POST uistate'){")
staff=staff.replace("if(d&&d.type==='WATER_STAFF_LIST'){\n    setStaffList(d.staff,'Google iframe');\n    return;\n  }", "if(d&&d.type==='WATER_UI_STATE'){\n    if(String(d.requestId||'')===String(staffUiRequestId||'') && Array.isArray(d.staff)){\n      setStaffList(d.staff,'POST uistate');\n    }\n    return;\n  }\n  if(d&&d.type==='WATER_STAFF_LIST'){return;}")
# replace loadStaff whole function
staff=re.sub(r"function loadStaff\(force\)\{[\s\S]*?\n\}\n\nfunction renderStaff", r'''function loadStaff(force){
  if(!staffList.length)loadLocalStaffFirst();
  if(force){
    byId('debug').textContent='Đang cập nhật nhân sự Đang làm việc...';
    byId('reloadStaffBtn').style.display='none';
  }
  if(!navigator.onLine){
    byId('debug').textContent='OFFLINE · dùng danh sách nhân sự đã lưu gần nhất.';
    return;
  }
  staffUiRequestId='v9staff_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
  const now=new Date();
  const period=String(now.getMonth()+1).padStart(2,'0')+'/'+now.getFullYear();
  const form=document.createElement('form');
  form.method='POST'; form.action=BACKEND_URL; form.target='staffFrame'; form.style.display='none';
  const values={api:'uistate',period,requestId:staffUiRequestId};
  Object.keys(values).forEach(k=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=values[k];form.appendChild(i)});
  document.body.appendChild(form); form.submit(); setTimeout(()=>{try{form.remove()}catch(e){}},60000);
  clearTimeout(staffLoadTimer);
  staffLoadTimer=setTimeout(()=>{
    renderStaff(); updateStaffName(); byId('staffSelect').style.display='block';
    byId('debug').textContent=staffList.length?'POST nhân sự chưa phản hồi · vẫn dùng cache gần nhất.':'Chưa có danh sách nhân sự · cần Online để cập nhật.';
  },15000);
}

function renderStaff''',staff,count=1)
# remove selected staff if it is no longer active after POST source
needle="staffList=normalized;\n"
insert="""staffList=normalized;\n\n  if(source==='POST uistate'){\n    const current=getStaffCode();\n    if(current && !staffList.some(x=>x.ma===current)){\n      try{localStorage.removeItem(STORAGE.staffKey)}catch(e){}\n      byId('staffName').textContent='Chưa chọn nhân sự';\n      toast('NHÂN SỰ KHÔNG CÒN ĐANG LÀM VIỆC · CHỌN LẠI',2600);\n    }\n  }\n"""
staff=staff.replace(needle,insert,1)
chunks['40-staff.js']=staff

for name,text in chunks.items():
    (OUT/'assets/js'/name).write_text(text,encoding='utf-8')

# Clean service worker: project-aware cache, no runtime source patching.
sw=r'''importScripts('./config/project.config.js');
const CFG=self.WATER_PROJECT_CONFIG||{};
const PROJECT=String(CFG.projectId||'DEFAULT').replace(/[^A-Za-z0-9_-]/g,'_');
const VER=String(CFG.appVersion||'9.0.0');
const CACHE='water-'+PROJECT+'-'+VER;
const LOCAL=[
 './','./index.html','./assets/app.css','./config/project.config.js',
 './assets/js/00-runtime.js','./assets/js/10-ui.js','./assets/js/20-qr-camera.js',
 './assets/js/30-capture.js','./assets/js/40-staff.js','./assets/js/50-storage-sync.js',
 './assets/js/60-app.js','./assets/js/70-offline-register.js','./ack.html'
];
const QR='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(LOCAL);try{await c.add(new Request(QR,{mode:'cors'}))}catch(e){}await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('water-'+PROJECT+'-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data==='WATER_OFFLINE_STATUS'&&e.ports&&e.ports[0])e.ports[0].postMessage({ready:true,build:VER,project:PROJECT})});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);const local=u.origin===self.location.origin;if(!local&&r.url!==QR)return;e.respondWith((async()=>{const c=await caches.open(CACHE);if(r.mode==='navigate'){try{const f=await fetch(r);if(f.ok)await c.put('./index.html',f.clone());return f}catch(err){return (await c.match('./index.html'))||(await c.match('./'))}}const hit=await c.match(r);if(hit)return hit;try{const f=await fetch(r);if(f.ok)await c.put(r,f.clone());return f}catch(err){return hit}})())});
'''
(OUT/'sw.js').write_text(sw,encoding='utf-8')

offline_js=r'''(function(){
  const note=document.createElement('div'); note.id='offlineReady'; note.style.cssText='font-size:12px;text-align:center;color:#555;padding:3px'; note.textContent='Đang chuẩn bị mở offline…';
  const anchor=document.getElementById('syncStatus'); if(anchor)anchor.after(note);
  async function prepareOffline(){
    if(!('serviceWorker' in navigator)){note.textContent='Trình duyệt chưa hỗ trợ Offline.';return;}
    try{
      await navigator.serviceWorker.register('./sw.js',{scope:'./'}); await navigator.serviceWorker.ready;
      const reg=await navigator.serviceWorker.ready; const worker=navigator.serviceWorker.controller||reg.active;
      if(!worker){note.textContent='Offline sẽ sẵn sàng sau lần tải lại tiếp theo.';return;}
      const ready=await new Promise(resolve=>{const ch=new MessageChannel();const t=setTimeout(()=>resolve(false),5000);ch.port1.onmessage=e=>{clearTimeout(t);resolve(!!(e.data&&e.data.ready))};worker.postMessage('WATER_OFFLINE_STATUS',[ch.port2])});
      note.textContent=ready?'✓ Sẵn sàng mở offline':'Chưa sẵn sàng Offline';
    }catch(e){note.textContent='Chưa sẵn sàng Offline; hãy mở lại khi có mạng.';}
  }
  prepareOffline();
})();
'''
(OUT/'assets/js/70-offline-register.js').write_text(offline_js,encoding='utf-8')

# Build HTML with ordered classic scripts; original global functions remain compatible.
scripts_html='\n'.join([
 '<script src="./config/project.config.js"></script>',
 '<script defer src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>',
 *[f'<script defer src="./assets/js/{n}"></script>' for n in ['00-runtime.js','10-ui.js','20-qr-camera.js','30-capture.js','40-staff.js','50-storage-sync.js','60-app.js','70-offline-register.js']]
])
index=f'''<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">\n<meta name="theme-color" content="#111111">\n<title>Ghi số nước V9</title>\n<link rel="stylesheet" href="./assets/app.css">\n{scripts_html}\n</head>\n<body>{body}</body>\n</html>\n'''
(OUT/'index.html').write_text(index,encoding='utf-8')
# ack page is safe to copy directly
if Path('ack.html').exists(): shutil.copy2('ack.html',OUT/'ack.html')

readme='''V9 MODULAR - GÓI FILE ĐẦY ĐỦ\n\nNGUYÊN TẮC: KHÔNG DÁN PATCH NHỎ. MỖI LẦN SỬA, THAY NGUYÊN FILE.\n\nNHÂN BẢN DỰ ÁN MỚI:\n1. Copy toàn bộ thư mục này.\n2. CHỈ sửa config/project.config.js: projectId, projectName, backendUrl.\n3. Không sửa URL/backend ở các module JS khác.\n4. Mỗi projectId tự có localStorage, IndexedDB và cache Offline riêng.\n\nPHÂN MODULE:\n00-runtime: cấu hình runtime + state\n10-ui: giao diện dùng chung\n20-qr-camera: QR + camera\n30-capture: chụp/duplicate\n40-staff: nhân sự\n50-storage-sync: IndexedDB + upload + đồng bộ\n60-app: online/offline/init\n70-offline-register: đăng ký Service Worker\nsw.js: cache Offline\n\nTRƯỚC KHI THAY PRODUCTION: test Online, Offline, camera, QR, nhân sự, chụp, Chờ, đồng bộ.\n'''
(OUT/'HUONG_DAN.txt').write_text(readme,encoding='utf-8')
print('BUILT',OUT)
