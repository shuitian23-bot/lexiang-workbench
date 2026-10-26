# NEW 审批邮件演示恢复

## 已确认需求

用户要求 NEW 可以正常演示上次合并的审批功能。本次仅发布 NEW，不部署正式环境。

## 根因与现状

审批邮件按钮和无账号独立页共用 `allowPreviewAuth`，而 NEW 当前使用 server 登录模式，故演示入口被关闭。当前 NEW 源码基线是 `54f2c9cad55a`，包含尚未进入 main 的后续积分页面；不得用 main 的旧积分页面替换它们。

## 实施决定

- 保留 AUTH_MODE 和 allowPreviewAuth 的现有逻辑。
- 独立导出 allowApprovalMailDemo：原 preview 环境继续开放；server 环境只对精确域名 new.leaibot.cn 开放。
- 只替换审批组件的一处导入和六处审批演示判定，不改私有路由的登录守卫。
- 保留本地链接有效期、收件人、节点、revision、Web Locks、重复提交和跨页同步校验。
- 数据仍在同站点、同浏览器本地，包含审批和账号申请状态记录；不调用真实账号启用、权限变更或邮件发送接口。
- 保留 NEW 后续积分源码、既有菜单和受保护 runtime；正式环境文件不变。

## 验收

- 配置矩阵覆盖 NEW、正式、localhost、相似域名、无浏览器、显式 preview 和开发默认值；server 下 allowPreviewAuth 始终 false。
- NEW 域名 + server 模式通过有账号/无账号双入口、组织必填、同意/驳回/最终执行、重复提交、跨页同步和无效/过期链接回归。
- 无会话访问私有页面仍转登录，不写 preview_user；演示没有后端写请求。
- 默认 server localhost 拒绝独立审批，现有正式入口和 runtime 哈希不变。

## 边界

这是本地 POC，不是真实邮件或后端匿名审批。此前已披露的存储失败回滚限制不在本次改动范围。
