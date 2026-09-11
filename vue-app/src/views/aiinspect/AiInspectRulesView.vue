<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import {
  cmsPages,
  rules as seedRules,
  DIMENSIONS,
  type RuleRecord,
  type Dimension,
  type RuleStatus,
  type NotifyChannel,
  type CmsPage
} from '@/services/aiInspect'
import AiBadge from '@/components/aiinspect/AiBadge.vue'
import AiModal from '@/components/aiinspect/AiModal.vue'

const appStore = useAppStore()
const rules = ref<RuleRecord[]>([...seedRules])

// ===== 弹窗与表单 =====
const showModal = ref(false)
const editingId = ref<string | null>(null)
const errors = ref<string[]>([])

interface ModuleForm {
  name: string
  dimensions: Dimension[]
}
interface NotifyForm {
  persons: string
  channel: NotifyChannel
}
const emptyForm = () => ({
  pageId: '',
  note: '',
  modules: [] as ModuleForm[],
  frequencyType: 'daily' as 'manual' | 'hourly' | 'daily' | 'weekly' | 'cron',
  dailyTime: '09:00',
  weeklyDay: '1',
  weeklyTime: '10:00',
  cron: '0 9 * * *',
  notifies: {
    严重: { persons: '', channel: '短信' as NotifyChannel },
    警告: { persons: '', channel: '邮件' as NotifyChannel },
    提示: { persons: '', channel: '站内信' as NotifyChannel }
  } as Record<'严重' | '警告' | '提示', NotifyForm>
})
const form = reactive(emptyForm())

const selectedPage = computed(() => cmsPages.find((p) => p.id === form.pageId) || null)
const moduleOptions = computed(() => selectedPage.value?.modules || [])
const notifyLevels = ['严重', '警告', '提示'] as const
const nextRunText = computed(() => {
  switch (form.frequencyType) {
    case 'manual': return '手动触发，不挂定时任务'
    case 'hourly': return '每小时整点执行'
    case 'daily': return `每天 ${form.dailyTime} 执行（下次：明日 ${form.dailyTime}）`
    case 'weekly': {
      const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `每周 ${names[Number(form.weeklyDay)]} ${form.weeklyTime} 执行`
    }
    case 'cron': return `按表达式 ${form.cron} 执行`
    default: return ''
  }
})

function openCreate() {
  editingId.value = null
  errors.value = []
  Object.assign(form, emptyForm())
  showModal.value = true
}

function openEdit(rule: RuleRecord) {
  editingId.value = rule.id
  errors.value = []
  const page = cmsPages.find((p) => p.name === rule.pageName)
  const freq = rule.frequency
  const type: typeof form.frequencyType = freq.includes('每小时')
    ? 'hourly'
    : freq.includes('每周')
      ? 'weekly'
      : freq.includes('手动')
        ? 'manual'
        : freq.includes('每天')
          ? 'daily'
          : 'cron'
  Object.assign(form, {
    pageId: page?.id || '',
    note: '',
    modules: [{ name: `${rule.pageName} 主模块`, dimensions: [...rule.dimensions] }],
    frequencyType: type,
    dailyTime: '09:00',
    weeklyDay: '1',
    weeklyTime: '10:00',
    cron: '0 9 * * *',
    notifies: {
      严重: { persons: '张伟', channel: '短信' },
      警告: { persons: '王芳', channel: '邮件' },
      提示: { persons: '陈静', channel: '站内信' }
    }
  })
  showModal.value = true
}

function toggleDimension(mod: ModuleForm, dim: Dimension) {
  const idx = mod.dimensions.indexOf(dim)
  if (idx >= 0) mod.dimensions.splice(idx, 1)
  else mod.dimensions.push(dim)
}

function addModule() {
  form.modules.push({ name: '', dimensions: [] })
}

function removeModule(index: number) {
  form.modules.splice(index, 1)
}

