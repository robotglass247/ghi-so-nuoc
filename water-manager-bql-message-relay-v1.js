(function(){
'use strict';

const BUILD='water-manager-bql-message-relay-v1';

function isBqlMessage(d){
  if(!d||typeof d!=='object')return false;
  const type=String(d.type||'');
  const requestId=String(d.requestId||'');
  if(!/^WATER_BQL_(?:DATA_RESULT|ACTION_RESULT|ERROR)$/.test(type))return false;
  return /^[A-Za-z0-9_-]{8,120}$/.test(requestId);
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

  try{
    frame.contentWindow.postMessage(d,location.origin);
  }catch(e){
    try{frame.contentWindow.postMessage(d,'*');}catch(_e){}
  }
});

window.WATER_MANAGER_BQL_MESSAGE_RELAY_BUILD=BUILD;
})();
