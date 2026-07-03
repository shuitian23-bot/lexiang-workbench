<template>
  <div class="skill-create-page">
    <div class="page-header">
      <div>
        <div class="page-title">Skill 创建</div>
        <div class="page-desc">从业务场景出发定义 Skill 能力、输入输出、权限风险和审批边界。</div>
      </div>
      <div class="agent-skill-page-actions">
        <button class="btn btn-secondary" type="button" @click="goPortalHome">返回工作台</button>
        <button class="btn btn-secondary" type="button" @click="openSkills">查看 Skills 管理</button>
      </div>
    </div>

    <div class="skill-create-studio">
      <aside class="skill-context-pane">
        <div class="skill-pane-title">能力上下文 <span id="skill-selected-count">已选 {{ selectedContextItems.length }}</span></div>
        <div class="skill-context-list">
          <button
            v-for="item in primaryContextItems"
            :key="item.code"
            class="skill-context-item"
            :class="{ selected: item.selected }"
            type="button"
            @click="toggleContext(item.code)"
          >
            <b>{{ item.name }}</b><span>{{ item.code }}</span><em>{{ item.source }}</em>
          </button>
        </div>

        <div class="skill-pane-title">推荐能力 <button type="button" @click="toast('已刷新推荐能力')">刷新</button></div>
        <div class="skill-context-list compact">
          <button
            v-for="item in recommendedContextItems"
            :key="item.code"
            class="skill-context-item"
            :class="{ selected: item.selected }"
            type="button"
            @click="toggleContext(item.code)"
          >
            <b>{{ item.name }}</b><span>{{ item.code }}</span><em>{{ item.source }}</em>
          </button>
        </div>

        <div class="skill-context-quick">
          <label>快速加入上下文</label>
          <input placeholder="输入能力名或业务对象">
          <div>
            <button type="button" @click="fillTemplate('query')">库存查询</button>
            <button type="button" @click="fillTemplate('action')">商品上下架</button>
          </div>
        </div>

        <div class="skill-context-metrics">
          <div><b>12</b><span>API</span></div>
          <div><b>4</b><span>DB 表</span></div>
          <div><b>5</b><span>Tool</span></div>
          <div><b>8</b><span>权限点</span></div>
        </div>
      </aside>

      <div class="skill-main-stack">
        <section class="skill-workspace-pane">
          <div class="skill-workspace-head">
            <div>
              <div class="skill-workspace-title">Skill Workspace</div>
              <div class="skill-workspace-sub">{{ workspaceSub }}</div>
            </div>
          </div>

          <div class="skill-create-tabs" role="tablist" aria-label="Skill 创建页签">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              class="skill-create-tab"
              :class="{ active: activeTab === tab.key }"
              :data-skill-create-tab="tab.key"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'config' }" data-skill-create-panel="config">
            <div class="skill-step-banner">{{ configBanner }}</div>
            <div class="skill-create-form">
              <div class="skill-create-field">
                <label for="skill-create-name">Skill 名称（英文） <span class="field-required">*</span></label>
                <input id="skill-create-name" v-model="form.name" :class="{ 'field-invalid': invalidField === 'name' }" required>
              </div>
              <div class="skill-create-field">
                <label for="skill-create-cn-name">中文命名 <span class="field-required">*</span></label>
                <input id="skill-create-cn-name" v-model="form.cnName" :class="{ 'field-invalid': invalidField === 'cnName' }" required>
              </div>
              <div class="skill-create-field">
                <label for="skill-create-menu">菜单 <span class="field-required">*</span></label>
                <select id="skill-create-menu" v-model="form.menu" :class="{ 'field-invalid': invalidField === 'menu' }" required>
                  <option>在职员工管理</option>
                  <option>乐享运营</option>
                  <option>GEO 看板</option>
                  <option>企业客户管理</option>
                </select>
              </div>
              <div class="skill-create-field full">
                <label for="skill-create-scene">适用场景 <span class="field-optional">非必填</span></label>
                <textarea id="skill-create-scene" v-model="form.scene"></textarea>
              </div>
              <div class="skill-create-field">
                <label for="skill-create-input">输入参数 <span class="field-optional">非必填</span></label>
                <textarea id="skill-create-input" v-model="form.input"></textarea>
              </div>
              <div class="skill-create-field">
                <label for="skill-create-output">输出结果 <span class="field-optional">非必填</span></label>
                <textarea id="skill-create-output" v-model="form.output"></textarea>
              </div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-primary" type="button" @click="goNext('config')">下一步：需求澄清</button>
            </div>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'clarify' }" data-skill-create-panel="clarify">
            <div class="skill-step-banner">当前阶段：基于基础配置、左侧能力上下文和附件材料，通过与 AI 对话补齐应用场景、约束条件和执行边界。</div>
            <div class="skill-clarify-layout">
              <div id="skill-clarify-chat" ref="chatEl" class="skill-chat-sim">
                <div class="skill-chat-context">
                  <b>我已理解你选择的能力上下文</b>
                  <div id="skill-selected-tags" class="skill-ai-tags">
                    <span v-for="item in selectedContextItems" :key="item.code" :title="item.code">{{ item.name }}</span>
                    <span v-if="!selectedContextItems.length" class="muted">请先从左侧选择能力上下文</span>
                  </div>
                  <p id="skill-context-summary">{{ contextSummary }}</p>
                </div>
                <template v-for="message in clarifyMessages" :key="message.id">
                  <div v-if="message.kind === 'state'" class="skill-chat-ai skill-conversation-states" aria-label="AI 会话状态">
                    <div
                      v-for="state in message.states"
                      :key="`${message.id}-${state.kind}-${state.title}`"
                      class="skill-conversation-state"
                      :class="[`is-${state.kind}`, `status-${state.status}`]"
                    >
                      <span class="skill-state-icon" aria-hidden="true" v-html="stateIcon(state.kind)"></span>
                      <span class="skill-state-body">
                        <span class="skill-state-title-row"><b>{{ state.title }}</b><em>{{ stateStatus(state.status) }}</em></span>
                        <span v-if="state.detail" class="skill-state-detail">{{ state.detail }}</span>
                      </span>
                      <span v-if="state.status === 'running'" class="skill-state-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                    </div>
                  </div>
                  <div v-else :class="message.kind === 'user' ? 'skill-chat-user' : 'skill-chat-ai'">{{ message.text }}</div>
                </template>
              </div>
              <div class="skill-clarify-card skill-clarify-summary">
                <div class="skill-summary-head">
                  <div>
                    <b>澄清结论</b>
                    <small id="skill-clarify-summary-updated">{{ summaryUpdated }}</small>
                  </div>
                  <button type="button" class="skill-summary-refresh" title="刷新澄清总结" aria-label="刷新澄清总结" :disabled="summaryRefreshing" @click="refreshSummary"><span>↻</span></button>
                </div>
                <div id="skill-clarify-summary-content">
                  <div v-for="item in summaryItems" :key="item.label" class="skill-summary-item">
                    <span>{{ item.label }}</span>
                    <p>{{ item.text }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="skill-rule-grid skill-clarify-actions" aria-label="需求澄清辅助动作">
              <button v-for="action in clarifyActions" :key="action.label" type="button" @click="appendAssistant(action.message)">{{ action.label }}</button>
            </div>
            <div class="skill-chat-composer">
              <button type="button" class="skill-chat-attach" aria-label="添加附件" @click="toast('已添加附件：业务说明文档 / 数据样例')">📎</button>
              <textarea id="skill-clarify-input" ref="clarifyInputEl" v-model="clarifyInput" placeholder="继续补充需求，例如：输出字段、使用人群、定时频率、权限边界..."></textarea>
              <button type="button" aria-label="发送澄清内容" @click="submitClarifyMessage">➤</button>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary" type="button" @click="switchTab('config')">上一步</button>
              <button class="btn btn-primary" type="button" @click="goNext('clarify')">下一步：生成 Skill 草稿</button>
            </div>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'draft' }" data-skill-create-panel="draft">
            <div class="skill-code-card skill-draft-workspace">
              <aside class="skill-draft-tree" aria-label="Skill 草稿文件树">
                <div class="skill-draft-tree-head">
                  <span class="skill-tree-head-icon"></span>
                  <b>Docs</b>
                  <small>~ · skill-create · docs</small>
                </div>
                <div class="skill-draft-tree-body">
                  <div v-for="row in draftTreeRows" :key="row.label" class="skill-tree-row" :class="row.className">
                    <span class="skill-tree-caret">{{ row.caret }}</span>
                    <span class="skill-tree-icon" :class="row.icon"></span>
                    <b>{{ row.label }}</b>
                    <em v-if="row.count">{{ row.count }}</em>
                  </div>
                </div>
              </aside>
              <section class="skill-draft-editor" aria-label="生成的 Skill 草稿">
                <div class="skill-draft-editor-head">
                  <span>skill.yaml</span>
                  <small>Generated draft</small>
                </div>
                <pre>{{ draftYaml }}</pre>
              </section>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" type="button" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" type="button" @click="switchTab('clarify')">上一步</button>
              <button class="btn btn-primary" type="button" @click="goNext('draft')">下一步：评估验证</button>
            </div>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'verify' }" data-skill-create-panel="verify">
            <div class="skill-eval-head">
              <div>
                <b>评估验证</b>
                <p>第 1 轮（最多 5 轮）：静态评估 + A/B 动态 + LLM 打分。及格线：综合评分 ≥ 0.60。</p>
              </div>
              <button class="btn btn-secondary" type="button" @click="toast('已发起重新评估')">重新评估</button>
            </div>
            <div id="skill-create-eval-scores" class="skill-score-grid">
              <div v-for="score in scores" :key="score.label" class="skill-score-card" :class="{ featured: score.featured, pass: score.pass }">
                <span>{{ score.label }}</span><b>{{ score.value }}</b><i :style="{ '--score': score.percent }"></i><em v-if="score.note">{{ score.note }}</em>
              </div>
            </div>
            <div id="skill-create-eval-gate" class="skill-eval-gate pass">
              <b>评估通过</b>
              <span>{{ evalGateText }}</span>
            </div>
            <div id="skill-create-eval-list" class="skill-eval-list">
              <div v-for="item in evalItems" :key="item.title">
                <span class="pass">PASS</span><b>{{ item.title }}<small v-if="item.detail">{{ item.detail }}</small></b><em>{{ item.score }}</em>
              </div>
            </div>
            <div id="skill-create-optimization-panel" class="skill-optimization-panel" :class="{ tuned: aiTuned }">
              <div class="skill-optimization-head">
                <div>
                  <b>{{ aiTuned ? 'AI 微调完成' : 'AI 可继续优化' }}</b>
                  <span>{{ aiTuned ? '可优化项已优化，评分结果已刷新。核心风险已补齐，可提交审核。' : '当前已达到 0.60 及格线；仍可唤起右侧 AI 助手优化流程步骤、关键节点确认，并刷新评分结果。' }}</span>
                </div>
                <button id="skill-ai-tune-btn" class="btn" :class="aiTuned ? 'btn-secondary' : 'btn-primary'" type="button" :disabled="aiTuning" @click="startAiTune">
                  {{ aiTuneButtonText }}
                </button>
              </div>
              <div class="skill-optimization-list">
                <div v-for="item in optimizationItems" :key="item.title">
                  <span>{{ item.index }}</span>
                  <b>{{ item.title }}</b>
                  <p>{{ item.desc }}</p>
                  <button type="button" @click="item.action()">{{ item.actionText }}</button>
                </div>
              </div>
            </div>
            <div class="skill-case-list">
              <b>用例对比</b>
              <div><span>case-1 · 20.9s</span><em>得分 0.88</em></div>
              <div><span>case-2 · 25.6s</span><em>得分 0.82</em></div>
              <div><span>case-3 · 26.6s</span><em>得分 0.90</em></div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" type="button" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" type="button" @click="switchTab('draft')">上一步</button>
              <button class="btn btn-secondary" type="button" @click="switchTab('clarify')">返回修改</button>
              <button id="skill-create-next-review-btn" class="btn btn-primary" :class="{ disabled: !aiTuned }" :disabled="!aiTuned" type="button" @click="goNext('verify')">下一步：提交审核</button>
            </div>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'review' }" data-skill-create-panel="review">
            <div class="skill-doc-grid">
              <div class="skill-upload-box">
                <b>提交审核</b>
                <p>综合评分已达标，可提交 PM/平台管理员审核。创建流程到提交审核结束；审核通过后才进入上传或发布，不属于当前创建流程。</p>
                <button class="btn btn-secondary" type="button" @click="switchTab('verify')">返回评估验证</button>
              </div>
              <div class="skill-doc-list">
                <div><span>门槛</span><b>综合评分 ≥ 0.60</b></div>
                <div><span>状态</span><b>{{ reviewScoreText }}</b></div>
                <div><span>动作</span><b id="skill-create-review-status">{{ reviewStatus }}</b></div>
                <div><span>后续</span><b>审核通过后才可上传发布</b></div>
              </div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" type="button" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" type="button" @click="switchTab('verify')">上一步</button>
              <button id="skill-create-submit-review-btn" class="btn btn-primary" :class="{ disabled: reviewSubmitted }" :disabled="reviewSubmitted" type="button" @click="submitReview">
                {{ reviewSubmitted ? '已提交审核' : '提交审核' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAIStore } from '@/stores/ai'

type TabKey = 'config' | 'clarify' | 'draft' | 'verify' | 'review'
type ContextItem = { code: string; name: string; source: string; selected: boolean }
type StateStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked'
type ChatMessage =
  | { id: string; kind: 'user' | 'assistant'; text: string }
  | { id: string; kind: 'state'; states: Array<{ kind: string; status: StateStatus; title: string; detail: string }> }

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const aiStore = useAIStore()

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'config', label: '1. 基础配置' },
  { key: 'clarify', label: '2. 需求澄清' },
  { key: 'draft', label: '3. 草稿生成' },
  { key: 'verify', label: '4. 评估验证' },
  { key: 'review', label: '5. 提交审核' }
]

