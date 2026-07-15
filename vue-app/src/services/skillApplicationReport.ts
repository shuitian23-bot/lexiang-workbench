import type { SkillApplicationBreakdown, SkillApplicationReportData } from '@/stores/app'

interface ReferenceReportOptions {
  skillName?: string
  skillCnName?: string
  prompt?: string
  generatedAt?: string
  referenceDate?: Date | string
}

interface QueryRange {
  start: Date
  end: Date
  label: string
  dayCount: number
}

const REFERENCE_START = '2026-05-27'
const REFERENCE_END = '2026-06-08'
const REFERENCE_UNIQUE_USERS = 861
const REFERENCE_PURCHASED_USERS = 482
const REFERENCE_ORDER_COUNT = 536
const REFERENCE_TOTAL_GMV = 7_170_000

export function createEmployeeCertificationReport(
  options: ReferenceReportOptions = {}
): SkillApplicationReportData {
  const prompt = options.prompt || '查询 5/27 至 6/8 的认证与购买转化数据'
  const range = parseQueryRange(prompt, options.referenceDate)
  const dateStart = formatDate(range.start)
  const dateEnd = formatDate(range.end)
  const isReferenceRange = dateStart === REFERENCE_START && dateEnd === REFERENCE_END
  const seed = Number(`${dateStart}${dateEnd}`.replace(/\D/g, '').slice(-8)) || 1
  const scale = range.dayCount / 13
  const uniqueUsers = isReferenceRange
    ? REFERENCE_UNIQUE_USERS
    : Math.max(1, Math.round(REFERENCE_UNIQUE_USERS * scale * (0.92 + (seed % 17) / 100)))
  const conversionRate = isReferenceRange ? 56 : Number((54.5 + (seed % 36) / 10).toFixed(1))
  const purchasedUsers = isReferenceRange
    ? REFERENCE_PURCHASED_USERS
    : Math.max(0, Math.round(uniqueUsers * conversionRate / 100))
  const orderCount = isReferenceRange
    ? REFERENCE_ORDER_COUNT
    : Math.max(purchasedUsers, Math.round(purchasedUsers * 1.112))
  const averageOrderValue = isReferenceRange
    ? Math.round(REFERENCE_TOTAL_GMV / REFERENCE_ORDER_COUNT)
    : 12_400 + (seed % 1_701)
  const totalGmv = isReferenceRange ? REFERENCE_TOTAL_GMV : orderCount * averageOrderValue
  const duplicateRecords = isReferenceRange ? 71 : Math.max(0, Math.round(uniqueUsers * 0.082))
  const duplicateUsers = isReferenceRange ? 59 : Math.max(0, Math.round(duplicateRecords * 0.83))
  const rawRecords = isReferenceRange ? 888 : uniqueUsers + Math.max(1, Math.round(uniqueUsers * 0.031))
  const unpurchasedUsers = Math.max(uniqueUsers - purchasedUsers, 0)
  const dailyTrend = createDailyTrend(range, uniqueUsers, seed, isReferenceRange)
  const peakDays = [...dailyTrend].sort((a, b) => b.value - a.value)
  const methods = scaleBreakdown([
    ['其他材料', 629],
    ['企业邮箱', 159],
    ['劳动合同', 73]
  ], uniqueUsers, REFERENCE_UNIQUE_USERS)
  const industries = scaleBreakdown([
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
  ], uniqueUsers, REFERENCE_UNIQUE_USERS)
  const roles = scaleBreakdown([
    ['管理层', 335],
    ['其他', 183],
    ['工程师', 136],
    ['设计师', 50],
    ['销售', 45],
    ['运营/产品', 42],
    ['行政/职能', 37],
    ['教师', 25],
    ['医疗', 8]
  ], uniqueUsers, REFERENCE_UNIQUE_USERS)
  const products = scaleBreakdown([
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
  ], purchasedUsers, REFERENCE_PURCHASED_USERS)
  const timeBuckets = createTimeBuckets(uniqueUsers, isReferenceRange)

  return {
    skillName: options.skillName || 'presentation-employee-cert',
    skillCnName: options.skillCnName || '职场员工审核数据分析',
    prompt,
    parsedTimeText: `${range.label}：${dateStart} 至 ${dateEnd}（${range.dayCount} 天）`,
    dateStart,
    dateEnd,
    dayCount: range.dayCount,
    generatedAt: options.generatedAt || beijingTime(),
    truth: {
      rawRecords,
      duplicateRecords,
      duplicateUsers,
      uniqueUsers
    },
    metrics: [
      { label: '已认证独立用户', value: formatNumber(uniqueUsers), note: `${range.dayCount} 天累计`, tone: 'blue' },
      { label: '已购用户', value: formatNumber(purchasedUsers), note: `${formatNumber(orderCount)} 笔支付订单`, tone: 'green' },
      { label: '认证购买转化率', value: `${conversionRate.toFixed(1)}%`, note: '已购用户 ÷ 已认证独立用户', tone: 'green' },
      { label: '总 GMV', value: `¥${formatNumber(totalGmv)}`, note: 'SMB 渠道支付成功订单', tone: 'blue' },
      { label: '平均客单价', value: `¥${formatNumber(averageOrderValue)}`, note: '总 GMV ÷ 订单笔数', tone: 'neutral' },
      { label: '认证未购池', value: formatNumber(unpurchasedUsers), note: '可用于后续召回圈选', tone: 'orange' }
    ],
    insights: [
      {
        title: `${range.label}共有 ${formatNumber(uniqueUsers)} 名独立认证用户`,
        evidence: [`${formatNumber(purchasedUsers)} 人完成购买，转化率 ${conversionRate.toFixed(1)}%`, `总 GMV ¥${formatNumber(totalGmv)}`]
      },
      {
        title: `${peakDays[0]?.label || '-'} 为区间认证峰值`,
        evidence: [`当日新增 ${formatNumber(peakDays[0]?.value || 0)} 人`, `${peakDays[1]?.label || '-'} 次之，新增 ${formatNumber(peakDays[1]?.value || 0)} 人`]
      },
      {
        title: '认证人群以管理层和工程师为主',
        evidence: [`管理层 ${roles[0]?.value || 0} 人`, `工程师 ${roles[2]?.value || 0} 人`]
      },
      {
        title: `${products[0]?.label || 'Top1 商品'} 为区间购买人数最高商品`,
        evidence: [`${products[0]?.value || 0} 名认证已购用户购买`, `占已购用户 ${products[0]?.share || '0.0%'}`]
      }
    ],
    dailyTrend,
    timeBuckets,
    methods,
    industries,
    roles,
    products,
    actions: [
      `圈选 ${formatNumber(unpurchasedUsers)} 名认证未购用户，形成后续召回池。`,
      '运营触达优先安排在 14-18 与 18-22 时段。',
      `优先下钻${industries[0]?.label || '重点行业'}、${roles[0]?.label || '重点岗位'}与${roles[2]?.label || '工程师'}人群的购买偏好。`
    ],
    sources: ['联想职场认证系统', 'SMB 电商渠道'],
    notes: ['数据按 LenovoID 去重', '不含 B4 企业相关分析']
  }
}

