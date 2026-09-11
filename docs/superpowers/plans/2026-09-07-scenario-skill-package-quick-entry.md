# Scenario Skill Package Quick Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click “创建场景技能包” entry to the account workspace and publish the isolated change to `new` only.

**Architecture:** Reuse the existing `agent.skills` static tab and `/agent/skills?tab=packages&mode=create` route. `SidebarFooter` owns the visible card and emits a single intent; `WorkbenchSidebar` owns route navigation and closes the account workspace. Existing scenario-package state, permissions, approval, and version logic remain untouched.

**Tech Stack:** Vue 3 `<script setup>`, Vue Router, Pinia shell store, existing CSS design tokens, Node `node:test`, Vite, pnpm.

## Global Constraints

- The new card title is exactly `创建场景技能包`.
- The card description is exactly `按业务场景组合、串联已发布 Skill，并完成权限与版本评估。`.
- The card icon text is exactly `◎＋` and uses the existing `.account-hub-icon` container.
- The direct destination is exactly `/agent/skills?tab=packages&mode=create` and the active static tab remains `agent.skills`.
- Keep the existing “创建 Skill”“Skill Hub”“权限管理”“调整日志” actions and their routes unchanged.
- The shortcut must not alter scenario-package data, permissions, approval, runtime, or version rules.
- Modify Vue source and tests only; never replace `public/admin-vue` source files or protected `admin-runtime` files.
- Publish only to `new`; do not merge formal and do not push GitLab without separate authorization.
- Use a non-deleting asset sync, exclude `admin-runtime` and the release ledger, and atomically switch only the preview index.

---

### Task 1: Direct account-workspace navigation

**Files:**
- Modify: `vue-app/scripts/product-contract-regression.test.mjs`
- Modify: `vue-app/src/components/sidebar/SidebarFooter.vue`
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`

**Interfaces:**
- Consumes: existing `SidebarFooter` event contract, `appStore.ensureStaticTab(pageId)`, `appStore.setActiveStaticTab(pageId)`, and Vue Router `push(location)`.
- Produces: `open-scenario-package-create` UI event and `openScenarioPackageCreatePage()` shell handler.

- [ ] **Step 1: Refresh and verify the isolated baseline**

Run:

```bash
git fetch server main
git rebase server/main
git status --short --branch
pnpm --dir vue-app test:product-contract
pnpm --dir vue-app test:scenario-skill-packages
```

Expected: the rebase completes without touching unrelated P0 files; the worktree is clean; all existing contract and scenario-package tests pass.

- [ ] **Step 2: Write the failing navigation contract test**

Add to `vue-app/scripts/product-contract-regression.test.mjs`:

```js
test('account workspace opens scenario package creation directly and preserves its existing entries', async () => {
  const [footer, sidebar] = await Promise.all([
    source('../src/components/sidebar/SidebarFooter.vue'),
    source('../src/components/shell/sidebar/WorkbenchSidebar.vue')
  ])

  for (const label of ['创建 Skill', '创建场景技能包', 'Skill Hub', '权限管理', '调整日志']) {
    assert.match(footer, new RegExp(label))
  }
  assert.match(footer, /@click="\$emit\('open-scenario-package-create'\)"/)
  assert.match(footer, /'open-scenario-package-create'/)
  assert.match(sidebar, /@open-scenario-package-create="openScenarioPackageCreatePage"/)

  const navigation = functionSource(sidebar, 'openScenarioPackageCreatePage')
  assert.match(navigation, /closeUserMenu\(\)/)
  assert.match(navigation, /ensureStaticTab\('agent\.skills'\)/)
  assert.match(navigation, /setActiveStaticTab\('agent\.skills'\)/)
  assert.match(navigation, /path:\s*'\/agent\/skills'/)
  assert.match(navigation, /query:\s*\{\s*tab:\s*'packages',\s*mode:\s*'create'\s*\}/s)
})
```

- [ ] **Step 3: Run the test and verify the expected failure**

Run:

```bash
cd vue-app
node --test --test-name-pattern='account workspace opens scenario package creation' scripts/product-contract-regression.test.mjs
```

Expected: FAIL because `创建场景技能包` and `open-scenario-package-create` do not yet exist in `SidebarFooter.vue`.

- [ ] **Step 4: Add the card and event**

In `SidebarFooter.vue`, add `account-hub-card-create` to the existing “创建 Skill” card, then insert this sibling immediately after it:

```vue
<button
  type="button"
  class="account-hub-card account-hub-card-create primary"
  @click="$emit('open-scenario-package-create')"
