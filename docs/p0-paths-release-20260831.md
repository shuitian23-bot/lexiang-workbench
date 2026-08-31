# P0 第二阶段发布记录

2026-08-31；代码提交 b67c183a，前一版本 a0046328。八入口共规范化 525 处直接资源引用，保留脚本顺序、base、原版本参数和全部非目标属性/内联内容，JS/CSS 文件内容不变。

验证：内容指纹检查；八份 HTML 结构与内联内容一致；同尺寸桌面首页导航/输入框/卡片几何一致（轮播标题不同时间状态不作像素一致结论）；五入口正常；八条旧地址 302 并保留查询参数；所有资源返回 200，assets 下的指纹资源使用 immutable，根目录客服脚本继续重新验证，无指纹资源重新验证；旧 /frontend/ 别名保留；/_lxdiag 仍为 410。

备份与证明文件：/opt/projects/lexiang/backups/p0-paths-20260831，包含 entries-before、asset-proof.json、before-hashes.json、p0.nginx.before.conf、p0.nginx.after.conf、rollout-result.json、nginx-result.json、http-verification.json。

回滚：在独立工作区逆向应用 b67c183a 的变更，解决与最新线上内容的冲突后再合并；Nginx 逆向应用 docs/p0-cache-paths.patch，nginx -t 通过后平滑 reload。重定向使用 302，避免永久缓存妨碍回滚。初次线上检查发现目录首页的内部 index 跳转与外部重定向冲突，已回退旧路由后修正：只在 request_uri 是用户直接访问旧 HTML 时返回 302，内部首页解析正常交给 try_files。修正版先在独立 Nginx 18083 端口验证，再上线通过五个目录首页及八个旧入口检查。不要用整包旧文件覆盖线上。

本轮没有优化业务模块加载时机、拆分 CSS 或接通本地 API，不能把本地静态检查当完整交易/AI 回归，也不承诺性能提升百分比。
