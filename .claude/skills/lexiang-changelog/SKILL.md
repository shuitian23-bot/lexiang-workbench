---
name: lexiang-changelog
description: changelog.json 更新日志的完整格式规则（大白话写法、合并、署名、token 口径、范围限定）。每次给 leaibot.cn 上线改动后写日志时必读。
---

# lexiang 更新日志格式规则

线上页面 `https://leaibot.cn/changelog.html`，数据源 `public/changelog.json`，自动渲染无需重启。

**总规则：任何上线到 leaibot.cn 的改动（功能、页面、文案、数据、修复），发布后必须在 `public/changelog.json` 追加当日条目——不管出自哪个人、哪个 AI 工具/session。发现已上线改动没记录，先补记再干自己的活。**

## 格式

- `days` 数组按日期倒序（最新一天在最前）。
- 当天（北京时间）已有条目 → 该天 `items` 末尾追加，编号页面自动续接；新的一天 → 新建 `{ "date": "YYYY-MM-DD", "items": [...] }`。
- **描述必须是不懂代码的人能看懂的大白话**：写「用户能感知到什么变了、对他有什么用」，不写文件名/函数名/技术词。仅影响内部运营的句尾注明「（内部功能，不影响购物体验）」。
  - 例：「商品详情页新增『适合你』推荐理由：会根据你聊过的需求，用一句话告诉你这款为什么适合你。」
- **同一天同一功能块多次迭代合并展示**：更新已有条目为最终状态，中途反复不让用户看到。重要新功能排前、修复类排后。
- **每条末尾署名改动人 + token 消耗**：「——白羽（约1.2万 token）」。
  - **白羽手写条目时自己带上 token（首选，避免盲区）**：手动提交常把 changelog.json 和代码放同一 commit，auto-changelog 见「已动过日志」会整条跳过、不补 token；所以白羽**写条目时就直接把 token 写进去**（用 `scripts/token-stats.js "<上次提交ISO时间>" "<本次提交ISO时间>"` 估算，或按本次会话量保守填，密集多提交时窗口会偏大、宁可保守）。
  - 派 coder/agent 做的功能，token 取 agent 自报的 subagent_tokens（如「约5万 token」）。
  - 观侧（或任何本地开发者）在 commit message 末尾附 `[tokens:12345]`，auto-changelog 自动解析写入。
  - 自动补录走 auto-checkpoint（裸改入库）的条目本机无会话窗口、token 会缺，事后人工回填或留空。
- **每日自动合并**：当天最后一次提交（或新一天首次提交）时，当班 AI 主动整理前一日/当日全部条目为最终状态，保持每天 15-25 条以内。
- **范围限定（强制）**：只记乐享 POC（leaibot.cn 前台体验）及直接配套（如 ops-lite 运营配置）。GEO 看板、workbench 通用后台、基础设施/脚本/文档一律不写。
- **自动补录兜底**：cron 每 10 分钟跑 `scripts/auto-changelog.js`，漏记的自动用 LLM 生成补录并署名。但自动生成不如手写准，仍要求每次提交自带日志。
- changelog.json 的改动随当次代码提交一起 commit。
