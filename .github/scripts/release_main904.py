from pathlib import Path

for name in ['app.html','water-offline-sw-ui3.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    if '879-recover1' not in s:
        raise SystemExit(f'{name}: old build not found')
    s=s.replace('879-recover1','879-main904')
    p.write_text(s,encoding='utf-8')
