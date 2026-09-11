# 跨菜单场景技能包设计

> 2026-09-09 更新：创建与审核规则已由 [独立管理员审核设计](2026-09-09-scenario-independent-review-design.md) 取代；下文自审内容仅保留为历史记录。

日期：2026-09-04
状态：用户已确认，进入 `new` 预览实现
目标页面：`agent.skills` / `/agent/skills?tab=packages`
页面合同：Skill Hub 为 T7 配置列表；场景技能包创建为 T4 业务表单 + V2 多步流程；沿用 E3/E4 审批与专项流程边界

## 1. 目标

在现有原子 Skill 之外增加独立的“场景技能包”，让具备跨菜单编排权限的创建人，按用户场景选择并串联多个已发布 Skill。技能包解决“一个用户目标需要跨多个一级菜单完成”的组合问题，但不替代原子 Skill，也不扩大任何调用者权限。

本期以“职场人群认证经营管理”为示例场景：

- 从“在职员工管理”选择认证类 Skill，作为必需核心步骤。
- 从“乐享运营”选择经营分析类 Skill，作为必需核心步骤。
- 可从“企业客户管理”增加有条件触发的跟进 Skill，作为可选步骤。
- 每一步固定到已发布的明确 Skill 版本。

## 2. 信息架构

```text
Skill Hub
├─ Skill
│  └─ 创建 Skill
└─ 场景技能包
   └─ 创建场景技能包
```

- Skill Hub 顶部使用下划线页签切换 `Skill` 与 `场景技能包`。
- 默认仍进入 `Skill`，原有列表、筛选、审批、能力更新和创建入口保持不变。
- 切换到 `场景技能包` 后，主按钮变为“创建场景技能包”。
- 创建流程在同一 Skill Hub 路由内使用 `tab=packages&mode=create` 展示独立工作区，不新增左侧菜单，也不改变工作台壳层。
- Skill 与场景技能包使用独立数据集合、状态和生命周期；不得放进同一 `items` 数组混用。

## 3. 已确认的产品规则

### 3.1 创建与审批

- 创建人必须拥有跨菜单编排权限，才能引用多个一级菜单下的 Skill。
- 技能包只有一名主责任人。
- 只由技能包主责任人审批。
- POC 当前使用 `admin`，允许 `admin` 作为创建人、主责任人和审批人自行审批。
- 自审只减少人工角色，不绕过依赖、权限、风险和版本自动检查。
- 审批与发布即使由同一账号连续完成，也形成两条独立审计事件。

### 3.2 Skill 选择与编排

- 只能选择状态为“已发布”且当前可用的 Skill。
- 每个步骤引用稳定 `skillId` 和明确 `pinnedVersion`。
- 执行链由固定的必需核心步骤和声明过的条件可选步骤组成。
- 必需步骤至少一个；条件步骤必须填写可读触发条件。
- Agent 运行时只能激活发布版本中声明过的 Skill，不能临时加入未评估 Skill。
- POC 的场景技能包至少包含两个 Skill、覆盖两个一级菜单，避免退化成原子 Skill 的重复入口。

### 3.3 版本

- 技能包固定到 Skill 的已发布明确版本，不使用浮动版本范围。
- Skill 发布新版本时，依赖它的技能包显示“待升级”，但继续使用旧固定版本。
- 技能包不会静默跟随 Skill 升级。
- 需要采用新 Skill 版本时，重新执行权限、风险、输入输出兼容和链路评估，并发布技能包新版本。
- 旧 Skill 版本在有效截止日前继续运行；超过截止日后按必需/可选步骤规则处理。

### 3.4 到期、禁用与降级

- 必需 Skill 到期或因安全/合规被紧急禁用：暂停整个技能包。
- 可选 Skill 到期或被紧急禁用：只关闭对应分支，技能包进入“降级运行”，并向用户显示未执行分支和原因。
- Skill 仅有新版、旧固定版本仍在有效期内：技能包保持可用，同时标记“待升级”。
- 任何降级都必须显式说明，不返回看似完整但实际缺步骤的结果。

## 4. 权限模型

技能包的“可编排”和“可调用”分开判断。

### 4.1 创建时

创建人必须具备：

- `scenario-package:create`：创建场景技能包；
- `scenario-package:compose:cross-menu`：跨一级菜单编排；
- 每个被引用 Skill 的 `skill:<skillId>:metadata:read`：读取名称、菜单、说明和当前线上版本等元数据；
- 每个被引用 Skill 的 `skill:<skillId>:reference`：把该 Skill 固定引用进技能包；
- 主责任人自审时还必须具备 `scenario-package:approve:self`。