function parseQueryRange(prompt: string, referenceDate?: Date | string): QueryRange {
  const today = startOfDay(referenceDate)
  const explicitDates = Array.from(prompt.matchAll(/(?:(\d{4})[年/.\-])?(\d{1,2})(?:月|[/.\-])(\d{1,2})日?/g))
    .map(match => ({
      year: match[1] ? Number(match[1]) : 0,
      month: Number(match[2]),
      day: Number(match[3])
    }))
    .filter(item => item.month >= 1 && item.month <= 12 && item.day >= 1 && item.day <= 31)

  let start: Date | null = null
  let end: Date | null = null
  let label = '指定时间'

  if (explicitDates.length >= 2) {
    const first = explicitDates[0]
    const second = explicitDates[1]
    const firstYear = first.year || today.getFullYear()
    let secondYear = second.year || firstYear
    start = makeDate(firstYear, first.month, first.day)
    end = makeDate(secondYear, second.month, second.day)
    if (!second.year && end < start) {
      secondYear += 1
      end = makeDate(secondYear, second.month, second.day)
    }
    label = '指定区间'
  } else if (explicitDates.length === 1 && /(?:到|至|截止|截至)\s*(?:今天|今日)/.test(prompt)) {
    const item = explicitDates[0]
    start = makeDate(item.year || today.getFullYear(), item.month, item.day)
    end = today
    label = '指定日期至今日'
  } else if (explicitDates.length === 1) {
    const item = explicitDates[0]
    start = makeDate(item.year || today.getFullYear(), item.month, item.day)
    end = start
    label = '指定日期'
  } else {
    const recentDays = prompt.match(/(?:最近|近)\s*(\d+|一|二|两|三|四|五|六|七|八|九|十|半个)\s*(?:天|日)/)
    const recentWeeks = prompt.match(/(?:最近|近)\s*(\d+|一|二|两|三|四|五|六|七|八|九|十)\s*(?:周|星期)/)
    if (recentDays) {
      const days = recentDays[1] === '半个' ? 15 : parseNaturalNumber(recentDays[1])
      end = today
      start = addDays(today, -(Math.max(days, 1) - 1))
      label = `近 ${days} 天`
    } else if (recentWeeks) {
      const weeks = Math.max(parseNaturalNumber(recentWeeks[1]), 1)
      const days = weeks * 7
      end = today
      start = addDays(today, -(days - 1))
      label = `近 ${weeks} 周`
    } else if (/上周|上一周|上个星期/.test(prompt)) {
      const currentMonday = addDays(today, -((today.getDay() + 6) % 7))
      start = addDays(currentMonday, -7)
      end = addDays(currentMonday, -1)
      label = '上周（自然周）'
    } else if (/本周|这周|这个星期/.test(prompt)) {
      start = addDays(today, -((today.getDay() + 6) % 7))
      end = today
      label = '本周截至今日'
    } else if (/上月|上个月/.test(prompt)) {
      start = makeDate(today.getFullYear(), today.getMonth(), 1)
      end = addDays(makeDate(today.getFullYear(), today.getMonth() + 1, 1), -1)
      label = '上月（自然月）'
    } else if (/本月|这个月/.test(prompt)) {
      start = makeDate(today.getFullYear(), today.getMonth() + 1, 1)
      end = today
      label = '本月截至今日'
    } else if (/最近一个月|近一个月/.test(prompt)) {
      end = today
      start = addDays(today, -29)
      label = '近 30 天'
    } else if (/昨天|昨日/.test(prompt)) {
      start = addDays(today, -1)
      end = start
      label = '昨天'
    } else if (/今天|今日/.test(prompt)) {
      start = today
      end = today
      label = '今天'
    }
  }

  if (!start || !end || end < start) {
    start = makeDate(2026, 5, 27)
    end = makeDate(2026, 6, 8)
    label = '参考区间'
  }

  return {
    start,
    end,
    label,
    dayCount: inclusiveDayCount(start, end)
  }
}

