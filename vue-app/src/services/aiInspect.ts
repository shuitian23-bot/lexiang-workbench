/**
 * AI 巡检模块 —— 演示用 mock 数据与服务。
 * 所有数据均为前端静态示例，便于在 POC 环境中完整演示 5 个页面。
 */

export type InspectLevel = '严重' | '警告' | '提示'
export type WorkOrderStatus = '待处理' | '处理中' | '已解决'
export type RuleStatus = 'enabled' | 'disabled'
export type Dimension =
  | '链接有效性'
  | '售罄下架'
  | '活动时效'
  | '图片加载'
  | '图文一致性'
  | '互动奖品特效'
export type NotifyChannel = '站内信' | '邮件' | '短信' | '企业微信'
export type LogLevel = 'info' | 'warn' | 'error'

export const DIMENSIONS: Dimension[] = [
  '链接有效性',
  '售罄下架',
  '活动时效',
  '图片加载',
  '图文一致性',
  '互动奖品特效'
]

export interface KpiCard {
  key: string
  label: string
  value: string
  /** 环比文案，如 "较昨日 +1.2%" */
  compare: string
  /** 着色方向：正向指标上升绿、反向指标上升红、无环比灰 */
  tone: 'up' | 'down' | 'flat' | 'none'
  /** 是否可点击跳转到问题处理页 */
  clickable: boolean
  /** 点击后的跳转 query（问题处理页读取） */
  query?: Record<string, string>
  /** 帮助浮窗说明 */
  help: string
}

export interface TrendPoint {
  date: string
  rate: number
}

export interface ShareSlice {
  name: string
  value: number
  hasSevere: boolean
}

export interface PageRankRow {
  page: string
  count: number
}

export interface DimensionAnomaly {
  name: Dimension
  severe: number
  warn: number
}

export interface PendingOrder {
  status: WorkOrderStatus
  id: string
  page: string
  location: string
  level: InspectLevel
  issue: string
  durationMin: number
}

export interface NotificationFeedItem {
  level: InspectLevel
  page: string
  location: string
  receiver: string
  channel: NotifyChannel
}

export interface CmsPage {
  id: string
  name: string
  url: string
  modules: string[]
}

export interface RuleModule {
  name: string
  dimensions: Dimension[]
}

export interface RuleRecord {
  id: string
  pageName: string
  moduleCount: number
  dimensions: Dimension[]
  frequency: string
  status: RuleStatus
  lastRun: string
}

export interface WorkOrderModuleProblem {
  dimension: Dimension
  level: InspectLevel
  status: '正常' | '异常' | '警告'
  message: string
}

export interface WorkOrderModule {
  name: string
  problems: WorkOrderModuleProblem[]
  suggestion: string
}

export interface WorkOrder {
  id: string
  page: string
  location: string
  level: InspectLevel
  issueSummary: string
  issueCount: number
  owner: string | null
  status: WorkOrderStatus
  durationMin: number
  lastRecheck: { time: string; result: '通过' | '未通过' | '异常' } | null
  url: string
  category: string
  method: string
  createdAt: string
  modules: WorkOrderModule[]
}

export interface NotificationRecord {
  time: string
  taskId: string
  page: string
  location: string
  level: InspectLevel
  receivers: string[]
  channel: NotifyChannel
  status: string
}

export interface LogRecord {
  time: string
  level: LogLevel
  message: string
}

// ===== 数据总览（Dashboard）=====

