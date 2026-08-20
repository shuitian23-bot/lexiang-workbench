import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function source(path) {
  try {
    return await readFile(new URL(path, import.meta.url), 'utf8')
  } catch {
    return ''
  }
}

test('low-score evaluation items expose row tuning while the global action remains', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')

  assert.match(view, /v-if="Number\(item\.score\) < REVIEW_SCORE_THRESHOLD"/)
  assert.match(view, /@click="startAiTune\(item\)"/)
  assert.match(view, /等待确认' : 'AI 微调'/)
  assert.match(view, /id="skill-ai-tune-btn"/)
  assert.match(view, /@click="startAiTune\(\)"/)
})

test('row tuning sends only the selected evaluation context to the AI assistant', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')

  assert.match(view, /function buildAiTunePrompt\(item/)
  assert.match(view, /item\.title/)
  assert.match(view, /item\.score/)
  assert.match(view, /item\.detail/)
  assert.match(view, /buildAiTunePrompt\(item\)/)
})

test('a pending item tune does not disable other low-score items', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')

  assert.match(view, /:disabled="isTuneItemPending\(item\.title\)"/)
  assert.match(view, /pendingTuneRequests/)
  assert.match(view, /tunedEvalItemTitles/)
  assert.doesNotMatch(view, /class="skill-eval-item-tune"[\s\S]{0,160}:disabled="aiTuning"/)
})

test('sidebar merges recovered server records and renders trace metadata', async () => {
  const sidebar = await source('../src/components/shell/sidebar/WorkbenchSidebar.vue')

  assert.match(sidebar, /pocLogServerRecords/)
  assert.match(sidebar, /getPocDeployTargets/)
  assert.match(sidebar, /getPocTraceFields/)
  assert.match(sidebar, /poc-log-targets/)
  assert.match(sidebar, /poc-log-trace/)
})

test('server recovery covers personal branches and the current audit', async () => {
  const records = await source('../src/data/pocLogServerRecords.ts')

  assert.match(records, /AI 报告下载按钮与关闭范围修正/)
  assert.match(records, /GEO 看板 8月4日服务器提交补录/)
  assert.match(records, /闭环交易看板菜单持久化补录/)
  assert.match(records, /Skill 创建低分项逐项 AI 微调/)
  assert.match(records, /服务器多分支调整记录恢复与归档审计/)
  assert.match(records, /dev\/baiyu/)
  assert.match(records, /dev\/yejw2/)
  assert.match(records, /dev\/zhangrui/)
  assert.match(records, /2f721a5/)
  assert.match(records, /4dfd704/)
  assert.match(records, /df0cc24/)
})