const activeTab = ref<TabKey>('config')
const invalidField = ref('')
const workspaceSub = ref('职场人群认证 · 迭代 0 轮 · 基础配置中')
const configBanner = ref('当前阶段：先完成 Skill 基础配置，明确必填的英文 Skill 名称、中文命名、所属菜单，以及可选的适用场景、输入输出和能力边界。')
const clarifyInput = ref('')
const clarifyInputEl = ref<HTMLTextAreaElement | null>(null)
const chatEl = ref<HTMLElement | null>(null)
const summaryUpdated = ref('根据当前对话生成')
const summaryRefreshing = ref(false)
const aiTuning = ref(false)
const aiTuned = ref(false)
const reviewSubmitted = ref(false)
const reviewStatus = ref('提交审核后停留当前页面，Skill Hub 状态变为待审批')

const form = ref({
  name: 'employee_certification_analysis',
  cnName: '职场人群认证数据分析',
  menu: '在职员工管理',
  scene: '运营和 PM 通过自然语言查询职场人群认证数据，分析认证方式分布、通过率趋势、失败原因和待审核积压，并生成文本摘要或表格报告。',
  input: '时间范围、认证方式、认证状态、企业名称、岗位信息、失败原因、输出格式',
  output: '指标摘要、认证方式分布表、失败原因 TopN、趋势判断、可下载 CSV 链接'
})

