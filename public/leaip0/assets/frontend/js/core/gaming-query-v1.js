(function () {
  'use strict';
  const query = '我想购买一台游戏笔记本电脑';
  // Positions are intentional: the user approved reusing Y9000P twice.
  const slots = ['1054054', '1055587', '1054054', '1055589', '1054054'];
  const marker = 'gaming-notebook-20260911';
  const copy = '根据你的需求，已为你整理 **5 款拯救者游戏笔记本**，可以在右侧查看配置、价格和商品详情。\n\n列表第 **4 款是拯救者Y7000X**，搭载酷睿 7 245HX、RTX 5060 8GB 独显和 32GB 内存，可作为游戏与日常使用的选购参考。\n\n点击“**我要对比1、3、4**”后，我会并排展示这三个位置的商品，并推荐第 4 款 Y7000X；相比本次参与对比的 Y9000P，它的价格更低。AI 生成内容仅供参考，价格与配置以商品详情为准。';
  function matches(text) { return String(text || '').replace(/\s/g, '').replace(/[。！!？?]+$/, '') === query; }
  async function load(token) {
    const generation = window.__lxGeneration;
    const rows = await Promise.all([...new Set(slots)].map(async sku => {
      const response = await generation.fetch(token, '/api/products/' + sku, {cache:'no-store'});
      if (!response.ok) throw new Error('商品加载失败');
      const product = await generation.wait(token, response.json());
      if (String(product.sku) !== sku || product.status !== 'active' || !/拯救者/.test(product.name) || !/笔记本/.test(product.category) || !(Number(product.price)>0) || !product.image_url) throw new Error('商品暂不可用');
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
      if(generation.current(token))await generation.wait(token,adapter.answer('拯救者商品暂时加载失败，请稍后重新发送这条需求。'));
    } finally { if(generation.current(token)){adapter.busy(false);adapter.save();} }
  }
  window.__lxGamingQuery={matches,load,pick,advice,run,copy,slots};
})();
