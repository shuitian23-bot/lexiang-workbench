import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as vue from 'vue'
import * as inspectService from '../src/services/aiInspect.ts'

function loadRulesPage() {
  const page = readFileSync(new URL('../src/views/aiinspect/AiInspectRulesView.vue', import.meta.url), 'utf8')
  const source = page.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(source, 'The rule editor script must be available for its lifecycle regression.')
  const { outputText } = ts.transpileModule(`${source}\nexport { rules, form, openCreate, openEdit, save, deleteRule };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  const exports = {}
  runInNewContext(outputText, {
    exports,
    window: { confirm: () => true },
    require(name) {
      if (name === 'vue') return { ...vue, onMounted() {} }
      if (name === '@/stores/app') return { useAppStore: () => ({ notify() {} }) }
      if (name === '@/services/aiInspect') return { ...inspectService, rules: structuredClone(inspectService.rules) }
      if (name.endsWith('.vue')) return { default: {} }
      throw new Error(`Unexpected rule-page dependency: ${name}`)
    }
  }, { filename: 'AiInspectRulesView.setup.js' })
  return exports
}

function fillNewRule(editor, page) {
  editor.openCreate()
  editor.form.pageId = page.id
  editor.form.modules = [{ name: page.modules[0], dimensions: ['链接有效性'] }]
  for (const level of ['严重', '警告', '提示']) editor.form.notifies[level].persons = '演示用户'
  editor.save()
}

test('after deleting a middle rule, new rule editing and deletion leave the surviving rules untouched', () => {
  const editor = loadRulesPage()
  editor.openEdit(editor.rules.value.find(rule => rule.id === '#R002'))
  editor.deleteRule()
  const survivors = JSON.parse(JSON.stringify(editor.rules.value))
  assert.deepEqual(Array.from(editor.rules.value, rule => rule.id), ['#R001', '#R003', '#R004'])

  fillNewRule(editor, inspectService.cmsPages[0])
  const ids = Array.from(editor.rules.value, rule => rule.id)
  assert.equal(new Set(ids).size, ids.length, 'New rules must not reuse the identifier of a surviving rule.')
  assert.equal(editor.rules.value[0].id, '#R005')

  const created = editor.rules.value.find(rule => rule.id === '#R005')
  editor.openEdit(created)
  editor.form.pageId = inspectService.cmsPages[1].id
  editor.save()
  assert.equal(editor.rules.value.find(rule => rule.id === '#R005').pageName, inspectService.cmsPages[1].name)
  assert.deepEqual(JSON.parse(JSON.stringify(editor.rules.value.filter(rule => rule.id !== '#R005'))), survivors)

  editor.openEdit(editor.rules.value.find(rule => rule.id === '#R005'))
  editor.deleteRule()
  assert.deepEqual(JSON.parse(JSON.stringify(editor.rules.value)), survivors)
})
