(function(){
  'use strict';

  const BUILD='water-manager-period-split-v1';
  const FRAME_ID='waterManagerEmbedFrame';
  const WRAP_ID='waterPeriodSplitWrap';
  const YEAR_ID='waterPeriodYear';
  const MONTH_ID='waterPeriodMonth';
  let lastFrame=null;
  let observer=null;
  let syncing=false;

  function canon(v){
    const m=String(v||'').trim().match(/^(\d{1,2})\/(\d{4})$/);
    return m?String(Number(m[1])).padStart(2,'0')+'/'+m[2]:'';
  }

  function parts(v){
    const c=canon(v);
    if(!c)return null;
    const a=c.split('/');
    return {month:a[0],year:a[1]};
  }

  function optionPeriods(source){
    return Array.from(source&&source.options||[])
      .map(function(o){return canon(o.value||o.textContent);})
      .filter(Boolean);
  }

  function ensureStyle(d){
    if(d.getElementById('waterManagerPeriodSplitStyle'))return;
    const st=d.createElement('style');
    st.id='waterManagerPeriodSplitStyle';
    st.textContent=`
      #mainMonth{display:none!important}
      #${WRAP_ID}{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;width:100%!important}
      #${WRAP_ID} .waterPeriodField{min-width:0!important}
      #${WRAP_ID} .waterPeriodField label{display:block!important;margin:0 0 3px!important;font-size:11px!important;line-height:1.1!important;font-weight:800!important;color:#536672!important}
      #${WRAP_ID} select{width:100%!important;min-width:0!important;height:31px!important;min-height:31px!important;padding:4px 7px!important;border:1px solid #c8d2da!important;border-radius:8px!important;background:#fff!important;font-size:12.5px!important;font-weight:700!important;color:#172033!important}
      @media(max-width:760px){#${WRAP_ID} select{height:44px!important;min-height:44px!important;font-size:16px!important}}
    `;
    d.head.appendChild(st);
  }

  function setOptions(select,values,current,formatter){
    const keep=String(current||'');
    select.innerHTML='';
    values.forEach(function(v){
      const o=select.ownerDocument.createElement('option');
      o.value=String(v);
      o.textContent=formatter?formatter(v):String(v);
      select.appendChild(o);
    });
    if(values.indexOf(keep)>=0)select.value=keep;
    else if(values.length)select.value=String(values[0]);
  }

  function rebuild(d,source){
    if(syncing)return;
    const wrap=d.getElementById(WRAP_ID);
    const yearSel=d.getElementById(YEAR_ID);
    const monthSel=d.getElementById(MONTH_ID);
    if(!wrap||!yearSel||!monthSel||!source)return;

    syncing=true;
    try{
      const periods=optionPeriods(source);
      const selected=parts(source.value)||parts(periods[0]);
      const years=Array.from(new Set(periods.map(function(p){return p.slice(3);})))
        .sort(function(a,b){return Number(b)-Number(a);});
      const wantedYear=selected&&selected.year||yearSel.value||years[0]||'';
      setOptions(yearSel,years,wantedYear);

      const activeYear=yearSel.value;
      const months=periods
        .filter(function(p){return p.slice(3)===activeYear;})
        .map(function(p){return p.slice(0,2);})
        .filter(function(v,i,a){return a.indexOf(v)===i;})
        .sort(function(a,b){return Number(b)-Number(a);});
      const wantedMonth=selected&&selected.year===activeYear?selected.month:(monthSel.value||months[0]||'');
      setOptions(monthSel,months,wantedMonth,function(v){return 'Tháng '+Number(v);});
    }finally{
      syncing=false;
    }
  }

  function applySelection(frame){
    if(syncing)return;
    try{
      const d=frame.contentDocument;
      const source=d.getElementById('mainMonth');
      const yearSel=d.getElementById(YEAR_ID);
      const monthSel=d.getElementById(MONTH_ID);
      if(!source||!yearSel||!monthSel)return;
      const value=String(Number(monthSel.value)).padStart(2,'0')+'/'+yearSel.value;
      if(source.value===value)return;
      source.value=value;
      if(source.value!==value)return;
      const Ev=frame.contentWindow.Event||Event;
      source.dispatchEvent(new Ev('change',{bubbles:true}));
    }catch(e){}
  }

  function install(frame){
    try{
      const d=frame&&frame.contentDocument;
      if(!d||!d.head)return false;
      const source=d.getElementById('mainMonth');
      if(!source)return false;

      ensureStyle(d);

      let wrap=d.getElementById(WRAP_ID);
      if(!wrap){
        wrap=d.createElement('div');
        wrap.id=WRAP_ID;

        const yearField=d.createElement('div');
        yearField.className='waterPeriodField';
        const yearLabel=d.createElement('label');
        yearLabel.textContent='Năm';
        const yearSel=d.createElement('select');
        yearSel.id=YEAR_ID;
        yearField.append(yearLabel,yearSel);

        const monthField=d.createElement('div');
        monthField.className='waterPeriodField';
        const monthLabel=d.createElement('label');
        monthLabel.textContent='Tháng';
        const monthSel=d.createElement('select');
        monthSel.id=MONTH_ID;
        monthField.append(monthLabel,monthSel);

        wrap.append(yearField,monthField);
        source.insertAdjacentElement('afterend',wrap);

        yearSel.addEventListener('change',function(){
          const periods=optionPeriods(source);
          const months=periods
            .filter(function(p){return p.slice(3)===yearSel.value;})
            .map(function(p){return p.slice(0,2);})
            .filter(function(v,i,a){return a.indexOf(v)===i;})
            .sort(function(a,b){return Number(b)-Number(a);});
          setOptions(monthSel,months,months[0]||'',function(v){return 'Tháng '+Number(v);});
          applySelection(frame);
        });
        monthSel.addEventListener('change',function(){applySelection(frame);});
      }

      rebuild(d,source);

      if(lastFrame!==frame){
        lastFrame=frame;
        if(observer)try{observer.disconnect();}catch(e){}
        const Obs=frame.contentWindow.MutationObserver||MutationObserver;
        observer=new Obs(function(){setTimeout(function(){rebuild(d,source);},0);});
        observer.observe(source,{childList:true,subtree:true,attributes:true,attributeFilter:['value']});
        source.addEventListener('change',function(){setTimeout(function(){rebuild(d,source);},0);});
      }
      return true;
    }catch(e){return false;}
  }

  function tick(){
    const frame=document.getElementById(FRAME_ID);
    if(frame)install(frame);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});
  else tick();
  setInterval(tick,1200);
  window.addEventListener('WATER_AUTH_OK',function(){setTimeout(tick,200);});

  window.WATER_MANAGER_PERIOD_SPLIT_BUILD=BUILD;
})();
