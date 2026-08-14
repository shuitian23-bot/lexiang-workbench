# AI Assistant Message Timestamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a stable local `YYYY-MM-DD HH:mm:ss` timestamp beneath every welcome, user, and assistant conversation message in the right-side AI assistant.

**Architecture:** Keep the existing `AiMessage.at` storage contract and add a small pure timestamp utility that formats valid values and assigns a stable fallback to legacy messages with missing or invalid dates. `AgentMessageList.vue` renders one semantic `<time>` element after each complete bubble, while the welcome message keeps a session-local start time that refreshes when a new empty message array is supplied.

**Tech Stack:** Vue 3 Composition API, JavaScript ES modules, Node.js built-in test runner, existing portal CSS, Vite, pnpm.

## Global Constraints

- Display format is exactly `YYYY-MM-DD HH:mm:ss` in the browser's local timezone.
- Welcome, user, assistant, authorization, report, and action-bearing messages each show exactly one timestamp per message bubble.
- Recommendation cards, shortcuts, loading states, Todo blocks, and the composer do not receive standalone timestamps.
- User timestamps align right; assistant timestamps align left.
- Do not change AI APIs, history counts, report state, permissions, panel-width behavior, or `admin-runtime`.
- Deploy to `new` only; formal remains unchanged until separate user confirmation.
- Preserve `public/admin-vue/admin-runtime/workbench-geo.js` and `workbench-pages.js`, and never use delete-style deployment sync.

---

### Task 1: Stable Message Timestamp Utility

**Files:**
- Create: `vue-app/src/utils/messageTimestamp.js`
- Create: `vue-app/scripts/message-timestamp.test.mjs`

**Interfaces:**
- Produces: `formatMessageTimestamp(value: string | Date): string`
- Produces: `createMessageTimestampResolver(now?: () => Date): (message: object) => { datetime: string, label: string }`
- The resolver uses `message.at` when valid and caches one fallback ISO value per message object when missing or invalid.

- [ ] **Step 1: Write the failing formatter and resolver tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createMessageTimestampResolver,
  formatMessageTimestamp
} from '../src/utils/messageTimestamp.js'

test('formats local message time with zero-padded seconds', () => {
  assert.equal(
    formatMessageTimestamp(new Date(2026, 7, 14, 9, 5, 7)),
    '2026-08-14 09:05:07'
  )
})

test('returns an empty string for an invalid timestamp', () => {
  assert.equal(formatMessageTimestamp('not-a-date'), '')
})

