#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""补全 biz.lenovo.com.cn/case/zixunXXXXX 资讯(brand API 不返回这些老编号)。
遍历编号, 抓存在的入 knowledge_docs(brand_news), 按 url 去重。
"""
import sqlite3, re, html, time, sys, os
import urllib.request

# 复用 brand 爬虫的 extract_body(已升级保留 img → markdown)
sys.path.insert(0, os.path.dirname(__file__))
from crawl_brand_full import extract_body

DB = '/opt/projects/lexiang/lexiang.db'
HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
MAX_NUM = int(sys.argv[1]) if len(sys.argv) > 1 else 60
FORCE = '--force' in sys.argv  # 覆盖重抓现有 content(短/无图的旧记录)
_PUB = re.compile(r'(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?')

def fetch(url):
    req = urllib.request.Request(url, headers=HDR)
    with urllib.request.urlopen(req, timeout=15) as r:
        if r.status != 200:
            return None
        return r.read().decode('utf-8', errors='replace')

def meta(html_s, name):
    m = re.search(r'<meta\s+name="%s"\s+content="([^"]*)"' % name, html_s)
    return html.unescape(m.group(1)) if m else ''

def title_of(html_s):
    m = re.search(r'<title>([^<]*)</title>', html_s)
    t = html.unescape(m.group(1)).strip() if m else ''
    t = re.sub(r'[-_|].*(联想|lenovo).*$', '', t, flags=re.I).strip()
    return t

def pubdate(text):
    m = _PUB.search((text or '')[:1200])
    if not m: return None
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (2018 <= y <= 2028 and 1 <= mo <= 12 and 1 <= d <= 31): return None
    return f"{y:04d}-{mo:02d}-{d:02d} {int(m.group(4) or 0):02d}:{m.group(5) or '00'}:{m.group(6) or '00'}"

def norm(u): return re.sub(r'^https?://', '', (u or '').lower()).rstrip('/')

def main():
    cn = sqlite3.connect(DB); cn.execute('PRAGMA busy_timeout=30000')
    existing = {}
    for r in cn.execute("SELECT id, source_url, length(content) FROM knowledge_docs WHERE source_type='brand_news'"):
        existing[norm(r[1])] = (r[0], r[2] or 0)
    ins = upd = skip = miss = 0
    for n in range(1, MAX_NUM + 1):
        url = f'https://biz.lenovo.com.cn/case/zixun{n:05d}.html'
        nk = norm(url)
        ex = existing.get(nk)
        if ex and not FORCE:
            skip += 1; continue
        try:
            h = fetch(url)
        except Exception:
            miss += 1; time.sleep(0.2); continue
        if not h:
            miss += 1; time.sleep(0.2); continue
        desc = meta(h, 'description')
        title = title_of(h) or (desc[:40] if desc else '')
        if not title or len(desc) < 10:
            miss += 1; time.sleep(0.2); continue
        body = extract_body(h)  # 含 markdown img
        content_parts = [title, desc]
        if body and len(body) > len(desc):
            content_parts.append(body)
        content = '\n\n'.join(content_parts)
        pd = pubdate(h) or pubdate(desc)
        if ex:
            cn.execute("UPDATE knowledge_docs SET title=?, content=?, publish_date=COALESCE(?,publish_date), updated_at=CURRENT_TIMESTAMP WHERE id=?",
                       (title, content, pd, ex[0]))
            upd += 1
            print(f'  ↻zixun{n:05d}: {title[:36]} (含图{content.count("![](")}个)')
        else:
            cn.execute("INSERT INTO knowledge_docs (title, filename, source_type, source_url, content, publish_date) VALUES (?,?,?,?,?,?)",
                       (title, f'bizcase-{n:05d}', 'brand_news', url, content, pd))
            ins += 1
            print(f'  +zixun{n:05d}: {title[:36]} (含图{content.count("![](")}个)')
        cn.commit()
        existing[nk] = (cn.lastrowid if not ex else ex[0], len(content))
        time.sleep(0.3)
    cn.close()
    print(f'=== 完成: 新增 {ins}, 更新 {upd}, 已存在 {skip}, 不存在/跳过 {miss} ===')

if __name__ == '__main__':
    main()
