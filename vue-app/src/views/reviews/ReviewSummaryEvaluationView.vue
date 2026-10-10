<template>
  <section class="review-summary-evaluation-page" data-page-flow="review-summary-evaluation">
    <div class="rse-workspace">
      <ContentPageHeader
        title="评价总结"
        description="查询商品评价总结生成记录，抽样核对 AI 评价总结质量，并管理不合格处置流转。"
      />

      <section class="rse-panel rse-tabs-panel" aria-label="评价总结工作区">
        <ContentTabs
          :items="[
            { key: 'query', label: '查询' },
            { key: 'analysis', label: '分析' },
            { key: 'mark', label: '标注' },
            { key: 'queue', label: '处置', count: 3 }
          ]"
          :model-value="activeTab"
          label="评估视图"
          @update:model-value="activeTab = $event as MainTab"
        />
      </section>

      <template v-if="activeTab === 'query'">
        <ReviewSummaryView embedded />
      </template>

      <template v-else-if="activeTab === 'analysis'">
        <ReviewAnalysisPanel variant="summary" />
      </template>

      <template v-else-if="activeTab === 'mark'">
        <section
          v-if="isMarkingComplete"
          class="rse-panel rse-complete-panel"
          aria-labelledby="rse-complete-title"
        >
          <div class="rse-complete-content">
            <i aria-hidden="true">✓</i>
            <h2 id="rse-complete-title">这批样本标完了</h2>
            <p>
              已核对 {{ annotatedCount }} 条，跳过 {{ skippedCount }} 条，不合格 {{ unqualifiedCount }} 条，合格率
              {{ markingAccuracy }}
            </p>
            <button class="btn btn-primary" type="button" @click="drawNextBatch">再抽一批</button>
          </div>
        </section>

        <template v-else>
          <div class="rse-mark-toolbar">
            <section class="rse-notice-panel">
              <p>
                <strong>抽样口径：</strong>本期共生成 1,284 个总结版本，按分层规则抽取 200
                个。标注对象是 <strong>每一次生成</strong>，同一商品不同版本会分别抽样。
              </p>
              <button type="button" class="rse-text-action" @click="rulesVisible = true">
                查看抽样规则
              </button>
            </section>

          </div>
          <section class="rse-progress-panel" aria-label="标注进度">
            <div class="rse-progress-title">
              第 <strong>{{ currentVersionIndex }}</strong> / {{ totalVersions }} 个样本
              <span class="rse-current-context">ThinkBook 14 · v12 · 已核对 {{ qualityChecks.length - pendingChecks }}/{{ qualityChecks.length }} 项</span>
            </div>
            <div class="rse-progress-track" aria-hidden="true">
              <span :style="{ width: progressPercent }"></span>
            </div>
            <div class="rse-shortcuts">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                :disabled="!markHistory.length"
                @click="undoMarking"
              >
                撤销
              </button>
            </div>
          </section>

          <section class="rse-mark-grid">
            <article class="rse-panel rse-sample-panel" aria-labelledby="rse-sample-title">
              <SectionHeader
                id="rse-sample-title"
                title="原始评价样本"
                description="ThinkBook 14 轻薄本 i5 · 商品编号 1056602 · 电脑"
              ><template #meta>抽样 5 条 / 共 2140 条</template></SectionHeader>
              <div class="rse-review-list">
                <article
                  v-for="(review, reviewIndex) in sourceReviews" :key="review.date"
                  role="button" tabindex="0" :aria-pressed="activeReviewIndex === reviewIndex"
                  :aria-label="`查看第 ${reviewIndex + 1} 条原始评价`" :class="{ 'is-current-review': activeReviewIndex === reviewIndex }"
                  @click="activeReviewIndex = reviewIndex" @keydown.enter.prevent="activeReviewIndex = reviewIndex" @keydown.space.prevent="activeReviewIndex = reviewIndex"
                >
                  <span>{{ review.rating }}星 · {{ review.date }}</span>
                  <p>{{ review.content }}</p>
                </article>
              </div>
            </article>

            <article class="rse-panel rse-evaluation-panel" aria-labelledby="rse-ai-title">
              <SectionHeader id="rse-ai-title" title="AI 生成的总结"><template #meta>v12 · 生成于 2026-09-10 08:12 · 基于 2140 条评价</template></SectionHeader>

              <p class="rse-summary-box">
                整体口碑正向，用户普遍认可屏幕显示清晰、机身做工扎实，物流配送快。轻薄便携受到好评，适合日常办公与学习。部分用户提到续航表现中规中矩。
              </p>

              <section class="rse-dimension-box" aria-labelledby="rse-dimension-title">
                <div class="rse-subhead">
                  <h3 id="rse-dimension-title">抽取的维度分类</h3>
                  <span>对照左侧原文核对归类与情感是否正确</span>
                </div>
                <div class="rse-chip-row">
                  <span v-for="item in dimensions" :key="item.name" :data-tone="item.tone">
                    {{ item.name }} <strong>{{ item.sentiment }}</strong> {{ item.count }}
                  </span>
                </div>
              </section>

              <button
                type="button"
                class="rse-history-row"
                @click="historyVisible = !historyVisible"
              >
                <span :class="{ active: historyVisible }">›</span>
                该商品历史版本（2）
                <em>建议先独立判定当前版本，再展开对比</em>
              </button>
              <div v-if="historyVisible" class="rse-history-list">
                <article v-for="item in historyVersions" :key="item.version">
                  <header>
                    <strong>v{{ item.version }} · {{ item.generatedAt }} · 基于
                      {{ item.total }} 条评价</strong>
                    <span :data-result="item.result">{{ item.result }}</span>
                  </header>
                  <p>{{ item.summary }}</p>
                </article>
              </div>

              <section class="rse-quality-section" aria-labelledby="rse-quality-title">
                <h3 id="rse-quality-title">质量核对</h3>
                <p class="rse-quality-hint">逐项对照原始评价，系统根据核对结果得出结论，提交后进入下一条。</p>
                <div class="rse-check-list">
                  <div v-for="item in qualityChecks" :key="item.key" class="rse-check-row">
                    <div>
                      <strong>{{ item.label }}</strong>
                      <span
                        class="rse-help-tip"
                        tabindex="0"
                        :aria-label="item.tip"
                        :data-tooltip="item.tip"
                        data-tooltip-placement="top"
                      >
                        ?
                      </span>
                    </div>
                    <div class="rse-segment">
                      <button
                        type="button"
                        :class="{ active: item.result === 'pass' }" :aria-pressed="item.result === 'pass'"
                        @click="setCheckResult(item.key, 'pass')"
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        :class="{ active: item.result === 'fail' }" :aria-pressed="item.result === 'fail'"
                        @click="setCheckResult(item.key, 'fail')"
                      >
                        不通过
                      </button>
                    </div>
                  </div>
                </div>

                <div class="rse-check-conclusion" aria-live="polite">
                  <strong>核对结论：{{ qualityConclusion }}</strong>
                  <span v-if="pendingChecks">还有 {{ pendingChecks }} 项未判定，完成后可提交。</span>
                  <span v-else-if="failedChecks.length">{{ failedChecks.length }} 项不通过：{{ failedChecks.map(item => item.label).join('、') }}</span>
                  <span v-else>全部核对项通过，可提交当前结果。</span>
                </div>
                <label v-if="failedChecks.length" class="rse-failure-reason">
                  <span>不通过原因 <span aria-hidden="true">*</span></span>
                  <select v-model="failureReason" required>
                    <option value="" disabled>请选择不通过原因</option>
                    <option v-for="reason in failureReasons" :key="reason" :value="reason">{{ reason }}</option>
                  </select>
                </label>
                <footer class="rse-decision-actions">
                  <button class="btn btn-secondary rse-danger-action" type="button" :disabled="!canSubmitUnqualified" @click="submitQualityChecks">不合格</button>
                  <button class="btn btn-primary" type="button" :disabled="!canSubmitQualified" @click="submitQualityChecks">合格</button>
                </footer>
                <p class="rse-mark-result" aria-live="polite">{{ markResultText }}</p>
              </section>
            </article>
          </section>
        </template>
      </template>

      <template v-else>
        <section class="rse-panel rse-flow-panel" aria-label="处置流程">
          <SectionHeader title="处置流程" description="高亮环节为当前角色职责，工单操作随角色权限同步切换。">
            <template #actions>
              <label class="rse-role-field">
                <span>当前角色</span>
                <select v-model="currentRole" class="rse-role-select" aria-label="当前角色">
                  <option v-for="role in (['标注员', '仲裁员', '开发', '产品'] as const)" :key="role" :value="role">{{ role }}</option>
                </select>
              </label>
            </template>
          </SectionHeader>
          <ol class="rse-flow-steps" aria-label="处置环节与责任人">
            <li
              v-for="(step, index) in flowSteps" :key="step.label" class="rse-flow-step" :data-owned="stepRoleMap[step.label] === currentRole"
            >
              <i aria-hidden="true">{{ index + 1 }}</i>
              <strong>{{ step.label }}</strong>
              <span>{{ step.owner }}</span>
            </li>
          </ol>
        </section>

        <ListSurface class="rse-queue-panel" aria-labelledby="rse-queue-title">
          <template #tabs>
            <div class="rse-queue-title-area">
              <SectionHeader id="rse-queue-title" title="处置工单" :description="`当前角色：${currentRole}。仅显示有权限执行的工单操作，可查看全部工单流转。`" />
            </div>
            <ContentTabs
              :items="queueFilters" :model-value="activeQueueFilter" label="工单状态"
              @update:model-value="activeQueueFilter = $event as QueueFilter"
            />
          </template>

          <div class="rse-table-scroll">
            <table class="rse-table">
              <thead>
                <tr>
                  <th>工单号</th>
                  <th>商品 / 版本</th>
                  <th>等级</th>
                  <th>不合格维度</th>
                  <th>前台状态</th>
                  <th>当前环节</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ticket in filteredTickets" :key="ticket.id">
                  <td>{{ ticket.id }}</td>
                  <td>
                    <strong>{{ ticket.product }}</strong>
                    <span class="rse-row-meta">{{ ticket.code }} · {{ ticket.version }}</span>
                  </td>
                  <td>
                    <StatusTag :tone="ticket.level === '严重' ? 'danger' : 'warning'">{{
                      ticket.level
                    }}</StatusTag>
                  </td>
                  <td>{{ ticket.dimension }}</td>
                  <td>
                    <StatusTag :tone="ticket.frontStatus === '展示中' ? 'success' : 'neutral'">{{
                      ticket.frontStatus
                    }}</StatusTag>
                  </td>
                  <td>
                    <span class="rse-stage-tag" :data-stage="ticket.stage">{{ ticket.stage }}</span>
                    <em>{{ ticket.time }}</em>
                  </td>
                  <td>
                    <div class="rse-table-actions">
                      <button class="rse-text-action" type="button" @click="openTicketFlow(ticket)">
                        查看流转
                      </button>
                      <button
                        v-if="canHandleTicketAction(ticket)"
                        class="rse-muted-action"
                        type="button"
                        @click="handleTicketAction(ticket)"
                      >
                        {{ ticketAction(ticket) }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ListSurface>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="rulesVisible" class="rse-modal-layer" @click.self="rulesVisible = false">
        <section
          class="rse-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rse-rules-title"
        >
          <header>
            <h2 id="rse-rules-title">抽样规则</h2>
            <button type="button" aria-label="关闭" data-dialog-close @click="rulesVisible = false">
              ×
            </button>
          </header>
          <div class="rse-rule-content">
            <section>
              <h3>抽样池</h3>
              <p>统计周期内所有成功生成的总结版本。周期内未重算的商品不进入本期抽样池。</p>
            </section>
            <section>
              <h3>基础量</h3>
              <p>每期 200 个版本，保证准确率的统计置信度。</p>
            </section>
            <section>
              <h3>分层规则</h3>
              <div class="rse-table-scroll">
                <table class="rse-table rse-rule-table">
                  <thead>
                    <tr>
                      <th>分层维度</th>
                      <th>分层方式</th>
                      <th>原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="rule in samplingRules" :key="rule.dimension">
                      <td>{{ rule.dimension }}</td>
                      <td>{{ rule.method }}</td>
                      <td>{{ rule.reason }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h3>定向补充</h3>
              <p>
                在基础量之外追加：用户点踩过的总结、评分 3
                星以下商品、新上线品类首版总结。这些是高风险区，不依赖随机抽样覆盖。
              </p>
            </section>
          </div>
        </section>
      </div>
    </Teleport>


    <Teleport to="body">
      <div v-if="selectedTicket" class="rse-modal-layer" @click.self="closeTicketDialog">
        <section
          class="rse-modal rse-ticket-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rse-ticket-title"
        >
          <header>
            <h2 id="rse-ticket-title">工单流转记录</h2>
            <button type="button" aria-label="关闭" data-dialog-close @click="closeTicketDialog">
              ×
            </button>
          </header>
          <div class="rse-ticket-content">
            <section class="rse-ticket-summary">
              <h3>{{ selectedTicket.product }}</h3>
              <p>
                {{ selectedTicket.id }} · {{ selectedTicket.code }} · {{ selectedTicket.version }} ·
                {{ selectedTicket.level }}级
              </p>
            </section>
            <p class="rse-ticket-summary-box">{{ selectedTicket.summary }}</p>
            <section class="rse-ticket-reason">
              <h3>不合格原因</h3>
              <p>{{ selectedTicket.dimension }}：{{ selectedTicket.reason }}</p>
            </section>
            <ol class="rse-ticket-timeline" aria-label="工单流转时间线">
              <li
                v-for="(step, index) in ticketTimeline"
                :key="step.label"
                :data-state="step.state"
              >
                <i>{{ step.state === 'done' ? '✓' : index + 1 }}</i>
                <div>
                  <strong>{{ step.label }}</strong>
                  <span>{{ step.meta }}</span>
                </div>
              </li>
            </ol>
          </div>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="actionTicket && actionDialog"
        class="rse-modal-layer"
        @click.self="closeActionDialog"
      >
        <section
          v-if="actionDialog === 'arb'"
          class="rse-modal rse-action-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rse-arb-title"
        >
          <header>
            <h2 id="rse-arb-title">仲裁裁决</h2>
            <button type="button" aria-label="关闭" data-dialog-close @click="closeActionDialog">
              ×
            </button>
          </header>
          <div class="rse-action-content">
            <p class="rse-action-note">
              {{ actionTicket.product }} · {{ actionTicket.code }} · {{ actionTicket.version }}
            </p>
            <p class="rse-ticket-summary-box">{{ actionTicket.summary }}</p>
            <section class="rse-action-section">
              <h3>标注员判定</h3>
              <p>
                {{ actionTicket.dimension }}（{{ actionTicket.level }}级）：{{
                  actionTicket.reason
                }}
                <span>由 标注员 {{ actionTicket.marker }} 于 {{ actionTicket.time }} 标记</span>
              </p>
            </section>
            <div
              class="rse-action-alert"
              :data-tone="actionTicket.level === '严重' ? 'danger' : 'info'"
            >
              {{
                actionTicket.level === '严重'
                  ? '严重级：裁决成立后将立即从前台下线该总结，商品详情回退为展示原始评价。'
                  : '一般级：裁决成立后不下线，仅触发重算，新版本复核通过后替换。'
              }}
            </div>
            <label class="rse-action-field">
              <span>裁决说明</span>
              <textarea
                v-model="arbNote"
                rows="2"
                placeholder="选填，不成立时建议填写理由"
              ></textarea>
            </label>
          </div>
          <footer class="rse-modal-footer">
            <button
              data-dialog-close
              class="btn btn-secondary btn-sm"
              type="button"
              @click="closeActionDialog"
            >
              取消
            </button>
            <button class="btn btn-secondary btn-sm" type="button" @click="submitArb(false)">
              不成立，驳回工单
            </button>
            <button class="btn btn-primary btn-sm" type="button" @click="submitArb(true)">
              成立，确认{{ actionTicket.level === '严重' ? '下线' : '重算' }}
            </button>
          </footer>
        </section>

        <section
          v-else-if="actionDialog === 'dev'"
          class="rse-modal rse-action-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rse-dev-title"
        >
          <header>
            <h2 id="rse-dev-title">开发确认</h2>
            <button type="button" aria-label="关闭" data-dialog-close @click="closeActionDialog">
              ×
            </button>
          </header>
          <div class="rse-action-content">
            <p class="rse-action-note">
              {{ actionTicket.product }} · {{ actionTicket.code }}　原
              {{ actionTicket.version }} 判定不合格（{{ actionTicket.dimension }}），系统已重算生成
              {{ nextVersion(actionTicket) }}
            </p>
            <div class="rse-version-grid">
              <section>
                <h3>原版本 {{ actionTicket.version }}　{{ actionTicket.frontStatus }}</h3>
                <p>{{ actionTicket.summary }}</p>
              </section>
              <section>
                <h3>重算版本 {{ nextVersion(actionTicket) }}　待确认</h3>
                <p>{{ actionTicket.newSummary }}</p>
              </section>
            </div>
            <label class="rse-action-field">
              <span>问题原因<strong>＊</strong></span>
              <textarea
                v-model="devCause"
                rows="3"
                placeholder="说明这次出错的技术原因与已做的处理，例如：提示词未定义主商品与赠品边界，已补充识别规则并重跑"
              ></textarea>
              <em>该原因会随工单留存，供后续同类问题追溯。</em>
            </label>
          </div>
          <footer class="rse-modal-footer">
            <button
              data-dialog-close
              class="btn btn-secondary btn-sm"
              type="button"
              @click="closeActionDialog"
            >
              取消
            </button>
            <button
              class="btn btn-secondary btn-sm rse-danger-action"
              type="button"
              @click="submitDev(false)"
            >
              重算结果仍有问题，退回重算
            </button>
            <button class="btn btn-primary btn-sm" type="button" @click="submitDev(true)">
              确认无误，转产品
            </button>
          </footer>
        </section>

        <section
          v-else
          class="rse-modal rse-action-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rse-ops-title"
        >
          <header>
            <h2 id="rse-ops-title">产品确认上线</h2>
            <button type="button" aria-label="关闭" data-dialog-close @click="closeActionDialog">
              ×
            </button>
          </header>
          <div class="rse-action-content">
            <p class="rse-action-note">
              {{ actionTicket.product }} · {{ actionTicket.code }}　确认后
              {{ nextVersion(actionTicket) }} 立即上线
            </p>
            <div class="rse-version-grid">
              <section>
                <h3>原版本 {{ actionTicket.version }}　{{ actionTicket.frontStatus }}</h3>
                <p>{{ actionTicket.summary }}</p>
              </section>
              <section>
                <h3>重算版本 {{ nextVersion(actionTicket) }}　待上线</h3>
                <p>{{ actionTicket.newSummary }}</p>
              </section>
            </div>
            <section class="rse-dev-note">
              <h3>开发已确认　{{ actionTicket.devBy }}</h3>
              <p>{{ actionTicket.devCause }}</p>
            </section>
            <p class="rse-action-help">
              确认后新版本立即替换前台内容，该总结将纳入下期抽检验证修复效果。
            </p>
          </div>
          <footer class="rse-modal-footer">
            <button
              data-dialog-close
              class="btn btn-secondary btn-sm"
              type="button"
              @click="closeActionDialog"
            >
              取消
            </button>
            <button
              class="btn btn-secondary btn-sm rse-danger-action"
              type="button"
              @click="submitReview(false)"
            >
              退回开发
            </button>
            <button class="btn btn-primary btn-sm" type="button" @click="submitReview(true)">
              确认上线
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onDeactivated, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useDialogFocusManager } from '@/composables/useDialogFocusManager'
import ContentTabs from '@/components/content/ContentTabs.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ReviewAnalysisPanel from '@/views/reviews/ReviewAnalysisPanel.vue'
import ReviewSummaryView from '@/views/reviews/ReviewSummaryView.vue'

type MainTab = 'query' | 'analysis' | 'mark' | 'queue'
type CheckResult = 'pass' | 'fail' | null
type MarkAction = 'qualified' | 'unqualified' | 'skipped'
type QueueFilter = 'all' | 'arbitration' | 'dev' | 'ops' | 'done'
type Role = '标注员' | '仲裁员' | '开发' | '产品'
type ActionDialog = 'arb' | 'dev' | 'ops'

interface SourceReview {
  rating: number
  date: string
  content: string
}

interface DimensionChip {
  name: string
  sentiment: string
  count: number
  tone: 'positive' | 'neutral'
}

interface QualityCheck {
  key: string
  label: string
  tip: string
  result: CheckResult
}

interface HistoryVersion {
  version: number
  generatedAt: string
  total: number
  result: '合格' | '不合格'
  summary: string
}

interface FlowStep {
  label: string
  owner: string
  icon: string
  tone: 'done' | 'current' | 'muted'
}

interface QueueTicket {
  id: string
  product: string
  code: string
  version: string
  level: '严重' | '一般'
  dimension: string
  frontStatus: '展示中' | '已下线'
  stage: '待裁决' | '待开发确认' | '待产品确认' | '已驳回' | '已上线' | '重算中'
  time: string
  filter: QueueFilter
  action?: string
  summary: string
  newSummary: string
  reason: string
  marker: string
  devCause: string
  devBy: string
}

const activeTab = ref<MainTab>('query')
const rulesVisible = ref(false)
const currentRole = ref<Role>('标注员')
const activeQueueFilter = ref<QueueFilter>('all')
const currentVersionIndex = ref(1)
const totalVersions = 4
const processedCount = ref(0)
const unqualifiedCount = ref(0)
const skippedCount = ref(0)
const markHistory = ref<{ result: MarkAction; checks: QualityCheck[]; reason: string; reviewIndex: number | null }[]>([])
const failureReason = ref('')
const activeReviewIndex = ref<number | null>(null)
const failureReasons = ['结论与原始评价不一致', '存在无依据或虚假事实', '错误归因', '维度分类或情感判断错误', '较上一版质量回退', '其他质量问题']
const historyVisible = ref(false)
const selectedTicket = ref<QueueTicket | null>(null)
const ticketDialogText = ref('仲裁决策未开始。')
const actionTicket = ref<QueueTicket | null>(null)
const actionDialog = ref<ActionDialog | null>(null)
const arbNote = ref('')
const devCause = ref('')

const annotatedCount = computed(() => processedCount.value - skippedCount.value)
const isMarkingComplete = computed(() => processedCount.value >= totalVersions)
const markingAccuracy = computed(() => {
  if (!annotatedCount.value) return '—'
  return `${(((annotatedCount.value - unqualifiedCount.value) / annotatedCount.value) * 100).toFixed(1)}%`
})
const markResultText = computed(() => buildMarkResultText())
const progressPercent = computed(
  () => `${Math.round((processedCount.value / totalVersions) * 100)}%`
)

const sourceReviews: SourceReview[] = [
  {
    rating: 5,
    date: '2026-09-08',
    content: '屏幕非常清晰，色彩也准，办公看文档很舒服。机身做工扎实，边角处理得很好。'
  },
  {
    rating: 5,
    date: '2026-09-07',
    content: '下单第二天就到了，物流真的快。轻薄是最大优点，放包里几乎没感觉。'
  },
  {
    rating: 4,
    date: '2026-09-06',
    content: '整体满意，就是续航一般，中度使用大概五六个小时，出门还是得带充电器。'
  },
  {
    rating: 5,
    date: '2026-09-05',
    content: '上课带着很方便，不重。屏幕素质在这个价位算不错的了。'
  },
  {
    rating: 4,
    date: '2026-09-04',
    content: '做工没得说，金属机身手感好。续航中规中矩吧，够用但不惊艳。'
  }
]

const dimensions: DimensionChip[] = [
  { name: '屏幕', sentiment: '正向', count: 2, tone: 'positive' },
  { name: '做工', sentiment: '正向', count: 2, tone: 'positive' },
  { name: '物流', sentiment: '正向', count: 1, tone: 'positive' },
  { name: '便携', sentiment: '正向', count: 2, tone: 'positive' },
  { name: '续航', sentiment: '中性', count: 2, tone: 'neutral' }
]

const historyVersions: HistoryVersion[] = [
  {
    version: 11,
    generatedAt: '2026-09-09 20:30',
    total: 2098,
    result: '合格',
    summary:
      '整体评价正向，屏幕清晰、做工扎实受到认可，物流速度快。轻薄便携适合日常办公，续航表现中规中矩。'
  },
  {
    version: 10,
    generatedAt: '2026-09-08 18:12',
    total: 2056,
    result: '合格',
    summary: '用户对屏幕显示和机身做工评价较好，物流快。便携性受到好评，适合办公与学习场景。'
  }
]

const initialQualityChecks: QualityCheck[] = [
  {
    key: 'consistent',
    label: '结论与原始评价一致',
    tip: '总结的整体结论需要与左侧评价样本表达一致，不应把中性或负向评价概括为正向。',
    result: null
  },
  {
    key: 'fact',
    label: '无虚假事实',
    tip: '总结不能出现评价原文未提及的事实、参数、服务承诺或体验结论。',
    result: null
  },
  {
    key: 'reason',
    label: '无错误归因',
    tip: '问题原因和维度归因要和评价原文一致，不能把物流、质量、服务等原因混淆。',
    result: null
  },
  {
    key: 'dimension',
    label: '维度分类正确',
    tip: '抽取的维度和情感判断要准确，分类要能从原始评价中找到依据。',
    result: null
  },
  {
    key: 'regression',
    label: '较上一版无质量回退',
    tip: '上一版正确表达的内容，本版不能丢失、变错或产生更低质量表述。',
    result: null
  }
]

const qualityChecks = ref<QualityCheck[]>(copyInitialQualityChecks())
const pendingChecks = computed(() => qualityChecks.value.filter(item => item.result === null).length)
const failedChecks = computed(() => qualityChecks.value.filter(item => item.result === 'fail'))
const qualityConclusion = computed(() => pendingChecks.value ? '待完成' : failedChecks.value.length ? '不合格' : '合格')
const canSubmitQualified = computed(() => !pendingChecks.value && !failedChecks.value.length)
const canSubmitUnqualified = computed(() => !pendingChecks.value && Boolean(failedChecks.value.length) && Boolean(failureReason.value))

const baseFlowSteps: Omit<FlowStep, 'tone'>[] = [
  { label: '标记', owner: '标注员', icon: '✓' },
  { label: '裁决', owner: '仲裁员', icon: '⚖' },
  { label: '下线', owner: '裁决后触发', icon: '↓' },
  { label: '重算', owner: '系统自动', icon: '↻' },
  { label: '开发确认', owner: '填写原因', icon: '▥' },
  { label: '产品确认', owner: '上线', icon: '◎' },
  { label: '下期抽检', owner: '验证', icon: '○' }
]

const queueFilters = [
  { key: 'all' as const, label: '全部', count: 5 },
  { key: 'arbitration' as const, label: '待裁决', count: 1 },
  { key: 'dev' as const, label: '待开发确认', count: 1 },
  { key: 'ops' as const, label: '待产品确认', count: 1 },
  { key: 'done' as const, label: '已完成', count: 1 }
]

const tickets = ref<QueueTicket[]>([
  {
    id: 'QC-260910-01',
    product: '小新 Pro 14 锐龙版',
    code: '1056577',
    version: 'v7',
    level: '严重',
    dimension: '无虚假事实',
    frontStatus: '展示中',
    stage: '待裁决',
    time: '2026-09-10 09:40',
    filter: 'arbitration',
    action: '裁决',
    summary:
      '性能表现获得广泛认可，运行流畅，屏幕素质高。散热控制出色，长时间高负载无压力。外观质感好。',
    newSummary:
      '性能表现获得认可，运行流畅，屏幕素质较高，外观质感好。部分评价提到高负载场景仍需继续观察。',
    reason: '评价原文无人提及散热，总结称“散热控制出色”',
    marker: '艾国炎',
    devCause: '',
    devBy: ''
  },
  {
    id: 'QC-260910-02',
    product: '异能者 One 一体机',
    code: '1056612',
    version: 'v3',
    level: '严重',
    dimension: '结论与原文不一致',
    frontStatus: '已下线',
    stage: '待开发确认',
    time: '2026-09-10 11:05',
    filter: 'dev',
    action: '开发确认',
    summary: '整体口碑偏正向，用户认可外观和安装便利，但部分评价集中反馈噪声和售后响应问题。',
    newSummary:
      '评价集中反馈噪声控制和售后响应问题，外观和安装便利性有一定认可，整体口碑存在明显分化。',
    reason: '原文负向反馈占比高，总结仍给出“整体口碑偏正向”',
    marker: '张玥',
    devCause: '',
    devBy: ''
  },
  {
    id: 'QC-260909-07',
    product: '小新平板 Pro 12.7',
    code: '1056590',
    version: 'v2',
    level: '一般',
    dimension: '维度分类错误',
    frontStatus: '展示中',
    stage: '待产品确认',
    time: '2026-09-09 18:20',
    filter: 'ops',
    action: '产品确认',
    summary: '屏幕显示细腻，系统交互顺滑，适合学习笔记和影音娱乐，配件体验评价分化。',
    newSummary:
      '屏幕显示细腻，系统交互顺滑，适合学习笔记和影音娱乐。配件体验评价分化，手写笔延迟应归入配件体验。',
    reason: '将“手写笔延迟”归入物流维度，实际应归入配件体验',
    marker: '艾国炎',
    devCause: '维度分类规则未区分配件使用体验与物流服务，已补充配件关键词和上下文归类规则并重跑。',
    devBy: '开发 周凯'
  },
  {
    id: 'QC-260909-11',
    product: 'ThinkPad E14 商用本',
    code: '1056603',
    version: 'v5',
    level: '一般',
    dimension: '维度分类错误',
    frontStatus: '展示中',
    stage: '已驳回',
    time: '2026-09-09 18:05',
    filter: 'all',
    summary: '商务办公体验稳定，键盘手感和接口数量评价较好，机身重量反馈中性。',
    newSummary: '商务办公体验稳定，键盘手感和接口数量评价较好，机身重量反馈中性。',
    reason: '人工复核后确认维度归类可接受，驳回不合格标记',
    marker: '张玥',
    devCause: '',
    devBy: ''
  },
  {
    id: 'QC-260908-03',
    product: 'YOGA Air 14s 超轻薄',
    code: '1056585',
    version: 'v4',
    level: '一般',
    dimension: '无错误归因',
    frontStatus: '展示中',
    stage: '已上线',
    time: '2026-09-08 17:20',
    filter: 'done',
    summary: '机身轻薄便携，屏幕观感清晰，日常办公续航基本够用，适合通勤携带。',
    newSummary: '机身轻薄便携，屏幕观感清晰，日常办公续航基本够用，适合通勤携带。',
    reason: '重算后已消除错误归因，产品确认上线',
    marker: '张玥',
    devCause: '提示词对续航与轻薄卖点权重过高，已补充负向证据优先级并重跑。',
    devBy: '开发 周凯'
  }
])

const samplingRules = [
  {
    dimension: '样本量',
    method: '20-100 条 / 100-1000 条 / 1000 条以上，各抽约 1/3',
    reason: '低样本量商品观点分散，最易过度概括，按量随机会抽不到'
  },
  {
    dimension: '产品组',
    method: '各品类按在池占比分配，单一品类不超过 40%',
    reason: '避免全部集中在热门品类'
  },
  {
    dimension: '生成时间',
    method: '按日均匀分布，单日不超过总量的 15%',
    reason: '避开某天模型异常导致的批量偏差'
  }
]

const filteredTickets = computed(() => {
  if (activeQueueFilter.value === 'all') return tickets.value
  return tickets.value.filter((ticket) => ticket.filter === activeQueueFilter.value)
})

const currentFlowIndex = computed(() => {
  if (activeQueueFilter.value === 'dev') return 4
  if (activeQueueFilter.value === 'ops') return 5
  if (activeQueueFilter.value === 'done') return 6
  return 1
})

const flowSteps = computed<FlowStep[]>(() =>
  baseFlowSteps.map((step, index) => ({
    ...step,
    tone:
      index < currentFlowIndex.value
        ? 'done'
        : index === currentFlowIndex.value
          ? 'current'
          : 'muted'
  }))
)

const stepRoleMap: Record<string, Role> = { 标记: '标注员', 裁决: '仲裁员', 开发确认: '开发', 产品确认: '产品', 下期抽检: '标注员' }

const actionRoleMap: Record<string, Role> = {
  裁决: '仲裁员',
  开发确认: '开发',
  产品确认: '产品'
}

const ticketTimeline = computed(() => {
  if (!selectedTicket.value) return []
  const stageOrder = ['待裁决', '待开发确认', '待产品确认', '已上线']
  const activeIndex = Math.max(1, stageOrder.indexOf(selectedTicket.value.stage) + 1)
  const finalDone = selectedTicket.value.stage === '已上线'
  const rejected = selectedTicket.value.stage === '已驳回'
  return [
    {
      label: '标记不合格',
      meta: `${selectedTicket.value.time}　标注员 ${selectedTicket.value.marker}`,
      state: 'done'
    },
    {
      label: '仲裁裁决',
      meta:
        activeIndex > 1 || finalDone || rejected
          ? '仲裁员已确认不合格原因'
          : ticketDialogText.value,
      state: activeIndex > 1 || finalDone || rejected ? 'done' : 'current'
    },
    {
      label: '前台下线',
      meta: activeIndex > 2 || finalDone ? '已下线并阻断前台展示' : '未开始',
      state: activeIndex > 2 || finalDone ? 'done' : 'todo'
    },
    {
      label: '触发重算',
      meta: activeIndex > 2 || finalDone ? '系统已触发重算任务' : '未开始',
      state: activeIndex > 2 || finalDone ? 'done' : 'todo'
    },
    {
      label: '开发确认',
      meta: activeIndex > 3 || finalDone ? '开发已确认原因并完成修复' : '未开始',
      state: activeIndex > 3 || finalDone ? 'done' : activeIndex === 3 ? 'current' : 'todo'
    },
    {
      label: '产品确认上线',
      meta: finalDone ? '产品已确认上线' : '未开始',
      state: finalDone ? 'done' : activeIndex === 4 ? 'current' : 'todo'
    },
    {
      label: '纳入下期抽检',
      meta: finalDone ? '已纳入下期抽检池' : '未开始',
      state: finalDone ? 'done' : 'todo'
    }
  ]
})

function setCheckResult(key: string, result: CheckResult) {
  qualityChecks.value = qualityChecks.value.map((item) =>
    item.key === key ? { ...item, result } : item
  )
}

function submitQualityChecks() {
  if (!canSubmitQualified.value && !canSubmitUnqualified.value) return
  advanceMarking(failedChecks.value.length ? 'unqualified' : 'qualified')
}

function drawNextBatch() {
  processedCount.value = 0
  unqualifiedCount.value = 0
  skippedCount.value = 0
  markHistory.value = []
  historyVisible.value = false
  currentVersionIndex.value = 1
  resetQualityChecks()
}

function copyInitialQualityChecks() {
  return initialQualityChecks.map((item) => ({ ...item }))
}

function resetQualityChecks() {
  qualityChecks.value = copyInitialQualityChecks()
  failureReason.value = ''
  activeReviewIndex.value = null
}

function buildMarkResultText() {
  if (!processedCount.value) return '本批已核对 0 条，跳过 0 条，当前合格率 —'
  return `本批已核对 ${annotatedCount.value} 条，其中不合格 ${unqualifiedCount.value} 条，跳过 ${skippedCount.value} 条，当前合格率 ${markingAccuracy.value}`
}

function advanceMarking(result: MarkAction) {
  if (processedCount.value >= totalVersions) return

  markHistory.value.push({ result, checks: qualityChecks.value.map(item => ({ ...item })), reason: failureReason.value.trim(), reviewIndex: activeReviewIndex.value })
  processedCount.value += 1
  if (result === 'unqualified') unqualifiedCount.value += 1
  if (result === 'skipped') skippedCount.value += 1

  currentVersionIndex.value = Math.min(processedCount.value + 1, totalVersions)
  resetQualityChecks()
  historyVisible.value = false
}

function undoMarking() {
  const lastAction = markHistory.value.pop()
  if (!lastAction) return

  processedCount.value = Math.max(processedCount.value - 1, 0)
  if (lastAction.result === 'unqualified') unqualifiedCount.value = Math.max(unqualifiedCount.value - 1, 0)
  if (lastAction.result === 'skipped') skippedCount.value = Math.max(skippedCount.value - 1, 0)

  currentVersionIndex.value = Math.min(processedCount.value + 1, totalVersions)
  qualityChecks.value = lastAction.checks.map(item => ({ ...item }))
  failureReason.value = lastAction.reason
  activeReviewIndex.value = lastAction.reviewIndex
  historyVisible.value = false
}

function openTicketFlow(ticket: QueueTicket) {
  selectedTicket.value = ticket
  ticketDialogText.value = ticket.stage === '待裁决' ? '未开始' : '等待当前角色确认'
}

function handleTicketAction(ticket: QueueTicket) {
  const action = ticketAction(ticket)
  if (!action || !canHandleTicketAction(ticket)) return

  actionTicket.value = ticket
  if (ticket.stage === '待裁决') {
    actionDialog.value = 'arb'
    arbNote.value = ''
    return
  }
  if (ticket.stage === '待开发确认') {
    actionDialog.value = 'dev'
    devCause.value = ticket.devCause
    return
  }
  actionDialog.value = 'ops'
}

function closeTicketDialog() {
  selectedTicket.value = null
}

function ticketAction(ticket: QueueTicket) {
  if (ticket.stage === '待裁决') return '裁决'
  if (ticket.stage === '待开发确认') return '开发确认'
  if (ticket.stage === '待产品确认') return '产品确认'
  return ''
}

function canHandleTicketAction(ticket: QueueTicket) {
  const action = ticketAction(ticket)
  return Boolean(action && actionRoleMap[action] === currentRole.value)
}

function closeActionDialog() {
  actionTicket.value = null
  actionDialog.value = null
}

function submitArb(stand: boolean) {
  const ticket = actionTicket.value
  if (!ticket) return
  if (stand) {
    const severe = ticket.level === '严重'
    ticket.frontStatus = severe ? '已下线' : '展示中'
    ticket.stage = '待开发确认'
    ticket.filter = 'dev'
    ticket.time = formatNow()
    ticket.devCause = ''
    ticket.devBy = ''
  } else {
    ticket.stage = '已驳回'
    ticket.filter = 'all'
    ticket.frontStatus = '展示中'
    ticket.time = formatNow()
    ticket.reason = arbNote.value ? `${ticket.reason}；驳回说明：${arbNote.value}` : ticket.reason
  }
  closeActionDialog()
}

function submitDev(pass: boolean) {
  const ticket = actionTicket.value
  if (!ticket) return
  if (pass) {
    if (!devCause.value.trim()) return
    ticket.devCause = devCause.value
    ticket.devBy = '开发（本次操作）'
    ticket.stage = '待产品确认'
    ticket.filter = 'ops'
  } else {
    ticket.stage = '重算中'
    ticket.filter = 'all'
  }
  ticket.time = formatNow()
  closeActionDialog()
}

function submitReview(pass: boolean) {
  const ticket = actionTicket.value
  if (!ticket) return
  if (pass) {
    ticket.stage = '已上线'
    ticket.filter = 'done'
    ticket.frontStatus = '展示中'
    ticket.version = nextVersion(ticket)
    ticket.summary = ticket.newSummary
  } else {
    ticket.stage = '待开发确认'
    ticket.filter = 'dev'
  }
  ticket.time = formatNow()
  closeActionDialog()
}

function nextVersion(ticket: QueueTicket) {
  const versionNumber = Number(ticket.version.replace(/^v/u, ''))
  return Number.isFinite(versionNumber) ? `v${versionNumber + 1}` : `${ticket.version}+1`
}

function formatNow() {
  const now = new Date()
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((item) => String(item).padStart(2, '0'))
    .join('-')
  const time = [now.getHours(), now.getMinutes()]
    .map((item) => String(item).padStart(2, '0'))
    .join(':')
  return `${date} ${time}`
}

function closeReviewDialogs() {
  rulesVisible.value = false
  closeTicketDialog()
  closeActionDialog()
}

onBeforeRouteLeave(closeReviewDialogs)
onDeactivated(closeReviewDialogs)

useDialogFocusManager(ref<HTMLElement | null>(document.body), '.rse-modal-layer', '.rse-modal')
</script>

<style scoped lang="scss">
.review-summary-evaluation-page {
  container-type: inline-size;
  padding: 0;
  min-width: 0;
}

.rse-workspace {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.rse-panel,
.rse-notice-panel,
.rse-progress-panel,
.rse-queue-notice {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.rse-notice-panel,
.rse-progress-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}

.rse-notice-panel {
  background: var(--color-primary-subtle);
}

.rse-notice-panel p,
.rse-mark-result,
.rse-rule-content p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  line-height: 1.7;
}

.rse-mark-result {
  margin-top: 8px;
}

.rse-notice-panel strong {
  color: var(--color-text);
}

.rse-text-action,
.rse-muted-action {
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
}

.rse-muted-action {
  color: var(--color-primary);
}

.rse-muted-action:disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.rse-progress-title {
  flex: 0 0 auto;
  color: var(--color-text);
  font-size: var(--text-md, 16px);
  font-weight: 600;
}

.rse-progress-title strong {
  color: var(--color-primary);
}

.rse-progress-track {
  flex: 1 1 auto;
  height: 6px;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--color-bg-subtle);
}