test('keeps a stable fallback for a legacy message without at', () => {
  const values = [
    new Date(2026, 7, 14, 10, 0, 1),
    new Date(2026, 7, 14, 10, 0, 9)
  ]
  const expectedDatetime = values[0].toISOString()
  const resolve = createMessageTimestampResolver(() => values.shift())
  const message = { role: 'assistant', text: '旧消息' }

  assert.deepEqual(resolve(message), {
    datetime: expectedDatetime,
    label: '2026-08-14 10:00:01'
  })
  assert.deepEqual(resolve(message), {
    datetime: expectedDatetime,
    label: '2026-08-14 10:00:01'
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/message-timestamp.test.mjs`

Expected: FAIL because `src/utils/messageTimestamp.js` does not exist.

- [ ] **Step 3: Implement the minimal utility**

```js
function pad(value) {
  return String(value).padStart(2, '0')
}

function toValidDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatMessageTimestamp(value) {
  const date = toValidDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function createMessageTimestampResolver(now = () => new Date()) {
  const fallbacks = new WeakMap()
  return (message) => {
    let date = toValidDate(message?.at)
    if (!date) {
      if (!fallbacks.has(message)) fallbacks.set(message, now().toISOString())
      date = toValidDate(fallbacks.get(message))
    }
    return {
      datetime: date.toISOString(),
      label: formatMessageTimestamp(date)
    }
  }
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test scripts/message-timestamp.test.mjs`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit the utility**

```bash
git add vue-app/src/utils/messageTimestamp.js vue-app/scripts/message-timestamp.test.mjs
git commit -m "feat: add stable AI message timestamps"
```

### Task 2: Render One Timestamp Per Conversation Message

**Files:**
- Modify: `vue-app/src/components/agent/AgentMessageList.vue:3-117`
- Modify: `vue-app/src/components/agent/AgentMessageList.vue:162-206`

**Interfaces:**
- Consumes: `formatMessageTimestamp` and `createMessageTimestampResolver` from Task 1.
- Produces: one `.time.ai-message-time` element for the welcome bubble and one for every `messages` entry.

- [ ] **Step 1: Add a failing source contract test**

Extend `vue-app/scripts/message-timestamp.test.mjs`:

```js
import { readFile } from 'node:fs/promises'

test('message list renders timestamps for welcome and stored messages', async () => {
  const source = await readFile(new URL('../src/components/agent/AgentMessageList.vue', import.meta.url), 'utf8')
  assert.match(source, /class="time ai-message-time ai-welcome-time"/)
  assert.match(source, /class="time ai-message-time"/)
  assert.match(source, /:datetime="messageTime\(msg\)\.datetime"/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test scripts/message-timestamp.test.mjs`

Expected: the source contract test fails because no `<time>` elements exist.

- [ ] **Step 3: Add welcome and message timestamps**

Import the utility and initialize stable state:

```js
import {
  createMessageTimestampResolver,
  formatMessageTimestamp
} from '@/utils/messageTimestamp'

const welcomeAt = ref(new Date().toISOString())
const messageTime = createMessageTimestampResolver()
```

Render after the welcome bubble:

```vue
<time class="time ai-message-time ai-welcome-time" :datetime="welcomeAt">
  {{ formatMessageTimestamp(welcomeAt) }}
</time>
```

Render after each stored message bubble, outside `.bubble` but inside `.ai-msg`:

```vue
<time class="time ai-message-time" :datetime="messageTime(msg).datetime">
  {{ messageTime(msg).label }}
</time>
```

Reset the welcome timestamp when the parent supplies a new empty message array:

```js
watch(() => props.messages, (next, previous) => {
  if (next !== previous && !next.length) welcomeAt.value = new Date().toISOString()
})
```

- [ ] **Step 4: Add narrow timestamp styling**

Append component-scoped styles so later global CSS cannot move the timestamp into the bubble:

```css
.ai-message-time {
  display: block;
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: 10px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
}

.ai-msg.user .ai-message-time { text-align: right; }
.ai-msg.assistant .ai-message-time { text-align: left; }
```

- [ ] **Step 5: Run focused tests and static checks**

Run:

```bash
node --test scripts/message-timestamp.test.mjs
pnpm lint
pnpm typecheck
```

Expected: timestamp tests pass; lint and typecheck exit 0.

- [ ] **Step 6: Commit the rendered timestamps**

```bash
git add vue-app/src/components/agent/AgentMessageList.vue vue-app/scripts/message-timestamp.test.mjs
git commit -m "feat: show timestamps on AI conversations"
```

### Task 3: POC Log And Release Build

**Files:**
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue:113-121`
- Regenerate: `public/admin-vue/index.html`
- Regenerate: `public/admin-vue/assets/*`

**Interfaces:**
- Produces: one new POC log row titled `AI 助手逐条消息时间戳` with Beijing time and status `已更新 new 预览`.
- Produces: a clean Vite build whose entry assets are committed with the source change.

- [ ] **Step 1: Add one grouped POC log record**

Insert at the top of `pocLogRecords`:

```js
{
  time: '2026-08-14 HH:mm',
  operator: 'Codex（协作代理）',
  title: 'AI 助手逐条消息时间戳',
  scope: '右侧 AI 助手 / 当前会话 / 历史会话',
  detail: '为欢迎语、用户消息和 AI 回复统一增加年月日时分秒时间戳；结构化授权、报告和操作卡跟随所属消息共用一个时间，保留原有消息、历史会话、报告和输入流程。',
  status: '已更新 new 预览'
}
```

Use the actual Beijing `HH:mm` at implementation time.

- [ ] **Step 2: Run the complete Vue verification suite**

Run:

```bash
node --test scripts/message-timestamp.test.mjs
pnpm guard:design-skill
pnpm lint
pnpm typecheck
CI=true pnpm build
CI=true pnpm smoke:shell
```

Expected: all commands exit 0. Sass legacy and Vite chunk-size warnings are allowed; errors are not.

- [ ] **Step 3: Verify protected and unrelated files are excluded**

Run:

```bash
git status --short
git diff --check
git diff --name-only | rg 'admin-runtime|AgentPermissionsView.vue|node_modules|downloads|\.zip$| 2\.'
```

Expected: the final command prints nothing. Remove only generated `vue-app/tsconfig.tsbuildinfo` if present.

- [ ] **Step 4: Commit source, log, and build assets**

```bash
git add vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue
git add -f public/admin-vue/index.html public/admin-vue/assets
git commit -m "chore: build AI timestamp preview assets"
```

### Task 4: GitLab Sync And Safe `new` Preview Deployment

**Files:**
- No source edits.
- Deploy source: committed `public/admin-vue/` from this branch.
- Deploy target: `/opt/projects/lexiang-new/public/admin-vue/`.

**Interfaces:**
- Consumes: tested branch from Tasks 1-3.
- Produces: GitLab `dev/zhangrui` and `new.leaibot.cn` preview with matching entry assets.

- [ ] **Step 1: Recheck the remote branch before push**

```bash
git fetch origin dev/zhangrui
git merge-base --is-ancestor FETCH_HEAD HEAD
git push origin HEAD:refs/heads/dev/zhangrui
git ls-remote origin refs/heads/dev/zhangrui
```

Expected: no remote divergence; the reported remote SHA equals local `HEAD`.

- [ ] **Step 2: Push through Git to an isolated server branch**

```bash
git remote add preview-server ssh://zhangrui@43.160.195.171/opt/projects/lexiang-new
git push preview-server HEAD:refs/heads/incoming/zhangrui-ai-message-timestamp-20260814
```

If server ownership validation rejects the push, retry with per-command `safe.directory` in `--receive-pack`; do not change global Git configuration.

- [ ] **Step 3: Create a detached server worktree and claim the preview lock**

```bash
git -C /opt/projects/lexiang-new worktree add --detach \
  /opt/wt/zhangrui-ai-message-timestamp-20260814 \
  incoming/zhangrui-ai-message-timestamp-20260814

/opt/projects/lexiang-new/scripts/edit-lock.sh claim \
  zhangrui-ai-message-timestamp public/admin-vue/index.html
```

- [ ] **Step 4: Back up and deploy without deleting files**

Create a timestamped preview backup, then run:

```bash
rsync -av --exclude='admin-runtime/' \
  /opt/wt/zhangrui-ai-message-timestamp-20260814/public/admin-vue/ \
  /opt/projects/lexiang-new/public/admin-vue/
```

Do not use `--delete`.

- [ ] **Step 5: Verify preview assets and protected runtime**

Confirm:

- `/admin-vue/`, a normal business route, and the AI assistant page return HTTP 200.
- The preview entry references the branch's hashed JS and CSS.
- `workbench-geo.js` and `workbench-pages.js` hashes equal their pre-deploy hashes.
- Built JS contains the new POC log title and timestamp markup.

- [ ] **Step 6: Browser QA at default and expanded panel widths**

Verify in `new`:

- Welcome, user, assistant, and report-bearing messages each show one timestamp.
- Format includes year, month, day, hour, minute, and second.
- User timestamp aligns right; assistant timestamp aligns left.
- No overlap, page-level horizontal overflow, or console errors.
- Historical conversation restore keeps stored message times.

- [ ] **Step 7: Release the preview lock and report**

```bash
/opt/projects/lexiang-new/scripts/edit-lock.sh release \
  zhangrui-ai-message-timestamp public/admin-vue/index.html
```

Report `new` URL, GitLab commit, backup path, protected hashes, and verification results. Do not deploy formal.