const contextItems = ref<ContextItem[]>([
  { name: '商品查询', code: 'product.query', source: '商品中心', selected: true },
  { name: '库存查询', code: 'inventory.query', source: '库存中心', selected: true },
  { name: '商品上下架', code: 'product.shelf', source: '商品中心', selected: true },
  { name: '通知发送', code: 'notify.send', source: '通知中心', selected: true },
  { name: '活动商品判断', code: 'activity.judge', source: '商品中心', selected: false },
  { name: '商品价格查询', code: 'price.query', source: '价格中心', selected: false },
  { name: '标签管理', code: 'tag.manage', source: '商品中心', selected: false }
])

const primaryContextItems = computed(() => contextItems.value.slice(0, 4))
const recommendedContextItems = computed(() => contextItems.value.slice(4))
const selectedContextItems = computed(() => contextItems.value.filter(item => item.selected))
const contextSummary = computed(() => {
  if (!selectedContextItems.value.length) return '尚未选择能力上下文。请先从左侧勾选可被 Skill 编排的底层能力。'
  return `已选择 ${selectedContextItems.value.length} 个能力：${selectedContextItems.value.map(item => item.name).join('、')}。AI 将基于这些能力继续追问应用场景、边界和输入输出。`
})

const clarifyMessages = ref<ChatMessage[]>([
  { id: 'u1', kind: 'user', text: '根据职场认证 PRD、后台字段说明和测试样例，创建一个帮助 PM 和运营分析认证数据的 Skill。' },
  { id: 's1', kind: 'state', states: [
    { kind: 'thinking', status: 'done', title: '读取基础材料', detail: '已识别 PRD、后台字段说明和测试样例。' },
    { kind: 'tool_call', status: 'done', title: '抽取能力上下文', detail: '匹配查询、统计、导出和权限校验相关能力。' },
    { kind: 'error', status: 'failed', title: '附件解析兜底', detail: '部分附件字段缺失，已改用后台字段说明和测试样例继续澄清。' },
    { kind: 'follow_up', status: 'blocked', title: '生成关键追问', detail: '先确认输出形态，再继续确认触发场景与权限边界。' }
  ] },
  { id: 'a1', kind: 'assistant', text: '我已读取基础配置和附件材料。这个 Skill 的核心目标是帮助团队查询职场认证数据、识别认证方式分布、通过率趋势、失败原因和待审核积压。为了更准确地设计这个 Skill，我先确认一个关键点：输出结果需要偏文本总结、表格明细，还是两者都要？' },
  { id: 'u2', kind: 'user', text: '两者都要。默认先给文字结论，再给表格。' },
  { id: 'a2', kind: 'assistant', text: '好的。接下来确认触发场景：除了自然语言查询，例如“最近 7 天个税认证通过率”，是否还需要定时报告或异常提醒？' },
  { id: 'u3', kind: 'user', text: '需要。支持日报，也要能发现待审核过多、某种认证方式失败率异常。' },
  { id: 'a3', kind: 'assistant', text: '明白。再确认权限和边界：这个 Skill 是否只读？是否允许导出明细 CSV？是否可以修改认证状态？' },
  { id: 'u4', kind: 'user', text: '只读，可以导出脱敏 CSV，不能修改认证状态。' },
  { id: 'a4', kind: 'assistant', text: '我会将能力边界记录为：只读查询与分析、默认脱敏、导出需带权限校验、不触发认证状态变更。接下来为了验证 Skill，我建议准备 5 个测试用例：认证方式分布、失败原因 TopN、待审核积压、单企业认证明细、个税认证趋势。是否需要覆盖所有这些场景？' },
  { id: 'u5', kind: 'user', text: '需要，5 个都保留。' },
  { id: 'a5', kind: 'assistant', text: '好的。最后确认交付结构：我会生成 Skill 配置、业务规则说明、测试用例和示例问法。前端展示适配为 direct_response 文本摘要、display_info 表格卡片、link_list 导出链接。这样理解是否准确？' },
  { id: 'u6', kind: 'user', text: '准确，可以进入草稿生成。' },
  { id: 's2', kind: 'state', states: [
    { kind: 'tool_result', status: 'done', title: '澄清结果已汇总', detail: '已形成触发场景、文件结构、输出格式、测试用例和权限边界。' },
    { kind: 'confirm', status: 'blocked', title: '等待进入草稿生成', detail: '点击下一步后再生成 Skill 草稿，不直接发布或修改线上状态。' }
  ] },
  { id: 'a6', kind: 'assistant', text: '需求澄清已完成。当前 Skill 将支持自然语言查询、定时报告、异常提醒、脱敏导出和只读数据分析。下一步我会基于这些结论生成 Skill 草稿。' }
])