export const dashboardKpis: KpiCard[] = [
  {
    key: 'health',
    label: '巡检健康率',
    value: '92.4%',
    compare: '较昨日 +1.2%',
    tone: 'up',
    clickable: false,
    help: '计算口径：(通过 + 部分通过) ÷ 总任务数 × 100%，取每个任务最近一次巡检结果。'
  },
  {
    key: 'p1',
    label: '严重异常（P1）',
    value: '7',
    compare: '较昨日 +2',
    tone: 'down',
    clickable: true,
    query: { level: '严重' },
    help: '最近一次巡检中等级为「严重」的任务数。上升为风险升高，标红提示。'
  },
  {
    key: 'pending',
    label: '待处理问题',
    value: '23',
    compare: '较昨日 +5',
    tone: 'down',
    clickable: true,
    query: { status: '待处理' },
    help: '工单状态为「待处理」+「处理中」的总数。上升代表积压增加，标红提示。'
  },
  {
    key: 'fixRate',
    label: '整改完成率',
    value: '78.6%',
    compare: '无环比',
    tone: 'none',
    clickable: true,
    query: { status: '已解决' },
    help: '已解决 ÷ (待处理 + 处理中 + 已解决) × 100%。'
  },
  {
    key: 'todayRuns',
    label: '今日巡检次数',
    value: '312',
    compare: '较昨日 +18',
    tone: 'up',
    clickable: true,
    query: { jump: 'logs' },
    help: '今日巡检结果记录数。管理员可点击跳转运行日志；运营角色不可点击。'
  }
]

export const healthTrend7d: TrendPoint[] = [
  { date: '08-20', rate: 88.1 },
  { date: '08-21', rate: 90.3 },
  { date: '08-22', rate: 89.7 },
  { date: '08-23', rate: 91.2 },
  { date: '08-24', rate: 93.0 },
  { date: '08-25', rate: 91.8 },
  { date: '08-26', rate: 92.4 }
]

export const problemTypeShare: ShareSlice[] = [
  { name: '链接有效性', value: 38, hasSevere: true },
  { name: '售罄下架', value: 27, hasSevere: true },
  { name: '活动时效', value: 19, hasSevere: false },
  { name: '图片加载', value: 14, hasSevere: true },
  { name: '图文一致性', value: 11, hasSevere: false },
  { name: '互动奖品特效', value: 8, hasSevere: false }
]

export const pageRanking: PageRankRow[] = [
  { page: '拯救者官网商城首页', count: 12 },
  { page: 'ThinkPad 商品详情页', count: 9 },
  { page: '联想商城活动会场', count: 8 },
  { page: 'YOGA 专区页', count: 6 },
  { page: '服务与保修页', count: 5 },
  { page: '门店预约页', count: 4 },
  { page: '以旧换新活动页', count: 3 },
  { page: '会员中心页', count: 2 }
]

export const dimensionAnomalyAll: DimensionAnomaly[] = [
  { name: '链接有效性', severe: 9, warn: 29 },
  { name: '售罄下架', severe: 7, warn: 20 },
  { name: '活动时效', severe: 3, warn: 16 },
  { name: '图片加载', severe: 5, warn: 9 },
  { name: '图文一致性', severe: 2, warn: 9 },
  { name: '互动奖品特效', severe: 1, warn: 7 }
]

export const dimensionAnomaly7d: DimensionAnomaly[] = [
  { name: '链接有效性', severe: 4, warn: 14 },
  { name: '售罄下架', severe: 3, warn: 11 },
  { name: '活动时效', severe: 1, warn: 8 },
  { name: '图片加载', severe: 2, warn: 5 },
  { name: '图文一致性', severe: 1, warn: 4 },
  { name: '互动奖品特效', severe: 0, warn: 3 }
]

export const pendingWorkOrders: PendingOrder[] = [
  { status: '待处理', id: '#1024', page: '拯救者官网商城首页', location: '轮播图模块', level: '严重', issue: '活动利益点链接 404', durationMin: 312 },
  { status: '待处理', id: '#1023', page: 'ThinkPad 商品详情页', location: '价格模块', level: '严重', issue: '商品已售罄仍展示「立即购买」', durationMin: 188 },
  { status: '处理中', id: '#1021', page: '联想商城活动会场', location: '倒计时模块', level: '警告', issue: '活动结束时间已过未下线', durationMin: 96 },
  { status: '待处理', id: '#1019', page: 'YOGA 专区页', location: '主图模块', level: '警告', issue: '主图加载失败（CDN 503）', durationMin: 54 },
  { status: '处理中', id: '#1015', page: '服务与保修页', location: '权益说明', level: '提示', issue: '图文描述与实物不一致', durationMin: 41 }
]

