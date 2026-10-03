(function(){
  'use strict';

  const BUILD='water-clear-pending-action-row-v1';
  const ROW_ID='waterCaptureActionRow';
  const BTN_ID='waterClearPendingBtn';

  function plain(v){
    return String(v==null?'':v)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D')
      .toUpperCase()
      .replace(/\s+/g,' ')
      .trim();
  }

  function findAction(words){
    const nodes=Array.from(document.querySelectorAll('button,[role="button"],a.btn,input[type="button"],input[type="submit"]'));
    return nodes.find(function(node){
      const raw=node.tagName==='INPUT'?node.value:(node.getAttribute('aria-label')||node.textContent||'');
      const t=plain(raw);
      return words.every(function(w){return t.indexOf(w)>=0;});
    })||null;
  }

  function addStyle(){
    if(document.getElementById('waterClearPendingActionStyle'))return;
    const style=document.createElement('style');
    style.id='waterClearPendingActionStyle';
    style.textContent=`
      #${ROW_ID}{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:6px!important;width:100%!important;align-items:stretch!important}
      #${ROW_ID}>button,#${ROW_ID}>a,#${ROW_ID}>[role="button"]{width:100%!important;min-width:0!important;margin:0!important;padding-left:4px!important;padding-right:4px!important;font-size:12px!important;white-space:nowrap!important}
      #${BTN_ID}{border:1px solid #c94a3a!important;background:#fff!important;color:#a52f23!important;font-weight:800!important}
      #discardInvalidQrBtn{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function install(){
    addStyle();

    const logoutBtn=findAction(['DANG','XUAT']);
    const syncBtn=document.getElementById('syncBtn')||findAction(['DONG','BO']);
    if(!logoutBtn||!syncBtn)return false;

    let row=document.getElementById(ROW_ID);
    if(!row){
      row=document.createElement('div');
      row.id=ROW_ID;
      const parent=syncBtn.parentElement||logoutBtn.parentElement;
      if(!parent)return false;
      parent.insertBefore(row,syncBtn);
    }

    let clearBtn=document.getElementById(BTN_ID);
    if(!clearBtn){
      clearBtn=document.createElement('button');
      clearBtn.id=BTN_ID;
      clearBtn.type='button';
      clearBtn.textContent='XÓA ẢNH CHỜ';
    }

    if(logoutBtn.parentElement!==row)row.appendChild(logoutBtn);
    if(clearBtn.parentElement!==row)row.appendChild(clearBtn);
    if(syncBtn.parentElement!==row)row.appendChild(syncBtn);

    if(row.children[0]!==logoutBtn)row.insertBefore(logoutBtn,row.firstChild);
    if(clearBtn.nextElementSibling!==syncBtn)row.insertBefore(clearBtn,syncBtn);

    return true;
  }

  function boot(){
    install();
    if(window.MutationObserver){
      new MutationObserver(function(){install();}).observe(document.documentElement,{childList:true,subtree:true});
    }
    setInterval(install,1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();

  window.WATER_CLEAR_PENDING_ACTION_ROW_BUILD=BUILD;
})();
