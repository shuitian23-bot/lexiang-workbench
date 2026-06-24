import { createRouter, createWebHistory } from 'vue-router'
import DashboardOverview from '../views/DashboardOverview.vue'

const routes = [
  { path: '/', redirect: '/dashboard/overview' },
  { path: '/dashboard/overview', component: DashboardOverview },
  // 占位路由（后续转页时补充）
  { path: '/dashboard/geo', component: () => import('../views/Placeholder.vue') },
  { path: '/employee/overview', component: () => import('../views/EmployeeOverview.vue') },
  { path: '/lead/dashboard', component: () => import('../views/Placeholder.vue') },
  { path: '/search/categories', component: () => import('../views/Placeholder.vue') },
  { path: '/risk/overview', component: () => import('../views/Placeholder.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard/overview' },
]

export default createRouter({
  history: createWebHistory('/admin-vue/'),
  routes
})
