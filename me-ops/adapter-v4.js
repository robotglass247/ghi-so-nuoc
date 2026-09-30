(function(){
  'use strict';

  const API_BASE = "https://script.google.com/macros/s/AKfycbzKYMiU5uAJGjihZ6cOTe-0JUkAvce1WEZjmOWI7j9KhNfnYIPlEjJAv5cgh-ThOTFt/exec";
  const READ_METHODS = new Set([
    'getDashboardData',
    'getIncidentFeed',
    'getMaintenancePlanData',
    'getMaintenanceInitialData',
    'getAppConfig'
  ]);
  const WRITE_METHODS = new Set([
    'saveMaintenanceReport',
    'saveOperation',
    'saveIncident'
  ]);

  let seq = 0;
  const pending = new Map();

  function makeCredentiallessFrame(name){
    const iframe = document.createElement('iframe');
    iframe.name = name;
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('credentialless', '');
    try { iframe.credentialless = true; } catch(e) {}
    iframe.referrerPolicy = 'no-referrer';
    return iframe;
  }

  function cleanupEntry(requestId){
    const p = pending.get(requestId);
    if (!p) return;

    clearTimeout(p.timer);
    pending.delete(requestId);

    setTimeout(function(){
      if (p.form && p.form.parentNode) p.form.parentNode.removeChild(p.form);
      if (p.iframe && p.iframe.parentNode) p.iframe.parentNode.removeChild(p.iframe);
    }, 0);
  }

  window.addEventListener('message', function(ev){
    const d = ev.data;
    if (!d || d.__MEOPS_FRAME__ !== true || !d.requestId) return;

    const p = pending.get(d.requestId);
    if (!p) return;

    // credentialless iframe có thể phát postMessage với origin = "null".
    // Chấp nhận khi message đến đúng iframe đã tạo cho requestId này.
    const sourceMatches = !!(p.iframe && ev.source === p.iframe.contentWindow);

    let okOrigin = false;
    try {
      const host = (new URL(ev.origin)).hostname || '';
      okOrigin =
        ev.origin === 'https://script.google.com' ||
        host === 'script.googleusercontent.com' ||
        host.endsWith('.googleusercontent.com');
    } catch(e) {}

    if (!okOrigin && !sourceMatches) return;

    cleanupEntry(d.requestId);

    if (d.ok) p.resolve(d.data);
    else p.reject(new Error(d.error || 'Máy chủ M&E OPS trả lỗi.'));
  });

  function frameRead(method, args){
    return new Promise((resolve, reject)=>{
      const requestId = 'r_' + Date.now() + '_' + (++seq);
      const frameName = 'meops_' + requestId;
      const iframe = makeCredentiallessFrame(frameName);

      const q = new URLSearchParams();
      q.set('api', '1');
      q.set('transport', 'frame');
      q.set('action', method);
      q.set('args', JSON.stringify(args || []));
      q.set('requestId', requestId);
      q.set('_', String(Date.now()));

      const timer = setTimeout(function(){
        cleanupEntry(requestId);
        reject(new Error('Máy chủ phản hồi quá thời gian.'));
      }, 30000);

      pending.set(requestId, {
        resolve: resolve,
        reject: reject,
        iframe: iframe,
        form: null,
        timer: timer
      });

      iframe.src = API_BASE + '?' + q.toString();
      iframe.onerror = function(){
        if (!pending.has(requestId)) return;
        cleanupEntry(requestId);
        reject(new Error('Không kết nối được máy chủ M&E OPS.'));
      };

      document.body.appendChild(iframe);
    });
  }

  function frameWrite(method, args){
    return new Promise((resolve, reject)=>{
      const requestId = 'w_' + Date.now() + '_' + (++seq);
      const frameName = 'meops_' + requestId;
      const iframe = makeCredentiallessFrame(frameName);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = API_BASE;
      form.target = frameName;
      form.style.display = 'none';
      form.acceptCharset = 'UTF-8';

      const fields = {
        api: '1',
        transport: 'frame',
        action: method,
        args: JSON.stringify(args || []),
        requestId: requestId
      };

      Object.keys(fields).forEach(function(name){
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = fields[name];
        form.appendChild(input);
      });

      const timer = setTimeout(function(){
        cleanupEntry(requestId);
        reject(new Error('Lưu dữ liệu quá thời gian.'));
      }, 60000);

      pending.set(requestId, {
        resolve: resolve,
        reject: reject,
        iframe: iframe,
        form: form,
        timer: timer
      });

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
    });
  }

  function invoke(method, args){
    if (READ_METHODS.has(method)) return frameRead(method, args);
    if (WRITE_METHODS.has(method)) return frameWrite(method, args);

    return Promise.reject(new Error('API chưa cho phép hàm: ' + method));
  }

  function makeRunner(state){
    const base = {
      withSuccessHandler(fn){
        return makeRunner({success: fn, failure: state.failure});
      },
      withFailureHandler(fn){
        return makeRunner({success: state.success, failure: fn});
      },
      withUserObject(){
        return makeRunner(state);
      }
    };

    return new Proxy(base, {
      get(target, prop){
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return target[prop];

        return function(){
          const args = Array.prototype.slice.call(arguments);

          invoke(prop, args)
            .then(function(data){
              if (typeof state.success === 'function') state.success(data);
            })
            .catch(function(err){
              console.error('[M&E OPS V5]', prop, err);
              if (typeof state.failure === 'function') state.failure(err);
            });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};

  Object.defineProperty(window.google.script, 'run', {
    configurable: true,
    get(){
      return makeRunner({success:null, failure:null});
    }
  });

  window.MEOPS_STANDALONE = {
    version: '5.1',
    mode: 'credentialless-frame-source-check',
    apiBase: API_BASE
  };
})();
