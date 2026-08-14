# Skill 能力变更同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有门户工作台 POC 中实现 Skill 能力变化发现、人工更新、重新评估和发布闭环。

**Architecture:** 由独立 service 模块定义固定能力变化记录和版本计算，Pinia store 负责把更新元数据合并到 Skill 数据并维持线上/编辑版本并存。Skill Hub 负责卡片筛选、变化详情和更新入口，Skill 创建页复用现有五步流程并增加更新提醒和 0.80 提审门槛。

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

### Task 5: 默认能力更新与禁用卡片筛选

**Files:**
- Modify: `vue-app/src/services/skillCapabilityChanges.js`
- Modify: `vue-app/src/stores/skillHub.ts`
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/src/assets/workbench.css`
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: `getSeedCapabilityUpdate(skillName)`、`SkillHubItem.capabilityUpdate`、`SkillStatus`。
- Produces: `summaryFilter: 'all' | 'updates' | 'disabled'`、`setSummaryFilter(filter)`，以及默认两条能力更新记录。

- [ ] **Step 1: 写失败测试**

  在 `skill-capability-sync.test.mjs` 中要求 Store 初始化始终为 `product-knowledge` 和 `voucher-recommend` 合并固定能力变化；要求页面存在“能力更新”和“已禁用”卡片筛选，不存在“模拟能力变化”“重置演示数据”及对应 service/store 方法。

- [ ] **Step 2: 运行测试确认失败**

  Run: `node --test vue-app/scripts/skill-capability-sync.test.mjs`

  Expected: FAIL，当前源码仍包含 Mock 激活/重置入口，且 Store 不会为无缓存记录合并固定变化。

- [ ] **Step 3: 实现默认记录和卡片筛选**

  `hydrateItem()` 无论首次数据还是已有本地数据都读取 `getSeedCapabilityUpdate(item.name)`，使两条固定记录直接参与能力更新统计。删除 `activateCapabilityDemo()`、`resetCapabilityDemo()` 及 Store 包装方法。Skill Hub 删除预览域名判断、Mock 按钮、弹窗和样式；增加 `summaryFilter`，点击“能力更新”时筛选 `hasCapabilityUpdate(item)`，点击“已禁用”时筛选 `item.status === 'disabled'`，再次点击当前卡片恢复全部并清除冲突条件。

- [ ] **Step 4: 保留生命周期操作并更新日志**

  保留 `published: ['禁用', ...]` 与 `disabled: ['启用', ...]` 映射；在原 Skill 能力变更日志记录中说明默认能力更新卡片和禁用卡片筛选，不新增重复日志。

- [ ] **Step 5: 运行完整验证**

  Run: `node --test vue-app/scripts/skill-capability-sync.test.mjs`

  Run: `pnpm lint && pnpm typecheck && pnpm guard:design-skill && pnpm build && pnpm smoke:shell`

  Expected: 测试全部通过；浏览器首次进入显示能力更新 `2`、已禁用 `1`，两张卡片分别筛出 `2` 和 `1` 条记录，控制台无错误。

- [ ] **Step 6: 提交并只发布到 new**

  显式暂存本任务源码和测试，提交信息使用 `fix: restore skill update and disabled filters`。备份 `/opt/projects/lexiang-new/public/admin-vue`，非删除式同步构建产物并排除整个 `admin-runtime/`；验证正式入口未变化。

### Task 6: 更新页能力上下文两层展示

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`
- Modify: `docs/superpowers/specs/2026-08-14-skill-capability-sync-design.md`

**Interfaces:**
- Consumes: `selectedContextItems`、`activeCapabilityUpdate.currentContextCodes`、`activeCapabilityUpdate.changes` 与变化项生成的推荐上下文。
- Produces: `affectedSelectedContextItems`、`optionalNewContextItems`、`addOptionalContext(code)`，以及统一的“能力上下文”展示模块。

- [ ] **Step 1: 写失败测试**

  在 `skill-capability-sync.test.mjs` 中要求更新页包含“已选择”“本次变化”“已选能力受影响”“可选新增”“加入上下文”，并要求顶部概览显示两类数量；测试同时约束“加入上下文”必须通过显式点击调用，不允许初始化时自动选中推荐变化项。

- [ ] **Step 2: 运行测试确认失败**

  Run: `node --test vue-app/scripts/skill-capability-sync.test.mjs`

  Expected: FAIL，当前页面只有独立的顶部变化提醒和“我已理解你选择的能力上下文”，不存在两层分组与显式加入动作。

- [ ] **Step 3: 实现两层上下文和顶部概览**

  将顶部提醒压缩为变化概览，按钮切换到“需求澄清”并定位统一模块。统一模块展示当前已选能力，命中 `currentContextCodes` 的已选项标记“有更新”；变化区列出 `changes` 摘要，并把尚未选择的变化上下文归入“可选新增”。`addOptionalContext(code)` 仅在用户点击后调用现有 `toggleContext(code)`。

- [ ] **Step 4: 完成响应式和状态验证**

  保持模块为一个容器内的无嵌套分组；在窄内容槽中标签和操作自动换行。验证无更新、新增已加入、已选能力被移除三种状态下数量和文案同步。

- [ ] **Step 5: 运行完整验证**

  Run: `node --test vue-app/scripts/skill-capability-sync.test.mjs`

  Run: `pnpm lint && pnpm typecheck && pnpm guard:design-skill && pnpm build && pnpm smoke:shell`

  Expected: 功能测试与项目检查全部通过，构建不修改 `public/admin-vue/admin-runtime/`。
