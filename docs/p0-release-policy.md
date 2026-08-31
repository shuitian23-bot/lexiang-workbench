# P0 发布边界（第一阶段）

只发布审查过的五频道、兼容旧入口、assets 和当前商品资料目录。使用 `python3 scripts/p0-release.py --root public/leaip0` 检查，或者加 `--output /独立新目录/leaip0` 生成干净发布目录及相邻 SHA-256 manifest。此工具不部署，不改线上，不允许覆写已有输出目录。

排除 `.codex-backups`、`.bak*`、`.backup-*`、AppleDouble、.DS_Store、.env、.git。未知根级文件会失败，需人工确认并更新允许列表。保留 assets 子目录和商品资料结构，不能依据前端静态引用删除数据文件。

五频道入口必须存在，直接引用的 JS/CSS 必须包含于发布集合；禁止旧的 lx-boot-guard 全量存储诊断。禁止全量读取 cookie/localStorage/sessionStorage 上报或自动清空；如确有诊断需求，应单独设计脱敏白名单并审查日志权限和保留周期。

备份保存在 Web 根目录之外 `/opt/projects/lexiang/backups/p0-public-cleanup-20260831-1130`，先核对 manifest 再迁移。不得用旧本地文件整包覆盖线上。以 Git 合并、冲突检测和生产当前哈希检查保护多人改动。

本阶段不改变样式、频道业务脚本和页面 URL；旧入口继续可用。仅将 Nginx 的旧诊断接收入口 /_lxdiag 改为 410，停止保存请求正文；已通过 nginx -t 和平滑 reload。后续阶段再统一资源路径、缓存版本及模块边界。