const summaryItems = ref([
  { label: '基本信息', text: 'name: workplace-cert-analysis；描述：职场认证数据分析 Skill；版本：1.0.0' },
  { label: '触发场景', text: '自然语言查询、日报/周报/月报、待审核积压和失败率异常提醒。' },
  { label: '文件结构', text: '生成 skill.yaml、business_rules.md、test_cases.json、sample_queries.md。' },
  { label: '输出格式', text: 'direct_response 文本结论、display_info 表格明细、link_list 脱敏 CSV 下载。' },
  { label: '测试用例方向', text: '认证方式分布、失败原因 TopN、待审核积压、单企业明细、个税认证趋势。' },
  { label: '评估重点', text: '数据准确性、查询解析正确性、输出格式合规性、权限与脱敏可靠性。' },
  { label: '复杂度', text: 'medium；只读分析为主，涉及多字段过滤、聚合统计和权限校验。' },
  { label: 'Phoenix 输出', text: '使用 direct_response + display_info + link_list，不触发状态修改动作。' }
])

const clarifyActions = [
  { label: '生成测试用例', message: '已根据当前澄清结论生成测试用例方向：认证方式分布、失败原因 TopN、待审核积压、单企业明细、个税认证趋势。' },
  { label: '检查权限与依赖', message: '已检查权限与依赖：当前 Skill 仅做只读分析，导出使用脱敏 CSV，依赖认证记录表、认证方式字段、失败原因字段和组织权限。' },
  { label: '运行预览', message: '已完成运行预览：自然语言查询将返回文本摘要、表格明细和脱敏 CSV 链接，不触发认证状态修改。' },
  { label: '优化逻辑', message: '已给出优化逻辑：建议补充异常输入处理、失败 case、定时报告频率和待审核积压阈值。' },
  { label: '风险评估', message: '已完成风险评估：主要风险为敏感字段泄露、导出权限不足、统计口径不一致；需默认脱敏并记录导出日志。' },
  { label: '发布建议', message: '已生成发布建议：先按只读分析能力提交审核，通过后再进入上传发布链路；当前创建流程止于提交审核。' }
]

