// ── 乐享意图路由共享模块（app.js 拆分第一步）────────────────────────────────
// 主面板 IIFE 与 lxfd 全屏 IIFE 之前各维护一份本地快路径正则，改一处漏一处、还会漂移
// （全屏那份曾缺 close_other_tabs / 门店导航词）。统一收口到这里：
//   window.__lxIntent.matchControl(text) → {op, target, msg} | null   本地 0ms 秒判
//   window.__lxIntent.parseOrdinal / parseOrdinals                    序号解析
//   window.__lxIntent.opNames                                          后端意图确认话术
// 加载顺序：必须在 app.js 之前（index.html 里 script 排前面）。
(function (root) {
  "use strict";

  // 序号解析：第一/二/三…/N 个。序号必须有明确标志，严防金额/规格数字误判。范围 1-20。
  const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  function parseOrdinal(text) {
    const t = String(text || "");
    const isAmount = (numStr, idx) => {
      const after = t.slice(idx + numStr.length, idx + numStr.length + 4);
      return /^(元|块|万|千|价|G|GB|TB|寸|英寸|Hz|年|月|号机|%|度)/.test(after) || /到\d/.test(t.slice(idx, idx + numStr.length + 6));
    };
    let m = t.match(/第\s*(\d{1,2})\s*(个|款|台|件|号)?/);
    if (m && !isAmount(m[1], m.index + (m[0].indexOf(m[1])))) { const n = Number(m[1]); if (n >= 1 && n <= 20) return n; }
    m = t.match(/(?:^|[^\d.])(\d{1,2})\s*(个|款|台|件)(?![\d元])/);
    if (m) { const n = Number(m[1]); const idx = t.indexOf(m[1], m.index); if (!isAmount(m[1], idx) && n >= 1 && n <= 20) return n; }
    const cn = t.match(/第\s*([一二两三四五六七八九十]+)\s*(个|款|台|件)?/);
    if (cn) {
      const s = cn[1];
      let n = null;
      if (s === "十") n = 10;
      else if (s.length === 1) n = CN_NUM[s] || null;
      else if (s[0] === "十") n = 10 + (CN_NUM[s[1]] || 0);
      else if (s[1] === "十") n = (CN_NUM[s[0]] || 0) * 10 + (CN_NUM[s[2]] || 0);
      if (n && n >= 1 && n <= 20) return n;
    }
    return null;
  }

  // 多序号（对比场景）：「1 2 3」「第一个第二个第三个」「1和3」。连写「123」逐位拆；「两款」是量词不算。
  function parseOrdinals(text) {
    const t = String(text || "");
    const nums = [];
    const push = (n) => { if (n >= 1 && n <= 20 && !nums.includes(n)) nums.push(n); };
    const cnMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    const cnRe = /第?\s*([一二三四五六七八九十])\s*(?:个|款|台|件)?/g;
    let m;
    while ((m = cnRe.exec(t))) push(cnMap[m[1]] || 0);
    const arRe = /(\d{1,2})/g;
    while ((m = arRe.exec(t))) {
      const numStr = m[1];
      const after = t.slice(m.index + numStr.length, m.index + numStr.length + 3);
      if (/^(元|块|万|千|价|G|GB|TB|寸|Hz|年|月|%|度|k|K|W)/i.test(after)) continue;
      if (numStr.length === 2 && !/^(个|款|台|件)/.test(after) && t[m.index - 1] !== "第") {
        numStr.split("").forEach((d) => push(Number(d)));
      } else {
        push(Number(numStr));
      }
    }
    return nums;
  }

  // 本地快路径：高频明确操作指令 0 延迟秒回，不调后端。顺序有讲究：更具体的先判。
  function matchControl(text) {
    const _t = String(text || "").trim();
    if (!_t || _t.length > 60) return null;
    // 关其他/留当前——必须在 close_all 之前（更具体）
    if (/(关闭?|关掉)(其他|其它|多余|别的|除当前外?的?)(标签|页面|页签)?|只留(当前|这个|一个|一排)|留(当前|这个|一个|一排)(标签|页面)?|关成(剩余|只剩)?一(排|个)|剩(余|下)一(排|个)/.test(_t)) return { op: "close_other_tabs", target: "", msg: "好的，已关闭其他标签，只留当前页面。" };
    if (/^\s*(关闭?|清空)(所有|全部|这些|当前)?(标签|页面|分页|tab|页签)\s*$/i.test(_t) || /(把|将)?(所有|全部)(标签|页面).{0,4}关(掉|闭)/.test(_t)) return { op: "close_all_tabs", target: "", msg: "好的，已为你关闭所有页面标签。" };
    if (/^\s*(进入|开启|切换?到?|变成?|开|恢复|回到?)?全屏(模式|对话|查看)?\s*$|^\s*(放大|沉浸|专注)(模式|对话|查看)?\s*$/.test(_t)) return { op: "enter_fullscreen", target: "", msg: "好的，已切换到全屏对话模式。" };
    if (/^\s*(退出|关闭|取消|结束)(全屏|沉浸|专注)|^\s*(分屏|窗口|缩小)(模式)?\s*$|^\s*恢复(分屏|窗口)(模式)?\s*$|^\s*(打开|展开)(右侧|浏览区|浏览|分屏)(面板)?\s*$|^\s*(右侧|浏览区)(展开|打开)\s*$/.test(_t)) return { op: "exit_fullscreen", target: "", msg: "好的，已展开右侧浏览区。" };
    if (/^\s*(回|返回|去|到)(首页|主页)\s*$/.test(_t)) return { op: "go_home", target: "", msg: "好的，已为你回到首页。" };
    if (/^\s*(打开|查看|看看?|去|进)?(我的)?购物车\s*$/.test(_t)) return { op: "open_cart", target: "", msg: "好的，已为你打开购物车。" };
    if (/^\s*(打开|查看|看看?|去|进)?(我的)?订单(列表|页面|中心)?\s*$/.test(_t)) return { op: "open_orders", target: "", msg: "好的，已为你打开订单页面。" };
    // 高频导航单词秒判（「门店」「会员」这类短词小模型常误判成咨询，不扔给它赌）
    if (/^\s*(打开|查看?|看看?|去|进)?(附近)?(门店|实体店|线下店|体验店|专卖店|服务网点|服务中心)(查询|页面|列表)?\s*$/.test(_t)) return { op: "open_stores", target: "", msg: "好的，已为你打开门店查询。" };
    if (/^\s*(打开|查看?|看看?|去|进)?(我的)?(会员(中心|页面|权益)?|会员卡|乐豆|积分(中心|商城)?)\s*$/.test(_t)) return { op: "open_member", target: "", msg: "好的，已为你打开会员中心。" };
    if (/^\s*(打开|查看?|看看?|领|去|进)?(我的)?(优惠券|领券|券中心|卡券)(中心|页面)?\s*$/.test(_t)) return { op: "open_coupon", target: "", msg: "好的，已为你打开优惠券中心。" };
    if (/^\s*(打开|查看?|看看?|去|进)?(教育(特惠|优惠|认证)?(专区|页面)?|学生(优惠|特惠)(专区)?)\s*$/.test(_t)) return { op: "open_edu_zone", target: "", msg: "好的，已为你打开教育特惠专区。" };
    if (/^\s*(打开|查看?|看看?|去|进)?(商品)?对比(页|页面|清单)?\s*$/.test(_t)) return { op: "open_compare", target: "", msg: "好的，已为你打开商品对比。" };
    // 按序号对比：「对比下1 2 3」「把1和3对比一下」——本地取当前列表，不丢给 AI 瞎检索
    if (/对比|比一?比|比较|哪个好|哪款好/.test(_t)) {
      const nths = parseOrdinals(_t);
      if (nths.length >= 2) return { op: "compare_nth", target: nths.join(","), msg: "好的，正在为你对比第 " + nths.join("、") + " 个商品。" };
    }
    // 选第 N 个 + 动作
    const ord = parseOrdinal(_t);
    if (ord && /第|个|款|台|件/.test(_t) && /(下单|购买|买|加购|加入购物车|打开|看)/.test(_t)) {
      const act = /加购|加入购物车/.test(_t) ? "cart" : /(下单|购买|要买|买它|买这|买第|买下|买了)/.test(_t) ? "buy" : /打开|看/.test(_t) ? "open" : "buy";
      const actWord = act === "cart" ? "加入购物车" : act === "open" ? "打开" : "下单";
      return { op: "buy_nth", target: ord + "|" + act, msg: "好的，正在为你" + actWord + "第 " + ord + " 个商品。" };
    }
    // 下单乐享推荐的商品：例如「那就直接下单你推荐的吧」「买乐享推荐那款」「就按推荐下单」
    if (/^(?!.*(不下单|别下单|先不|不要|不买|取消|暂不)).*(你|乐享|系统|AI|ai|刚才|最)?推荐[的得]?(那[个款台件本]?|这[个款台件本]?|商品|机器|电脑)?(.*)?(下单|购买|买|要了|就它|就这[个款台件本]?|直接下单)/.test(_t) || /^(?!.*(不下单|别下单|先不|不要|不买|取消|暂不)).*(下单|购买|买|要了|直接下单).*(你|乐享|系统|AI|ai|刚才|最)?推荐[的得]?/.test(_t)) return { op: "buy_recommended", target: "", msg: "好的，正在为你下单乐享推荐商品。" };
    // 下单当前正在看的商品（含「这款/这台/这本不错下单吧」口语）
    if (/^(?!.*(不下单|别下单|先不|不要|不买|取消|暂不))\s*((不错|可以|好的?|行|嗯|可|就|这[个款台件本]?|那[个款台件本]?|它|对|我?要|帮我|给我|我?想)[，,、。\s]*)*(下单|购买|下个单|买(这[个款台件本]|它|那[个款台件本])?)(吧|呀|啊|喽|咯)?(?:[，,、。\s].*?(优惠|券|领|结算).*)?$/.test(_t)) return { op: "buy_current", target: "", msg: "好的，正在为你下单当前商品。" };
    return null;
  }

  // 后端小模型意图命中后的确认话术（target 由调用方插值）
  const opNames = {
    close_all_tabs: "关闭了所有页面标签", close_other_tabs: "关闭了其他标签，只留当前", close_tab: "关闭了该标签",
    go_home: "回到了首页", open_cart: "打开了购物车", open_orders: "打开了订单页面",
    open_member: "打开了会员中心", open_coupon: "打开了优惠券中心", open_stores: "打开了门店查询",
    open_edu_zone: "打开了教育专区", open_compare: "打开了商品对比", clear_compare: "清空了对比清单",
    start_student_auth: "打开了学生认证", start_enterprise_auth: "打开了企业认证", switch_site: "切换了站点",
    enter_fullscreen: "切换到全屏对话模式", exit_fullscreen: "退出了全屏模式",
    buy_current: "正在为你下单当前商品", buy_recommended: "正在为你下单乐享推荐商品", buy_nth: "正在为你处理所选商品",
  };

  const api = { parseOrdinal: parseOrdinal, parseOrdinals: parseOrdinals, matchControl: matchControl, opNames: opNames };
  if (typeof module !== "undefined" && module.exports) module.exports = api; // node 单测用
  if (root) {
    root.__lxIntent = api;
    // 兼容旧挂载名（历史代码引用）
    root.__lxParseOrdinal = parseOrdinal;
    root.__lxParseOrdinals = parseOrdinals;
  }
})(typeof window !== "undefined" ? window : null);
