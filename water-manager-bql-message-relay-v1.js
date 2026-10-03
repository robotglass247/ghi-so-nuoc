(function(){
'use strict';

const BUILD='water-manager-bql-message-relay-v2-round-consumption';

function isBqlMessage(d){
  if(!d||typeof d!=='object')return false;
  const type=String(d.type||'');
  const requestId=String(d.requestId||'');
  if(!/^WATER_BQL_(?:DATA_RESULT|ACTION_RESULT|ERROR)$/.test(type))return false;
  return /^[A-Za-z0-9_-]{8,120}$/.test(requestId);
}

function roundConsumption(v){
  if(v===null||v===undefined||v==='')return v;
  const n=typeof v==='number'?v:Number(String(v).replace(',','.'));
  return Number.isFinite(n)?Math.round(n):v;
}

function normalizeBqlData(d){
  if(!d||d.type!=='WATER_BQL_DATA_RESULT'||!Array.isArray(d.rows))return d;
  d.rows.forEach(function(r){
    if(r&&typeof r==='object')r.consumption=roundConsumption(r.consumption);
  });
  return d;
}

function managerFrame(){
  return document.getElementById('waterManagerIntegratedFrame') ||
         document.getElementById('waterManagerEmbedFrame');
}

window.addEventListener('message',function(ev){
  const d=ev&&ev.data;
  if(!isBqlMessage(d))return;

  const frame=managerFrame();
  if(!frame||!frame.contentWindow)return;

  // Khong relay nguoc thong diep da den tu chinh iframe Quan ly.
  if(ev.source===frame.contentWindow)return;

  normalizeBqlData(d);

  try{
    frame.contentWindow.postMessage(d,location.origin);
  }catch(e){
    try{frame.contentWindow.postMessage(d,'*');}catch(_e){}
  }
});

window.WATER_MANAGER_BQL_MESSAGE_RELAY_BUILD=BUILD;
})();