const draftTreeRows = [
  { label: 'employee_certification_analysis', className: 'folder open depth-0', caret: '▾', icon: 'folder', count: '4' },
  { label: 'config', className: 'folder open depth-1', caret: '▾', icon: 'folder', count: '1' },
  { label: 'skill.yaml', className: 'file active depth-2', caret: '', icon: 'file yaml' },
  { label: 'rules', className: 'folder open depth-1', caret: '▾', icon: 'folder', count: '1' },
  { label: 'business_rules.md', className: 'file depth-2', caret: '', icon: 'file md' },
  { label: 'evaluation', className: 'folder open depth-1', caret: '▾', icon: 'folder', count: '2' },
  { label: 'test_cases.json', className: 'file depth-2', caret: '', icon: 'file json' },
  { label: 'sample_queries.md', className: 'file depth-2', caret: '', icon: 'file md' }
]

const draftYaml = computed(() => `skill:
  name: ${form.value.name}
  cn_name: ${form.value.cnName}
  version: 1.0.0
  trigger:
    - natural_language
    - scheduled_report
    - anomaly_alert
  scope:
    - 认证记录查询
    - 认证方式分布
    - 通过率和失败原因分析
    - 待审核积压提醒
  boundary:
    - 只读分析
    - 不修改用户认证状态
    - 导出 CSV 默认脱敏
    - 导出前校验组织权限
  inputs:
    - 时间范围
    - 认证方式
    - 认证状态
    - 企业名称
    - 失败原因
    - 输出格式
  outputs:
    direct_response: 文本摘要与趋势判断
    display_info: 认证方式分布表、失败原因 TopN
    link_list: 脱敏 CSV 下载链接
  files:
    - skill.yaml
    - business_rules.md
    - test_cases.json
    - sample_queries.md`)

const scores = computed(() => aiTuned.value
  ? [
      { label: '静态评分', value: '0.872', percent: '87.2%' },
      { label: '结果评分', value: '0.846', percent: '84.6%' },
      { label: '过程评分', value: '0.831', percent: '83.1%' },
      { label: '效率评分', value: '0.888', percent: '88.8%' },
      { label: '综合评分', value: '0.859', percent: '85.9%', featured: true, pass: true, note: '已达及格线 0.60' }
    ]
  : [
      { label: '静态评分', value: '0.872', percent: '87.2%' },
      { label: '结果评分', value: '0.804', percent: '80.4%' },
      { label: '过程评分', value: '0.742', percent: '74.2%' },
      { label: '效率评分', value: '0.831', percent: '83.1%' },
      { label: '综合评分', value: '0.782', percent: '78.2%', featured: true, pass: true, note: '已达及格线 0.60' }
    ])