.rse-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.rse-shortcuts {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: var(--text-xs, 12px);
  white-space: nowrap;
}

.rse-shortcuts .btn-secondary {
  color: var(--color-text);
}

.rse-shortcuts .btn-secondary:not(:disabled):hover,
.rse-shortcuts .btn-secondary:not(:disabled):focus-visible {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-text);
}

.rse-shortcuts kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--text-xs, 12px);
  font-weight: 600;
}

.rse-mark-grid {
  align-items: stretch;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
}

.rse-sample-panel,
.rse-evaluation-panel,
.rse-flow-panel {
  min-width: 0;
  padding: 16px;
}

.rse-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.rse-panel-head h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-md, 16px);
  line-height: 1.5;
}

.rse-panel-head p,
.rse-panel-head span {
  margin: 8px 0 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm, 13px);
  line-height: 1.5;
}

.rse-review-list {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.rse-review-list article {
  display: grid;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.rse-review-list article:last-child {
  border-bottom: 0;
}

.rse-review-list span,
.rse-stage-tag + em,
.rse-subhead span,
.rse-history-row em {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs, 12px);
  font-style: normal;
}

.rse-review-list p {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm, 13px);
  line-height: 1.7;
}

.rse-summary-box {
  margin: 0 0 12px;
  padding: 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-primary-subtle);
  color: var(--color-text);
  font-size: var(--text-sm, 13px);
  line-height: 1.8;
}

