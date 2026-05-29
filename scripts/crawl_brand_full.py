#!/usr/bin/env python3
"""全量爬取 brand.lenovo.com.cn 文章：API列表 + SSR正文提取"""
import json, re, sqlite3, html, sys, time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

DB_PATH = '/opt/projects/lexiang/lexiang.db'
API_URL = 'https://s.lenovo.com.cn/search/brand?id=85&type=brand&curPage={page}&pageSize=48'
WORKERS = 10

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def fetch_article_list():
    """通过API拉文章列表。默认增量模式(只拉最新N页), 环境变量 CRAWL_BRAND_PAGES=0 全量。
    增量足够日常 cron(几千篇全量太慢25min+ 超时), 全量手动跑。"""
    import os as _os
    max_pages = int(_os.environ.get('CRAWL_BRAND_PAGES', '5'))  # 默认 5 页 ≈ 240 篇/次, _norm_url 去重新增
    all_items = []
    page = 1
    while True:
        if max_pages > 0 and page > max_pages:
            print(f'  增量模式: 拉满 {max_pages} 页, 停止 (累计{len(all_items)}). 全量用 CRAWL_BRAND_PAGES=0')
            break
        url = API_URL.format(page=page)
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f'  API第{page}页失败: {e}')
            break

        items = data.get('items', [])
        if not items:
            break

        all_items.extend(items)
        print(f'  API第{page}页: {len(items)}篇 (累计{len(all_items)})')
        page += 1
        time.sleep(0.3)

    return all_items


_PUB_PAT = re.compile(r'(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?')

def extract_pubdate(text):
    """从正文前 800 字提首个完整日期 → 'YYYY-MM-DD HH:MM:SS'，无则 None"""
    m = _PUB_PAT.search((text or '')[:800])
    if not m:
        return None
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (2018 <= y <= 2027 and 1 <= mo <= 12 and 1 <= d <= 31):
        return None
    hh = m.group(4) or '00'; mm = m.group(5) or '00'; ss = m.group(6) or '00'
    return f"{y:04d}-{mo:02d}-{d:02d} {int(hh):02d}:{mm}:{ss}"


def _normalize_img_url(src):
    src = (src or '').strip()
    if not src or src.startswith('data:'):
        return ''
    if src.startswith('//'):
        return 'https:' + src
    if src.startswith('/'):
        return 'https://biz.lenovo.com.cn' + src
    return src

def extract_body(raw_html):
    """从HTML提取正文, 保留 <img src> 转 markdown ![alt](src), 供 gen_wiki format_content 渲染"""
    for pat in [
        r'class="center-content"[^>]*>([\s\S]*?)</div>\s*</div>\s*</div>',
        r'class="pcContent"[^>]*>([\s\S]*?)</div>\s*</div>',
        r'class="detail-content"[^>]*>([\s\S]*?)</div>\s*</div>',
        # zixun/biz case 用 le-seo-content-text 容器
        r'class="le-seo-content-text"[^>]*>([\s\S]*?)(?=<div\s+class="le-seo-content-pagination|</section>|</main>|<footer)',
        # 其他常见容器
        r'class="article-content[^"]*"[^>]*>([\s\S]*?)</div>\s*</div>',
        r'class="news-detail[^"]*"[^>]*>([\s\S]*?)</article>',
        r'<article[^>]*>([\s\S]*?)</article>',
    ]:
        m = re.search(pat, raw_html)
        if m:
            body = m.group(1)
            # 先转 img → markdown(避免后续 del tags 把 img 干掉)
            def _img(mm):
                src = _normalize_img_url(mm.group(1))
                if not src or re.search(r'\{\{|\$\{', src):  # 跳过模板占位
                    return ''
                # 过滤 1x1 像素/小图标
                if re.search(r'(icon|logo|sprite|spacer|placeholder)\.(png|gif|svg)', src, re.I):
                    return ''
                return f'\n\n![]({src})\n\n'
            body = re.sub(r'<img[^>]*?src="([^"]+)"[^>]*>', _img, body, flags=re.I)
            body = re.sub(r'<script[\s\S]*?</script>', '', body, flags=re.I)
            body = re.sub(r'<style[\s\S]*?</style>', '', body, flags=re.I)
            body = re.sub(r'<[^>]+>', '\n', body)  # 删剩余标签
            body = re.sub(r'\n{3,}', '\n\n', body).strip()
            body = html.unescape(body)
            return body
    return ''


