# 场景节点任务与输入输出配置

用户已确认上一轮分析并授权更新工作台。本次基于当前 new 实际发布的 6393c178，沿用门户 0818 T4/V2 创建流程与白底编排区。

## 范围与交互

节点配置增加本节点任务、固定要求（选填）、预期输出三个文本字段。拖入时任务取已发布 Skill 说明，输出取同一固定版本的已声明输出；没有声明时留空允许填写。每个场景独立保存补充内容，不改 Skill 原始定义，不增加必填门槛。

本节点使用的输入只读展示本次运行输入及实际连线指向的上游节点输出，使用业务名称。断线、重连、修改上游预期输出后立即更新；条件步骤注明可能跳过。画布位置不改变执行或输入顺序，不新增多前序、并行、重试或任意执行器。

发布确认页和已发布详情展示固定版本下的节点配置。旧包缺字段时可查看，默认沿用 Skill 任务，没有声明的输出明确显示未填写。节点 ID 只读辅助查看。确认与审批维持选填，权限规则不受文本配置影响。

## 数据与运行衔接

ScenarioPinnedStep 增加可选 task、fixedRequirements、expectedOutput 和只读 inputDescription，均为字符串，随节点快照在重评估、审批、发布和详情保持不变。输入来源由同一个纯函数按依赖计算，不保存第二份连线状态。

提供 buildScenarioRunPlan(packageItem, caller, request) 与 store.prepareRunPlan，以现有运行权限检查为入口，返回固定版本、授权步骤、任务、要求、预期输出和输入状态。用户输入单独保存，来源状态为已提供、待输入、待上游执行或已跳过；始终 executionPerformed:false，不产生模拟产物。详情的“执行配置”使用该接口展示准备状态。当前没有场景包真实执行消费方，本次不把自然语言发送到通用 Agent 伪装执行，也不增加运行或重试按钮。

## 验收与发布

验证默认带入、独立修改、切换节点与前进返回保留、连线变化更新来源、发布摘要与详情一致、旧包兼容、权限/证据阻断、条件跳过和快照隔离。工程执行本模块回归与项目规定检查；浏览器核验三栏与窄槽、字段和复选框对齐。发布经独立 Git 预览分支、个人服务器构建、资源比对、备份与原子入口切换，仅更新 new，保护 runtime、正式及无关源码。

## Published contract source

Newly published Skills capture version-bound description, input and output strings at publication. Creating a later draft or disabling and enabling the existing version must not overwrite that snapshot. Scenario selection reads only a snapshot matching the current published version; the six existing demo contracts remain version-gated fallbacks. Undeclared historical outputs stay empty.

## Filling examples requested after preview

Show concise, persistent examples below task, fixed requirements and expected output fields. Match examples to the six existing Skill categories with a generic fallback for other Skills. Explain runtime input as a readonly example, and show selection examples for predecessor, pinned version, chain type, conditions and optional execution evidence. Reuse current helper typography and the existing condition-example action. Examples must not replace saved values, create runtime input, require approval or imply actual results.
