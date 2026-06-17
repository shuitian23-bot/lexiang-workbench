#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""单文档静态页生成 - supplier/admin 发布后立即调用, 不等每日 cron。
用法: python3 gen_single_article.py <doc_id>
"""
import sys, os, sqlite3, json, re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_wiki_full as gwf

DB = '/opt/projects/lexiang/lexiang.db'
WIKI_DIR = '/var/www/leaibot/wiki'

def main():
    if len(sys.argv) < 2:
        print('用法: gen_single_article.py <doc_id>')
        sys.exit(1)
    doc_id = int(sys.argv[1])
    cn = sqlite3.connect(DB); cn.execute('PRAGMA busy_timeout=30000')
    row = cn.execute("SELECT id, title, source_url, content FROM knowledge_docs WHERE id=?", (doc_id,)).fetchone()
    cn.close()
    if not row:
        print(f'doc_id={doc_id} 不存在'); sys.exit(2)
    _id, title, source_url, content = row
    try:
        slug, cat, page_html = gwf.gen_know_html(_id, title or '', source_url or '', content or '')
    except Exception as e:
        print(f'gen 失败: {e}'); sys.exit(3)
    out = os.path.join(WIKI_DIR, slug)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(page_html)
    print(f'已生成: {out} (cat={cat}, {os.path.getsize(out)} bytes)')

    # 增量更新 articles-slim.json + articles.json
    for jp in [os.path.join(WIKI_DIR, 'articles-slim.json'), os.path.join(WIKI_DIR, 'articles.json')]:
        try:
            a = json.load(open(jp))
            existing = [i for i, x in enumerate(a) if x.get('slug') == slug]
            new_item = {'slug': slug, 'title': title, 'cat': cat, 'type': 'knowledge'}
            if jp.endswith('slim.json'):
                new_item.update({'desc': '', 'sku': '', 'price': 0})
            else:
                new_item.update({'desc': (content or '')[:150], 'brand_key': '', 'emoji': '📖',
                                 'ts': '', 'url': source_url or ''})
            if existing:
                a[existing[0]] = new_item
            else:
                a.insert(0, new_item)  # 新发布的放最前
            with open(jp, 'w', encoding='utf-8') as f:
                json.dump(a, f, ensure_ascii=False, separators=(',', ':'))
            print(f'  ↻ {os.path.basename(jp)}: {"updated" if existing else "inserted"}')
        except Exception as e:
            print(f'  ✗ {jp}: {e}')

if __name__ == '__main__':
    main()
