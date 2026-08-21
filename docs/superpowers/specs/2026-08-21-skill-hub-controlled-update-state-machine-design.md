# Skill Hub 能力上下文受控更新状态机设计

## 1. 目标

依据《门户工作台能力上下文受控更新产品方案（2026-08-21）》调整 `new` POC，使 Skill Hub 能用统一状态模型表达六类生命周期中的能力变化，并保证更新决策优先于普通编辑、评估、审批、发布和启停操作。

本次交付为前端交互与状态闭环 POC，不连接真实能力扫描、通知、审批或发布接口。POC 中的状态、操作码和数据结构应可直接映射后端最终契约。

## 2. 页面类型与保护范围

- 页面：`/agent/skills`，T7 配置列表，沿用 E3 高风险状态机和 E4 Skill 专项流程。
- 继续复用现有 Skill Hub 页头、摘要筛选、筛选栏、表格、详情弹层和确认弹层。
- 不修改工作台 Sidebar、Topbar、右侧 Agent、动态报告、权限管理及其他业务页面。
- 不改变 Skill 创建的五步结构：基础配置、需求澄清、草稿生成、评估验证、提交审核。
- 不修改 `public/admin-vue/admin-runtime/workbench-geo.js` 和 `workbench-pages.js`。
- POC 运行态只保存在内存；完整刷新恢复初始 Mock。

## 3. 统一状态模型

每条 Skill 同时维护三个维度：

1. `onlineStatus`：`unpublished | published | disabled`，描述业务实际调用状态。
2. `workflowStatus`：`draft | review | approved | published | disabled | rejected`，描述当前工作或候选版本状态。
3. `capabilityUpdateStatus`：`none | available | preparing | processing | processing_with_available | failed | ignored | resolved`，描述当前能力变化处理状态。

页面不得再从中文状态文案反推业务逻辑。状态展示和按钮均通过统一展示模型计算：

```ts
type SkillHubActionCode =
  | 'view_change'
  | 'start_update'
  | 'ignore_update'
  | 'continue_update'
  | 'view_update_error'
  | 'retry_update'
  | 'edit'
  | 'view'
  | 'evaluate'
  | 'test'
  | 'submit_review'
  | 'withdraw_review'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'enable'
  | 'disable'
  | 'delete'

interface SkillHubAllowedAction {
  code: SkillHubActionCode
  enabled: boolean
  payload?: Record<string, string>
}
```

POC Store 集中计算 `allowedActions`，页面只映射操作码到固定文案和点击行为。后续联调时可直接替换为接口返回值。

## 4. 初始 Mock 数据

完整刷新后固定恢复六类“有更新”示例；保留现有 `产品知识问答` 和 `券包权益推荐` 两条已发布更新示例，因此“已发布”可以有多条，六类生命周期至少各有一条：

| 示例 | 工作流状态 | 线上状态 | 能力更新状态 | 初始操作 |
| --- | --- | --- | --- | --- |
| 草稿 | `draft` | `unpublished` | `available` | 查看变化、更新、忽略更新 |
| 待审批 | `review` | `unpublished` | `available` | 查看变化、更新、忽略更新 |
| 已审批待发布 | `approved` | `unpublished` | `available` | 查看变化、更新、忽略更新 |
| 已发布 | `published` | `published` | `available` | 查看变化、更新、忽略更新 |
| 已禁用 | `disabled` | `disabled` | `available` | 查看变化、更新、忽略更新 |
| 已驳回 | `rejected` | `unpublished` | `available` | 查看变化、更新、忽略更新 |

现有无变化示例继续保留，用于验收普通工作流操作没有被受控更新逻辑破坏。新增一条草稿示例，不通过改写既有 Skill 的生命周期来凑齐场景。每条变化记录使用不同 `changeRecordId`，但复用同一变化详情结构。

## 5. 状态展示

列表状态区域最多展示一个主状态和一个更新提示：

- `available`：保留原主状态，并显示“有更新”。
- `preparing`：保留原主状态，并显示“正在准备更新”。
- `failed`：保留原主状态，并显示“更新失败”。
- `processing + draft`：主状态显示“更新中”，不显示第二个更新标签。
- `processing + review`：主状态显示“待审批”。
- `processing + approved`：主状态显示“已审批待发布”。
- `processing + rejected`：主状态显示“已驳回”。
- `processing_with_available`：保留当前更新主状态，并增加“有更新”。
- `ignored / resolved / none`：不显示更新提示，恢复对应基础主状态。

“只看有更新”和“能力更新”摘要卡覆盖 `available`、`preparing`、`processing_with_available` 和 `failed`，不把纯 `processing` 计入待决策数量。

## 6. 操作覆盖矩阵

操作优先级固定为：

