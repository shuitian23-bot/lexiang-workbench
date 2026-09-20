/* PC-对话-商品推荐追问：choices remain a draft until the composer is submitted. */
(() => {
  'use strict';
  if (window.__lxRecommendationFollowups) return;
  const groups = [
    { key: 'device', label: '设备类型', question: '您好！为了给您推荐最合适的联想产品，请问您主要想选购哪一类设备呢？', options: ['笔记本', '台式机', '平板', '手机'] },
    { key: 'usage', label: '使用场景', multiple: true, question: '另外，您购买这台设备主要是用于什么场景呢？比如办公、游戏、设计还是日常娱乐？', options: ['日常办公/学习', '大型游戏/高性能需求', '创意设计/专业绘图', '影音娱乐/便携出行'] },
    { key: 'budget', label: '预算', question: '您对设备的预算范围有初步的规划吗？这样我可以帮您锁定性价比最高的型号。', options: ['3000元以下', '3000-5000元', '5000-8000元', '8000元以上', '暂时没具体预算，看推荐'] }
  ];
  const selected = new Set();
  let source = '', prepared = null, scheduled = false;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = (group, index) => group.key + ':' + index;
  const items = () => groups.flatMap(group => group.options.flatMap((label, index) => selected.has(key(group, index)) ? [{id:key(group,index), label, group:group.label}] : []));
  const composers = () => Array.from(document.querySelectorAll('#lxfdComposer, .assistant-panel .composer')).filter(el => !el.closest('[aria-hidden="true"], .lx-transition-clone'));
  function refresh() {
    scheduled = false;
    const choices = items();
    for (const panel of document.querySelectorAll('.lx-recommendation-followups')) {
      for (const button of panel.querySelectorAll('[data-lx-reco-choice]')) {
        const active = panel.dataset.lxRecoFollowup === source && selected.has(button.dataset.lxRecoChoice);
        button.setAttribute('aria-pressed', String(active));
      }
    }
    for (const form of composers()) {
      const input = form.querySelector('textarea');
      if (!input) continue;
      let tags = form.querySelector(':scope > .lx-reco-draft-tags');
      if (choices.length && !tags) {
        tags = document.createElement('div');
        tags.className = 'lx-reco-draft-tags';
        tags.setAttribute('role', 'group');
        tags.setAttribute('aria-label', '已选择的商品需求');
        form.insertBefore(tags, input);
      }
      if (tags) {
        const html = choices.map(item => `<span class="lx-reco-draft-tag"><span>${escape(item.label)}</span><button type="button" data-lx-reco-remove="${item.id}" aria-label="移除${escape(item.group)}：${escape(item.label)}"><span aria-hidden="true">×</span></button></span>`).join('');
        if (tags.innerHTML !== html) tags.innerHTML = html;
        tags.hidden = !choices.length;
      }
      form.classList.toggle('has-reco-draft', !!choices.length);

    }
    window.__lxGeneration?.sync();
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(refresh); }
  }
  function clear() { selected.clear(); source = ''; prepared = null; refresh(); }
  function render(id) {
    return `<section class="lx-recommendation-followups" data-lx-reco-followup="${escape(id)}" aria-label="完善商品推荐需求"><p class="lx-reco-followup-intro">为了能更精准地为你推荐符合需求的商品，还想进一步了解相关具体情况</p><div class="lx-reco-followup-panel">${groups.map(group => `<fieldset><legend>${group.question}</legend><div class="lx-reco-followup-options">${group.options.map((label, index) => `<button type="button" data-lx-reco-choice="${key(group,index)}" aria-pressed="false">${label}</button>`).join('')}</div></fieldset>`).join('')}</div></section>`;
  }
  function prepare(text, input) {
    const value = String(text || '').trim();
    if (!input?.matches('#lxfdTa, .assistant-panel .composer textarea') || !selected.size) return value;
    const requirements = groups.map(group => {
      const values = group.options.filter((_, index) => selected.has(key(group,index)));
      return values.length ? `${group.label}：${values.join('、')}` : '';
    }).filter(Boolean).join('；');
    const query = `请根据以下需求推荐商品：${requirements}。${value ? '\n' + value : ''}`;
    prepared = {query, signature: Array.from(selected).join('|')};
    return query;
  }
  function consume(query) {
    // Called only after the normal access/busy checks accept this exact composer query.
    if (prepared?.query === query && prepared.signature === Array.from(selected).join('|')) clear();
  }
  document.addEventListener('click', event => {
    const choice = event.target.closest?.('[data-lx-reco-choice]');
    const remove = event.target.closest?.('[data-lx-reco-remove]');
    if (!choice && !remove) return;
    event.preventDefault(); event.stopPropagation();
    if (choice) {
      const panel = choice.closest('.lx-recommendation-followups');
      if (!panel) return;
      const [groupKey, index] = choice.dataset.lxRecoChoice.split(':');
      const group = groups.find(item => item.key === groupKey);
      if (!group || !group.options[Number(index)]) return;
      source = panel.dataset.lxRecoFollowup;
      const id = choice.dataset.lxRecoChoice, wasSelected = selected.has(id);
      if (!group.multiple) for (const item of Array.from(selected)) if (item.startsWith(groupKey + ':')) selected.delete(item);
      if (wasSelected) selected.delete(id); else selected.add(id);
    } else selected.delete(remove.dataset.lxRecoRemove);
    prepared = null;
    refresh();
    const input = document.body.classList.contains('assistant-fullscreen') ? document.querySelector('#lxfdTa') : document.querySelector('.assistant-panel .composer textarea');
    input?.focus({preventScroll:true});
  });
  document.addEventListener('input', event => {
    if (event.target.matches?.('#lxfdTa, .assistant-panel .composer textarea')) schedule();
  });
  window.__lxRecommendationFollowups = {render, prepare, consume, clear, refresh, hasSelection: () => selected.size > 0};
  function init() {
    // Streaming text does not trigger a rescan. Only newly mounted panels/composers/history do.
    const relevant = '.lx-recommendation-followups, #lxfdComposer, .assistant-panel .composer';
    new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 && (node.matches(relevant) || node.querySelector(relevant))))) schedule();
    }).observe(document.body, {childList:true, subtree:true});
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
