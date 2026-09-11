import test from 'node:test'
import assert from 'node:assert/strict'
import { AI_INSPECT_MENU, isAiInspectAdmin, withAiInspectMenu } from '../src/services/aiInspectAccess.ts'

const oldTree = {
  dashboard: { icon: 'dashboard', label: '乐享运营', children: { overview: { label: '运营总览', path: '/dashboard/overview' } } },
  advertising: { icon: 'advertising', label: '广告管理', children: { video: { label: '商品视频管理', path: '/advertising/product-videos' } } }
}

test('adding AI inspection preserves every existing menu and does not mutate the supplied tree', () => {
  for (const role of ['平台管理员', '运营人员', null]) {
    for (const permissions of [[], ['*'], ['dashboard.read']]) {
      const before = structuredClone(oldTree)
      const result = withAiInspectMenu(oldTree, 'demo', role, permissions)
      const { aiinspect, ...existing } = result
      assert.deepEqual(existing, before)
      assert.deepEqual(oldTree, before)
      assert.equal(result.dashboard, oldTree.dashboard)
      assert.equal(result.advertising, oldTree.advertising)
      assert.equal(aiinspect.label, 'AI 巡检')
    }
  }
})

test('AI inspection is appended for a signed-in server user without changing their menu permissions', () => {
  const permissions = ['dashboard.read']
  const result = withAiInspectMenu(oldTree, 'operator', '运营人员', permissions)
  assert.deepEqual(Object.keys(result.aiinspect.children), ['aiinspect.overview', 'aiinspect.rules', 'aiinspect.issues'])
  assert.deepEqual(permissions, ['dashboard.read'])
  assert.equal(Object.keys(AI_INSPECT_MENU.children).length, 5)
})

test('only administrators see notification and log entries', () => {
  for (const [role, permissions] of [['平台管理员', []], ['运营人员', ['*']]]) {
    const result = withAiInspectMenu(oldTree, 'admin', role, permissions)
    assert.equal(Object.keys(result.aiinspect.children).length, 5)
    assert.equal(isAiInspectAdmin(role, permissions), true)
  }
  assert.equal(isAiInspectAdmin(null, []), false)
  assert.equal(isAiInspectAdmin('运营人员', ['aiinspect']), false)
})

test('logout removes only AI inspection even if it was present in the input tree', () => {
  const input = { ...oldTree, aiinspect: AI_INSPECT_MENU }
  assert.deepEqual(withAiInspectMenu(input, null, '平台管理员', ['*']), oldTree)
  assert.equal(input.aiinspect, AI_INSPECT_MENU)
})
