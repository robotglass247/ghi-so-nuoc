from pathlib import Path
import re

BUILD='879-main905'
MARK='/* STAFF_COMPACT_MAIN905 */'

ui=Path('water-ui3.js')
s=ui.read_text(encoding='utf-8')

compact=r'''

/* STAFF_COMPACT_MAIN905 */
(function(){
  'use strict';

  const STYLE_ID='staffCompactMain905Style';
  const LIST_ID='staffCompactList';

  function addStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #staffSelect{display:none !important;}
      #staffModal .modalIn{
        width:max-content !important;
        max-width:calc(100vw - 24px) !important;
        padding:12px 14px !important;
      }
      #staffModal .modalTitle{
        margin:0 0 7px !important;
        white-space:nowrap !important;
        font-size:16px !important;
        line-height:1.15 !important;
      }
      #staffCompactList{
        margin:0 auto !important;
        border:1px solid #d6d6d6 !important;
        border-radius:8px !important;
        overflow-x:hidden !important;
        overflow-y:auto !important;
        max-height:min(48vh,320px) !important;
        background:#fff !important;
      }
      #staffCompactList .staffCompactItem{
        display:flex !important;
        align-items:center !important;
        gap:5px !important;
        width:100% !important;
        min-height:0 !important;
        height:auto !important;
        margin:0 !important;
        padding:5px 8px !important;
        border:0 !important;
        border-bottom:1px solid #e7e7e7 !important;
        border-radius:0 !important;
        background:#fff !important;
        color:#111 !important;
        font-family:Arial,sans-serif !important;
        font-size:16px !important;
        font-weight:400 !important;
        line-height:1.15 !important;
        text-align:left !important;
        white-space:nowrap !important;
        box-shadow:none !important;
      }
      #staffCompactList .staffCompactItem:last-child{border-bottom:0 !important;}
      #staffCompactList .staffCompactItem.isSelected{
        background:#eef6ff !important;
        font-weight:700 !important;
      }
      #staffCompactList .staffCompactCheck{
        display:inline-block !important;
        flex:0 0 16px !important;
        width:16px !important;
        text-align:center !important;
        font-size:14px !important;
        line-height:1 !important;
      }
      #staffCompactList .staffCompactName{
        display:block !important;
        overflow:hidden !important;
        text-overflow:ellipsis !important;
        white-space:nowrap !important;
      }
    `;
    document.head.appendChild(style);
  }

  function data(){
    try{return Array.isArray(staffList)?staffList:[];}catch(e){return [];}
  }

  function selectedCode(){
    try{
      if(typeof getStaffCode==='function')return String(getStaffCode()||'').trim().toUpperCase();
    }catch(e){}
    try{return String(localStorage.getItem('water_staff')||'').trim().toUpperCase();}catch(e){return '';}
  }

  function ensureList(){
    addStyle();
    const sel=document.getElementById('staffSelect');
    if(!sel)return null;
    sel.setAttribute('aria-hidden','true');
    sel.tabIndex=-1;
    let list=document.getElementById(LIST_ID);
    if(!list){
      list=document.createElement('div');
      list.id=LIST_ID;
      list.setAttribute('role','listbox');
      sel.insertAdjacentElement('afterend',list);
    }
    return list;
  }

  function measure(text,font){
    const c=document.createElement('canvas');
    const ctx=c.getContext('2d');
    ctx.font=font||'16px Arial';
    return ctx.measureText(String(text||'')).width;
  }

  function fitCompactStaff(){
    const list=ensureList();
    if(!list)return;
    const rows=data();
    let longest=0;
    rows.forEach(x=>{longest=Math.max(longest,measure(String(x.ten||'').trim(),'16px Arial'));});
    const nameWidth=Math.ceil(longest+16+5+18);
    const maxList=Math.max(180,window.innerWidth-56);
    const listWidth=Math.min(Math.max(nameWidth,180),maxList);
    list.style.width=listWidth+'px';

    const title=document.querySelector('#staffModal .modalTitle');
    const titleWidth=title?Math.ceil(measure(title.textContent||'','700 16px Arial')+8):0;
    const modal=document.querySelector('#staffModal .modalIn');
    if(modal){
      const modalWidth=Math.min(Math.max(listWidth+28,titleWidth+28),window.innerWidth-24);
      modal.style.width=modalWidth+'px';
    }
  }

  function renderCompactStaff(){
    const sel=document.getElementById('staffSelect');
    const list=ensureList();
    if(!sel||!list)return;

    const rows=data();
    const old=selectedCode();

    sel.innerHTML='<option value="">-- Chọn nhân sự --</option>';
    rows.forEach(x=>{
      const op=document.createElement('option');
      op.value=String(x.ma||'').trim().toUpperCase();
      op.textContent=String(x.ten||'').trim();
      sel.appendChild(op);
    });
    if(old)sel.value=old;

    list.innerHTML='';
    if(!rows.length){
      const empty=document.createElement('div');
      empty.textContent='Đang tải danh sách nhân sự...';
      empty.style.cssText='padding:6px 8px;font:16px/1.15 Arial;white-space:nowrap';
      list.appendChild(empty);
    }else{
      rows.forEach(x=>{
        const ma=String(x.ma||'').trim().toUpperCase();
        const ten=String(x.ten||'').trim();
        const b=document.createElement('button');
        b.type='button';
        b.className='staffCompactItem'+(ma===old?' isSelected':'');
        b.dataset.ma=ma;
        b.setAttribute('role','option');
        b.setAttribute('aria-selected',ma===old?'true':'false');

        const check=document.createElement('span');
        check.className='staffCompactCheck';
        check.textContent=ma===old?'✓':'';
        const name=document.createElement('span');
        name.className='staffCompactName';
        name.textContent=ten;
        b.append(check,name);

        b.addEventListener('click',()=>{
          sel.value=ma;
          list.querySelectorAll('.staffCompactItem').forEach(node=>{
            const on=node.dataset.ma===ma;
            node.classList.toggle('isSelected',on);
            node.setAttribute('aria-selected',on?'true':'false');
            const c=node.querySelector('.staffCompactCheck');
            if(c)c.textContent=on?'✓':'';
          });
        });
        list.appendChild(b);
      });
    }
    requestAnimationFrame(fitCompactStaff);
  }

  addStyle();
  window.renderStaff=renderCompactStaff;
  window.fitStaffSelectSize=fitCompactStaff;
  try{renderStaff=renderCompactStaff;}catch(e){}
  try{fitStaffSelectSize=fitCompactStaff;}catch(e){}
  window.addEventListener('resize',()=>requestAnimationFrame(fitCompactStaff));
  setTimeout(renderCompactStaff,0);
})();
'''

