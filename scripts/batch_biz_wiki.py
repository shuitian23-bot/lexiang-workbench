#!/usr/bin/env python3
"""
批量生成biz.lenovo.com.cn/product/下全部产品wiki页面
流程：爬URL列表 → Playwright抓内容 → qwen-plus提取+生成QA → gen_page()输出HTML

用法：
  python3 batch_biz_wiki.py crawl      # 第1步：爬602个产品URL
  python3 batch_biz_wiki.py fetch       # 第2步：Playwright抓取每个页面内容
  python3 batch_biz_wiki.py extract     # 第3步：qwen-plus提取结构化内容+QA
  python3 batch_biz_wiki.py generate    # 第4步：生成wiki HTML页面
  python3 batch_biz_wiki.py all         # 全流程一次跑完
  python3 batch_biz_wiki.py status      # 查看进度
"""
import sys, os, json, re, time, html
sys.path.insert(0, '/root/lexiang/scripts')
os.chdir('/root/lexiang')

import requests as req
from gen_wiki_full import format_content, extract_slug_from_url

# ============ 配置 ============
DATA_DIR = '/root/lexiang/data/biz_wiki'
WIKI_DIR = '/var/www/leaibot/wiki'
URLS_FILE = os.path.join(DATA_DIR, 'urls.json')
SNAPSHOTS_DIR = os.path.join(DATA_DIR, 'snapshots')
EXTRACTED_DIR = os.path.join(DATA_DIR, 'extracted')
PROGRESS_FILE = os.path.join(DATA_DIR, 'progress.json')

DASHSCOPE_KEY = 'sk-3f53104ba295403890bab6b9fee8e773'
DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
QWEN_MODEL = 'qwen-plus'

TODAY = time.strftime('%Y-%m-%d')

# biz产品分类关键词映射
CAT_RULES = [
    ('notebook', ['笔记本', 'thinkpad', 'thinkbook', '昭阳', '慧天', '开天', '扬天']),
    ('desktop', ['台式机', '启天', 'thinkcentre', '扬天台式', '瑞天台式']),
    ('workstation', ['工作站', 'thinkstation']),
    ('server', ['服务器', 'thinksystem', 'thinkserver', 'thinkagile hx', '边缘服务器', 'thinkedge']),
    ('storage_network', ['交换机', '存储', 'thinkagile', 'aipod', '容灾', '备份', '全闪', '混闪',
                         '软件定义', 'dm系列', 'dg系列', '对象存储', '数据保护']),
    ('smart_device', ['显示器', 'thinkvision', '智慧屏', '会议', '教学', '工控', '外设', '音频',
                      '打印机', '平板', '充电', '鼠标', '键盘', '扩展坞', '适配器', '摄像',
                      '音箱', '耳机', '背包', '大屏', '一体机']),
    ('solution', ['解决方案', '方案', '智算', '万全']),
]

def detect_cat(title, url=''):
    t = (title or '').lower()
    u = (url or '').lower()
    combined = t + ' ' + u
    for cat, keywords in CAT_RULES:
        if any(k in combined for k in keywords):
            # 排除：存储类关键词优先，但"闪存盘/优盘/usb"排除
            if cat == 'storage_network' and any(ex in combined for ex in ['闪存盘', '优盘', 'usb']):
                continue
            return cat
    return 'smart_device'

def ensure_dirs():
    for d in [DATA_DIR, SNAPSHOTS_DIR, EXTRACTED_DIR]:
        os.makedirs(d, exist_ok=True)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {'crawled': False, 'fetched': [], 'extracted': [], 'generated': []}

def save_progress(prog):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(prog, f, ensure_ascii=False, indent=2)