.rse-dimension-box,
.rse-history-row {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.rse-subhead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rse-subhead h3,
.rse-rule-content h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-base, 14px);
  line-height: 1.5;
}

.rse-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rse-chip-row span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 26px;
  padding: 0 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 4px;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--text-xs, 12px);
}

.rse-chip-row span[data-tone='positive'] {
  border-color: color-mix(in srgb, var(--color-success) 35%, var(--color-border-subtle));
  background: var(--color-success-subtle);
}

.rse-chip-row span[data-tone='neutral'] {
  border-color: var(--color-border);
}

.rse-chip-row strong {
  color: var(--color-success);
  font-weight: 600;
}

.rse-history-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  text-align: left;
  cursor: pointer;
}

.rse-history-row > span:first-child {
  transition: transform 0.2s ease;
}

.rse-history-row > span:first-child.active {
  transform: rotate(90deg);
}

.rse-history-list {
  display: grid;
  gap: 8px;
  margin: 0 0 12px;
}

.rse-history-list article {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.rse-history-list header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rse-history-list strong {
  color: var(--color-text-secondary);
  font-size: var(--text-xs, 12px);
  font-weight: 600;
  line-height: 1.5;
}

.rse-history-list header span {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border: 1px solid var(--color-success-subtle);
  border-radius: 4px;
  background: var(--color-success-subtle);
  color: var(--color-success);
  font-size: var(--text-xs, 12px);
}

.rse-history-list header span[data-result='不合格'] {
  border-color: var(--color-danger-subtle);
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.rse-history-list p {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm, 13px);
  line-height: 1.7;
}

.rse-check-list {
  display: grid;
  border-top: 1px dashed var(--color-border-subtle);
}

.rse-check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
  border-bottom: 1px dashed var(--color-border-subtle);
}

