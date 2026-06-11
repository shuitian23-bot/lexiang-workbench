# 给观的协作工作流（一页版）

> 背景：你的 AI 在你 Mac 本地的镜像文件（如 `app.leaibot-current.js`）上改完直接传服务器——那个目录没有 git、没有编辑锁，每次上传都是「盲覆盖」，已多次互相覆盖代码。服务器上其实有**每分钟自动部署**：push 到 GitHub main，1 分钟内自动 pull + 重启。所以正确姿势比现在的还省事。

## 推荐工作流（本地改，push 即上线）

```bash
# 一次性：clone 真仓库到本地（替代你现在的镜像文件目录）
git clone git@github.com:shuitian23-bot/lexiang-workbench.git
cd lexiang-workbench

# 每次开工
git pull origin main                      # 先拉最新（必须！）
# ……改代码（前端：public/css/main.css 样式 / public/js/app.js 逻辑 / public/index.html 结构）
git add -A && git commit -m "fix: 描述" && git push origin main
# 1 分钟内服务器自动 pull + pm2 restart，线上生效
```

把这段话术贴给你的 AI（codex/claude）即可：
> 「本项目是 git 仓库，开工先 `git pull origin main`，改完必须 `git add -A && git commit && git push origin main`，不要用任何方式直接上传/覆盖服务器文件。改样式去 public/css/main.css，改逻辑去 public/js/app.js，改完在 public/changelog.json 当天条目里用大白话补一条并署名——观。」

## 如果一定要直接在服务器上改

ssh 到服务器后在 `/opt/projects/lexiang` 里改（那里有完整 git + 编辑锁）：
```bash
bash scripts/edit-lock.sh claim 观 public/css/main.css   # 先占锁
# ……改……
git add -A && git commit -m "..." && git push origin main
bash scripts/edit-lock.sh release 观
```

## 兜底（已自动生效，无需操作）

服务器每 5 分钟自动把任何未提交的裸改 commit+push 入库（`auto-checkpoint`），所以即使流程没走对，改动也不会丢、可回滚。但**别依赖它**——它救不了「两个人同时改同一文件互相覆盖」的瞬间。

## 三条铁律

1. 改前必 `git pull`，改后必 `commit + push`
2. 不要绕过 git 直接覆盖服务器文件（scp/rsync/手动粘贴整文件都算）
3. 前端样式 → `main.css`，逻辑 → `app.js`，每人改自己领域文件，冲突自然消失
