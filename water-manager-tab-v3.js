(function(){
'use strict';
const BUILD='water-manager-tab-v3-integrated-r6-bridge';
function load(src,done){
  const s=document.createElement('script');
  s.src=src;
  s.async=false;
  if(done)s.onload=done;
  document.head.appendChild(s);
}
const stamp=Date.now();
load('./water-manager-tab-v2.js?v=2&bridge='+stamp,function(){
  load('./water-manager-integrated-tab-v1.js?v=1&bridge='+stamp);
});
window.WATER_MANAGER_TAB_V3_BUILD=BUILD;
})();
