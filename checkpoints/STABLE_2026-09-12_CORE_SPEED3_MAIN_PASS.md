# STABLE-2026-09-12-CORE-SPEED3-MAIN-PASS

Locked production core after user validation.

Confirmed by user before promotion:
- Online/Offline capture: PASS
- Local image save: PASS
- Pending queue: PASS
- Automatic sync: PASS
- 12 queued images automatically synchronized to 0 in integrated app test
- Turbo benchmark: 20 images / 37.3 s = 1.87 s/image, 32.1 images/min, queue 0

Promotion rule:
- v87-background.html is copied exactly from speed3-app-test.html.
- Keep camera, QR, IndexedDB water_meter_v6, Offline, captureAndSave and local save unchanged.
- Do not add compact personnel UI until production main regression is confirmed PASS.
