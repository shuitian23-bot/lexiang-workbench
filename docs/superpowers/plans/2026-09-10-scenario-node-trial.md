# Skill 节点试运行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** 按 Skill 节点检查模拟执行、输入输出传递，并对照预期核对反馈，失败带提示返回编排后重跑。

**Architecture:** 复用 ScenarioPackageTrialPanel 与 ScenarioTestReportSummary，按执行链路展示节点列表和选中节点详情，审核页复用只读记录。模拟领域记录节点版本、样例来源和直接下游收发数据，提交校验独立检查全部祖先输入及直接连线记录。

**Tech Stack:** Vue 3、TypeScript/JSDoc、Node test、Vite。

## Global Constraints

- 保留 fe9c2f871b4a 的权限管理与既有场景包编排、自审拦截、审核管理、确认选填等行为。
- 当前为本地模拟样例，无真实 Skill 调用；不声称反馈业务正确，不新增微调或打分。
- 无报错且传递结果完整的当前试运行才可提交；配置与测试设置变更需重跑。条件未命中可以跳过，不生成虚构输出。
- 使用现有 T4 创建工作区与页面内节点主从布局，复用 SectionHeader，局部 CSS/token，内容窄时单列，固定流程底栏保持。
- 仅更新 new，正式环境与 admin-runtime 全树保持；GitLab 不推送。

## Task 1: 节点执行及传递记录

**Files:** domain/scenarioPackageTesting.js、domain/scenarioSkillPackages.js、scripts/scenario-node-trial.test.mjs。

**Interfaces:** 报告节点新增 skillId、pinnedVersion、outputSource（fixture/manual/none）、downstream（nodeId/name/status/sentValue/receivedValue/detail）。status 为 received/blocked/skipped。保留全部连接祖先的输入语义，downstream 仅直接连线。

- [x] 新测试先覆盖两节点收发相同、A→B→C 继承输入、错误传播、条件跳过和末节点。
- [x] 报告节点生成后记录直接后继的接收内容；模拟失败仍记录失败原因。
- [x] 提交核验输入来源顺序、唯一性、完整性、接收值与来源输出一致；拒绝删改输入、伪造来源、漏传及重复传递。
- [x] 旧报告保留可查看，但新指纹版本要求重新试运行。

## Task 2: 节点主从视图

**Files:** views/agent/ScenarioPackageTrialPanel.vue、ScenarioTestReportSummary.vue。

- [x] 试运行前列出当前链路每个节点，试运行后各节点状态可直接查看，默认选报错节点。
- [x] 详情展示输入、执行状态、预期输出与模拟反馈对照，以及直接下游收发结果。
- [x] 条件命中、模拟确认与手工样例设置收拢到对应节点。测试任务和开始/重试保留在顶部。
- [x] 任何节点均可返回编排修改；审核只读模式不出现运行或修改操作。
- [x] 全局元数据收起；窄布局、键盘焦点、长输出、空/错误/过期状态保持可用。

## Task 3: 验证与 new 发布

**Files:** 相关场景包专项测试与既有场景包日志单条记录（不改其他日志）。

- [x] 运行场景包专项回归、设计守卫、lint、typecheck、build、shell smoke，独立评审。
- [x] 浏览器查看未运行、节点切换、正常传递、阻断回编排、修改后重跑、窄布局与只读记录。
- [ ] 校验权限与其他模块源码字节一致，提交明确文件；服务器个人工作区重建并比对完整清单。
- [ ] 备份 new，以锁与非删除资源传输/原子入口切换发布，保护正式及运行时，记录实际 new 发布人、时间和版本。

## Verification evidence

- 2026-09-10: 场景专项176/176、组件SSR 10/10、创建流程整合6/6；设计守卫、lint、typecheck、build、shell smoke通过。
- 实际本地浏览器检查节点状态、输入输出与下游接收、错误定位与回编排、修改失效/重跑、只读提交记录、1600与1280宽度（右侧Agent打开）布局；控制台未记录错误。
- 独立审查修复条件跳过不应记录发送内容；阻断节点不再误报反馈来源不一致。当前仍为模拟样例数据。
