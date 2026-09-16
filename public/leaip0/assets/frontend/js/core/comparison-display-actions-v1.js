/* Comparison display commands share the existing chat and generation lifecycle. */
(() => {
  'use strict';
  const commands = {
    '隐藏同类项': {field:'hideSame', value:true, copy:'已隐藏各商品相同的参数项，保留差异信息，方便你快速比较配置。'},
    '不隐藏同类项': {field:'hideSame', value:false, copy:'已恢复全部参数项，相同内容与差异信息均已展示，方便你完整对比。'},
    '合并相同机型': {field:'mergeSameModel', value:true, copy:'已合并同一机型的重复配置列，保留各机型信息，方便你横向对比。'},
    '不隐藏相同机型': {field:'mergeSameModel', value:false, copy:'已展开相同机型的全部配置，恢复逐款商品对比，方便你查看差异。'}
  };
  function command(query) {
    const text=String(query||'').trim().replace(/[。！!？?]+$/,'');
    return commands[text==='不合并相同机型'?'不隐藏相同机型':text] || null;
  }
  function labels(snapshot=window.__lxCompareDisplayView?.snapshot()) {
    if (!snapshot) return [];
    const result=[];
    if (snapshot.hideSame) result.push('不隐藏同类项');
    else if (snapshot.canHide) result.push('隐藏同类项');
    if (snapshot.mergeSameModel) result.push('不隐藏相同机型');
    else if (snapshot.canMerge) result.push('合并相同机型');
    return result;
  }
  async function run(query,host) {
    const action=command(query), gen=window.__lxGeneration, token=host.token;
    if (!action) return false;
    const target=window.__lxCompareDisplayView?.snapshot();
    host.busy(true);
    try {
      let response=action.copy, apply=true;
      if (!target) {response='请先打开商品对比页面，待参数加载完成后，再调整对比显示方式。';apply=false;}
      else if (target[action.field]===action.value) {response=action.field==='hideSame'?'当前参数项已按此方式展示，你可以继续查看商品差异或切换显示方式。':'当前机型已按此方式展示，你可以继续对比配置或切换其他显示方式。';apply=false;}
      else if (action.value && !(action.field==='hideSame'?target.canHide:target.canMerge)) {
        response=action.field==='hideSame'?'当前没有可隐藏的相同参数项，已保留完整信息，方便你查看商品差异。':'当前没有同一机型的多款配置，已保留现有商品，方便你继续对比。';apply=false;
      }
      await gen.wait(token,host.answer(response));
      if (apply && gen.current(token) && !window.__lxCompareDisplayView.apply(target,action.field,action.value)) {
        await gen.wait(token,host.answer('对比页面已切换，本次未调整显示。请回到对应商品对比后重试。'));
      }
    } finally {
      if (gen.current(token)) {host.busy(false);host.save();}
    }
    return true;
  }
  window.__lxComparisonDisplay={matches:query=>!!command(query),labels,run};
})();
