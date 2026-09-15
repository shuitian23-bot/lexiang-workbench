# AI 助手任务与批量授权 Implementation Plan

**Goal:** 在当前工作台 new 预览中将授权与执行过程收拢到单一任务区，并修复单卡错配；供 aiwork 线上按接口合同复用。

**Architecture:** Vue 消息带一个任务快照，纯状态模块校验选中的精确请求集合。Pinia 保存每个任务的本地待办，组件仅渲染和发出决策；现有后端不新增或放宽执行权限。

**Tech Stack:** Vue 3、Pinia、TypeScript、node:test、现有 0914 设计 token。

## Global Constraints

仅当前工作台预览实现；不宣称 aiwork 线上修复。当前前端授权为本地流程，必须显示使用示例数据、无真实操作；模型正文不是授权证据。首登业务负责人、权限审批、场景包四步与禁止自审、共享运行文件和其他页面保持。只允许明确已列出请求；未知未来调用、范围变化和高影响动作不获得隐式批量许可。

基线：预览 c0b4f5fd 先合并 main 40080a5c 到 2bd334da，再合并最新 main 032c90b6 到 1137e297；均无冲突，最新品牌首页改动保持。

## Task 1: 精确授权状态

Files: 新增 vue-app/src/stores/aiTaskAuthorization.ts，新增 vue-app/scripts/ai-task-authorization.test.mjs。

接口约定：
```ts
export type RequestStatus = 'pending' | 'approved' | 'running' | 'succeeded' | 'failed' | 'rejected' | 'expired'
export interface TaskRequest { id:string; revision:number; label:string; scope:string; impact:string; kind:'read'|'export'|'write'|'unknown'; batchable:boolean; approvalGroup:string; status:RequestStatus; detail?:string; command?:string }
export interface AiTaskBlock { id:string; conversationId:string; title:string; mode:'preview'; createdAt:number; expiresAt:number; requests:TaskRequest[]; notice?:string }
export interface TaskDecision { taskId:string; conversationId:string; selections:Array<{requestId:string;revision:number}>; decision:'approve'|'reject' }
export function applyTaskDecision(task:AiTaskBlock, decision:TaskDecision, currentConversationId:string, now:number):{task:AiTaskBlock;acceptedIds:string[];error?:string}
export function updateTaskRequest(task:AiTaskBlock, requestId:string, revision:number, status:RequestStatus, detail?:string):AiTaskBlock
export function expireTask(task:AiTaskBlock):AiTaskBlock
export function taskProgress(task:AiTaskBlock):{label:string;done:number;total:number;pending:number;active:number;failed:number;terminal:boolean}
```

- [x] 先写行为失败用例：A任务不可批准B；批选只动所选；错revision/过期/跨会话/重复ID/未知ID拒绝；高影响不得混在批选；重复点击无新动作；未授权不能进running/succeeded；终态不可回退。
- [x] 实现不可变更新；批量批准仅全为read、batchable且approvalGroup相同的已列出pending。拒绝可选当前任务pending项；无效请求整个决策拒绝，不能部分误处理。
- [x] 过期只改变pending/approved/running为expired，终态保持；进度按succeeded计执行完成，approved不能冒充完成。
- [x] 运行真实模块回归并自审，不改store/UI。

## Task 2: 任务卡与过程列表

Files: 新增 components/agent/AgentTaskCard.vue；修改 AgentMessageList.vue、AgentConversationStates.vue；现有product-contract授权用例按组件抽取调整读取范围。

接口：AgentTaskCard 接收 task:AiTaskBlock；emit decision:TaskDecision。AgentMessageList 接收 msg.task 并将decision转为run-action `{type:'auth_task_decide',label:'任务授权',decision}`。保留旧卡片只读呈现；新任务不重复显示同条activity/auth区。

- [x] 一任务一张卡：任务标题、进度、示例范围提示；pending自动展开，完成后折叠，可回看。
- [x] 每请求显示名称、范围、影响和状态；只读支持勾选/全选，按钮显示所选数；高影响独立确认，不能被“全选”带入。默认未选择。
- [x] 业务信息默认可见；技术命令以换行的details按需查看，禁止默认namespace或黑色长命令撑宽面板。
- [x] 原地状态更新，不新增绿色回执；pending、approved、running、failed、rejected、expired、succeeded明确区分；折叠失焦时将焦点放到卡片summary。
- [x] 普通活动列表压成一行概览和可展开的轻量步骤，不把每步做成独立彩色卡；未运行不转圈、支持reduced-motion。
- [x] 组件仅发出ID/revision，不自行假定批准成功；授权全清空后维持可感知的焦点；380/492px宽度无面板横向溢出。

## Task 3: Store 对接与回归

Files: 修改 vue-app/src/stores/ai.ts；新增真实store行为测试；侧栏加一条未发布的调整记录；交付接口说明。

- [x] `_recordMessage` 将新的本地authRequest规范化为带精确ID的task；单次/批量/拒绝统一从decision定位真实message.task，删除“处理最新”的隐式逻辑。
- [x] 以任务/请求映射替代单个pendingQueryableSkillAuth，保留原查询结果/报告路径；每项批准后执行相应本地示例，只在示例完成后回填succeeded。
- [x] 现有“全场景串联演示”升级为一个含3个只读请求与1个独立导出示例的任务；同时支持“批量授权演示”自然语言入口。示例数据和无真实操作在任务卡可见，不自动调用命令或真实导出。
- [x] 普通未知命令只允许单项确认，并明确尚未接入真实执行；不能推断为只读后批量放行。
- [x] 换会话清理待办，历史恢复待执行任务置过期；旧auth卡只读状态保留、未决状态不可盲批；防止延迟结果回填到其他会话。
- [x] 用真实Pinia store验证两个并存查询、点击早期请求、批选未选项、换会话/恢复/重复提交；保留权限与场景包回归。

## Task 4: 审核与 new 交付

- [ ] 审阅每个任务的实际差异，再做整合review；按发现修复，不扩散无关范围。
- [ ] 设计规则检查（记录旧债务）、lint/typecheck/build/smoke和必要业务回归；浏览器通过真实按钮体验批选、独立高影响确认、折叠、错误、会话边界。
- [ ] 从服务器最新Git创建发布候选，严格父提交及main核验；本地/服务器全量产物一致后只发布new，保留runtime和旧资源。
- [ ] 更新原任务的一条发布记录，服务器Git预览分支同步源码与产物。归档交互方案、实际验证、线上对接边界；最终明确new与aiwork区分。
