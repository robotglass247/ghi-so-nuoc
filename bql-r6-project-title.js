(function(){
'use strict';
function normalizeTitle(){
  const el=document.getElementById('subTitle');
  if(!el)return;
  let s=String(el.textContent||'').trim();
  if(!s)return;
  if(/^Dự án\s+/i.test(s)){
    s=s.replace(/^Dự án\s+/i,'').replace(/\s*[•·|-]\s*BQL\s*V20(?:\s*R3)?\s*$/i,'').trim();
    if(s)el.textContent=s;
  }
}
function init(){
  const el=document.getElementById('subTitle');
  if(!el){setTimeout(init,100);return;}
  normalizeTitle();
  new MutationObserver(normalizeTitle).observe(el,{childList:true,subtree:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
