export const CUSTOMER_ORDER_TABS = [
  { key: 'customer', label: '客户订单' },
  { key: 'latest', label: '最新订单' },
  { key: 'pending', label: '待处理订单' },
  { key: 'unpaid', label: '待付款' },
  { key: 'abnormal', label: '异常订单' },
  { key: 'failed', label: '失败订单' }
]

export function normalizeCustomerOrderTab(value) {
  const candidate = Array.isArray(value) ? value[0] : value
  return CUSTOMER_ORDER_TABS.some(tab => tab.key === candidate) ? candidate : 'customer'
}

export const CUSTOMER_ORDERS = [
  { no: 'B2026102606488001X', time: '2026-10-26 14:31:14', customer: '常州市昊刻数控科技有限公司', si: '昊刻项目SI', customerType: '直销', orderType: '协议产品', amount: 68770.19, verificationStatus: '未核销', orderStatus: '交易关闭', contractStatus: '客户下单', pending: false },
  { no: 'B2026102606485001X', time: '2026-10-26 11:01:08', customer: '常州市昊刻数控科技有限公司', si: '昊刻项目SI', customerType: '直销', orderType: '协议产品', amount: 1540600, verificationStatus: '未核销', orderStatus: '待付款', contractStatus: '待签署', pending: true },
  { no: 'B2026102506184001X', time: '2026-10-25 16:18:03', customer: '华北银行股份有限公司', si: '华北金融SI', customerType: '直销', orderType: '协议产品', amount: 154545.67, verificationStatus: '已核销', orderStatus: '已完成', contractStatus: '已生效', pending: false },
  { no: 'B2026102405103001X', time: '2026-10-24 10:42:50', customer: '海州市政务服务中心', si: '海州数科SI', customerType: '渠道', orderType: '普通产品', amount: 45592.24, verificationStatus: '未核销', orderStatus: '待付款', contractStatus: '客户下单', pending: true },
  { no: 'B2026102304932001X', time: '2026-10-23 09:08:21', customer: '南岭通信服务有限公司', si: '南岭通信SI', customerType: '渠道', orderType: '协议产品', amount: 86270, verificationStatus: '未核销', orderStatus: '订单异常', contractStatus: '待处理', pending: true },
  { no: 'B2026102203821001X', time: '2026-10-22 17:25:41', customer: '西川理工大学', si: '西川教育SI', customerType: '渠道', orderType: '协议产品', amount: 320600, verificationStatus: '未核销', orderStatus: '下单失败', contractStatus: '未生成', pending: true }
]

const EMPTY_FILTERS = {
  number: '',
  name: '',
  verificationStatus: '全部',
  orderType: '全部',
  orderStart: '',
  orderEnd: ''
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

export function queryCustomerOrders(options = {}) {
  const tab = options.tab || 'customer'
  const filters = { ...EMPTY_FILTERS, ...(options.filters || {}) }
  const pageSize = Math.max(1, Number(options.pageSize) || 6)
  const page = Math.max(1, Number(options.page) || 1)

  if (filters.orderStart && filters.orderEnd && filters.orderStart > filters.orderEnd) {
    return { items: [], total: 0, page, pageSize, error: '下单开始日期不能晚于结束日期。' }
  }

  let rows = [...CUSTOMER_ORDERS]
  if (tab === 'pending') rows = rows.filter(row => row.pending)
  if (tab === 'unpaid') rows = rows.filter(row => row.orderStatus === '待付款')
  if (tab === 'abnormal') rows = rows.filter(row => row.orderStatus === '订单异常')
  if (tab === 'failed') rows = rows.filter(row => row.orderStatus === '下单失败')

  const number = normalize(filters.number)
  const name = normalize(filters.name)
  rows = rows.filter((row) => {
    const date = row.time.slice(0, 10)
    return (!number || normalize(row.no).includes(number))
      && (!name || normalize(`${row.customer} ${row.si}`).includes(name))
      && (filters.verificationStatus === '全部' || row.verificationStatus === filters.verificationStatus)
      && (filters.orderType === '全部' || row.orderType === filters.orderType)
      && (!filters.orderStart || date >= filters.orderStart)
      && (!filters.orderEnd || date <= filters.orderEnd)
  })

  const total = rows.length
  const start = (page - 1) * pageSize
  return { items: rows.slice(start, start + pageSize), total, page, pageSize, error: '' }
}
