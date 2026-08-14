<template>
  <!--
    完整还原原版 .sidebar 结构与 class。
    collapsed 类对应原 sb.classList.toggle('collapsed')
  -->
  <div
    class="sidebar"
    id="sidebar"
    :class="{ collapsed: sidebarCollapsed, 'is-peeking': isPeeking, 'has-user-menu': userMenuVisible }"
    ref="sidebarEl"
  >
    <SidebarHeader
      :collapsed="sidebarCollapsed"
      @home="goPortalHome"
      @toggle="toggleSidebarManual"
    />

    <!-- ===== 导航菜单（对应原 renderSidebar() 生成的 HTML）===== -->
    <div class="sidebar-nav" id="sidebar-nav">
      <SidebarNavGroup
        v-for="(group, key) in filteredMenuTree"
        :key="key"
        :group="group"
        :group-key="key"
        :current-page-id="currentPageId"
        :active="isGroupActive(key)"
        :open="openGroups.has(key)"
        @toggle="toggleGroup"
        @navigate="navigateTo"
      />
    </div>

    <SidebarFooter
      :user="user"
      :role="role"
      :user-initial="userInitial"
      :user-menu-visible="userMenuVisible"
      @toggle-user-menu="toggleUserMenu"
      @close-user-menu="closeUserMenu"
      @logout="doLogout"
      @open-skill-create="openSkillCreatePage"
      @open-skill-manager="openSkillManagerPage"
      @open-permission-manager="openPermissionManagerPage"
      @open-poc-log="openPocAdjustmentLog"
    />
  </div>

  <Teleport to="body">
    <div
      v-if="pocLogVisible"
      id="poc-adjustment-log-modal"
      class="poc-log-modal open"
      @click.self="closePocAdjustmentLog"
    >
      <div class="poc-log-panel" role="dialog" aria-modal="true" aria-label="调整日志">
        <button type="button" class="poc-log-close" @click="closePocAdjustmentLog" aria-label="关闭">×</button>
        <div class="poc-log-head">
          <span>仅用于 POC 记录</span>
          <h3>调整日志</h3>
          <p>记录本轮工作台功能调整与验证状态，不作为正式审计、发布审批或生产变更依据。</p>
        </div>
        <div class="poc-log-list">
          <div v-for="item in pocLogRecords" :key="`${item.time}-${item.title}`" class="poc-log-item">
            <div class="poc-log-meta">
              <span>改动人</span>
              <strong>{{ item.operator || '历史未记录' }}</strong>
              <span>更新时间</span>
              <time>{{ item.time }}</time>
            </div>
            <div>
              <b>{{ item.title }}</b>
              <p>{{ item.detail }}</p>
              <small><span>主要功能点</span>{{ item.scope }}</small>
            </div>
            <div class="poc-log-status">
              <span>状态</span>
              <em>{{ item.status }}</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore, MENU_TREE } from '@/stores/app'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import SidebarHeader from '@/components/sidebar/SidebarHeader.vue'
import SidebarNavGroup from '@/components/sidebar/SidebarNavGroup.vue'
import SidebarFooter from '@/components/sidebar/SidebarFooter.vue'

const router   = useRouter()
const route    = useRoute()
const appStore = useAppStore()

const { user, role, userInitial, sidebarCollapsed, filteredMenuTree } = storeToRefs(appStore)

// 当前 pageId（从路由 meta 读取，对应原 STATE.currentPage）
const currentPageId = computed(() => route.meta?.pageId || '')

// 已展开的分组集合（对应原 .nav-sub.open 状态）
const openGroups = ref(new Set())

// 用户菜单显隐
const userMenuVisible = ref(false)
const isPeeking = ref(false)
const pocLogVisible = ref(false)