export const notificationsFeed: NotificationFeedItem[] = [
  { level: '严重', page: '拯救者官网商城首页', location: '轮播图模块', receiver: '张伟', channel: '短信' },
  { level: '严重', page: 'ThinkPad 商品详情页', location: '价格模块', receiver: '李娜', channel: '邮件' },
  { level: '警告', page: '联想商城活动会场', location: '倒计时模块', receiver: '王芳', channel: '企业微信' },
  { level: '提示', page: 'YOGA 专区页', location: '主图模块', receiver: '陈静', channel: '站内信' },
  { level: '严重', page: '会员中心页', location: '权益卡', receiver: '张伟', channel: '短信' },
  { level: '警告', page: '门店预约页', location: '表单模块', receiver: '刘洋', channel: '邮件' }
]

// ===== 巡检规则（Rules）=====

export const cmsPages: CmsPage[] = [
  { id: 'p-home', name: '拯救者官网商城首页', url: 'https://mall.lenovo.com.cn/legion', modules: ['轮播图模块', '楼层推荐模块', '权益入口模块'] },
  { id: 'p-thinkpad', name: 'ThinkPad 商品详情页', url: 'https://mall.lenovo.com.cn/thinkpad/x9', modules: ['价格模块', '参数模块', '购买按钮模块'] },
  { id: 'p-activity', name: '联想商城活动会场', url: 'https://mall.lenovo.com.cn/act/0825', modules: ['倒计时模块', '优惠券模块', '利益点模块'] },
  { id: 'p-yoga', name: 'YOGA 专区页', url: 'https://mall.lenovo.com.cn/yoga', modules: ['主图模块', '卖点模块'] },
  { id: 'p-service', name: '服务与保修页', url: 'https://www.lenovo.com.cn/service', modules: ['权益说明模块', '申请入口模块'] }
]

export const rules: RuleRecord[] = [
  {
    id: '#R001',
    pageName: '拯救者官网商城首页',
    moduleCount: 3,
    dimensions: ['链接有效性', '售罄下架', '活动时效'],
    frequency: '每天 09:00',
    status: 'enabled',
    lastRun: '2026-08-26 09:00'
  },
  {
    id: '#R002',
    pageName: 'ThinkPad 商品详情页',
    moduleCount: 2,
    dimensions: ['售罄下架', '图片加载', '图文一致性'],
    frequency: '每小时',
    status: 'enabled',
    lastRun: '2026-08-26 14:00'
  },
  {
    id: '#R003',
    pageName: '联想商城活动会场',
    moduleCount: 1,
    dimensions: ['活动时效', '互动奖品特效'],
    frequency: '每周 一 10:00',
    status: 'enabled',
    lastRun: '2026-08-25 10:00'
  },
  {
    id: '#R004',
    pageName: 'YOGA 专区页',
    moduleCount: 2,
    dimensions: ['图片加载', '图文一致性'],
    frequency: '手动执行',
    status: 'disabled',
    lastRun: '2026-08-20 16:30'
  }
]

// ===== 问题处理（Work Orders）=====

export const aiSummary = {
  overview: '共巡检 18 个页面，覆盖 47 个检测点位，发现异常问题 68 个。',
  distribution:
    '等级分布：P1 高危 9 个（需 1 小时内处理）、P2 中危 32 个（建议当日完成整改）、P3 低危 27 个（3 日内处理）。',
  suggestion:
    '整改优先级建议：① 优先处理拯救者首页轮播图 404 利益点链接；② ThinkPad 详情页售罄商品仍开放购买入口；③ 活动会场倒计时超期未下线；④ YOGA 专区主图 CDN 加载失败；⑤ 服务页权益图文与实物不一致。'
}

