import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PAGELESS_SKILL_CONTEXT_GROUPS,
  createPagelessContextItems,
  getPagelessSkillMenuLabels
} from '../src/domain/skillContextCatalog.js'

const expectedDescription = '用户针对私定官方喷绘中TOP 甄选榜进行图片或顺序调整'

test('registers the private customization API capability without a page path', () => {
  assert.deepEqual(getPagelessSkillMenuLabels(), ['私人订制'])
  assert.equal(PAGELESS_SKILL_CONTEXT_GROUPS.length, 1)

  const [group] = PAGELESS_SKILL_CONTEXT_GROUPS
  assert.equal(group.groupId, 'private-customization')
  assert.equal(group.groupLabel, '私人订制')
  assert.deepEqual(group.contexts, [{
    contextId: 'customization.top-ranking',
    name: '私定 TOP 榜单',
    description: expectedDescription,
    sourceType: 'api'
  }])
  assert.equal('path' in group.contexts[0], false)
})

test('recommends the active pageless capability without selecting it', () => {
  const [inactive] = createPagelessContextItems('')
  const [active] = createPagelessContextItems('私人订制')

  assert.deepEqual(inactive, {
    code: 'customization.top-ranking',
    name: '私定 TOP 榜单',
    subtitle: expectedDescription,
    source: '私人订制',
    menuPath: '私人订制 / 私定 TOP 榜单',
    sourceType: 'api',
    selected: false,
    recommended: false
  })
  assert.equal(active.recommended, true)
  assert.equal(active.selected, false)
  assert.equal('path' in active, false)
})