function createDailyTrend(range: QueryRange, total: number, seed: number, exact: boolean) {
  const exactValues = [46, 72, 44, 134, 96, 67, 27, 35, 47, 108, 83, 37, 65]
  const dates = Array.from({ length: range.dayCount }, (_, index) => addDays(range.start, index))
  if (exact && dates.length === exactValues.length) {
    return dates.map((date, index) => ({
      date: formatDate(date),
      label: formatShortDate(date),
      value: exactValues[index]
    }))
  }

  const weights = dates.map((date, index) => {
    const weekdayBoost = [0.82, 1.04, 1.12, 1.18, 1.1, 1.02, 0.76][date.getDay()]
    return weekdayBoost * (0.88 + ((seed + index * 7) % 23) / 50)
  })
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  const values = weights.map(value => Math.max(0, Math.floor(total * value / weightTotal)))
  let remainder = total - values.reduce((sum, value) => sum + value, 0)
  for (let index = 0; remainder > 0; index = (index + 1) % values.length) {
    values[index] += 1
    remainder -= 1
  }
  return dates.map((date, index) => ({
    date: formatDate(date),
    label: formatShortDate(date),
    value: values[index]
  }))
}

function createTimeBuckets(uniqueUsers: number, exact: boolean): SkillApplicationBreakdown[] {
  const labels = ['00-06', '06-09', '09-12', '12-14', '14-18', '18-22', '22-24']
  const exactValues = [24, 65, 118, 101, 255, 203, 51]
  const shares = [2.9, 8, 14.4, 12.4, 31.2, 24.8, 6.3]
  const available = exact ? 817 : Math.max(1, Math.round(uniqueUsers * 0.95))
  return labels.map((label, index) => {
    const value = exact ? exactValues[index] : Math.round(available * shares[index] / 100)
    return { label, value, share: `${shares[index].toFixed(1)}%` }
  })
}

function scaleBreakdown(
  entries: Array<[string, number]>,
  total: number,
  baseTotal: number
): SkillApplicationBreakdown[] {
  return entries.map(([label, base]) => {
    const value = Math.max(0, Math.round(base * total / baseTotal))
    return {
      label,
      value,
      share: total ? `${(value / total * 100).toFixed(1)}%` : '0.0%'
    }
  })
}

function startOfDay(value?: Date | string) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) return makeDate(Number(match[1]), Number(match[2]), Number(match[3]))
  }
  const date = value instanceof Date ? value : new Date()
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
}

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function inclusiveDayCount(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((endUtc - startUtc) / 86400000) + 1
}

function parseNaturalNumber(value: string) {
  if (/^\d+$/.test(value)) return Number(value)
  return ({ 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 } as Record<string, number>)[value] || 1
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function formatShortDate(value: Date) {
  return `${value.getMonth() + 1}/${String(value.getDate()).padStart(2, '0')}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
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
