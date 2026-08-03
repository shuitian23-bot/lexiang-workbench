import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'

import '../../public/admin/workbench.css'
import '../../public/admin/workbench-original-lock.css'
import '../../public/admin/workbench-prd-modules.css'
import '../../public/admin/workbench-ui-polish.css'
import '../../public/admin/workbench-preview-overrides.css'

// Element Plus 主题变量(对齐品牌色)。EP 组件本身按需自动引入，见 vite.config.js
import './styles/element-theme.css'

createApp(App).use(router).mount('#app')
