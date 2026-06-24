import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'

import '../../public/admin/workbench.css'
import '../../public/admin/workbench-original-lock.css'
import '../../public/admin/workbench-prd-modules.css'
import '../../public/admin/workbench-ui-polish.css'
import '../../public/admin/workbench-preview-overrides.css'

createApp(App).use(router).mount('#app')
