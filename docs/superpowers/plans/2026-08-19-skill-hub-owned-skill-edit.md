# Skill Hub Owned Skill Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为本人且不处于能力更新流程的 Skill 提供统一编辑入口。

**Architecture:** 在 `AgentSkillsView.vue` 中用单一权限函数判断普通编辑资格，操作矩阵只保留状态治理动作，再按资格追加一个“编辑”。编辑处理根据当前状态恢复草稿或驳回上下文。

**Tech Stack:** Vue 3、TypeScript、Pinia、Node Test、Playwright

## Global Constraints

- 能力更新可见时必须走受控更新链路，不展示普通“编辑”。
- 非本人 Skill 不获得编辑入口。
- 不修改公共导航、权限管理、右侧 AI 助手或 `admin-runtime`。

---

### Task 1: 本人 Skill 编辑动作

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`
- Test: `vue-app/scripts/verify-skill-hub-summary-browser.mjs`

**Interfaces:**
- Consumes: `capabilityPresentation(item)`、`item.owner`、`user.value`
- Produces: `canUseStandardEdit(item: SkillHubItem): boolean`

- [ ] **Step 1: 写失败契约测试**

覆盖本人非更新 Skill 追加唯一“编辑”、本人更新 Skill 排除普通编辑、非本人无编辑，以及驳回状态保留驳回上下文。

- [ ] **Step 2: 运行聚焦测试并确认失败**

Run: `node --test --test-name-pattern="owned Skill" scripts/skill-capability-sync.test.mjs`

Expected: FAIL，提示缺少统一编辑资格判断。

- [ ] **Step 3: 最小实现**

新增 `canUseStandardEdit`，从状态动作表移除重复编辑文案，按资格追加单个“编辑”；处理“编辑”时根据 `draft` 或 `rejected` 状态传入既有恢复参数。

- [ ] **Step 4: 运行聚焦与完整测试**

Run: `node --test scripts/*.test.mjs`

Expected: 全部 PASS。

- [ ] **Step 5: 浏览器验收**

在预览登录模式下核对“我的 Skill”行编辑入口数量、非本人和能力更新行排除规则，并验证点击进入 `/agent/skill-create`。

- [ ] **Step 6: 更新同一条 POC 日志并提交**

更新 2026-08-19 的现有记录，提交源码、测试和构建产物。

### Task 2: 增量更新 new

**Files:**
- Deploy: `public/admin-vue/index.html`
- Deploy: `public/admin-vue/assets/*`

**Interfaces:**
- Consumes: Task 1 的已验证构建提交
- Produces: `https://new.leaibot.cn/admin-vue/agent/skills`

- [ ] **Step 1: 重新读取 preview 接收分支并确认快进**
- [ ] **Step 2: 推送 `incoming/zhangrui`，不强推**
- [ ] **Step 3: 从 Git 归档展开构建，检查同名资源冲突**
- [ ] **Step 4: 仅新增哈希资源并原子替换入口**
- [ ] **Step 5: 验证公网状态、文件哈希及受保护运行文件哈希**