POC 管理员的 `*` 可满足上述机器权限，但发布写边界仍必须执行全部校验。`ownerId` 和当前 `actor.id` 都必须非空且完全一致。

查看 Skill 名称、说明和版本不等于读取真实业务数据，也不等于可以代最终用户执行。

### 4.2 调用时

最终调用用户必须对本次实际激活的每一步同时拥有：

```text
技能包使用权限
∧ Skill 调用权限
∧ 实际涉及的一级菜单权限
∧ 数据范围与字段权限
∧ 写入、导出或发布等操作权限
∧ 需要的确认或审批
```

- 技能包永不提权，也不继承创建人或审批人的业务权限。
- 调用方必须拥有该技能包的精确使用权 `scenario-package:<packageId>:use`；其他技能包的使用权不能替代。
- 只有 `status=published` 且同时存在独立 `approved`、`published` 审计事件的技能包可以进入运行校验。
- 必需步骤缺任一权限：在产生副作用前阻断整个任务。
- 条件步骤被触发但权限不足：关闭该分支并说明降级；未触发的条件步骤不纳入本次权限要求。
- 步骤可声明 `requiresConfirmation` 和 `requiresApproval`。运行器通过 `confirmedStepIds`、`approvedStepIds` 接收本次调用的证据；必需步骤缺证据时整体阻断，已激活的条件步骤缺证据时仅降级该分支，未激活条件步骤不要求证据。
- 当前页面上下文只能帮助识别意图和补充参数，不能作为授权依据。
- 服务端/运行器必须在每次调用时重新校验，不能只依赖前端按钮状态。

## 5. 创建流程

```text
场景定义
→ 选择已发布 Skill
→ 设置核心链路与条件步骤
→ 权限和版本评估
→ 管理员审批发布
```

### 第一步：场景定义

字段：技能包名称、场景描述、目标人群、触发方式、完成标准、主责任人。POC 主责任人固定显示当前账号 `admin`。

### 第二步：选择已发布 Skill

- 按一级菜单分组展示已发布 Skill。
- 可选目录不限制预置菜单集合；任意一级菜单中 `onlineStatus=published` 且 `online!='未发布'` 的 Skill 都可进入目录。
- 卡片展示中文名、稳定 ID、所属菜单、当前发布版本、负责人和用途。
- 从未上线的草稿/待审批 Skill 与已禁用 Skill 不出现在可选清单；已有线上版本同时存在编辑草稿时，仍按 `online` 版本可选。
- 已选区实时汇总 Skill 数和一级菜单数。

### 第三步：设置核心链路与条件步骤

- 以有序列表展示已选 Skill，支持上移和下移。
- 每一步可设为“必需步骤”或“条件步骤”。
- 条件步骤必须填写自然语言触发条件。
- 列表明确展示固定版本、来源菜单和失败影响。

### 第四步：权限和版本评估

至少展示四类自动检查：

1. 创建人跨菜单编排权限。
2. Skill 发布状态与明确版本快照。
3. 必需链路、条件和声明范围完整性。
4. 最终用户运行时的菜单、Skill、数据、操作权限校验策略。

存在阻断项时必须显示原因并禁止进入审批发布；警告项可以继续，但必须在审批摘要中保留。

### 第五步：管理员审批发布

- 展示场景目标、主责任人、涉及菜单、固定版本链路、自动检查与降级规则。
- `admin` 勾选确认后可执行“审批并发布”。
- 写边界重新运行全部自动检查；前一步通过不代表发布时自动通过。
- 成功后生成技能包 `v1.0.0`，写入“审批通过”和“发布完成”两条审计记录，返回场景技能包列表。

## 6. 数据合同

### 6.1 场景技能包

```ts
interface ScenarioSkillPackage {
  id: string
  name: string
  description: string
  targetAudience: string
  trigger: string
  completionCriteria: string
  owner: string
  version: string
  status: 'draft' | 'published' | 'disabled'
  health: 'healthy' | 'upgrade_required' | 'degraded' | 'paused'
  menus: string[]
  steps: ScenarioSkillPackageStep[]
  updatedAt: string
  degradationNote?: string
  audit: ScenarioSkillPackageAuditEvent[]
}
```

### 6.2 步骤

```ts
interface ScenarioSkillPackageStep {
  id: string
  skillId: string
  skillName: string
  menu: string
  pinnedVersion: string
  currentPublishedVersion: string
  kind: 'required' | 'conditional'
  condition: string
  required: boolean
  requiresConfirmation?: boolean
  requiresApproval?: boolean
  order: number
  dependencyState: 'available' | 'update_available' | 'expired' | 'emergency_disabled'
  requiredPermissions: {
    menu: string[]
    skill: string[]
    data: string[]
    action: string[]
  }
}
```