>
  <span class="account-hub-icon">◎＋</span>
  <b>创建场景技能包</b>
  <small>按业务场景组合、串联已发布 Skill，并完成权限与版本评估。</small>
</button>
```

Add `'open-scenario-package-create'` to `defineEmits`. Add `account-hub-card-manage` to the three management cards and `account-hub-card-log` to “调整日志”.

- [ ] **Step 5: Wire the shell navigation**

In the `SidebarFooter` invocation in `WorkbenchSidebar.vue`, add:

```vue
@open-scenario-package-create="openScenarioPackageCreatePage"
```

Next to the existing account-entry handlers, add:

```js
function openScenarioPackageCreatePage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.skills')
  appStore.setActiveStaticTab('agent.skills')
  router.push({ path: '/agent/skills', query: { tab: 'packages', mode: 'create' } })
}
```

- [ ] **Step 6: Run the focused and related tests**

Run:

```bash
cd vue-app
node --test --test-name-pattern='account workspace opens scenario package creation|Skill Hub contract keeps scenario packages' scripts/product-contract-regression.test.mjs
pnpm test:scenario-skill-packages
```

Expected: both focused contracts and all 56 scenario-package tests pass.

- [ ] **Step 7: Commit the navigation unit**

```bash
git add vue-app/scripts/product-contract-regression.test.mjs \
  vue-app/src/components/sidebar/SidebarFooter.vue \
  vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue
git commit -m "feat: add scenario package quick entry"
```

---

### Task 2: Two-row responsive hierarchy and POC record

**Files:**
- Modify: `vue-app/scripts/product-contract-regression.test.mjs`
- Modify: `vue-app/src/assets/workbench.css`
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`

**Interfaces:**
- Consumes: `account-hub-card-create`, `account-hub-card-manage`, and `account-hub-card-log` classes from Task 1; existing `basePocLogRecords` and release-ledger merge.
- Produces: six-column desktop grid that visually yields two creation cards plus three management cards, responsive two-/one-column reflow, and release key `scenario-skill-package-quick-entry-20260907`.

- [ ] **Step 1: Write failing layout and log contract tests**

Add to `vue-app/scripts/product-contract-regression.test.mjs`:

```js
test('account workspace separates creation and management rows responsively', async () => {
  const [footer, css] = await Promise.all([
    source('../src/components/sidebar/SidebarFooter.vue'),
    source('../src/assets/workbench.css')
  ])

  assert.equal((footer.match(/account-hub-card-create/g) ?? []).length, 2)
  assert.equal((footer.match(/account-hub-card-manage/g) ?? []).length, 3)
  assert.match(footer, /account-hub-card-log/)
  assert.match(css, /\.account-hub-panel\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,1fr\)\)/s)
  assert.match(css, /\.account-hub-card-create\s*\{[^}]*grid-column:\s*span 3/s)
  assert.match(css, /\.account-hub-card-manage\s*\{[^}]*grid-column:\s*span 2/s)
  assert.match(css, /@media \(max-width:680px\)[\s\S]*\.account-hub-panel\s*\{[^}]*grid-template-columns:\s*1fr/s)
})

test('POC log records the scenario package quick entry as one new-only change', async () => {
  const sidebar = await source('../src/components/shell/sidebar/WorkbenchSidebar.vue')
  const start = sidebar.indexOf("releaseKey: 'scenario-skill-package-quick-entry-20260907'")
  const end = sidebar.indexOf('\n  },', start)
  const record = sidebar.slice(start, end)

  assert.notEqual(start, -1)
  assert.match(record, /title: '场景技能包外部创建入口'/)
  assert.match(record, /deployTargets: \['new'\]/)
  assert.match(record, /status: '已更新 new 预览'/)
  assert.doesNotMatch(record, /formal/)
})
```

- [ ] **Step 2: Run the tests and verify both expected failures**

Run:

```bash
cd vue-app
node --test --test-name-pattern='account workspace separates creation|POC log records the scenario package quick entry' scripts/product-contract-regression.test.mjs
```

