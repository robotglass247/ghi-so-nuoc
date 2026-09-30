(function(){
  'use strict';

  const BACKEND_URL = "https://script.google.com/macros/s/AKfycbzKYMiU5uAJGjihZ6cOTe-0JUkAvce1WEZjmOWI7j9KhNfnYIPlEjJAv5cgh-ThOTFt/exec";
  const ALLOWED_METHODS = new Set([
    'getDashboardData',
    'getIncidentFeed',
    'getMaintenancePlanData',
    'getMaintenanceInitialData',
    'getAppConfig',
    'saveMaintenanceReport',
    'saveOperation',
    'saveIncident'
  ]);

  let seq = 0;
  const pending = new Map();

  function makeId(){
    return (
      'meops_' +
      Date.now() +
      '_' +
      (++seq) +
      '_' +
      Math.random().toString(36).slice(2,10)
    );
  }

  function cleanup(requestId){
    const p = pending.get(requestId);
    if (!p) return;

    clearTimeout(p.timer);
    pending.delete(requestId);

    setTimeout(function(){
      if (p.form && p.form.parentNode) {
        p.form.parentNode.removeChild(p.form);
      }
      if (p.frame && p.frame.parentNode) {
        p.frame.parentNode.removeChild(p.frame);
      }
    }, 0);
  }

  window.addEventListener('message', function(ev){
    const msg = ev.data;

    if (
      !msg ||
      msg.type !== 'MEOPS_RPC_RESULT' ||
      !msg.requestId
    ) {
      return;
    }

    const p = pending.get(msg.requestId);
    if (!p) return;

    if (
      p.frame &&
      p.frame.contentWindow &&
      ev.source &&
      ev.source !== p.frame.contentWindow
    ) {
      return;
    }

    cleanup(msg.requestId);

    if (msg.ok) {
      p.resolve(msg.data);
    } else {
      p.reject(
        new Error(
          msg.error ||
          'Máy chủ M&E OPS trả lỗi.'
        )
      );
    }
  });

  function rpc(method, args){
    return new Promise(function(resolve, reject){

      if (!ALLOWED_METHODS.has(method)) {
        reject(
          new Error(
            'API chưa cho phép hàm: ' +
            method
          )
        );
        return;
      }

      const requestId = makeId();
      const frameName = 'frame_' + requestId;

      const frame =
        document.createElement('iframe');

      frame.name = frameName;
      frame.style.display = 'none';
      frame.setAttribute(
        'aria-hidden',
        'true'
      );

      const form =
        document.createElement('form');

      form.method = 'POST';
      form.action = BACKEND_URL;
      form.target = frameName;
      form.style.display = 'none';
      form.acceptCharset = 'UTF-8';

      const fields = {
        api: 'meopsrpc',
        requestId: requestId,
        action: method,
        args: JSON.stringify(args || [])
      };

      Object.keys(fields).forEach(function(name){
        const input =
          document.createElement('input');

        input.type = 'hidden';
        input.name = name;
        input.value = fields[name];

        form.appendChild(input);
      });

      const timeoutMs =
        method === 'getDashboardData'
          ? 90000
          : 60000;

      const timer = setTimeout(function(){
        cleanup(requestId);

        reject(
          new Error(
            'Máy chủ M&E OPS chưa phản hồi sau ' +
            Math.round(timeoutMs / 1000) +
            ' giây.'
          )
        );
      }, timeoutMs);

      pending.set(requestId, {
        resolve: resolve,
        reject: reject,
        frame: frame,
        form: form,
        timer: timer,
        method: method
      });

      document.body.appendChild(frame);
      document.body.appendChild(form);

      try {
        form.submit();
      } catch(err) {
        cleanup(requestId);
        reject(err);
      }

    });
  }

  function makeRunner(state){
    const base = {

      withSuccessHandler(fn){
        return makeRunner({
          success: fn,
          failure: state.failure
        });
      },

      withFailureHandler(fn){
        return makeRunner({
          success: state.success,
          failure: fn
        });
      },

      withUserObject(){
        return makeRunner(state);
      }

    };

    return new Proxy(base, {

      get(target, prop){

        if (prop in target) {
          return target[prop];
        }

        if (typeof prop !== 'string') {
          return target[prop];
        }

        return function(){

          const args =
            Array.prototype.slice.call(
              arguments
            );

          rpc(prop, args)
            .then(function(data){

              if (
                typeof state.success ===
                'function'
              ) {
                state.success(data);
              }

            })
            .catch(function(err){

              console.error(
                '[M&E OPS WATER STYLE]',
                prop,
                err
              );

              if (
                typeof state.failure ===
                'function'
              ) {
                state.failure(err);
              }

            });

        };
      }

    });
  }

  window.google =
    window.google || {};

  window.google.script =
    window.google.script || {};

  Object.defineProperty(
    window.google.script,
    'run',
    {
      configurable: true,

      get(){
        return makeRunner({
          success: null,
          failure: null
        });
      }
    }
  );

  window.MEOPS_STANDALONE = {
    version: 'WATER-STYLE-1',
    mode: 'post-iframe-postmessage',
    backendUrl: BACKEND_URL
  };

})();