const pocLogRecords = [
  {
    time: '2026-08-14 11:30',
    operator: 'Codex（协作代理）',
    title: 'Skill 能力变更同步人工闭环',
    scope: 'Skill Hub / 能力变化详情 / Skill 创建 / 评估审核',
    detail: '基于能力变更同步 PRD，新增独立 mock/service 变化记录；Skill Hub 支持“只看有更新”、能力更新指标、生命周期与更新双状态、检测时间、变化摘要、前后值及影响详情。负责人或管理员可从线上版本创建或继续更新草稿，旧线上版本在新版本发布前持续可用，新增能力不自动勾选；编辑页持续提示目标能力版本。提审门槛统一为综合评分 0.80，0.782 阻断，AI 微调到 0.859 后开放提交；新版本发布后更新状态闭环。未接入真实扫描、邮件和权限服务，公共导航、右侧 Agent 与其他业务页面保持不变。',
    status: '本地已完成，待更新 new 预览'
  },
  {
    time: '2026-08-14 10:11',
    operator: 'Codex（协作代理）',
    title: 'AI 助手逐条消息时间戳',
    scope: '右侧 AI 助手 / 当前会话 / 历史会话',
    detail: '为欢迎语、用户消息和 AI 回复统一增加年月日时分秒时间戳；时间戳紧贴所属消息气泡下方，用户消息按气泡右边缘对齐，AI 消息按气泡左边缘对齐并保持单行显示。结构化授权、报告和操作卡跟随所属消息共用一个时间，保留原有消息、历史会话、报告和输入流程。',
    status: '已更新 new 预览'
  },
  {
    time: '2026-08-13 14:34',
    operator: 'Codex（协作代理）',
    title: '0812 工作台样式规范更新',
    scope: '设计基线 / Skill 创建 / 订单管理 / 协议采购单管理',
    detail: '接入 portal-workbench-ui-0812 统一设计规范，保留 0803 历史版本；Skill 创建页统一页面标题与首个业务区块的间距；协议采购单列表和详情统一设计变量、KPI、筛选区、表格、状态标签及内容槽响应式样式。查询、筛选、分页、导出、详情路由、右侧 Agent、权限管理和其他业务页面保持原有逻辑。',
    status: '已合并正式'
  },
  {
    time: '2026-07-24 13:44',
    operator: 'Codex（协作代理）',
    title: 'Skill 创建评估页微调收口调整',
    scope: 'Skill 创建 / 评估验证 / 右侧 AI 助手 / 提交审核',
    detail: '调整 Skill 创建评估验证阶段的微调链路：左侧评估页不再承载 Skill 应用验证、运行 Skill 输入框、最终验收动作，以及“查看草稿 / 查看澄清 / 查看用例”等卡片内跳转按钮，避免在主流程内重复完成测试调用或跳转到非当前步骤；AI 微调入口仅负责唤起右侧 AI 助手，由右侧会话引导用户确认本轮微调结束，再将评分和提交审核状态同步回左侧。提交审核仍保留在 Skill 创建主流程内，后续真实 Skill 调用、结果卡片和展开报告继续通过右侧 AI 助手完成。',
    status: '已合并正式'
  },
  {
    time: '2026-07-22 17:02',
    operator: 'Codex（协作代理）',
    title: '企业客户管理业务链路更新',
    scope: '企业客户管理 / 线索看板 / 线索池 / 打分模型',
    detail: '基于 _0708_analysis 交付内容，在 GitLab 最新 Vue 源码上合并企业客户管理运行层：线索看板增加查询与重置生效快照并移除旧产品组隐藏筛选；线索池完善触达名称与描述、PC/SD/SS/SI 四类 SQL 金额及超限确认、列表/导出/详情同步；转商机按产品组名称联动编码和型号并校验保存；打分模型补齐日期至今、留资链接、商品目标和搜索关键词规则。同步修复账号工作区弹层被企业页筛选区压住的图层问题，弹层改为挂载到页面根层，在线索看板、线索池和其他业务页均能正确遮罩页面内容。保留当前权限管理、Agent、Skill 和壳层功能，专项回归覆盖三项菜单完整链路。',
    status: '已合并正式'
  },
  {
    time: '2026-07-21 12:59',
    operator: 'zhangrui（部署账号）',
    title: '调整日志字段与追溯口径完善',
    scope: '调整日志 / 改动人 / 更新时间 / 状态 / 主要功能点',
    detail: '调整日志卡片补齐改动人、更新时间、状态和主要改动功能点四类信息，并保留完整功能说明。服务器直连可确认本次 admin-vue 文件由 zhangrui 账号部署，故按“部署账号”记录；历史记录无法仅凭当前文件属主准确还原实际改动人，统一显示“历史未记录”，避免错误归属。',
    status: '已合并正式'
  },
  {
    time: '2026-07-21 12:16',
    operator: 'zhangrui（部署账号）',
    title: '0716 Vue 样式与设计规范应用',
    scope: 'Skill 创建 / 右侧 Agent / 权限管理 / 顶部页签 / 设计基线',
    detail: '对照 lexiang-new-0716 交付包，仅同步与当前 new Vue 源码一一匹配的区域：能力上下文改为可搜索、按业务域筛选、只看已选和卡片式能力目录；右侧 Agent 更新附件预览、处理过程与 Todo 展开收起样式；权限管理收紧模块间距和表单密度；顶部静态页签恢复点击后回到对应业务页内容。随后应用 portal-workbench-ui-0716 设计规范 Skill，完成版本、内容指纹、全局样式栈和封板组件保护校验，并按规范复核顶部、侧栏、Agent、输入区、页签、权限管理及 1280px 响应式布局。保留现有自然语言时间解析、认证查询结论与展开报告、GMV 717 万元参考口径、Skill 草稿及审核闭环等 new 后续新增功能，不覆盖未匹配业务数据和运行脚本。',
    status: '已合并正式'
  },
  {
    time: '2026-07-15 16:53',
    title: '职场认证菜单、查询时间与 Skill 数据闭环统一',
    scope: '在职员工管理 / 认证审核管理 / Skill 测试 / 右侧 Agent / 展开报告',
    detail: '按最新认证完成数据更新在职员工管理首屏：在职员工 2,144 人、已认证 1,718 人、认证率 80.13%、已驳回 307 人、本月新增 169 人，并同步企业邮箱、劳动合同、个人所得税和其他材料四类认证方式分布。认证审核管理同步认证失败 307、认证成功 1,718、待审核 119、已失效 0，按业务截图更新失败列表首屏的申请编号、用户、认证方式、企业和认证时间，并支持按申请编号、企业、岗位、认证方式和来源筛选；修改状态详情沿用当前行的真实演示数据。职场认证 Skill 查询新增自然语言时间解析，支持上周、本周、近 N 天、近 N 周、上月、本月及明确起止日期；查询结论、数据明细和展开报告统一使用解析后的时间区间与同一组认证、转化、GMV、画像和商品数据。近两周参考区间继续采用 GMV 717 万元口径，其他时间范围根据区间生成对应数据，不再返回通用口径说明或只等待用户确认。',
    status: '已合并正式'
  },
  {
    time: '2026-07-14 09:24',
    title: '0713 Skill 应用结果与数据报告样式覆盖',
    scope: 'Skill 创建 / 应用结果卡 / 展开报告 / 数据可视化',
    detail: '对照 lexiang-new-0713 交付包，仅覆盖与当前 new 功能结构一致的样式：应用结果卡调整为图标与内容双栏，核心结果和“展开报告”收敛到卡片底部并支持容器响应式；完整报告统一 KPI 浅色渐变、白色细边框卡片、图表色板、图例、网格线、柱形渐变与入场动效。已应用 portal-workbench-ui-0713 设计规范校正，补齐中间数据模块轻量 hover 和关键数字等宽排版；保留现有 Skill 草稿闭环、需求澄清、Agent 自然语言调用、权限及业务页面功能，不覆盖交付包中的旧功能脚本与未匹配附件交互。',
    status: '已合并正式'
  },
  {
    time: '2026-07-13 17:39',
    title: '认证分析 Skill 自然语言调用闭环',
    scope: 'Skill Hub / 右侧 Agent / presentation-employee-cert / 展开报告',
    detail: '新增“近两周认证数据、人群画像、购买转化、GMV 和爆款商品”自然语言意图识别，手动输入后直接调用 presentation-employee-cert，展示任务解析、Skill 调用、口径计算和结果生成过程。Agent 回答与展开报告共用同一组认证、画像、转化、GMV 和 Top10 商品数据，去除模拟、测试、验证等边界说明；Skill Hub 中该 Skill 的“测试”动作同步复用该自然语言查询。同时收紧页面导航判定，复合分析请求中的“查看 GMV”不再触发菜单跳转，仅明确打开、进入、跳转或切换页面以及短查看指令才执行导航，保证结果回到当前 Agent 会话。',
    status: '已合并正式'
  },
  {
    time: '2026-07-13 12:41',
    title: 'Skill 草稿保存与返回编辑闭环',
    scope: 'Skill 创建 / 保存草稿 / Skill Hub / 需求澄清',
    detail: '打通 Skill 创建与 Skill Hub 的草稿状态：草稿生成、评估验证和提交审核阶段保存草稿时，将基础配置、能力上下文、澄清对话、澄清结论和调优状态统一写入 Skill Hub；列表支持草稿状态筛选与查看，草稿操作改为“返回编辑”，点击后恢复已保存内容并直接进入需求澄清阶段继续完善。后续提交审核复用同一条 Skill 记录，由草稿更新为待审批，避免产生重复数据。',
    status: '已合并正式'
  },
  {
    time: '2026-07-12 18:46',
    title: 'Skill 数据报告、分析闭环与默认报告收敛',
    scope: 'Skill 创建 / 应用验证 / 展开报告 / 数据可视化 / Agent 默认报告',
    detail: '持续完善 Skill Hub 和 Skill 创建验证共用的数据报告链路：移除来源页面、生成方式、主题标签、报告目录和长文段落框架，改为 KPI、口径校验、分析摘要、每日认证趋势、用户画像、认证转化、Top10 商品和整齐明细表构成的数据看板。在工作日/周末差异、购买转化、岗位集中度和时段覆盖率四类突出数据下新增“数据发现 → 分析判断 → 建议动作 → 复验指标”页面内闭环，建议动作继续遵守 Skill 只读边界，不标记为已执行。去除首张 KPI 黑色强调卡，所有 KPI、状态、图表、峰值与低点统一回归 new 站点的白底、品牌蓝、状态绿、辅助紫和提示橙规范。右侧 Agent 初始化时不再一次展示全部演示报告，默认仅保留质量分析和运营总览两张报告卡；用户后续查询、测试 Skill 或生成报告产生的结果仍按任务正常追加。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 20:26',
    title: 'AI 回复 Markdown 表格结构化呈现',
    scope: '右侧 Agent / 回答正文 / 表格渲染',
    detail: '补齐 AI 助手消息渲染器对标准 Markdown 表格的识别：表头、分隔行和数据行会转换为真正的 HTML 表格，不再原样展示竖线与横线；统一使用工作台表格边框、表头底色、数字对齐、隔行和悬停状态，窄屏内容可在表格容器内横向滚动，同时保留普通段落、列表、行内代码和代码块的原有呈现。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 19:40',
    title: 'AI 助手处理状态与回答布局修复',
    scope: '右侧 Agent / 处理状态 / 回答正文',
    detail: '修复带处理过程状态的 AI 回答被全局横向消息布局拆成左右两列的问题：此类消息改为状态区在上、回答正文在下的单列结构，状态摘要和正文均使用 Agent 内容区完整宽度，避免正文被挤到右侧、长内容裁切或与底部输入区错位；普通问答、用户气泡和输入区交互保持不变。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 17:41',
    title: 'Skill 应用验证结果与认证转化报告',
    scope: 'Skill 创建 / 评估验证 / 结果卡片 / 展开报告',
    detail: '在评估验证末尾新增 Skill 应用验证：用户输入自然语言提示词后，按原话解析明确日期、最近 N 天或周、上周、本周和本月等时间口径；缺少时间、起止倒置或超过 92 天时按 Skill 契约阻断。运行后先返回结构化结果卡，点击“展开报告”复用工作台动态页签，原生展示数据真实性、认证与购买 KPI、每日趋势、7 个认证时段、认证方式、行业 Top10、岗位 9 大类、Top10 商品和行动建议，并保留数据来源、LenovoID 去重和 B4 排除声明。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 17:05',
    title: 'Skill 需求澄清改为输入驱动',
    scope: 'Skill 创建 / 需求澄清 / 右侧澄清结论',
    detail: 'Skill MD 仅作为后台框架和模型上下文，不再在澄清对话中直接摊开展示完整内容；需求澄清改为等待用户自然语言输入后，按命名、归属、场景、触发、输入、输出、边界、依赖和验收用例九要素识别已确认与待补充项。每轮输入后，左侧只展示本轮仍需闭合的问题，右侧澄清结论同步更新当前轮次、已确认、待确认和下一步，避免把用户已给信息反复追问。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 16:20',
    title: '职场认证与转化 Skill 草稿预填',
    scope: 'Skill 创建 / 基础配置 / 需求澄清 / 草稿结构',
    detail: '根据 portal-workbench-skill-draft-presentation-employee-cert-20260709.md 拆解完整 Skill 内容：基础配置预填 presentation-employee-cert 与“职场认证与转化综合简报”，左侧能力上下文默认关联职场员工概览、职场员工审核和 GMV 分析；需求澄清阶段按九要素展示初始引导和右侧澄清结论，已确认命名、归属、场景、触发、输入、输出、边界、依赖、用例，仅保留 SMB 授权粒度、明文导出权限点、岗位归类维护方等待确认事项；草稿生成区同步切换为 SKILL.md、modules/data-query.md、modules/analysis.md、modules/briefing.md、tests/acceptance.md 的模块化结构。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 15:09',
    title: 'AI 会话模型供应商文案脱敏',
    scope: '需求澄清 / 右侧 Agent / 处理过程状态流',
    detail: '将需求澄清和右侧 AI 助手里面向用户展示的具体模型供应商名统一改为“大模型”，保留底层服务端会话调用能力不变；失败兜底、工具调用状态和 POC 日志中的供应商名同步脱敏，避免在产品界面暴露具体模型来源。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 14:18',
    title: 'Skill 需求澄清第三组改为验收用例',
    scope: 'Skill 创建 / 需求澄清 / 九要素用例收敛',
    detail: '按 Skill 撰写九要素修正需求澄清第三组：不再以“测试评估与审批要求”组织问题，也不再把直线经理、业务审批人或系统审批作为九要素缺口追问；第三组统一改为“验收用例”，只围绕正常用例、异常输入、边界场景和兜底期望补齐，平台默认 AI 评估标准仍由系统自动纳入。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 09:58',
    title: '0709 设计规范 skill 应用',
    scope: '设计基线 / Tooltip / 面板收起图标 / 封板壳层守卫',
    detail: '应用 portal-workbench-ui-0709 设计规范 skill：设计基线锁从 0708 更新为 0709 实际内容指纹，guard 搜索路径补齐 0709 skill 目录；左侧侧栏和右侧 AI 助手收起按钮按 0709 图标规范使用 24x24 面板轮廓，内部竖向分隔线改为窄圆角矩形而非短线，保留按钮尺寸、位置、壳层宽度、Agent 宽度和业务页行为不变；全局 tooltip 继续使用 body 层 fixed 定位和视口夹紧规则。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 09:24',
    title: '0709 Vue 样式包重合覆盖',
    scope: '工作台壳层 / 全局 Tooltip / 左侧与右侧收起按钮',
    detail: '对照 lexiang-new-0709.zip 与当前 new Vue 源码，仅合入明确重合且不回退新增功能的壳层样式：新增全局 data-tooltip 提示层，左侧侧栏收起按钮和右侧 AI 助手收起按钮切换为 0709 线性面板图标，并补齐收起态图标方向规则。跳过会回退 Skill 创建九要素澄清、Skill Hub 提交审核闭环、四行输入框滚动和当前右侧 Agent 状态流的旧版源码差异；0709 包中的多附件能力属于新增交互，不在本次样式覆盖范围内。',
    status: '已合并正式'
  },
  {
    time: '2026-07-10 10:20',
    title: 'Skill 需求澄清九要素识别防重复追问',
    scope: 'Skill 创建 / 需求澄清 / 自然语言九要素收敛',
    detail: '需求澄清智能体按 Skill 撰写九要素识别用户自然语言：命名、归属、场景、触发、输入、输出、边界、依赖、用例。用户已经提供的要素会进入右侧“已确认”，主反馈只展示未提供的缺口；模型返回后前端再做二次过滤，避免继续追问已确认的能力定义、上下文、输入输出、边界、依赖或用例。已选子菜单和基础配置也会参与归属、命名、输入输出等判断，减少机械重复确认。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 15:35',
    title: 'Skill 创建提交审核闭环接入 Skill Hub',
    scope: 'Skill 创建 / 提交审核 / Skill Hub 状态流',
    detail: '提交审核不再只停留在创建页状态提示：点击提交后会把当前 Skill 的英文名、中文名、所属菜单、描述、评分和已选上下文写入 Skill Hub，同名 Skill 重新提交会更新原记录为待审批，避免重复行。Skill Hub 改为读取统一状态仓库，管理员审批、驳回、发布、启用和禁用都会回写同一条记录；提交页增加“查看 Skill Hub”入口，形成提交、待审批、审批/驳回、发布/启停的完整 POC 闭环。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 15:15',
    title: '需求澄清默认评估维度收敛',
    scope: 'Skill 创建 / 需求澄清 / 测试评估反馈',
    detail: '将理解准确性、工具调用正确性、输出完整性、权限合规性等通用 AI 评估标准调整为平台默认能力，不再在澄清反馈中向用户确认；兜底问题和大模型返回内容都会过滤这类基础 AI 能力追问，只保留业务特有的典型问法、异常输入、边界场景和审批链路确认。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 14:45',
    title: '右侧 Agent 对话流 0708 交互优化',
    scope: '右侧 AI 助手 / 对话状态 / 授权卡 / TODO / 全场景演示',
    detail: '应用 0708_Agent 对话流样式交互优化：右侧 Agent 消息自己的过程状态改为气泡外上方展示，不再混入普通回答气泡；状态卡默认只展示进行中、待确认或最近状态，已完成能力历史默认收起并可展开审计；新增打字机输出模式，结构卡片在正文完成后柔和入场；TODO List 改为回答后的独立气泡；授权批准或拒绝后，结论回填到原授权请求卡片内，不再追加多余说明气泡；新增“全场景串联演示”口令，用于走查过程状态、授权请求、报告卡片和 TODO 完成态。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 14:05',
    title: '0708 设计规范 skill 应用',
    scope: '设计基线 / 封板样式守卫 / Vue 源码规范',
    detail: '应用 portal-workbench-ui-0708 设计规范 skill：设计基线锁从 0707 更新为 0708，guard 搜索范围补齐 0708 skill 目录，并按解压包实际内容指纹锁定校验；继续遵守 Vue 源码优先和封板组件保护规则，不引入运行时 design-skill 全局 CSS，不用静态模板覆盖 Vue 页面，也不回退 Skill 创建、需求澄清、右侧 Agent 和权限管理中已确认的新功能。',
    status: '已合并正式'
  },
  {
    time: '2026-07-09 13:35',
    title: '0708 Vue 样式包重合覆盖',
    scope: '右侧 Agent / 会话状态卡 / 样式包对比',
    detail: '对照 lexiang-new-0708.zip 与当前 new Vue 源码，仅覆盖明确重合且不影响新增功能的会话状态卡视觉动效：状态卡进入动画、hover 位移和背景/边框过渡。0708 包中的 Skill 创建页仍是旧版能力上下文与需求澄清结构，会回退当前已确认的菜单子项上下文、动态澄清、已确认项过滤和四行输入框滚动，因此未覆盖；右侧 Agent 消息列表包内包含新的结构性交互，未做整文件替换；stores、常量和文档差异不属于本次样式覆盖范围。',
    status: '已合并正式'
  },
  {
    time: '2026-07-08 14:45',
    title: 'Skill 创建能力上下文改为菜单子项',
    scope: 'Skill 创建 / 能力上下文 / 大模型澄清对话',
    detail: 'Skill 创建左侧能力上下文改为读取当前工作台菜单树，展示全部菜单下的全部子菜单；基础配置中的所属菜单只用于默认选中和快速加入，不再过滤上下文列表。推荐能力改为基于已选上下文展示相关子菜单，并把已选子菜单写入草稿 skill.yaml。需求澄清页不再预置用户气泡、处理过程、AI 首问和澄清结论，只保留上下文说明、输入区和快捷填入按钮；用户现场输入后再由服务端大模型返回反馈，页面只固定澄清反馈文档块样式，具体内容严格基于用户输入和已选子菜单上下文生成，不再使用固定 mock 示例。需求澄清智能体目标收敛为支持 Skill 创建，问题分组围绕能力定义、输入输出与调用边界、测试评估与审批要求展开；每次用户补充后都会结合历史输入更新本轮反馈和右侧澄清结论，已确认项只沉淀在右侧“已确认”中，主对话文档仅保留待确认缺口，不再把“已收到/已确认”的内容与待确认问题混排；新增“作为一个独立 Skill 创建/不拆分/做一个 Skill”等表达识别，避免继续反问已提供的能力定义；底部输入框改为最多四行展示，超过四行后支持框内滚动。',
    status: '已合并正式'
  },
  {
    time: '2026-07-08 09:30',
    title: '0707 Vue 样式规范覆盖',
    scope: '工作台壳层 / 右侧 Agent / Skill 创建 / 权限管理 / 首页入口',
    detail: '按 lexiang-new-0707.zip 覆盖当前 Vue 源码中匹配的样式与演示层：左侧品牌区改为 0707 规范，顶部操作区按包内 TopbarActions 执行；右侧 Agent 增加 TODO、授权确认和多步骤状态卡展示；Skill 创建、Skill Hub、权限管理、首页和在职员工入口统一调整为“联想门户工作台/职场员工审核”口径。随后应用 portal-workbench-ui-0707 设计规范 skill：guard 已对齐 0707 指纹，本期按规范隐藏主题切换入口，并在启动时强制浅色、清理历史深色偏好，避免旧本地状态泄露到当前封板版本。保留既有正式合并日志状态，只更新本次预览记录。',
    status: '已合并正式'
  },
  {
    time: '2026-07-07 08:33',
    title: '0706 Vue 样式匹配覆盖与规范校验',
    scope: '右侧 Agent / 工作台壳层收起态 / 设计规范守卫',
    detail: '对照 lexiang-new-0706/vue-app 和 portal-workbench-ui-0706 设计规范，仅覆盖与当前 new Vue 源码匹配的样式差异：补齐右侧 Agent 收起时宽度归零、隐藏边框阴影、禁用点击和展开恢复交互。同步移除未登记的 ui-0702-design-skill.css 运行时引入，接入 0706 design-baseline guard，用于提示封板壳层、Agent composer、静态/动态页签和共享组件被误覆盖的风险。未回退已确认的夜间模式底层能力。',
    status: '已合并正式'
  },
  {
    time: '2026-07-06 08:52',
    title: '0703 Vue UI 样式覆盖',
    scope: 'Skill 创建 / 权限管理 / 小屏布局 / 工作台壳层样式',
    detail: '对照 lexiang-new-0703.zip，仅合并与当前 Vue 源码重合的样式结构；并按 portal-workbench-ui-0703 设计规范收敛 Skill 创建与权限管理：内容区独立滚动、底部操作行固定、步骤页签密度统一、图标改为线性 SVG、小屏按壳层压缩顺序处理。保留线上新增的大模型调用、运营总览口径兜底、夜间模式和账号入口卡片修复，不做功能回退。',
    status: '已合并正式'
  },
  {
    time: '2026-07-03 17:54',
    title: '账号入口弹层卡片样式修复',
    scope: '账号入口 / 创建 Skill / 工作区入口弹层',
    detail: '修正账号入口弹层中“创建 Skill”卡片被全局 primary 规则误染成整块蓝底的问题；卡片恢复为白色信息面板，仅保留左上角加号图标使用主色。',
    status: '已合并正式'
  },
  {
    time: '2026-07-03 15:48',
    title: '运营总览 AI 解读口径纠偏',
    scope: '运营总览 / AI 解读 / 右侧 Agent 演示结果',
    detail: '运营总览的 AI 解读改为走真实大模型会话接口，并把页面已展示的 DAU、WAU、MAU、GMV、关键经营链路、GMV 结构和趋势速览作为上下文传入；接口失败时不再生成本地 mock 分析内容，同时展示层过滤旧报告里的风控、策略命中等无关口径。',
    status: '已合并正式'
  },
  {
    time: '2026-07-03 11:45',
    title: '权限管理 Vue 源码链路补全',
    scope: '权限管理 / 权限申请 / 审批列表 / 角色与用户管理',
    detail: '把权限管理从占位入口补成 Vue 源码内的可操作 POC：包含权限申请五步链路、审批列表、角色管理、用户管理、组织管理、数据源管理、功能管理和删除备份，并保留 0702 设计规范覆盖。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 17:33',
    title: 'Skill 创建评估及格线调整',
    scope: 'Skill 创建 / 评估验证 / 提交审核门槛',
    detail: '评估验证综合评分及格线从 0.80 调整为 0.60；当前综合评分 0.782 直接显示评估通过并允许进入提交审核，AI 微调保留为可选优化动作。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 17:26',
    title: 'Skill 创建草稿生成布局调整',
    scope: 'Skill 创建 / 基础配置 / 需求澄清 / 草稿生成',
    detail: '基础配置、需求澄清阶段移除保存草稿按钮；草稿生成阶段改为深色左右分栏，左侧按 IDE 文件树展示目录、缩进层级、文件类型图标和选中态，右侧展示生成草稿内容。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 17:07',
    title: 'Skill Hub 列表与角色操作调整',
    scope: 'Skill Hub / 列表字段 / 操作列 / 管理员与 PM 角色',
    detail: 'Skill Hub 列表新增中文名列并移除标签列和标签筛选；操作列中“测试”改为“评估”，“应用”改为“测试”；管理员驳回后状态显示已驳回且不再展示发布、审批；PM 侧可看到编辑，被驳回的 Skill 可点击返回创建流程修改。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 14:22',
    title: '0624 UI Skill 规范归一',
    scope: '右侧 Agent / 底部输入区 / 快捷 chips / 样式覆盖层',
    detail: '按 portal-workbench-ui-0624 样式规范收敛右侧 Agent 底部输入区：chips 始终保持横向 pill 与左右箭头，不退化为下拉框；输入框默认 36px、最多 3 行内滚动；发送按钮统一为 32px 单图标控件。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 14:11',
    title: '右侧 Agent 快捷 chips 查询触发',
    scope: '右侧 Agent / 底部快捷 chips',
    detail: '底部 chips 从范围选择改为快捷查询按钮，默认不再显示选中态；点击 chip 后直接把对应自然语言问题发送给右侧 Agent 执行查询。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 13:20',
    title: '账号入口与 POC 调整日志',
    scope: '账号入口弹层 / 调整日志 / Vue 入口跳转',
    detail: '账号入口弹层改为 2x2 功能入口，新增调整日志查看；日志按功能点归纳展示，时间按北京时间取值；当前入口统一由 0702 Vue 项目承载。',
    status: '已合并正式'
  },
  {
    time: '2026-06-22 13:40',
    title: 'Skill Hub 应用入口调整',
    scope: 'Skill Hub 操作列',
    detail: '应用固定为蓝色测试入口，放在操作项最后，点击后在右侧 Agent 展示 output 结果。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 18:30',
    title: '业务侧技能包管理与顶部入口整理',
    scope: '技能包管理 / 顶部栏',
    detail: '技能包管理固定为启停管理面，不再展示申请、使用、查看进度等旧流程；筛选归并为全部、已开启、已关闭；顶部中间搜索入口移除，同时保留夜间模式按钮。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 17:40',
    title: 'Skill 创建命名与 AI 微调闭环',
    scope: 'Skill 创建 / 评估验证 / 右侧 Agent',
    detail: '基础配置中区分 Skill 名称（英文）和必填中文命名；评估验证出现低分项时提供 AI 微调，唤起右侧 Agent 更新草稿和评分，示例评分刷新到综合评分 0.859 后进入后续审核。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 14:42',
    title: '企业客户管理打分模型样式修复',
    scope: '企业客户管理 / 打分模型',
    detail: '根据 0617 wangxt8 样式包替换 workbench-lead.js，修复打分模型页面样式不生效的问题；后续遇到同类问题先检查模块版本，不再只叠加 CSS 覆盖。',
    status: '已合并正式'
  }
]

