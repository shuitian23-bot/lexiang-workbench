# 首次登录业务负责人恢复实施计划

> 按已确认的首次登录恢复范围实施；测试、源码修复与发布审查分别完成。

**目标：** 首次登录申请能选择业务负责人，校验并提交到现有审批链路。

**实现：** Vue 页面复用已有字段组件和 `businessApproverError` / `businessApproverLabel`，保留既有本地申请存储与后台审批模型。

**范围：** `AccessDeniedView.vue`、`AgentPermissionsView.vue` 的单条调整记录、`first-access-business-approver.test.mjs`，以及本计划和对应设计文档。

## 实施与验收

- [x] 专项测试先在旧代码上失败：字段缺失、空/非法负责人未被拦截、提交快照未保存负责人。
- [x] 基本信息插入 `BusinessApproverField`，绑定 `form.businessApprover` 和 `errors.businessApprover`。
- [x] `validateBasic()` 通过既有 `businessApproverError(form.businessApprover)` 校验；提交校验失败返回第一步。
- [x] `businessOwners` 来源改为所选合法 ITCode；写入顶层值和 `permissionSnapshot.businessApprover`，确认页及成功页使用标签函数。
- [x] 运行新回归及已有权限、角色冲突与审批任务回归，验证旧申请保护。
- [x] 本地界面验证未选阻止下一步、选择后继续、返回改选、确认提交；后台交接由真实 Vue 状态回归覆盖。测试数据仅位于本地隔离环境。
- [x] 执行设计守卫、lint、类型检查、构建与 shell smoke；检查源码差异只在确认范围内。
- [ ] 在独立服务器工作区构建并比较完整资源清单，追加资源、保留 runtime，依次更新 new 和正式并写入各自发布记录。
- [ ] 同步已授权 Git，检查主分支、源文件和发布资源一致，保留他人未提交改动。

记录标识：`first-access-business-approver-20260914`。发布记录标题：`首次登录权限申请业务负责人恢复`。

验证记录：专项 20 项由旧代码 18 失败 / 2 通过转为全通过；权限合并与弹窗共 28 项通过；场景包 70 项通过；现有 5 组权限脚本通过。设计守卫、lint、类型检查、构建及 shell smoke 通过。本地浏览器完成空选拦截、选择、返回改选、确认及提交。发布和 Git 结果在交付记录中另行记录，不提前标记完成。
