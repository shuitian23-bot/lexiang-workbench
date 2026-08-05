import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'

// ⚠️ 这 5 个 CSS 在 index.html 里也用 <link href="/admin/*.css"> 引了一遍(重复加载，
// 约 500KB 打进产物 CSS)。想去重可以把这 5 行整体注释掉，index.html 的 link 覆盖全部 5 个。
// 别只注释一部分：original-lock / prd-modules 漏掉会让 .prd-* 那套(搜索后台6页+风控5页)失效。
//
// 注意：注释掉后就完全依赖 index.html 那几个 /admin/*.css 链接，而它们由后端 Express 提供，
// 本地 `npm run dev` 必须有 vite.config.js 里的 '/admin/' 代理才拿得到(已配)，否则页面裸奔。
import '../../public/admin/workbench.css'
import '../../public/admin/workbench-original-lock.css'
import '../../public/admin/workbench-prd-modules.css'
import '../../public/admin/workbench-ui-polish.css'
import '../../public/admin/workbench-preview-overrides.css'

// Element Plus 主题变量(对齐品牌色)。EP 组件本身按需自动引入，见 vite.config.js
import './styles/element-theme.css'

createApp(App).use(router).mount('#app')
