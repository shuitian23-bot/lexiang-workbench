import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { isPocSandbox } from './config/runtimeMode'

// 当前 Vue 版继续复用封板工作台样式合同，只迁工程边界，不重画 UI。
import './assets/workbench.css'
import './assets/workbench-original-lock.css'
import './assets/workbench-prd-modules.css'
import './assets/workbench-ui-polish.css'
import './assets/workbench-preview-overrides.css'
import './assets/vue-shell-adapter.css'

// Built demo documents cannot contact APIs even if a future consumer adds a request.
// Dev keeps Vite's HMR connection; browser regression also asserts zero demo API calls.
if (isPocSandbox && import.meta.env.PROD) {
  const policy = document.createElement('meta')
  policy.httpEquiv = 'Content-Security-Policy'
  policy.content = "connect-src 'none'; form-action 'none'"
  document.head.append(policy)
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