function validate(): boolean {
  const list: string[] = []
  if (!form.pageId) list.push('必须选择页面')
  if (form.modules.length === 0) list.push('至少需要配置 1 个模块')
  form.modules.forEach((m, i) => {
    if (!m.name) list.push(`模块 ${i + 1} 必须填写模块名称`)
    if (m.dimensions.length === 0) list.push(`模块 ${m.name || i + 1} 至少选择 1 个巡检维度`)
  })
  ;(['严重', '警告', '提示'] as const).forEach((lv) => {
    if (!form.notifies[lv].persons.trim()) list.push(`${lv} 等级至少需要填写一个通知人`)
  })
  errors.value = list
  return list.length === 0
}

function frequencyText(): string {
  switch (form.frequencyType) {
    case 'manual': return '手动执行'
    case 'hourly': return '每小时'
    case 'daily': return `每天 ${form.dailyTime}`
    case 'weekly': {
      const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `每周 ${names[Number(form.weeklyDay)]} ${form.weeklyTime}`
    }
    case 'cron': return `自定义 ${form.cron}`
    default: return '-'
  }
}

function save() {
  if (!validate()) return
  const page = selectedPage.value as CmsPage
  const dims = Array.from(new Set(form.modules.flatMap((m) => m.dimensions)))
  const nextRuleNumber = rules.value.reduce((max, rule) => {
    const number = Number(rule.id.match(/^#R(\d+)$/)?.[1]) || 0
    return Math.max(max, number)
  }, 0) + 1
  const record: RuleRecord = {
    id: editingId.value || `#R${String(nextRuleNumber).padStart(3, '0')}`,
    pageName: page.name,
    moduleCount: form.modules.length,
    dimensions: dims,
    frequency: frequencyText(),
    status: 'enabled',
    lastRun: editingId.value ? (rules.value.find((r) => r.id === editingId.value)?.lastRun || '—') : '—'
  }
  if (editingId.value) {
    const idx = rules.value.findIndex((r) => r.id === editingId.value)
    if (idx >= 0) rules.value[idx] = record
  } else {
    rules.value.unshift(record)
  }
  showModal.value = false
  appStore.notify(editingId.value ? '规则已更新' : '规则已创建')
}

function deleteRule() {
  if (!editingId.value) return
  if (!window.confirm('确定删除该巡检规则？此操作不可恢复。')) return
  rules.value = rules.value.filter((r) => r.id !== editingId.value)
  showModal.value = false
  appStore.notify('规则已删除')
}

function runInspection(rule: RuleRecord) {
  appStore.notify(`已触发规则 ${rule.id} 的巡检执行`)
}

function toggleStatus(rule: RuleRecord) {
  rule.status = (rule.status === 'enabled' ? 'disabled' : 'enabled') as RuleStatus
  appStore.notify(rule.status === 'enabled' ? `规则 ${rule.id} 已启用` : `规则 ${rule.id} 已停用`)
}

onMounted(() => {
  appStore.ensureStaticTab('aiinspect.rules')
  appStore.setActiveStaticTab('aiinspect.rules')
  document.title = 'AI 巡检 · 巡检规则'
})
</script>

<template>
  <div class="ai-rules">
    <ContentPageHeader class="inspect-page-header" title="巡检规则" description="AI 巡检核心配置入口 · 一站式管理页面、模块、频率与异常通知">
      <template #actions>
        <button class="btn btn-primary btn-sm" type="button" @click="openCreate">+ 新增规则</button>
      </template>
    </ContentPageHeader>

    <div class="inspect-surface">
      <div class="ai-table-scroll" role="region" aria-label="巡检数据表格" tabindex="0">
        <table class="ai-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>页面 / 模块</th>
              <th>巡检项</th>
              <th>频率</th>
              <th>状态</th>
              <th>最近执行</th>
              <th class="ai-col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in rules" :key="rule.id">
              <td class="ai-mono">{{ rule.id }}</td>
              <td>
                <div class="ai-cell-strong">{{ rule.pageName }}</div>
                <div class="ai-cell-sub">{{ rule.moduleCount }} 模块</div>
              </td>
              <td>
                <span v-for="d in rule.dimensions" :key="d" class="ai-pill">{{ d }}</span>
              </td>
              <td>{{ rule.frequency }}</td>
              <td>
                <AiBadge :tone="rule.status === 'enabled' ? 'green' : 'gray'" :label="rule.status === 'enabled' ? '启用' : '停用'" />
              </td>
              <td class="ai-mono">{{ rule.lastRun }}</td>
              <td class="ai-col-actions">
                <button class="btn btn-sm btn-secondary" type="button" @click="openEdit(rule)">编辑</button>
                <button class="btn btn-sm btn-secondary" type="button" @click="runInspection(rule)">巡检</button>
                <button class="btn btn-sm btn-secondary" type="button" @click="toggleStatus(rule)">
                  {{ rule.status === 'enabled' ? '停用' : '启用' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <AiModal v-model="showModal" :title="editingId ? '编辑巡检规则' : '新增巡检规则'" width="640px">
      <div class="ai-form-steps">
        <section class="ai-step">
          <h4 class="ai-step__title"><span class="ai-step__no">①</span>选择页面</h4>
          <div class="ai-field">
            <label>页面 <i class="ai-req">*</i></label>
            <select v-model="form.pageId" class="inspect-input">
              <option value="">请选择支持 AI 巡检的页面</option>
              <option v-for="p in cmsPages" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="ai-field">
            <label>巡检地址 URL（自动带出，只读）</label>
            <input class="inspect-input" :value="selectedPage?.url || '—'" readonly />
          </div>
          <div class="ai-field">
            <label>走查内容说明（可选）</label>
            <textarea v-model="form.note" class="inspect-input" rows="2" placeholder="如：检查商品是否在售、利益点是否过期" />
          </div>
          <p v-if="selectedPage" class="ai-derive">页面信息派生：所属模块 {{ selectedPage.modules.join('、') }}</p>
        </section>

        <section class="ai-step">
          <h4 class="ai-step__title">
            <span class="ai-step__no">②</span>页面模块与巡检维度
            <span class="ai-step__count">已配置 {{ form.modules.length }} 个模块</span>
          </h4>
          <div v-for="(mod, i) in form.modules" :key="i" class="ai-module">
            <div class="ai-module__head">
              <select v-model="mod.name" class="inspect-input ai-input--sm">
                <option value="">选择模块</option>
                <option v-for="m in moduleOptions" :key="m" :value="m">{{ m }}</option>
              </select>
              <button class="ai-module__del" type="button" @click="removeModule(i)" aria-label="删除模块">×</button>
            </div>
            <div class="ai-chips">
              <button
                v-for="dim in DIMENSIONS"
                :key="dim"
                type="button"
                class="ai-chip"
                :class="{ active: mod.dimensions.includes(dim) }"
                @click="toggleDimension(mod, dim)"
              >{{ dim }}</button>
            </div>
          </div>
          <button class="ai-add-module" type="button" @click="addModule">＋ 添加模块</button>
        </section>

        <section class="ai-step">
          <h4 class="ai-step__title"><span class="ai-step__no">③</span>巡检频率</h4>
          <div class="ai-tabs">
            <button type="button" class="ai-tab" :class="{ active: form.frequencyType === 'manual' }" @click="form.frequencyType = 'manual'">手动执行</button>
            <button type="button" class="ai-tab" :class="{ active: form.frequencyType === 'hourly' }" @click="form.frequencyType = 'hourly'">每小时</button>
            <button type="button" class="ai-tab" :class="{ active: form.frequencyType === 'daily' }" @click="form.frequencyType = 'daily'">每天</button>
            <button type="button" class="ai-tab" :class="{ active: form.frequencyType === 'weekly' }" @click="form.frequencyType = 'weekly'">每周</button>
            <button type="button" class="ai-tab" :class="{ active: form.frequencyType === 'cron' }" @click="form.frequencyType = 'cron'">自定义定时</button>
          </div>
          <div class="ai-freq-body">
            <template v-if="form.frequencyType === 'daily'">
              <label>执行时间</label>
              <input type="time" v-model="form.dailyTime" class="inspect-input ai-input--sm" />
            </template>
            <template v-else-if="form.frequencyType === 'weekly'">
              <label>星期</label>
              <select v-model="form.weeklyDay" class="inspect-input ai-input--sm">
                <option value="0">周日</option><option value="1">周一</option><option value="2">周二</option>
                <option value="3">周三</option><option value="4">周四</option><option value="5">周五</option><option value="6">周六</option>
              </select>
              <label>执行时间</label>
              <input type="time" v-model="form.weeklyTime" class="inspect-input ai-input--sm" />
            </template>
            <template v-else-if="form.frequencyType === 'cron'">
              <label>5 字段表达式（分 时 日 月 周）</label>
              <input v-model="form.cron" class="inspect-input ai-input--sm" placeholder="0 9 * * *" />
            </template>
            <p class="ai-next-run">下次执行：{{ nextRunText }}</p>
          </div>
        </section>

        <section class="ai-step">
          <h4 class="ai-step__title"><span class="ai-step__no">④</span>异常通知</h4>
          <div v-for="lv in notifyLevels" :key="lv" class="ai-notify" :class="`is-${lv}`">
            <div class="ai-notify__head">
              <AiBadge :tone="lv === '严重' ? 'red' : lv === '警告' ? 'orange' : 'blue'" :label="`${lv}等级`" />
            </div>
            <input v-model="form.notifies[lv].persons" class="inspect-input ai-input--sm" placeholder="通知人，逗号分隔" />
            <select v-model="form.notifies[lv].channel" class="inspect-input ai-input--sm">
              <option value="邮件">邮件</option>
              <option value="短信">短信</option>
              <option value="站内信">站内信</option>
              <option value="企业微信">企业微信</option>
            </select>
          </div>
        </section>

        <div v-if="errors.length" class="ai-errors">
          <div v-for="(e, i) in errors" :key="i">· {{ e }}</div>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" type="button" @click="showModal = false">取消</button>
        <button v-if="editingId" class="btn btn-danger" type="button" @click="deleteRule">删除</button>
        <button class="btn btn-primary" type="button" @click="save">保存</button>
      </template>
    </AiModal>
  </div>
</template>

<style scoped>
.ai-rules { display: flex; flex-direction: column; gap: 16px; width: 100%; min-width: 0; container-type: inline-size; container-name: ai-inspect-page; }
.ai-rules > * { min-width: 0; }
.inspect-surface { background: var(--color-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: 16px 20px; min-width: 0; }
.ai-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; }
.ai-table-scroll:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.ai-table { width: 100%; min-width: 950px; border-collapse: collapse; font-size: 13px; }
.ai-table th { text-align: left; font-weight: 600; color: var(--color-text-tertiary); font-size: 12px; padding: 12px 12px; border-bottom: 1px solid var(--color-border-subtle); }
.ai-table td { padding: 12px; border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text); vertical-align: middle; }
.ai-col-actions { text-align: right; white-space: nowrap; }
.ai-col-actions .btn { margin-left: 8px; }
.ai-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--color-text-secondary); font-size: 12px; }
.ai-cell-strong { font-weight: 500; }
.ai-cell-sub { font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px; }
.ai-pill { display: inline-block; margin: 0 4px 4px 0; padding: 4px 8px; border-radius: 9999px; background: var(--color-primary-subtle); color: var(--color-primary); font-size: 12px; }

/* 表单 */
.ai-form-steps { display: flex; flex-direction: column; gap: 20px; }
.ai-step { border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 16px 16px; }
.ai-step__title { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--color-text); }
.ai-step__no { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: var(--radius-md); background: var(--color-primary-subtle); color: var(--color-primary); font-size: 12px; }
.ai-step__count { margin-left: auto; font-size: 12px; font-weight: 500; color: var(--color-text-tertiary); }
.ai-field { margin-bottom: 12px; }
.ai-field label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.ai-req { color: var(--color-danger); font-style: normal; }
.inspect-input { width: 100%; box-sizing: border-box; height: 36px; min-height: 36px; max-width: 100%; padding: 0 12px !important; border: 1px solid var(--color-border); border-radius: var(--radius-md); font: inherit; font-size: 13px; line-height: 1.5; background-color: var(--color-surface); color: var(--color-text); }
.inspect-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-subtle); }
.inspect-input::placeholder { color: var(--color-text-tertiary); opacity: 1; }
select.inspect-input { appearance: none; cursor: pointer; padding-right: 40px !important; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='m3 4.5 3 3 3-3' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important; background-repeat: no-repeat !important; background-position: right 12px center !important; background-size: 12px 12px !important; }
textarea.inspect-input { height: auto; min-height: 72px; padding: 8px 12px !important; line-height: 1.6; resize: vertical; }
.ai-input--sm { width: auto; min-width: 0; }
.ai-derive { font-size: 12px; color: var(--color-text-tertiary); margin: 4px 0 0; }

