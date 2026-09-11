/* Shared query-result protocol. Shell adapters own typing, trace, history and fullscreen handoff. */
(function () {
  'use strict';
  if (window.__lxQueryResults) return;
  const definitions = new Map();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function register(type, definition) { definitions.set(type, definition); }
  function find(query) { return [...definitions.values()].find(item => item.matches(query)); }
  function page(type, id, label, payload) {
    const definition = definitions.get(type);
    if (!definition) throw new Error('结果类型未注册');
    return {id,kind:'info',label,resultType:type,payload,html:definition.render(payload)};
  }
  function remember(result) {
    if (!window.__lxBridge?.registerResultPage) throw new Error('结果页尚未就绪');
    window.__lxBridge.registerResultPage(result);
    return result;
  }
  function open(result) { remember(result); return window.__lxBridge.openResultPage(result); }
  function waitForCard(card, token) {
    const generation = window.__lxGeneration;
    return generation.wait(token,new Promise(resolve => {
      if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        generation.frame(token,()=>generation.frame(token,resolve)); return;
      }
      let finished = false;
      const finish = event => { if (event && event.target !== card) return; if (finished) return; finished = true; card.removeEventListener('animationend',finish); resolve(); };
      card.addEventListener('animationend',finish);
      // Single animation completion fallback; the sequence remains awaited.
      generation.timeout(token,finish,720);
    }));
  }
  async function run(host) {
    const definition = find(host.query);
    if (!definition) return false;
    const generation = window.__lxGeneration, token = host.token;
    host.busy(true);
    let message;
    try {
      message = host.create(definition.skill);
      const data = await generation.wait(token,definition.load(host.query));
      if (!generation.current(token)) return true;
      const result = remember(definition.result(data,host.query));
      const copy = definition.answer(data,host.query);
      await generation.wait(token,host.answer(message,copy,definition.skill,definition.complete(data)));
      if (!generation.current(token)) return true;
      const card = host.card(message,{resultId:result.id,title:definition.cardTitle,desc:definition.cardDescription(data)});
      card?.classList.add('lx-document-card-enter');
      host.save();
      await waitForCard(card,token);
      if (!generation.current(token)) return true;
      host.reveal(()=>{ if (generation.current(token)) open(result); });
      host.save();
    } catch (error) {
      if (!generation.current(token) || error?.name === 'AbortError') throw error;
      await generation.wait(token,host.answer(message,'招聘信息暂时未能加载，请稍后重新发送“**联想最新的招聘信息**”。你也可以访问联想招聘官网查看公开职位。',definition.skill,'本次未完成，招聘信息加载失败',false));
    } finally {
      if (generation.current(token)) { host.busy(false); host.save(); }
    }
    return true;
  }
  window.__lxQueryResults = {register,matches:query=>!!find(query),run,page,remember,open,escape};
})();
