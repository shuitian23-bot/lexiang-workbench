#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""更新 wiki/index.html hero 第三栏 = 今日更新条数。每日 0 点 cron 调用。"""

import sqlite3
import re
import sys
from datetime import datetime

DB_PATH = '/opt/projects/lexiang/lexiang.db'
INDEX_PATH = '/var/www/leaibot/wiki/index.html'
TODAY = datetime.now().strftime('%Y-%m-%d')

try:
    cn = sqlite3.connect(DB_PATH)
    row = cn.execute(
        "SELECT (SELECT COUNT(*) FROM products WHERE date(updated_at)=?) "
        "+ (SELECT COUNT(*) FROM knowledge_docs WHERE date(updated_at)=?)",
        (TODAY, TODAY)
    ).fetchone()
    today_updated = int(row[0] or 0)
    cn.close()
except Exception as e:
    print(f'DB error: {e}', file=sys.stderr)
    today_updated = 0

with open(INDEX_PATH, 'r', encoding='utf-8') as f:
    html = f.read()

new_html, n = re.subn(
    r'<div><strong(?:\s[^>]*)?>[^<]*</strong>(?:持续更新|今日更新)</div>',
    f'<div><strong id="stat-today">{today_updated:,}</strong>今日更新</div>',
    html,
    count=1,
)

if n == 0:
    print('hero stat pattern not found', file=sys.stderr)
    sys.exit(1)

if new_html != html:
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print(f'[{TODAY}] hero stat updated: today_updated={today_updated}')
else:
    print(f'[{TODAY}] no change (today_updated={today_updated})')