# ============ 第1步：爬URL列表 ============
def step_crawl():
    ensure_dirs()
    print('=== 第1步：爬取biz产品URL列表 ===')
    from playwright.sync_api import sync_playwright

    all_urls = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for pg in range(1, 20):  # 最多20页
            url = f'https://biz.lenovo.com.cn/search/?dcgType=product&recommendType=0&key=&pageNo={pg}'
            print(f'  爬取第{pg}页...')
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            time.sleep(5)

            # 提取产品链接
            links = page.eval_on_selector_all(
                'a[href*="/product/"], a[href*="/pd/"]',
                '''els => els.map(el => ({
                    url: el.href,
                    title: (el.textContent || '').trim().substring(0, 100)
                }))'''
            )

            if not links:
                print(f'  第{pg}页无产品，结束')
                break

            # 去重
            seen = {u['url'] for u in all_urls}
            new = [l for l in links if l['url'] not in seen and '/product/' in l['url']]
            all_urls.extend(new)
            print(f'  第{pg}页新增 {len(new)} 个URL（累计 {len(all_urls)}）')

            if len(new) == 0:
                break

        browser.close()

    # 清洗URL — 按产品ID去重
    cleaned = []
    seen_ids = set()
    for item in all_urls:
        url = item['url'].replace('//', 'https://', 1) if item['url'].startswith('//') else item['url']
        if not url.startswith('http'):
            url = 'https://biz.lenovo.com.cn' + url
        m = re.search(r'/product/([A-Za-z0-9]+)\.html', url)
        if m:
            pid = m.group(1)
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            clean_url = f'https://biz.lenovo.com.cn/product/{pid}.html'
            cleaned.append({
                'id': pid,
                'url': clean_url,
                'title': item['title'][:80] if item['title'] else '',
            })

    with open(URLS_FILE, 'w') as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    prog = load_progress()
    prog['crawled'] = True
    save_progress(prog)
    print(f'\n完成！共 {len(cleaned)} 个产品URL → {URLS_FILE}')
    return cleaned

