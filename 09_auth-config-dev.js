/* ============================================================
MODULE_ID: 09-CONFIG
MODULE_NAME: auth-role-config-dev
STATUS: DEV ONLY
RULE: Do not place secrets here. Google OAuth Web Client ID is public.
============================================================ */
(function(){
  'use strict';

  window.WATER_AUTH_CONFIG=Object.freeze({
    GOOGLE_CLIENT_ID:'',
    AUTH_GATEWAY_URL:''
  });
})();