def fetch_article_content(item):
    """拉取单篇文章正文"""
    code = item.get('code', '')
    pc_url = item.get('pcUrl', '')
    if pc_url.startswith('//'):
        pc_url = 'https:' + pc_url
    title = item.get('title', '')
    intro = item.get('introduction', '')

    try:
        req = urllib.request.Request(pc_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        return {
            'code': code, 'title': title, 'url': pc_url,
            'content': f"{title}\n\n{intro}" if intro else title,
            'error': str(e)
        }

    body = extract_body(raw)

    parts = [title]
    if intro and intro != title:
        parts.append(intro)
    if body:
        parts.append(body)
    content = '\n\n'.join(parts)

    return {
        'code': code, 'title': title, 'url': pc_url,
        'content': content, 'body_len': len(body),
        'publish_date': extract_pubdate(content)
    }


def main():
    print('=== 全量爬取 brand.lenovo.com.cn ===\n')

    # 1. 拉API列表
    print('步骤1: 拉取文章列表...')
    items = fetch_article_list()
    print(f'共获取 {len(items)} 篇文章\n')

    if not items:
        print('没有获取到文章，退出')
        return

    # 2. 查已有（按规范化 url 去重 key：去协议头 + 去末尾斜杠 + 小写，彻底防 http/https/变体重复入库）
    def _norm_url(u):
        u = (u or '').strip().lower()
        u = re.sub(r'^https?://', '', u)
        return u.rstrip('/')

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout=30000")
    cur = conn.cursor()
    existing = {}
    # 按 source_type 查全部已入库(含 biz.lenovo/case 等), 原 LIKE '%brand.lenovo%' 漏 biz url 致每日重复
    for row in cur.execute("SELECT id, source_url, length(content), content LIKE '%![](%' FROM knowledge_docs WHERE source_type='brand_news'"):
        existing[_norm_url(row[1])] = (row[0], row[2], bool(row[3]))

    print(f'数据库已有 {len(existing)} 条brand记录\n')

    # 3. 并发拉正文
    print('步骤2: 拉取正文...')
    results = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(fetch_article_content, item): item for item in items}
        done = 0
        for fut in as_completed(futures):
            result = fut.result()
            results.append(result)
            done += 1
            if done % 100 == 0:
                print(f'  进度: {done}/{len(items)}')

    print(f'  完成: {len(results)}篇\n')

    # 4. 入库
    print('步骤3: 写入数据库...')
    new_count = 0
    update_count = 0
    skip_count = 0

    for r in results:
        url = r['url']
        title = r['title']
        content = r['content']
        code = r['code']

        if len(content.strip()) < 20:
            skip_count += 1
            continue

        # 检查是否已存在（规范化 url 比对，杜绝 http/https/斜杠变体重复入库）
        nkey = _norm_url(url)
        ex = existing.get(nkey)
        if ex:
            doc_id, old_len, old_has_img = ex if len(ex) == 3 else (ex[0], ex[1], False)
            new_has_img = '![](' in content
            # 触发更新: 新内容明显更长 或 新带图旧不带图(extract_body 升级后补图)
            if len(content) > old_len * 1.5 or (new_has_img and not old_has_img):
                cur.execute("UPDATE knowledge_docs SET content = ?, title = ?, publish_date = COALESCE(?, publish_date) WHERE id = ?",
                            (content, title, r.get('publish_date'), doc_id))
                update_count += 1
            elif r.get('publish_date'):
                cur.execute("UPDATE knowledge_docs SET publish_date = COALESCE(publish_date, ?) WHERE id = ?",
                            (r.get('publish_date'), doc_id))
        else:
            cur.execute(
                "INSERT INTO knowledge_docs (title, filename, source_type, source_url, content, publish_date) VALUES (?, ?, ?, ?, ?, ?)",
                (title, f'brand-{code}', 'brand_news', url, content, r.get('publish_date'))
            )
            existing[nkey] = (cur.lastrowid, len(content))  # 防同批内重复 INSERT
            new_count += 1

    conn.commit()
    conn.close()

    # 统计正文长度分布
    body_lens = [r.get('body_len', 0) for r in results]
    has_body = sum(1 for b in body_lens if b > 100)
    errors = sum(1 for r in results if r.get('error'))

    print(f'\n=== 完成 ===')
    print(f'API总数: {len(items)}')
    print(f'新增: {new_count}')
    print(f'更新(正文变长): {update_count}')
    print(f'跳过(内容太短): {skip_count}')
    print(f'有正文(>100字): {has_body}')
    print(f'拉取出错: {errors}')


if __name__ == '__main__':
    main()