Expected: FAIL because the six-column layout and the new POC record are absent.

- [ ] **Step 3: Implement the desktop and responsive layout**

In `workbench.css`, change the base account panel and add card spans:

```css
.account-hub-popover {
  overflow-y:auto;
}
.account-hub-panel {
  grid-template-columns:repeat(6,minmax(0,1fr));
}
.account-hub-card-create { grid-column:span 3; }
.account-hub-card-manage {
  grid-column:span 2;
  min-height:132px;
}
```

For `body.ai-open` and `@media (max-width:1100px)`, use two columns, reset both span classes to `grid-column:auto`, and set `.account-hub-card-log { grid-column:1 / -1; }`. After the existing `max-width:1500px` block, add:

```css
@media (max-width:680px) {
  .account-hub-panel,
  html[data-product="leaibot"] body.ai-open .account-hub-panel {
    grid-template-columns:1fr;
  }
  .account-hub-card-log,
  html[data-product="leaibot"] body.ai-open .account-hub-card-log {
    grid-column:auto;
  }
}
```

- [ ] **Step 4: Add one grouped POC adjustment record**

Prepend this object to `basePocLogRecords` in `WorkbenchSidebar.vue`:

```js
{
  time: '2026-09-07 08:16',
  releaseKey: 'scenario-skill-package-quick-entry-20260907',
  title: '场景技能包外部创建入口',
  changePoint: '账号工作区新增“创建场景技能包”一级快捷入口，直接进入既有五步创建流程。',
  detail: '账号工作区将“创建 Skill”和“创建场景技能包”并列为创建入口；新入口复用 Skill Hub 静态页签并直达场景技能包创建态。保留 Skill Hub 内部创建入口、原四个账号入口、权限校验、固定版本、审批发布和运行规则，不新增菜单或独立页面。',
  deployTargets: ['new'],
  status: '已更新 new 预览'
},
```

- [ ] **Step 5: Run focused, contract, and full Node tests**

Run:

```bash
cd vue-app
node --test --test-name-pattern='account workspace separates creation|POC log records the scenario package quick entry' scripts/product-contract-regression.test.mjs
pnpm test:product-contract
node --test scripts/*.test.mjs
```

Expected: both focused tests pass, the full product contract passes, and the full Node suite reports zero failures.

- [ ] **Step 6: Commit the presentation and record unit**

```bash
git add vue-app/scripts/product-contract-regression.test.mjs \
  vue-app/src/assets/workbench.css \
  vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue
git commit -m "feat: arrange scenario package account entry"
```

---

### Task 3: Review, verify, and publish `new` only

**Files:**
- Verify: all files changed from `server/main` through `HEAD`
- Deploy: generated `public/admin-vue/index.html` and hashed `public/admin-vue/assets/*` only
- Record: `/opt/projects/portal-workbench-release-ledger.json` and preview `poc-release-ledger.json`

**Interfaces:**
- Consumes: Task 1 navigation, Task 2 layout/log, existing build and release-ledger scripts.
- Produces: reviewed candidate commit, preview Git ref, verified `new` deployment, rollback archive, and new-only release evidence.

- [ ] **Step 1: Run source and build gates**

```bash
cd vue-app
pnpm test:scenario-skill-packages
node --test scripts/*.test.mjs
pnpm guard:design-skill
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
git diff --check server/main..HEAD
```

Expected: all tests and checks exit 0; Vite emits a hashed entry and Skill Hub chunk; only known Sass legacy/chunk-size build warnings may remain.

- [ ] **Step 2: Review the complete candidate diff**

Run:

```bash
git diff --check server/main..HEAD
git diff --name-status server/main..HEAD
git diff --stat server/main..HEAD
git diff server/main..HEAD -- \
  vue-app/src/components/sidebar/SidebarFooter.vue \
  vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue \
  vue-app/src/assets/workbench.css \
  vue-app/scripts/product-contract-regression.test.mjs
```

Confirm that only the approved design doc, plan, focused tests, account-workspace components, CSS, and one POC record changed. Verify that scenario-package stores/domain logic, permissions, right-side Agent, unrelated P0 assets, and `admin-runtime` did not change.

- [ ] **Step 3: Perform local browser acceptance**