# ============ 第2步：HTTP获取CMS图片+OCR提取文字 ============
def fetch_cms_images(pid):
    """从 /dcg/{pid} 获取CMS背景图URL列表"""
    try:
        resp = req.get(f'https://biz.lenovo.com.cn/dcg/{pid}', timeout=20,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
        if resp.status_code != 200:
            return []
        imgs = re.findall(r'background-image:url\((//[^)]+\.(?:jpg|png|jpeg|webp))\)', resp.text)
        return ['https:' + img for img in imgs]
    except:
        return []

def fetch_product_meta(pid):
    """从产品页HTML提取标题、SEO描述等元数据"""
    try:
        resp = req.get(f'https://biz.lenovo.com.cn/product/{pid}.html', timeout=20,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
        if resp.status_code != 200:
            return {}
        html_text = resp.text
        meta = {}
        m = re.search(r'categoryName[\\"]+"?\s*[:\\,]\s*[\\"]+([\w\s\-\u4e00-\u9fff]+)', html_text)
        if m: meta['name'] = m.group(1).strip()
        m = re.search(r'seoDescriptions[\\"]+"?\s*[:\\,]\s*[\\"]+([^"\\]{10,})', html_text)
        if m: meta['desc'] = m.group(1).strip()
        m = re.search(r'seoKeywords[\\"]+"?\s*[:\\,]\s*[\\"]+([^"\\]{5,})', html_text)
        if m: meta['keywords'] = m.group(1).strip()
        return meta
    except:
        return {}

def ocr_image(img_url, max_retries=2):
    """用qwen-vl-plus OCR提取图片中文字"""
    for attempt in range(max_retries):
        try:
            resp = req.post(DASHSCOPE_URL,
                headers={'Authorization': f'Bearer {DASHSCOPE_KEY}', 'Content-Type': 'application/json'},
                json={
                    'model': 'qwen-vl-plus',
                    'messages': [{'role': 'user', 'content': [
                        {'type': 'image_url', 'image_url': {'url': img_url}},
                        {'type': 'text', 'text': '请完整提取图片中的所有文字内容，包括标题、描述、规格参数、表格等。输出纯文本。'}
                    ]}],
                    'max_tokens': 3000,
                    'temperature': 0.1
                },
                timeout=120
            )
            data = resp.json()
            if 'choices' in data:
                return data['choices'][0]['message']['content']
            time.sleep(3)
        except Exception as e:
            time.sleep(5)
    return ''

def step_fetch():
    ensure_dirs()
    print('=== 第2步：HTTP获取CMS图片 + qwen-vl-plus OCR ===')

    with open(URLS_FILE) as f:
        urls = json.load(f)

    prog = load_progress()
    fetched = set(prog.get('fetched', []))
    total = len(urls)

    for i, item in enumerate(urls):
        pid = item['id']
        if pid in fetched:
            continue

        snap_file = os.path.join(SNAPSHOTS_DIR, f'{pid}.txt')
        print(f'  [{i+1}/{total}] {pid} - {item["title"][:40]}...')

        # 获取元数据
        meta = fetch_product_meta(pid)
        title = meta.get('name', item.get('title', pid))

        # 获取CMS图片
        cms_imgs = fetch_cms_images(pid)

        if not cms_imgs:
            # 无CMS图片，用SEO描述做基础内容
            desc = meta.get('desc', '')
            kw = meta.get('keywords', '')
            if desc:
                text = f'{title}\n\n{desc}\n\n关键词：{kw}'
                with open(snap_file, 'w', encoding='utf-8') as f:
                    f.write(text)
                fetched.add(pid)
                print(f'    ⚠️ 无CMS图片，仅SEO描述 ({len(text)}字符)')
            else:
                print(f'    ❌ 无内容可提取')
            continue

        # OCR每张图片（最多8张，跳过首图banner）
        all_text = [title, '']
        ocr_imgs = cms_imgs[1:9] if len(cms_imgs) > 1 else cms_imgs[:8]
        for j, img_url in enumerate(ocr_imgs):
            ocr_text = ocr_image(img_url)
            if ocr_text and len(ocr_text.strip()) > 20:
                all_text.append(ocr_text.strip())
                all_text.append('')
            time.sleep(0.5)

        combined = '\n'.join(all_text)
        with open(snap_file, 'w', encoding='utf-8') as f:
            f.write(combined)

        fetched.add(pid)
        prog['fetched'] = list(fetched)
        if (i + 1) % 5 == 0:
            save_progress(prog)
            print(f'    进度已保存 ({len(fetched)}/{total})')

        print(f'    ✅ {len(cms_imgs)}图 → {len(combined)}字符')
        time.sleep(0.5)

    save_progress(prog)
    print(f'\n完成！已处理 {len(fetched)}/{total} 个产品')

# ============ 第3步：qwen-plus提取结构化内容 ============
EXTRACT_PROMPT = """你是联想产品wiki内容编辑。请从以下产品页面文本中提取完整的结构化内容。

严格要求：
1. 提取所有段落描述，保留完整文字，不要缩写或省略任何内容
2. 提取所有表格数据，用markdown表格格式输出（用|分隔列），保留每个单元格完整内容
3. 提取产品特性、规格参数
4. 去掉页面导航、登录注册、版权声明等无关内容
5. 在最后的"常见问题"标记后，生成6-10个高质量QA对，格式为：
   Q: 问题
   A: 回答
6. 输出纯文本格式，段落之间空行分隔，标题单独一行
7. 不要加markdown的#号标题标记，不要加**加粗**标记
8. 第一行必须是产品名称/标题

页面文本：
{content}"""

def call_qwen(content, max_retries=3):
    for attempt in range(max_retries):
        try:
            resp = req.post(DASHSCOPE_URL,
                headers={
                    'Authorization': f'Bearer {DASHSCOPE_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': QWEN_MODEL,
                    'messages': [{'role': 'user', 'content': EXTRACT_PROMPT.format(content=content[:12000])}],
                    'max_tokens': 6000,
                    'temperature': 0.2
                },
                timeout=180
            )
            data = resp.json()
            if 'choices' in data:
                return data['choices'][0]['message']['content']
            else:
                print(f'    API错误: {data.get("error", {}).get("message", "unknown")}')
                time.sleep(5)
        except Exception as e:
            print(f'    请求失败(重试{attempt+1}): {e}')
            time.sleep(10)
    return None

def step_extract():
    ensure_dirs()
    print('=== 第3步：qwen-plus提取结构化内容 ===')

    with open(URLS_FILE) as f:
        urls = json.load(f)

    prog = load_progress()
    extracted = set(prog.get('extracted', []))

    total = len(urls)
    for i, item in enumerate(urls):
        pid = item['id']
        if pid in extracted:
            continue

        snap_file = os.path.join(SNAPSHOTS_DIR, f'{pid}.txt')
        if not os.path.exists(snap_file):
            continue

        out_file = os.path.join(EXTRACTED_DIR, f'{pid}.txt')
        print(f'  [{i+1}/{total}] {pid} - {item["title"][:40]}...')

        with open(snap_file, 'r', encoding='utf-8') as f:
            raw = f.read()

        if len(raw.strip()) < 50:
            print(f'    ⚠️ 内容过短，跳过')
            continue

        result = call_qwen(raw)
        if result:
            with open(out_file, 'w', encoding='utf-8') as f:
                f.write(result)
            extracted.add(pid)
            prog['extracted'] = list(extracted)
            if (i + 1) % 5 == 0:
                save_progress(prog)
            print(f'    ✅ {len(result)} 字符')
            time.sleep(1)  # 限速
        else:
            print(f'    ❌ 提取失败')

    save_progress(prog)
    print(f'\n完成！已提取 {len(extracted)}/{total} 个产品')

# ============ 第4步：生成wiki HTML ============
def parse_content_and_qa(raw):
    split_idx = raw.find('常见问题')
    if split_idx > 0:
        body = raw[:split_idx].rstrip()
        qa_text = raw[split_idx:]
    else:
        body = raw
        qa_text = ''

    qa_pairs = []
    if qa_text:
        pattern = r'Q:\s*(.+?)(?:\n)A:\s*(.+?)(?=\nQ:|\Z)'
        for m in re.finditer(pattern, qa_text, re.DOTALL):
            q = m.group(1).strip()
            a = m.group(2).strip()
            if q and a:
                qa_pairs.append((q, a))
    return body, qa_pairs

def gen_faq_html(qa_pairs):
    if not qa_pairs:
        return ''
    items = ''
    for q, a in qa_pairs[:10]:
        q_esc = html.escape(q)
        a_esc = html.escape(a).replace('\n', '<br>')
        items += f'<div class="faq-item">\n  <h3 class="faq-q">{q_esc}</h3>\n  <div class="faq-a">{a_esc}</div>\n</div>\n'
    return f'<section class="faq-section" id="faq">\n  <h2>常见问题解答</h2>\n  {items}\n</section>'

def gen_faq_schema(qa_pairs):
    if not qa_pairs:
        return ''
    entities = []
    for q, a in qa_pairs[:10]:
        entities.append({"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}})
    return json.dumps({"@type": "FAQPage", "mainEntity": entities}, ensure_ascii=False)

def gen_page_html(pid, title, source_url, body_text, qa_pairs, cat):
    content_html = format_content(body_text)
    faq_html_str = gen_faq_html(qa_pairs)
    slug = extract_slug_from_url(source_url, pid, is_product=True)

    cat_labels = {
        'server': '服务器', 'workstation': '工作站', 'notebook': '笔记本',
        'desktop': '台式机', 'solution': '解决方案', 'storage_network': '存储/网络',
        'smart_device': '智能设备',
    }
    cat_label = cat_labels.get(cat, '智能设备')
    title_safe = html.escape(f'{title[:60]}-联想乐享知识库')
    title_short = html.escape(title[:30])
    source_safe = html.escape(source_url)

    if qa_pairs:
        topics = '、'.join(q for q, _ in qa_pairs[:3])
        summary = f'本文来源联想官方，解答关于 <strong>{html.escape(title)}</strong> 的常见问题，包括：{html.escape(topics)}等。'
    else:
        text = re.sub(r'[#*!\[\]`]', '', body_text).strip()[:100]
        summary = html.escape(text) + '…'

    if qa_pairs:
        desc = f'{title}：解答{qa_pairs[0][0][:60]}等常见问题，来源联想官方。'
    else:
        desc = re.sub(r'[#*!\[\]`]', '', body_text).strip()[:90]
    desc_safe = html.escape(desc[:90])

    kw_parts = re.findall(r'[A-Za-z][A-Za-z0-9\s\-]+|[\u4e00-\u9fff]{2,6}', title)
    keywords_str = html.escape(','.join(k.strip() for k in kw_parts if len(k.strip()) >= 2)[:5])

    extra_schemas = ''
    faq_schema_obj = gen_faq_schema(qa_pairs)
    if faq_schema_obj:
        extra_schemas += f',\n    {faq_schema_obj}'

    toc_faq = '<li><a href="#faq">常见问题</a></li>' if qa_pairs else ''
    toc_block = f'<div class="toc"><h3>目录</h3><ol><li><a href="#summary">核心结论</a></li><li><a href="#article-body">文章详情</a></li>{toc_faq}<li><a href="#related">相关文章</a></li></ol></div>'

    _author_line = f'<span>来源：<a href="{source_safe}" rel="nofollow" target="_blank">联想商用</a></span>'
    _footer_source = f'<small>内容来源：<a href="{source_safe}" rel="nofollow" target="_blank">联想商用</a></small>'
    leai_input = title[:60]
    leai_url_val = f'https://leaibot.cn/?q={leai_input}'

    page_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title_safe}</title>
<meta name="description" content="{desc_safe}">
<meta name="keywords" content="{keywords_str}">
<link rel="canonical" href="https://www.lenovo.com.cn/wiki/{slug}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title_safe}">
<meta property="og:url" content="https://www.lenovo.com.cn/wiki/{slug}">
<meta property="og:locale" content="zh_CN">
<meta property="article:published_time" content="{TODAY}T10:00:00+08:00">
<meta property="article:modified_time" content="{TODAY}T10:00:00+08:00">
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@graph": [
    {{
      "@type": "TechArticle",
      "headline": {json.dumps(title[:100], ensure_ascii=False)},
      "description": {json.dumps(desc, ensure_ascii=False)},
      "datePublished": "{TODAY}",
      "dateModified": "{TODAY}",
      "author": {{
        "@type": "Organization",
        "name": "联想商用"
      }},
      "publisher": {{
        "@type": "Organization",
        "name": "联想乐享知识库",
        "url": "https://www.lenovo.com.cn/wiki/",
        "parentOrganization": {{"@type":"Organization","name":"Lenovo"}}
      }},
      "mainEntityOfPage": "https://www.lenovo.com.cn/wiki/{slug}"
    }},
    {{
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{"@type":"ListItem","position":1,"name":"联想乐享知识库","item":"https://www.lenovo.com.cn/wiki/"}},
        {{"@type":"ListItem","position":2,"name":"{cat_label}","item":"https://www.lenovo.com.cn/wiki/{cat}/"}},
        {{"@type":"ListItem","position":3,"name":{json.dumps(title[:50], ensure_ascii=False)},"item":"https://www.lenovo.com.cn/wiki/{slug}"}}
      ]
    }}{extra_schemas}
  ]
}}
</script>
<link rel="stylesheet" href="/wiki/wiki.css">
</head>
<body>
<div class="topbar">
  <a class="logo" href="/wiki/"><span>乐享</span>WIKI</a>
  <nav>
    <a href="/wiki/brand_news/">品牌/新闻</a>
    <a href="/wiki/notebook/">笔记本</a>
    <a href="/wiki/desktop/">台式机</a>
    <a href="/wiki/monitor/">显示器</a>
    <a href="/wiki/tablet_phone/">平板/手机</a>
    <a href="/wiki/accessory/">配件/办公</a>
    <a href="/wiki/smart_device/">智能设备</a>
    <a href="/wiki/server/">服务器</a>
    <a href="/wiki/workstation/">工作站</a>
    <a href="/wiki/solution/">解决方案</a>
    <a href="/wiki/service/">服务产品</a>
    <a href="/wiki/knowledge/">技术支持</a>
  </nav>
