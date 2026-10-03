(function(){
'use strict';
const BUILD='water-manager-integrated-tab-compat-embed-pass-v1';
if(window.WATER_MANAGER_EMBED_PASS_BUILD){
  window.WATER_MANAGER_INTEGRATED_TAB_BUILD=BUILD;
  return;
}
const s=document.createElement('script');
s.src='./water-manager-embed-pass-v1.js?v=1&compat='+Date.now();
s.async=false;
s.onload=function(){window.WATER_MANAGER_INTEGRATED_TAB_BUILD=BUILD;};
document.head.appendChild(s);
})();