const evalGateText = computed(() => aiTuned.value
  ? 'AI 微调后综合评分 0.859，已达到提交审核门槛。可进入提交审核，等待管理员审批后再进入上传或发布链路。'
  : '综合评分 0.782，已达到提交审核门槛。仍可由 AI 助手微调流程步骤和关键确认节点，进一步优化草稿质量。')
const reviewScoreText = computed(() => aiTuned.value ? 'AI 微调后综合评分 0.859，已达到审核门槛' : '当前综合评分 0.782，已达到审核门槛')

const evalItems = computed(() => aiTuned.value
  ? [
      { title: '基本信息规范', score: '1.00' },
      { title: '流程步骤清晰', detail: 'AI 已补充分步执行顺序、参数确认和结果交付路径', score: '0.92' },
      { title: '异常处理完善', detail: '已覆盖无数据、字段缺失、权限不足时的兜底话术', score: '0.90' },
      { title: '关键节点确认', detail: '导出 CSV、定时报告、异常提醒前均有确认节点', score: '0.86' },
      { title: '指令具体明确', score: '1.00' },
      { title: '资源引用有效', score: '1.00' },
      { title: '平台适配合规', score: '1.00' },
      { title: '测试用例充分', score: '1.00' }
    ]
  : [
      { title: '基本信息规范', score: '1.00' },
      { title: '流程步骤清晰', detail: '可继续补充参数确认、异常兜底和结果交付的分步描述', score: '0.72' },
      { title: '异常处理完善', detail: '已覆盖无数据、字段缺失、权限不足时的兜底话术', score: '0.90' },
      { title: '关键节点确认', detail: '可继续明确导出 CSV、定时报告和异常提醒前的确认范围', score: '0.74' },
      { title: '指令具体明确', score: '1.00' },
      { title: '资源引用有效', score: '1.00' },
      { title: '平台适配合规', score: '1.00' },
      { title: '测试用例充分', score: '1.00' }
    ])

const aiTuneButtonText = computed(() => aiTuning.value ? 'AI 微调中...' : aiTuned.value ? 'AI 微调完成' : 'AI 微调')
const optimizationItems = computed(() => aiTuned.value
  ? [
      { index: 1, title: '流程步骤已拆清', desc: '补充参数确认、查询执行、异常兜底、结果生成、导出确认五段流程。', actionText: '查看草稿', action: () => switchTab('draft') },
      { index: 2, title: '关键节点已补齐', desc: '导出 CSV、开启定时报告、发送异常提醒前，都会先展示范围和影响。', actionText: '查看澄清', action: () => switchTab('clarify') },
      { index: 3, title: '测试样例已更新', desc: '新增权限不足、企业名称为空、认证数据缺失、失败原因字段异常等样例。', actionText: '查看用例', action: () => switchTab('clarify') }
    ]
  : [
      { index: 1, title: '补齐流程步骤', desc: '需要把查询、分析、异常兜底、结果输出和确认动作拆成可执行步骤。', actionText: '让 AI 处理', action: startAiTune },
      { index: 2, title: '明确确认节点', desc: '导出 CSV、定时报告、异常提醒前，需要展示范围、对象、频率和影响。', actionText: '让 AI 处理', action: startAiTune },
      { index: 3, title: '刷新评分结果', desc: 'AI 完成草稿微调后，自动回写评估列表、综合评分和提交审核门槛状态。', actionText: '开始微调', action: startAiTune }
    ])

function switchTab(tab: TabKey) {
  activeTab.value = tab
}

function goNext(current: TabKey) {
  if (current === 'config' && !validateConfig()) return
  const index = tabs.findIndex(tab => tab.key === current)
  const next = tabs[index + 1]?.key
  if (next) switchTab(next)
}

function validateConfig() {
  const required = [
    { key: 'name', label: 'Skill 名称（英文）' },
    { key: 'cnName', label: '中文命名' },
    { key: 'menu', label: '菜单' }
  ] as const
  const missing = required.find(item => !form.value[item.key].trim())
  if (!missing) return true
  invalidField.value = missing.key
  toast(`请先填写${missing.label}`)
  window.setTimeout(() => { invalidField.value = '' }, 1200)
  return false
}

function toggleContext(code: string) {
  const item = contextItems.value.find(entry => entry.code === code)
  if (item) item.selected = !item.selected
}

function fillTemplate(type: 'query' | 'generate' | 'action') {
  const templates = {
    query: {
      name: 'operation_metric_query',
      cnName: '查询经营指标',
      menu: '乐享运营',
      scene: '运营同学用自然语言查询 GMV、订单、转化率等指标，并返回可解释口径。',
      input: '时间范围、业务线、渠道、指标名称',
      output: '指标数值、同比环比、口径说明、异常提示'
    },
    generate: {
      name: 'campaign_review_report',
      cnName: '生成活动复盘',
      menu: '乐享运营',
      scene: '基于活动数据和知识库生成结构化复盘草稿，供运营二次确认。',
      input: '活动名称、时间范围、目标指标、数据结果',
      output: '复盘摘要、亮点、问题、行动建议'
    },
    action: {
      name: 'product_recommendation_config',
      cnName: '配置商品推荐位',
      menu: '乐享运营',
      scene: '根据运营策略生成商品推荐位配置草案，高风险动作需审批后执行。',
      input: '商品 ID、推荐位、上线时间、目标人群',
      output: '配置草案、影响范围、审批单'
    }
  }
  form.value = { ...templates[type] }
  switchTab('config')
}