</div>
<nav class="bc" aria-label="面包屑">
  <ol>
    <li><a href="/wiki/">联想乐享知识库</a></li>
    <li><a href="/wiki/{cat}/">{cat_label}</a></li>
    <li><span>{title_short}</span></li>
  </ol>
</nav>
<div class="mob-buy-bar">
  <a class="mob-btn-buy" href="{source_safe}" target="_blank" rel="nofollow">查看官网详情 →</a>
  <a class="mob-btn-ai" href="{leai_url_val}" target="_blank" rel="nofollow">在乐享AI咨询 →</a>
</div>
<div class="page-wrap know-page">
  <article>
    <header>
      <span class="cat-tag">{cat_label}</span>
      <h1>{html.escape(title)}</h1>
      <div class="article-meta">
        <span>📅 {TODAY}</span>
        {_author_line}
      </div>
    </header>
    <div class="summary-block" id="summary">
      <div class="summary-label">⚡ 核心结论</div>
      <p>{summary}</p>
      <p class="summary-source">内容来源：联想官方</p>
    </div>
    <div id="article-body">
    {content_html}
    </div>
    {faq_html_str}
    <section class="more-cat" id="related">
      <h2>更多{cat_label}文章</h2>
      <ul class="related-list">
        <li><a href="/wiki/{cat}/">查看更多{cat_label}文章</a></li>
        <li><a href="/wiki/">浏览全部知识库</a></li>
      </ul>
    </section>
  </article>
  <aside>
    <div class="author-card-aside">
      <div class="author-card-avatar">🏢</div>
      <div>
        <div class="author-card-name">联想商用</div>
        <div class="author-card-title">行业解决方案</div>
      </div>
    </div>
    {toc_block}
    <div class="info-box">
      <h3>相关服务</h3>
      <ul>
        <li>商用咨询：400-813-6161</li>
        <li>售后服务：400-990-8888</li>
        <li>在线客服支持</li>
        <li>联想乐享知识库</li>
      </ul>
      <a class="leai-btn-aside" href="{source_safe}" target="_blank" rel="nofollow" style="background:#e2231a;color:#fff;margin-bottom:10px;">查看官网详情 →</a>
      <a class="leai-btn-aside" href="{leai_url_val}" target="_blank" rel="nofollow">在乐享AI咨询 →</a>
    </div>
  </aside>
