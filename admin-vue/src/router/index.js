import { createRouter, createWebHistory } from 'vue-router'
import DashboardOverview from '../views/DashboardOverview.vue'

// 逐页转 SFC，统一在此挂路由。路径对应原 workbench pageId（dot → slash）。
const routes = [
  { path: '/', redirect: '/dashboard/overview' },

  // 门户首页
  { path: '/portal/home', component: () => import('../views/PortalHome.vue') },

  // 乐享运营
  { path: '/dashboard/overview', component: DashboardOverview },
  { path: '/dashboard/query',    component: () => import('../views/DashboardQuery.vue') },
  { path: '/dashboard/behavior', component: () => import('../views/DashboardBehavior.vue') },
  { path: '/pipeline/annotate',  component: () => import('../views/PipelineAnnotate.vue') },
  { path: '/pipeline/quality',   component: () => import('../views/PipelineQuality.vue') },

  // Skill Hub / 权限
  { path: '/agent/skills',      component: () => import('../views/AgentSkills.vue') },
  { path: '/agent/skillCreate', component: () => import('../views/AgentSkillCreate.vue') },
  { path: '/agent/permissions', component: () => import('../views/AgentPermissions.vue') },

  // 报告
  { path: '/report/overview', component: () => import('../views/ReportOverview.vue') },
  { path: '/report/detail',   component: () => import('../views/ReportDetail.vue') },
  { path: '/report/quality',  component: () => import('../views/ReportQuality.vue') },

  // GEO 看板
  { path: '/dashboard/geo',           component: () => import('../views/GeoOverview.vue') },
  { path: '/dashboard/geoSource',     component: () => import('../views/GeoSource.vue') },
  { path: '/dashboard/geoIntent',     component: () => import('../views/GeoIntent.vue') },
  { path: '/dashboard/geoConversion', component: () => import('../views/GeoConversion.vue') },
  { path: '/dashboard/geoKnowledge',  component: () => import('../views/GeoKnowledge.vue') },

  // 在职员工管理
  { path: '/employee/overview',      component: () => import('../views/EmployeeOverview.vue') },
  { path: '/employee/list',          component: () => import('../views/EmployeeList.vue') },
  { path: '/employee/certification', component: () => import('../views/EmployeeCertification.vue') },
  { path: '/employee/detail',        component: () => import('../views/EmployeeDetail.vue') },

  // 企业客户管理（线索）
  { path: '/lead/dashboard', component: () => import('../views/LeadDashboard.vue') },
  { path: '/lead/pool',      component: () => import('../views/LeadPool.vue') },
  { path: '/lead/score',     component: () => import('../views/LeadScore.vue') },

  // 搜索后台
  { path: '/search/categories', component: () => import('../views/SearchCategories.vue') },
  { path: '/search/filters',    component: () => import('../views/SearchFilters.vue') },
  { path: '/search/activity',   component: () => import('../views/SearchActivity.vue') },
  { path: '/search/express',    component: () => import('../views/SearchExpress.vue') },
  { path: '/search/dictionary', component: () => import('../views/SearchDictionary.vue') },
  { path: '/search/box',        component: () => import('../views/SearchBox.vue') },

  // 风控管理
  { path: '/risk/overview', component: () => import('../views/RiskOverview.vue') },
  { path: '/risk/strategy', component: () => import('../views/RiskStrategy.vue') },
  { path: '/risk/limit',    component: () => import('../views/RiskLimit.vue') },
  { path: '/risk/dpl',      component: () => import('../views/RiskDpl.vue') },
  { path: '/risk/data',     component: () => import('../views/RiskData.vue') },

  // 运营分析
  { path: '/ops/traffic',  component: () => import('../views/OpsTraffic.vue') },
  { path: '/ops/gmv',      component: () => import('../views/OpsGmv.vue') },
  { path: '/ops/keywords', component: () => import('../views/OpsKeywords.vue') },
  { path: '/ops/queryBiz', component: () => import('../views/OpsQueryBiz.vue') },

  { path: '/:pathMatch(.*)*', redirect: '/dashboard/overview' },
]

export default createRouter({
  history: createWebHistory('/admin-vue/'),
  routes
})
