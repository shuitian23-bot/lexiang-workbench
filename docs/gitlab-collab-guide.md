# GitLab 多人协作指南（leaibot 项目）

> 仓库地址：https://gitlab.xpaas.lenovo.com/lcpoc/leaibot
> 适用对象：所有参与门户工作台 / leaibot 源码协作的同事，包括零基础同学。
> 一句话原则：**GitLab 是代码的唯一事实源；main 分支受保护，所有改动走分支 + Merge Request 合入。**

---

## 一、开始之前（每人一次性准备）

### 1. 账号与权限

- 内部 GitLab 用联想域账号登录，无需注册。
- 找项目管理员（Liz）把你加为项目成员：项目页 → **Manage → Members → Invite members**。
- 角色建议：
  | 角色 | 给谁 | 能做什么 |
  |---|---|---|
  | Maintainer | 项目负责人（Liz） | 合并 MR、改保护规则、管理成员 |
  | Developer | 日常开发同事 | 推功能分支、发起 MR，**不能直接推 main** |
  | Reporter | 只看代码的同学 | 只读 |

### 2. 网络要求

- 需要联想内网或 VPN（`gitlab.xpaas.lenovo.com` 是内网地址）。
- ⚠️ 如果你电脑开了科学上网代理（Clash/FlyClash 等），git 操作可能报 TLS 错误或 502。解决：在仓库目录执行一次
  ```bash
  git config http.proxy ""
  ```

### 3. 创建访问令牌（PAT）

克隆和推送需要 Personal Access Token（不是登录密码）：

1. 打开 https://gitlab.xpaas.lenovo.com/-/user_settings/personal_access_tokens
2. **Add new token**，名称随意，Scopes 勾选 `read_repository` + `write_repository`
3. 复制生成的令牌并保存好（只显示一次）

⚠️ 常见坑：个人资料页还有一个 `glft-` 开头的 **Feed Token**，那是 RSS 订阅用的，**不能**用来推代码。

### 4. 克隆仓库

```bash
git clone https://gitlab.xpaas.lenovo.com/lcpoc/leaibot.git
cd leaibot
git config user.name "你的名字"
git config user.email "你的联想邮箱"
```

首次操作会要求输入用户名和密码：用户名填 `oauth2`，密码粘贴你的令牌。macOS 会自动记入钥匙串，之后不再询问。

### 5. 本地跑起来

```bash
npm install
# 向 Liz 索取 .env 文件放到项目根目录（含 API 密钥，不在仓库里，也永远不要提交）
node server.js   # 默认端口见 .env 的 PORT
```

---

## 二、日常协作流程（每次改动都走这个循环）

```
拉最新 main → 开功能分支 → 改代码 → 提交推送 → 发起 MR → 评审合并 → 删除分支
```

### 1. 开工前先拉最新

```bash
git checkout main
git pull origin main
```

### 2. 开功能分支

```bash
git checkout -b feat/skill-manager-switch   # 分支名见下方规范
```

分支命名规范：

| 前缀 | 用途 | 示例 |
|---|---|---|
| `feat/` | 新功能 | `feat/poc-log-modal` |
| `fix/` | 修 bug | `fix/lead-score-style` |
| `docs/` | 文档 | `docs/prd-update` |
| `chore/` | 构建/配置/杂项 | `chore/gitignore` |

### 3. 提交（小步提交，见名知意）

```bash
git add -A
git commit -m "feat: 技能包管理改为开关式启停"
```

提交信息格式：`类型: 中文简述`，类型用 `feat / fix / docs / chore / refactor`。一次提交只做一件事，方便回滚和评审。

### 4. 推送分支并发起 Merge Request

```bash
git push -u origin feat/skill-manager-switch
```

推送后终端会显示一个创建 MR 的链接，点开（或在 GitLab 页面点 **Create merge request**）：

- **标题**：和主要提交信息一致
- **描述**：改了什么、为什么改、怎么验证（贴预览链接或截图更好）
- **Assignee / Reviewer**：指给负责合并的人（Liz）
- 勾选 **Delete source branch when merge request is accepted**（合并后自动删分支）

### 5. 评审与合并

- Reviewer 在 MR 页面看 diff、留评论；需要修改就继续在同一分支上提交推送，MR 自动更新。
- 评审通过后由 Maintainer 点 **Merge**。
- **禁止**为了图快直接推 main——main 已设保护，推不上去是正常的，不是你操作错了。

### 6. 合并后同步

其他人执行 `git pull origin main` 获取最新代码，再基于新 main 开自己的分支。

---

## 三、冲突与防覆盖（重要，历史上出过覆盖事故）

1. **push 被 rejected**：说明远端有新提交，执行
   ```bash
   git pull --rebase origin main
   # 有冲突时按提示改文件 → git add 冲突文件 → git rebase --continue
   git push
   ```
2. **不要裸奔工作区**：改完当天必须 commit + push；未提交的本地改动等于随时会被覆盖丢失。
3. **热点文件先打招呼**：`server.js`、`public/admin/*`、`core/*` 是多人高频区，动手前在群里说一声，避免两人同时大改同一文件。
4. **禁止整文件覆盖式操作**（直接 cp 覆盖、AI 整文件重写）之前，先 `git diff` 确认没有别人的改动混在里面；发现不认识的改动 → 停手，先沟通。
5. AI 工具（Claude/Codex）产生的改动同样必须走分支 + MR，规则对人和 AI 一视同仁。

---

## 四、GitLab 与服务器部署的关系（必读，避免误解）

当前部署链路和 GitLab **没有自动关联**：

| 环境 | 位置 | 更新方式 |
|---|---|---|
| 预览站 | `new.leaibot.cn` ↔ 服务器 `/opt/projects/lexiang-new` | 服务器直连修改/同步 |
| 正式站 | `leaibot.cn` ↔ 服务器 `/opt/projects/lexiang` | 预览确认后手动合并 |
| GitLab | `lcpoc/leaibot` | 多人协作的源码库 |

- **push 到 GitLab ≠ 上线**。上线仍走既定流程：先更新 new 预览站 → 人工确认 → 明确要求后合并正式站。
- 服务器上的改动和 GitLab 需要**双向人工同步**（rsync）。谁改了服务器，谁负责把改动同步回 GitLab 的分支/MR，保持两边一致。
- 上线到正式站的改动，须同步更新站内 POC 调整日志（一条/完整功能，状态从"已更新 new 预览"改为"已合并正式"）。

## 五、不能进仓库的东西（.gitignore 已配置，注意别绕过）

- `.env` 及一切密钥/口令（API key、密码、token）
- `node_modules/`、数据库文件（`*.db`、`lexiang.hnsw*`）、`uploads/`、`backups/`、日志
- 大体积二进制包、他人未提交的工作区文件
- 新增配置项时：代码里读 `process.env.XXX`，并在 MR 描述中说明需要在 `.env` 增加什么

## 六、常见问题速查

| 现象 | 原因 | 解决 |
|---|---|---|
| `TLS/SSL 错误` 或 `502 Bad Gateway` | 走了科学上网代理 | `git config http.proxy ""` |
| `HTTP Basic: Access denied` | 令牌错误/过期/拿成 Feed Token | 重建 PAT，勾 `write_repository` |
| `You are not allowed to force push` | main 受保护 | 正常现象，走分支 + MR |
| `push rejected (non-fast-forward)` | 远端有新提交 | `git pull --rebase origin main` |
| 克隆很慢/超时 | 没连内网/VPN | 先连 VPN |

---

*最后更新：2026-07-03。流程有调整时请同步更新本文档。*