// 侧栏 DOM 引用（用于响应式折叠和 peek 事件）
const sidebarEl = ref(null)

// ---- peek 模式相关（对应原 _sidebarPeek / _sidebarPeekTimer）----
let _peek      = false
let _peekTimer = null
let _boundLeave = null
let _boundEnter = null

// ---- 判断分组是否有激活的子页 ----
function isGroupActive(groupKey) {
  const group = MENU_TREE[groupKey]
  return !!(group?.children && group.children[currentPageId.value])
}

// ---- 路由变化时自动展开当前分组 ----
watch(currentPageId, (pageId) => {
  for (const [key, group] of Object.entries(MENU_TREE)) {
    if (group.children?.[pageId]) {
      openGroups.value = new Set([...openGroups.value, key])
      break
    }
  }
}, { immediate: true })

// ===== toggleGroup —— 完整还原原版逻辑（含 peek 模式）=====
function toggleGroup(key) {
  const el = sidebarEl.value
  if (!el) return

  // 收起状态下：临时展开侧栏（peek 模式）
  if (sidebarCollapsed.value) {
    _peek = true
    isPeeking.value = true
    openOnlyGroup(key)

    // 清除旧监听
    if (_boundLeave) el.removeEventListener('mouseleave', _boundLeave)
    if (_boundEnter) el.removeEventListener('mouseenter', _boundEnter)

    // 鼠标离开后 1.5s 自动收回
    _boundLeave = () => {
      clearTimeout(_peekTimer)
      _peekTimer = setTimeout(() => {
        if (_peek) {
          closePeek()
        }
      }, 1500)
    }
    _boundEnter = () => { clearTimeout(_peekTimer) }

    el.addEventListener('mouseleave', _boundLeave)
    el.addEventListener('mouseenter', _boundEnter)
    return
  }

  // 正常状态：展开/收起分组（同时关闭其他分组）
  const willOpen = !openGroups.value.has(key)
  openGroups.value = willOpen ? new Set([key]) : new Set()
}

