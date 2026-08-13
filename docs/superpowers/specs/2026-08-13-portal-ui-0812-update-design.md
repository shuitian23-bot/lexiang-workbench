# 门户工作台 0812 UI 样式更新设计

## 目标

在 GitLab `dev/zhangrui` 当前提交 `fe71589` 的完整 Vue 工程上，增量接入 `lexiang-new-0812.zip` 中已确认的 UI 规范和页面样式。更新不得覆盖本地未提交内容、其他人员的业务代码、权限模块或服务器受保护运行文件。

## 基线与输入

- Git 基线：`https://gitlab.xpaas.lenovo.com/lcpoc/leaibot.git` 的 `dev/zhangrui`。
- 输入包：`lexiang-new-0812.zip`，SHA-256 为 `bd0b67dcee6c7ed80a8de8dcc9bcd475cabdb6f94b8cdcf0e6cf1859fe4f5425`。
- 工作方式：在独立临时克隆和专用分支中修改，完成前不触碰用户本地脏仓库。

## 允许变更

1. 新增 `skill/portal-workbench-ui-0812/`，保留 `portal-workbench-ui-0803` 作为历史基线。
2. 更新 `vue-app/design-baseline.lock.json`、`vue-app/design-skill.guard.json` 和 `vue-app/README.md`，使工程默认采用 0812 规范。
3. 增量合并以下两个 Vue 页面：
   - `vue-app/src/views/agent/AgentSkillCreateView.vue`
   - `vue-app/src/views/order/OrderPurchaseOrdersView.vue`
4. 预览发布后，在现有 POC 调整日志中增加一条合并记录；若日志文件已有并行修改，先重新取最新版本再做最小编辑。
5. 构建生成项目根目录 `public/admin-vue`，仅把本次构建需要的产物纳入发布或提交。

## 禁止变更

- 不整体复制压缩包，不引入 `__MACOSX`、`server 2.js`、`node_modules`、缓存或下载归档。
- 不修改后端、路由接口、权限管理、Agent 报告保存逻辑和其他业务页面。
- 不删除 `portal-workbench-ui-0803` 或历史文件。
- 不覆盖 `public/admin-vue/admin-runtime/workbench-geo.js` 和 `workbench-pages.js`。
- 不使用删除式同步，不直接修改 `/opt/projects/lexiang`，不发布正式环境。

## 页面效果

### Skill 创建页

- 由页面流统一控制区块间距。
- 页面标题与首个业务区块保持 16px 节奏，避免标题自身 margin 与父级 gap 叠加。

### 协议采购单页

- 使用 0812 设计变量统一文字、边框、背景、圆角、阴影和状态色。
- 页面采用唯一 PageFlow 管理 KPI、筛选区、列表和详情区间距。
- 表格次级文案、状态标签和固定操作列使用独立类名，避免宽泛选择器互相污染。
- 保留现有查询、筛选、分页、导出、详情路由和 mock/service 数据行为。
- 以内容槽宽度为响应式依据，Agent 展开或变宽时页面不得产生全局横向溢出。

## 验证

在 `vue-app` 执行：

- `pnpm install --frozen-lockfile`
- `pnpm guard:design-skill`
- 0812 Skill 增量设计检查，覆盖两个变更页面
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm smoke:shell`

还需验证协议采购单列表、详情路由及 Skill 创建页可访问；如浏览器工具可用，检查常规宽度和 Agent 展开状态。

## 发布顺序

1. 完成源码合并与本地验证。
2. 重新读取 GitLab `dev/zhangrui`，有更新则先重放本次白名单改动并解决冲突。
3. 推送个人分支 `dev/zhangrui`。
4. 通过 Git/服务器个人工作区更新 `new.leaibot.cn` 预览，采用非删除式同步并排除受保护运行文件。
5. 验证预览后报告结果；`leaibot.cn` 正式环境等待用户单独确认。

## 验收标准

- Git 差异仅包含本设计允许的文件和必要构建产物。
- 0812 设计规范检查、lint、typecheck、build 和 shell smoke 全部通过。
- 订单页面既有业务行为不回退，Skill 创建页仅发生间距调整。
- 预览中的受保护运行文件保持不变。
- Git、预览和正式环境状态分别报告。
