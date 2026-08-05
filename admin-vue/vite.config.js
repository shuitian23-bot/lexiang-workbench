import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

// 本地 `npm run dev` 时，接口和原版 workbench 静态资源都不在 Vite 的服务范围内，
// 必须代理到后端，否则：
//   /api/*            → 404（登录、各页数据全挂）
//   /admin/*.css|js   → 404（原版 workbench 样式加载不到 → 页面裸奔无样式）
// 默认指向已部署的 new 环境；本机起了后端就 VITE_API_TARGET=http://127.0.0.1:3010 npm run dev
const API_TARGET = process.env.VITE_API_TARGET || 'https://new.leaibot.cn'

export default defineConfig({
  plugins: [
    vue(),
    // Element Plus 按需引入：用到哪个组件才打包哪个，不全量注册。
    // 在 .vue 里直接写 <el-button>、ElMessage.success() 即可，无需手动 import。
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] }),
  ],
  base: '/admin-vue/',
  server: {
    proxy: {
      // 注意 key 带结尾斜杠：'/admin/' 不会误匹配 '/admin-vue/...'（本工程自己的资源）
      '/api/': { target: API_TARGET, changeOrigin: true, secure: false },
      '/admin/': { target: API_TARGET, changeOrigin: true, secure: false },
    },
  },
  build: {
    outDir: '../public/admin-vue',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
