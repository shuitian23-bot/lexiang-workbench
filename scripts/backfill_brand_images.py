#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""遍历 DB brand_news 现有 url 重新抓正文+图(extract_body 升级保留 img → markdown), UPDATE content。
不依赖 brand API(API 现只返 10 条新, 拿不到历史 967 条 url)。
"""
import sqlite3, sys, os, time
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from crawl_brand_full import extract_body, HEADERS

DB = '/opt/projects/lexiang/lexiang.db'
DELAY = 0.3

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        if r.status != 200:
            return None
        return r.read().decode('utf-8', errors='replace')

def main():
    cn = sqlite3.connect(DB); cn.execute('PRAGMA busy_timeout=30000')
    rows = cn.execute("SELECT id, source_url, content FROM knowledge_docs WHERE source_type='brand_news' AND content NOT LIKE '%![](%' ORDER BY id").fetchall()
    print(f'待补图 brand_news: {len(rows)} 条')
    upd = fail = noimg = 0
    for i, (doc_id, url, old_content) in enumerate(rows, 1):
        try:
            h = fetch(url)
        except Exception as e:
            fail += 1
            if fail <= 5: print(f'  {url[-30:]} 失败: {str(e)[:50]}')
            time.sleep(0.2); continue
        if not h:
            fail += 1; time.sleep(0.2); continue
        body = extract_body(h)
        if not body or '![](' not in body:
            noimg += 1; time.sleep(DELAY); continue
        # 保留原 title/desc 头, 拼接新带图正文(去掉旧正文残留)
        lines = (old_content or '').split('\n\n')
        head = '\n\n'.join(lines[:2]) if len(lines) >= 2 else (old_content or '')
        new_content = f"{head}\n\n{body}"
        cn.execute("UPDATE knowledge_docs SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (new_content, doc_id))
        cn.commit()
        upd += 1
        if upd % 50 == 0:
            print(f'  [{i}/{len(rows)}] 已补 {upd} 含图')
        time.sleep(DELAY)
    cn.close()
    print(f'=== 完成: 补图 {upd}, 无图 {noimg}, 失败 {fail} ===')

if __name__ == '__main__':
    main()
