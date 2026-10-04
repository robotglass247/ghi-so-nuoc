#!/usr/bin/env python3
"""Build the isolated Hancorp V20 app; no deployment or Google mutations."""
import base64
import html
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'hancorp'
FILES = '''r1135-v20-direct.html r9-direct-1135.html v87-background.html
water-final-core-pre.js water-ui3.js water-final-core-post.js
water-camera-fast-final6.js water-shot-guide-final10-postcapture-r4.js
water-staff-header-nameonly-r5.js water-progress-live-r6.js water-top-tabs-r9.js
water-project-tab-r91.js water-project-sheet-r93.js water-default-capture-r92.js
water-offline-sw.js'''.split()
FILES += ['dev-r1135-offline/' + f for f in '''project-image-offline-cache-dev.js
manage-view-offline-lock-dev.js manage-unified-data-v1.js'''.split()]
FILES += ['dev-r1135-unified/' + f for f in '''manage-view-month-v4.js
manage-view-footer-fit-v1.js manage-view-review-count-v1.js manage-view-review-column-v1.js
manage-view-summary-label-v1.js manage-download-v2.js manage-view-month-v3.js
manage-download-v7-exact-view-values.js'''.split()]
OLD_SHEET = '1YeXaSA03l3wPntaP_aNKeR_aMrjCnenHtLAiALSwxpY'
URL = re.compile(r'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec')
ENCODED = re.compile(r"atob\((['\"])([A-Za-z0-9+/=]+)\1\)")
SHIM = """<script>
(function(){
  'use strict';
  if(window.WATER_PROJECT_NAMESPACE==='HANCORP')return;
  const NS='waterops_hancorp_v20::';
  const gp=Storage.prototype.getItem,sp=Storage.prototype.setItem,rp=Storage.prototype.removeItem;
  Storage.prototype.getItem=function(k){return gp.call(this,NS+String(k));};
  Storage.prototype.setItem=function(k,v){return sp.call(this,NS+String(k),v);};
  Storage.prototype.removeItem=function(k){return rp.call(this,NS+String(k));};
  const op=IDBFactory.prototype.open,dp=IDBFactory.prototype.deleteDatabase;
  IDBFactory.prototype.open=function(n,v){return v===undefined?op.call(this,NS+String(n)):op.call(this,NS+String(n),v);};
  IDBFactory.prototype.deleteDatabase=function(n){return dp.call(this,NS+String(n));};
  window.WATER_PROJECT_NAMESPACE='HANCORP';
})();
</script>"""


def transform(text, cfg):
    def encoded(match):
        decoded = base64.b64decode(match[2]).decode('utf-8')
        fixed = transform(decoded, cfg)
        return "atob('" + base64.b64encode(fixed.encode()).decode() + "')"
    text = ENCODED.sub(encoded, text)
    text = URL.sub(cfg['backend_url'] or 'https://hancorp-not-configured.invalid/exec', text)
    text = text.replace(OLD_SHEET, cfg['sheet_id'])
    text = text.replace('water-v878-offline-', 'water-hancorp-v20-offline-')
    text = re.sub(r'const STAFF_FALLBACK=\[[\s\S]*?\n\];', 'const STAFF_FALLBACK=[];', text)
    # Remove the service worker's legacy staff fallback replacement block.
    if 'function patchPageHtml' in text:
        start = text.index('  // Fallback chỉ dùng')
        end = text.index('  html=html.replace(', text.index('\n  );', start) + 5)
        text = text[:start] + text[end:]
    return text


def decoded_texts(text):
    yield text
    for match in ENCODED.finditer(text):
        yield from decoded_texts(base64.b64decode(match[2]).decode('utf-8'))


def build(cfg, out=OUT):
    endpoint = cfg['backend_url']
    if endpoint and not URL.fullmatch(endpoint):
        raise ValueError('backend_url must be a Google Apps Script /exec URL')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', cfg['sheet_id']):
        raise ValueError('Invalid sheet_id')
    if cfg['ready'] and not endpoint:
        raise ValueError('ready requires backend_url')
    originals = '\n'.join((ROOT / f).read_text() for f in FILES)
    old_urls = set(URL.findall(originals))
    for text in decoded_texts(originals):
        old_urls.update(URL.findall(text))
    if endpoint in old_urls:
        raise ValueError('Refusing to reuse a source deployment')
    waiting = '''<!doctype html><html lang="vi"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hancorp Plaza — Ghi số nước</title>
<style>body{font:18px/1.6 system-ui;background:#f3f6fa;color:#17334d;margin:0;padding:8vh 24px}main{max-width:540px;margin:auto;background:white;padding:32px;border-radius:18px}h1{line-height:1.2}</style>
<main><h1>Hancorp Plaza</h1><p>''' + html.escape(cfg['address']) + '''</p>
<p>Ứng dụng ghi số nước đang được thiết lập.</p><p>Chức năng ghi số sẽ mở khi hoàn tất kết nối dữ liệu của tòa nhà.</p></main></html>'''
    for name in FILES:
        text = transform((ROOT / name).read_text(), cfg)
        if name.endswith('.html'):
            text = re.sub(r'<title>[^<]*</title>', '<title>Hancorp Plaza — Ghi số nước</title>', text, count=1)
        if name == 'v87-background.html':
            text = text.replace('</title>', '</title>\n' + SHIM, 1)
        for decoded in decoded_texts(text):
            if OLD_SHEET in decoded or any(u in decoded for u in old_urls):
                raise ValueError('Old project reference: ' + name)
            if re.search(r'(?:localStorage|sessionStorage)\s*(?:\[|\.clear\(|\.key\()', decoded):
                raise ValueError('Unscoped storage access: ' + name)
        if not cfg['ready']:
            if name.endswith('.html'):
                text = waiting
            elif name == 'water-offline-sw.js':
                # A dormant build must not install caches or intercept requests.
                text = '// Hancorp setup pending. No service-worker handlers.\n'
        target = out / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
    (out / 'index.html').write_text((out / 'r1135-v20-direct.html').read_text())


if __name__ == '__main__':
    config = json.loads((OUT / 'project.json').read_text())
    build(config)
    print('Hancorp built: ' + ('ready' if config['ready'] else 'setup pending'))
