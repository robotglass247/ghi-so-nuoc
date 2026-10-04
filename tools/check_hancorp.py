#!/usr/bin/env python3
"""Check endpoint replacement and syntax in a temporary activated build."""
import json
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import tempfile
from build_hancorp import build, decoded_texts, SHIM

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            self.active = not dict(attrs).get('src')
    def handle_endtag(self, tag):
        if tag == 'script':
            self.active = False
    def handle_data(self, data):
        if self.active:
            self.scripts.append(data)

cfg = dict(name='Hancorp Plaza', address='72 Trần Đăng Ninh',
           sheet_id='HANCORP_TEST_SHEET',
           backend_url='https://script.google.com/macros/s/HANCORP_TEST_ONLY/exec', ready=True)
with tempfile.TemporaryDirectory() as directory:
    out = Path(directory)
    build(cfg, out)
    scripts = []
    for path in out.rglob('*'):
        if path.suffix == '.js':
            scripts.append(path.read_text())
        elif path.suffix == '.html':
            parser = Scripts()
            parser.feed(path.read_text())
            scripts.extend(parser.scripts)
            scripts.extend(list(decoded_texts(path.read_text()))[1:])
    subprocess.run(['node', '-e',
        "const vm=require('vm'),fs=require('fs'); JSON.parse(fs.readFileSync(0,'utf8')).forEach(s=>new vm.Script(s));"],
        input=json.dumps(scripts), text=True, check=True)
    sw = (out / 'water-offline-sw.js').read_text()
    assert "k.startsWith('water-hancorp-v20-offline-')" in sw
    assert 'NS001' not in sw
    assert 'const STAFF_FALLBACK=[];' in (out / 'v87-background.html').read_text()
    # Execute the namespace shim and prove old pending data remains untouched.
    parser = Scripts()
    parser.feed(SHIM)
    harness = '''const vm=require('vm'),fs=require('fs');
class Storage { constructor(){this.data=new Map()} getItem(k){return this.data.get(k)||null} setItem(k,v){this.data.set(k,String(v))} removeItem(k){this.data.delete(k)} }
class IDBFactory { open(n,v){return n} deleteDatabase(n){return n} }
const localStorage=new Storage(); localStorage.setItem('pending','OLD');
const context={Storage,IDBFactory,window:{}}; vm.createContext(context);
const shim=fs.readFileSync(0,'utf8'); vm.runInContext(shim,context); vm.runInContext(shim,context);
if(localStorage.getItem('pending')!==null)throw Error('Old data leaked');
localStorage.setItem('pending','NEW'); localStorage.removeItem('pending');
if(localStorage.data.get('pending')!=='OLD')throw Error('Old data modified');
if(new IDBFactory().open('queue')!=='waterops_hancorp_v20::queue')throw Error('Wrong DB');
'''
    subprocess.run(['node', '-e', harness], input=parser.scripts[0], text=True, check=True)
    print(f'PASS: {len(scripts)} JavaScript blocks; endpoint replacement, staff fallback, storage and cache isolation')