// ===== 页面导航 =====
function navigateTo(path, pageId) {
  closeUserMenu()
  closePeek()
  // 记录静态页签
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  router.push(path)
}

function goPortalHome() {
  navigateTo('/portal/home', 'portal.home')
}

// ===== 用户菜单 =====
function toggleUserMenu(e) {
  e?.stopPropagation()
  userMenuVisible.value = !userMenuVisible.value
  if (userMenuVisible.value && sidebarCollapsed.value) {
    _peek = true
    isPeeking.value = true
  }
}
function closeUserMenu() {
  userMenuVisible.value = false
}

// ===== 账号入口按钮（对应原 openSkillCreatePage / openSkillManagerFromUserMenu 等）=====
function openSkillCreatePage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.skillCreate')
  appStore.setActiveStaticTab('agent.skillCreate')
  router.push('/agent/skill-create')
}
function openSkillManagerPage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.skills')
  appStore.setActiveStaticTab('agent.skills')
  router.push('/agent/skills')
}
function openPermissionManagerPage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.permissions')
  appStore.setActiveStaticTab('agent.permissions')
  router.push('/agent/permissions')
}
function openPocAdjustmentLog() {
  closeUserMenu()
  pocLogVisible.value = true
}
function closePocAdjustmentLog() {
  pocLogVisible.value = false
}