.rse-check-row > div:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text);
  font-size: var(--text-sm, 13px);
}

.rse-check-row span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background: var(--color-bg-subtle);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs, 12px);
}

.rse-check-row .rse-help-tip {
  cursor: pointer;
  outline: none;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.rse-check-row .rse-help-tip:hover,
.rse-check-row .rse-help-tip:focus-visible {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.rse-segment {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.2s ease;
}

.rse-segment:hover,
.rse-segment:focus-within {
  border-color: var(--color-primary);
}

.rse-segment button {
  min-width: 68px;
  height: 32px;
  border: 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.rse-segment button:last-child {
  border-right: 0;
}

.rse-segment button:not(.active):hover,
.rse-segment button:not(.active):focus-visible {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.rse-segment button.active {
  background: var(--color-primary);
  color: var(--color-surface);
}

.rse-decision-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.rse-complete-panel {
  display: grid;
  min-height: 296px;
  place-items: center;
  padding: 48px 16px;
}

.rse-complete-content {
  display: grid;
  justify-items: center;
  gap: 12px;
  color: var(--color-text-secondary);
  text-align: center;
}

.rse-complete-content i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 2px solid var(--color-success);
  border-radius: 9999px;
  color: var(--color-success);
  font-size: var(--text-2xl, 24px);
  font-style: normal;
  line-height: 1;
}

.rse-complete-content h2 {
  margin: 4px 0 0;
  color: var(--color-text);
  font-size: var(--text-md, 16px);
  line-height: 1.5;
}

.rse-complete-content p {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-base, 14px);
  line-height: 1.6;
}

.rse-complete-content .btn {
  min-width: 96px;
}

.rse-danger-action {
  border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border));
  background: var(--color-surface);
  color: var(--color-danger);
}

