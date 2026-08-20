export type PurchaseOrderStatus = 'pending' | 'approved' | 'signing' | 'fulfilling' | 'completed' | 'cancelled'

export interface PurchaseOrder {
  id: string
  poNo: string
  customerName: string
  agreementName: string
  productSummary: string
  itemCount: number
  amount: number
  status: PurchaseOrderStatus
  ownerName: string
  contactName: string
  region: string
  channel: string
  createdAt: string
  updatedAt: string
  expectedDelivery: string
  conversionStage: string
  progress: number
  remark: string
}

export interface PurchaseOrderFilters {
  keyword: string
  status: PurchaseOrderStatus | 'all'
}

export interface PurchaseOrderQuery extends PurchaseOrderFilters {
  page: number
  pageSize: number
}

export interface PurchaseOrderQueryResult {
  rows: PurchaseOrder[]
  filteredRows: PurchaseOrder[]
  total: number
  page: number
  pageSize: number
}

export const PURCHASE_ORDER_STATUS_OPTIONS: Array<{ value: PurchaseOrderStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待确认' },
  { value: 'approved', label: '已审核' },
  { value: 'signing', label: '协议签署中' },
  { value: 'fulfilling', label: '履约中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  pending: '待确认',
  approved: '已审核',
  signing: '协议签署中',
  fulfilling: '履约中',
  completed: '已完成',
  cancelled: '已取消'
}

const PURCHASE_ORDER_MOCKS: PurchaseOrder[] = [
  {
    id: 'POC-202608-001',
    poNo: 'LPO-20260811001',
    customerName: '华东制造集团',
    agreementName: 'ThinkPad T 系列年度协议',
    productSummary: 'ThinkPad T14p、扩展坞、三年保修',
    itemCount: 126,
    amount: 1886400,
    status: 'fulfilling',
    ownerName: '陈然',
    contactName: '李经理',
    region: '华东',
    channel: '企业购',
    createdAt: '2026-08-11',
    updatedAt: '2026-08-12',
    expectedDelivery: '2026-08-24',
    conversionStage: '首批备货',
    progress: 68,
    remark: '首批 40 台已锁库，剩余数量待客户确认发货节奏。'
  },
  {
    id: 'POC-202608-002',
    poNo: 'LPO-20260811002',
    customerName: '北方能源股份',
    agreementName: '移动办公终端集采协议',
    productSummary: 'ThinkBook 14+、Office 授权、上门服务',
    itemCount: 84,
    amount: 763200,
    status: 'signing',
    ownerName: '周珩',
    contactName: '王主任',
    region: '华北',
    channel: '大客户',
    createdAt: '2026-08-10',
    updatedAt: '2026-08-12',
    expectedDelivery: '2026-09-02',
    conversionStage: '等待客户盖章',
    progress: 45,
    remark: '法务已回传协议修订意见，待销售与客户确认付款条款。'
  },
  {
    id: 'POC-202608-003',
    poNo: 'LPO-20260810008',
    customerName: '南区医疗联合体',
    agreementName: '诊室终端补充采购协议',
    productSummary: '启天 M 系列台式机、显示器、键鼠套装',
    itemCount: 210,
    amount: 1134000,
    status: 'approved',
    ownerName: '刘岚',
    contactName: '赵老师',
    region: '华南',
    channel: '官网闭环',
    createdAt: '2026-08-09',
    updatedAt: '2026-08-11',
    expectedDelivery: '2026-08-28',
    conversionStage: '待生成正式订单',
    progress: 36,
    remark: '客户已确认采购清单，正在补充医院内部成本中心。'
  },
  {
    id: 'POC-202608-004',
    poNo: 'LPO-20260809006',
    customerName: '西部交通研究院',
    agreementName: '研发工作站专项协议',
    productSummary: 'ThinkStation P 系列、图形显卡、延保',
    itemCount: 32,
    amount: 986000,
    status: 'pending',
    ownerName: '顾清',
    contactName: '杨工',
    region: '西部',
    channel: '企业购',
    createdAt: '2026-08-08',
    updatedAt: '2026-08-10',
    expectedDelivery: '2026-09-06',
    conversionStage: '待运营确认价格',
    progress: 18,
    remark: '含定制配置，需确认协议价和备货周期。'
  },
  {
    id: 'POC-202608-005',
    poNo: 'LPO-20260808011',
    customerName: '中部教育科技',
    agreementName: '教室终端换新协议',
    productSummary: '昭阳笔记本、智慧教室软件、部署服务',
    itemCount: 156,
    amount: 1216800,
    status: 'completed',
    ownerName: '何一',
    contactName: '孙老师',
    region: '华中',
    channel: '大客户',
    createdAt: '2026-08-05',
    updatedAt: '2026-08-10',
    expectedDelivery: '2026-08-15',
    conversionStage: '已完成交付',
    progress: 100,
    remark: '设备已签收，待月底统一开票。'
  },
  {
    id: 'POC-202608-006',
    poNo: 'LPO-20260807003',
    customerName: '华南零售连锁',
    agreementName: '门店收银终端采购协议',
    productSummary: '商用台式机、扫码设备、基础维保',
    itemCount: 98,
    amount: 529200,
    status: 'cancelled',
    ownerName: '沈乔',
    contactName: '林经理',
    region: '华南',
    channel: '企业购',
    createdAt: '2026-08-04',
    updatedAt: '2026-08-09',
    expectedDelivery: '2026-08-20',
    conversionStage: '客户取消',
    progress: 0,
    remark: '客户预算延后，本次协议单关闭，后续重新发起。'
  },
  {
    id: 'POC-202608-007',
    poNo: 'LPO-20260806009',
    customerName: '东北物流集团',
    agreementName: '仓储移动终端协议',
    productSummary: 'ThinkPad E 系列、移动热点、意外保护',
    itemCount: 72,
    amount: 417600,
    status: 'fulfilling',
    ownerName: '蒋悦',
    contactName: '韩主管',
    region: '东北',
    channel: '官网闭环',
    createdAt: '2026-08-03',
    updatedAt: '2026-08-11',
    expectedDelivery: '2026-08-22',
    conversionStage: '分仓配送中',
    progress: 74,
    remark: '东北三仓分批配送，需跟踪到货回单。'
  },
  {
    id: 'POC-202608-008',
    poNo: 'LPO-20260805004',
    customerName: '长三角设计院',
    agreementName: '高性能设计设备协议',
    productSummary: 'ThinkPad P 系列、专业显示器、校色服务',
    itemCount: 44,
    amount: 1328800,
    status: 'approved',
    ownerName: '郑远',
    contactName: '吴院长',
    region: '华东',
    channel: '大客户',
    createdAt: '2026-08-02',
    updatedAt: '2026-08-08',
    expectedDelivery: '2026-09-01',
    conversionStage: '待客户确认收货地址',
    progress: 40,
    remark: '客户要求按部门拆分地址，正在补充明细。'
  }
]

export function listPurchaseOrders() {
  return [...PURCHASE_ORDER_MOCKS]
}

export function applyPurchaseOrderFilters(rows: PurchaseOrder[], filters: PurchaseOrderFilters) {
  const keyword = filters.keyword.trim().toLowerCase()
  return rows.filter(row => {
    const keywordMatched = !keyword || [
      row.id,
      row.poNo,
      row.customerName,
      row.agreementName,
      row.productSummary,
      row.ownerName,
      row.contactName
    ].some(value => value.toLowerCase().includes(keyword))
    const statusMatched = filters.status === 'all' || row.status === filters.status
    return keywordMatched && statusMatched
  })
}

export function queryPurchaseOrders(query: PurchaseOrderQuery): PurchaseOrderQueryResult {
  const filteredRows = applyPurchaseOrderFilters(PURCHASE_ORDER_MOCKS, query)
  const safePageSize = Math.max(query.pageSize, 1)
  const maxPage = Math.max(Math.ceil(filteredRows.length / safePageSize), 1)
  const page = Math.min(Math.max(query.page, 1), maxPage)
  const start = (page - 1) * safePageSize
  return {
    rows: filteredRows.slice(start, start + safePageSize),
    filteredRows,
    total: filteredRows.length,
    page,
    pageSize: safePageSize
  }
}

export function getPurchaseOrderById(id: string) {
  return PURCHASE_ORDER_MOCKS.find(row => row.id === id) || null
}

export function getPurchaseOrderKpis(rows: PurchaseOrder[]) {
  const activeRows = rows.filter(row => !['completed', 'cancelled'].includes(row.status))
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0)
  const averageProgress = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length)
    : 0
  return {
    count: rows.length,
    activeCount: activeRows.length,
    totalAmount,
    averageProgress
  }
}

export function buildPurchaseOrderCsv(rows: PurchaseOrder[]) {
  const header = [
    '协议单ID',
    '采购单号',
    '客户',
    '协议名称',
    '商品摘要',
    '数量',
    '金额',
    '状态',
    '负责人',
    '区域',
    '创建时间',
    '预计交付'
  ]
  const body = rows.map(row => [
    row.id,
    row.poNo,
    row.customerName,
    row.agreementName,
    row.productSummary,
    String(row.itemCount),
    String(row.amount),
    PURCHASE_ORDER_STATUS_LABELS[row.status],
    row.ownerName,
    row.region,
    row.createdAt,
    row.expectedDelivery
  ])
  return [header, ...body]
    .map(cols => cols.map(escapeCsvCell).join(','))
    .join('\n')
}

function escapeCsvCell(value: string) {
  const normalized = value.replace(/"/g, '""')
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized
}