```text
preparing
  > failed
  > processing_with_available
  > available
  > processing
  > 普通工作流
```

命中高优先级状态后，不叠加低优先级或普通工作流操作：

- `available`：`view_change`、`start_update`、`ignore_update`。
- `preparing`：`view_change`、禁用且 loading 的 `start_update`。
- `failed`：`view_change`、`view_update_error`、`retry_update`、`ignore_update`。
- `processing + draft`：`view_change`、`continue_update`。
- `processing + review`：负责人可查看和撤回；审核人可查看变化、评估、审批、驳回。
- `processing + approved`：发布管理员可查看和发布。
- `processing + rejected`：`view_change`、`continue_update`。
- `processing_with_available`：`view_change`、`start_update`、`ignore_update`。
- `none / ignored / resolved`：按工作流和当前角色恢复基础操作。

页面按钮统一使用“忽略更新”，不再出现“忽略本次”或“暂不处理”。破坏性变化和权限变化必须填写原因；增强变化原因选填。

## 7. 流程设计

### 7.1 更新

1. 点击“更新”后立即进入 `preparing`，复用同一 `Skill ID + changeRecordId` 的更新任务。
2. 创建或复用唯一编辑版本，升级已绑定上下文版本，清除旧评估结果。
3. 进入需求澄清步骤并自动执行一次可见更新指令。
4. 成功后进入 `processing + draft`，返回列表显示“更新中”和“继续更新”。
5. “继续更新”复用原草稿、对话、编辑版本和更新任务，不重复执行首轮指令。

### 7.2 忽略

1. 忽略仅关闭当前变化记录，不修改线上版本、候选版本或上下文绑定。
2. 忽略成功后恢复原工作流状态和合法操作。
3. 破坏性或权限变化未填写原因时，确认按钮不可提交并显示字段错误。
4. 变化一旦成功写入更新草稿，不再提供忽略操作。

### 7.3 失败与重试

1. 更新任务失败进入 `failed`，保留原工作流、错误阶段、错误信息和任务 ID。
2. “重试更新”复用原任务和编辑版本，重新进入 `preparing`。
3. “忽略更新”关闭尚未写入草稿的变化并恢复原流程。
4. 已形成有效更新草稿后的页面内生成或保存失败仍保持 `processing`，不重新开放忽略。

### 7.4 更新处理中出现新变化

1. 聚合为 `processing_with_available`，保留同一编辑版本。
2. “更新”将新变化同步进当前编辑版本，使旧评估失效，然后回到原 `processing` 工作流。
3. “忽略更新”只关闭新变化记录，不撤销已经处理的更新内容，然后回到原 `processing` 工作流。

### 7.5 审批与发布

- 有待决策变化时冻结评估、撤回、审批、驳回和发布。
- 更新草稿提交后进入 `processing + review`；审批通过进入 `processing + approved`；驳回进入 `processing + rejected`。
- 发布成功后切换线上版本并进入 `resolved`。
- 原 Skill 为禁用状态时，更新版本发布后仍保持禁用。

## 8. 变化详情与确认反馈

- 变化详情继续使用安全 Markdown，先展示业务影响和风险，再展示折叠的技术差异与历史记录。
- `failed` 增加错误信息区，展示失败阶段、任务 ID、错误信息和重试建议。
- 忽略确认文案明确说明候选版本仍基于旧能力上下文。
- 危险操作保留二次确认；按钮 loading 时防止重复点击。
- 所有 POC 状态变更在页面内即时反馈，但不写入 `localStorage`。

## 9. 测试与验收

自动测试至少覆盖：

1. 六类生命周期在 `available` 下只返回三个更新决策操作。
2. 三维状态到主状态、更新提示的映射。
3. `preparing / failed / processing_with_available / processing` 的操作优先级。
4. 更新、忽略、失败、重试、继续更新、提交、审批、驳回和发布状态流转。
5. 重复点击更新不会生成第二个编辑版本或任务。
6. 高风险忽略必须有原因，普通增强变化可选填。
7. 更新版本发布后继承原禁用状态。
8. “只看有更新”只统计待决策或失败状态。
9. 页面不再按中文文案推测操作，不展示冲突按钮或三个同义状态。
10. 完整刷新恢复六类初始 Mock。

工程验证执行 `guard:design-skill`、定向状态机测试、`lint`、`typecheck`、`build` 和 `smoke:shell`。发布到 `new` 后核对入口资源、关键文案、相关路由和受保护 runtime 哈希。

## 10. 非本次范围

- 真实能力快照、扫描、通知、审计和后端 `allowedActions` 接口。
- 共同维护人、负责人转移和逾期催办规则。
- Skill 创建五步结构调整。
- 权限管理、全局 Agent、其他业务菜单和正式环境发布。
