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
    cn = sqlite3.connect(DB)
    cn.execute('PRAGMA busy_timeout=30000')
    # 含 active 和近21天 offline(预售品),与 wiki 收录规则一致
    rows = cn.execute(
        "SELECT sku FROM products WHERE name IS NOT NULL AND name!='' "
        "AND (status='active' OR (status='offline' AND date(COALESCE(updated_at,created_at))>=date('now','-21 day'))) "
        "AND (price IS NULL OR price IN (0,99999,888888,999999,9999999) OR price>=999999)"
    ).fetchall()
    skus = [r[0] for r in rows if r[0]]
    print(f'占位价 active 商品: {len(skus)}')
    ok = upd = fail = noprice = 0
    for i, sku in enumerate(skus, 1):
        try:
            resp = fetch(sku)
            price = get_price(resp)
            if price is None:
                noprice += 1
            else:
                cn.execute('UPDATE products SET price=?, updated_at=CURRENT_TIMESTAMP WHERE sku=?', (price, sku))
                cn.commit()
                upd += 1
                if upd % 50 == 0:
                    print(f'  [{i}/{len(skus)}] 已补 {upd} 条, 最新 sku={sku} 价={price}')
            ok += 1
        except Exception as e:
            fail += 1
            if fail <= 5:
                print(f'  {sku} 失败: {str(e)[:60]}')
        time.sleep(DELAY)
    print(f'\n=== 完成: 拉取 {ok}, 补真价 {upd}, 无价 {noprice}, 失败 {fail} ===')
    cn.close()

if __name__ == '__main__':
    main()