.rse-flow-panel {
  display: grid;
  gap: 24px;
}
.rse-flow-steps {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 16px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.rse-flow-step {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 8px;
  min-width: 0;
  text-align: center;
}
.rse-flow-step:not(:last-child)::after {
  position: absolute;
  top: 16px;
  left: calc(50% + 24px);
  width: calc(100% - 32px);
  height: 1px;
  background: var(--color-border);
  content: '';
}
.rse-flow-step i {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-style: normal;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
}
.rse-flow-step strong { color: var(--color-text); font-size: var(--text-sm, 13px); }
.rse-flow-step span { color: var(--color-text-tertiary); font-size: var(--text-xs, 12px); }
.rse-flow-step[data-owned='true'] i { background: var(--color-primary-subtle); color: var(--color-primary); }
.rse-flow-step[data-owned='true'] strong { color: var(--color-primary); }
.rse-role-select { width: var(--role-selector-width, 128px); }

.rse-queue-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-color: var(--color-border-subtle);
  background: var(--color-primary-subtle);
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
}

.rse-queue-notice span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid currentColor;
  border-radius: 9999px;
  color: var(--color-primary);
  font-size: var(--text-xs, 12px);
  font-weight: 700;
}

.rse-queue-head {
  margin-bottom: 12px;
}

