#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""拉联想商城 f.lenovo.com.cn/goods/new/price/singlePrice 真价, 修 OpenAPI 占位价。
扫 DB active 商品 price 是占位值的 → 调端点拿真价 → UPDATE。
"""
import sqlite3, json, time, sys
import urllib.request

DB = '/opt/projects/lexiang/lexiang.db'
URL = 'https://f.lenovo.com.cn/goods/new/price/singlePrice?terminal=1&gcode={}'
HDR = {'Referer': 'https://mitem.lenovo.com.cn/',
       'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0) AppleWebKit/605.1.15'}
PLACE = {0, 99999, 888888, 999999, 9999999}
DELAY = 0.3

def fetch(sku):
    req = urllib.request.Request(URL.format(sku), headers=HDR)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode('utf-8'))

def get_price(resp):
    try:
        p = resp.get('result', {}).get('price', {}).get('deliveryPrice', {}).get('price')
        if p is None:
            return None
        f = float(str(p).replace(',', ''))
        if f <= 0 or f >= 999999:
            return None
        return f
    except Exception:
        return None

def main():
    """两模式:
       默认(快): 只补占位价 SKU
       FULL=1(慢): 全量重抓 active+offline21d 所有 SKU, 价差>=3% 才 UPDATE(防小抖动)
       端点端 deliveryPrice 是商城实时挂牌价, 与官网一致, 解决 OpenAPI 缓存过期真价问题(如 K70 1053382 3月¥4599 → 6月¥6399)
    """
    import os as _os
    FULL = _os.environ.get('FETCH_PRICE_FULL', '0').strip() in ('1','true','yes')
    DIFF_PCT = 0.03  # 价差 >=3% 才更新
    cn = sqlite3.connect(DB)
    cn.execute('PRAGMA busy_timeout=30000')
    if FULL:
        rows = cn.execute(
            "SELECT sku, price FROM products WHERE name IS NOT NULL AND name!='' "
            "AND (status='active' OR (status='offline' AND date(COALESCE(updated_at,created_at))>=date('now','-21 day')))"
        ).fetchall()
        print(f'[FULL 模式] 扫全量 active+21d: {len(rows)} 条')
    else:
        rows = cn.execute(
            "SELECT sku, price FROM products WHERE name IS NOT NULL AND name!='' "
            "AND (status='active' OR (status='offline' AND date(COALESCE(updated_at,created_at))>=date('now','-21 day'))) "
            "AND (price IS NULL OR price IN (0,99999,888888,999999,9999999) OR price>=999999)"
        ).fetchall()
        print(f'[快速模式] 占位价 SKU: {len(rows)} 条')
    skus = [(r[0], r[1] or 0) for r in rows if r[0]]
    ok = upd = fail = noprice = unchanged = 0
    for i, (sku, old_price) in enumerate(skus, 1):
        try:
            resp = fetch(sku)
            price = get_price(resp)
            if price is None:
                noprice += 1
            else:
                # FULL 模式: 价差 >=3% 才写; 占位价 / 0 一律写
                if FULL and old_price > 100 and abs(price - old_price) / old_price < DIFF_PCT:
                    unchanged += 1
                else:
                    cn.execute('UPDATE products SET price=?, updated_at=CURRENT_TIMESTAMP WHERE sku=?', (price, sku))
                    cn.commit()
                    upd += 1
                    if upd % 50 == 0:
                        print(f'  [{i}/{len(skus)}] 已补 {upd} 条, 最新 sku={sku} 价={old_price}→{price}')
            ok += 1
        except Exception as e:
            fail += 1
            if fail <= 5:
                print(f'  {sku} 失败: {str(e)[:60]}')
        time.sleep(DELAY)
    print(f'\n=== 完成: 拉取 {ok}, 补真价 {upd}, 无变化 {unchanged}, 无价 {noprice}, 失败 {fail} ===')
    cn.close()

if __name__ == '__main__':
    main()