function buildModules(page: string, level: InspectLevel): WorkOrderModule[] {
  if (page.includes('首页') || page.includes('会场')) {
    return [
      {
        name: 'M1 轮播图模块',
        problems: [
          { dimension: '链接有效性', level: '严重', status: '异常', message: '轮播第 2 帧利益点链接返回 404' },
          { dimension: '图文一致性', level: '警告', status: '警告', message: '文案「限时5折」与实际活动不符' }
        ],
        suggestion: '替换失效活动链接并核对利益点文案，确保跳转地址可用且描述一致。'
      },
      {
        name: 'M2 楼层推荐模块',
        problems: [{ dimension: '图片加载', level: '警告', status: '警告', message: '推荐位图片偶发加载超时' }],
        suggestion: '升级 CDN 节点或增加图片懒加载与重试策略。'
      }
    ]
  }
  return [
    {
      name: 'M1 主模块',
      problems: [
        { dimension: '售罄下架', level, status: '异常', message: '商品已售罄但购买按钮仍可点击' },
        { dimension: '图文一致性', level: '提示', status: '警告', message: '库存文案与后台不一致' }
      ],
      suggestion: '接入实时库存接口，售罄时自动置灰购买入口并同步文案。'
    }
  ]
}

export const workOrders: WorkOrder[] = [
  {
    id: '#1024',
    page: '拯救者官网商城首页',
    location: '轮播图模块',
    level: '严重',
    issueSummary: '活动利益点链接 404',
    issueCount: 2,
    owner: '张伟',
    status: '待处理',
    durationMin: 312,
    lastRecheck: null,
    url: 'https://mall.lenovo.com.cn/legion',
    category: '链接有效性',
    method: '自动巡检',
    createdAt: '2026-08-26 09:12',
    modules: buildModules('拯救者官网商城首页', '严重')
  },
  {
    id: '#1023',
    page: 'ThinkPad 商品详情页',
    location: '价格模块',
    level: '严重',
    issueSummary: '商品已售罄仍展示「立即购买」',
    issueCount: 2,
    owner: null,
    status: '待处理',
    durationMin: 188,
    lastRecheck: null,
    url: 'https://mall.lenovo.com.cn/thinkpad/x9',
    category: '售罄下架',
    method: '自动巡检',
    createdAt: '2026-08-26 10:05',
    modules: buildModules('ThinkPad 商品详情页', '严重')
  },
  {
    id: '#1021',
    page: '联想商城活动会场',
    location: '倒计时模块',
    level: '警告',
    issueSummary: '活动结束时间已过未下线',
    issueCount: 1,
    owner: '王芳',
    status: '处理中',
    durationMin: 96,
    lastRecheck: { time: '2026-08-26 13:20', result: '未通过' },
    url: 'https://mall.lenovo.com.cn/act/0825',
    category: '活动时效',
    method: '定时巡检',
    createdAt: '2026-08-26 11:40',
    modules: buildModules('联想商城活动会场', '警告')
  },
  {
    id: '#1019',
    page: 'YOGA 专区页',
    location: '主图模块',
    level: '警告',
    issueSummary: '主图加载失败（CDN 503）',
    issueCount: 1,
    owner: null,
    status: '待处理',
    durationMin: 54,
    lastRecheck: null,
    url: 'https://mall.lenovo.com.cn/yoga',
    category: '图片加载',
    method: '每小时巡检',
    createdAt: '2026-08-26 14:02',
    modules: buildModules('YOGA 专区页', '警告')
  },
  {
    id: '#1015',
    page: '服务与保修页',
    location: '权益说明',
    level: '提示',
    issueSummary: '图文描述与实物不一致',
    issueCount: 1,
    owner: '陈静',
    status: '已解决',
    durationMin: 240,
    lastRecheck: { time: '2026-08-26 12:00', result: '通过' },
    url: 'https://www.lenovo.com.cn/service',
    category: '图文一致性',
    method: '定时巡检',
    createdAt: '2026-08-26 08:30',
    modules: buildModules('服务与保修页', '提示')
  }
]

// ===== 通知记录（Notifications）=====

