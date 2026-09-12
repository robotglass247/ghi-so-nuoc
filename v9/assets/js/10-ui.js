function byId(id){return document.getElementById(id)}

function setStatus(a,b){
  byId('statusMain').textContent=a||'';
  byId('statusSub').textContent=b||'';
}

function toast(msg,ms=1200){
  const el=byId('toast');
  el.textContent=msg;
  el.style.display='block';
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.style.display='none',ms);
}
