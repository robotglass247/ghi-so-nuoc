(function(){
'use strict';
const BUILD='water-manager-tab-v3-embed-pass-relay-v2';
function load(src,done){
  const s=document.createElement('script');
  s.src=src;
  s.async=false;
  if(done)s.onload=done;
  document.head.appendChild(s);
}
const stamp=Date.now();
load('./water-manager-bql-message-relay-v1.js?v=1&bridge='+stamp,function(){
  load('./water-manager-embed-pass-v1.js?v=1&bridge='+stamp);
});
window.WATER_MANAGER_TAB_V3_BUILD=BUILD;
})();
