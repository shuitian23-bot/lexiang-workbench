export const CUSTOM_TABLE_AUTH_LOGIC = 'AND'
export const CUSTOM_TABLE_AUTH_LOGICS = [CUSTOM_TABLE_AUTH_LOGIC]
export const CUSTOM_TABLE_TAG_LIMIT = 5
export const CUSTOM_TABLE_TAG_MAX_LENGTH = 12
export const CUSTOM_TABLE_TAG_STORAGE_KEY = 'leaibot_custom_table_tags_v1'

function dimension(id, name, values) {
  return { id, name, values }
}

function tableRows(rowDimensions = []) {
  return rowDimensions.flatMap((group) => group.values)
}

function table(definition) {
  return { ...definition, rows: tableRows(definition.rowDimensions) }
}

export const CUSTOM_TABLE_CATALOG = [
  table({
    id: 'ops-metrics-table',
    name: '运营指标二维表',
    description: '按业务范围与指标字段控制运营数据的行、列访问权限。',
    tags: ['经营分析', '乐享运营'],
    rowDimensions: [
      dimension('region', '区域', [
        { id: 'east', name: '华东区' },
        { id: 'north', name: '华北区' },
        { id: 'south', name: '华南区' },
        { id: 'nationwide', name: '全国' }
      ]),
      dimension('business', '业务线', [
        { id: 'consumer-business', name: '消费业务' },
        { id: 'smb-business', name: 'SMB业务' },
        { id: 'operations', name: '乐享运营' },
        { id: 'enterprise-operations', name: '企业客户管理' }
      ]),
      dimension('channel', '渠道', [
        { id: 'chat', name: 'Chat' },
        { id: 'report', name: '报表' }
      ])
    ],
    columns: [
      { id: 'gmv', name: 'GMV' },
      { id: 'traffic', name: '流量' },
      { id: 'conversion', name: '转化' },
      { id: 'member-level', name: '等级' },
      { id: 'rights-usage', name: '权益使用' },
      { id: 'member-rights', name: '会员权益' },
      { id: 'lead-status', name: '线索状态' },
      { id: 'customer-name', name: '客户名称' },
      { id: 'intent-level', name: '意向等级' },
      { id: 'follow-status', name: '跟进状态' },
      { id: 'record-status', name: '记录状态' }
    ]
  }),
  table({
    id: 'product-operations-table',
    name: '商品运营二维表',
    description: '按业务范围与商品字段控制商品运营数据的访问权限。',
    tags: ['商品运营', '经营分析'],
    rowDimensions: [
      dimension('business', '业务线', [
        { id: 'consumer-business', name: '消费业务' },
        { id: 'smb-business', name: 'SMB业务' },
        { id: 'product-operations', name: '商品运营' }
      ]),
      dimension('region', '区域', [{ id: 'nationwide', name: '全国' }])
    ],
    columns: [
      { id: 'fa01', name: 'FA01' },
      { id: 'fa02', name: 'FA02' },
      { id: 'smb-fa01', name: 'SMBFA01' },
      { id: 'smb-fa02', name: 'SMBFA02' },
      { id: 'product-name', name: '商品名称' },
      { id: 'price', name: '价格' },
      { id: 'stock', name: '库存' },
      { id: 'publish-status', name: '发布状态' },
      { id: 'record-status', name: '记录状态' }
    ]
  }),
  table({
    id: 'enterprise-leads-table',
    name: '企业客户线索二维表',
    description: '按线索业务范围与客户字段控制企业客户数据的访问权限。',
    tags: ['企业客户', '线索管理'],
    rowDimensions: [
      dimension('region', '区域', [
        { id: 'east', name: '华东区' },
        { id: 'north', name: '华北区' },
        { id: 'south', name: '华南区' },
        { id: 'nationwide', name: '全国' }
      ])
    ],
    columns: [
      { id: 'customer-name', name: '客户名称' },
      { id: 'intent-level', name: '意向等级' },
      { id: 'follow-status', name: '跟进状态' },
      { id: 'owner', name: '负责人' },
      { id: 'lead-status', name: '线索状态' },
      { id: 'record-status', name: '记录状态' }
    ]
  })
]

const catalogMap = new Map(CUSTOM_TABLE_CATALOG.map((item) => [item.id, item]))
const catalogListeners = new Set()

