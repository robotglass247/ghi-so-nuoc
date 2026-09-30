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
  let readMode = 'auto';
  let probePromise = null;
  const debugEnabled = new URLSearchParams(location.search).get('debug') === '1';
  const debugStart = performance.now();

  function debugBox(){
    if (!debugEnabled) return null;
    let box = document.getElementById('meops-debug-box');
    if (box) return box;

    box = document.createElement('div');
    box.id = 'meops-debug-box';
    box.style.cssText = [
      'position:fixed',
      'left:8px',
      'bottom:8px',
      'z-index:100000',
      'max-width:92vw',
      'background:#10233f',
      'color:#fff',
      'border-radius:8px',
      'padding:8px 10px',
      'font:12px/1.45 monospace',
      'box-shadow:0 6px 20px rgba(0,0,0,.22)',
      'white-space:pre-wrap'
    ].join(';');
    box.textContent = 'M&E OPS DEBUG 6.3\nĐang kiểm tra kết nối...';

    const add = function(){
      if (document.body && !box.parentNode) document.body.appendChild(box);
    };
    if (document.body) add();
    else document.addEventListener('DOMContentLoaded', add, {once:true});

    return box;
  }

  function debugSet(lines){
    if (!debugEnabled) return;
    const box = debugBox();
    if (!box) return;
    box.textContent = 'M&E OPS DEBUG 6.3\n' + lines;
  }

  debugBox();

  // Index hiện tại tự bật banner "phản hồi chậm" sau 15 giây.
  // Đây không phải lỗi backend. Nâng riêng timer đó lên 45 giây.
  const nativeSetTimeout = window.setTimeout.bind(window);
  window.setTimeout = function(fn, delay){
    try {
      if (
        Number(delay) === 15000 &&
        typeof fn === 'function' &&
        String(fn).indexOf('Dữ liệu đang phản hồi chậm') >= 0
      ) {
        delay = 45000;
      }
    } catch(e) {}
    return nativeSetTimeout(fn, delay);
  };

  function makeCredentiallessFrame(name){
    const iframe = document.createElement('iframe');
    iframe.name = name;
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden','true');
    iframe.setAttribute('credentialless','');
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

    const sourceMatches = !!(
      p.iframe &&
      ev.source === p.iframe.contentWindow
    );

    let okOrigin = false;
    try {
      const host = (new URL(ev.origin)).hostname || '';
      okOrigin =
        ev.origin === 'https://script.google.com' ||
        host === 'script.googleusercontent.com' ||
        host.endsWith('.googleusercontent.com');
    } catch(e) {}

    // credentialless iframe có thể trả origin "null";
    // khi đó chỉ tin đúng contentWindow của iframe request này.
    if (!okOrigin && !sourceMatches) return;

    cleanupEntry(d.requestId);

    if (d.ok) p.resolve(d.data);
    else p.reject(new Error(d.error || 'Máy chủ M&E OPS trả lỗi.'));
  });

  function frameReadRaw(method, args, timeoutMs){
    timeoutMs = timeoutMs || 60000;

    return new Promise((resolve, reject)=>{
      const requestId = 'r_' + Date.now() + '_' + (++seq);
      const frameName = 'meops_' + requestId;
      const iframe = makeCredentiallessFrame(frameName);

      const q = new URLSearchParams();
      q.set('api','1');
      q.set('transport','frame');
      q.set('action',method);
      q.set('args',JSON.stringify(args || []));
      q.set('requestId',requestId);
      q.set('_',String(Date.now()));

      const timer = setTimeout(function(){
        cleanupEntry(requestId);
        reject(new Error('iframe timeout'));
      }, timeoutMs);

      pending.set(requestId,{
        resolve, reject,
        iframe,
        form:null,
        timer
      });

      iframe.src = API_BASE + '?' + q.toString();
      iframe.onerror = function(){
        if (!pending.has(requestId)) return;
        cleanupEntry(requestId);
        reject(new Error('iframe load error'));
      };

      (document.body || document.documentElement).appendChild(iframe);
    });
  }

  function jsonpReadRaw(method, args, timeoutMs){
    timeoutMs = timeoutMs || 60000;

    return new Promise((resolve, reject)=>{
      const callbackName = '__meops_jsonp_' + Date.now() + '_' + (++seq);
      const script = document.createElement('script');
      let settled = false;

      const timer = setTimeout(function(){
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('jsonp timeout'));
      }, timeoutMs);

      function cleanup(){
        clearTimeout(timer);
        try { delete window[callbackName]; }
        catch(e) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function(envelope){
        if (settled) return;
        settled = true;
        cleanup();

        if (envelope && envelope.ok) resolve(envelope.data);
        else reject(new Error((envelope && envelope.error) || 'JSONP server error'));
      };

      const q = new URLSearchParams();
      q.set('api','1');
      q.set('action',method);
      q.set('args',JSON.stringify(args || []));
      q.set('callback',callbackName);
      q.set('_',String(Date.now()));

      script.src = API_BASE + '?' + q.toString();
      script.async = true;
      script.onerror = function(){
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('jsonp load error'));
      };

      document.head.appendChild(script);
    });
  }

  function probeReadMode(){
    if (readMode !== 'auto') return Promise.resolve(readMode);
    if (probePromise) return probePromise;

    const probeStarted = performance.now();

    probePromise = new Promise((resolve, reject)=>{
      let done = false;
      let failures = 0;
      const errors = [];

      function win(mode){
        if (done) return;
        done = true;
        readMode = mode;
        window.MEOPS_STANDALONE.readMode = mode;
        window.MEOPS_STANDALONE.probeMs = Math.round(performance.now() - probeStarted);
        console.info('[M&E OPS] Read transport:', mode);
        debugSet(
          'API probe: OK (' + mode + ') ' +
          window.MEOPS_STANDALONE.probeMs + ' ms\n' +
          'Dashboard: đang chờ...'
        );
        resolve(mode);
      }

      function lose(label, err){
        failures++;
        errors.push(label + ': ' + (err && err.message ? err.message : String(err)));
        if (!done && failures >= 2) {
          done = true;
          const msg =
            'Không kết nối được backend qua iframe hoặc JSONP. ' + errors.join(' | ');
          debugSet(
            'API probe: LỖI sau ' +
            Math.round(performance.now() - probeStarted) + ' ms\n' + msg
          );
          reject(new Error(msg));
        }
      }

      frameReadRaw('getAppConfig', [], 7000)
        .then(()=>win('frame'))
        .catch(err=>lose('iframe',err));

      jsonpReadRaw('getAppConfig', [], 9000)
        .then(()=>win('jsonp'))
        .catch(err=>lose('jsonp',err));
    });

    return probePromise;
  }

  async function readCall(method, args){
    const callStarted = performance.now();
    const mode = await probeReadMode();

    if (debugEnabled && method === 'getDashboardData') {
      debugSet(
        'API probe: OK (' + mode + ') ' +
        (window.MEOPS_STANDALONE.probeMs || '?') + ' ms\n' +
        'Dashboard: đang xử lý...'
      );
    }

    try {
      let result;
      if (mode === 'frame') {
        result = await frameReadRaw(method, args, 60000);
      } else {
        result = await jsonpReadRaw(method, args, 60000);
      }

      if (debugEnabled && method === 'getDashboardData') {
        const ms = Math.round(performance.now() - callStarted);
        window.MEOPS_STANDALONE.dashboardMs = ms;
        debugSet(
          'API probe: OK (' + mode + ') ' +
          (window.MEOPS_STANDALONE.probeMs || '?') + ' ms\n' +
          'Dashboard: OK ' + ms + ' ms'
        );
      }

      return result;

    } catch(firstErr) {
      // Nếu transport đã chọn lỗi ở request thật, thử transport còn lại một lần.
      const fallback = mode === 'frame' ? 'jsonp' : 'frame';
      console.warn('[M&E OPS] Fallback read transport:', fallback, firstErr);

      readMode = fallback;
      window.MEOPS_STANDALONE.readMode = fallback;

      let result;
      try {
        if (fallback === 'frame') {
          result = await frameReadRaw(method, args, 60000);
        } else {
          result = await jsonpReadRaw(method, args, 60000);
        }

        if (debugEnabled && method === 'getDashboardData') {
          const ms = Math.round(performance.now() - callStarted);
          window.MEOPS_STANDALONE.dashboardMs = ms;
          debugSet(
            'API probe: OK (fallback ' + fallback + ')\n' +
            'Dashboard: OK ' + ms + ' ms'
          );
        }

        return result;

      } catch(secondErr) {
        if (debugEnabled && method === 'getDashboardData') {
          debugSet(
            'API probe: đã kết nối\n' +
            'Dashboard: LỖI sau ' +
            Math.round(performance.now() - callStarted) + ' ms\n' +
            (secondErr && secondErr.message ? secondErr.message : String(secondErr))
          );
        }
        throw secondErr;
      }
    }
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
        api:'1',
        transport:'frame',
        action:method,
        args:JSON.stringify(args || []),
        requestId:requestId
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

      pending.set(requestId,{
        resolve, reject,
        iframe,
        form,
        timer
      });

      (document.body || document.documentElement).appendChild(iframe);
      (document.body || document.documentElement).appendChild(form);
      form.submit();
    });
  }

  function invoke(method,args){
    if (READ_METHODS.has(method)) return readCall(method,args);
    if (WRITE_METHODS.has(method)) return frameWrite(method,args);
    return Promise.reject(new Error('API chưa cho phép hàm: ' + method));
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
          invoke(prop,args)
            .then(function(data){
              if (typeof state.success === 'function') state.success(data);
            })
            .catch(function(err){
              console.error('[M&E OPS 6.3]',prop,err);
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
    get(){
      return makeRunner({success:null,failure:null});
    }
  });

  window.MEOPS_STANDALONE = {
    version:'6.3',
    mode:'auto-probe-frame-or-jsonp-debug',
    readMode:'auto',
    apiBase:API_BASE
  };
})();