---
name: lexiang-deploy
description: lexiang 生产部署、回滚、PM2 操作、数据库备份恢复流程。部署/回滚/恢复数据/重启服务时必读。
---

# lexiang 部署与恢复

## 部署架构

- **生产**: leaiteam 服务器 `/opt/projects/lexiang`，PM2 fork 进程 `lexiang`，端口 3001
- **域名**: leaibot.cn + 8 个二级域名 wiki/leai/ai/biz/b/admin/shop/www，全 HTTPS
- **自动部署**: cron 每分钟 `git pull origin main && pm2 reload lexiang`（带 `--is-ancestor` 防循环）
- **每日备份**: 03:00 sqlite3 .backup → `/opt/backups/lexiang/`（保留 30 天）

## 日常部署

```bash
git push origin main
# cron 1 分钟内自动 pull + reload，无需手动
# 看日志
sudo pm2 logs lexiang --lines 50
```

## 后端代码必须 reload

改 `server.js` / `routes/` / `skills/` / `core/` / `db/` 后：
```bash
sudo pm2 reload lexiang
```
（push 了则 cron 自动 reload，不用手动。）前端文件保存即生效；js/css 已设协商缓存，无浏览器缓存顾虑。

**reload 前确认目标是 `lexiang` 进程，别误碰 `lexiang-shop / lenovo-shop` 等同名进程。**

## 回滚

```bash
git revert HEAD && git push origin main   # 等 cron 自动部署
# 或手动
cd /opt/projects/lexiang && git pull && sudo pm2 reload lexiang
```

## 数据库

`lexiang.db` 是 SQLite WAL 模式，改 schema 走 `db/migrations/`。

### Backup 紧急恢复

```bash
ls -lt /opt/backups/lexiang/ | head -5          # 列 backup
sudo pm2 stop lexiang
sudo rm /opt/projects/lexiang/lexiang.db /opt/projects/lexiang/lexiang.db-wal /opt/projects/lexiang/lexiang.db-shm
gunzip -c /opt/backups/lexiang/lexiang_YYYYMMDD_HHMMSS.db.gz > /opt/projects/lexiang/lexiang.db
sudo chown ubuntu:dev /opt/projects/lexiang/lexiang.db
sudo pm2 start lexiang
```