function submitClarifyMessage() {
  const value = clarifyInput.value.trim()
  if (!value) return
  clarifyMessages.value.push({ id: `u-${Date.now()}`, kind: 'user', text: value })
  clarifyInput.value = ''
  const stateId = `s-${Date.now()}`
  clarifyMessages.value.push({ id: stateId, kind: 'state', states: [
    { kind: 'thinking', status: 'running', title: '理解补充需求', detail: '正在结合基础配置、能力上下文和当前澄清记录判断缺口。' },
    { kind: 'tool_call', status: 'pending', title: '检查约束条件', detail: '准备检查定时触发、CSV 导出、审批风险和权限边界。' },
    { kind: 'streaming', status: 'pending', title: '组织澄清回复', detail: '将把缺口转换为下一轮澄清问题。' }
  ] })
  scrollChat()
  window.setTimeout(() => {
    clarifyMessages.value = clarifyMessages.value.filter(message => message.id !== stateId)
    clarifyMessages.value.push({ id: `a-${Date.now()}`, kind: 'assistant', text: '已记录。请继续确认这个需求是否需要固定时间触发、是否允许导出 CSV，以及是否有需要审批的高风险操作。' })
    clarifyMessages.value.push({ id: `sd-${Date.now()}`, kind: 'state', states: [
      { kind: 'thinking', status: 'done', title: '理解补充需求', detail: '已写入当前 Skill 需求上下文。' },
      { kind: 'tool_call', status: 'done', title: '检查约束条件', detail: '发现仍需确认定时触发、CSV 导出和审批风险。' },
      { kind: 'streaming', status: 'done', title: '组织澄清回复', detail: '已生成下一轮可确认的问题。' },
      { kind: 'follow_up', status: 'blocked', title: '等待用户追问确认', detail: '请继续补充时间频率、导出权限和高风险动作边界。' }
    ] })
    scrollChat()
  }, 1800)
}

function appendAssistant(message: string) {
  clarifyMessages.value.push({ id: `a-${Date.now()}-${Math.random().toString(36).slice(2)}`, kind: 'assistant', text: message })
  scrollChat()
}

function scrollChat() {
  void nextTick(() => {
    if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
  })
}

