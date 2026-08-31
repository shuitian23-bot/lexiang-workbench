#!/usr/bin/env python3
"""Read-only validation or clean export of the P0 site; never deploys."""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ENTRIES = ['index.html', 'shop-chat/index.html', 'b-chat/index.html', 'biz-chat/index.html', 'brand/index.html']
ROOT_FILES = {'index.html', 'shop-chat.html', 'b-chat.html', 'biz-chat.html',
              'channel-customer-service-v110.js', 'channel-customer-service-v126.js'}
ROOT_DIRS = {'assets', 'shop-chat', 'b-chat', 'biz-chat', 'brand', 'leai product data'}


def excluded(rel):
    return any(part.startswith(('._', '.env')) or part in ('.DS_Store', '.git', '.codex-backups')
               or '.bak' in part or '.backup-' in part for part in rel.parts)


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.base = ''
        self.refs = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'base': self.base = a.get('href', '')
        if tag == 'script' and a.get('src'): self.refs.append(a['src'])
        if tag == 'link' and a.get('rel') == 'stylesheet': self.refs.append(a.get('href', ''))


def inspect(root):
    rows, errors, omitted = [], [], []
    for path in sorted(root.rglob('*')):
        rel = path.relative_to(root)
        if excluded(rel):
            if path.is_file(): omitted.append(str(rel))
            continue
        if path.is_symlink():
            errors.append('Symlink needs explicit review: ' + str(rel))
            continue
        if not path.is_file(): continue
        if (len(rel.parts) == 1 and rel.name not in ROOT_FILES) or (len(rel.parts) > 1 and rel.parts[0] not in ROOT_DIRS):
            if rel.name in ('README.md', 'PRODUCTION-INTEGRATION.md'):
                omitted.append(str(rel)); continue
            errors.append('Unreviewed top-level release path: ' + str(rel)); continue
        data = path.read_bytes()
        if path.suffix == '.html' and b'/* lx-boot-guard:' in data:
            errors.append('Unsafe legacy boot diagnostic remains: ' + str(rel))
        rows.append({'path': str(rel), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    published = {row['path'] for row in rows}
    for entry in ENTRIES:
        if entry not in published:
            errors.append('Missing entry: ' + entry); continue
        parser = References(); parser.feed((root / entry).read_text())
        base = urljoin('https://p0.leaibot.cn/' + entry, parser.base)
        for ref in parser.refs:
            url = urlsplit(urljoin(base, ref))
            if url.netloc != 'p0.leaibot.cn': continue
            name = unquote(url.path).lstrip('/')
            if name.startswith(('frontend/', 'img/')): name = 'assets/' + name
            if name not in published: errors.append(entry + ': missing release dependency ' + name)
    return {'files': rows, 'omitted': omitted, 'errors': errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--output', type=Path, help='Create a NEW local release directory; never upload')
    parser.add_argument('--manifest', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.is_dir(): parser.error('root must be an existing directory')
    report = inspect(root)
    fingerprint_check = subprocess.run([sys.executable, str(Path(__file__).with_name('p0-assets.py')), '--root', str(root)], capture_output=True, text=True)
    if fingerprint_check.returncode:
        report['errors'].append('Asset URL/fingerprint validation failed: ' + fingerprint_check.stdout + fingerprint_check.stderr)
    if report['errors']:
        print(json.dumps({'errors': report['errors']}, ensure_ascii=False, indent=2)); raise SystemExit(1)
    if args.output:
        dest = args.output.resolve()
        if dest == root or root in dest.parents: parser.error('output must be outside the source root')
        dest.mkdir(parents=True, exist_ok=False)
        for row in report['files']:
            source = root / row['path']; target = dest / row['path']
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            if hashlib.sha256(target.read_bytes()).hexdigest() != row['sha256']:
                raise RuntimeError('Source changed during export: ' + row['path'])
        (dest.parent / (dest.name + '.manifest.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2))
    if args.manifest:
        manifest = args.manifest.resolve()
        if manifest == root or root in manifest.parents: parser.error('manifest must be outside the source root')
        if manifest.exists(): parser.error('manifest already exists; choose a new filename')
        manifest.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({'ok': True, 'included': len(report['files']), 'excluded': len(report['omitted']),
                      'bytes': sum(x['bytes'] for x in report['files'])}, ensure_ascii=False))

if __name__ == '__main__': main()
