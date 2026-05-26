#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫 DB：应有规格但 specs 缺规格的 active 整机商品 → 写待补清单。
crawl_item_pages.js 跑该清单补规格。已补到的下次自动不再入选（收敛）；
未发布/无 parameters 的（如 5/19 前的新品）会持续留清单，每天重试直到补完。
"""
import sqlite3, json, sys, os

DB_PATH = '/opt/projects/lexiang/lexiang.db'
OUT = '/opt/projects/lexiang/data/missing_specs.txt'

# 整机类（该有 CPU/屏幕等规格）— 命中才纳入；服务/配件/虚拟品本身无规格，不入清单避免空转
WHOLE_KW = ('笔记本', '平板', '台式', '一体机', '显示器', '工作站', '服务器',
            '手机', '掌机', '游戏本', '电脑')
SKIP_KW = ('服务', '延保', '保护', '贴膜', '券', '会员', '卡', '套餐', '套装',
           '鼠标', '键盘', '耳机', '适配器', '支架', '包', '线', '充电', '碳粉', '墨盒')

def main():
    cn = sqlite3.connect(DB_PATH)
    rows = cn.execute(
        "SELECT sku, name, category, specs FROM products "
        "WHERE status='active' AND name IS NOT NULL AND name!=''"
    ).fetchall()
    cn.close()

    out = []
    for sku, name, category, specs_str in rows:
        try:
            sp = json.loads(specs_str or '{}')
        except Exception:
            sp = {}
        # 已有任一核心规格 → 已补，跳过
        if sp.get('cpu') or sp.get('screen_size') or sp.get('memory'):
            continue
        nm = (name or '')
        cat = (category or '') + ' ' + (sp.get('lvl1') or '')
        if any(k in nm for k in SKIP_KW):
            continue
        if not (any(k in cat for k in WHOLE_KW) or any(k in nm for k in WHOLE_KW)):
            continue
        out.append(str(sku))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + ('\n' if out else ''))
    print(f'待补规格: {len(out)} 个 → {OUT}')
    return 0 if out else 1

if __name__ == '__main__':
    sys.exit(main())