function refreshSummary() {
  summaryRefreshing.value = true
  const userTurns = clarifyMessages.value.filter(message => message.kind === 'user').length
  window.setTimeout(() => {
    summaryItems.value = [
      { label: '基本信息', text: `name: ${form.value.name}；中文命名：${form.value.cnName}；版本：1.0.0；已基于 ${userTurns} 轮自然语言澄清更新。` },
      { label: '触发场景', text: '自然语言查询、日报/周报/月报、待审核积压提醒、认证方式失败率异常提醒。' },
      { label: '文件结构', text: '生成 skill.yaml、business_rules.md、test_cases.json、sample_queries.md；附件材料只作为需求和字段依据。' },
      { label: '输出格式', text: '默认先返回 direct_response 文本结论，再返回 display_info 表格明细；允许提供 link_list 脱敏 CSV 下载。' },
      { label: '测试用例方向', text: '认证方式分布、失败原因 TopN、待审核积压、单企业明细、个税认证趋势、异常输入兜底。' },
      { label: '评估重点', text: '数据准确性、查询解析正确性、输出格式合规性、权限与脱敏可靠性、定时任务稳定性。' },
      { label: '复杂度', text: 'medium；只读分析为主，涉及多字段过滤、聚合统计、脱敏导出和异常提醒。' },
      { label: 'Phoenix 输出', text: '使用 direct_response + display_info + link_list，不触发认证状态修改动作。' }
    ]
    const now = new Date()
    summaryUpdated.value = `已刷新 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    summaryRefreshing.value = false
  }, 360)
}

function saveDraft() {
  const now = new Date()
  workspaceSub.value = `职场人群认证 · 草稿已保存 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function startAiTune() {
  if (aiTuned.value) {
    aiStore.toggleOpen(true)
    return
  }
  if (aiTuning.value) return
  aiTuning.value = true
  aiStore.toggleOpen(true)
  aiStore.messages.push({ role: 'user', text: '请针对 Skill 创建评估验证中的可优化项做 AI 微调：流程步骤清晰 0.72、关键节点确认 0.74。请调整 Skill 草稿并刷新评分结果。', at: new Date().toISOString() })
  aiStore.messages.push({ role: 'assistant', text: ['已定位 2 个可优化项，并完成 Skill 微调：', '', '- 将认证数据查询流程拆成「参数确认 → 数据读取 → 异常兜底 → 结果生成 → 高风险动作确认」。', '- 补充导出 CSV、定时报告、异常提醒前的确认节点，明确范围、对象、频率和影响。', '- 更新测试用例，覆盖权限不足、企业名称为空、认证数据缺失、失败原因字段异常。', '', '我会把新的评估结果同步回左侧评估验证页。'].join('\n'), at: new Date().toISOString() })
  window.setTimeout(() => {
    aiTuning.value = false
    aiTuned.value = true
  }, 900)
}

function submitReview() {
  if (reviewSubmitted.value) {
    toast(`${form.value.name}：已在审核中，可前往 Skill Hub 查看`)
    return
  }
  reviewSubmitted.value = true
  reviewStatus.value = '已提交审核，当前 Skill Hub 状态为待审批'
  toast(`${form.value.name}：已提交审核，等待管理员审批`)
}

function stateStatus(status: StateStatus) {
  return ({ pending: '等待中', running: '进行中', done: '已完成', failed: '失败', blocked: '待确认' })[status]
}

function stateIcon(kind: string) {
  const icons: Record<string, string> = {
    thinking: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.2 13.8a5 5 0 1 1 7.5-.5l-.8 1.1H7.1l-.9-.6Z"/><path d="M7.7 17h4.6"/></svg>',
    tool_call: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12.8 4.2 3 3-3.5 3.5-3-3 3.5-3.5Z"/><path d="m9.3 7.7-5.1 5.1a2.1 2.1 0 0 0 3 3l5.1-5.1"/></svg>',
    tool_result: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12v9H4z"/><path d="m7 10 2 2 4-4"/></svg>',
    follow_up: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12v8H8l-4 3V5Z"/><path d="M7 8h6M7 11h4"/></svg>',
    confirm: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5 16 6v4.1c0 3.1-2.1 5.4-6 6.4-3.9-1-6-3.3-6-6.4V6l6-2.5Z"/><path d="m7.4 10 1.8 1.8 3.6-4"/></svg>',
    streaming: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h7"/><path d="M4 10h12"/><path d="M4 14.5h9"/><path d="m14 4 2 2-2 2"/></svg>',
    error: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5 17 16H3l7-12.5Z"/><path d="M10 8v3M10 14h.01"/></svg>'
  }
  return icons[kind] || '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12"/><path d="M11 5l5 5-5 5"/></svg>'
}

function loadEditDraft() {
  const raw = sessionStorage.getItem('leai.skillCreateDraft')
  if (!raw) {
    loadEditDraftFromQuery()
    return
  }
  try {
    const parsed = JSON.parse(raw)
    const item = parsed?.item
    if (!item?.name) return
    form.value.name = item.name
    form.value.cnName = item.cnName || form.value.cnName
    form.value.scene = item.desc || form.value.scene
    form.value.output = '自然语言响应、表格结果、可继续展开的报告或调整建议'
    workspaceSub.value = parsed.rejected ? `${item.cnName || item.name} · 已驳回 · 修改中` : `${item.cnName || item.name} · 编辑中`
    if (parsed.rejected) {
      configBanner.value = '当前 Skill 已被管理员驳回，请根据审批意见补充业务边界、测试用例或审批材料后重新提交。'
      reviewStatus.value = '当前状态为已驳回，修改完成后可重新提交审核'
    }
  } catch {
    loadEditDraftFromQuery()
  }
}

function loadEditDraftFromQuery() {
  const skill = String(route.query.skill || '')
  if (!skill) return
  const knownDrafts: Record<string, { name: string; cnName: string; desc: string }> = {
    'workplace-cert-analysis': {
      name: 'workplace-cert-analysis',
      cnName: '职场认证数据分析',
      desc: '职场认证数据分析 Skill，支持认证方式分布、通过率趋势、失败原因和待审核积压分析。'
    },
    'low-stock-auto-offline': {
      name: 'low-stock-auto-offline',
      cnName: '低库存自动下架',
      desc: '低库存自动下架 Skill，根据库存阈值和活动排除条件生成下架建议。'
    }
  }
  const item = knownDrafts[skill]
  if (!item) return
  const rejected = route.query.rejected === '1'
  form.value.name = item.name
  form.value.cnName = item.cnName
  form.value.scene = item.desc
  form.value.output = '自然语言响应、表格结果、可继续展开的报告或调整建议'
  workspaceSub.value = rejected ? `${item.cnName || item.name} · 已驳回 · 修改中` : `${item.cnName || item.name} · 编辑中`
  if (rejected) {
    configBanner.value = '当前 Skill 已被管理员驳回，请根据审批意见补充业务边界、测试用例或审批材料后重新提交。'
    reviewStatus.value = '当前状态为已驳回，修改完成后可重新提交审核'
  }
}

function goPortalHome() {
  router.push('/portal/home')
}

function openSkills() {
  router.push('/agent/skills')
}

function toast(message: string) {
  appStore.notify(message)
}

onMounted(() => {
  loadEditDraft()
  appStore.ensureStaticTab('agent.skillCreate')
  appStore.setActiveStaticTab('agent.skillCreate')
  document.title = 'Skill 创建 - 乐享 AI 工作台'
})
</script>