.rse-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 12px;
}

.rse-filter-tabs button {
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-right: 0;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  cursor: pointer;
}

.rse-filter-tabs button:first-child {
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}

.rse-filter-tabs button:last-child {
  border-right: 1px solid var(--color-border);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.rse-filter-tabs button.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-surface);
}

.rse-table-scroll {
  width: 100%;
  overflow-x: auto;
}

.rse-table {
  width: 100%;
  min-width: 860px;
  border: 1px solid var(--color-border-subtle);
  border-collapse: collapse;
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
}

.rse-table th,
.rse-table td {
  padding: 12px;
  border: 1px solid var(--color-border-subtle);
  text-align: left;
  vertical-align: middle;
}

.rse-table th {
  background: var(--color-bg-subtle);
  color: var(--color-text-tertiary);
  font-weight: 600;
}

.rse-table td strong {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
  font-weight: 500;
}

.rse-table .rse-row-meta,
.rse-table td em {
  display: block;
  color: var(--color-text-tertiary);
  font-style: normal;
}

.rse-table-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.rse-level-tag,
.rse-front-status,
.rse-stage-tag {
  display: inline-flex;
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  align-items: center;
  border: 1px solid var(--color-border-subtle);
  border-radius: 4px;
  background: var(--color-bg-subtle);
  font-size: var(--text-xs, 12px);
}

