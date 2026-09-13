/* FINAL7 CAMERA LOCK CANDIDATE
 * Reuse FINAL6 page/UI/guide, but force a fresh install so the fixed camera module is cached.
 * Camera fix: one getUserMedia request at a time + one Android busy-source fallback only.
 */
importScripts('./water-offline-sw-final6-fastcam.js?v=879-final7-camera-lock');
