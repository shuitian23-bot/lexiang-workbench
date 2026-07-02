---
name: lexiang-release
description: lexiang 前端/后端改动的发布一条龙清单(锁→改→版本→changelog→哨兵→提交→烟测)。任何要上线到 leaibot.cn 的改动都按此走,漏一步就是事故(main.css 修复曾两次被并发覆盖丢失)。
---

# lexiang 发布一条龙

按序执行,不跳步:

## 1. 锁 + 拉
```bash
cd /opt/projects/lexiang
bash scripts/edit-lock.sh claim <你的标识> public/js/app.js   # 改哪个热点文件锁哪个
git pull origin main
```
热点文件:index.html / main.css / app.js / app-intent.js / app-conv.js / app-lxfd.js / portal.js / server.js / core/*。
**先锁后改**——曾有编辑完才锁、提交前被并发旧 buffer 覆盖、修复根本没进 commit 的事故。

## 2. 改 + 语法查
```bash
node --check public/js/<改过的>.js
# 意图规则改动: node -e 'const I=require("./public/js/app-intent.js");console.log(I.matchControl("..."))'
```

## 3. 版本 bump(前端必做,四文件版本号保持一致)
index.html 里 `?v=YYYYMMDDNN` 递增:app-intent.js / app-conv.js / app.js / app-lxfd.js / main.css 改了哪个 bump 哪个。
加载顺序不可变:**app-intent → app-conv → app.js → app-lxfd**。

## 4. changelog(大白话,详见 lexiang-changelog skill)
public/changelog.json 当日 items 追加,署名「——白羽」(或改动者)。

## 5. 哨兵登记(新功能必做)
上线重要功能往 `scripts/guard-markers.txt` 加一行:`文件|唯一代码串|功能名`。
cron 每 2 分钟巡检,标记丢失(=被覆盖)自动飞书告警。

## 6. 提交推送(立即,不夹其他操作)
```bash
git add <明确列出自己的文件>   # 别 add -A——工作区常有他人未提交改动
git commit -m "fix|feat|refactor|chore: 描述"
git push origin main            # cron 1分钟内自动部署前端
bash scripts/edit-lock.sh release <你的标识> <文件>
```
提交后验修复真进了库:`git show HEAD:<文件> | grep <标记>`。

## 7. 后端改动额外一步
server.js / routes/* / core/* 改动 cron 不会自动 reload:
```bash
sudo pm2 reload lexiang        # 平滑重载,确认目标是 lexiang(id 2),别碰 lexiang-new
# reload 后健康: until curl -s localhost:3001/health | grep -q ok; do sleep 2; done 或看 200
```

## 8. 真机烟测(按 lexiang-smoke skill 的模板和踩坑库)
最低标准:改动路径真机走一遍 + 页面 JS 报错为零 + (闭环类)官方 API 调用拦截为零。

## 回滚
```bash
git revert <坏提交> && git push   # 前端等 cron;后端补 sudo pm2 reload lexiang
```
大事故参照 lexiang-deploy skill 的 backup 恢复流程。