Open the account workspace and verify at desktop, right-Agent-open, and narrow widths:

1. Two creation cards appear first and three management cards appear second on wide screens.
2. “创建场景技能包” closes the overlay and opens `/agent/skills?tab=packages&mode=create`.
3. Cancel returns to `?tab=packages`.
4. Existing four cards retain their routes/actions.
5. Keyboard focus is visible and no horizontal overflow or console error is present.

- [ ] **Step 4: Push only a server preview ref**

```bash
candidate=$(git rev-parse HEAD)
git push ssh://zhangrui@43.160.195.171/opt/projects/lexiang-new \
  "$candidate:refs/heads/preview/zhangrui-scenario-skill-package-quick-entry-20260907"
```

Do not update `server/main`, formal, or GitLab.

- [ ] **Step 5: Build in an isolated server worktree and compare hashes**

Run on the server:

```bash
repo=/opt/projects/lexiang-new
worktree=/opt/wt/zhangrui-scenario-skill-package-quick-entry-20260907
ref=refs/heads/preview/zhangrui-scenario-skill-package-quick-entry-20260907
candidate=$(git -C "$repo" rev-parse "$ref")
test ! -e "$worktree"
git -C "$repo" worktree add --detach "$worktree" "$candidate"
cd "$worktree/vue-app"
pnpm install --offline --frozen-lockfile --ignore-workspace
pnpm --ignore-workspace run build
git -C "$worktree" rev-parse HEAD
```

Confirm the server index, main JS, CSS, and Skill Hub/account-workspace chunks match the locally verified output hashes before deployment.

- [ ] **Step 6: Back up and atomically switch preview**

Run on the server after setting `worktree` as in Step 5:

```bash
build="$worktree/public/admin-vue"
preview=/opt/projects/lexiang-new/public/admin-vue
stamp=$(date +%Y%m%d-%H%M%S)
backup="/opt/projects/lexiang-new/backups/admin-vue-scenario-skill-package-quick-entry-20260907-$stamp.tgz"
tar -C "$preview" -czf "$backup" .
tar -tzf "$backup" >/dev/null

for source in "$build"/assets/*; do
  target="$preview/assets/$(basename "$source")"
  if test -e "$target" && ! cmp -s "$source" "$target"; then
    echo "asset collision: $target" >&2
    exit 41
  fi
done

rsync -a --ignore-existing "$build/assets/" "$preview/assets/"
index_tmp="$preview/.index.scenario-package-entry.$$"
install -m 0644 "$build/index.html" "$index_tmp"
mv -f "$index_tmp" "$preview/index.html"
```

Do not copy `admin-runtime` or `poc-release-ledger.json`; do not use delete-style sync.

- [ ] **Step 7: Verify preview before recording release**

Run server-side origin checks and local public checks:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  'http://127.0.0.1:3010/admin-vue/agent/skills?tab=packages&mode=create'
curl -sL -o /dev/null -w '%{http_code}\n' \
  'https://new.leaibot.cn/admin-vue/agent/skills?tab=packages&mode=create'
sha256sum /opt/projects/lexiang-new/public/admin-vue/index.html
sha256sum /opt/projects/lexiang/public/admin-vue/index.html
```

Compare deployed entry and asset hashes with the build, confirm the new shortcut text exists in the deployed chunk, confirm the preview `admin-runtime` tree hash is unchanged, and confirm formal entry/assets/ledger are unchanged.

- [ ] **Step 8: Record and re-read the new-only release**

Run the existing release script with:

```bash
PORTAL_RELEASE_VERSION=$(git rev-parse --short=12 HEAD) \
PORTAL_RELEASE_PUBLISHER=zhangrui \
PORTAL_RELEASE_NEW_OUTPUT=/opt/projects/lexiang-new/public/admin-vue/poc-release-ledger.json \
PORTAL_RELEASE_FORMAL_OUTPUT=/opt/projects/lexiang-new/public/admin-vue/poc-release-ledger.json \
bash /opt/wt/zhangrui-scenario-skill-package-quick-entry-20260907/scripts/record-portal-workbench-release.sh \
  new scenario-skill-package-quick-entry-20260907 '场景技能包外部创建入口'
```

Re-read the public preview ledger and confirm the record contains only `releases.new`; confirm formal has no matching release.
