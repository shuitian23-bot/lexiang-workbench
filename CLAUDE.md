# 联想乐享（lexiang）— Claude Code 上手指南

> **生产**: https://leaibot.cn （leaiteam 服务器 `/opt/projects/lexiang`，PM2 进程 `lexiang`，端口 `:3001`，main 分支直接服务）
> **业务**: 联想官方 B 端 AI 购物助手 — 商品导购、企业方案、订单售后、门店查询
> **Stack**: Node.js + Express + SQLite + 火山引擎 Ark（deepseek-v4-pro/flash 分场景）+ 联想 AIGC 代理
> **前端结构**（2026-06-11 拆分后）: `public/index.html`（仅结构）+ `public/css/main.css` + `public/js/portal.js`（首页）+ `public/js/app.js`（应用主逻辑）

## 详细流程见 skills（用到时自动加载，别在这找）

| skill | 内容 | 何时读 |
|---|---|---|
| `lexiang-dev` | 本地开发、目录地图、常见任务入口 | 起环境/找代码入口 |
| `lexiang-deploy` | 部署、回滚、PM2、backup 恢复 | 部署/恢复/重启 |
| `lexiang-ai-flow` | 双 AI 架构、runAgentStream、SSE 协议 | 改 AI 流程/SSE |
| `lexiang-changelog` | changelog.json 完整格式规则 | 每次上线后写日志 |
| `lenovo-leai-pc-design` | PC 端设计规范全套 | 改任何 PC 端样式/交互/文案前**必读** |

---

## 协作强制规则（所有人 / 所有 AI session）

### 1. 改代码必须 commit + push

不管用什么 AI 工具，每次改完：

```bash
git add -A
git commit -m "feat|fix|chore|docs|refactor: 简短描述"
git push origin main
# cron 1 分钟内自动 pull + reload 部署
```

**为什么**：cron 自动部署依赖 GitHub main 最新；只改不 push 会卡住所有人的部署。紧急小调整（CSS 颜色/文案 1 分钟修复）可直接改+保存即生效，但**当天必须 commit + push**。改后端（server.js/routes/skills/core/db）需 `sudo pm2 reload lexiang`（push 了则 cron 自动 reload）。

### 2. 改之前先拉

```bash
git pull origin main             # 先拉别人改动再开工
# push 被 rejected → git pull --rebase origin main，解冲突后再 push
```

### 3. 多人多 AI 防覆盖（已发生多次覆盖事故，一步不能省）

1. **git 是唯一事实源**：改完立即 commit + push，禁止裸奔工作区。开工发现他人未提交改动 → 先 `git add` + `checkpoint:` 快照提交保护，再开工。
2. **编辑互斥锁**：改共享热点文件（`public/index.html`、`public/css/main.css`、`public/js/portal.js`、`public/js/app.js`、`public/admin/*`、`server.js`、`core/*`）前先 `scripts/edit-lock.sh claim <你的标识> <文件>`；BLOCKED → 停下沟通，不硬改；完工 `release`；锁 2 小时自动过期。
3. **覆盖前乐观锁检查**：任何整文件覆盖式写入（cp 部署、脚本生成、AI 重写整文件）前，必须 diff 现场文件 vs 你的编辑基线；不一致 = 有人并行改过 → **停止覆盖**，先 checkpoint 对方改动，重取基线重放自己的改动。
4. **AI session 标准编辑循环**：取基线 → 编辑工作副本 → 部署前 diff 基线 vs 现场（变了回上一步）→ 覆盖部署 → 立即 commit + push → release 锁。
5. **领域分工**：前台与后台 `public/admin/*` 尽量不跨域同时开工；要跨先在群里说一声。

### 4. 更新日志（每次上线必写）

任何上线到 leaibot.cn 的改动，发布后必须在 `public/changelog.json` 追加当日大白话条目（不懂代码的人能看懂），随代码一起 commit。完整格式规则读 `lexiang-changelog` skill。

### 5. PC 端设计规范（必读后再动 UI）

维护任何 PC 端页面样式/交互/中文文案前，必须先读 `lenovo-leai-pc-design` skill 及其 references。不新增规范外的主色、紫色渐变、玻璃拟态、营销页式大背景。

### 6. 其他

- PM2 reload 前确认目标是 `lexiang`，别误碰 `lexiang-shop / lenovo-shop` 等同名进程
- 移动端兼容：分屏类改动必须在 `@media (max-width: 768px)` 退化到原逻辑
- 端口：生产 3001 / baiyu dev 3002 / 观 dev 3011
