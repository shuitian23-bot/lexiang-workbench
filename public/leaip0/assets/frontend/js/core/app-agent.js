// ── 多步任务链框架（脚本化编排，不是 LLM agent loop）───────────────────────
// 一句话意图（"9000以内你看着选一款直接下单"）→ 按预定义链顺序调用已有「操作原子」
// （app.js 里的 openProduct/addCart/lxBuyWithIntro 等真实函数），配合左侧步骤卡
// UI（wait→doing→done 逐步刷新）制造「AI 在自主执行」的观感。右侧画面随每步操作
// 原子自然联动（openProduct 开商详、lxBuyWithIntro 弹下单确认），不额外画路由。
//
// 零侵入设计：本文件不 import app.js，只通过 window.__lxAgentAPI（app.js 里暴露的
// 操作原子桥接）通信；app.js 检测到用户表达代买意图时调用 window.__lxRunChain 转发
// 过来。删除整个功能 = 删这一个文件 + index.html 里那行 script + app.js 里两处引用。
//
// 可扩展：window.__lxRegisterAgentChain(id, def) 注册新链（compare_buy/claim_buy/
// auth_buy 等后续按同样套路加，这次只落地 auto_buy 一条）。
(function (root) {
  "use strict";
  if (!root || root.__lxAgentInstalled) return;
  root.__lxAgentInstalled = true;

  const STYLE = `
    .lx-agent-chain-head{font-size:13px;font-weight:700;color:var(--lx-brand-red,#B8252E);margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .lx-agent-step-text{display:flex;flex-direction:column;gap:2px}
    .lx-agent-step-detail{font-size:12px;font-weight:400;color:var(--text-muted,#979797)}
    .lx-agent-note{font-size:13.5px;color:var(--text,#252525);line-height:1.6}`;
  const styleEl = document.createElement("style");
  styleEl.textContent = STYLE;
  (document.head || document.documentElement).appendChild(styleEl);

  // 极简 HTML 转义（本文件是独立 IIFE，拿不到 app.js 内部的 esc()，自备一份防 XSS/破版）
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  const STEP_DELAY_MS = 1600; // 两步之间的节奏，让人看清每步（真机反馈 1100 偏赶）

  // 复用 main.css 已有的 .lx-op-steps/.lx-op-step/.lx-op-step-ic/.lx-op-spin（lxBuyWithIntro 同款），
  // 不重复定义那套规则；本文件只加链标题栏和步骤详情行两个新 class，避免规则打架。
  function renderCard(title, steps) {
    const stepsHtml = steps.map((s) => {
      const icon = s.state === "done" ? "✓" : s.state === "doing" ? '<span class="lx-op-spin"></span>' : "";
      const detail = s.detail ? `<span class="lx-agent-step-detail">${esc(s.detail)}</span>` : "";
      return `<div class="lx-op-step ${s.state}"><span class="lx-op-step-ic">${icon}</span><span class="lx-agent-step-text"><span>${esc(s.label)}</span>${detail}</span></div>`;
    }).join("");
    return `<div class="lx-agent-chain-head">🔧 多步任务：${esc(title)}</div><div class="lx-op-steps">${stepsHtml}</div>`;
  }

  const CHAINS = {};
  function registerChain(id, def) { CHAINS[id] = def; }
  root.__lxRegisterAgentChain = registerChain;

  // ── auto_buy：全权代买（第一条链）─────────────────────────────────────────
  // 商品推荐 → 智能选款 → 提交订单，三步都是调用已有操作原子，不新造下单逻辑
  registerChain("auto_buy", {
    title: "全权代买",
    steps: [
      {
        label: "商品推荐",
        async run(ctx, api, stepState) {
          const maxPrice = Number(ctx.params.maxPrice) || 0;
          let list = [];
          try {
            // site=shop 保证候选商品只在个人/家庭消费站货盘内，不会混进企业/政企专供 SKU
            const resp = await fetch("/api/products?site=shop&limit=40");
            if (resp.ok) list = await resp.json();
          } catch (_e) {}
          const candidates = (Array.isArray(list) ? list : []).filter(
            (p) => Number(p.price) > 0 && (!maxPrice || Number(p.price) <= maxPrice)
          );
          ctx.candidates = candidates;
          if (!candidates.length) {
            api.addAiMessage(`<div class="lx-agent-note">没找到符合预算的商品，换个预算或换个品类再试试。</div>`);
            return { stop: true };
          }
          stepState.detail = `按预算 ¥${maxPrice || "不限"} 内筛选商品，找到 ${candidates.length} 款`;
        },
      },
      {
        label: "智能选款",
        async run(ctx, api, stepState) {
          const candidates = ctx.candidates || [];
          const sorted = candidates.slice().sort((a, b) => Number(a.price) - Number(b.price));
          const pool = sorted.length >= 3 ? sorted.slice(1) : sorted; // 排除最低档（够3款才排除，避免样本太少排空）
          const picked = pool[pool.length - 1]; // 池内价格最高的，即"最接近预算上限、非最低档"
          ctx.picked = picked;
          stepState.detail = `选中「${picked.name}」，¥${picked.price} 价位配置最均衡，预算内非最低配置`;
          await api.openProduct(picked.sku);
        },
      },
      {
        label: "提交订单",
        async run(ctx, api, stepState) {
          const picked = ctx.picked;
          if (!picked) return;
          // lxBuyWithIntro 自带分步进度卡（打开详情→核对优惠→生成清单领券），内部是
          // fire-and-forget（setTimeout 序列，最长 1900ms 后弹出确认下单弹窗），不重复实现；
          // 这里多等 2200ms 再把本链的「提交订单」标记 done，确保弹窗已经真的弹出来了。
          api.lxBuyWithIntro(picked);
          await delay(2200);
          stepState.detail = "下单清单已生成，确认弹窗已弹出，请核对后确认支付";
        },
      },
    ],
  });

  // ── auto_buy_official：全权代买·官方推荐版（件2）───────────────────────────
  // 商品推荐环节交给官方对话流（app.js sendChat 的 /api/leai/stream）。件2改动：链在 sendChat
  // 一开始（用户气泡之后、官方答案气泡之前）就同步插卡起跑，step1 await 官方 promise
  // （ctx.params.officialWait，app.js done 回调 resolve/error+50s 超时 reject），拿到结果后
  // 按预算走 fallback 阶梯——官方超预算/超时/为空都不会让链静默死，兜底到本地货盘，实在没有
  // 候选才 stop（且必须说明原因+给可点建议）。step1 之后「对比→选款→下单」逻辑不变。
  registerChain("auto_buy_official", {
    title: "全权代买（官方推荐）",
    steps: [
      {
        label: "调用联想乐享官方 SKILL",
        async run(ctx, api, stepState, refresh) {
          const maxPrice = Number(ctx.params.maxPrice) || 0;
          const minPrice = Number(ctx.params.minPrice) || 0;
          const budgetLabel = minPrice ? `¥${minPrice}~${maxPrice || "不限"}` : `¥${maxPrice || "不限"}`;
          const inBudget = (p) => { const pr = Number(p.price); return pr > 0 && (!maxPrice || pr <= maxPrice) && (!minPrice || pr >= minPrice); };
          stepState.detail = "等待官方推荐结果…";
          if (typeof refresh === "function") refresh();

          let officialProducts = [];
          let officialFailReason = "";
          try {
            const waited = await ctx.params.officialWait;
            officialProducts = Array.isArray(waited) ? waited : [];
            // 数据到位 ≠ 视觉到位：正文打字动画/商品卡可能还在渲染。等回答展示稳定再推进，
            // 否则「上面还在输出、下面已开始领券」两线打架（真机反馈）
            stepState.detail = "官方推荐已返回，等待回答展示完成…";
            if (typeof refresh === "function") refresh();
            if (typeof api.waitAnswerSettled === "function") await api.waitAnswerSettled();
          } catch (_e) {
            officialFailReason = "官方超时，已切换乐享自营货盘";
          }

          // 阶梯 1：官方推荐里直接有预算内候选，最优路径
          let candidates = officialProducts.filter(inBudget);
          if (candidates.length) {
            ctx.candidates = candidates;
            stepState.detail = `官方推荐 ${officialProducts.length} 款，预算 ${budgetLabel} 内 ${candidates.length} 款`;
            return;
          }

          // 阶梯 2：官方无预算内候选（超预算/超时/为空）→ 本地乐享自营货盘按系列词补候选
          const kw = (typeof window !== "undefined" && window.__lxIntent && window.__lxIntent.extractSeriesKeyword)
            ? window.__lxIntent.extractSeriesKeyword(ctx.params.rawText || "") : "";
          let localPool = [];
          try {
            const qs = kw ? `&q=${encodeURIComponent(kw)}` : "";
            const resp = await fetch(`/api/products?site=shop${qs}&limit=40`);
            if (resp.ok) {
              const list = await resp.json();
              localPool = Array.isArray(list) ? list : [];
            }
          } catch (_e) { /* 网络异常，localPool 留空，走阶梯3/4兜底 */ }

          const localCandidates = localPool.filter(inBudget);
          if (localCandidates.length) {
            ctx.candidates = localCandidates;
            stepState.detail = officialFailReason
              ? `${officialFailReason}，预算 ${budgetLabel} 内找到 ${localCandidates.length} 款`
              : officialProducts.length
                ? `官方 ${officialProducts.length} 款均不在预算 ${budgetLabel} 内，已从乐享自营货盘补充 ${localCandidates.length} 款`
                : `官方暂未返回商品，已从乐享自营货盘找到预算内 ${localCandidates.length} 款`;
            return;
          }

          // 阶梯 3：官方 + 本地合并候选都超预算 → 取离预算最近的一款，继续往下走（下单前人工确认，安全）
          const pool = officialProducts.concat(localPool).filter((p) => Number(p.price) > 0);
          if (pool.length) {
            const closest = pool.slice().sort((a, b) => Math.abs(Number(a.price) - maxPrice) - Math.abs(Number(b.price) - maxPrice))[0];
            ctx.candidates = [closest];
            const over = Math.max(0, Math.round(Number(closest.price) - maxPrice));
            stepState.detail = `均超预算，已选最接近的「${closest.name}」，超出 ¥${over}，请下单时确认`;
            return;
          }

          // 阶梯 4：官方 0 款且本地也 0 款（极端情况）→ 才允许 stop，但要说明原因 + 给可点建议
          api.addAiMessage(
            `<div class="lx-agent-note">官方和乐享自营货盘暂时都没有返回可用商品，换个预算或换个品类再试试。</div>` +
            `<div class="lx-p0-suggest"><button class="lx-p0-suggest-chip" type="button" data-quick-ask="换个预算，你帮我重新选一款直接下单">换个预算试试</button></div>`
          );
          return { stop: true };
        },
      },
      {
        label: "商品对比 SKILL",
        async run(ctx, api, stepState) {
          const state = api.getState();
          // 清掉可能残留的上一轮「乐享最推荐」标记，避免选款步骤误取到旧对比的结果
          state._compareRecommendedProduct = null;
          state._compareRecommendedSku = "";
          api.lxUpsertCompareTab(ctx.candidates, "官方推荐对比");
          stepState.detail = `已打开 ${ctx.candidates.length} 款候选商品的对比页`;
        },
      },
      {
        label: "智能选款 SKILL",
        async run(ctx, api, stepState, refresh) {
          // 对比页停留 5s：①让人看清对比表和差异高亮（真机反馈"一闪就到详情页"）；
          // ②compare-advice 是异步接口，多等这几秒「乐享最推荐」大概率已算出并高亮，选款更准
          stepState.detail = "正在阅读对比结果与 AI 建议…";
          if (typeof refresh === "function") refresh();
          await delay(5000);
          const picked = (typeof api.lxResolveRecommendedProduct === "function" && api.lxResolveRecommendedProduct()) || ctx.candidates[0];
          ctx.picked = picked;
          stepState.detail = `选中「${picked.name}」，¥${picked.price}`;
          if (typeof refresh === "function") refresh();
          if (picked.sku) await api.openProduct(picked.sku);
          // 商详页也留 2.5s 再进下单，节奏可跟
          await delay(2500);
        },
      },
      {
        label: "下单 SKILL",
        async run(ctx, api, stepState) {
          const picked = ctx.picked;
          if (!picked) return;
          // lxBuyWithIntro 自带分步进度卡（打开详情→核对优惠→生成清单领券），内部是
          // fire-and-forget（setTimeout 序列，最长 1900ms 后弹出确认下单弹窗），不重复实现；
          // 这里多等 2200ms 再把本链的「提交订单」标记 done，确保弹窗已经真的弹出来了。
          api.lxBuyWithIntro(picked);
          await delay(2200);
          stepState.detail = "下单清单已生成，确认弹窗已弹出，请核对后确认支付";
        },
      },
    ],
  });

  // ── 核心执行器 ───────────────────────────────────────────────────────────
  async function runChain(chainId, params) {
    const api = root.__lxAgentAPI;
    if (!api) return;
    const chain = CHAINS[chainId];
    if (!chain) return;

    // 首页与四个频道共用同一个联想乐享智能体。频道只决定右侧页面身份，
    // 不得限制、替换或降级左侧智能体的任务链与执行能力。
    const state = api.getState();

    const steps = chain.steps.map((s) => ({ label: s.label, state: "wait", detail: "" }));
    const node = api.addAiMessage(renderCard(chain.title, steps));
    const refresh = () => {
      const body = node && node.querySelector(".ai-body");
      if (body) body.innerHTML = renderCard(chain.title, steps);
    };
    const ctx = { params: params || {} };

    for (let i = 0; i < chain.steps.length; i++) {
      steps[i].state = "doing";
      refresh();
      let result;
      try {
        result = await chain.steps[i].run(ctx, api, steps[i], refresh);
      } catch (_e) {
        api.addAiMessage(`<div class="lx-agent-note">执行「${esc(chain.steps[i].label)}」时出错，已停止。</div>`);
        return;
      }
      if (result && result.stop) return;
      steps[i].state = "done";
      refresh();
      if (i < chain.steps.length - 1) await delay(STEP_DELAY_MS);
      // 每步 done 后存一次，链跑到哪存到哪——中途刷新/切走也留得住执行记录
      try { window.__lxSaveConversationNow && window.__lxSaveConversationNow(); } catch (_e) {}
    }
  }

  root.__lxRunChain = runChain;
})(typeof window !== "undefined" ? window : null);