</div>
<footer class="footer">
  <strong>联想乐享知识库</strong> · 专业的联想产品使用指南与服务支持<br>
  {_footer_source}
  <div class="beian" style="margin-top:12px;font-size:12px;color:#999;line-height:1.8;">
    版权所有：1998-2026 联想集团 |
    <a href="https://shop.lenovo.com.cn/investor/html/legal.html" target="_blank" rel="nofollow noopener" style="color:#999;">法律公告</a> |
    <a href="https://www.lenovo.com.cn/statement/privacy.html" target="_blank" rel="nofollow noopener" style="color:#999;">隐私权政策</a><br>
    <a href="https://beian.miit.gov.cn/" target="_blank" rel="nofollow noopener" style="color:#999;">京ICP备11035381-2</a> |
    京公网安备110108007970号
  </div>
</footer>
</body>
</html>'''
    return slug, page_html

def step_generate():
    ensure_dirs()
    print('=== 第4步：生成wiki HTML页面 ===')

    with open(URLS_FILE) as f:
        urls = json.load(f)

    prog = load_progress()
    generated = set(prog.get('generated', []))
    url_map = {item['id']: item for item in urls}

    total = len(urls)
    success = 0
    for i, item in enumerate(urls):
        pid = item['id']
        if pid in generated:
            success += 1
            continue

        ext_file = os.path.join(EXTRACTED_DIR, f'{pid}.txt')
        if not os.path.exists(ext_file):
            continue

        with open(ext_file, 'r', encoding='utf-8') as f:
            content = f.read()

        if len(content.strip()) < 50:
            continue

        # 提取标题（第一行）
        lines = content.strip().split('\n')
        title = lines[0].strip() if lines else item.get('title', pid)
        if not title or len(title) < 2:
            title = item.get('title', pid)

        body, qa_pairs = parse_content_and_qa(content)
        cat = detect_cat(title, item['url'])

        try:
            slug, page_html = gen_page_html(pid, title, item['url'], body, qa_pairs, cat)
            fpath = os.path.join(WIKI_DIR, slug)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(page_html)

            generated.add(pid)
            success += 1
            if success % 50 == 0:
                prog['generated'] = list(generated)
                save_progress(prog)
                print(f'  进度: {success}/{total}')
        except Exception as e:
            print(f'  ❌ {pid} 生成失败: {e}')

    prog['generated'] = list(generated)
    save_progress(prog)
    print(f'\n完成！已生成 {success}/{total} 个wiki页面 → {WIKI_DIR}')

def show_status():
    prog = load_progress()
    urls_count = 0
    if os.path.exists(URLS_FILE):
        with open(URLS_FILE) as f:
            urls_count = len(json.load(f))

    snap_count = len([f for f in os.listdir(SNAPSHOTS_DIR) if f.endswith('.txt')]) if os.path.exists(SNAPSHOTS_DIR) else 0
    ext_count = len([f for f in os.listdir(EXTRACTED_DIR) if f.endswith('.txt')]) if os.path.exists(EXTRACTED_DIR) else 0

    print(f'''
=== biz wiki 批量生成进度 ===
产品URL:    {urls_count} 个 {"✅" if prog.get("crawled") else "❌ 未爬取"}
页面抓取:   {snap_count}/{urls_count} {"✅" if snap_count >= urls_count and urls_count > 0 else "⏳"}
AI提取:     {ext_count}/{urls_count} {"✅" if ext_count >= urls_count and urls_count > 0 else "⏳"}
HTML生成:   {len(prog.get("generated", []))}/{urls_count}
''')

# ============ 入口 ============
if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'status'

    if cmd == 'crawl':
        step_crawl()
    elif cmd == 'fetch':
        step_fetch()
    elif cmd == 'extract':
        step_extract()
    elif cmd == 'generate':
        step_generate()
    elif cmd == 'all':
        step_crawl()
        step_fetch()
        step_extract()
        step_generate()
    elif cmd == 'status':
        show_status()
    else:
        print(__doc__)
