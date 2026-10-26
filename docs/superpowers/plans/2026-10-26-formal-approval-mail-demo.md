# 正式审批演示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 正式链接和已开放的 NEW 均能进行本地审批演示，正常登录不变。

**Architecture:** 复用现有 allowApprovalMailDemo，只将正式精确域名纳入该开关。正式独立构建，NEW 线上资源保持不变。

**Tech Stack:** Vue 3, TypeScript, Vite, Node test, Playwright.

## Global Constraints

不改 AUTH_MODE、allowPreviewAuth、路由、服务、菜单和共享运行文件。不从 NEW 全量复制到正式；构建输出在个人证据目录。仅修改已确认的七个源文件，保留当前共享 WIP。

### Task 1: 双域名审批演示

- [ ] 先在 scripts/approval-mail-demo-mode.test.mjs 增加正式域名明确/default server 的正例及相似域名反例；运行，预期两个正式正例因 false != true 失败。
- [ ] 将 runtimeMode.ts 中 `window.location.hostname === 'new.leaibot.cn'` 改为 `['new.leaibot.cn', 'leaibot.cn'].includes(window.location.hostname)`，不改登录模式；重跑配置、审批和产品回归。
- [ ] 浏览器脚本的可信 hostname、默认 server 和真实匿名 401 校验支持这两个精确域名，其余断言保留。
- [ ] 原 workbench-mail-approval-demo-20261026 记录更新为双环境审批演示，QA 文档注明新授权；保留历史说明。
- [ ] 执行 typecheck、lint、设计守卫、隔离 server 构建和 shell smoke。正式 hostname 代理本地候选，完成全审批回归及实际资源 SHA 核验。
- [ ] 完整备份正式目录并验证全部文件 SHA，同锁复核源/磁盘/台账，按 manifest 追加资源、不删除旧资源，原子切换正式 index；失败在台账写入前恢复原入口。
- [ ] 验证所有公开构建资源、代理扩展、非隐藏运行资源和两边磁盘全树；记录 formal 的真实发布信息，保留原 NEW 信息。
- [ ] 对真实正式链接重跑浏览器回归；Git 只提交本次文件，经 incoming 合入主分支并新鲜核实 GitHub。
- [ ] 停止本任务预览服务和隧道，保留未提交或忽略独有内容，核验无外部引用后正常移除本任务 worktree。
