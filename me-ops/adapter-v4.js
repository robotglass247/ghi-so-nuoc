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

  function errorText(err){
    return (err && err.message) ? err.message : String(err || 'Không kết nối được máy chủ.');
  }

  function jsonpCall(method, args, timeoutMs){
    timeoutMs = timeoutMs || 45000;

    return new Promise((resolve, reject)=>{
      const callbackName = '__meops_cb_' + Date.now() + '_' + (++seq);
      const script = document.createElement('script');
      let settled = false;

      const timer = setTimeout(()=>{
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Máy chủ phản hồi quá thời gian.'));
      }, timeoutMs);

      function cleanup(){
        clearTimeout(timer);
        try { delete window[callbackName]; } catch(e) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function(envelope){
        if (settled) return;
        settled = true;
        cleanup();

        if (envelope && envelope.ok) {
          resolve(envelope.data);
        } else {
          reject(new Error((envelope && envelope.error) || 'Máy chủ trả lỗi.'));
        }
      };

      const q = new URLSearchParams();
      q.set('api', '1');
      q.set('action', method);
      q.set('args', JSON.stringify(args || []));
      q.set('callback', callbackName);
      q.set('_', String(Date.now()));

      script.src = API_BASE + '?' + q.toString();
      script.async = true;
      script.onerror = function(){
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Không tải được dữ liệu từ máy chủ M&E OPS.'));
      };

      document.head.appendChild(script);
    });
  }

  function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function writeCall(method, args){
    const requestId =
      'w_' + Date.now() + '_' + (++seq) + '_' + Math.random().toString(36).slice(2, 10);

    const body = new URLSearchParams();
    body.set('api', '1');
    body.set('action', method);
    body.set('args', JSON.stringify(args || []));
    body.set('requestId', requestId);

    // Gửi nền, không đọc response để tránh CORS/Google account redirect.
    // credentials:'omit' cố tình không gửi phiên Google của người dùng.
    fetch(API_BASE, {
      method: 'POST',
      mode: 'no-cors',
      credentials: 'omit',
      redirect: 'follow',
      body: body
    }).catch(function(err){
      console.warn('[M&E OPS] POST nền:', errorText(err));
    });

    const started = Date.now();
    let lastError = null;

    while (Date.now() - started < 70000) {
      await sleep(900);

      try {
        const status = await jsonpCall('__writeStatus', [requestId], 12000);

        if (status && status.ready) {
          if (status.ok) return status.data;
          throw new Error(status.error || 'Không lưu được dữ liệu.');
        }
      } catch(err) {
        lastError = err;
      }
    }

    throw new Error(
      lastError && lastError.message
        ? 'Máy chủ chưa xác nhận lưu dữ liệu: ' + lastError.message
        : 'Máy chủ chưa xác nhận lưu dữ liệu. Vui lòng thử lại.'
    );
  }

  function invoke(method, args){
    if (READ_METHODS.has(method)) {
      return jsonpCall(method, args, 45000);
    }

    if (WRITE_METHODS.has(method)) {
      return writeCall(method, args);
    }

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
            .then(data=>{
              if (typeof state.success === 'function') state.success(data);
            })
            .catch(err=>{
              console.error('[M&E OPS API]', prop, err);
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
    version: '4',
    mode: 'static-github + jsonp-read + nocors-write',
    apiBase: API_BASE
  };
})();
