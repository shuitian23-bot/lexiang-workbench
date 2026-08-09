export interface PermissionCatalogItem {
  id: string
  name: string
  group: string
  page: string
  description: string
}

export interface PermissionScopeRole {
  id: string
  name: string
  description: string
  desc: string
  owner: string
  functionIds: string[]
  functionPermissionIds: string[]
  dataIds: string[]
  dataPermissionIds: string[]
}

export interface CopyablePermissionUser {
  itcode: string
  name: string
  roleIds: string[]
  extraDataPermissionIds: string[]
}

export const PERMISSION_SCOPE_TENANTS = ['leaibot-cn', 'shop-chat', 'b-chat', 'biz-chat'] as const

const functionPermissions: PermissionCatalogItem[] = [
  { id: 'func.dashboard.view', name: '查看运营总览', group: '乐享运营', page: '运营总览', description: '查看运营总览页面与核心指标。' },
  { id: 'func.report.generate', name: '报告生成', group: '乐享运营', page: '运营总览', description: '生成并查看运营分析报告。' },
  { id: 'func.data.export', name: '数据导出', group: '乐享运营', page: '流量分析', description: '导出当前权限范围内的数据。' },
  { id: 'func.product.config', name: '商品配置', group: '乐享运营', page: 'GMV 分析', description: '维护商品和推荐位配置。' },
  { id: 'func.publish.confirm', name: '发布确认', group: '乐享运营', page: 'GMV 分析', description: '确认商品上下架和发布操作。' },
  { id: 'func.geo.monitor', name: 'GEO 信源监测', group: 'GEO 看板', page: '各平台信源分布', description: '查看信源分布和引用趋势。' },
  { id: 'func.lead.assign', name: '线索分配', group: '企业客户管理', page: '线索池', description: '分配并跟进企业客户线索。' },
  { id: 'func.skill.manage', name: 'Skill 管理', group: 'AI 助手', page: 'Skill Hub', description: '管理工作台 Skill。' }
]

const dataPermissions: PermissionCatalogItem[] = [
  { id: 'data.ops.region.east', name: '华东区', group: '乐享运营', page: '运营总览', description: '华东区域的运营指标数据。' },
  { id: 'data.ops.region.north', name: '华北区', group: '乐享运营', page: '运营总览', description: '华北区域的运营指标数据。' },
  { id: 'data.ops.region.south', name: '华南区', group: '乐享运营', page: '运营总览', description: '华南区域的运营指标数据。' },
  { id: 'data.member.profile.level', name: '会员等级', group: '乐享运营', page: '运营总览', description: '会员等级画像数据。' },
  { id: 'data.member.profile.rights', name: '权益使用', group: '乐享运营', page: '运营总览', description: '会员权益使用数据。' },
  { id: 'data.ops.metric.flow', name: '流量转化', group: '乐享运营', page: '流量分析', description: '流量及转化指标。' },
  { id: 'data.ops.metric.gmv', name: 'GMV 指标', group: '乐享运营', page: 'GMV 分析', description: 'GMV 及相关经营指标。' },
  { id: 'data.geo.source.official', name: '官方信源', group: 'GEO 看板', page: '各平台信源分布', description: '官方渠道信源数据。' },
  { id: 'data.geo.source.community', name: '社区信源', group: 'GEO 看板', page: '各平台信源分布', description: '社区渠道信源数据。' },
  { id: 'data.lead.pool.all', name: '全部线索', group: '企业客户管理', page: '线索池', description: '全部企业客户线索。' },
  { id: 'data.lead.pool.assigned', name: '已分配线索', group: '企业客户管理', page: '线索池', description: '当前账号已分配的企业线索。' }
]

function createRole(id: string, name: string, description: string, owner: string, functionIds: string[], dataIds: string[]): PermissionScopeRole {
  return {
    id,
    name,
    description,
    desc: description,
    owner,
    functionIds: [...functionIds],
    functionPermissionIds: [...functionIds],
    dataIds: [...dataIds],
    dataPermissionIds: [...dataIds]
  }
}

