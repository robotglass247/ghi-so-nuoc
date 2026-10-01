(function(){
  'use strict';

  function esc(v){
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function installStyle(){
    if(document.getElementById('alert-panel-v1-style')) return;
    const style=document.createElement('style');
    style.id='alert-panel-v1-style';
    style.textContent=`
      #alertList{
        max-height:360px;
        overflow-y:auto;
        overflow-x:hidden;
        padding-right:4px;
        scrollbar-gutter:stable;
        overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
      }
      #alertList::-webkit-scrollbar{width:8px}
      #alertList::-webkit-scrollbar-track{background:#f2f5f9;border-radius:99px}
      #alertList::-webkit-scrollbar-thumb{background:#b8c8da;border-radius:99px}
      #alertList::-webkit-scrollbar-thumb:hover{background:#91a8c1}
      @media(max-width:760px){
        #alertList{max-height:330px;padding-right:2px}
      }
    `;
    document.head.appendChild(style);
  }

  function installPatch(){
    if(typeof renderTabs!=='function' || typeof renderAlerts!=='function'){
      setTimeout(installPatch,80);
      return;
    }

    installStyle();

    renderTabs=function(){
      const c=(typeof DATA!=='undefined' && DATA && DATA.counts) ? DATA.counts : {};
      let overdueTotal=Number(c.overdue||0);
      if(typeof DATA!=='undefined' && DATA && DATA.kpi){
        const n=Number(DATA.kpi.overdue);
        if(Number.isFinite(n)) overdueTotal=n;
      }

      const tabs=[
        ['overdue','Quá hạn ('+overdueTotal+')'],
        ['incident','Sự cố ('+Number(c.incident||0)+')'],
        ['maintenance','Bảo trì ('+Number(c.maintenance||0)+')'],
        ['inspection','Kiểm định ('+Number(c.inspection||0)+')']
      ];

      const host=document.getElementById('alertTabs');
      if(!host) return;
      host.innerHTML=tabs.map(t=>`<button class="tab ${currentAlert===t[0]?'active':''}" data-alert="${t[0]}">${t[1]}</button>`).join('');
      host.onclick=e=>{
        const b=e.target.closest('[data-alert]');
        if(!b) return;
        currentAlert=b.dataset.alert;
        renderTabs();
        renderAlerts(currentAlert);
      };
    };

    renderAlerts=function(key){
      const arr=(typeof DATA!=='undefined' && DATA && DATA.alerts && Array.isArray(DATA.alerts[key])) ? DATA.alerts[key] : [];
      const host=document.getElementById('alertList');
      if(!host) return;
      host.innerHTML=arr.length
        ? arr.map(a=>`<div class="alertrow"><div>${a.icon||''}</div><div>${esc(a.title)}</div><div class="badge">${esc(a.badge)}</div><div>${esc(a.location)}</div></div>`).join('')
        : '<div class="empty">Không có cảnh báo trong nhóm này.</div>';
      host.scrollTop=0;
    };

    if(typeof DATA!=='undefined' && DATA){
      renderTabs();
      renderAlerts(typeof currentAlert!=='undefined' ? currentAlert : 'overdue');
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(installPatch,0),{once:true});
  }else{
    setTimeout(installPatch,0);
  }
})();
