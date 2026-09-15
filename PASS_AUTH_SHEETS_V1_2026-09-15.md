# PASS AUTH SHEETS V1 — 2026-09-15

Status: PASS / approved for Production promotion.

## Functional result
- QUẢN LÝ: FILE HỆ THỐNG + TẢI FILE + XEM CHỈ SỐ.
- NHÂN VIÊN: FILE HỆ THỐNG hidden/blocked; TẢI FILE + XEM CHỈ SỐ available.
- AUTH source: separate Google Sheet AUTH_GHI_SO_NUOC_DEV, tab AUTH_NHAN_SU.
- AUTH records use HASH_EMAIL + TÌNH TRẠNG + PHÂN QUYỀN.
- Warning UX for unregistered/denied account: 3 seconds, then return to authentication screen when the App receives the denial.
- OAuth Testing limitation accepted: an account not listed in Google Auth Platform Test users may be blocked by Google before the App can show its own warning.

## Exact PASS blobs
- r9-direct.html BEFORE Production AUTH integration: `0b81d4a8e9c29857eca70c86482e2631866ca082`
- 09_auth-sheets-config-dev.js: `1ab565091a6abf4c0377193e4bb4472e24bc0746`
- 09_auth-sheets-v1.js: `8e1bff6ccb9f69b329f4655ffd68a7a6147c2798`
- 09_auth-unregistered-ux-v2.js: `177fb99925f4f7d3e9ca60233915dff0a43494c9`
- 07_system-file-v1.js remains stable: `e44759f772be94f6fa57afae38261e05117c37cc`
- 03_manage-core-v1.js remains stable: `f44daa61eecb73cdcf86b3acf2614e03fcf8d845`

## Rollback
A full copy of pre-AUTH Production loader is saved at:
`snapshots/r9-direct-PASS-pre-auth-2026-09-15.html`

Do not modify the PASS blobs above when experimenting. New work must use new DEV modules/pages first.
