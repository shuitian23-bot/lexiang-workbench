<template>
  <div class="skill-create-page page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">Skill 创建</div>
        <div class="page-desc">从业务场景出发定义 Skill 能力、输入输出、权限风险和审批边界。</div>
      </div>
      <div class="agent-skill-page-actions">
        <button class="btn btn-secondary" @click="router.push('/portal/home')">返回工作台</button>
        <button class="btn btn-secondary" @click="router.push('/agent/skills')">查看 Skills 管理</button>
      </div>
    </div>

    <div class="skill-create-studio">
      <!-- 左侧能力上下文面板 -->
      <aside class="skill-context-pane">
        <div class="skill-pane-title">能力上下文 <span>已选 {{ selectedContextCount }}</span></div>
        <div class="skill-context-list">
          <button
            v-for="item in contextItems"
            :key="item.id"
            class="skill-context-item"
            :class="{ selected: item.selected }"
            @click="toggleContext(item)"
          >
            <b>{{ item.name }}</b><span>{{ item.id }}</span><em>{{ item.source }}</em>
          </button>
        </div>

        <div class="skill-pane-title">推荐能力 <button @click="alert('已刷新推荐能力')">刷新</button></div>
        <div class="skill-context-list compact">
          <button
            v-for="item in recommendItems"
            :key="item.id"
            class="skill-context-item"
            :class="{ selected: item.selected }"
            @click="toggleContext(item)"
          >
            <b>{{ item.name }}</b><span>{{ item.id }}</span><em>{{ item.source }}</em>
          </button>
        </div>

        <div class="skill-context-quick">
          <label>快速加入上下文</label>
          <input v-model="quickAdd" placeholder="输入能力名或业务对象">
          <div>
            <button @click="fillTemplate('query')">库存查询</button>
            <button @click="fillTemplate('action')">商品上下架</button>
          </div>
        </div>

        <div class="skill-context-metrics">
          <div><b>12</b><span>API</span></div>
          <div><b>4</b><span>DB 表</span></div>
          <div><b>5</b><span>Tool</span></div>
          <div><b>8</b><span>权限点</span></div>
        </div>
      </aside>

      <!-- 主工作区 -->
      <div class="skill-main-stack">
        <section class="skill-workspace-pane">
          <div class="skill-workspace-head">
            <div>
              <div class="skill-workspace-title">Skill Workspace</div>
              <div class="skill-workspace-sub">职场人群认证 · 迭代 0 轮 · {{ currentStepLabel }}</div>
            </div>
          </div>

          <!-- 步骤标签 -->
          <div class="skill-create-tabs" role="tablist" aria-label="Skill 创建页签">
            <button
              v-for="(step, idx) in steps"
              :key="step.key"
              type="button"
              class="skill-create-tab"
              :class="{ active: currentStep === step.key }"
              @click="goStep(step.key)"
            >{{ idx + 1 }}. {{ step.label }}</button>
          </div>

          <!-- 步骤面板：基础配置 -->
          <div v-if="currentStep === 'config'" class="skill-create-panel active">
            <div class="skill-step-banner">当前阶段：先完成 Skill 基础配置，明确必填的英文 Skill 名称、中文命名、所属菜单，以及可选的适用场景、输入输出和能力边界。</div>
            <div class="skill-create-form">
              <div class="skill-create-field">
                <label>Skill 名称（英文） <span class="field-required">*</span></label>
                <input v-model="form.name" required placeholder="e.g. employee_certification_analysis">
              </div>
              <div class="skill-create-field">
                <label>中文命名 <span class="field-required">*</span></label>
                <input v-model="form.cnName" required placeholder="e.g. 职场人群认证数据分析">
              </div>
              <div class="skill-create-field">
                <label>菜单 <span class="field-required">*</span></label>
                <select v-model="form.menu" required>
                  <option>在职员工管理</option>
                  <option>乐享运营</option>
                  <option>GEO 看板</option>
                  <option>企业客户管理</option>
                  <option>搜索后台</option>
                  <option>风控管理</option>
                </select>
              </div>
              <div class="skill-create-field full">
                <label>适用场景 <span class="field-optional">非必填</span></label>
                <textarea v-model="form.scene" rows="3"></textarea>
              </div>
              <div class="skill-create-field">
                <label>输入参数 <span class="field-optional">非必填</span></label>
                <textarea v-model="form.input" rows="3"></textarea>
              </div>
              <div class="skill-create-field">
                <label>输出结果 <span class="field-optional">非必填</span></label>
                <textarea v-model="form.output" rows="3"></textarea>
              </div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-primary" @click="nextStep('config')">下一步：需求澄清</button>
            </div>
          </div>

          <!-- 步骤面板：需求澄清 -->
          <div v-if="currentStep === 'clarify'" class="skill-create-panel active">
            <div class="skill-step-banner">当前阶段：基于基础配置、左侧能力上下文和附件材料，通过与 AI 对话补齐应用场景、约束条件和执行边界。</div>
            <div class="skill-clarify-layout">
              <div class="skill-chat-sim">
                <div class="skill-chat-context">
                  <b>我已理解你选择的能力上下文</b>
                  <div class="skill-ai-tags">
                    <span v-for="item in selectedContextItems" :key="item.id" :title="item.id">{{ item.name }}</span>
                  </div>
                  <p>已选择 {{ selectedContextCount }} 个能力。AI 将结合基础配置继续追问应用场景、边界和输入输出。</p>
                </div>
                <div v-for="(msg, idx) in clarifyMessages" :key="idx" :class="msg.role === 'user' ? 'skill-chat-user' : 'skill-chat-ai'">
                  {{ msg.content }}
                </div>
              </div>
              <div class="skill-clarify-card skill-clarify-summary">
                <div class="skill-summary-head">
                  <div><b>澄清结论</b><small>根据当前对话生成</small></div>
                  <button type="button" class="skill-summary-refresh" @click="refreshSummary"><span>↻</span></button>
                </div>
                <div>
                  <div v-for="item in clarifySummary" :key="item.label" class="skill-summary-item">
                    <span>{{ item.label }}</span>
                    <p>{{ item.content }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="skill-rule-grid skill-clarify-actions" aria-label="需求澄清辅助动作">
              <button @click="appendAI('已根据当前澄清结论生成测试用例方向：认证方式分布、失败原因 TopN、待审核积压、单企业明细、个税认证趋势。')">生成测试用例</button>
              <button @click="appendAI('已检查权限与依赖：当前 Skill 仅做只读分析，导出使用脱敏 CSV，依赖认证记录表、认证方式字段、失败原因字段和组织权限。')">检查权限与依赖</button>
              <button @click="appendAI('已完成运行预览：自然语言查询将返回文本摘要、表格明细和脱敏 CSV 链接，不触发认证状态修改。')">运行预览</button>
              <button @click="appendAI('已给出优化逻辑：建议补充异常输入处理、失败 case、定时报告频率和待审核积压阈值。')">优化逻辑</button>
              <button @click="appendAI('已完成风险评估：主要风险为敏感字段泄露、导出权限不足、统计口径不一致；需默认脱敏并记录导出日志。')">风险评估</button>
              <button @click="appendAI('已生成发布建议：先按只读分析能力提交审核，通过后再进入上传发布链路；当前创建流程止于提交审核。')">发布建议</button>
            </div>
            <div class="skill-chat-composer">
              <button type="button" class="skill-chat-attach" @click="alert('已添加附件：业务说明文档 / 数据样例')">📎</button>
              <textarea v-model="clarifyInput" placeholder="继续补充需求，例如：输出字段、使用人群、定时频率、权限边界..." rows="2"></textarea>
              <button type="button" @click="sendClarify">➤</button>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary" @click="goStep('config')">上一步</button>
              <button class="btn btn-primary" @click="nextStep('clarify')">下一步：生成 Skill 草稿</button>
            </div>
          </div>

          <!-- 步骤面板：草稿生成 -->
          <div v-if="currentStep === 'draft'" class="skill-create-panel active">
            <div class="skill-code-card skill-draft-workspace">
              <aside class="skill-draft-tree" aria-label="Skill 草稿文件树">
                <div class="skill-draft-tree-head">
                  <span class="skill-tree-head-icon"></span>
                  <b>Docs</b>
                  <small>~ · skill-create · docs</small>
                </div>
                <div class="skill-draft-tree-body">
                  <div class="skill-tree-row folder open depth-0">
                    <span class="skill-tree-caret">▾</span>
                    <span class="skill-tree-icon folder"></span>
                    <b>{{ form.name || 'employee_certification_analysis' }}</b>
                    <em>4</em>
                  </div>
                  <div class="skill-tree-row folder open depth-1">
                    <span class="skill-tree-caret">▾</span>
                    <span class="skill-tree-icon folder"></span>
                    <b>config</b><em>1</em>
                  </div>
                  <button
                    v-for="file in draftFiles"
                    :key="file.name"
                    type="button"
                    class="skill-tree-row file depth-2"
                    :class="{ active: activeFile === file.name }"
                    @click="activeFile = file.name"
                  >
                    <span class="skill-tree-caret"></span>
                    <span class="skill-tree-icon file" :class="file.ext"></span>
                    <b>{{ file.name }}</b>
                  </button>
                </div>
              </aside>
              <section class="skill-draft-editor" aria-label="生成的 Skill 草稿">
                <div class="skill-draft-editor-head">
                  <span>{{ activeFile }}</span>
                  <small>Generated draft</small>
                </div>
                <pre>{{ draftContent }}</pre>
              </section>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" @click="goStep('clarify')">上一步</button>
              <button class="btn btn-primary" @click="nextStep('draft')">下一步：评估验证</button>
            </div>
          </div>

          <!-- 步骤面板：评估验证 -->
          <div v-if="currentStep === 'verify'" class="skill-create-panel active">
            <div class="skill-eval-head">
              <div>
                <b>评估验证</b>
                <p>第 1 轮（最多 5 轮）：静态评估 + A/B 动态 + LLM 打分。及格线：综合评分 ≥ 0.60。</p>
              </div>
              <button class="btn btn-secondary" @click="alert('已发起重新评估')">重新评估</button>
            </div>
            <div class="skill-score-grid">
              <div v-for="score in evalScores" :key="score.label" class="skill-score-card" :class="{ featured: score.featured, pass: score.pass }">
                <span>{{ score.label }}</span>
                <b>{{ score.value.toFixed(3) }}</b>
                <i :style="`--score:${(score.value * 100).toFixed(1)}%`"></i>
                <em v-if="score.featured">已达及格线 0.60</em>
              </div>
            </div>
            <div class="skill-eval-gate pass">
              <b>评估通过</b>
              <span>综合评分 0.782，已达到提交审核门槛。仍可由 AI 助手微调流程步骤和关键确认节点，进一步优化草稿质量。</span>
            </div>
            <div class="skill-eval-list">
              <div v-for="item in evalChecklist" :key="item.name">
                <span class="pass">PASS</span>
                <b>{{ item.name }}<small v-if="item.note">{{ item.note }}</small></b>
                <em>{{ item.score.toFixed(2) }}</em>
              </div>
            </div>
            <div class="skill-optimization-panel">
              <div class="skill-optimization-head">
                <div>
                  <b>AI 可继续优化</b>
                  <span>当前已达到 0.60 及格线；仍可唤起右侧 AI 助手优化流程步骤、关键节点确认，并刷新评分结果。</span>
                </div>
                <button class="btn btn-primary" @click="aiTune">AI 微调</button>
              </div>
              <div class="skill-optimization-list">
                <div v-for="opt in optimizations" :key="opt.title">
                  <span>{{ opt.no }}</span>
                  <b>{{ opt.title }}</b>
                  <p>{{ opt.desc }}</p>
                  <button @click="aiTune">{{ opt.action }}</button>
                </div>
              </div>
            </div>
            <div class="skill-case-list">
              <b>用例对比</b>
              <div v-for="c in evalCases" :key="c.id"><span>{{ c.id }} · {{ c.time }}</span><em>得分 {{ c.score }}</em></div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" @click="goStep('draft')">上一步</button>
              <button class="btn btn-secondary" @click="goStep('clarify')">返回修改</button>
              <button class="btn btn-primary" @click="nextStep('verify')">下一步：提交审核</button>
            </div>
          </div>

          <!-- 步骤面板：提交审核 -->
          <div v-if="currentStep === 'review'" class="skill-create-panel active">
            <div class="skill-doc-grid">
              <div class="skill-upload-box">
                <b>提交审核</b>
                <p>综合评分已达标，可提交 PM/平台管理员审核。创建流程到提交审核结束；审核通过后才进入上传或发布，不属于当前创建流程。</p>
                <button class="btn btn-secondary" @click="goStep('verify')">返回评估验证</button>
              </div>
              <div class="skill-doc-list">
                <div><span>门槛</span><b>综合评分 ≥ 0.60</b></div>
                <div><span>状态</span><b>当前综合评分 0.782，已达到审核门槛</b></div>
                <div><span>动作</span><b>{{ submitStatus }}</b></div>
                <div><span>后续</span><b>审核通过后才可上传发布</b></div>
              </div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" @click="goStep('verify')">上一步</button>
              <button class="btn btn-primary" :disabled="submitted" @click="submitReview">{{ submitted ? '已提交' : '提交审核' }}</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ---- 步骤状态机 ----
const steps = [
  { key: 'config', label: '基础配置' },
  { key: 'clarify', label: '需求澄清' },
  { key: 'draft', label: '草稿生成' },
  { key: 'verify', label: '评估验证' },
  { key: 'review', label: '提交审核' }
]
const currentStep = ref('config')
const currentStepLabel = computed(() => {
  const s = steps.find(s => s.key === currentStep.value)
  return s ? `${s.label}中` : ''
})

function goStep(key) {
  currentStep.value = key
}

function nextStep(from) {
  const idx = steps.findIndex(s => s.key === from)
  if (idx < steps.length - 1) {
    currentStep.value = steps[idx + 1].key
  }
}

// ---- 左侧上下文 ----
const contextItems = reactive([
  { id: 'product.query', name: '商品查询', source: '商品中心', selected: true },
  { id: 'inventory.query', name: '库存查询', source: '库存中心', selected: true },
  { id: 'product.shelf', name: '商品上下架', source: '商品中心', selected: true },
  { id: 'notify.send', name: '通知发送', source: '通知中心', selected: true }
])
const recommendItems = reactive([
  { id: 'activity.judge', name: '活动商品判断', source: '商品中心', selected: false },
  { id: 'price.query', name: '商品价格查询', source: '价格中心', selected: false },
  { id: 'tag.manage', name: '标签管理', source: '商品中心', selected: false }
])
const allContextItems = computed(() => [...contextItems, ...recommendItems])
const selectedContextItems = computed(() => allContextItems.value.filter(i => i.selected))
const selectedContextCount = computed(() => selectedContextItems.value.length)
const quickAdd = ref('')

function toggleContext(item) {
  item.selected = !item.selected
}

function fillTemplate(type) {
  quickAdd.value = type === 'query' ? '库存查询' : '商品上下架'
}

// ---- 基础配置表单 ----
const form = reactive({
  name: 'employee_certification_analysis',
  cnName: '职场人群认证数据分析',
  menu: '在职员工管理',
  scene: '运营和 PM 通过自然语言查询职场人群认证数据，分析认证方式分布、通过率趋势、失败原因和待审核积压，并生成文本摘要或表格报告。',
  input: '时间范围、认证方式、认证状态、企业名称、岗位信息、失败原因、输出格式',
  output: '指标摘要、认证方式分布表、失败原因 TopN、趋势判断、可下载 CSV 链接'
})

// ---- 需求澄清 ----
const clarifyMessages = reactive([
  { role: 'user', content: '根据职场认证 PRD、后台字段说明和测试样例，创建一个帮助 PM 和运营分析认证数据的 Skill。' },
  { role: 'ai', content: '我已读取基础配置和附件材料。这个 Skill 的核心目标是帮助团队查询职场认证数据、识别认证方式分布、通过率趋势、失败原因和待审核积压。为了更准确地设计这个 Skill，我先确认一个关键点：输出结果需要偏文本总结、表格明细，还是两者都要？' },
  { role: 'user', content: '两者都要。默认先给文字结论，再给表格。' },
  { role: 'ai', content: '好的。接下来确认触发场景：除了自然语言查询，例如"最近 7 天个税认证通过率"，是否还需要定时报告或异常提醒？' },
  { role: 'user', content: '需要。支持日报，也要能发现待审核过多、某种认证方式失败率异常。' },
  { role: 'ai', content: '明白。再确认权限和边界：这个 Skill 是否只读？是否允许导出明细 CSV？是否可以修改认证状态？' },
  { role: 'user', content: '只读，可以导出脱敏 CSV，不能修改认证状态。' },
  { role: 'ai', content: '我会将能力边界记录为：只读查询与分析、默认脱敏、导出需带权限校验、不触发认证状态变更。接下来为了验证 Skill，我建议准备 5 个测试用例：认证方式分布、失败原因 TopN、待审核积压、单企业认证明细、个税认证趋势。是否需要覆盖所有这些场景？' },
  { role: 'user', content: '需要，5 个都保留。' },
  { role: 'ai', content: '好的。最后确认交付结构：我会生成 Skill 配置、业务规则说明、测试用例和示例问法。前端展示适配为 direct_response 文本摘要、display_info 表格卡片、link_list 导出链接。这样理解是否准确？' },
  { role: 'user', content: '准确，可以进入草稿生成。' },
  { role: 'ai', content: '需求澄清已完成。当前 Skill 将支持自然语言查询、定时报告、异常提醒、脱敏导出和只读数据分析。下一步我会基于这些结论生成 Skill 草稿。' }
])

const clarifySummary = [
  { label: '基本信息', content: 'name: workplace-cert-analysis；描述：职场认证数据分析 Skill；版本：1.0.0' },
  { label: '触发场景', content: '自然语言查询、日报/周报/月报、待审核积压和失败率异常提醒。' },
  { label: '文件结构', content: '生成 skill.yaml、business_rules.md、test_cases.json、sample_queries.md。' },
  { label: '输出格式', content: 'direct_response 文本结论、display_info 表格明细、link_list 脱敏 CSV 下载。' },
  { label: '测试用例方向', content: '认证方式分布、失败原因 TopN、待审核积压、单企业明细、个税认证趋势。' },
  { label: '评估重点', content: '数据准确性、查询解析正确性、输出格式合规性、权限与脱敏可靠性。' },
  { label: '复杂度', content: 'medium；只读分析为主，涉及多字段过滤、聚合统计和权限校验。' },
  { label: 'Phoenix 输出', content: '使用 direct_response + display_info + link_list，不触发状态修改动作。' }
]

const clarifyInput = ref('')

function appendAI(content) {
  clarifyMessages.push({ role: 'ai', content })
}

function sendClarify() {
  const text = clarifyInput.value.trim()
  if (!text) return
  clarifyMessages.push({ role: 'user', content: text })
  clarifyInput.value = ''
  setTimeout(() => {
    clarifyMessages.push({ role: 'ai', content: '已收到，我会结合当前澄清结论继续完善 Skill 设计方案。' })
  }, 600)
}

function refreshSummary() {
  // 演示刷新
}

// ---- 草稿生成 ----
const draftFiles = [
  { name: 'skill.yaml', ext: 'yaml' },
  { name: 'business_rules.md', ext: 'md' },
  { name: 'test_cases.json', ext: 'json' },
  { name: 'sample_queries.md', ext: 'md' }
]
const activeFile = ref('skill.yaml')
const draftContents = {
  'skill.yaml': `skill:
  name: employee_certification_analysis
  cn_name: 职场人群认证数据分析
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
    - sample_queries.md`,
  'business_rules.md': `# 业务规则说明

## 边界
- 只读查询，不修改认证状态
- 导出前校验组织权限
- 默认脱敏处理

## 触发方式
- 自然语言查询
- 定时日报/周报
- 异常提醒（待审核过多/失败率异常）`,
  'test_cases.json': `[
  { "id": "case-1", "desc": "认证方式分布", "input": "最近7天认证方式分布", "expect": "返回企业邮箱/合同/个税/其他分布" },
  { "id": "case-2", "desc": "失败原因TopN", "input": "失败原因前5", "expect": "返回失败原因排行" },
  { "id": "case-3", "desc": "待审核积压", "input": "当前待审核数量", "expect": "返回积压数量和预警" },
  { "id": "case-4", "desc": "单企业明细", "input": "联想集团认证明细", "expect": "返回脱敏明细表格" },
  { "id": "case-5", "desc": "个税认证趋势", "input": "个税认证通过率趋势", "expect": "返回近30天趋势" }
]`,
  'sample_queries.md': `# 示例问法

- 最近 7 天个税认证通过率是多少？
- 当前有多少待审核积压？
- 帮我导出上周认证失败用户列表
- 联想集团本月认证方式分布
- 最近一个月失败原因 Top5`
}
const draftContent = computed(() => draftContents[activeFile.value] || '')

function saveDraft() {
  alert('草稿已保存')
}

// ---- 评估验证 ----
const evalScores = [
  { label: '静态评分', value: 0.872, featured: false, pass: false },
  { label: '结果评分', value: 0.804, featured: false, pass: false },
  { label: '过程评分', value: 0.742, featured: false, pass: false },
  { label: '效率评分', value: 0.831, featured: false, pass: false },
  { label: '综合评分', value: 0.782, featured: true, pass: true }
]
const evalChecklist = [
  { name: '基本信息规范', score: 1.00, note: '' },
  { name: '流程步骤清晰', score: 0.72, note: '可继续补充参数确认、异常兜底和结果交付的分步描述' },
  { name: '异常处理完善', score: 0.90, note: '已覆盖无数据、字段缺失、权限不足时的兜底话术' },
  { name: '关键节点确认', score: 0.74, note: '可继续明确导出 CSV、定时报告和异常提醒前的确认范围' },
  { name: '指令具体明确', score: 1.00, note: '' },
  { name: '资源引用有效', score: 1.00, note: '' },
  { name: '平台适配合规', score: 1.00, note: '' },
  { name: '测试用例充分', score: 1.00, note: '' }
]
const optimizations = [
  { no: '1', title: '补齐流程步骤', desc: '需要把查询、分析、异常兜底、结果输出和确认动作拆成可执行步骤。', action: '让 AI 处理' },
  { no: '2', title: '明确确认节点', desc: '导出 CSV、定时报告、异常提醒前，需要展示范围、对象、频率和影响。', action: '让 AI 处理' },
  { no: '3', title: '刷新评分结果', desc: 'AI 完成草稿微调后，自动回写评估列表、综合评分和提交审核门槛状态。', action: '开始微调' }
]
const evalCases = [
  { id: 'case-1', time: '20.9s', score: '0.88' },
  { id: 'case-2', time: '25.6s', score: '0.82' },
  { id: 'case-3', time: '26.6s', score: '0.90' }
]

function aiTune() {
  alert('AI 微调已发起，右侧 AI 助手将开始处理')
}

// ---- 提交审核 ----
const submitted = ref(false)
const submitStatus = ref('提交审核后停留当前页面，Skill Hub 状态变为待审批')

function submitReview() {
  submitted.value = true
  submitStatus.value = '已提交审核，等待管理员审批中'
}
</script>
