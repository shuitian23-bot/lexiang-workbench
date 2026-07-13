import type { SkillApplicationBreakdown, SkillApplicationReportData } from '@/stores/app'

interface ReferenceReportOptions {
  skillName?: string
  skillCnName?: string
  prompt?: string
  generatedAt?: string
}

const UNIQUE_USERS = 861
const PURCHASED_USERS = 482
const TOTAL_GMV = 4_247_310

export function createEmployeeCertificationReport(
  options: ReferenceReportOptions = {}
): SkillApplicationReportData {
  const methods = createBreakdown([
    ['其他材料', 629],
    ['企业邮箱', 159],
    ['劳动合同', 73]
  ], UNIQUE_USERS)
  const industries = createBreakdown([
    ['房地产业', 101],
    ['软件和信息技术服务业', 88],
    ['计算机通信电子设备制造业', 67],
    ['批发业', 58],
    ['零售业', 51],
    ['科技推广和应用服务业', 41],
    ['专业技术服务业', 35],
    ['娱乐业', 34],
    ['教育', 32],
    ['医药制造业', 27]
  ], UNIQUE_USERS)
  const roles = createBreakdown([
    ['管理层', 335],
    ['其他', 183],
    ['工程师', 136],
    ['设计师', 50],
    ['销售', 45],
    ['运营/产品', 42],
    ['行政/职能', 37],
    ['教师', 25],
    ['医疗', 8]
  ], UNIQUE_USERS)
  const products = createBreakdown([
    ['ThinkBook 14+ Ultra 5 06CD', 133],
    ['ThinkPad X1 Carbon', 92],
    ['小新 Pro 14', 76],
    ['ThinkBook 16+', 61],
    ['拯救者 Y7000P', 54],
    ['ThinkPad T14', 46],
    ['小新 Air 14', 39],
    ['联想异能者台式机', 33],
    ['ThinkVision 显示器', 29],
    ['联想办公配件套装', 24]
  ], PURCHASED_USERS)

  return {
    skillName: options.skillName || 'presentation-employee-cert',
    skillCnName: options.skillCnName || '职场员工审核数据分析',
    prompt: options.prompt || '查询 5/27 至 6/8 的认证与购买转化数据',
    parsedTimeText: '2026-05-27 至 2026-06-08 认证与购买转化数据',
    dateStart: '2026-05-27',
    dateEnd: '2026-06-08',
    dayCount: 13,
    generatedAt: options.generatedAt || beijingTime(),
    truth: {
      rawRecords: 888,
      duplicateRecords: 71,
      duplicateUsers: 59,
      uniqueUsers: UNIQUE_USERS
    },
    metrics: [
      { label: '已认证独立用户', value: '861', note: '13 天累计', tone: 'blue' },
      { label: '已购用户', value: '482', note: '536 笔支付订单', tone: 'green' },
      { label: '认证购买转化率', value: '56.0%', note: '已购用户 ÷ 已认证独立用户', tone: 'green' },
      { label: '总 GMV', value: '¥4,247,310', note: 'SMB 渠道支付成功订单', tone: 'blue' },
      { label: '平均客单价', value: '¥7,925', note: '总 GMV ÷ 订单笔数', tone: 'neutral' },
      { label: '认证未购池', value: '379', note: '可用于后续召回圈选', tone: 'orange' }
    ],
    insights: [
      { title: '认证转化规模', evidence: ['861 名独立认证用户', '482 人完成购买，转化率 56.0%'] },
      { title: '认证高峰', evidence: ['5/30 新增 134 人', '6/5 新增 108 人'] },
      { title: '认证人群结构', evidence: ['其他材料认证占 73.1%', '管理层与工程师是主力岗位'] },
      { title: '商品偏好', evidence: ['ThinkBook 14+ 购买人数居首', 'Top10 商品共覆盖多个办公与性能场景'] }
    ],
    dailyTrend: [46, 72, 44, 134, 96, 67, 27, 35, 47, 108, 83, 37, 65].map((value, index) => {
      const date = new Date(2026, 4, 27 + index, 12)
      return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        label: `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}`,
        value
      }
    }),
    timeBuckets: createBreakdown([
      ['00-06', 24], ['06-09', 65], ['09-12', 118], ['12-14', 101], ['14-18', 255], ['18-22', 203], ['22-24', 51]
    ], 817),
    methods,
    industries,
    roles,
    products,
    actions: [
      '圈选 379 名认证未购用户，形成后续召回池。',
      '运营触达优先安排在 14-18 与 18-22 时段。',
      '优先下钻房地产业、管理层与工程师人群的购买偏好。'
    ],
    sources: ['联想职场认证系统', 'SMB 电商渠道'],
    notes: ['数据按 LenovoID 去重', '不含 B4 企业相关分析', '当前为 Skill 应用验证结果']
  }
}

function createBreakdown(entries: Array<[string, number]>, total: number): SkillApplicationBreakdown[] {
  return entries.map(([label, value]) => ({
    label,
    value,
    share: total ? `${(value / total * 100).toFixed(1)}%` : '0.0%'
  }))
}

function beijingTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date()).replace(/\//g, '-')
}