.ai-module { border: 1px dashed var(--color-border); border-radius: var(--radius-md); padding: 12px 12px; margin-bottom: 12px; }
.ai-module__head { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.ai-module__head .inspect-input { flex: 1; min-width: 0; }
.ai-module__del { border: none; background: var(--color-danger-bg); color: var(--color-danger); width: 28px; height: 28px; border-radius: var(--radius-md); font-size: 16px; cursor: pointer; flex-shrink: 0; }
.ai-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.ai-chip { border: 1px solid var(--color-border-subtle); background: var(--color-surface); color: var(--color-text-secondary); border-radius: 9999px; padding: 4px 12px; font-size: 12px; cursor: pointer; transition: all 0.12s ease; }
.ai-chip.active { background: var(--color-primary-subtle); border-color: var(--color-primary); color: var(--color-primary); font-weight: 600; }
.ai-add-module { border: 1px dashed var(--color-primary); background: var(--color-primary-subtle); color: var(--color-primary); border-radius: var(--radius-md); padding: 8px 12px; font-size: 12px; cursor: pointer; width: 100%; }

.ai-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.ai-tab { border: 1px solid var(--color-border-subtle); background: var(--color-surface); color: var(--color-text-secondary); border-radius: var(--radius-md); padding: 4px 12px; font-size: 12px; cursor: pointer; }
.ai-tab.active { background: var(--color-primary); color: var(--color-surface); border-color: var(--color-primary); }
.ai-freq-body { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 12px; color: var(--color-text-secondary); }
.ai-freq-body label { color: var(--color-text-secondary); }
.ai-next-run { width: 100%; margin: 8px 0 0; font-size: 12px; color: var(--color-primary); font-weight: 500; }

.ai-notify { display: grid; grid-template-columns: 84px minmax(0, 1fr) 160px; align-items: center; gap: 12px; padding: 8px 12px; border-radius: var(--radius-md); margin-bottom: 8px; border-left: 3px solid var(--color-border-subtle); }
.ai-notify .inspect-input { width: 100%; min-width: 0; }
.ai-notify.is-严重 { border-left-color: var(--color-danger); }
.ai-notify.is-警告 { border-left-color: var(--color-warning); }
.ai-notify.is-提示 { border-left-color: var(--color-primary); }

@container ai-inspect-modal (max-width: 479px) {
  .ai-notify { grid-template-columns: 1fr; }
  .ai-notify__head { min-height: 22px; }
}

.ai-errors { background: var(--color-danger-bg); border: 1px solid var(--color-danger); border-radius: var(--radius-md); padding: 12px 16px; font-size: 12px; color: var(--color-danger); }
@container ai-inspect-page (max-width: 719px) {
  .inspect-page-header { flex-direction: column; align-items: stretch; }
  .inspect-page-header :deep(.content-page-header__heading) { flex-basis: auto; }
  .inspect-page-header :deep(.content-page-header__actions) { justify-content: flex-start; }
}
</style>
