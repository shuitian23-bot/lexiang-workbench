export const pocLogServerRecords = [
  {
    "time": "2026-08-18 11:46",
    "operator": "zhangrui（协作工作区）",
    "codeAuthor": "Codex（协作代理）",
    "sourceRef": "dev/zhangrui-menu-additions；功能提交 3472234；需求来源 _0708_analysis (2).zip",
    "traceStatus": "已在个人隔离 worktree 完成源码、构建产物和浏览器交互验证，并增量更新 new 预览；正式链接和远端源码主分支未更新。",
    "overwriteImpact": "只新增企业客户管理中的“线索池-政企”和订单管理中的“协议产品订单管理”；保留原“线索池”“打分模型”“协议采购单管理”及其他公共功能；服务器受保护的 workbench-geo.js、workbench-pages.js 保持原样。",
    "title": "企业客户与协议产品订单菜单新增",
    "scope": "企业客户管理 / 线索池-政企 / 订单管理 / 协议产品订单管理 / 列表详情 / 查询导出",
    "detail": "企业客户管理新增“线索池-政企”，提供政企线索只读查询、条件筛选、排序、分页、详情和脱敏/审批明文导出；订单管理保留“协议采购单管理”，新增“协议产品订单管理”，提供采购单号、订单号、状态查询，当前筛选结果导出、分页和独立订单详情。两项新增均使用隔离页面和运行模块，不修改其他菜单、右侧 AI 助手、权限管理或既有订单流程。",
    "deployTargets": [
      "new"
    ],
    "deployAccount": "zhangrui",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-08-17 14:10",
    "operator": "zhangrui（协作工作区）",
    "codeAuthor": "Codex（协作代理）",
    "sourceRef": "回退来源：f6ca14c / b7afa98；恢复范围：登录账号生命周期、权限申请与用户管理、AI 授权与反馈、报告下载、Skill 创建路由、案例微调、Skill Hub 一级菜单分类及专项回归检查",
    "traceStatus": "已在个人隔离 worktree 完成源码恢复；30 项产品契约回归、权限字段/范围/用户管理检查、Lint、类型检查和生产构建通过；登录、权限范围、用户管理浏览器验收通过。已通过 incoming/zhangrui 在服务器独立工作区构建，完成 new 预览、正式环境和 GitLab dev/zhangrui 源码同步。",
    "overwriteImpact": "按提交差异和小范围补丁恢复，不整包覆盖；保留订单管理、AI 时间戳、Skill 能力更新/禁用、低分项独立微调和服务器日志；未修改受保护 admin-runtime。",
    "title": "0803 UI 同步引发的产品交互回退恢复",
    "scope": "登录与账号审批 / 权限管理 / AI 授权与反馈 / 报告下载 / Skill 创建与案例微调 / Skill Hub 分类 / 回归保护",
    "detail": "恢复内部 ADFS、外部登录、找回密码、账号创建审批、访问拒绝与邮件审批入口；恢复权限申请共享范围编辑、用户权限变更审批和管理员启停边界；报告卡与展开页移除保存并统一下载；授权卡改回业务语言并支持单项/批量只读授权；恢复自然语言直达 Skill 创建、调试种子过滤和回答反馈；案例微调按案例独立等待确认并在确认后重新评估，其他案例不置灰；Skill Hub 重新按工作台一级菜单归类。构建前新增产品契约检查，防止旧 UI 包再次带回已废弃逻辑。",
    "deployTargets": [
      "new",
      "formal"
    ],
    "deployAccount": "zhangrui",
    "status": "已合并正式"
  },
  {
    "time": "2026-08-17 11:30",
    "operator": "zhangrui（协作工作区）",
    "codeAuthor": "Codex（协作代理）",
    "sourceRef": "服务器 main 9f0479d；dev/baiyu bb7476a；dev/guanfeng2 bb7476a；dev/guanjf2 baf959e；dev/yejw2 bb7476a；dev/zhangrui 4682c22；dev/zhouyue118 edac9b3；incoming/zhangrui 合并 2f721a5 / 4dfd704 / df0cc24",
    "traceStatus": "已核对 /opt/projects/lexiang 全部个人 worktree：6 个工作区均干净，各 dev 分支相对 main 没有独立未合并提交；历史 incoming/zhangrui 调整已通过对应 merge commit 进入 main。本次更新已完成 new 预览和正式链接合并，并同步个人 Git 分支及 incoming/zhangrui。",
    "overwriteImpact": "本次只恢复调整日志数据、来源字段和 Skill 评估低分项微调入口，并修正单项微调的独立等待与确认状态；不覆盖其他业务模块、权限管理或 admin-runtime。服务器中与门户 admin-vue 无关的前台和文档提交不写入产品调整日志。",
    "title": "服务器多分支调整记录恢复与归档审计",
    "scope": "调整日志 / main / dev/* / incoming/zhangrui / 来源追溯 / 防覆盖",
    "detail": "逐一核对服务器 main、baiyu、guanfeng2、guanjf2、yejw2、zhangrui、zhouyue118 工作区及 incoming/zhangrui 历史合并来源，并从正式环境历史 AppLayout 构建中恢复 25 条曾因 Vue 源码与运行产物分化而缺失的门户调整记录。日志现在保留改动人、代码作者、来源提交、部署范围、追溯状态和覆盖影响；个人 dev 分支当前均落后于 main 且没有独立提交，因此不虚构新的分支改动。同时恢复 Skill 评估低分项逐项微调：点击一项后仅当前项进入等待确认，其他低分项保持可操作；确认只刷新对应项，全部低分项确认完成后才开放整体提审状态。",
    "deployTargets": [
      "new",
      "formal"
    ],
    "deployAccount": "zhangrui",
    "status": "已合并正式"
  },
  {
    "time": "2026-08-11 09:55",
    "operator": "zhangrui",
    "sourceRef": "public/admin-vue/assets/AppLayout-CVjlByMu.js / public/admin-vue/assets/ai-BAj9EcuZ.js",
    "traceStatus": "已更新 new 预览并合并到正式链接；Git 提交已同步至 incoming/zhangrui",
    "overwriteImpact": "仅调整右侧 AI 助手报告卡片下载按钮和展开报告关闭行为；历史结果仍按当前 AI 会话 artifacts 计算；不触碰权限管理和 admin-runtime 受保护文件。",
    "title": "AI 报告下载按钮与关闭范围修正",
    "scope": "右侧 AI 助手 / 数据解读报告 / 动态页签 / 历史结果",
    "detail": "将 AI 助手报告卡片中的“保存”按钮统一为“下载”，点击直接下载与展开报告页头一致的 HTML/Markdown 报告文件；展开报告页头“关闭”改为只关闭当前展开视图，不从当前会话的历史结果列表中删除该报告。历史结果继续只展示当前 AI 对话里可生成报告的 artifacts。",
    "deployTargets": [
      "new",
      "formal"
    ],
    "deployAccount": "zhangrui",
    "status": "已合并正式"
  },
  {
    "time": "2026-08-06 15:13",
    "operator": "zhangrui",
    "sourceRef": "用户提供 HTML：惠采协议采购单管理0731.html；Vue 源码：vue-app/src/views/order/OrderPurchaseOrdersView.vue / vue-app/src/stores/app.ts / vue-app/src/router/index.ts / vue-app/src/content-slot/contentSlotDefinitions.js / vue-app/src/views/agent/AgentSkillCreateView.vue / vue-app/src/stores/ai.ts",
    "traceStatus": "已更新 new 预览并合并到正式链接；Git 提交待用户确认后同步",
    "overwriteImpact": "新增订单管理一级菜单和 Vue 原生页面；企业客户管理恢复为线索看板、线索池、打分模型三项；同步修复登录菜单白名单缺少 order 导致左侧侧栏不显示订单管理的问题；不覆盖权限管理；admin-runtime 受保护文件未改动。",
    "title": "订单管理协议采购单管理 Vue 接入",
    "scope": "订单管理 / 协议采购单管理 / Vue 菜单 / 列表详情 / 导出 / AI 页面识别",
    "detail": "基于用户提供的惠采协议采购单管理 HTML，转换为 Vue 原生页面并接入订单管理菜单：保留协议采购单指标、状态页签、编号/客户/状态筛选、分页表格、查看详情、商品转化进度和 CSV 导出；补齐 Skill 创建能力上下文和右侧 AI 页面识别口径。页面风格按当前门户工作台卡片、筛选、表格和详情样式统一。本次纠正协议采购单从企业客户管理迁至订单管理，并补齐侧栏可见菜单白名单，确保左侧新增“订单管理 / 协议采购单管理”。未修改权限管理模块。",
    "deployTargets": [
      "new",
      "formal"
    ],
    "deployAccount": "zhangrui",
    "status": "已合并正式"
  },
  {
    "time": "2026-08-05 12:17",
    "operator": "zhangrui",
    "sourceRef": "vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue；服务器脚本：/opt/projects/lexiang/scripts/auto-changelog.js；服务器 Git：/opt/projects/lexiang-new 与 /opt/projects/lexiang",
    "traceStatus": "已更新 new 预览；正式链接和 Git 提交待用户确认后同步",
    "overwriteImpact": "移除前一版非真实汇总展示和错误归因；未触碰权限管理；未覆盖 admin-runtime 受保护文件。",
    "title": "调整日志真实 dev 变更口径修正",
    "scope": "调整日志 / leaibot.cn dev / admin-vue / 真实变更 / 覆盖影响 / 来源追溯",
    "detail": "调整日志改为记录 leaibot.cn dev 上工作台 admin 项目的真实变更流水：改动账号、更新时间、状态、主要功能点、覆盖影响和来源信息。复核发现服务器自动 changelog 面向乐享前台用户日志，明确排除 GEO/workbench/admin 范围；当前 POC 调整日志又是 Vue 源码内静态记录，不会自动读取服务器 Git。因此服务器上 baiyu、yejw2 等同事的后台提交此前没有进入弹窗。本次改为按服务器 Git、哨兵告警或人工来源补录，不再把部署账号等同为 Git 提交作者。",
    "deployTargets": [
      "new"
    ],
    "deployAccount": "zhangrui",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-08-04 16:22",
    "operator": "baiyu",
    "sourceRef": "正式 Git：d7e8930 / 6e87aa6 / c823cef / b3cafb6 / 36a88e7；preview Git：9c4bf7e / 8bb9a97 / 934ce36 / 03c2490 / 3f1ffcb",
    "traceStatus": "已追溯到 /opt/projects/lexiang 与 /opt/projects/lexiang-new 服务器 Git log；提交作者为 baiyu，部署文件最后写入账号可能显示 zhangrui，不作为功能作者依据。",
    "overwriteImpact": "涉及 public/admin-vue/admin-runtime/workbench-geo.js 与 workbench-pages.js；这些 runtime 文件不应被普通 Vue 构建整目录覆盖，后续部署需继续保护 admin-runtime。",
    "title": "GEO 看板 8月4日服务器提交补录",
    "scope": "GEO 看板 / 转化看板 / 竞品对比 / 可见度卡 / 信源分布 / qwen 平台 / runtime 保护",
    "detail": "补录 2026-08-04 服务器 Git 中 baiyu 的 GEO 看板连续提交：可见度卡对比行统一百分比口径并支持切换竞品即时渲染；转化看板标题改为联想整体/联想乐享并删除 emoji；转化看板按设计图重排为整体、乐享、官网、分业务结构，新增官网入站流量来源和 UV 趋势；信源分布图和排行榜 Top20 固定品牌表现口径；同时开启千问平台并修复竞品趋势线重叠缺线。",
    "deployTargets": [
      "new",
      "formal"
    ],
    "deployAccount": "zhangrui",
    "status": "服务器 Git 已补录"
  },
  {
    "time": "2026-08-03 22:24",
    "operator": "baiyu",
    "sourceRef": "正式 Git：31dc591 / 71396b8 / 25261a1；preview Git：627ab75 / 0dd960e / a155165",
    "traceStatus": "已追溯到 /opt/projects/lexiang 与 /opt/projects/lexiang-new 服务器 Git log；该组记录此前未进入 Vue 调整日志。",
    "overwriteImpact": "涉及 public/admin-vue/admin-runtime/workbench-geo.js、workbench-pages.js 与 routes/geo-dashboard.js；属于服务器 runtime/API 同步改动，不能只看本地 GitLab Vue 源码判断是否已记录。",
    "title": "GEO 看板 8月3日服务器提交补录",
    "scope": "GEO 看板 / PRD 全量对齐 / 品牌 vs 竞品 / 演示数据兜底 / 接口降级",
    "detail": "补录 2026-08-03 服务器 Git 中 baiyu 的 GEO 看板提交：接口超时、失败或 501 时降级到 POC 演示数据并在状态栏标注；恢复升级版“品牌 vs 竞品对比”逐竞品横条排行卡，接口超时降为 10 秒快速降级；按 PRD 第二轮重排转化看板并调整概览页产品口径。",
    "deployTargets": [
      "new",
      "formal"
    ],
    "deployAccount": "zhangrui",
    "status": "服务器 Git 已补录"
  },
  {
    "time": "2026-07-22 19:17",
    "operator": "yejw2",
    "codeAuthor": "yejw2",
    "sourceRef": "正式 Git：784f394；涉及 docs/closed-loop-dashboard-deployment.md、public/lexiang-admin-extension/closed-loop-menu.js、scripts/check-closed-loop-dashboard-release.sh、public/changelog.json",
    "traceStatus": "已追溯到 /opt/projects/lexiang 正式服务器 Git log；该提交属于正式站后台扩展保护，不在 admin-vue 静态日志自动来源内。",
    "overwriteImpact": "闭环交易看板菜单改为独立于 admin 构建持久化，目标是避免后续后台整体构建覆盖同事新增入口。",
    "title": "闭环交易看板菜单持久化补录",
    "scope": "乐享运营 / 闭环交易看板 / 后台扩展菜单 / 构建覆盖保护",
    "detail": "补录 2026-07-22 yejw2 的服务器提交：将闭环交易看板菜单放到 admin 构建之外持久化，并增加发布校验脚本，避免后台整体更新时把该入口覆盖掉。该类变更没有经过当前 Vue POC 调整日志的手工补录链路，因此此前弹窗中缺失。",
    "deployTargets": [
      "formal"
    ],
    "status": "服务器 Git 已补录"
  },
  {
    "time": "2026-07-30 17:07",
    "operator": "zhangrui",
    "sourceRef": "服务器哨兵：scripts/guard-check.sh；标记表：scripts/guard-markers.txt；Git 记录：a605f74 / e5ef56b / 1d7b5fc",
    "traceStatus": "可追溯到哨兵告警和 Git log。哨兵记录的是服务器文件最后写入账号，不等同于功能代码作者。",
    "overwriteImpact": "workbench-geo.js 缺失 geoIsAbortError、workbench-pages.js 缺失 geo-source-top10 时会触发告警，判定为功能标记丢失，疑似旧 buffer 或旧构建覆盖；处理方式是核对 git status/log，必要时用 Git 版本恢复被踩文件。",
    "title": "GEO runtime 哨兵告警与覆盖追溯",
    "scope": "GEO 看板 / admin-runtime / workbench-geo.js / workbench-pages.js / 功能标记 / 旧 buffer 覆盖",
    "detail": "服务器哨兵每 2 分钟检查 admin-vue 关键 runtime 文件里的唯一功能标记。截图中的告警显示 GEO 看板 2.0 的并发治理、多选和 Top10 面板标记丢失，文件最后写入账号为 zhangrui，最后写入时间分别为 2026-07-30 17:06:58 和 17:07:00。该记录用于定位服务器文件被谁最后写入、哪些功能标记丢失、是否存在覆盖风险；后续日志遇到同类情况，应把哨兵告警、Git 记录和现场处理提交号一起写入来源，避免只凭页面表现猜测改动人。",
    "deployTargets": [
      "new",
      "formal"
    ],
    "deployAccount": "zhangrui",
    "status": "哨兵已追溯"
  },
  {
    "time": "2026-06-11 14:42",
    "operator": "zhangrui",
    "codeAuthor": "baiyu",
    "sourceRef": "Git 记录：957de7b / 2a84079；服务器现场处理截图；git log 已核验两个提交号",
    "traceStatus": "已追溯到服务器 Git 快照。zhangrui 为被保护现场改动账号，baiyu 为快照入库提交作者。",
    "overwriteImpact": "4 个 workbench 相关文件的未提交改动共 4616 行先被快照保护；随后发现 index.html 又写入约 220 行楼层样式精修并再次快照，避免后续部署用旧副本覆盖掉现场改动。",
    "title": "workbench 裸改快照与并发覆盖保护",
    "scope": "admin 工作台 / workbench / index.html / css 重构 / ai / pages / geo-dashboard / 防覆盖",
    "detail": "服务器 Git 日志确认：2026-06-11 14:41:15 的 957de7b 快照保护 zhangrui 未提交的 workbench 改动（4 文件、4616 行，涉及 css 重构、AI、pages、html）；2026-06-11 14:42:01 的 2a84079 继续保护并行 session 在 14:41 写入的 index.html 楼层样式精修（约 220 行）和 geo-dashboard 改动。该记录用于说明当时的根因是工作区存在未提交的服务器裸改，容易被后续旧构建或旧副本覆盖；现场处理动作是先快照入库，再以最新基线继续编辑。",
    "status": "已快照入库"
  },
  {
    "time": "2026-08-04 14:32",
    "operator": "zhangrui",
    "title": "0803 样式包冲突比对与输入区视觉应用",
    "scope": "右侧 AI 助手 / 输入框 Composer / 0803 设计样式（排除权限管理）",
    "detail": "对照 lexiang-new-0803 样式交付包和 portal-workbench-ui-0803 设计 Skill 做冲突检查，排除会回滚后续功能的旧版权限、授权、Skill Hub 分类、评估微调和报告页头代码；仅将与当前功能匹配的 AI 输入区视觉样式迁移到 Vue 组件，使默认输入行保持白色可编辑态、占位文字与控件颜色统一使用设计 token。此前新增的 AI 回复赞/踩反馈入口保留。",
    "status": "已合并正式"
  },
  {
    "time": "2026-08-04 13:13",
    "operator": "zhangrui",
    "title": "右侧 AI 助手回答反馈按钮",
    "scope": "右侧 AI 助手 / 对话消息 / 反馈按钮（排除权限管理）",
    "detail": "在每条 AI 助手回复结果下增加赞/踩小图标按钮，支持单条回答本地选中、互斥切换和再次点击取消；用户消息、欢迎态、输入区和权限管理模块不受影响，用于 POC 中记录回答质量反馈入口。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-08-03 14:48",
    "operator": "zhangrui",
    "title": "Skill 评估动态评分与案例微调边界调整",
    "scope": "Skill 创建 / 评估验证 / 用例对比 / 右侧 AI 助手（排除权限管理）",
    "detail": "上方静态、结果、过程和效率等动态评分卡只展示评分与进度，移除卡片内 AI 微调入口，避免把动态评分误当作可直接修改对象；用例对比改为结构化验收案例列表，每条案例提供独立 AI 微调，点击后由右侧 AI 助手给出针对该案例的优化建议，用户确认后触发 3 秒重新评估，仅刷新该案例的执行耗时和得分。原有评估项逐项微调与整体 AI 微调保留；权限管理模块未修改。",
    "status": "已合并正式"
  },
  {
    "time": "2026-07-31 08:19",
    "operator": "zhangrui",
    "title": "AI 助手命令授权内容转译",
    "scope": "右侧 AI 助手 / 授权确认 / GEO 查询 Skill",
    "detail": "将 geo_conversion_stat 等脚本式调用的授权卡片从 raw 命令展示改为普通用户可理解的授权内容：说明查询对象、时间范围、环境、影响范围和执行步骤，保留“授权 / 批量授权 / 拒绝”交互；不展示 python 命令、namespace 或 JSON 参数。",
    "status": "已合并正式"
  },
  {
    "time": "2026-07-31 08:58",
    "operator": "zhangrui",
    "title": "查询型 Skill 授权场景补齐",
    "scope": "右侧 AI 助手 / 查询型 Skill / 授权确认（排除权限管理）",
    "detail": "为乐享运营、GEO 看板、在职员工管理和企业客户管理中可查询的 Skill 补齐统一授权 mock：用户用自然语言查询指标、数据、趋势、转化、明细或报告时，先展示“授权 / 批量授权 / 拒绝”的只读授权卡片；授权确认后继续执行原查询，返回结论、数据摘要和可展开报告卡片。最新补齐门户工作台首页今日核心指标、异常项、下一步动作等当前页面查询，以及“查询 geo”等短问法的前置授权触发，避免绕过审批直接输出查询口径；授权说明明确仅读取 POC mock 数据和页面上下文，不执行写入、发布、导出、配置或权限变更；本次未触碰权限管理模块。",
    "status": "已合并正式"
  },
  {
    "time": "2026-07-30 13:59",
    "operator": "zhangrui",
    "title": "0729 视觉样式与设计规范应用",
    "scope": "工作台壳层 / 顶部页签 / 动态报告入口 / 右侧 AI 助手（排除权限管理）",
    "detail": "对照 lexiang-new-0729 视觉调整包和 portal-workbench-ui-0729 设计规范 Skill 做三方差异判断，仅应用与当前 Vue 源码功能重合且不覆盖后续功能改动的样式：动态报告入口从内容区移入顶部栏并改为当前会话的历史结果下拉，静态页签间距和顶部壳层布局同步 0729 规范；AI 报告页签增加会话和消息归属，避免不同会话报告串台；项目设计基线锁同步升级到 0729，并纳入设计 Skill 校验路径。权限管理模块明确排除，AgentPermissionsView.vue 未覆盖。",
    "status": "已合并正式"
  },
  {
    "time": "2026-07-30 12:52",
    "operator": "zhangrui",
    "title": "权限管理空白页修复",
    "scope": "权限管理 / Vue 构建产物 / new 预览",
    "detail": "在权限管理源码保持远端 main 最新完整功能的前提下，重新统一构建并覆盖 new 预览产物，修复权限页懒加载 chunk 与入口版本不一致导致的空白页问题；服务器侧已校验权限申请、审批列表、角色管理、用户管理、组织管理、数据源管理和功能管理模块均存在。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-30 12:08",
    "operator": "zhangrui",
    "title": "Skill 创建 AI 微调闭环优化",
    "scope": "Skill 创建 / 评估验证 / 右侧 AI 助手 / 重新评估",
    "detail": "调整评估验证阶段低分项微调闭环：低分项行内“AI 微调”和分数改为固定右侧布局，按钮在前、分数在后；单项或整体微调触发右侧 AI 助手时，全量微调按钮短暂禁用，助手返回建议后立即解锁，可继续微调其他低分项；用户在右侧确认微调完成后，左侧评估结果区进入 3 秒毛玻璃重新评估状态，随后刷新对应评分。全部低分项达标后隐藏“AI 可继续优化”区域，保留行内微调入口用于后续继续优化；权限管理模块不在本次改动范围内。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-30 10:47",
    "operator": "zhangrui",
    "title": "Skill 创建评估项微调布局优化",
    "scope": "Skill 创建 / 评估验证 / AI 微调按钮",
    "detail": "修复评估验证列表中分数和“AI 微调”按钮被误套入独立白框的问题；评估行样式只作用于列表直接行，分数固定右对齐并与微调按钮同行展示，低分项整体仍保留黄色预警背景和 AI 微调入口。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-30 10:18",
    "operator": "zhangrui",
    "title": "new 预览非权限改动恢复",
    "scope": "new 预览 / 右侧 AI 助手 / Skill 创建 / Skill Hub / 运营与企业客户页面（排除权限管理）",
    "detail": "线上 new 被其他构建覆盖后，按排除权限管理的范围恢复用户已确认的非权限改动：右侧 AI 助手授权确认卡片、调试种子过滤、Skill 创建微调与测试闭环、Skill Hub 草稿/测试链路、数据解读报告页头和业务页面交互等；权限管理模块沿用线上当前版本，不随本次恢复包覆盖。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-30 09:23",
    "operator": "zhangrui",
    "title": "右侧 AI 助手隐藏调试种子内容",
    "scope": "右侧 AI 助手 / 消息渲染 / 工具调用结果",
    "detail": "右侧 AI 助手消息渲染和回复入库增加调试种子过滤，拦截 `<seed:tool_call>` 等内部工具调用片段，避免把 JSON、工具参数或种子标签作为普通回复展示给用户。历史会话中已经存在的同类内容刷新后也会被隐藏，后续仍保留正常过程状态、报告卡片和可继续执行按钮。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-30 08:36",
    "operator": "zhangrui",
    "title": "右侧 AI 助手授权确认卡片优化",
    "scope": "右侧 AI 助手 / 授权确认 / POC 演示",
    "detail": "将原命令式授权卡片改为自然语言授权说明，隐藏 namespace 和命令黑框，明确授权内容、授权范围、影响说明和执行内容；操作区提供“授权 / 批量授权 / 拒绝”三类动作，授权或拒绝结果仍回填到原卡片内，不追加多余气泡。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-29 17:57",
    "operator": "zhangrui",
    "title": "数据解读报告页头操作收敛",
    "scope": "动态报告页签 / 数据解读报告 / 页头按钮",
    "detail": "根据报告页头操作规范，移除顶部“保存”按钮，保留“复制链接”和“下载”；原“返回页面”文案调整为“关闭”，点击后仍关闭当前动态报告页签并回到原页面上下文。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-29 17:36",
    "operator": "zhangrui",
    "title": "Skill 创建低分项逐项 AI 微调",
    "scope": "Skill 创建 / 评估验证 / 右侧 AI 助手 / 重新评估",
    "detail": "在保留整体 AI 微调入口的基础上，评估验证列表中低于 0.80 的可优化项逐行显示“AI 微调”按钮；上方评分卡出现黄色预警分数时，也同步展示“AI 微调”入口，并映射到对应评估项或整体微调。点击任一低分项或预警评分卡会唤起右侧 AI 助手生成针对性微调会话，用户确认“微调完成”后左侧刷新对应项、评分卡和综合评分，可继续处理下一个预警项。所有低分项完成后提交审核状态同步开放，但 AI 微调入口仍保留为继续优化入口。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-29 15:56",
    "operator": "zhangrui",
    "title": "AI 助手支持自然语言打开 Skill 创建",
    "scope": "右侧 AI 助手 / Skill 创建 / 页面跳转意图",
    "detail": "右侧 AI 助手新增创建 Skill 意图识别：用户输入“我要创建一个 skill”“新建一个技能”“帮我做个 Skill”等自然语言时，会直接打开 Skill 创建静态页签，并在会话中提示可继续填写基础配置或用自然语言补充需求。Skill Hub、技能包管理、技能管理等查询或管理表达仍保持进入 Skill Hub，避免误跳到创建流程。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-29 15:26",
    "operator": "zhangrui",
    "title": "Skill Hub 分类改为一级菜单",
    "scope": "Skill Hub / 分类筛选 / 所属菜单展示",
    "detail": "Skill Hub 顶部“分类”筛选改为直接读取当前工作台一级菜单：乐享运营、GEO 看板、在职员工管理、企业客户管理，不再从 Skill 历史业务分类中动态取值。默认 Skill 数据同步收敛为一级菜单口径；对浏览器本地仍缓存旧分类的数据，页面按 Skill 名称、中文名、描述和标签做兜底映射，保证旧数据也能被一级菜单筛选命中。详情弹层中的“所属菜单”同步展示一级菜单口径，创建、草稿、审核和测试调用链路不变。",
    "status": "已更新 new 预览"
  },
  {
    "time": "2026-07-29 11:16",
    "operator": "zhangrui",
    "title": "0728 设计规范覆盖（排除权限管理）",
    "scope": "工作台壳层 / 右侧 AI 助手 / 静态页签 / 首页 / Skill 创建 / Skill Hub / 运营 / GEO / 在职员工 / 企业客户",
    "detail": "拉取 Git 最新 main 后，对照 lexiang-new-0728 设计交付包与 UI 独立交付的 portal-workbench-ui-0728 设计 Skill，仅覆盖当前 Vue 源码中与功能页面交互重合的样式和交互：右侧 AI 助手默认收起、收起态焦点隔离与宽度变化重排；静态页签支持关闭最后一个并回到门户首页；运营、GEO、在职员工、企业客户等页面同步 0728 设计样式与轻量交互修正；Skill 创建和 Skill Hub 保留右侧 AI 微调、测试调用和报告展开闭环。权限管理模块本次明确排除，未覆盖 AgentPermissionsView.vue。",
    "status": "已合并正式"
  }
]
