# Skill 能力变更同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有门户工作台 POC 中实现 Skill 能力变化发现、人工更新、重新评估和发布闭环。

**Architecture:** 由独立 mock/service 模块定义能力变化记录和版本计算，Pinia store 负责把更新元数据合并到 Skill 数据并维持线上/编辑版本并存。Skill Hub 负责筛选、变化详情和更新入口，Skill 创建页复用现有五步流程并增加更新提醒和 0.80 提审门槛。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vue Router、Node.js 内置测试、Vite。

## Global Constraints

- 不自动覆盖线上 Skill；新版本发布前旧线上版本继续可用。
- 生命周期状态与能力更新状态独立。
- 综合评分必须 `>= 0.80` 才能提交审核。
- 新增能力不自动勾选。
- 时间使用 Asia/Shanghai，格式 `YYYY-MM-DD HH:mm`。
- 不修改公共外壳，不覆盖 `public/admin-vue/admin-runtime/`。

---

### Task 1: 能力变化数据与版本状态

**Files:**
- Create: `vue-app/src/services/skillCapabilityChanges.ts`
- Modify: `vue-app/src/stores/skillHub.ts`
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Produces: `CapabilityUpdateStatus`、`SkillCapabilityUpdate`、`getSeedCapabilityUpdate()`、`nextPatchVersion()`、`startCapabilityUpdate()`。
- Produces: store 中的 `startCapabilityUpdate(name)` 与更新发布状态处理。

- [ ] 编写失败测试，验证种子变化、版本递增、更新草稿复用和线上版本保留。
- [ ] 运行测试并确认因数据层缺失而失败。
- [ ] 实现 mock/service 数据与 store 状态迁移。
- [ ] 运行测试并确认通过。

### Task 2: Skill Hub 更新发现与变化详情

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/src/assets/workbench.css`
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: `SkillHubItem.capabilityUpdate`、`startCapabilityUpdate(name)`。
- Produces: “只看有更新”、更新 KPI、双状态、变化详情弹窗与负责人/管理员更新入口。

- [ ] 编写失败的源码契约测试，覆盖筛选、详情、权限和更新入口。
- [ ] 运行测试并确认失败原因正确。
- [ ] 实现列表、弹窗、动作与响应式样式。
- [ ] 运行测试并确认通过。

### Task 3: 更新编辑闭环与 0.80 门槛

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`
- Modify: `vue-app/src/stores/skillHub.ts`
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: `SkillHubItem.capabilityUpdate` 与编辑草稿版本。
- Produces: 持续更新提醒、保存提示、0.80 显式校验、提交及发布闭环。

- [ ] 编写失败测试，要求页面显示更新提醒且不存在 0.60 门槛文案。
- [ ] 运行测试并确认失败。
- [ ] 实现编辑恢复、门槛校验和发布后的更新状态清除。
- [ ] 运行测试并确认通过。

### Task 4: 日志与完整验证

**Files:**
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`
- Build output: `public/admin-vue/`，部署时排除 `admin-runtime/`

**Interfaces:**
- Consumes: 已完成的功能源码。
- Produces: 一条北京时区 POC 调整记录和可构建的前端产物。

- [ ] 更新一条聚合 POC 调整日志。
- [ ] 运行 `pnpm guard:design-skill`、功能测试、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm smoke:shell`。
- [ ] 检查 `git diff` 与 `admin-runtime`，确认无无关变更。
- [ ] 提交本次分支，保留 `new`、正式和 GitLab 推送为独立确认步骤。

### Task 5: 预览环境 Mock 演示入口

**Files:**
- Modify: `vue-app/src/services/skillCapabilityChanges.js`
- Modify: `vue-app/src/stores/skillHub.ts`
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/src/assets/workbench.css`
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

- [ ] 先编写失败测试，要求显式场景注入、重置和仅预览域名展示入口。
- [ ] 实现“模拟能力变化”弹窗，提供接口/字段增强与权限变化两个场景。
- [ ] 初始 Skill Hub 不静默注入 Mock；触发后持久化，重置后恢复无更新状态。
- [ ] 重新运行完整验证并只发布到 `new`。
