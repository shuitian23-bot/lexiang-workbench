import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { computed, reactive, ref } from 'vue'

const serviceUrl = new URL('../src/services/agreementProductRelations.js', import.meta.url)
const viewUrl = new URL('../src/views/order/AgreementProductRelationsView.vue', import.meta.url)

test('agreement relationship query matches agreement and product fields', async () => {
  const { AGREEMENT_PRODUCT_RELATIONS, filterAgreementProductRelations } = await import(serviceUrl)

  assert.equal(AGREEMENT_PRODUCT_RELATIONS.length, 2)
  assert.deepEqual(filterAgreementProductRelations('T0260924016001').map(group => group.no), ['T0260924016001'])
  assert.deepEqual(filterAgreementProductRelations('五年全保').map(group => group.no), ['T0260916003003'])
  assert.deepEqual(filterAgreementProductRelations('不存在的产品'), [])
})

test('agreement relationship validation accepts none and validates both bound modes', async () => {
  const { AGREEMENT_PRODUCT_RELATIONS, validateAgreementGroup } = await import(serviceUrl)
  const group = structuredClone(AGREEMENT_PRODUCT_RELATIONS[0])

  assert.deepEqual(validateAgreementGroup(group), {})

  group.products[1].relation = 'strong'
  group.products[1].bindingRatio = '0'
  group.products[1].parentId = ''
  assert.deepEqual(validateAgreementGroup(group), {
    '626076907712368640': {
      bindingRatio: '捆绑比例必须为正整数',
      parentId: '请选择或填写主品产品标识'
    }
  })

  group.products[1].relation = 'soft'
  group.products[1].bindingRatio = '3'
  group.products[1].parentId = '626076763600273408'
  assert.deepEqual(validateAgreementGroup(group), {})

  group.products[1].parentId = 'not-a-product'
  assert.equal(validateAgreementGroup(group)[group.products[1].id].parentId, '请选择当前协议中的主品产品标识')

  group.products[1].parentId = group.products[1].id
  assert.equal(validateAgreementGroup(group)[group.products[1].id].parentId, '产品不能绑定到自身')

  group.products[1].parentId = group.products[0].id
  group.products[0].role = '服务商品'
  assert.equal(validateAgreementGroup(group)[group.products[1].id].parentId, '请选择当前协议中的主品产品标识')
})

test('relationship page keeps query labels hidden only in the filter and names every editor', async () => {
  const view = await readFile(viewUrl, 'utf8')

  assert.equal((view.match(/<ContentPageHeader\b/g) || []).length, 1)
  assert.match(view, /<FilterField\s+layout="placeholder"\s+label="协议或产品查询"/)
  assert.match(view, /placeholder="协议编号、协议名称、产品标识或产品名称"/)
  assert.match(view, /:aria-label="`绑定关系：\$\{product\.name\}`"/)
  assert.match(view, /:aria-label="`捆绑比例：\$\{product\.name\}`"/)
  assert.match(view, /:aria-label="`主品产品标识：\$\{product\.name\}`"/)
  assert.match(view, /:list="`agreement-main-products-\$\{group\.no\}`"/)
  assert.match(view, /:id="`agreement-main-products-\$\{group\.no\}`"/)
  assert.match(view, /@change="relationChanged\(group, product\)"/)
  assert.match(view, /@input="editorChanged\(group, product\)"/)
  assert.match(view, /savedGroups\.value = new Set\(\[\.\.\.savedGroups\.value\]\.filter/)
  assert.match(view, /if \(Object\.keys\(nextErrors\)\.length\) \{\s*invalidateGroup\(group\)/)
  assert.match(view, /relation === 'none'/)
  assert.match(view, /validateAgreementGroup/)
  assert.match(view, /绑定关系已在本地预览中确认/)
  assert.match(view, /role="alert"/)
  assert.match(view, /<FeedbackState/)
})

test('actual relationship editors revoke confirmation and never confirm invalid bindings', async () => {
  const service = await import(serviceUrl)
  const source = await readFile(viewUrl, 'utf8')
  const setup = stripTypeScriptTypes(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*\n/gm, ''))
  const messages = []
  const context = vm.createContext({
    ...service, computed, reactive, ref, structuredClone, onMounted() {},
    useAppStore: () => ({ ensureStaticTab() {} }), showWorkbenchToast: message => messages.push(message)
  })
  vm.runInContext(setup, context, { filename: 'AgreementProductRelationsView.vue setup' })
  const page = vm.runInContext('({ groups, savedGroups, errors, confirmBinding, editorChanged, relationChanged })', context)
  const group = page.groups.value[0], product = group.products[1]
  product.relation = 'strong'; product.bindingRatio = '2'; product.parentId = group.products[0].id
  page.confirmBinding(group)
  assert.equal(page.savedGroups.value.has(group.no), true)
  assert.equal(messages.length, 1)
  product.bindingRatio = '0'
  page.editorChanged(group, product)
  assert.equal(page.savedGroups.value.has(group.no), false)
  page.confirmBinding(group)
  assert.equal(page.savedGroups.value.has(group.no), false)
  assert.equal(page.errors[group.no][product.id].bindingRatio, '捆绑比例必须为正整数')
  assert.equal(messages.length, 1)
  product.bindingRatio = '3'
  page.editorChanged(group, product)
  page.confirmBinding(group)
  assert.equal(page.savedGroups.value.has(group.no), true)
  product.relation = 'none'
  page.relationChanged(group, product)
  assert.equal(page.savedGroups.value.has(group.no), false)
  assert.equal(product.bindingRatio, '0')
  assert.equal(product.parentId, '')
  assert.equal(service.AGREEMENT_PRODUCT_RELATIONS[0].products[1].relation, 'none', 'Edits must not mutate the shared demo seed')
})