.rse-level-tag[data-level='严重'] {
  border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border-subtle));
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.rse-level-tag[data-level='一般'],
.rse-stage-tag[data-stage='待开发确认'],
.rse-stage-tag[data-stage='待产品确认'] {
  border-color: color-mix(in srgb, var(--color-warning) 30%, var(--color-border-subtle));
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.rse-front-status[data-status='展示中'],
.rse-stage-tag[data-stage='已上线'] {
  border-color: color-mix(in srgb, var(--color-success) 30%, var(--color-border-subtle));
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.rse-stage-tag[data-stage='待裁决'] {
  border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border-subtle));
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.rse-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--color-text) 28%, transparent);
}

.rse-modal {
  width: min(720px, 100%);
  max-height: calc(100vh - 64px);
  overflow: auto;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.rse-modal header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 12px;
}

.rse-modal h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-xl, 20px);
  line-height: 1.4;
}

.rse-modal header button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--text-xl, 20px);
  cursor: pointer;
}

.rse-modal header button:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text);
}

.rse-rule-content {
  display: grid;
  gap: 16px;
  padding: 8px 24px 24px;
}

.rse-rule-content section {
  display: grid;
  gap: 8px;
}

.rse-rule-table {
  min-width: 0;
}

.rse-ticket-modal {
  width: min(520px, 100%);
}

.rse-ticket-content {
  display: grid;
  gap: 16px;
  padding: 8px 24px 24px;
}

.rse-ticket-summary {
  display: grid;
  gap: 8px;
}

.rse-ticket-summary h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-md, 16px);
  line-height: 1.5;
}

.rse-ticket-summary p {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm, 13px);
}

.rse-ticket-summary-box {
  margin: 0;
  padding: 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-primary-subtle);
  color: var(--color-text);
  font-size: var(--text-sm, 13px);
  line-height: 1.7;
}

.rse-ticket-reason {
  display: grid;
  gap: 4px;
}

.rse-ticket-reason h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-base, 14px);
}

.rse-ticket-reason p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  line-height: 1.6;
}

.rse-ticket-timeline {
  position: relative;
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rse-ticket-timeline::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 12px;
  width: 2px;
  background: var(--color-border);
  content: '';
}

.rse-ticket-timeline li {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 8px;
  align-items: flex-start;
}

.rse-ticket-timeline i {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-radius: 9999px;
  background: var(--color-surface);
  color: var(--color-text-tertiary);
  font-style: normal;
  font-size: var(--text-sm, 13px);
  font-weight: 700;
}

.rse-ticket-timeline li[data-state='done'] i {
  border-color: var(--color-success);
  color: var(--color-success);
}

.rse-ticket-timeline li[data-state='current'] i {
  border-color: var(--color-text);
  color: var(--color-text);
}

.rse-ticket-timeline strong {
  color: var(--color-text);
  font-size: var(--text-base, 14px);
  line-height: 1.5;
}

.rse-ticket-timeline li[data-state='done'] strong {
  color: var(--color-success);
}

.rse-ticket-timeline li[data-state='todo'] strong {
  color: var(--color-text-tertiary);
}

.rse-ticket-timeline span {
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  line-height: 1.6;
}

