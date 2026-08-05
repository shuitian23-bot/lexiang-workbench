import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'

// ⚠️ 这 5 个 CSS 在 index.html 里也用 <link> 引了一遍(重复加载，约 500KB 打进产物 CSS)。
// 想去重就把这 5 行整体注释掉——index.html 的 link 已覆盖全部 5 个，不会掉样式。
// 别只注释一部分：original-lock / prd-modules 曾经没有 link 兜底，漏掉会让 .prd-* 那套
// (搜索后台 6 页 + 风控 5 页)样式失效。
import '../../public/admin/workbench.css'
import '../../public/admin/workbench-original-lock.css'
import '../../public/admin/workbench-prd-modules.css'
import '../../public/admin/workbench-ui-polish.css'
import '../../public/admin/workbench-preview-overrides.css'

// Element Plus 主题变量(对齐品牌色)。EP 组件本身按需自动引入，见 vite.config.js
import './styles/element-theme.css'

createApp(App).use(router).mount('#app')
