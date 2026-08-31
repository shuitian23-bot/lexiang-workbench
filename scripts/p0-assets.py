#!/usr/bin/env python3
"""Canonicalize only direct CSS/JS URLs, preserving markup, script order and legacy base."""
import argparse
import hashlib
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit, parse_qsl, urlencode, urlunsplit, quote

ENTRIES = ['index.html', 'shop-chat/index.html', 'b-chat/index.html', 'biz-chat/index.html', 'brand/index.html', 'shop-chat.html', 'b-chat.html', 'biz-chat.html']

class Tags(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.offsets = [0]
        for line in source.splitlines(keepends=True): self.offsets.append(self.offsets[-1]+len(line))
        self.base = ''; self.tags = []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'base': self.base = a.get('href','')
        attr = None
        if tag == 'script' and a.get('src'): attr = 'src'
        if tag == 'link' and (a.get('rel') == 'stylesheet' or (a.get('rel') == 'preload' and a.get('as') in ('script','style'))): attr = 'href'
        if attr and a.get(attr):
            line,col = self.getpos()
            self.tags.append((self.offsets[line-1]+col, self.get_starttag_text(), attr, a[attr]))


def rewrite(root, entry):
    path=root/entry; source=path.read_bytes().decode("utf-8"); tags=Tags(source)
    base=urljoin('https://p0.leaibot.cn/'+entry,tags.base)
    changes=[]; proof=[]
    for offset,tag,attr,raw in tags.tags:
        u=urlsplit(urljoin(base,raw))
        if u.netloc != 'p0.leaibot.cn' or u.scheme not in ('http','https'): continue
        name=unquote(u.path).lstrip('/')
        if name.startswith(('frontend/','img/')): name='assets/'+name
        asset=(root/name).resolve()
        if root.resolve() not in asset.parents or not asset.is_file():raise ValueError('Missing/unsafe asset: '+name)
        digest=hashlib.sha256(asset.read_bytes()).hexdigest()
        query=[(k,v) for k,v in parse_qsl(u.query,keep_blank_values=True) if k!='p0v']
        query.append(('p0v',digest[:16]))
        desired=urlunsplit(('', '', '/'+quote(name,safe='/@-._~'), urlencode(query), u.fragment))
        proof.append({'entry':entry,'before':raw,'after':desired,'asset':name,'sha256':digest})
        if raw==desired:continue
        rx=re.compile(r'(\b'+attr+r'\s*=\s*)([\"\'])(.*?)(\2)',re.I|re.S)
        found=list(rx.finditer(tag))
        if len(found)!=1:raise ValueError('Ambiguous attribute: '+tag)
        m=found[0]
        updated=tag[:m.start(3)]+html.escape(desired,quote=True)+tag[m.end(3):]
        changes.append((offset,len(tag),updated))
    result=source
    for offset,length,replacement in reversed(changes):result=result[:offset]+replacement+result[offset+length:]
    return result, proof, len(changes)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',required=True,type=Path)
    parser.add_argument('--write',action='store_true',help='Only use in an isolated working copy')
    parser.add_argument('--report',type=Path)
    args=parser.parse_args();root=args.root.resolve();rows=[];pending=[]
    for entry in ENTRIES:
        result,proof,count=rewrite(root,entry);rows.extend(proof)
        if count:pending.append((entry,result,count))
    if args.write:
        for entry,result,count in pending:(root/entry).write_bytes(result.encode("utf-8"))
    if args.report:args.report.write_text(json.dumps(rows,ensure_ascii=False,indent=2))
    print(json.dumps({'references':len(rows),'updatedAttributes':sum(x[2] for x in pending),'files':len(pending),'write':args.write}))
    if pending and not args.write:raise SystemExit(1)

if __name__=='__main__':main()