export const notificationRecords: NotificationRecord[] = [
  { time: '2026-08-26 14:03', taskId: '#T208', page: '拯救者官网商城首页', location: '轮播图模块', level: '严重', receivers: ['张伟'], channel: '短信', status: '已发送' },
  { time: '2026-08-26 13:50', taskId: '#T207', page: 'ThinkPad 商品详情页', location: '价格模块', level: '严重', receivers: ['李娜', '王芳'], channel: '邮件', status: '已发送' },
  { time: '2026-08-26 13:20', taskId: '#T206', page: '联想商城活动会场', location: '倒计时模块', level: '警告', receivers: ['王芳'], channel: '企业微信', status: '已发送' },
  { time: '2026-08-26 12:10', taskId: '#T205', page: 'YOGA 专区页', location: '主图模块', level: '警告', receivers: ['陈静'], channel: '站内信', status: '已发送' },
  { time: '2026-08-26 11:02', taskId: '#T204', page: '会员中心页', location: '权益卡', level: '严重', receivers: ['张伟', '刘洋'], channel: '短信', status: '已发送' },
  { time: '2026-08-26 10:30', taskId: '#T203', page: '门店预约页', location: '表单模块', level: '警告', receivers: ['刘洋'], channel: '邮件', status: '已发送' },
  { time: '2026-08-26 09:40', taskId: '#T202', page: '服务与保修页', location: '权益说明', level: '提示', receivers: ['陈静'], channel: '站内信', status: '已发送' },
  { time: '2026-08-26 09:00', taskId: '#T201', page: '拯救者官网商城首页', location: '楼层推荐模块', level: '提示', receivers: ['陈静'], channel: '站内信', status: '已发送' }
]

// ===== 运行日志（Logs）=====

export const logRecords: LogRecord[] = [
  { time: '2026-08-26 14:00', level: 'info', message: 'AI 巡检平台启动完成，已加载调度任务 4 个 + SLA 超时扫描' },
  { time: '2026-08-26 14:00', level: 'info', message: '任务#R002 ThinkPad 商品详情页 巡检完成: 异常/严重 (耗时 412ms)' },
  { time: '2026-08-26 13:50', level: 'warn', message: '工单#1023 已生成：ThinkPad 商品详情页（严重）SLA截止 2026-08-26 14:50 → 待处理' },
  { time: '2026-08-26 13:40', level: 'info', message: '通知已发出（严重/短信）→ 李娜：ThinkPad 商品详情页' },
  { time: '2026-08-26 13:20', level: 'info', message: '工单#1021 状态更新为：处理中，负责人：王芳' },
  { time: '2026-08-26 13:20', level: 'warn', message: '工单#1021 复检完成：巡检结果 未通过 → 工单 处理中' },
  { time: '2026-08-26 12:00', level: 'info', message: '工单#1015 复检完成：巡检结果 通过 → 工单 已解决' },
  { time: '2026-08-26 11:40', level: 'warn', message: '工单#1021 已生成：联想商城活动会场（警告）SLA截止 2026-08-26 19:40 → 待处理' },
  { time: '2026-08-26 10:05', level: 'error', message: '任务#R004 调度注册失败: 页面 YOGA 专区页 已停用，跳过注册' },
  { time: '2026-08-26 09:12', level: 'warn', message: '工单#1024 SLA 超时升级：严重 → 严重（已超 4 小时）' },
  { time: '2026-08-26 09:00', level: 'info', message: '任务#R001 拯救者官网商城首页 巡检完成: 异常/严重 (耗时 389ms)' }
]

// ===== 工具函数 =====

export function levelColorTone(level: InspectLevel): 'red' | 'orange' | 'blue' {
  if (level === '严重') return 'red'
  if (level === '警告') return 'orange'
  return 'blue'
}

export function statusColorTone(status: WorkOrderStatus): 'red' | 'orange' | 'green' {
  if (status === '待处理') return 'red'
  if (status === '处理中') return 'orange'
  return 'green'
}

export function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `已存在 ${h}时${m > 0 ? ` ${m}分` : ''}`
  }
  return `已存在 ${min}分`
}

export function durationTone(min: number): 'gray' | 'orange' {
  return min >= 240 ? 'orange' : 'gray'
}