// ===== 退出 =====
async function doLogout() {
  await appStore.logout()
  router.replace('/login')
}

// ===== 关闭 peek =====
function closePeek() {
  _peek = false
  isPeeking.value = false
  clearTimeout(_peekTimer)
}

function openOnlyGroup(key) {
  openGroups.value = new Set([key])
}

function toggleSidebarManual() {
  if (sidebarCollapsed.value && isPeeking.value) {
    closePeek()
    appStore.setSidebarCollapsed(false, { persist: true })
    return
  }
  closePeek()
  appStore.toggleSidebar()
}

// ===== 响应式折叠（对应原 window resize 监听）=====
const AUTO_COLLAPSE_WIDTH = 1320
const AUTO_EXPAND_WIDTH   = 1480
let _lastWidth = window.innerWidth
let _resizeTimer = null

function isSidebarManuallyCollapsed() {
  return localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === '1'
    || localStorage.getItem(STORAGE_KEYS.legacySidebarCollapsed) === '1'
}

function applyResponsiveSidebar(width, growing = false, shrink = false) {
  if ((shrink || !growing) && !sidebarCollapsed.value && width <= AUTO_COLLAPSE_WIDTH) {
    appStore.setSidebarCollapsed(true, { persist: false })
  } else if ((growing || !shrink) && sidebarCollapsed.value && width >= AUTO_EXPAND_WIDTH) {
    // 只在非手动折叠时自动展开
    if (!isSidebarManuallyCollapsed()) {
      appStore.setSidebarCollapsed(false, { persist: false })
    }
  }
}

function _onResize() {
  clearTimeout(_resizeTimer)
  _resizeTimer = setTimeout(() => {
    const w       = window.innerWidth
    const growing = w > _lastWidth
    const shrink  = w < _lastWidth
    _lastWidth = w

    applyResponsiveSidebar(w, growing, shrink)
  }, 80)
}

function _onDocumentClick(e) {
  const el = sidebarEl.value
  if (!el || el.contains(e.target)) return
  closeUserMenu()
  closePeek()
}

function _onDocumentKeydown(e) {
  if (e.key !== 'Escape') return
  closePocAdjustmentLog()
  closeUserMenu()
  closePeek()
}

onMounted(() => {
  applyResponsiveSidebar(window.innerWidth)
  window.addEventListener('resize', _onResize)
  document.addEventListener('click', _onDocumentClick)
  document.addEventListener('keydown', _onDocumentKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', _onResize)
  document.removeEventListener('click', _onDocumentClick)
  document.removeEventListener('keydown', _onDocumentKeydown)
  clearTimeout(_resizeTimer)
  clearTimeout(_peekTimer)
})
</script>