function nextRuleId() {
  return `table-rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function splitLegacyValues(value) {
  if (Array.isArray(value)) return value.flatMap(splitLegacyValues)
  return String(value || '').split(/[、,，/]/).map((item) => item.trim()).filter(Boolean)
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function browserStorage() {
  try {
    return typeof globalThis === 'undefined' ? null : globalThis.localStorage || null
  } catch {
    return null
  }
}

function tagKey(value) {
  return value.toLocaleLowerCase()
}

function notifyCatalogChanged(tableId) {
  catalogListeners.forEach((listener) => listener(tableId))
}

function persistCustomTableTags(storage) {
  if (!storage?.setItem) return
  const payload = Object.fromEntries(CUSTOM_TABLE_CATALOG.map((item) => [item.id, [...(item.tags || [])]]))
  storage.setItem(CUSTOM_TABLE_TAG_STORAGE_KEY, JSON.stringify(payload))
}

export function normalizeCustomTableTags(tags = []) {
  const normalized = []
  const used = new Set()
  ;(Array.isArray(tags) ? tags : []).forEach((value) => {
    const tag = String(value || '').trim()
    const key = tagKey(tag)
    if (!tag || used.has(key)) return
    used.add(key)
    normalized.push(tag)
  })
  return normalized
}

export function validateCustomTableTags(tags = []) {
  const source = Array.isArray(tags) ? tags : []
  const normalized = normalizeCustomTableTags(source)
  if (normalized.length > CUSTOM_TABLE_TAG_LIMIT) return '每个数据集最多设置 ' + CUSTOM_TABLE_TAG_LIMIT + ' 个标签。'
  const tooLong = normalized.find((tag) => Array.from(tag).length > CUSTOM_TABLE_TAG_MAX_LENGTH)
  if (tooLong) return '标签“' + tooLong + '”不能超过 ' + CUSTOM_TABLE_TAG_MAX_LENGTH + ' 个字符。'
  if (normalized.length !== source.map((value) => String(value || '').trim()).filter(Boolean).length) return '标签名称不能重复。'
  return ''
}

export function setCustomTableTags(tableId, tags = [], options = {}) {
  const resolved = customTableById(tableId)
  if (!resolved) throw new Error('未找到需要维护标签的数据集。')
  const validationError = validateCustomTableTags(tags)
  if (validationError) throw new Error(validationError)
  const normalized = normalizeCustomTableTags(tags)
  const previous = [...(resolved.tags || [])]
  resolved.tags = normalized
  try {
    persistCustomTableTags(options.storage === undefined ? browserStorage() : options.storage)
  } catch {
    resolved.tags = previous
    throw new Error('标签保存失败，请稍后重试。')
  }
  notifyCatalogChanged(tableId)
  return [...normalized]
}

export function hydrateCustomTableTags(storage = browserStorage()) {
  if (!storage?.getItem) return false
  try {
    const payload = JSON.parse(storage.getItem(CUSTOM_TABLE_TAG_STORAGE_KEY) || '{}')
    let changed = false
    CUSTOM_TABLE_CATALOG.forEach((item) => {
      if (!Array.isArray(payload?.[item.id]) || validateCustomTableTags(payload[item.id])) return
      item.tags = normalizeCustomTableTags(payload[item.id])
      changed = true
    })
    if (changed) notifyCatalogChanged('')
    return changed
  } catch {
    return false
  }
}

export function subscribeCustomTableCatalog(listener) {
  if (typeof listener !== 'function') return () => {}
  catalogListeners.add(listener)
  return () => catalogListeners.delete(listener)
}

export function normalizeCustomTableLogic() {
  return CUSTOM_TABLE_AUTH_LOGIC
}

function optionIdsFromValues(options, values) {
  const lookup = new Map(options.flatMap((option) => [[option.id, option.id], [option.name, option.id]]))
  return unique(values.map((value) => lookup.get(value)).filter(Boolean))
}

function resolveLegacyTableId(rule = {}) {
  if (rule.tableId && catalogMap.has(rule.tableId)) return rule.tableId
  const dataset = String(rule.dataset || rule.tableName || rule.menuName || '')
  if (dataset.includes('企业客户') || dataset.includes('线索')) return 'enterprise-leads-table'
  if (rule.menuKey === 'product-ai' || dataset.includes('商品')) return 'product-operations-table'
  return 'ops-metrics-table'
}

function legacyRuleValues(rule = {}) {
  const conditions = (rule.groups || []).flatMap((group) => group.conditions || [])
  return unique([
    ...splitLegacyValues(rule.region),
    ...splitLegacyValues(rule.organization),
    ...splitLegacyValues(rule.fields),
    ...conditions.flatMap((condition) => splitLegacyValues(condition.values))
  ])
}

export function customTableById(tableId) {
  return catalogMap.get(tableId) || null
}

export function customTableRowDimensions(tableOrId) {
  const resolved = typeof tableOrId === 'string' ? customTableById(tableOrId) : tableOrId
  return resolved?.rowDimensions || []
}

export function createCustomTableRule(tableId, options = {}) {
  const resolved = customTableById(tableId)
  if (!resolved) return null
  const selectAll = options.selectAll !== false
  return {
    id: nextRuleId(),
    tableId: resolved.id,
    tableName: resolved.name,
    logic: CUSTOM_TABLE_AUTH_LOGIC,
    rowFieldIds: selectAll ? resolved.rows.map((row) => row.id) : [],
    columnFieldIds: selectAll ? resolved.columns.map((column) => column.id) : []
  }
}

export function normalizeCustomDataRules(rules = []) {
  return (Array.isArray(rules) ? rules : []).map((rule) => {
    const tableId = resolveLegacyTableId(rule)
    const resolved = customTableById(tableId) || CUSTOM_TABLE_CATALOG[0]
    const legacyValues = legacyRuleValues(rule)
    const rowValues = [...(rule.rowFieldIds || []), ...legacyValues]
    const columnValues = [...(rule.columnFieldIds || []), ...legacyValues]
    return {
      id: rule.id || nextRuleId(),
      tableId: resolved.id,
      tableName: resolved.name,
      logic: CUSTOM_TABLE_AUTH_LOGIC,
      rowFieldIds: optionIdsFromValues(resolved.rows, rowValues),
      columnFieldIds: optionIdsFromValues(resolved.columns, columnValues)
    }
  })
}

export function availableCustomTables(rules = []) {
  const usedIds = new Set(normalizeCustomDataRules(rules).map((rule) => rule.tableId))
  return CUSTOM_TABLE_CATALOG.filter((item) => !usedIds.has(item.id))
}

export function isCustomTableCellGranted(rule, rowId, columnId) {
  return (rule?.rowFieldIds || []).includes(rowId) && (rule?.columnFieldIds || []).includes(columnId)
}

export function validateCustomTableRules(rules = []) {
  const normalized = normalizeCustomDataRules(rules)
  const incompleteIndex = normalized.findIndex((rule) => !rule.rowFieldIds.length || !rule.columnFieldIds.length)
  if (incompleteIndex < 0) return ''
  const rule = normalized[incompleteIndex]
  if (!rule.rowFieldIds.length && !rule.columnFieldIds.length) return `${rule.tableName}：请至少选择一个行字段和一个列字段。`
  if (!rule.rowFieldIds.length) return `${rule.tableName}：请至少选择一个行字段。`
  return `${rule.tableName}：请至少选择一个列字段。`
}

export function intersectCustomTableFields(tableIds = []) {
  const tables = unique(tableIds).map((tableId) => customTableById(tableId)).filter(Boolean)
  if (!tables.length) return { rowDimensions: [], columns: [] }
  const [reference, ...others] = tables
  const rowDimensions = reference.rowDimensions
    .map((group) => ({
      id: group.id,
      name: group.name,
      values: group.values
        .filter((value) => others.every((table) => table.rowDimensions.some((candidate) => candidate.id === group.id && candidate.values.some((item) => item.id === value.id))))
        .map((value) => ({ ...value }))
    }))
    .filter((group) => group.values.length)
  const columns = reference.columns
    .filter((column) => others.every((table) => table.columns.some((candidate) => candidate.id === column.id)))
    .map((column) => ({ ...column }))
  return { rowDimensions, columns }
}

export function applyCustomTableBatchSelection(rules = [], selection = {}) {
  const selectedRows = unique(selection.rowFieldIds || [])
  const selectedColumns = unique(selection.columnFieldIds || [])
  const normalizedRules = normalizeCustomDataRules(rules)
  const skipped = []
  normalizedRules.forEach((rule) => {
    const resolved = customTableById(rule.tableId)
    if (!resolved) return
    const availableRowIds = new Set(resolved.rows.map((row) => row.id))
    const availableColumnIds = new Set(resolved.columns.map((column) => column.id))
    const missingRowFieldIds = selectedRows.filter((id) => !availableRowIds.has(id))
    const missingColumnFieldIds = selectedColumns.filter((id) => !availableColumnIds.has(id))
    if (missingRowFieldIds.length || missingColumnFieldIds.length) {
      const rowNameById = new Map(CUSTOM_TABLE_CATALOG.flatMap((table) => table.rows.map((item) => [item.id, item.name])))
      const columnNameById = new Map(CUSTOM_TABLE_CATALOG.flatMap((table) => table.columns.map((item) => [item.id, item.name])))
      const missingDetails = []
      if (missingRowFieldIds.length) missingDetails.push('缺少行字段：' + missingRowFieldIds.map((id) => rowNameById.get(id) || id).join('、'))
      if (missingColumnFieldIds.length) missingDetails.push('缺少列字段：' + missingColumnFieldIds.map((id) => columnNameById.get(id) || id).join('、'))
      skipped.push({
        tableId: rule.tableId,
        tableName: resolved.name,
        missingRowFieldIds,
        missingColumnFieldIds,
        reason: missingDetails.join('；')
      })
    }
  })
  if (skipped.length) return { rules: normalizedRules, appliedTableIds: [], skipped }
  return {
    rules: normalizedRules.map((rule) => ({ ...rule, logic: CUSTOM_TABLE_AUTH_LOGIC, rowFieldIds: selectedRows, columnFieldIds: selectedColumns })),
    appliedTableIds: normalizedRules.map((rule) => rule.tableId),
    skipped: []
  }
}

export function customRulesSignature(rules = []) {
  const canonicalRules = normalizeCustomDataRules(rules)
    .map((rule) => ({
      tableId: rule.tableId,
      rowFieldIds: [...rule.rowFieldIds].sort(),
      columnFieldIds: [...rule.columnFieldIds].sort()
    }))
    .sort((left, right) => left.tableId.localeCompare(right.tableId))
  return JSON.stringify(canonicalRules)
}

hydrateCustomTableTags()
