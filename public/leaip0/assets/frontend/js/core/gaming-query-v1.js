(function () {
  'use strict';
  const query = '我想购买一台游戏笔记本电脑';
  // Positions are intentional: the user approved reusing Y9000P twice.
  const slots = ['1054054', '1055587', '1054054', '1055589', '1054054', '1053096', '1052919', '1056246'];
  const marker = 'gaming-notebook-20260911';
  const copy = "根据您的需求，我拆解了以下几个核心条件。\n\n- 产品类型：**游戏笔记本电脑**\n- 使用场景：**游戏娱乐**\n\n根据您的需求（**游戏、笔记本电脑**），以下是几款可供选择的联想笔记本，您可以结合配置、价格和日常使用需求进行挑选：\n\n**拯救者 Y7000X 2026**：搭载酷睿 7 245HX 处理器与 RTX 5060 8GB 独显，配备 32GB 内存和 15.3 英寸屏幕。本次推荐包含碳晶黑与冰魄白两种配置，存储分别为 512GB+1TB SSD 和 512GB SSD，适合关注游戏配置的用户。\n\n**拯救者 Y9000P**：搭载酷睿 Ultra 9 处理器与 RTX 5060 8GB 独显，配备 16 英寸屏幕、64GB 内存和 1TB SSD。大容量内存可兼顾游戏与多任务使用，冰魄白配色也提供了不同的外观选择。\n\n**YOGA Pro 15 Aura 与 YOGA Pro 16 Aura**：均搭载酷睿 Ultra 7 356H 处理器、RTX 5060 显卡、32GB 内存和 1TB SSD，可作为兼顾游戏与内容创作的备选。其中 Pro 16 Aura 配备触控 OLED 屏和灵感妙笔，适合有触控与创作需求的用户。\n\n**YOGA Pro 15 锐龙**：搭载锐龙 AI Max+ 388 处理器，配备 64GB 内存、1TB SSD 和触控 OLED 屏，采用集成显卡，可供同时关注日常办公与创作的用户参考。\n\nAI 生成内容仅供参考，具体价格与配置以商品详情为准。";
  function matches(text) { return String(text || '').replace(/\s/g, '').replace(/[。！!？?]+$/, '') === query; }
  async function load(token) {
    const generation = window.__lxGeneration;
    const rows = await Promise.all([...new Set(slots)].map(async sku => {
      const response = await generation.fetch(token, '/api/products/' + sku, {cache:'no-store'});
      if (!response.ok) throw new Error('商品加载失败');
      const product = await generation.wait(token, response.json());
      if (String(product.sku) !== sku || product.status !== 'active' || (slots.indexOf(sku) < 5 && !/拯救者/.test(product.name)) || !/笔记本/.test(product.category) || !(Number(product.price)>0) || !product.image_url) throw new Error('商品暂不可用');
      const specs = typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs;
      return {...product, specs};
    }));
    const bySku = new Map(rows.map(p => [String(p.sku), p]));
    return slots.map((sku, index) => ({...bySku.get(sku), specs:{...bySku.get(sku).specs, lx_gaming_query:marker, lx_gaming_position:index+1}}));
  }
  function pick(items) {
    if (!Array.isArray(items) || items.length !== 3) return null;
    const positions = items.map(p => p?.specs?.lx_gaming_query === marker ? Number(p.specs.lx_gaming_position) : 0).sort((a,b)=>a-b).join(',');
    return positions === '1,3,4' ? items.find(p=>Number(p.specs.lx_gaming_position)===4) : null;
  }
  function advice(product) { return '结合游戏笔记本的需求，推荐原列表第 4 款「拯救者Y7000X」。所选配置搭载酷睿 7 245HX、RTX 5060 8GB 独显和 32GB 内存；相比本次对比的 Y9000P，价格更低。具体价格与配置请以商品详情为准。'; }
  async function run(adapter) {
    const generation=window.__lxGeneration,token=adapter.token;
    adapter.busy(true);
    try {
      const products=await generation.wait(token,load(token));
      await generation.wait(token,adapter.answer(copy));
      const result=adapter.card(products);
      await generation.wait(token,new Promise(resolve=>generation.timeout(token,resolve,720)));
      if(generation.current(token))adapter.open(products,result);
    } catch(error) {
      console.warn("Gaming recommendation failed", error);
      if(generation.current(token))await generation.wait(token,adapter.answer('推荐商品暂时加载失败，请稍后重新发送这条需求。'));
    } finally { if(generation.current(token)){adapter.busy(false);adapter.save();} }
  }
  window.__lxGamingQuery={matches,load,pick,advice,run,copy,slots};
})();
