# PARKED — FILE HỆ THỐNG AUTH — 2026-09-15

Status: PAUSED / DO NOT MODIFY UNTIL RESUMED.

Reason: current DEV attempts around moving AUTH to FILE HỆ THỐNG are parked. Do not continue patching V3/V4/R2/R3/bridge/isolated variants during unrelated regression work.

Keep preserved:
- PASS AUTH module: 09_auth-sheets-v1.js
- PASS UX module: 09_auth-unregistered-ux-v2.js
- Existing DEV experiments remain in repository for later analysis.
- Production remains unchanged.

Regression baseline now used for other bug checks:
- Source snapshot: snapshots/r9-direct-PASS-pre-auth-2026-09-15.html
- Exact snapshot blob SHA: 0b81d4a8e9c29857eca70c86482e2631866ca082
- Test loader: r9-v1-check-dev.html

Rule when resuming: start from the preserved PASS baseline and change only the trigger/location, not the PASS authorization algorithm.