if MARK not in s:
    s=s.rstrip()+compact+'\n'
s=s.replace("const BUILD='878-ui3c';",f"const BUILD='{BUILD}';",1)
ui.write_text(s,encoding='utf-8')

p=Path('app.html')
s=p.read_text(encoding='utf-8')
s=s.replace("const BUILD='879-main904';",f"const BUILD='{BUILD}';",1)
p.write_text(s,encoding='utf-8')

p=Path('water-offline-sw-ui3.js')
s=p.read_text(encoding='utf-8')
s=s.replace("const CACHE='water-v879-main904';","const CACHE='water-v879-main905';",1)
s=s.replace("const BUILD='879-main904';",f"const BUILD='{BUILD}';",1)
p.write_text(s,encoding='utf-8')

p=Path('v87-background.html')
s=p.read_text(encoding='utf-8')
s=s.replace('content="879-main904"',f'content="{BUILD}"',1)
p.write_text(s,encoding='utf-8')

rel=Path('releases/main905.txt')
rel.parent.mkdir(parents=True,exist_ok=True)
rel.write_text('MAIN905\nCompact custom staff list; native Android select disabled.\nBuild: '+BUILD+'\nProduction IndexedDB remains: water_meter_v6\nSelected staff key remains: water_staff\n',encoding='utf-8')