.rse-ticket-timeline li[data-state='todo'] span {
  color: var(--color-text-tertiary);
}

.rse-action-modal {
  width: min(760px, 100%);
}

.rse-action-content {
  display: grid;
  gap: 16px;
  padding: 8px 24px 24px;
}

.rse-action-note {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm, 13px);
  line-height: 1.6;
}

.rse-action-section {
  display: grid;
  gap: 4px;
}

.rse-action-section h3,
.rse-dev-note h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-base, 14px);
  line-height: 1.5;
}

.rse-action-section p,
.rse-dev-note p,
.rse-action-help {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  line-height: 1.6;
}

.rse-action-section span {
  display: block;
  margin-top: 4px;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs, 12px);
}

.rse-action-alert {
  padding: 12px 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  line-height: 1.6;
}

.rse-action-alert[data-tone='danger'] {
  border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border-subtle));
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.rse-action-alert[data-tone='info'] {
  border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border-subtle));
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.rse-action-field {
  display: grid;
  gap: 8px;
}

.rse-action-field span {
  color: var(--color-text);
  font-size: var(--text-sm, 13px);
  font-weight: 600;
}

.rse-action-field strong {
  color: var(--color-danger);
  font-weight: 600;
}

.rse-action-field textarea {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm, 13px);
  line-height: 1.6;
  padding: 8px 12px;
  outline: none;
}

.rse-action-field textarea:focus {
  border-color: var(--color-primary);
}

.rse-action-field em {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs, 12px);
  font-style: normal;
}

.rse-version-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.rse-version-grid section {
  min-width: 0;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.rse-version-grid h3 {
  margin: 0;
  padding: 12px;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  line-height: 1.5;
}

.rse-version-grid p {
  margin: 0;
  min-height: 108px;
  padding: 12px;
  color: var(--color-text);
  font-size: var(--text-sm, 13px);
  line-height: 1.7;
}

.rse-confirm-modal {
  width: min(480px, 100%);
}

.rse-confirm-content {
  padding: 8px 24px 16px;
}

.rse-confirm-content p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  line-height: 1.7;
}

.rse-dev-note {
  display: grid;
  gap: 4px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.rse-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 24px;
}

@container (max-width: 1039px) {
  .rse-mark-grid {
    grid-template-columns: 1fr;
  }

  .rse-flow-panel,
  .rse-notice-panel,
  .rse-progress-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  .rse-shortcuts {
    flex-wrap: wrap;
    white-space: normal;
  }
}

@container (max-width: 719px) {
  .rse-decision-actions {
    grid-template-columns: 1fr;
  }

  .rse-version-grid {
    grid-template-columns: 1fr;
  }

  .rse-check-row,
  .rse-panel-head {
    align-items: flex-start;
    flex-direction: column;
  }
}

.rse-sample-panel > :deep(.content-section-header),
.rse-evaluation-panel > :deep(.content-section-header) {
  margin-bottom: 16px;
}
.rse-workspace {
  container-type: inline-size;
}
.rse-queue-panel > :deep(.cs-content-tabs) {
  border-bottom: 1px solid var(--color-border-subtle);
  margin-bottom: 12px;
}
.rse-table th {
  height: 40px;
  font-size: var(--text-xs, 12px);
  font-weight: 500;
  background: var(--color-bg-subtle);
}
.rse-table td {
  height: 64px;
  font-variant-numeric: tabular-nums;
}
.rse-table th:last-child,
.rse-table td:last-child {
  position: sticky;
  right: 0;
  background: var(--color-surface);
  text-align: right;
  box-shadow: -1px 0 0 var(--color-border-subtle);
}
.rse-table-actions {
  justify-content: flex-end;
  white-space: nowrap;
}
.rse-review-list p,
.rse-summary-box {
  font-size: var(--text-base, 14px);
  line-height: 1.7;
}
.rse-notice-panel {
  flex-wrap: wrap;
}
.rse-notice-panel p {
  flex: 1 1 auto;
}
.rse-notice-panel button {
  flex-shrink: 0;
}
.rse-panel :is(button, select):focus-visible,
.rse-modal :is(button, input, select, textarea):focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.rse-tabs-panel {
  padding: 0 16px;
}
.rse-queue-panel {
  padding: 0;
}
.rse-queue-head {
  margin-bottom: 0;
}

@container (max-width: 1039px) {
  .rse-notice-panel p { flex: none; }
  .rse-progress-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; }
  .rse-progress-track { grid-column: 1 / -1; grid-row: 2; width: 100%; }
  .rse-shortcuts { grid-column: 2; grid-row: 1; }
}

.rse-mark-toolbar {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
}
.rse-mark-toolbar .rse-notice-panel,
.rse-mark-toolbar .rse-progress-panel { border: 0; border-radius: 0; }
.rse-mark-toolbar .rse-notice-panel { padding: 12px 16px; background: var(--color-bg-subtle); }
.rse-mark-toolbar .rse-progress-panel { padding: 16px; }

.rse-quality-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--color-border-subtle); }
.rse-quality-section h3 { margin: 0; color: var(--color-text); font-size: var(--text-md, 16px); font-weight: 600; }
.rse-quality-hint { margin: 8px 0 16px; color: var(--color-text-tertiary); font-size: var(--text-xs, 12px); }
.rse-quality-section .rse-check-list { border-top: 0; }
.rse-decision-actions { gap: 8px; }
.rse-review-list article { padding: 16px; }
@container (max-width: 1039px) {
  .rse-flow-steps { grid-template-columns: repeat(4, minmax(0, 1fr)); row-gap: 24px; }
  .rse-flow-step:nth-child(4)::after { display: none; }
}
@container (max-width: 719px) {
  .rse-flow-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rse-flow-step:nth-child(even)::after { display: none; }
}

.rse-queue-title-area { padding-block: 16px; }
.rse-role-switch { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.rse-role-switch > span { color: var(--color-text-tertiary); font-size: var(--text-xs, 12px); }
.rse-role-switch button { min-height: 36px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-secondary); font-size: var(--text-sm, 13px); cursor: pointer; }
.rse-role-switch button.active { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-subtle); }
.rse-check-conclusion { display: grid; gap: 8px; padding: 12px 16px; margin-top: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-primary-subtle); }
.rse-check-conclusion span { color: var(--color-text-secondary); font-size: 13px; }
.rse-failure-reason { display: grid; gap: 8px; margin-top: 16px; font-size: 13px; }
.rse-failure-reason textarea { width: 100%; box-sizing: border-box; resize: vertical; padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; }
.rse-failure-reason textarea:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.rse-decision-actions .btn:disabled { opacity: .5; cursor: not-allowed; }
.rse-progress-panel { position: sticky; top: 0; z-index: 10; box-shadow: var(--shadow-card-hover); }
.rse-current-context { display: block; margin-top: 4px; color: var(--color-text-secondary); font-size: 12px; font-weight: 400; }
.rse-review-list article { cursor: pointer; transition: background-color 160ms; }
.rse-review-list article:hover { background: var(--color-bg-subtle); }
.rse-review-list article.is-current-review { background: var(--color-primary-subtle); box-shadow: inset 0 0 0 1px var(--color-primary); }
.rse-review-list article:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.rse-failure-reason select { width: 100%; min-height: 36px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; }
@media (prefers-reduced-motion: reduce) { .rse-review-list article { transition: none; } }
.rse-check-row, .rse-review-list article { scroll-margin-top: 100px; }
.rse-role-field { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: var(--text-sm, 13px); }
.rse-role-select { min-height: 36px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; }
.rse-role-select:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
