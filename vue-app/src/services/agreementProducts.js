export const AGREEMENT_PRODUCT_TABS = [
  { key: 'all', label: '全部产品' },
  { key: 'outOfStock', label: '缺货下架' },
  { key: 'expiring', label: '即将过期' },
  { key: 'pendingAddition', label: '待追加' },
  { key: 'ordered', label: '已下单' }
]

export function normalizeAgreementProductTab(value) {
  const candidate = Array.isArray(value) ? value[0] : value
  return AGREEMENT_PRODUCT_TABS.some(tab => tab.key === candidate) ? candidate : 'all'
}

export const AGREEMENT_PRODUCTS = [
  { projectNo: 'LP20261025', publishedAt: '2026-10-26', validFrom: '2026-10-26', expiresAt: '2027-04-30', customer: '中州云计算有限公司', customerType: '渠道', productName: 'ThinkCentre M90q Gen 5', configuration: 'i7 / 32G / 1T SSD', productStatus: '待追加', productCode: 'CTO-M90QG5-032', lastOrderAt: '—', stock: '0 / 40' },
  { projectNo: 'LP20261020', publishedAt: '2026-10-22', validFrom: '2026-10-22', expiresAt: '2027-02-28', customer: '新城公共交通集团', customerType: '直销', productName: 'ThinkVision T24i-30', configuration: '23.8英寸 / IPS', productStatus: '待追加', productCode: 'MTM-T24I30', lastOrderAt: '—', stock: '0 / 180' },
  { projectNo: 'LP20261001', publishedAt: '2026-10-15', validFrom: '2026-10-15', expiresAt: '2026-12-31', customer: '华北银行股份有限公司', customerType: '直销', productName: 'ThinkCentre M730q-D116', configuration: 'i5 / 8G / 512G SSD', productStatus: '在售', productCode: 'CTO-M730Q-001', lastOrderAt: '2026-11-02 10:18', stock: '86 / 100' },
  { projectNo: 'LP20260918', publishedAt: '2026-09-20', validFrom: '2026-09-20', expiresAt: '2027-03-31', customer: '海州市政务服务中心', customerType: '渠道', productName: '启天M630 Q470 13.6升', configuration: 'i5 / 16G / 1T SSD', productStatus: '在售', productCode: 'MTM-M630-470', lastOrderAt: '2026-10-28 14:03', stock: '132 / 200' },
  { projectNo: 'LP20260806', publishedAt: '2026-08-08', validFrom: '2026-08-08', expiresAt: '2026-11-30', customer: '星海智能制造有限公司', customerType: '直销', productName: 'ThinkStation P3 Tower', configuration: 'i7 / 32G / 1T SSD', productStatus: '缺货下架', productCode: 'CTO-P3T-032', lastOrderAt: '2026-10-12 09:20', stock: '0 / 60' },
  { projectNo: 'LP20260722', publishedAt: '2026-07-25', validFrom: '2026-07-25', expiresAt: '2026-12-20', customer: '南岭通信服务有限公司', customerType: '渠道', productName: '扬天S660 一体机', configuration: 'i5 / 16G / 512G SSD', productStatus: '缺货下架', productCode: 'MTM-S660-512', lastOrderAt: '2026-09-30 16:42', stock: '0 / 120' },
  { projectNo: 'LP20260712', publishedAt: '2026-07-15', validFrom: '2026-07-15', expiresAt: '2026-11-25', customer: '北城建筑设计院', customerType: '渠道', productName: 'ThinkBook 16+', configuration: 'Ultra 7 / 32G / 1T SSD', productStatus: '即将过期', productCode: 'MTM-TB16P-032', lastOrderAt: '2026-10-08 13:22', stock: '11 / 50' },
  { projectNo: 'LP20260630', publishedAt: '2026-07-01', validFrom: '2026-07-01', expiresAt: '2026-11-20', customer: '东江农商银行', customerType: '直销', productName: 'ThinkCentre neo 50q', configuration: 'i5 / 16G / 512G SSD', productStatus: '即将过期', productCode: 'CTO-NEO50Q-016', lastOrderAt: '2026-10-20 11:08', stock: '24 / 80' },
  { projectNo: 'LP20260516', publishedAt: '2026-05-18', validFrom: '2026-05-18', expiresAt: '2026-12-15', customer: '江南城市商业银行', customerType: '直销', productName: '启天M650 商用台式机', configuration: 'i5 / 16G / 512G SSD', productStatus: '已下单', productCode: 'MTM-M650-512', lastOrderAt: '2026-11-03 09:36', stock: '42 / 300' },
  { projectNo: 'LP20260409', publishedAt: '2026-04-12', validFrom: '2026-04-12', expiresAt: '2027-01-31', customer: '西川理工大学', customerType: '渠道', productName: 'ThinkCentre E77s', configuration: 'i5 / 16G / 512G SSD', productStatus: '已下单', productCode: 'CTO-E77S-016', lastOrderAt: '2026-10-29 15:10', stock: '75 / 260' }
]

const TAB_STATUS = {
  outOfStock: '缺货下架',
  expiring: '即将过期',
  pendingAddition: '待追加',
  ordered: '已下单'
}

const EMPTY_FILTERS = {
  projectNo: '',
  name: '',
  productStatus: '全部',
  publishedStart: '',
  publishedEnd: '',
  expiresStart: '',
  expiresEnd: ''
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

export function queryAgreementProducts(options = {}) {
  const tab = options.tab || 'all'
  const filters = { ...EMPTY_FILTERS, ...(options.filters || {}) }
  const pageSize = Math.max(1, Number(options.pageSize) || 6)
  const page = Math.max(1, Number(options.page) || 1)
  const error = filters.publishedStart && filters.publishedEnd && filters.publishedStart > filters.publishedEnd
    ? '发布开始日期不能晚于结束日期。'
    : filters.expiresStart && filters.expiresEnd && filters.expiresStart > filters.expiresEnd
      ? '过期开始日期不能晚于结束日期。'
      : ''
  if (error) return { items: [], total: 0, page, pageSize, error }

  const projectNo = normalize(filters.projectNo)
  const name = normalize(filters.name)
  const tabStatus = TAB_STATUS[tab]
  const rows = AGREEMENT_PRODUCTS.filter((row) => (
    (!tabStatus || row.productStatus === tabStatus)
    && (!projectNo || normalize(row.projectNo).includes(projectNo))
    && (!name || normalize(`${row.customer} ${row.productName} ${row.productCode} ${row.configuration}`).includes(name))
    && (filters.productStatus === '全部' || row.productStatus === filters.productStatus)
    && (!filters.publishedStart || row.publishedAt >= filters.publishedStart)
    && (!filters.publishedEnd || row.publishedAt <= filters.publishedEnd)
    && (!filters.expiresStart || row.expiresAt >= filters.expiresStart)
    && (!filters.expiresEnd || row.expiresAt <= filters.expiresEnd)
  ))
  const total = rows.length
  const start = (page - 1) * pageSize
  return { items: rows.slice(start, start + pageSize), total, page, pageSize, error: '' }
}