const roles = [
  createRole('ops-pm', '运营分析 PM', '可查看运营总览、生成报告，并使用常用运营数据。', 'zhangjq4', ['func.dashboard.view', 'func.report.generate', 'func.data.export'], []),
  createRole('product-op', '商品运营', '可配置商品、推荐位、价格和上下架策略。', 'huangjq5', ['func.dashboard.view', 'func.product.config', 'func.publish.confirm'], ['data.ops.region.north', 'data.ops.metric.gmv']),
  createRole('geo-analyst', 'GEO 分析师', '可查看信源、引用和搜索表现数据。', 'zhangxy43', ['func.geo.monitor', 'func.report.generate'], ['data.geo.source.official', 'data.geo.source.community']),
  createRole('lead-operator', '线索运营', '可查看企业客户线索并进行分配跟进。', 'sunll1', ['func.lead.assign', 'func.data.export'], []),
  createRole('admin', 'admin', '覆盖权限申请、审批、用户、组织、数据源、功能配置和审计类能力。', 'admin', functionPermissions.map((permission) => permission.id), dataPermissions.map((permission) => permission.id)),
  createRole('bpo-collab', '外包协作', '受限菜单和脱敏数据，仅保留必要操作。', 'wangxt8', ['func.dashboard.view'], ['data.ops.region.south'])
]

const copyableUsers: CopyablePermissionUser[] = [
  { itcode: 'wangxt8', name: '王晓婷', roleIds: ['ops-pm', 'geo-analyst'], extraDataPermissionIds: ['data.member.profile.level'] },
  { itcode: 'liwen08', name: '李雯', roleIds: ['product-op'], extraDataPermissionIds: ['data.member.profile.rights'] },
  { itcode: 'temp-bpo', name: '外部协作账号', roleIds: ['bpo-collab'], extraDataPermissionIds: [] }
]

const clonePermission = (permission: PermissionCatalogItem) => ({ ...permission })
const cloneRole = (role: PermissionScopeRole) => ({
  ...role,
  functionIds: [...role.functionIds],
  functionPermissionIds: [...role.functionPermissionIds],
  dataIds: [...role.dataIds],
  dataPermissionIds: [...role.dataPermissionIds]
})

export function createPermissionScopeCatalog() {
  const clonedRoles = roles.map(cloneRole)
  return {
    tenantOptions: [...PERMISSION_SCOPE_TENANTS],
    roles: clonedRoles,
    functionPermissions: functionPermissions.map(clonePermission),
    dataPermissions: dataPermissions.map(clonePermission),
    copyableUsers: copyableUsers.map((user) => {
      const inheritedDataIds = [...new Set(clonedRoles
        .filter((role) => user.roleIds.includes(role.id))
        .flatMap((role) => role.dataPermissionIds))]
      return {
        ...user,
        roleIds: [...user.roleIds],
        extraDataPermissionIds: [...user.extraDataPermissionIds],
        dataPermissions: [
          ...inheritedDataIds.map((id) => ({ id, source: '角色继承' as const })),
          ...user.extraDataPermissionIds
            .filter((id) => !inheritedDataIds.includes(id))
            .map((id) => ({ id, source: '用户单独授权' as const }))
        ]
      }
    })
  }
}

export function groupDataPermissionsByDirectory(source: PermissionCatalogItem[]) {
  const directoryMap = new Map<string, PermissionCatalogItem[]>()
  source.forEach((permission) => {
    const datasets = directoryMap.get(permission.group) || []
    datasets.push(permission)
    directoryMap.set(permission.group, datasets)
  })
  return [...directoryMap.entries()].map(([directory, datasets]) => ({
    id: directory,
    name: directory,
    datasets: datasets.map(clonePermission)
  }))
}

export function groupPermissionCatalog(source: PermissionCatalogItem[], keyword = '') {
  const normalizedKeyword = keyword.trim().toLowerCase()
  const filtered = source.filter((permission) => [permission.name, permission.description, permission.group, permission.page].join(' ').toLowerCase().includes(normalizedKeyword))
  const groupMap = new Map<string, Map<string, PermissionCatalogItem[]>>()
  filtered.forEach((permission) => {
    const pageMap = groupMap.get(permission.group) || new Map<string, PermissionCatalogItem[]>()
    const pagePermissions = pageMap.get(permission.page) || []
    pagePermissions.push(permission)
    pageMap.set(permission.page, pagePermissions)
    groupMap.set(permission.group, pageMap)
  })
  return [...groupMap.entries()].map(([group, pages]) => ({
    id: group,
    name: group,
    children: [...pages.entries()].map(([page, permissions]) => ({ id: `${group}-${page}`, name: page, children: permissions }))
  }))
}
