# P0 资源与预览规则（第二阶段）

以 HTTP 模式为验收环境，不承诺 file:// 双击页面与线上等价。`python3 scripts/p0-preview.py --root public/leaip0 --port 8080` 启动仅本机访问的静态预览，不连接线上 API。

保留五频道和现有页面 URL。旧 .html 入口及频道 index.html 在 HTTP 下用 302 跳转到目录入口，并保留查询参数。旧文件暂不删除，保证可回滚；旧 /frontend/、/img/ 别名仍保留。

只把八入口直接声明的 script、stylesheet、script/style preload 统一成规范绝对路径，并追加 p0v=SHA256 前16位。原 v 参数、脚本顺序、内联内容、base 和业务代码均不改。修改资源后必须在独立工作区运行 `python3 scripts/p0-assets.py --root public/leaip0 --write`，再执行 `python3 scripts/p0-release.py --root public/leaip0`。不运行 --write 时只检查并在过期时失败。

服务器只对带 16 位 p0v 的资源启用长期 immutable；没有内容版本标识的资源每次重新验证，继续保留 gzip。这不能清除客户端此前已缓存的老资源，必要时首次强制刷新。动态加载资源本轮没有逐个添加内容版本，也没有改变业务加载时序。

Nginx 改动只限 P0 虚拟主机：本文件上方的 p0_asset_cache_policy map、三个静态资源 location 的缓存头及八个兼容重定向。通过语法测试后平滑 reload，不重启应用。
