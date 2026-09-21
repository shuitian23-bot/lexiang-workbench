# P0 实际业务模块迁移

发布代码在 `public/leaip0/modules/`：22 个页面、24 个弹窗和 2 个公共模块，每个模块一个 JS 和一个 CSS。这里是一次性迁移工具，不是第二套线上运行代码。

## 保持原有行为

- sources 保存原页面初始化代码；factories 保存对应业务函数。getter/setter 上下文让提取后的函数继续使用原有可变业务状态。
- 原脚本仍按原入口和懒加载触发点执行。注册模块只提供实现，不提前打开页面或弹窗。
- 原生 classic script 保留全局词法变量。执行脚本的 src 属性只用于兼容原有资源基址计算，不向旧地址发送请求。
- CSS 按业务归属保存，片段按原级联顺序在原锚点挂载。完全一致的规则片段可共用，重复出现的槽位仍重复挂载。
- 旧公开文件从 P0 移除，完整回撤通过 Git revert 恢复；非公开历史源码不再作为日常构建入口。

## 日常修改

直接修改对应模块，保留稳定的业务 factory ID 和样式片段 ID。不要修改历史源文件后执行旧打包流程。`scripts/build-p0-home-assets.cjs --check` 现在只校验新模块。

运行 `node scripts/validate-p0-public-assets.cjs` 检查 96 个实际文件、语法和所有 HTML 的资源引用。运行 `node scripts/check-p0-performance.cjs --report` 输出体积测量；不带 `--report` 时继续执行旧性能预算。2026-09-04 的预算在本次迁移前也已超限，不能把文件数量减少等同于首屏更快，也不能把测量模式当作性能验收通过。

## 首页场景轮播

个人及家庭 `/shop-chat/` 的轮播由 `pages/consumer-home/index.js` 直接创建在当前页面中，使用开放的 Shadow DOM 隔离通用 `.hero`、`.page` 样式，不再加载 iframe 页面。六个场景的数据、按钮和商品跳转在同一模块；样式在对应 `index.css` 的 `p0-personal-native-scene` 片段，注册项位于 `shared/common/index.js` 的 CSS 表中。

组件保留 980/1280 画布缩放和短屏高度规则。局部宽高断点使用容器查询，字号和间距使用 `cqw`，不能直接换回主窗口的 `vw`。校园标签的渐变使用 `background-image` 长写，避免 CSSOM 收集样式时背景简写与 `background-clip` 组合丢失。宿主重建时会清理旧计时器及尺寸监听并重新挂载。

场景背景统一从 `public/leaip0/assets/img/` 加载，包括移动场景 `personal-scene-mobile-lenovo-v3.png.webp` 和差旅场景 `personal-scene-travel-lenovo-v4.png.webp`。旧 `assets/components/` 已清理；模块注册表中保留的历史路径是兼容标识，不代表需要恢复同名静态目录。

中小企业 `/b-chat/`、政教及大企业 `/biz-chat/` 原本就是页面内轮播，继续使用现有模块。两频道也依赖 consumer-home 中的共用高度适配，不能把整个 consumer-home 模块当成仅个人频道代码删除。

## 门店与评价媒体

门店图片、图标和地图底图位于 `public/leaip0/assets/img/stores/`，门店模块与预约弹窗共享引用。评价演示视频位于 `assets/media/reviews/review-demo-v1.webm`，由商品详情模块的评价播放器加载。媒体原样迁移，旧 `assets/pages/` 内两个独立 HTML 和 gzip 副本已移除；旧目录不能作为页面模板运行依赖。改变懒加载模块时同步更新各首页模块内的 store-detail URL 版本及页面入口缓存版本，已有页面刷新后使用新资源地址。

## 一次性迁移重现

先在此目录安装 package.json 中的开发依赖，或通过 P0_NODE_MODULES、P0_POSTCSS_PATH、P0_PARSE5_PATH 指定已安装依赖。然后在隔离 Git 工作区根目录执行：

```
node scripts/p0-modules/migrate.cjs /absolute/path/to/version-pinned-baseline
```

该命令只接受原始 199 文件版基线，重新生成 96 个模块，并删除目标工作区中的旧文件。不要对已编辑过的新模块重跑，不要在生产目录运行。生成后必须重做浏览器对照。

## 回撤

完整备份另存于部署记录中的本地文件和服务器 `/tmp`，不放回 P0 公开目录。需要回撤时创建发布提交的反向提交，经正常 Git 合并恢复原入口和原 199 个文件。不要直接解压覆盖有他人并行改动的生产目录。