`kind='required'` 时 `required` 必须为 `true`，`kind='conditional'` 时必须为 `false`。发布写边界拒绝矛盾值。

运行证据合同：

```ts
interface ScenarioRuntimeEvidence {
  confirmedStepIds: string[]
  approvedStepIds: string[]
}
```

`menus` 必须由 `steps` 推导，不能由创建人另行手工维护。固定版本取 Skill 的 `online`，而不是可能属于编辑草稿的 `version`。新草稿发布时若 `pinnedVersion` 与当前线上版本不一致，必须返回重新选择和重新评估，不能静默替换；已发布技能包则继续保留旧固定版本，并仅更新 `currentPublishedVersion` 和健康状态为“待升级”。发布写边界还要按 `skillId` 从权威目录重建名称、菜单、当前线上版本以及 menu/skill/data/action 四类非空权限快照。

## 7. 列表与详情

场景技能包列表展示：名称、场景目标、主责任人、涉及菜单、Skill 链路、技能包版本、健康状态、更新时间和操作。

状态文案：

- `已发布`：当前固定依赖均可用。
- `待升级`：存在新版 Skill，旧固定版本仍可用。
- `降级运行`：仅可选分支不可用。
- `已暂停`：必需步骤不可用。
- `已禁用`：主责任人主动停止调用。

详情弹层展示固定版本链路、必需/条件属性、触发条件、权限说明、降级说明和最近审计事件。

## 8. 状态与无障碍

- 列表具备正常、空、筛选无结果、待升级、降级、暂停和禁用状态。
- 创建流程具备字段错误、无可选 Skill、未选择、条件缺失、评估阻断、提交中、成功和失败状态。
- 页签使用 `role=tablist/tab`、`aria-selected`；创建步骤使用 `aria-current=step`。
- 错误摘要使用 `role=alert`，不可只依赖颜色表达。
- 弹层使用 `role=dialog` 与 `aria-modal=true`，支持关闭并返回触发点。
- 中间内容槽在宽屏和 Agent 最大态均不得产生页面级横向滚动。

## 9. 非目标

- 本期不实现自由拖拽画布、任意 DAG、并行分支或运行时自由选 Skill。
- 本期不改变原子 Skill 的创建流程和生命周期。
- 本期不实现真实跨系统业务调用，仅实现可审阅的编排、权限/版本政策模型和 POC 状态流。
- 本期不新增左侧菜单、后端数据表或正式环境发布。
- 本期不让技能包自动补齐调用者权限。

## 10. 验收标准

1. Skill Hub 默认仍显示原 `Skill` 页签，原列表和动作可用。
2. 可切换到 `场景技能包`，列表与 Skill 状态互不污染。
3. “创建场景技能包”进入独立五步流程，且顺序与本文一致。
4. 只能选择已发布、已启用 Skill；至少选择两个 Skill 并覆盖两个一级菜单。
5. 每一步显示稳定 Skill ID 和明确固定版本。
6. 核心步骤与条件步骤可排序和配置；条件步骤缺条件时不能继续。
7. 自动评估明确显示创建权限、依赖版本、链路完整性和运行时权限策略。
8. `admin` 可作为主责任人自审，但自动检查失败时发布按钮仍阻断。
9. 发布成功后返回列表，展示技能包版本、菜单数、Skill 数、健康状态和审计记录。
10. Skill 有新版时只提示升级，不自动替换固定版本。
11. 必需 Skill 到期会暂停包；可选 Skill 到期只关闭分支并显示降级说明。
12. 原 Skill 创建、无页面接口能力、权限管理、右侧 Agent 和受保护 `admin-runtime` 不回归。
13. 只更新 `new`；正式入口和正式资源指纹保持不变。

## 11. 发布与回滚

- 从当前 `new` 已部署 Git 基线的后续提交构建，避免预览回退。
- 通过 Git 分支/工作区传输，不使用文件上传。
- 构建产物在独立候选目录生成；同步到 `new` 时采用非删除式更新。
- 发布前备份 `new/public/admin-vue`，并记录入口资源及整个 `admin-runtime` 指纹。
- 同步时排除整个 `admin-runtime`，发布后至少复核 `workbench-geo.js` 与 `workbench-pages.js`。
- 使用发布记录标识 `scenario-skill-packages-20260904`，只记录 `new` 发布证据。
- 如验收失败，从发布前备份恢复 `new`；正式环境无需回滚，因为本轮不触碰正式环境。
