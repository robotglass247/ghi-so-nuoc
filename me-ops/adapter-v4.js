(function(){
  'use strict';

  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzKYMiU5uAJGjihZ6cOTe-0JUkAvce1WEZjmOWI7j9KhNfnYIPlEjJAv5cgh-ThOTFt/exec';

  let seq = 0;
  let pending = null;
  const queue = [];
  let fixedFrame = null;

  function makeId(){
    return 'meops_' + Date.now() + '_' + (++seq) + '_' + Math.random().toString(36).slice(2,9);
  }

  function ensureFrame(){
    if (fixedFrame && fixedFrame.isConnected) return fixedFrame;

    fixedFrame = document.createElement('iframe');
    fixedFrame.id = 'meopsWaterFrame';
    fixedFrame.name = 'meopsWaterFrame';
    fixedFrame.title = 'M&E OPS data channel';
    fixedFrame.style.display = 'none';
    fixedFrame.setAttribute('aria-hidden','true');

    (document.body || document.documentElement).appendChild(fixedFrame);
    return fixedFrame;
  }

  function timeoutFor(method){
    if (method === 'getDashboardData') return 90000;
    if (method === 'saveIncident' || method === 'saveMaintenanceReport' || method === 'saveOperation') return 120000;
    return 60000;
  }

  function pump(){
    if (pending || !queue.length) return;

    const task = queue.shift();
    const frame = ensureFrame();
    const requestId = makeId();
    const started = performance.now();

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = BACKEND_URL;
    form.target = frame.name;
    form.style.display = 'none';
    form.acceptCharset = 'UTF-8';

    const fields = {
      api: 'meopsrpc',
      requestId: requestId,
      action: task.method,
      args: JSON.stringify(task.args || [])
    };

    Object.keys(fields).forEach(function(name){
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = fields[name];
      form.appendChild(input);
    });

    (document.body || document.documentElement).appendChild(form);

    const timer = setTimeout(function(){
      if (!pending || pending.id !== requestId) return;

      const p = pending;
      pending = null;
      p.reject(new Error('Máy chủ chưa phản hồi sau ' + Math.round((performance.now() - started) / 1000) + ' giây.'));
      setTimeout(pump,0);
    }, timeoutFor(task.method));

    pending = {
      id: requestId,
      method: task.method,
      resolve: task.resolve,
      reject: task.reject,
      timer: timer
    };

    try {
      form.submit();
    } catch(err) {
      clearTimeout(timer);
      pending = null;
      task.reject(err);
      setTimeout(pump,0);
    }

    // Giống app Ghi số nước: không xóa form quá sớm.
    setTimeout(function(){
      try { form.remove(); } catch(e) {}
    },60000);
  }

  window.addEventListener('message', function(event){
    const d = event.data;

    // Cơ chế đúng như trang WATER TEST đã chạy OK trên Android:
    // chỉ ghép phản hồi bằng type + requestId, không chặn theo event.source.
    if (!d || d.type !== 'MEOPS_RPC_RESULT' || !pending) return;
    if (String(d.requestId || '') !== String(pending.id || '')) return;

    const p = pending;
    pending = null;
    clearTimeout(p.timer);

    if (d.ok) {
      p.resolve(d.data);
    } else {
      p.reject(new Error(d.error || 'Backend M&E OPS trả lỗi.'));
    }

    setTimeout(pump,0);
  });

  function rpc(method,args){
    return new Promise(function(resolve,reject){
      queue.push({method:method,args:args || [],resolve:resolve,reject:reject});
      pump();
    });
  }

  function makeRunner(state){
    const base = {
      withSuccessHandler(fn){
        return makeRunner({success:fn,failure:state.failure});
      },
      withFailureHandler(fn){
        return makeRunner({success:state.success,failure:fn});
      },
      withUserObject(){
        return makeRunner(state);
      }
    };

    return new Proxy(base,{
      get(target,prop){
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return target[prop];

        return function(){
          const args = Array.prototype.slice.call(arguments);
          rpc(prop,args)
            .then(function(data){
              if (typeof state.success === 'function') state.success(data);
            })
            .catch(function(err){
              console.error('[M&E OPS WATER FINAL]',prop,err);
              if (typeof state.failure === 'function') state.failure(err);
            });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};

  Object.defineProperty(window.google.script,'run',{
    configurable:true,
    get:function(){
      return makeRunner({success:null,failure:null});
    }
  });

  window.MEOPS_STANDALONE = {
    version:'WATER-FINAL-1',
    mode:'single-fixed-iframe-postmessage',
    backendUrl:BACKEND_URL
  };
})();
