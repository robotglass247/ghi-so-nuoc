(function(){
'use strict';
const BUILD='water-manager-staff-admin-loader-v1';
let injected=false;
function inject(){
  if(injected)return true;
  const frame=document.getElementById('waterManagerEmbedFrame');
  if(!frame||!frame.contentDocument||!frame.contentDocument.head)return false;
  try{
    const d=frame.contentDocument;
    if(d.getElementById('waterManagerStaffAdminScript')){injected=true;return true;}
    const s=d.createElement('script');
    s.id='waterManagerStaffAdminScript';
    s.src='./water-manager-staff-admin-v1.js?v=1&t='+Date.now();
    s.async=false;
    d.head.appendChild(s);
    injected=true;
    return true;
  }catch(e){return false;}
}
function schedule(){[0,120,300,600,1000,1600,2600,4200].forEach(function(ms){setTimeout(inject,ms);});}
document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.addEventListener('WATER_AUTH_OK',schedule);
window.addEventListener('pageshow',schedule);
document.addEventListener('click',function(e){const b=e.target&&e.target.closest?e.target.closest('#waterTabManage'):null;if(b){injected=false;setTimeout(inject,160);setTimeout(inject,600);}},true);
if(document.readyState!=='loading')schedule();
window.WATER_MANAGER_STAFF_ADMIN_LOADER_BUILD=BUILD;
})();