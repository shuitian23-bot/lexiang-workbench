export const AGREEMENT_PRODUCT_RELATIONS = [
  {
    date: '2026-09-24',
    no: 'T0260924016001',
    name: 'SI发布ECAI-2',
    products: [
      { id: '626076763600273408', name: 'ThinkCentre M730q-D116 i5-10500T 8G512', quantity: 100, materialGroup: '03', role: '主品', relation: 'none', bindingRatio: '0', parentId: '' },
      { id: '626076907712368640', name: '启天M455 B760 PCI RPL+ADL 13.6升', quantity: 100, materialGroup: '03', role: '服务商品', relation: 'none', bindingRatio: '0', parentId: '' }
    ]
  },
  {
    date: '2026-09-23',
    no: 'T0260916003003',
    name: '服务产品发布ECAI',
    products: [
      { id: '625720481710145538', name: '启天M630 Q470 13.6升', quantity: 100, materialGroup: '03', role: '主品', relation: 'none', bindingRatio: '0', parentId: '' },
      { id: '625720481710145537', name: 'WARRANTY 启天主机五年全保上门服务', quantity: 300, materialGroup: '03', role: '服务商品', relation: 'none', bindingRatio: '0', parentId: '' }
    ]
  }
]

function searchable(group) {
  return [group.date, group.no, group.name, ...group.products.flatMap(product => [product.id, product.name, product.role])]
    .join(' ')
    .toLowerCase()
}

export function filterAgreementProductRelations(query, groups = AGREEMENT_PRODUCT_RELATIONS) {
  const keyword = String(query || '').trim().toLowerCase()
  if (!keyword) return groups
  return groups.filter(group => searchable(group).includes(keyword))
}

export function validateAgreementGroup(group) {
  const eligibleMainIds = new Set(group.products.filter(product => product.role === '主品').map(product => product.id))
  return Object.fromEntries(group.products.flatMap((product) => {
    if (product.relation === 'none') return []
    const errors = {}
    if (!/^[1-9]\d*$/.test(String(product.bindingRatio || '').trim())) {
      errors.bindingRatio = '捆绑比例必须为正整数'
    }
    const parentId = String(product.parentId || '').trim()
    if (!parentId) {
      errors.parentId = '请选择或填写主品产品标识'
    } else if (parentId === product.id) {
      errors.parentId = '产品不能绑定到自身'
    } else if (!eligibleMainIds.has(parentId)) {
      errors.parentId = '请选择当前协议中的主品产品标识'
    }
    return Object.keys(errors).length ? [[product.id, errors]] : []
  }))
}
