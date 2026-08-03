<template>
  <div class="skill-create-page">
    <div class="page-header">
      <div>
        <div class="page-title">Skill 创建</div>
        <div class="page-desc">从业务场景出发定义 Skill 能力、输入输出、权限边界和验收用例。</div>
      </div>
      <div class="agent-skill-page-actions">
        <button class="btn btn-secondary" type="button" @click="goPortalHome">返回工作台</button>
        <button class="btn btn-secondary" type="button" @click="openSkills">查看 Skills 管理</button>
      </div>
    </div>

    <div class="skill-create-studio">
      <aside class="skill-context-pane">
        <div class="skill-context-fixed-head">
          <div class="skill-context-search">
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.25"></circle><path d="m16 16 4 4"></path></svg>
            <input v-model="contextSearch" type="search" placeholder="搜索能力名或业务对象" aria-label="搜索能力名或业务对象">
          </div>

          <div
            class="skill-context-scroll-wrap"
            :class="{ open: contextDomainMenuOpen }"
            @click.stop
          >
            <div
              class="skill-context-domain-scroll"
              aria-label="按业务域筛选"
            >
              <button
                v-for="source in contextSourceOptions"
                :key="source"
                type="button"
                class="skill-context-domain"
                :class="{ active: contextSourceFilter === source }"
                @click="selectContextSource(source)"
              >{{ source }}</button>
            </div>
            <button
              type="button"
              class="skill-context-more-button"
              :aria-expanded="contextDomainMenuOpen"
              aria-label="展开全部业务域"
              @click="toggleContextDomainMenu"
            ><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></button>
            <div v-if="contextDomainMenuOpen" class="skill-context-dropdown domain" role="menu" aria-label="全部业务域">
              <button
                v-for="source in contextSourceOptions"
                :key="source"
                type="button"
                :class="{ active: contextSourceFilter === source }"
                role="menuitem"
                @click="selectContextSource(source)"
              ><span>{{ source }}</span><i v-if="contextSourceFilter === source" aria-hidden="true">✓</i></button>
            </div>
          </div>

          <div class="skill-context-toolbar">
            <div class="skill-context-toolbar-title">能力目录 <span id="skill-selected-count">{{ selectedContextItems.length }} 已选</span></div>
            <label class="skill-context-selected-toggle">
              <span>只看已选</span>
              <input v-model="selectedOnly" type="checkbox">
              <i aria-hidden="true"></i>
            </label>
          </div>

          <div
            v-if="selectedContextItems.length"
            class="skill-context-scroll-wrap selected"
            :class="{ open: selectedContextMenuOpen }"
            @click.stop
          >
            <div
              class="skill-context-selected-rail"
              aria-label="已选能力"
            >
              <button
                v-for="item in selectedContextItems"
                :key="item.code"
                type="button"
                class="skill-context-selected-chip"
                :title="`移除 ${item.name}`"
                @click="toggleContext(item.code)"
              ><span class="skill-context-selected-chip-label">{{ item.name }}</span><span class="skill-context-selected-chip-remove" aria-hidden="true">×</span></button>
            </div>
            <button
              type="button"
              class="skill-context-more-button"
              :aria-expanded="selectedContextMenuOpen"
              aria-label="展开全部已选能力"
              @click="toggleSelectedContextMenu"
            ><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></button>
            <div v-if="selectedContextMenuOpen" class="skill-context-dropdown selected" role="menu" aria-label="全部已选能力">
              <button
                v-for="item in selectedContextItems"
                :key="item.code"
                type="button"
                role="menuitem"
                @click="removeSelectedContext(item.code)"
              ><span>{{ item.name }}</span><small>{{ item.source }}</small><i aria-hidden="true">×</i></button>
            </div>
          </div>
        </div>

        <div class="skill-context-card-grid" aria-live="polite" @scroll.passive="hideContextSubtitleTooltip">
          <button
            v-for="item in filteredContextItems"
            :key="item.code"
            class="skill-context-card"
            :class="{ selected: item.selected, recommended: item.recommended }"
            :aria-describedby="contextSubtitleTooltip?.code === item.code ? 'skill-context-subtitle-tooltip' : undefined"
            :aria-pressed="item.selected"
            type="button"
            @mouseenter="showContextSubtitleTooltip($event, item)"
            @mouseleave="hideContextSubtitleTooltip"
            @focus="showContextSubtitleTooltip($event, item)"
            @blur="hideContextSubtitleTooltip"
            @click="toggleContext(item.code)"
          >
            <span v-if="item.recommended" class="skill-context-card-recommend">推荐</span>
            <b>{{ item.name }}</b>
            <span class="skill-context-card-subtitle">{{ item.subtitle }}</span>
            <em>{{ item.source }}</em>
          </button>
          <div v-if="!filteredContextItems.length" class="skill-context-empty-state">没有匹配的能力，请调整搜索或筛选条件。</div>
        </div>

        <div class="skill-context-resource-metrics" aria-label="能力资源统计">
          <div v-for="metric in contextResourceMetrics" :key="metric.label"><b>{{ metric.value }}</b><span>{{ metric.label }}</span></div>
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
            <div class="skill-create-panel-body">
              <div class="skill-step-banner">{{ configBanner }}</div>
              <div class="skill-create-form">
                <div class="skill-create-field">
                  <label for="skill-create-name">Skill 名称（英文） <span class="field-required">*</span></label>
                  <input id="skill-create-name" v-model="form.name" :class="{ 'field-invalid': invalidField === 'name' }" placeholder="例如：employee-cert-report" required>
                </div>
                <div class="skill-create-field">
                  <label for="skill-create-cn-name">中文命名 <span class="field-required">*</span></label>
                  <input id="skill-create-cn-name" v-model="form.cnName" :class="{ 'field-invalid': invalidField === 'cnName' }" placeholder="请输入 Skill 中文名称" required>
                </div>
                <div class="skill-create-field">
                  <label for="skill-create-menu">菜单 <span class="field-required">*</span></label>
                  <select id="skill-create-menu" v-model="form.menu" :class="{ 'field-invalid': invalidField === 'menu' }" required>
                    <option value="" disabled>请选择菜单</option>
                    <option v-for="menu in menuGroupLabels" :key="menu">{{ menu }}</option>
                  </select>
                </div>
                <div class="skill-create-field full">
                  <label for="skill-create-scene">适用场景 <span class="field-optional">非必填</span></label>
                  <textarea id="skill-create-scene" v-model="form.scene" placeholder="描述此 Skill 适用的业务场景"></textarea>
                </div>
                <div class="skill-create-field">
                  <label for="skill-create-input">输入参数 <span class="field-optional">非必填</span></label>
                  <textarea id="skill-create-input" v-model="form.input" placeholder="描述输入参数，例如：时间范围、认证方式等"></textarea>
                </div>
                <div class="skill-create-field">
                  <label for="skill-create-output">输出结果 <span class="field-optional">非必填</span></label>
                  <textarea id="skill-create-output" v-model="form.output" placeholder="描述输出结果，例如：指标摘要、明细表、报告链接"></textarea>
                </div>
              </div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-primary" type="button" @click="goNext('config')">下一步：需求澄清</button>
            </div>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'clarify' }" data-skill-create-panel="clarify">
            <div class="skill-create-panel-body">
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
                  <div v-if="!clarifyMessages.length" class="skill-chat-ai">
                    <div>请在下方输入框补充本轮 Skill 创建需求。需求澄清智能体会基于你的描述、基础配置和已选子菜单上下文，按九要素收敛能力定义、输入输出、执行边界和验收用例。</div>
                  </div>
                  <template v-for="message in clarifyMessages" :key="message.id">
                    <div v-if="message.kind === 'state'" class="skill-chat-ai skill-conversation-states" aria-label="AI 会话状态">
                      <AgentConversationStates :items="message.states" />
                    </div>
                    <div v-else-if="message.kind === 'user'" class="skill-chat-user">{{ message.text }}</div>
                    <div v-else class="skill-chat-ai">
                      <div v-if="message.clarifyDoc" class="skill-clarify-doc">
                        <div class="skill-clarify-doc-rule"></div>
                        <h3>{{ message.clarifyDoc.title }}</h3>
                        <section v-for="(section, index) in message.clarifyDoc.sections" :key="section.title">
                          <h4>{{ index + 1 }}. {{ section.title }}</h4>
                          <p v-if="section.intro">{{ section.intro }}</p>
                          <ul>
                            <li v-for="item in section.items" :key="item">{{ item }}</li>
                          </ul>
                        </section>
                        <div class="skill-clarify-doc-rule bottom"></div>
                        <p class="skill-clarify-doc-closing">{{ message.clarifyDoc.closing }}</p>
                      </div>
                      <div v-else>{{ message.text }}</div>
                      <div v-if="message.authRequest" class="skill-auth-card">
                        <div class="skill-auth-head">
                          <span class="skill-auth-icon" aria-hidden="true" v-html="stateIcon('confirm')"></span>
                          <div>
                            <b>{{ message.authRequest.title }}</b>
                            <em>{{ message.authRequest.risk }}</em>
                          </div>
                        </div>
                        <div class="skill-auth-meta">namespace: {{ message.authRequest.namespace }}</div>
                        <pre class="skill-auth-command"><code>{{ message.authRequest.command }}</code></pre>
                        <p>{{ message.authRequest.detail }}</p>
                        <div v-if="!message.authResult" class="skill-auth-actions">
                          <button type="button" class="skill-auth-approve" @click="handleClarifyAuth('approve', message.authRequest.command)">
                            {{ message.authRequest.approveLabel }}
                          </button>
                          <button type="button" class="skill-auth-reject" @click="handleClarifyAuth('reject', message.authRequest.command)">
                            {{ message.authRequest.rejectLabel }}
                          </button>
                        </div>
                      </div>
                      <p v-if="message.authRequest && !message.authResult" class="skill-auth-outside-note">当前命令仍处于等待确认状态，未批准前不会执行；拒绝后会停止本次执行链路。</p>
                      <div v-if="message.authResult" class="skill-auth-result-card" :class="`is-${message.authResult.status}`">
                        <div class="skill-auth-result-head">
                          <span class="skill-auth-result-icon" aria-hidden="true" v-html="stateIcon('confirm')"></span>
                          <div><b>{{ message.authResult.title }}</b><em>{{ message.authResult.status === 'success' ? '成功' : '失败' }}</em></div>
                        </div>
                        <p>{{ message.authResult.detail }}</p>
                        <pre v-if="message.authResult.command" class="skill-auth-result-command"><code>{{ message.authResult.command }}</code></pre>
                      </div>
                    </div>
                  </template>
                  <div v-if="latestSkillTodo" class="skill-todo-list-block" :class="{ 'is-complete': isSkillTodoComplete(latestSkillTodo) }">
                    <div class="skill-todo-card">
                      <button type="button" class="skill-todo-head" :aria-expanded="skillTodoExpanded" :aria-label="skillTodoExpanded ? '收起 Todo List' : '展开 Todo List'" @click="skillTodoExpanded = !skillTodoExpanded">
                        <span class="skill-todo-title"><span class="skill-todo-orb" aria-hidden="true"></span><b>{{ latestSkillTodo.title }}</b></span>
                        <span class="skill-todo-summary"><span class="skill-todo-progress">{{ latestSkillTodo.done }}/{{ latestSkillTodo.total }}</span><svg class="skill-todo-toggle-icon" :class="{ 'is-collapsed': !skillTodoExpanded }" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5-5 5 5" /></svg></span>
                      </button>
                      <div v-show="skillTodoExpanded" class="skill-todo-list">
                        <div v-for="item in latestSkillTodo.items" :key="item.id" class="skill-todo-item" :class="`is-${item.status}`"><span class="skill-todo-status" aria-hidden="true"></span><span>{{ item.text }}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="skill-clarify-card skill-clarify-summary">
                  <div class="skill-summary-head">
                    <div>
                      <b>澄清结论</b>
                      <small id="skill-clarify-summary-updated">{{ summaryUpdated }}</small>
                    </div>
                    <button type="button" class="skill-summary-refresh" title="刷新澄清总结" aria-label="刷新澄清总结" :disabled="summaryRefreshing" @click="refreshSummary">
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M15.4 6.7A5.8 5.8 0 0 0 5.6 4.8L4 6.4"></path>
                        <path d="M4 3.2v3.2h3.2"></path>
                        <path d="M4.6 13.3a5.8 5.8 0 0 0 9.8 1.9l1.6-1.6"></path>
                        <path d="M16 16.8v-3.2h-3.2"></path>
                      </svg>
                    </button>
                  </div>
                  <div id="skill-clarify-summary-content">
                    <div v-for="item in summaryItems" :key="item.label" class="skill-summary-item">
                      <span>{{ item.label }}</span>
                      <p>{{ item.text }}</p>
                    </div>
                    <div v-if="!summaryItems.length" class="skill-summary-item">
                      <span>待生成</span>
                      <p>澄清结论会在你手动输入 Skill 创建需求后生成，用于后续草稿生成和评估验证。</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="skill-rule-grid skill-clarify-actions" aria-label="需求澄清辅助动作">
                <button v-for="action in clarifyActions" :key="action.label" type="button" @click="prepareClarifyPrompt(action.prompt)">{{ action.label }}</button>
              </div>
              <div class="skill-chat-composer">
                <button type="button" class="skill-chat-attach" aria-label="添加附件" @click="toast('已添加附件：业务说明文档 / 数据样例')">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="m8.2 11.8 4.6-4.6a2.2 2.2 0 0 1 3.1 3.1l-6 6a4 4 0 0 1-5.7-5.7l6.2-6.2a5.2 5.2 0 0 1 7.3 7.3l-5.5 5.5"></path>
                  </svg>
                </button>
                <textarea
                  id="skill-clarify-input"
                  ref="clarifyInputEl"
                  v-model="clarifyInput"
                  placeholder="继续补充需求，例如：输出字段、使用人群、定时频率、权限边界..."
                  rows="1"
                  @input="resizeClarifyInput"
                ></textarea>
                <button type="button" aria-label="发送澄清内容" @click="submitClarifyMessage">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M17 3 8.5 11.5"></path>
                    <path d="m17 3-5.4 14-3.1-5.5L3 8.4 17 3Z"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary" type="button" @click="switchTab('config')">上一步</button>
              <button class="btn btn-primary" type="button" @click="goNext('clarify')">下一步：生成 Skill 草稿</button>
            </div>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'draft' }" data-skill-create-panel="draft">
            <div class="skill-create-panel-body">
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
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" type="button" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" type="button" @click="switchTab('clarify')">上一步</button>
              <button class="btn btn-primary" type="button" @click="goNext('draft')">下一步：评估验证</button>
            </div>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'verify' }" data-skill-create-panel="verify">
            <div class="skill-create-panel-body">
              <div class="skill-eval-head">
                <div>
                  <b>评估验证</b>
                  <p>第 1 轮（最多 5 轮）：静态评估 + A/B 动态 + LLM 打分。及格线：综合评分 ≥ 0.60。</p>
                </div>
                <button class="btn btn-secondary" type="button" :disabled="tuneControlsDisabled" @click="beginReevaluation('overall')">重新评估</button>
              </div>
              <div class="skill-eval-stage" :class="{ 'is-reevaluating': isReevaluating }">
                <div id="skill-create-eval-scores" class="skill-score-grid">
                  <div
                    v-for="score in scores"
                    :key="score.label"
                    class="skill-score-card"
                    :class="{ featured: score.featured, pass: score.pass, warn: score.warn, tuned: score.tuned }"
                  >
                    <span>{{ score.label }}</span>
                    <b>{{ score.value }}</b><i :style="{ '--score': score.percent }"></i><em v-if="score.note">{{ score.note }}</em>
                  </div>
                </div>
                <div id="skill-create-eval-gate" class="skill-eval-gate pass">
                  <b>评估通过</b>
                  <span>{{ evalGateText }}</span>
                </div>
                <div id="skill-create-eval-list" class="skill-eval-list">
                  <div
                    v-for="item in evalItems"
                    :key="item.key"
                    :class="{ 'needs-fix': item.needsFix, tuned: item.tuned }"
                  >
                    <span :class="item.statusClass">{{ item.statusText }}</span>
                    <b>{{ item.title }}<small v-if="item.detail">{{ item.detail }}</small></b>
                    <div class="skill-eval-action">
                      <button
                        v-if="item.tunable"
                        class="skill-inline-tune"
                        type="button"
                        :disabled="tuneControlsDisabled"
                        @click="startAiTune(item)"
                      >{{ item.tuned ? '继续微调' : 'AI 微调' }}</button>
                      <span v-else class="skill-eval-action-spacer" aria-hidden="true"></span>
                      <em>{{ item.score }}</em>
                    </div>
                  </div>
                </div>
                <div v-if="hasRemainingTuneItems" id="skill-create-optimization-panel" class="skill-optimization-panel">
                  <div class="skill-optimization-head">
                    <div>
                      <b>AI 可继续优化</b>
                      <span>当前已达到 0.60 及格线；仍可唤起右侧 AI 助手优化流程步骤、关键节点确认，并刷新评分结果。</span>
                    </div>
                    <button id="skill-ai-tune-btn" class="btn btn-primary" type="button" :disabled="tuneControlsDisabled" @click="startAiTune()">
                      {{ aiTuneButtonText }}
                    </button>
                  </div>
                  <div class="skill-optimization-list">
                    <div v-for="item in optimizationItems" :key="item.title">
                      <span>{{ item.index }}</span>
                      <b>{{ item.title }}</b>
                      <p>{{ item.desc }}</p>
                    </div>
                  </div>
                </div>
                <div class="skill-case-list">
                  <b>用例对比</b>
                  <div v-for="testCase in evalCases" :key="testCase.key" :class="{ tuned: testCase.tuned }">
                    <b>
                      {{ testCase.title }}
                      <small>{{ testCase.duration }}</small>
                    </b>
                    <div class="skill-case-action">
                      <button
                        class="skill-inline-tune"
                        type="button"
                        :disabled="tuneControlsDisabled"
                        @click="startCaseAiTune(testCase)"
                      >{{ testCase.tuned ? '继续微调' : 'AI 微调' }}</button>
                      <em>得分 {{ testCase.score }}</em>
                    </div>
                  </div>
                </div>
                <div v-if="isReevaluating" class="skill-reevaluate-overlay" role="status" aria-live="polite">
                  <span class="skill-reevaluate-spinner" aria-hidden="true"></span>
                  <b>正在重新评估</b>
                  <p>大模型正在回读微调结果，刷新评分项、综合评分和提交审核门槛状态。</p>
                </div>
              </div>

            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" type="button" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" type="button" @click="switchTab('draft')">上一步</button>
              <button class="btn btn-secondary" type="button" @click="switchTab('clarify')">返回修改</button>
              <button id="skill-create-next-review-btn" class="btn btn-primary" :class="{ disabled: !aiTuned }" :disabled="!aiTuned" type="button" @click="goNext('verify')">下一步：提交审核</button>
            </div>
          </div>

          <div class="skill-create-panel" :class="{ active: activeTab === 'review' }" data-skill-create-panel="review">
            <div class="skill-create-panel-body">
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
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" type="button" @click="saveDraft">保存草稿</button>
              <button class="btn btn-secondary" type="button" @click="switchTab('verify')">上一步</button>
              <button v-if="reviewSubmitted" class="btn btn-secondary" type="button" @click="openSkills">查看 Skill Hub</button>
              <button id="skill-create-submit-review-btn" class="btn btn-primary" :class="{ disabled: reviewSubmitted }" :disabled="reviewSubmitted" type="button" @click="submitReview">
                {{ reviewSubmitted ? '已提交审核' : '提交审核' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="contextSubtitleTooltip"
        id="skill-context-subtitle-tooltip"
        class="skill-context-subtitle-tooltip"
        :style="{
          left: `${contextSubtitleTooltip.left}px`,
          top: `${contextSubtitleTooltip.top}px`,
          width: `${contextSubtitleTooltip.width}px`,
          transform: contextSubtitleTooltip.placement === 'top' ? 'translateY(-100%)' : 'none'
        }"
        role="tooltip"
      >{{ contextSubtitleTooltip.text }}</div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MENU_TREE, useAppStore } from '@/stores/app'
import { useAIStore } from '@/stores/ai'
import { useSkillHubStore, type SkillDraftSnapshot, type SkillHubItem } from '@/stores/skillHub'
import AgentConversationStates from '@/components/agent/AgentConversationStates.vue'

type TabKey = 'config' | 'clarify' | 'draft' | 'verify' | 'review'
type ContextItem = { code: string; name: string; subtitle: string; source: string; selected: boolean; recommended: boolean }
type ContextSubtitleTooltip = { code: string; text: string; left: number; top: number; width: number; placement: 'top' | 'bottom' }
type StateStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked'
type SkillStateItem = { kind: string; status: StateStatus; title: string; detail: string }
type EvalBaselineItem = {
  key: string
  title: string
  score: string
  detail?: string
  tunedScore?: string
  tunedDetail?: string
  tunePrompt?: string
  tuneResult?: string[]
}
type EvalDisplayItem = EvalBaselineItem & {
  statusText: string
  statusClass: string
  tuned: boolean
  tunable: boolean
  needsFix: boolean
}
type EvalScoreCard = {
  label: string
  value: string
  percent: string
  featured?: boolean
  pass?: boolean
  note?: string
  warn?: boolean
  tuneKey?: 'overall' | string
  tuned?: boolean
}
type EvalCaseItem = {
  key: string
  title: string
  duration: string
  score: string
  tunedDuration: string
  tunedScore: string
  tunePrompt: string
  tuneResult: string[]
}
type EvalCaseDisplayItem = EvalCaseItem & { tuned: boolean }
type SkillTodoList = {
  title: string
  done: number
  total: number
  items: Array<{ id: string; text: string; status: 'done' | 'running' | 'pending' }>
}
type SkillAuthRequest = {
  title: string
  namespace: string
  command: string
  risk: string
  detail: string
  approveLabel: string
  rejectLabel: string
}
type SkillAuthResult = {
  title: string
  status: 'success' | 'failed'
  detail: string
  command?: string
}
type SkillClarifyDoc = {
  title: string
  sections: Array<{ title: string; intro?: string; items: string[] }>
  closing: string
}
type ChatMessage =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string; clarifyDoc?: SkillClarifyDoc; todoList?: SkillTodoList; authRequest?: SkillAuthRequest; authResult?: SkillAuthResult }
  | { id: string; kind: 'state'; states: SkillStateItem[] }

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const aiStore = useAIStore()
const skillHubStore = useSkillHubStore()

const EMPLOYEE_CERT_SKILL = {
  name: 'presentation-employee-cert',
  cnName: '职场认证与转化综合简报',
  version: '20260709-v2',
  menu: '在职员工管理',
  scene: '面向认证运营、SMB 销售运营和活动运营，通过自然语言生成职场认证与购买转化综合简报，替代跨页面拼 Excel 的人工分析，并输出可落地运营动作。',
  input: '时间范围（必填）、分析范围（全量认证用户 / 仅认证未购 / 仅已购）、画像维度筛选（行业 / 岗位大类 / 认证方式）、是否含转化分析、导出或下钻请求',
  output: '结论摘要 7 张卡、数据真实性说明、KPI、时间趋势、认证时段分布、用户画像、Top10 购买商品、简报页链接、脱敏明细 CSV、页脚三行声明',
  reference: [
    '九要素已从 portal-workbench-skill-draft-presentation-employee-cert-20260709.md 拆解：命名、归属、场景、触发、输入、输出、边界、依赖、用例。',
    '命名：职场认证与转化综合简报 / presentation-employee-cert。',
    '归属：会员 / 职场人群认证；跨域引用 SMB 电商渠道订单数据。',
    '场景：认证运营、SMB 销售运营、活动运营，生成认证到转化的综合简报。',
    '触发：本版本仅自然语言触发，不含定时触发。',
    '输入：时间范围必填；分析范围、画像维度筛选、是否含转化分析可选。',
    '输出：结论摘要、明细数据、简报页链接、脱敏 CSV，顺序固定。',
    '边界：只读分析，不修改认证状态，不操作订单和商品，不主动发送推送；导出和权限降级必须用 STOP 固定话术等待用户确认。',
    '依赖：认证记录查询、SMB 渠道订单查询、LenovoID 关联、明文导出权限判定、岗位归类字典、行业标准分类、时段分桶规则。',
    '验收用例：10 条，以 2026-05-27 ~ 2026-06-08 参照数据为基准，覆盖正常生成、权限降级、数据为空、时间范围无效。'
  ].join('\n'),
  pendingConfirmations: [
    'SMB 电商渠道订单数据的跨域授权粒度',
    '明文导出权限判定接口的权限点定义',
    '岗位归类字典的维护责任方'
  ]
}

const EMPLOYEE_CERT_CONTEXT_CODES = new Set([
  'employee.overview',
  'employee.certification',
  'ops.gmv'
])

const RECOMMENDED_CONTEXT_CODES_BY_MENU: Record<string, Set<string>> = {
  乐享运营: new Set(['dashboard.overview', 'pipeline.annotate', 'pipeline.quality', 'ops.gmv']),
  'GEO 看板': new Set(['dashboard.geo', 'dashboard.geoSource', 'dashboard.geoIntent']),
  在职员工管理: EMPLOYEE_CERT_CONTEXT_CODES,
  企业客户管理: new Set(['lead.dashboard', 'lead.pool', 'lead.score'])
}

const CONTEXT_SUBTITLE_BY_CODE: Record<string, string> = {
  'dashboard.overview': '聚合乐享运营核心经营指标，支持多维度数据拆解与趋势对比',
  'pipeline.annotate': '用户查询、意图识别、命中率与标注闭环分析',
  'pipeline.quality': '服务满意度、性能、对话质量、异常监控与用户评分分析',
  'ops.traffic': '查看核心活跃趋势、访问入口、端口与业务流量分布',
  'ops.gmv': '分析交易规模、购买人数、客单价与业务模块贡献',
  'dashboard.geo': '监测 AI 搜索可见度、信源、意图与转化的整体表现',
  'dashboard.geoSource': '按平台查看可抓取信源、引用频次与内容质量',
  'dashboard.geoIntent': '对比不同平台的用户意图、品牌露出与回答路径',
  'dashboard.geoConversion': '分析 AI 搜索到官网、线索、购买和服务路径的转化',
  'dashboard.geoKnowledge': '上传文档或补充 QA，维护 AI 搜索可抓取的知识内容',
  'employee.overview': '查看在职员工规模、认证方式、人群画像与购买转化概览',
  'employee.certification': '分析认证审核进度、通过率、失败原因与待审核积压',
  'lead.dashboard': '查看企业客户线索来源、阶段、转化与负责人跟进概览',
  'lead.pool': '管理线索列表、分配规则、负责人及跟进进展',
  'lead.score': '配置企业客户线索评分、规则权重并监测模型效果'
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'config', label: '1. 基础配置' },
  { key: 'clarify', label: '2. 需求澄清' },
  { key: 'draft', label: '3. 草稿生成' },
  { key: 'verify', label: '4. 评估验证' },
  { key: 'review', label: '5. 提交审核' }
]

const activeTab = ref<TabKey>('config')
const invalidField = ref('')
const workspaceSub = ref('新建 Skill · 基础配置待补充')
const configBanner = ref('当前阶段：请先填写 Skill 基础信息，并从左侧选择需要编排的能力上下文。')
const clarifyInput = ref('')
const clarifyInputEl = ref<HTMLTextAreaElement | null>(null)
const chatEl = ref<HTMLElement | null>(null)
const summaryUpdated = ref('根据当前对话生成')
const summaryRefreshing = ref(false)
const aiTuning = ref(false)
const aiTuned = ref(false)
const aiTuneRequestKey = ref('')
const aiTuneRequestTargets = ref<Record<string, 'overall' | string>>({})
const tunedEvalKeys = ref<string[]>([])
const tunedCaseKeys = ref<string[]>([])
const isReevaluating = ref(false)
const reviewSubmitted = ref(false)
const reviewStatus = ref('提交审核后停留当前页面，Skill Hub 状态变为待审批')
let aiTuneResponseTimer: number | undefined
let reevaluationTimer: number | undefined

const form = ref({
  name: '',
  cnName: '',
  menu: '',
  scene: '',
  input: '',
  output: ''
})

const menuGroups = Object.values(MENU_TREE)
const menuGroupLabels = menuGroups.map(group => group.label)
const contextItems = ref<ContextItem[]>(createMenuContextItems(form.value.menu))
const selectedContextItems = computed(() => contextItems.value.filter(item => item.selected))
const contextSearch = ref('')
const contextSourceFilter = ref('全部')
const selectedOnly = ref(false)
const contextDomainMenuOpen = ref(false)
const selectedContextMenuOpen = ref(false)
const contextSubtitleTooltip = ref<ContextSubtitleTooltip | null>(null)
const contextSourceOptions = computed(() => ['全部', ...menuGroupLabels])
const filteredContextItems = computed(() => {
  const keyword = contextSearch.value.trim().toLocaleLowerCase()
  return contextItems.value
    .filter(item => {
      const matchesSource = contextSourceFilter.value === '全部' || item.source === contextSourceFilter.value
      const matchesSelected = !selectedOnly.value || item.selected
      const matchesKeyword = !keyword || `${item.name} ${item.subtitle} ${item.source} ${item.code}`.toLocaleLowerCase().includes(keyword)
      return matchesSource && matchesSelected && matchesKeyword
    })
    .sort((left, right) => Number(right.recommended) - Number(left.recommended))
})
const contextResourceMetrics = [
  { label: 'API', value: 13 },
  { label: 'DB 表', value: 5 },
  { label: 'Tool', value: 2 },
  { label: '权限点', value: 10 }
]
const contextSummary = computed(() => {
  if (!selectedContextItems.value.length) return '尚未选择能力上下文。请从能力目录中勾选可被 Skill 编排的页面能力。'
  const grouped = menuGroups
    .map(group => {
      const names = selectedContextItems.value.filter(item => item.source === group.label).map(item => item.name)
      return names.length ? `${group.label}：${names.join('、')}` : ''
    })
    .filter(Boolean)
    .join('；')
  return `已选择 ${selectedContextItems.value.length} 个子菜单上下文：${grouped}。AI 将继续核对应用场景、输入输出、执行边界、依赖能力和验收用例。`
})

watch(
  () => form.value.menu,
  () => syncMenuContext()
)

watch(
  () => selectedContextItems.value.length,
  (length) => {
    if (!length) selectedContextMenuOpen.value = false
  },
  { flush: 'post' }
)

watch(
  () => aiStore.skillTuneConfirmation?.confirmedAt,
  () => {
    const key = aiStore.skillTuneConfirmation?.key || ''
    if (!key) return
    const targetKey = aiTuneRequestTargets.value[key]
    if (!targetKey) return
    beginReevaluation(targetKey, key)
  }
)

function createMenuContextItems(activeMenu: string) {
  const recommendedCodes = RECOMMENDED_CONTEXT_CODES_BY_MENU[activeMenu] || new Set<string>()
  return menuGroups.flatMap(group =>
    Object.entries(group.children).map(([pageId, page]) => {
      const recommended = recommendedCodes.has(pageId)
      return {
        name: page.label,
        code: pageId,
        subtitle: CONTEXT_SUBTITLE_BY_CODE[pageId] || `查看${page.label}相关业务数据与操作能力`,
        source: group.label,
        selected: false,
        recommended
      }
    })
  )
}

function syncMenuContext() {
  hideContextSubtitleTooltip()
  contextItems.value = createMenuContextItems(form.value.menu)
}

function showContextSubtitleTooltip(event: MouseEvent | FocusEvent, item: ContextItem) {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  const rect = target.getBoundingClientRect()
  const width = Math.min(280, Math.max(220, rect.width + 40))
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8))
  const placement: 'top' | 'bottom' = window.innerHeight - rect.bottom >= 92 ? 'bottom' : 'top'
  contextSubtitleTooltip.value = {
    code: item.code,
    text: item.subtitle,
    left,
    top: placement === 'bottom' ? rect.bottom + 6 : rect.top - 6,
    width,
    placement
  }
}

function hideContextSubtitleTooltip() {
  contextSubtitleTooltip.value = null
}

function closeContextDropdowns() {
  contextDomainMenuOpen.value = false
  selectedContextMenuOpen.value = false
}

function toggleContextDomainMenu() {
  contextDomainMenuOpen.value = !contextDomainMenuOpen.value
  selectedContextMenuOpen.value = false
}

function toggleSelectedContextMenu() {
  selectedContextMenuOpen.value = !selectedContextMenuOpen.value
  contextDomainMenuOpen.value = false
}

function selectContextSource(source: string) {
  contextSourceFilter.value = source
  contextDomainMenuOpen.value = false
}

function removeSelectedContext(code: string) {
  toggleContext(code)
  if (selectedContextItems.value.length <= 1) selectedContextMenuOpen.value = false
}

const clarifyMessages = ref<ChatMessage[]>([])
const skillTodoExpanded = ref(true)
const latestSkillTodo = computed(() => [...clarifyMessages.value]
  .reverse()
  .find((message): message is Extract<ChatMessage, { kind: 'assistant' }> => message.kind === 'assistant' && Boolean(message.todoList))
  ?.todoList || null
)

watch(
  () => latestSkillTodo.value && `${latestSkillTodo.value.title}-${latestSkillTodo.value.done}-${latestSkillTodo.value.total}`,
  () => { skillTodoExpanded.value = !isSkillTodoComplete(latestSkillTodo.value) },
  { immediate: true }
)

const summaryItems = ref<Array<{ label: string; text: string }>>([
  { label: '当前 Skill', text: '新建 Skill 尚未填写基础配置，等待你补充名称、菜单和业务场景。' },
  { label: '已确认', text: '暂无已确认信息；左侧能力上下文和表单内容均为空。' },
  { label: '待确认', text: '请先补充本轮要表达的场景、输入、输出、边界或验收用例。' },
  { label: '下一步', text: '每次输入后，我会只追问仍未闭合的信息，并同步更新本区结论。' }
])

const clarifyActions = [
  { label: '生成测试用例', prompt: '请根据我刚才补充的需求，生成需要覆盖的测试用例方向。' },
  { label: '检查权限与依赖', prompt: '请根据我刚才补充的需求，检查权限边界、依赖页面和需要确认的数据范围。' },
  { label: '运行预览', prompt: '请根据我刚才补充的需求，预览这个 Skill 被调用时应该返回什么内容。' },
  { label: '优化逻辑', prompt: '请根据我刚才补充的需求，指出还需要优化的流程、字段和异常兜底。' },
  { label: '风险评估', prompt: '请根据我刚才补充的需求，评估导出、发布、写入或审批相关风险。' },
  { label: '发布建议', prompt: '请根据我刚才补充的需求，给出是否适合进入草稿生成和提交审核的建议。' }
]

const draftTreeRows = [
  { label: 'presentation-employee-cert', className: 'folder open depth-0', caret: '▾', icon: 'folder', count: '3' },
  { label: 'SKILL.md', className: 'file active depth-1', caret: '', icon: 'file md' },
  { label: 'modules', className: 'folder open depth-1', caret: '▾', icon: 'folder', count: '3' },
  { label: 'data-query.md', className: 'file depth-2', caret: '', icon: 'file md' },
  { label: 'analysis.md', className: 'file depth-2', caret: '', icon: 'file md' },
  { label: 'briefing.md', className: 'file depth-2', caret: '', icon: 'file md' },
  { label: 'tests', className: 'folder open depth-1', caret: '▾', icon: 'folder', count: '1' },
  { label: 'acceptance.md', className: 'file depth-2', caret: '', icon: 'file md' }
]

const draftYaml = computed(() => `skill:
  name: ${form.value.name}
  cn_name: ${form.value.cnName}
  version: ${EMPLOYEE_CERT_SKILL.version}
  menu: ${form.value.menu}
  context_pages:
${selectedContextItems.value.map(item => `    - ${item.source}/${item.name} (${item.code})`).join('\n') || '    - 待选择'}
  trigger:
    - natural_language
  scope:
    - 职场认证独立用户统计
    - 认证用户购买转化分析
    - 画像、时段、行业和岗位归并分析
    - 简报结论卡与可落地动作生成
  boundary:
    - 只读分析
    - 不修改认证状态、订单或商品
    - 无 SMB 电商权限时先 STOP 询问是否继续仅认证分析
    - 导出明细 CSV 前必须二次确认
    - 明文字段按权限判定，默认脱敏
  inputs:
    - 时间范围（必填）
    - 分析范围
    - 画像维度筛选
    - 是否含转化分析
  outputs:
    direct_response: 结论摘要与行动指引
    display_info: KPI、趋势、时段、画像、Top10 购买商品
    link_list: 简报页链接与脱敏 CSV 下载
  files:
    - SKILL.md
    - modules/data-query.md
    - modules/analysis.md
    - modules/briefing.md
    - tests/acceptance.md`)

const evalBaselineItems: EvalBaselineItem[] = [
  { key: 'basic', title: '基本信息规范', score: '1.00' },
  {
    key: 'flow',
    title: '流程步骤清晰',
    detail: '可继续补充参数确认、异常兜底和结果交付的分步描述',
    score: '0.72',
    tunedScore: '0.92',
    tunedDetail: 'AI 已补充分步执行顺序、参数确认和结果交付路径',
    tunePrompt: '请针对“流程步骤清晰”做 AI 微调：补齐查询、分析、异常兜底、结果输出和确认动作的分步流程，并重新评估该项。',
    tuneResult: [
      '已将流程拆为「时间解析回显 → 批量取数 → LenovoID 去重 → 聚合分析 → 简报生成 → STOP 确认」。',
      '补齐无数据、字段缺失、无权限、时间范围无效时的执行分支。',
      '已准备重新评估“流程步骤清晰”，确认后左侧该项会刷新评分。'
    ]
  },
  { key: 'exception', title: '异常处理完善', detail: '已覆盖无数据、字段缺失、权限不足时的兜底话术', score: '0.90' },
  {
    key: 'confirm',
    title: '关键节点确认',
    detail: '可继续明确权限降级和明细导出前的确认范围、字段清单和脱敏方式',
    score: '0.74',
    tunedScore: '0.86',
    tunedDetail: '时间解析回显、权限降级、明细导出前均有 STOP 确认节点',
    tunePrompt: '请针对“关键节点确认”做 AI 微调：补齐权限降级、明细导出、发布或配置变更前的确认范围、字段清单和脱敏方式，并重新评估该项。',
    tuneResult: [
      '已补齐三类 STOP 节点：时间口径回显、权限降级提示、脱敏 CSV 或明文字段导出确认。',
      '导出前会展示行数、字段清单、脱敏方式和影响范围，等待用户确认后再继续。',
      '已准备重新评估“关键节点确认”，确认后左侧该项会刷新评分。'
    ]
  },
  { key: 'instruction', title: '指令具体明确', score: '1.00' },
  { key: 'resource', title: '资源引用有效', score: '1.00' },
  { key: 'platform', title: '平台适配合规', score: '1.00' },
  { key: 'cases', title: '测试用例充分', score: '1.00' }
]
const evalBaselineCases: EvalCaseItem[] = [
  {
    key: 'case-1',
    title: 'case-1 · 标准时间范围查询',
    duration: '20.9s',
    score: '0.88',
    tunedDuration: '18.8s',
    tunedScore: '0.93',
    tunePrompt: '请微调验收案例 case-1“标准时间范围查询”：优化时间解析、批量查询和结果汇总步骤，保持只读边界，并重新运行该案例。',
    tuneResult: [
      '已合并重复的时间解析与查询步骤，保留时间口径回显。',
      '批量查询改为并行取数，并补齐无数据时的结果说明。',
      '重新运行后预计耗时 18.8s，案例得分更新为 0.93。'
    ]
  },
  {
    key: 'case-2',
    title: 'case-2 · 权限降级与脱敏导出',
    duration: '25.6s',
    score: '0.82',
    tunedDuration: '22.7s',
    tunedScore: '0.91',
    tunePrompt: '请微调验收案例 case-2“权限降级与脱敏导出”：明确授权不足时的降级路径、导出字段和脱敏确认，并重新运行该案例。',
    tuneResult: [
      '已将权限不足、仅可脱敏导出和拒绝导出三种路径拆分处理。',
      '导出前新增字段清单、行数和脱敏方式确认，避免重复询问。',
      '重新运行后预计耗时 22.7s，案例得分更新为 0.91。'
    ]
  },
  {
    key: 'case-3',
    title: 'case-3 · 无数据与异常兜底',
    duration: '26.6s',
    score: '0.90',
    tunedDuration: '23.9s',
    tunedScore: '0.94',
    tunePrompt: '请微调验收案例 case-3“无数据与异常兜底”：减少无效重试，补齐字段缺失和接口失败时的可执行反馈，并重新运行该案例。',
    tuneResult: [
      '已减少无数据场景的重复请求，并保留可追溯的异常说明。',
      '字段缺失和接口失败时会返回原因、可重试条件及下一步建议。',
      '重新运行后预计耗时 23.9s，案例得分更新为 0.94。'
    ]
  }
]
const tunedCaseKeySet = computed(() => new Set(tunedCaseKeys.value))
const evalCases = computed<EvalCaseDisplayItem[]>(() => evalBaselineCases.map(testCase => {
  const tuned = tunedCaseKeySet.value.has(testCase.key)
  return {
    ...testCase,
    duration: tuned ? testCase.tunedDuration : testCase.duration,
    score: tuned ? testCase.tunedScore : testCase.score,
    tuned
  }
}))
const lowScoreThreshold = 0.8
const tunableEvalKeys = computed(() => evalBaselineItems.filter(item => Number(item.score) < lowScoreThreshold).map(item => item.key))
const tunedEvalKeySet = computed(() => new Set(tunedEvalKeys.value))
const tunedEvalCount = computed(() => tunableEvalKeys.value.filter(key => tunedEvalKeySet.value.has(key)).length)
const allTuneItemsDone = computed(() => tunedEvalCount.value >= tunableEvalKeys.value.length)
const evalProgressStage = computed(() => aiTuned.value || allTuneItemsDone.value ? 'complete' : tunedEvalCount.value > 0 ? 'partial' : 'base')
const tuneControlsDisabled = computed(() => aiTuning.value || isReevaluating.value)
const hasRemainingTuneItems = computed(() => !aiTuned.value && !allTuneItemsDone.value)
const scoreWarningThreshold = 0.85
const scoreTuneKeyMap: Record<string, 'overall' | string> = {
  静态评分: 'overall',
  结果评分: 'confirm',
  过程评分: 'flow',
  效率评分: 'overall',
  综合评分: 'overall'
}

function decorateScoreCards(cards: EvalScoreCard[]) {
  return cards.map(card => {
    const tuneKey = card.tuneKey || scoreTuneKeyMap[card.label] || 'overall'
    const numericScore = Number(card.value)
    const warn = card.warn ?? (!card.featured && numericScore > 0 && numericScore < scoreWarningThreshold)
    const tuned = tuneKey === 'overall'
      ? aiTuned.value || tunedEvalCount.value > 0
      : aiTuned.value || tunedEvalKeySet.value.has(tuneKey)
    return { ...card, warn, tuneKey, tuned }
  })
}

const scores = computed<EvalScoreCard[]>(() => {
  if (evalProgressStage.value === 'complete') {
    return decorateScoreCards([
      { label: '静态评分', value: '0.872', percent: '87.2%', tuneKey: 'overall' },
      { label: '结果评分', value: '0.846', percent: '84.6%', tuneKey: 'confirm' },
      { label: '过程评分', value: '0.831', percent: '83.1%', tuneKey: 'flow' },
      { label: '效率评分', value: '0.888', percent: '88.8%', tuneKey: 'overall' },
      { label: '综合评分', value: '0.859', percent: '85.9%', featured: true, pass: true, note: '已达及格线 0.60' }
    ])
  }
  if (evalProgressStage.value === 'partial') {
    return decorateScoreCards([
      { label: '静态评分', value: '0.872', percent: '87.2%', tuneKey: 'overall' },
      { label: '结果评分', value: '0.825', percent: '82.5%', tuneKey: 'confirm' },
      { label: '过程评分', value: '0.796', percent: '79.6%', tuneKey: 'flow' },
      { label: '效率评分', value: '0.856', percent: '85.6%', tuneKey: 'overall' },
      { label: '综合评分', value: '0.826', percent: '82.6%', featured: true, pass: true, note: '已达及格线 0.60' }
    ])
  }
  return decorateScoreCards([
    { label: '静态评分', value: '0.872', percent: '87.2%', tuneKey: 'overall' },
    { label: '结果评分', value: '0.804', percent: '80.4%', tuneKey: 'confirm' },
    { label: '过程评分', value: '0.742', percent: '74.2%', tuneKey: 'flow' },
    { label: '效率评分', value: '0.831', percent: '83.1%', tuneKey: 'overall' },
    { label: '综合评分', value: '0.782', percent: '78.2%', featured: true, pass: true, note: '已达及格线 0.60' }
  ])
})

const currentCompositeScore = computed(() => scores.value.find(score => score.label === '综合评分')?.value || '0.782')
const evalGateText = computed(() => {
  if (evalProgressStage.value === 'complete') {
    return 'AI 微调后综合评分 0.859，已达到提交审核门槛。可进入提交审核，等待管理员审批后再进入上传或发布链路。'
  }
  if (evalProgressStage.value === 'partial') {
    return `已完成 ${tunedEvalCount.value}/${tunableEvalKeys.value.length} 个低分项微调，综合评分刷新到 ${currentCompositeScore.value}。可继续点击下一个低分项的 AI 微调，完成后再次重新评估。`
  }
  return '综合评分 0.782，已达到提交审核门槛。仍可由 AI 助手微调流程步骤和关键确认节点，进一步优化草稿质量。'
})
const reviewScoreText = computed(() => evalProgressStage.value === 'complete'
  ? 'AI 微调后综合评分 0.859，已达到审核门槛'
  : `当前综合评分 ${currentCompositeScore.value}，已达到审核门槛`)

const evalItems = computed<EvalDisplayItem[]>(() => evalBaselineItems.map(item => {
  const tuned = aiTuned.value || tunedEvalKeySet.value.has(item.key)
  const tunable = Boolean(item.tunedScore)
  const score = tuned && item.tunedScore ? item.tunedScore : item.score
  const needsFix = tunable && !tuned
  return {
    ...item,
    score,
    detail: tuned && item.tunedDetail ? item.tunedDetail : item.detail,
    tuned,
    tunable,
    needsFix,
    statusText: needsFix ? '可优化' : 'PASS',
    statusClass: needsFix ? 'warn' : 'pass'
  }
}))

const aiTuneButtonText = computed(() => {
  if (isReevaluating.value) return '正在重新评估...'
  if (aiTuning.value) return 'AI 助手处理中...'
  return '整体 AI 微调'
})
const optimizationItems = computed(() => [
  { index: 1, title: '补齐流程步骤', desc: '需要把查询、分析、异常兜底、结果输出和确认动作拆成可执行步骤。' },
  { index: 2, title: '明确确认节点', desc: '权限降级、明文导出和脱敏导出前，需要展示范围、字段、脱敏方式和等待回复。' },
  { index: 3, title: '刷新评分结果', desc: 'AI 完成草稿微调后，自动回写评估列表、综合评分和提交审核门槛状态。' }
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
  syncMenuContext()
  switchTab('config')
}

async function submitClarifyMessage() {
  const value = clarifyInput.value.trim()
  if (!value) return
  clarifyMessages.value.push({ id: `u-${Date.now()}`, kind: 'user', text: value })
  clarifyInput.value = ''
  void nextTick(resizeClarifyInput)
  if (tryClarifyStructuredDemo(value)) {
    scrollChat()
    return
  }
  const stateId = `s-${Date.now()}`
  clarifyMessages.value.push({ id: stateId, kind: 'state', states: [
    { kind: 'thinking', status: 'running', title: '理解补充需求', detail: '正在结合基础配置、菜单子项上下文和当前澄清记录判断缺口。' },
    { kind: 'tool_call', status: 'running', title: '调用大模型', detail: '正在把 Skill 创建上下文发送到服务端会话接口。' },
    { kind: 'streaming', status: 'pending', title: '组织澄清回复', detail: '模型返回后将提炼为下一轮澄清问题和配置建议。' }
  ] })
  scrollChat()

  try {
    const reply = await requestSkillModelReply(value)
    clarifyMessages.value = clarifyMessages.value.filter(message => message.id !== stateId)
    clarifyMessages.value.push({ id: `sd-${Date.now()}`, kind: 'state', states: [
      { kind: 'thinking', status: 'done', title: '理解补充需求', detail: '已写入当前 Skill 创建上下文。' },
      { kind: 'tool_call', status: 'done', title: '大模型已返回', detail: '已结合历史输入和当前菜单子项更新澄清建议。' },
      { kind: 'streaming', status: 'done', title: '组织澄清回复', detail: '已生成本轮更新后的 Skill 创建确认项。' },
      { kind: 'follow_up', status: 'blocked', title: '等待用户确认', detail: '请继续确认未闭合的能力定义、输入输出、调用边界或验收用例。' }
    ] })
    clarifyMessages.value.push({ id: `a-${Date.now()}`, kind: 'assistant', text: '', clarifyDoc: reply })
    updateClarifySummary(value, reply)
    scrollChat()
  } catch (error) {
    clarifyMessages.value = clarifyMessages.value.filter(message => message.id !== stateId)
    clarifyMessages.value.push({ id: `sf-${Date.now()}`, kind: 'state', states: [
      { kind: 'thinking', status: 'done', title: '理解补充需求', detail: '已保留当前用户输入和菜单子项上下文。' },
      { kind: 'tool_call', status: 'failed', title: '大模型调用失败', detail: error instanceof Error ? sanitizeModelVendorName(error.message) : '服务端会话接口暂不可用。' },
      { kind: 'error', status: 'blocked', title: '等待重试', detail: '未生成本地替代内容，避免把演示内容误当真实模型结果。' }
    ] })
    clarifyMessages.value.push({ id: `a-${Date.now()}`, kind: 'assistant', text: '大模型暂时没有返回结果。我已经保留当前输入和菜单子项上下文，你可以稍后重试，或先继续补充应用场景、数据范围、输出形式和验收用例。' })
    scrollChat()
  }
}

function tryClarifyStructuredDemo(value: string) {
  if (!/全场景串联演示/.test(value)) return false
  const command = 'python3 scripts/demo_agent_flow.py --dry-run'
  clarifyMessages.value.push({ id: `s-${Date.now()}-full`, kind: 'state', states: [
    { kind: 'thinking', status: 'done', title: '理解演示目标', detail: '已识别为 Skill 创建 / 需求澄清的全场景走查。' },
    { kind: 'tool_call', status: 'done', title: '调用页面能力', detail: '已读取 Skill 草稿、字段规则、测试用例和权限边界。' },
    { kind: 'tool_result', status: 'done', title: '能力结果返回', detail: '已生成可审计的结构化输出。' },
    { kind: 'confirm', status: 'blocked', title: '等待用户授权', detail: '涉及命令、写入或导出动作时，需要用户批准。' }
  ] })
  clarifyMessages.value.push({
    id: `a-${Date.now()}-full`,
    kind: 'assistant',
    text: '我会按当前 Skill 创建上下文串联展示完整对话流。过程状态会固定在回答上方；授权结论会回填到当前回答；Todo List 会作为独立的完成态气泡保留在对话底部。',
    authRequest: {
      title: '请求执行演示命令',
      namespace: 'skill-create.demo',
      command,
      risk: 'POC 高影响动作确认',
      detail: '这是全场景串联演示中的授权卡片。批准或拒绝后，结论会回填到当前卡片，不会追加新的解释性消息。',
      approveLabel: '批准执行',
      rejectLabel: '拒绝'
    },
    todoList: demoSkillTodoList(true)
  })
  return true
}

function demoSkillTodoList(complete = false): SkillTodoList {
  const done = complete ? 4 : 0
  return {
    title: 'Todo List',
    done,
    total: 4,
    items: [
      { id: 'skill-flow-1', text: '展示气泡外过程状态区', status: complete ? 'done' : 'running' },
      { id: 'skill-flow-2', text: '展示九要素澄清回复', status: complete ? 'done' : 'pending' },
      { id: 'skill-flow-3', text: '展示授权请求与结论回填', status: complete ? 'done' : 'pending' },
      { id: 'skill-flow-4', text: '保留独立 Todo List 完成态', status: complete ? 'done' : 'pending' }
    ]
  }
}

async function requestSkillModelReply(userText: string): Promise<SkillClarifyDoc> {
  const history = getClarifyHistory()
  const facts = inferSkillClarifyFacts(history)
  const turnIndex = history.length
  const message = [
    '你是乐享门户工作台的 Skill 创建助手，请在需求澄清阶段帮助 PM 设计 Skill。',
    '你的唯一目标是支持 Skill 创建：把用户描述收敛为可进入草稿生成的 Skill 能力定义、输入输出、调用边界和验收用例。',
    '必须基于当前工作台已有菜单和子菜单理解能力上下文，不要编造菜单外能力。',
    `这是第 ${turnIndex} 轮用户补充。必须基于全部历史输入更新澄清结果，不要每轮重新开始。`,
    '如果用户是在确认上一轮问题或补充边界，请把对应事项视为已确认，再追问剩余缺口；不要重复追问已经确认的内容。',
    '你的任务是帮助用户完成澄清闭环：已确认的内容用“已确认”沉淀，缺失内容用“还需要补充”推进，不要机械反问。',
    '必须按 Skill 撰写九要素判断用户是否已经提供信息：命名、归属、场景、触发、输入、输出、边界、依赖、用例。',
    '用户用自然语言提供九要素时，也视为已提供；不要要求用户按字段名重复填写。',
    '输出必须是结构化的“本轮澄清反馈”。禁止输出 markdown 符号、代码块、JSON、配置对象或长段落。',
    '内容必须严格基于“用户补充”里的问题描述和已选子菜单上下文；不要自行补充示例业务、指标、页面、产物、数值或场景。',
    '如果用户没有提到某个字段、产物或系统集成，只能提出“是否需要确认”的问题，不能当作已确定内容。',
    '请只围绕创建 Skill 前必须由人确认的问题输出，不要提前给最终 Skill 配置或最终结论。',
    '已经由用户明确给出的内容不要再作为待确认问题输出；例如用户已说“作为一个独立 Skill 创建”，就不要再问是否拆分为多个 Skill。',
    '不要要求用户确认平台默认 AI 评估标准，例如理解准确性、工具调用正确性、输出完整性、权限合规性；这些属于基础 AI 能力，由平台默认纳入评估。',
    '验收用例部分只追问业务特有的正常用例、异常输入、边界场景和兜底期望；不要追问审批链路，不追问通用模型能力指标。',
    '本轮反馈只列未闭合缺口；已确认项由页面右侧“澄清结论”承载。',
    `已确认九要素：${facts.confirmedElementLabels.join('、') || '无'}`,
    `仍缺九要素：${facts.missingElementLabels.join('、') || '无'}`,
    '禁止追问“已确认九要素”里的内容。',
    '固定输出三组：Skill 能力定义确认、输入输出与调用边界、验收用例。每组 2-4 个项目符号。',
    '',
    `当前所属菜单：${form.value.menu}`,
    `已选子菜单上下文：${selectedContextItems.value.map(item => `${item.source}/${item.name}(${item.code})`).join('、') || '未选择'}`,
    '',
    '基础配置：',
    JSON.stringify({
      name: form.value.name,
      cnName: form.value.cnName,
      menu: form.value.menu,
      scene: form.value.scene,
      input: form.value.input,
      output: form.value.output
    }, null, 2),
    '',
    '当前已载入的完整 Skill 草稿摘要：',
    EMPLOYEE_CERT_SKILL.reference,
    '',
    '历史用户输入：',
    history.map((item, index) => `${index + 1}. ${item}`).join('\n') || '无',
    '',
    '已识别确认线索：',
    JSON.stringify(facts, null, 2),
    '',
    `用户补充：${userText}`,
    '',
    '请输出适合页面展示的本轮澄清反馈，语气直接、简洁。'
  ].join('\n')

  const res = await fetch('/api/harness/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      currentPage: 'agent.skillCreate',
      shortcut: '创建流程'
    })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { reply?: string; message?: string }
  return normalizeClarifyDoc(data.reply || data.message || '', userText)
}

function normalizeClarifyDoc(raw: string, userText: string): SkillClarifyDoc {
  const text = sanitizeModelVendorName(String(raw || ''))
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#{}`*_>]/g, '')
    .replace(/\r/g, '\n')
    .trim()
  const history = getClarifyHistory()
  const facts = inferSkillClarifyFacts(history)
  const fallback = buildClarifyFallbacks(userText, history, facts)

  const sections = [
    {
      title: 'Skill 能力定义确认',
      intro: fallback.outputIntro,
      items: selectClarifyItems(text, ['Skill 能力定义确认', '能力定义', 'Skill 能力', '能力边界'], fallback.output, facts, 'capability')
    },
    {
      title: '输入输出与调用边界',
      items: selectClarifyItems(text, ['输入输出与调用边界', '输入输出', '调用边界', '执行边界'], fallback.test, facts, 'boundary')
    },
    {
      title: '验收用例',
      items: selectClarifyItems(text, ['验收用例', '用例', '测试用例', '正常用例', '异常兜底', '异常用例'], fallback.integration, facts, 'evaluation')
    }
  ]

  return {
    title: `第${toChineseNumber(Math.max(history.length, 1))}轮澄清反馈`,
    sections,
    closing: facts.readyForDraft
      ? '关键创建信息已基本收敛。如确认无补充，我将据此准备进入草稿生成。'
      : '请确认以上问题，我将据此更新 Skill 需求收敛结果。'
  }
}

function buildClarifyFallbacks(userText: string, history: string[], facts: SkillClarifyFacts) {
  const topic = extractClarifyTopic(history.join('；') || userText)
  const outputItems = [
    !facts.elements.naming
      ? '还需要补充 Skill 的中文命名和英文唯一标识。'
      : '',
    !facts.elements.ownership
      ? '还需要确认 Skill 归属的业务域、菜单或可见范围。'
      : '',
    !facts.elements.scenario
      ? '还需要说明这个 Skill 面向谁、在什么时候、解决什么业务问题。'
      : '',
    !facts.hasCapabilityConfirmed && facts.hasCapability
        ? `“${topic}”是否可以作为一个独立 Skill 创建，还是需要拆分成多个 Skill？`
        : !facts.hasCapability
          ? `这个 Skill 的核心能力是否就是处理“${topic}”，还是还需要拆分为多个独立能力？`
          : '',
    !facts.hasAudience && facts.elements.scenario
      ? '还需要补充这个 Skill 面向的主要使用人群和成功结果。'
      : ''
  ].filter((item): item is string => Boolean(item))
  const boundaryItems = [
    !facts.elements.trigger
      ? '还需要补充 Skill 的触发方式，例如典型问法、入口操作或定时规则。'
      : '',
    !facts.hasInput
      ? `还需要补充用户调用这个 Skill 时必须提供哪些输入信息，才能完成“${topic}”。`
      : '',
    !facts.hasOutput
      ? '还需要补充 Skill 输出结果形态，例如文字结论、表格明细、链接、文件或操作建议。'
      : '',
    !(facts.hasBoundaryConfirmed || facts.hasBoundary)
      ? '还需要确认操作、数据、范围、动作四类执行边界。'
      : '',
    !facts.elements.dependency
      ? '还需要补充依赖的数据口径、页面能力、接口或上游材料。'
      : ''
  ].filter((item): item is string => Boolean(item))
  const evaluateItems = [
    !facts.hasTest
      ? `还需要为“${topic}”准备至少 3 条正常用例和 1 条异常兜底用例。`
      : ''
  ].filter((item): item is string => Boolean(item))
  return {
    outputIntro: '以下仅列出仍需要你确认的缺口：',
    output: outputItems.length ? outputItems : ['本组暂无待确认问题，已沉淀到右侧澄清结论。'],
    test: boundaryItems.length ? boundaryItems : ['本组暂无待确认问题，已沉淀到右侧澄清结论。'],
    integration: evaluateItems.length ? evaluateItems : ['本组暂无待确认问题，已沉淀到右侧澄清结论。']
  }
}

type SkillClarifyFacts = {
  hasCapability: boolean
  hasCapabilityConfirmed: boolean
  hasContextConfirmed: boolean
  hasAudience: boolean
  hasInput: boolean
  hasOutput: boolean
  hasBoundary: boolean
  hasBoundaryConfirmed: boolean
  hasTest: boolean
  hasApproval: boolean
  readyForDraft: boolean
  elements: SkillElementFacts
  confirmedElementLabels: string[]
  missingElementLabels: string[]
}

type SkillElementKey = 'naming' | 'ownership' | 'scenario' | 'trigger' | 'input' | 'output' | 'boundary' | 'dependency' | 'cases'
type SkillElementFacts = Record<SkillElementKey, boolean>

const SKILL_ELEMENT_LABELS: Record<SkillElementKey, string> = {
  naming: '命名',
  ownership: '归属',
  scenario: '场景',
  trigger: '触发',
  input: '输入',
  output: '输出',
  boundary: '边界',
  dependency: '依赖',
  cases: '用例'
}

function getClarifyHistory() {
  return clarifyMessages.value
    .filter((message): message is Extract<ChatMessage, { kind: 'user' }> => message.kind === 'user')
    .map(message => message.text.trim())
    .filter(Boolean)
}

function inferSkillClarifyFacts(history: string[]): SkillClarifyFacts {
  const text = history.join(' ')
  const fullText = [
    text,
    form.value.name,
    form.value.cnName,
    form.value.menu,
    form.value.scene,
    form.value.input,
    form.value.output,
    selectedContextItems.value.map(item => `${item.source} ${item.name} ${item.code}`).join(' ')
  ].join(' ')
  const elements = inferSkillElements(text, fullText)
  const confirmedElementLabels = skillElementLabels(elements, true)
  const missingElementLabels = skillElementLabels(elements, false)
  const hasCapability = text.length > 12 || elements.scenario
  const hasStandaloneSkillConfirmed = /(作为|按|就按|创建|建立|做)(一个)?[^。；\n]{0,40}独立\s*(skill|Skill)|独立\s*(skill|Skill)\s*(创建|处理|就行)|不再拆分|不用拆分|无需拆分|不要拆分/.test(text)
  const hasSkillCreationStatement = /做一个[^。；\n]{0,60}(skill|Skill)|创建一个[^。；\n]{0,60}(skill|Skill)|创建[^。；\n]{0,60}的\s*(skill|Skill)|一个\s*(skill|Skill)/.test(text)
  const hasCapabilityConfirmed = /定义确认|能力定义.*(确认|就是|已定|没问题)|核心能力.*(确认|就是)|不再拆分|就是选定/.test(text) || hasStandaloneSkillConfirmed || hasSkillCreationStatement || (elements.naming && elements.scenario)
  const hasContextConfirmed = elements.ownership
  const hasAudience = /用户|人群|角色|PM|运营|管理员|员工|使用人|触发入口|入口|谁/.test(fullText)
  const hasInput = elements.input
  const hasOutput = elements.output
  const hasBoundary = elements.boundary
  const hasBoundaryConfirmed = elements.boundary && /边界.*(给了|确认|已给|已确认|明确)|边界已经给了|范围.*(确认|已给|明确)|只读|不写入|不发布|不导出|需要确认|四维/.test(fullText)
  const hasTest = elements.cases
  const hasApproval = /审批|审核|直线经理|业务审批|系统审批|提交审核/.test(text)
  return {
    hasCapability,
    hasCapabilityConfirmed,
    hasContextConfirmed,
    hasAudience,
    hasInput,
    hasOutput,
    hasBoundary,
    hasBoundaryConfirmed,
    hasTest,
    hasApproval,
    readyForDraft: elements.naming && elements.ownership && elements.scenario && elements.trigger && elements.input && elements.output && elements.boundary && elements.dependency && elements.cases,
    elements,
    confirmedElementLabels,
    missingElementLabels
  }
}

function inferSkillElements(historyText: string, fullText: string): SkillElementFacts {
  const normalized = `${historyText} ${fullText}`.replace(/\s+/g, ' ')
  return {
    naming: hasMeaningfulText(form.value.name) && hasMeaningfulText(form.value.cnName)
      || /命名|名称|英文|中文名|叫做|名为|name|cnName/i.test(normalized),
    ownership: selectedContextItems.value.length > 0
      || hasMeaningfulText(form.value.menu)
      || /归属|业务域|菜单|子菜单|部门|谁可见|所属|能力上下文|上下文|页面/.test(normalized),
    scenario: hasMeaningfulText(form.value.scene)
      || /场景|用于|支持|帮助|解决|查看|分析|生成|查询|统计|复盘|运营|管理|谁.*什么时候|什么时候.*问题/.test(normalized),
    trigger: /触发|入口|问法|自然语言|定时|每[天周月]|日报|周报|月报|按钮|点击|查询|生成|当.*时|如果/.test(normalized),
    input: hasMeaningfulText(form.value.input)
      || /输入|参数|字段|时间范围|时间|范围|筛选|条件|必填|可选|提供|传入|数据口径|日期|状态|类型/.test(normalized),
    output: hasMeaningfulText(form.value.output)
      || /输出|返回|结果|摘要|表格|明细|下载|导出声明|脱敏|CSV|报告|结论|链接|文件|建议/.test(normalized),
    boundary: /边界|权限|只读|写入|发布|导出|配置|数据范围|操作范围|动作|确认|审批|不能|不允许|允许|四维|高风险|脱敏/.test(normalized),
    dependency: selectedContextItems.value.length > 0
      || /依赖|接口|API|数据源|数据口径|能力|菜单|子菜单|页面|后台|字段|PRD|附件|系统|表|库|调用/.test(normalized),
    cases: /用例|测试|异常|兜底|典型问法|样例|case|正常|失败|边界场景|至少|不少于|≥|>=|3\s*条|一条异常/.test(normalized)
  }
}

function hasMeaningfulText(value: string) {
  return String(value || '').trim().length > 1
}

function sanitizeModelVendorName(text: string) {
  return String(text || '')
    .replace(/火山模型/g, '大模型')
    .replace(/火山引擎/g, '大模型')
}

function skillElementLabels(elements: SkillElementFacts, confirmed: boolean) {
  return (Object.keys(SKILL_ELEMENT_LABELS) as SkillElementKey[])
    .filter(key => elements[key] === confirmed)
    .map(key => SKILL_ELEMENT_LABELS[key])
}

function updateClarifySummary(latestInput: string, doc: SkillClarifyDoc) {
  const history = getClarifyHistory()
  const facts = inferSkillClarifyFacts(history)
  const confirmed = [
    ...facts.confirmedElementLabels
  ].filter(Boolean)
  const docPending = extractPendingClarifyItems(doc)
  const missing = docPending.length
    ? docPending
    : facts.missingElementLabels
  summaryItems.value = [
    { label: '当前轮次', text: `${doc.title}；已根据“${truncateText(latestInput, 36)}”更新澄清结论。` },
    { label: '已确认', text: confirmed.length ? confirmed.join('、') : '已记录当前需求描述，待继续补充创建信息。' },
    { label: '待确认', text: missing.length ? missing.join('、') : '关键创建信息已基本收敛，可进入草稿生成前确认。' },
    { label: '下一步', text: facts.readyForDraft ? '可进入草稿生成，并在草稿中固化能力定义、输入输出、执行边界和验收用例。' : '继续补齐待确认项，避免草稿生成后反复返工。' }
  ]
  const now = new Date()
  summaryUpdated.value = `已更新 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function extractPendingClarifyItems(doc: SkillClarifyDoc) {
  return doc.sections
    .flatMap(section => section.items)
    .map(item => item.trim())
    .filter(item => item && !/暂无待确认|已沉淀|已确认|已记录|已收到|已写入|平台默认/.test(item))
    .slice(0, 4)
}

function toChineseNumber(value: number) {
  const labels = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  if (value <= 10) return labels[value]
  return String(value)
}

function extractClarifyTopic(userText: string) {
  const normalized = userText
    .replace(/\s+/g, ' ')
    .replace(/[“”"']/g, '')
    .trim()
  if (!normalized) return '当前需求'
  return truncateText(normalized, 28)
}

function pickItems(text: string, titles: string[], fallback: string[]) {
  const segment = findSectionSegment(text, titles)
  const items = splitClarifyItems(segment)
  return (items.length ? items : fallback).slice(0, 4)
}

function selectClarifyItems(
  text: string,
  titles: string[],
  fallback: string[],
  facts: SkillClarifyFacts,
  area: 'capability' | 'boundary' | 'evaluation'
) {
  const rawItems = pickItems(text, titles, fallback)
  const filtered = rawItems.filter(item => (
    !isConfirmedStatement(item)
    && !isPlatformDefaultEvaluationQuestion(item)
    && !isRepeatedConfirmedQuestion(item, facts, area)
    && !isQuestionForConfirmedElement(item, facts)
  ))
  if (area === 'capability' && (facts.hasCapabilityConfirmed || facts.hasContextConfirmed)) {
    return fallback
  }
  if (area === 'boundary' && facts.hasBoundaryConfirmed) {
    return fallback
  }
  return (filtered.length ? filtered : fallback).slice(0, 4)
}

function isConfirmedStatement(item: string) {
  return /^(已收到|已确认|已记录|已识别|已写入|可写入|后续会|已经|当前已)/.test(item.trim())
}

function isPlatformDefaultEvaluationQuestion(item: string) {
  const text = item.trim()
  return /理解准确性|工具调用正确性|输出完整性|权限合规性|通用模型能力|基础\s*AI\s*能力|评估通过标准关注/.test(text)
}

function isRepeatedConfirmedQuestion(item: string, facts: SkillClarifyFacts, area: 'capability' | 'boundary' | 'evaluation') {
  if (area === 'capability') {
    if (facts.hasCapabilityConfirmed && /核心能力|能力描述|独立\s*Skill|拆分|多个\s*Skill|能力定义|是否可以作为/.test(item)) return true
    if (facts.hasContextConfirmed && /能力上下文|限定在|排除|子菜单|页面|归属|业务域|菜单/.test(item)) return true
  }
  if (area === 'boundary' && facts.hasBoundaryConfirmed && /边界|只读|写入|发布|导出|配置变更|执行/.test(item)) return true
  if (area === 'evaluation' && facts.hasApproval && /审批|审核|直线经理|业务审批|系统审批/.test(item)) return true
  return false
}

function isQuestionForConfirmedElement(item: string, facts: SkillClarifyFacts) {
  const text = item.trim()
  const checks: Array<[SkillElementKey, RegExp]> = [
    ['naming', /命名|名称|英文|中文|唯一标识|name/i],
    ['ownership', /归属|业务域|谁可见|所属|菜单|子菜单|上下文|页面|排除/],
    ['scenario', /场景|谁|什么时候|解决什么|使用人群|成功结果|目标用户|业务问题/],
    ['trigger', /触发|问法|自然语言|定时|日报|周报|月报|入口|按钮|点击/],
    ['input', /输入|参数|字段|时间范围|筛选|条件|必填|可选|提供哪些/],
    ['output', /输出|结果|返回|摘要|表格|明细|下载|CSV|报告|结论|链接|文件/],
    ['boundary', /边界|权限|只读|写入|发布|导出|配置|数据范围|操作范围|动作|四维/],
    ['dependency', /依赖|接口|API|数据源|数据口径|页面能力|上游|PRD|附件|系统|调用/],
    ['cases', /用例|测试|异常|兜底|典型问法|样例|case|边界场景/]
  ]
  return checks.some(([key, pattern]) => facts.elements[key] && pattern.test(text))
}

function findSectionSegment(text: string, titles: string[]) {
  const startIndexes = titles.map(title => text.indexOf(title)).filter(index => index >= 0)
  if (!startIndexes.length) return ''
  const start = Math.min(...startIndexes)
  const after = text.slice(start)
  const next = after.slice(1).search(/(?:Skill 能力定义确认|输入输出与调用边界|验收用例|能力定义|Skill 能力|能力边界|输入输出|调用边界|执行边界|测试用例|正常用例|异常兜底|异常用例|用例)/)
  return next > 0 ? after.slice(0, next + 1) : after
}

function splitClarifyItems(text: string) {
  return text
    .split(/\n|(?:^|\s)(?:\d+[.、]|[-•])\s*/g)
    .flatMap(part => part.split(/；|;/g))
    .map(item => item.replace(/^(Skill 能力定义确认|输入输出与调用边界|验收用例|能力定义|Skill 能力|能力边界|输入输出|调用边界|执行边界|测试用例|正常用例|异常兜底|异常用例|用例)[:：]?\s*/g, '').trim())
    .filter(item => item.length > 5)
    .map(item => truncateText(item, 64))
}

function truncateText(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function appendAssistant(message: string) {
  clarifyMessages.value.push({ id: `a-${Date.now()}-${Math.random().toString(36).slice(2)}`, kind: 'assistant', text: message })
  scrollChat()
}

function prepareClarifyPrompt(prompt: string) {
  clarifyInput.value = prompt
  void nextTick(() => {
    resizeClarifyInput()
    clarifyInputEl.value?.focus()
  })
}

function resizeClarifyInput() {
  const input = clarifyInputEl.value
  if (!input) return
  input.style.height = 'auto'
  const style = window.getComputedStyle(input)
  const lineHeight = Number.parseFloat(style.lineHeight) || 20
  const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
  const maxHeight = Math.ceil(lineHeight * 4 + verticalPadding)
  const nextHeight = Math.min(input.scrollHeight, maxHeight)
  input.style.height = `${nextHeight}px`
  input.style.overflowY = input.scrollHeight > maxHeight + 1 ? 'auto' : 'hidden'
}

function handleClarifyAuth(action: 'approve' | 'reject', command: string) {
  let resolved = false
  clarifyMessages.value = clarifyMessages.value
    .filter(message => !(message.kind === 'state' && message.states.some(state => state.kind === 'confirm' && state.status === 'blocked')))
    .map(message => {
      if (resolved || message.kind !== 'assistant' || !message.authRequest || message.authResult) return message
      resolved = true
      return {
        ...message,
        authResult: action === 'approve'
          ? { title: '授权已记录', status: 'success', detail: '当前为 POC 状态展示，不会实际执行命令；高影响操作已登记。', command }
          : { title: '授权已拒绝', status: 'failed', detail: '任务已停止，没有触发任何写入、发布、导出或命令执行。', command }
      }
    })
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
    const facts = inferSkillClarifyFacts(getClarifyHistory())
    const latestDoc = [...clarifyMessages.value]
      .reverse()
      .find((message): message is Extract<ChatMessage, { kind: 'assistant' }> => message.kind === 'assistant' && Boolean(message.clarifyDoc))
      ?.clarifyDoc
    const pending = latestDoc ? extractPendingClarifyItems(latestDoc) : facts.missingElementLabels
    summaryItems.value = [
      { label: '当前 Skill', text: `name: ${form.value.name || '待补充'}；中文命名：${form.value.cnName || '待补充'}；已基于 ${userTurns} 轮自然语言澄清更新。` },
      { label: '已确认', text: facts.confirmedElementLabels.length ? facts.confirmedElementLabels.join('、') : '尚未从对话中确认新的九要素信息。' },
      { label: '待确认', text: pending.length ? pending.join('；') : '关键创建信息已基本收敛。' },
      { label: '下一步', text: facts.readyForDraft ? '可进入草稿生成，并在草稿中固化能力定义、输入输出、执行边界和验收用例。' : '继续按自然语言补充待确认项。' }
    ]
    const now = new Date()
    summaryUpdated.value = `已刷新 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    summaryRefreshing.value = false
  }, 360)
}

function saveDraft() {
  if (!validateConfig()) return
  const now = new Date()
  const snapshot = createDraftSnapshot(now)
  skillHubStore.upsertDraftSkill({
    name: form.value.name,
    cnName: form.value.cnName,
    desc: form.value.scene,
    category: form.value.menu,
    owner: appStore.user || 'admin',
    tags: selectedContextItems.value.slice(0, 3).map(item => item.name),
    draft: snapshot
  })
  workspaceSub.value = `${form.value.cnName || form.value.name} · 草稿已保存 ${snapshot.savedAt.slice(-8, -3)}`
  reviewSubmitted.value = false
  reviewStatus.value = '草稿已同步到 Skill Hub，可返回需求澄清继续编辑'
  toast(`${form.value.name}：草稿已保存并同步到 Skill Hub`)
}

function createDraftSnapshot(now = new Date()): SkillDraftSnapshot {
  return {
    form: { ...form.value },
    selectedContextCodes: selectedContextItems.value.map(item => item.code),
    clarifyMessages: JSON.parse(JSON.stringify(clarifyMessages.value)),
    summaryItems: summaryItems.value.map(item => ({ ...item })),
    summaryUpdated: summaryUpdated.value,
    aiTuned: aiTuned.value,
    savedAt: formatBeijingTime(now)
  }
}

function evalTitleByKey(key: string) {
  return evalBaselineItems.find(item => item.key === key)?.title || '当前评估项'
}

function startAiTune(item?: EvalDisplayItem) {
  if (tuneControlsDisabled.value) return
  const target = item?.tunable ? item : null
  const targetKey = target?.key || 'overall'
  const isCaseTarget = targetKey.startsWith('case:')
  aiTuning.value = true
  aiTuneRequestKey.value = `skill-tune-${targetKey}-${form.value.name || 'draft'}-${Date.now()}`
  aiTuneRequestTargets.value = {
    ...aiTuneRequestTargets.value,
    [aiTuneRequestKey.value]: targetKey
  }
  aiStore.toggleOpen(true)
  const lowItems = evalItems.value.filter(entry => entry.tunable && !entry.tuned)
  const targetTitles = target ? `${target.title} ${target.score}` : lowItems.map(entry => `${entry.title} ${entry.score}`).join('、')
  aiStore.messages.push({
    role: 'user',
    text: target?.tunePrompt || `请针对 Skill 创建评估验证中的可优化项做整体 AI 微调：${targetTitles || '当前草稿质量'}。请调整 Skill 草稿并刷新评分结果。`,
    at: new Date().toISOString()
  })
  const resultLines = target?.tuneResult || [
    '已定位当前仍可优化的评估项，并按 Skill 九要素更新流程、边界、依赖和验收用例。',
    '将认证与转化简报流程拆成「时间解析回显 → 批量取数 → LenovoID 去重 → 聚合分析 → 简报生成 → STOP 确认」。',
    '补充无 SMB 数据权限、无明文导出权限、导出脱敏 CSV 前的固定确认节点，明确行数、字段清单和脱敏方式。',
    '更新验收用例，覆盖参照区间、权限降级、无数据、模糊时间和时间范围无效。'
  ]
  const requestKey = aiTuneRequestKey.value
  if (aiTuneResponseTimer) window.clearTimeout(aiTuneResponseTimer)
  aiTuneResponseTimer = window.setTimeout(() => {
    aiStore.messages.push({
      role: 'assistant',
      text: [
        target
          ? `已定位${isCaseTarget ? '验收案例' : '低分项'}「${target.title}」，并生成单项 AI 微调建议：`
          : '已定位全部可优化项，并生成整体 AI 微调建议：',
        '',
        ...resultLines.map(line => `- ${line}`),
        '',
        `你可以继续微调其他${isCaseTarget ? '验收案例' : '低分项'}，也可以确认采用本轮微调结果。确认后左侧会进入重新评估。`
      ].join('\n'),
      at: new Date().toISOString(),
      actionItems: [{ type: 'skill_tune_confirm', label: '确认微调完成', value: requestKey }]
    })
    aiTuning.value = false
    aiTuneResponseTimer = undefined
  }, 900)
}

function startCaseAiTune(testCase: EvalCaseDisplayItem) {
  if (tuneControlsDisabled.value) return
  startAiTune({
    key: `case:${testCase.key}`,
    title: testCase.title,
    score: testCase.score,
    tunedScore: testCase.tunedScore,
    tunePrompt: testCase.tunePrompt,
    tuneResult: testCase.tuneResult,
    statusText: testCase.tuned ? '已微调' : '可优化',
    statusClass: testCase.tuned ? 'pass' : 'warn',
    tuned: testCase.tuned,
    tunable: true,
    needsFix: !testCase.tuned
  })
}

function beginReevaluation(targetKey: 'overall' | string, requestKey = '') {
  if (isReevaluating.value) return
  if (aiTuneResponseTimer) {
    window.clearTimeout(aiTuneResponseTimer)
    aiTuneResponseTimer = undefined
  }
  aiTuning.value = false
  isReevaluating.value = true
  workspaceSub.value = `${form.value.cnName || form.value.name || '当前 Skill'} · 正在重新评估`
  if (reevaluationTimer) window.clearTimeout(reevaluationTimer)
  reevaluationTimer = window.setTimeout(() => {
    if (targetKey.startsWith('case:')) {
      const caseKey = targetKey.slice(5)
      tunedCaseKeys.value = tunedCaseKeys.value.includes(caseKey)
        ? tunedCaseKeys.value
        : [...tunedCaseKeys.value, caseKey]
      const testCase = evalBaselineCases.find(item => item.key === caseKey)
      workspaceSub.value = `${form.value.cnName || form.value.name || '当前 Skill'} · ${testCase?.title || caseKey} 已重新运行`
      toast(`${testCase?.title || caseKey}：AI 微调完成，案例结果已刷新`)
    } else if (targetKey === 'overall') {
      tunedEvalKeys.value = [...tunableEvalKeys.value]
      aiTuned.value = true
      workspaceSub.value = `${form.value.cnName || form.value.name || '当前 Skill'} · 整体 AI 微调结果已确认`
      toast('整体 AI 微调已完成，评分与提交审核状态已同步')
    } else {
      const nextKeys = tunedEvalKeys.value.includes(targetKey)
        ? tunedEvalKeys.value
        : [...tunedEvalKeys.value, targetKey]
      tunedEvalKeys.value = nextKeys
      if (tunableEvalKeys.value.every(key => nextKeys.includes(key))) aiTuned.value = true
      workspaceSub.value = `${form.value.cnName || form.value.name || '当前 Skill'} · ${evalTitleByKey(targetKey)} 已重新评估`
      toast(`${evalTitleByKey(targetKey)}：AI 微调完成，已重新评估`)
    }
    if (requestKey) {
      const remainingRequests = { ...aiTuneRequestTargets.value }
      delete remainingRequests[requestKey]
      aiTuneRequestTargets.value = remainingRequests
    }
    isReevaluating.value = false
    reevaluationTimer = undefined
  }, 3000)
}

function formatBeijingTime(value: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(value).replace(/\//g, '-')
}

function submitReview() {
  if (reviewSubmitted.value) {
    toast(`${form.value.name}：已在审核中，可前往 Skill Hub 查看`)
    return
  }
  const score = aiTuned.value ? '0.859' : '0.782'
  skillHubStore.upsertSubmittedSkill({
    name: form.value.name,
    cnName: form.value.cnName,
    desc: form.value.scene,
    category: form.value.menu,
    owner: appStore.user || 'admin',
    score,
    tags: selectedContextItems.value.slice(0, 3).map(item => item.name),
    draft: createDraftSnapshot()
  })
  reviewSubmitted.value = true
  reviewStatus.value = '已提交审核，当前 Skill Hub 状态为待审批'
  toast(`${form.value.name}：已提交审核，已同步到 Skill Hub 待审批列表`)
}

function stateStatus(status: StateStatus) {
  return ({ pending: '等待中', running: '进行中', done: '已完成', failed: '失败', blocked: '待确认' })[status]
}

function isSkillTodoComplete(todo: SkillTodoList | null) {
  return Boolean(todo && todo.done >= todo.total)
}

function showSkillStateSummary(states: SkillStateItem[]) {
  return states.length > 2 || states.filter(state => state.status === 'running').length > 1
}

function skillStateSummaryTitle(states: SkillStateItem[]) {
  return states.some(state => state.status === 'running') ? '思考中' : '处理过程'
}

function skillStateSummary(states: SkillStateItem[]) {
  const running = states.filter(state => state.status === 'running').length
  const pending = states.filter(state => state.status === 'pending').length
  const failed = states.filter(state => state.status === 'failed').length
  if (running) return `${running} 步进行中${pending ? ` · ${pending} 步等待` : ''}`
  if (failed) return `${failed} 步失败`
  return `${states.length} 步已记录`
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
  const requestedSkill = String(route.query.skill || '')
  if (!requestedSkill) {
    sessionStorage.removeItem('leai.skillCreateDraft')
    return
  }
  const raw = sessionStorage.getItem('leai.skillCreateDraft')
  if (!raw) {
    loadEditDraftFromQuery()
    return
  }
  try {
    const parsed = JSON.parse(raw)
    const item = parsed?.item as SkillHubItem | undefined
    if (!item?.name || item.name !== requestedSkill) {
      loadEditDraftFromQuery()
      return
    }
    restoreSkillItem(item)
    const isDraft = item.status === 'draft' || route.query.edit === 'draft'
    workspaceSub.value = parsed.rejected
      ? `${item.cnName || item.name} · 已驳回 · 修改中`
      : isDraft
        ? `${item.cnName || item.name} · 草稿编辑中`
        : `${item.cnName || item.name} · 编辑中`
    if (parsed.rejected) {
      configBanner.value = '当前 Skill 已被管理员驳回，请根据审批意见补充业务边界、测试用例或审批材料后重新提交。'
      reviewStatus.value = '当前状态为已驳回，修改完成后可重新提交审核'
    }
    if (isDraft) {
      activeTab.value = 'clarify'
      reviewStatus.value = '当前为 Skill Hub 草稿，修改后可继续保存或进入后续流程'
    }
  } catch {
    loadEditDraftFromQuery()
  }
}

function restoreSkillItem(item: SkillHubItem) {
  const snapshot = item.draft
  if (snapshot) {
    form.value = { ...snapshot.form }
    const selectedCodes = new Set(snapshot.selectedContextCodes)
    const restoreContexts = () => {
      contextItems.value = createMenuContextItems(snapshot.form.menu).map(context => ({
        ...context,
        selected: selectedCodes.has(context.code)
      }))
    }
    restoreContexts()
    void nextTick(restoreContexts)
    clarifyMessages.value = JSON.parse(JSON.stringify(snapshot.clarifyMessages || [])) as ChatMessage[]
    summaryItems.value = (snapshot.summaryItems || []).map(summary => ({ ...summary }))
    summaryUpdated.value = snapshot.summaryUpdated || '根据已保存草稿恢复'
    aiTuned.value = Boolean(snapshot.aiTuned)
    return
  }
  form.value.name = item.name
  form.value.cnName = item.cnName || form.value.cnName
  form.value.menu = item.category || form.value.menu
  form.value.scene = item.desc || form.value.scene
  form.value.output = '自然语言响应、表格结果、可继续展开的报告或调整建议'
  syncMenuContext()
}

function loadEditDraftFromQuery() {
  const skill = String(route.query.skill || '')
  if (!skill) return
  const storedItem = skillHubStore.findSkill(skill)
  if (storedItem) {
    restoreSkillItem(storedItem)
    const isDraft = storedItem.status === 'draft' || route.query.edit === 'draft'
    workspaceSub.value = isDraft
      ? `${storedItem.cnName || storedItem.name} · 草稿编辑中`
      : `${storedItem.cnName || storedItem.name} · 编辑中`
    if (isDraft) {
      activeTab.value = 'clarify'
      reviewStatus.value = '当前为 Skill Hub 草稿，修改后可继续保存或进入后续流程'
    }
    if (route.query.rejected === '1') {
      configBanner.value = '当前 Skill 已被管理员驳回，请根据审批意见补充业务边界、测试用例或审批材料后重新提交审核。'
      reviewStatus.value = '当前状态为已驳回，修改完成后可重新提交审核'
    }
    return
  }
  const knownDrafts: Record<string, { name: string; cnName: string; desc: string }> = {
    'presentation-employee-cert': {
      name: EMPLOYEE_CERT_SKILL.name,
      cnName: EMPLOYEE_CERT_SKILL.cnName,
      desc: EMPLOYEE_CERT_SKILL.scene
    },
    'workplace-employee-review-analysis': {
      name: 'workplace-employee-review-analysis',
      cnName: '职场员工审核数据分析',
      desc: '职场员工审核数据分析 Skill，支持认证方式分布、通过率趋势、失败原因和待审核积压分析。'
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
  document.title = '联想门户工作台'
  resizeClarifyInput()
  document.addEventListener('click', closeContextDropdowns)
})

onBeforeUnmount(() => {
  hideContextSubtitleTooltip()
  if (aiTuneResponseTimer) window.clearTimeout(aiTuneResponseTimer)
  if (reevaluationTimer) window.clearTimeout(reevaluationTimer)
  document.removeEventListener('click', closeContextDropdowns)
})
</script>

<style lang="scss" scoped>
.skill-state-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-bottom: 8px;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.4;
}

.skill-state-summary b {
  color: var(--color-text, #1f2329);
  font-size: 13px;
}

.skill-state-summary em {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: normal;
}

.skill-summary-orb {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border: 3px solid rgba(51, 112, 255, .18);
  border-top-color: var(--color-primary, #3370ff);
  border-radius: 999px;
  animation: skill-state-spin .9s linear infinite;
}

.skill-todo-card,
.skill-auth-card,
.skill-auth-result-card {
  margin-top: 10px;
  border: 1px solid rgba(31, 35, 41, .1);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text, #1f2329);
}

.skill-todo-card {
  padding: 12px;
}

.skill-todo-list-block {
  width: min(100%, 620px);
  margin-top: 8px;
  padding: 2px 2px 0;
}

.skill-todo-list-block .skill-todo-card {
  padding: 0;
  border: 0;
  background: transparent;
}

.skill-todo-list-block.is-complete {
  color: var(--color-primary, #3370ff);
}

.skill-todo-head {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(31, 35, 41, .08);
  border-top: 0;
  border-right: 0;
  border-left: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.skill-todo-summary { display: inline-flex; align-items: center; gap: 6px; }
.skill-todo-toggle-icon { transition: transform .16s ease; }
.skill-todo-toggle-icon.is-collapsed { transform: rotate(180deg); }
.skill-todo-list-block.is-complete .skill-todo-orb { position: relative; border-color: var(--color-primary, #3370ff); background: var(--color-primary, #3370ff); }
.skill-todo-list-block.is-complete .skill-todo-orb::after { content: ''; position: absolute; left: 4px; top: 2px; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }

.skill-todo-title {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.skill-todo-title b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-todo-orb {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border: 3px solid rgba(51, 112, 255, .18);
  border-top-color: var(--color-primary, #3370ff);
  border-radius: 999px;
}

.skill-todo-progress {
  flex: 0 0 auto;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.4;
}

.skill-todo-list {
  display: grid;
  gap: 9px;
  padding-top: 10px;
}

.skill-todo-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  color: var(--color-text-secondary, #646a73);
  font-size: 13px;
  line-height: 1.45;
}

.skill-todo-item span:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.skill-todo-status {
  width: 16px;
  height: 16px;
  margin-top: 1px;
  border: 2px solid rgba(31, 35, 41, .22);
  border-radius: 999px;
  background: #fff;
}

.skill-todo-item.is-done {
  color: var(--color-text, #1f2329);
}

.skill-todo-item.is-done .skill-todo-status {
  border-color: var(--color-primary, #3370ff);
  background:
    linear-gradient(45deg, transparent 48%, #fff 49% 56%, transparent 57%) 5px 7px / 8px 5px no-repeat,
    var(--color-primary, #3370ff);
}

.skill-todo-item.is-running {
  color: var(--color-text, #1f2329);
}

.skill-todo-item.is-running .skill-todo-status {
  border-color: rgba(51, 112, 255, .22);
  box-shadow: inset 0 0 0 3px #fff;
  background: var(--color-primary, #3370ff);
}

.skill-auth-card {
  padding: 12px;
  border-color: rgba(245, 158, 11, .42);
  background: #fffbf2;
}

.skill-auth-head {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.skill-auth-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #fff;
  color: #b76e00;
}

.skill-auth-icon :deep(svg) {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.skill-auth-head b,
.skill-auth-head em {
  display: block;
  min-width: 0;
}

.skill-auth-head b {
  font-size: 14px;
  line-height: 1.45;
}

.skill-auth-head em {
  color: #8a5a00;
  font-style: normal;
  font-size: 12px;
}

.skill-auth-meta {
  margin-top: 10px;
  color: var(--color-text-secondary, #646a73);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 12px;
}

.skill-auth-command {
  margin: 8px 0 0;
  padding: 10px;
  border-radius: 7px;
  background: #1f2329;
  color: #fff;
  overflow-x: auto;
  white-space: pre;
  font-size: 12px;
  line-height: 1.5;
}

.skill-auth-command code {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
}

.skill-auth-card p {
  margin: 8px 0 0;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.5;
}

.skill-auth-outside-note {
  margin: 8px 0 0;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.5;
}

.skill-auth-result-card {
  margin-top: 10px;
  padding: 12px;
  border-color: rgba(32, 191, 114, .26);
  background: rgba(32, 191, 114, .08);
}

.skill-auth-result-card.is-failed {
  border-color: rgba(239, 68, 68, .24);
  background: rgba(239, 68, 68, .08);
}

.skill-auth-result-head {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.skill-auth-result-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #fff;
  color: #176b3a;
}

.skill-auth-result-card.is-failed .skill-auth-result-icon { color: #b42318; }
.skill-auth-result-icon :deep(svg) { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.skill-auth-result-head b, .skill-auth-result-head em { display: block; min-width: 0; }
.skill-auth-result-head b { font-size: 14px; line-height: 1.45; }
.skill-auth-result-head em { color: inherit; font-style: normal; font-size: 12px; }
.skill-auth-result-card p { margin: 8px 0 0; color: var(--color-text-secondary, #646a73); font-size: 12px; line-height: 1.5; }
.skill-auth-result-command { margin: 8px 0 0; padding: 10px; overflow-x: auto; border-radius: 7px; background: #1f2329; color: #fff; font-size: 12px; line-height: 1.5; }
.skill-auth-result-command code { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); }

.skill-conversation-states {
  width: min(100%, 620px);
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.skill-auth-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.skill-auth-actions button {
  min-width: 0;
  height: 34px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.skill-auth-approve {
  border: 1px solid #20bf72;
  background: #20bf72;
  color: #fff;
}

.skill-auth-reject {
  border: 1px solid rgba(239, 68, 68, .5);
  background: #fff;
  color: #d92d20;
}

.skill-clarify-doc {
  min-width: min(520px, 100%);
  display: grid;
  gap: 14px;
  color: var(--color-text, #1f2329);
}

.skill-clarify-doc-rule {
  height: 3px;
  background: #d5dbe4;
}

.skill-clarify-doc-rule.bottom {
  height: 2px;
  margin-top: 2px;
}

.skill-clarify-doc h3 {
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #dfe3ea;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 800;
}

.skill-clarify-doc section {
  display: grid;
  gap: 8px;
}

.skill-clarify-doc h4 {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 800;
}

.skill-clarify-doc p {
  margin: 0;
  color: var(--color-text, #1f2329);
  font-size: 13px;
  line-height: 1.7;
}

.skill-clarify-doc ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}

.skill-clarify-doc li {
  color: var(--color-text, #1f2329);
  font-size: 13px;
  line-height: 1.7;
}

.skill-clarify-doc-closing {
  padding-top: 2px;
}

.skill-chat-ai:has(.skill-clarify-doc) {
  width: min(620px, 92%);
  max-width: 92%;
}

.skill-application-validation {
  container-type: inline-size;
  margin-top: 14px;
  padding: 16px;
  border: 1px solid var(--border, #dfe3eb);
  border-radius: 8px;
  background: #fff;
}

.skill-application-validation-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.skill-application-validation-head b {
  display: block;
  color: var(--text, #1f2329);
  font-size: 14px;
}

.skill-application-validation-head p {
  margin: 4px 0 0;
  color: var(--text-secondary, #8f959e);
  font-size: 11px;
  line-height: 1.55;
}

.skill-application-validation-head > span {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 5px;
  background: #edf3ff;
  color: var(--primary, #3370ff);
  font-size: 10px;
  font-weight: 650;
}

.skill-application-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 8px;
}

.skill-application-composer textarea {
  min-height: 52px;
  max-height: 94px;
  resize: vertical;
  padding: 9px 11px;
  border: 1px solid #d8dde6;
  border-radius: 7px;
  outline: none;
  color: var(--text, #1f2329);
  background: #fff;
  font: inherit;
  font-size: 12px;
  line-height: 1.6;
}

.skill-application-composer textarea:focus {
  border-color: #7aa2ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, .1);
}

.skill-application-composer .btn {
  min-width: 92px;
  height: auto;
}

.skill-application-error {
  margin: 8px 0 0;
  color: #d92d20;
  font-size: 11px;
}

.skill-application-result-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--border-light, #e5e6eb);
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow, 0 1px 2px rgba(0, 0, 0, .06));
}

.skill-application-result-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 7px;
  background: #e8efff;
  color: var(--primary, #3370ff);
}

.skill-application-result-icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.skill-application-result-main,
.skill-application-result-summary {
  min-width: 0;
}

.skill-application-result-main > span,
.skill-application-result-summary > span {
  color: var(--primary, #3370ff);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
}

.skill-application-result-main > b,
.skill-application-result-summary > b {
  display: block;
  margin-top: 4px;
  color: var(--text, #1f2329);
  font-size: 13px;
  line-height: 1.45;
}

.skill-application-result-main > p,
.skill-application-result-summary > p {
  margin: 4px 0 0;
  color: var(--text-secondary, #646a73);
  font-size: 11px;
  line-height: 1.55;
}

.skill-application-result-main > div {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.skill-application-result-main em {
  padding: 3px 6px;
  border: 1px solid rgba(51, 112, 255, .12);
  border-radius: 999px;
  background: rgba(51, 112, 255, .06);
  color: #646a73;
  font-size: 10px;
  font-style: normal;
  line-height: 1.25;
}

.skill-application-result-summary {
  min-width: 0;
}

.skill-application-result-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: end;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light, #e5e6eb);
}

.skill-application-result-footer > .btn {
  min-width: 88px;
  white-space: nowrap;
}

@container (max-width: 560px) {
  .skill-application-result-card {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .skill-application-result-icon {
    width: 34px;
    height: 34px;
  }

  .skill-application-result-footer { gap: 12px; }
}

@container (max-width: 420px) {
  .skill-application-composer,
  .skill-application-result-card {
    grid-template-columns: 1fr;
  }

  .skill-application-result-icon {
    display: none;
  }

  .skill-application-result-footer {
    grid-template-columns: 1fr;
  }

  .skill-application-result-footer .btn {
    width: 100%;
  }
}

@keyframes skill-state-spin {
  to { transform: rotate(360deg); }
}

/* 固定头部与资源统计，卡片列表在中段独立滚动。 */
.skill-create-page .skill-context-pane {
  gap: 6px;
  min-width: 0;
  padding: 10px;
  overflow: hidden !important;
}

.skill-context-fixed-head {
  flex: 0 0 auto;
  min-width: 0;
  padding: 0 0 8px;
  border-bottom: 1px solid var(--border-light, #e5e6eb);
}

.skill-context-fixed-head > * + * { margin-top: 0; }

.skill-context-search {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border, #dee0e3);
  border-radius: 8px;
  background: var(--bg, #f5f6f7);
}

.skill-context-search:focus-within {
  border-color: var(--primary, #3370ff);
  box-shadow: 0 0 0 2px rgba(51, 112, 255, .1);
}

.skill-context-search svg {
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  fill: none;
  stroke: var(--text-tertiary, #8f959e);
  stroke-linecap: round;
  stroke-width: 1.8;
}

.skill-context-search input {
  display: block;
  width: 100%;
  height: 28px;
  min-width: 0;
  margin: 0;
  padding: 0 !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  color: var(--text, #1f2329);
  font: inherit;
  font-size: 12px;
}

.skill-context-search input::placeholder { color: var(--text-tertiary, #8f959e); }

.skill-context-scroll-wrap {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 26px;
  align-items: center;
  gap: 5px;
  min-width: 0;
  margin-top: 8px;
  margin-bottom: 9px;
}

.skill-context-scroll-wrap.selected { margin-top: 6px; margin-bottom: 0; }

.skill-context-more-button {
  display: grid;
  place-items: center;
  grid-column: 2;
  width: 26px;
  height: 24px;
  padding: 0;
  border: 1px solid rgba(51, 112, 255, .2);
  border-radius: 8px;
  background: rgba(255, 255, 255, .96);
  color: var(--primary, #3370ff);
  box-shadow: 0 1px 2px rgba(31, 35, 41, .06);
  cursor: pointer;
  transition: border-color .14s ease, color .14s ease, background .14s ease, transform .14s ease;
}

.skill-context-more-button:hover,
.skill-context-scroll-wrap.open .skill-context-more-button {
  border-color: rgba(51, 112, 255, .42);
  background: #fff;
}

.skill-context-more-button:focus-visible {
  outline: 2px solid rgba(51, 112, 255, .22);
  outline-offset: 2px;
}

.skill-context-more-button svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.skill-context-scroll-wrap.open .skill-context-more-button svg {
  transform: rotate(180deg);
}

.skill-context-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 12;
  box-sizing: border-box;
  display: grid;
  gap: 2px;
  width: min(198px, 100%);
  max-height: 218px;
  padding: 6px;
  overflow: auto;
  border: 1px solid var(--border-light, #e5e6eb);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(31, 35, 41, .12);
}

.skill-context-dropdown button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary, #646a73);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.skill-context-dropdown button:hover,
.skill-context-dropdown button.active {
  background: rgba(51, 112, 255, .08);
  color: var(--primary, #3370ff);
}

.skill-context-dropdown span,
.skill-context-dropdown small {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.skill-context-dropdown small {
  color: var(--text-tertiary, #8f959e);
  font-size: 10px;
}

.skill-context-dropdown.selected button {
  grid-template-columns: minmax(0, 1fr) auto 18px;
  gap: 8px;
  padding: 0 6px 0 10px;
}

.skill-context-dropdown.selected span,
.skill-context-dropdown.selected small,
.skill-context-dropdown.selected i {
  grid-row: 1;
}

.skill-context-dropdown.selected i {
  display: grid;
  place-items: center;
  justify-self: end;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  color: var(--text-tertiary, #8f959e);
  font-size: 13px;
  line-height: 1;
}

.skill-context-dropdown.selected button:hover i {
  background: rgba(51, 112, 255, .1);
  color: var(--primary, #3370ff);
}

.skill-context-dropdown i {
  color: var(--primary, #3370ff);
  font-style: normal;
  font-size: 12px;
}

.skill-context-domain-scroll,
.skill-context-selected-rail {
  grid-column: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.skill-context-domain-scroll { min-height: 26px; padding: 1px 0; }
.skill-context-domain-scroll::-webkit-scrollbar,
.skill-context-selected-rail::-webkit-scrollbar { display: none; }

.skill-context-domain {
  flex: 0 0 auto;
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: var(--bg, #f5f6f7);
  color: var(--text-secondary, #646a73);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.skill-context-domain:hover { color: var(--primary, #3370ff); background: rgba(51, 112, 255, .06); }
.skill-context-domain.active { background: var(--primary, #3370ff); color: #fff; font-weight: 700; }

.skill-context-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 23px;
  margin-top: 7px;
}

.skill-context-toolbar-title {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--text, #1f2329);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.skill-context-toolbar-title span {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--primary, #3370ff);
  color: #fff;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.skill-context-selected-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #646a73);
  font-size: 12px;
  cursor: pointer;
}

.skill-context-selected-toggle input { position: absolute; inline-size: 1px; block-size: 1px; opacity: 0; }

.skill-context-selected-toggle i {
  position: relative;
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: #d8dde6;
  transition: background .18s ease;
}

.skill-context-selected-toggle i::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(31, 35, 41, .16);
  transition: transform .18s ease;
}

.skill-context-selected-toggle input:checked + i { background: var(--primary, #3370ff); }
.skill-context-selected-toggle input:checked + i::after { transform: translateX(12px); }
.skill-context-selected-toggle input:focus-visible + i { box-shadow: 0 0 0 2px rgba(51, 112, 255, .18); }

.skill-context-selected-rail {
  box-sizing: border-box;
  min-height: 28px;
  gap: 4px;
  padding: 2px;
  border-radius: 8px;
  background: var(--primary-light, rgba(51, 112, 255, .08));
}

.skill-context-selected-chip {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 3px;
  height: 23px;
  max-width: 104px;
  padding: 0 5px 0 8px;
  overflow: hidden;
  border: 1px solid rgba(51, 112, 255, .24);
  border-radius: 999px;
  background: #fff;
  color: var(--primary, #3370ff);
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color .14s ease, box-shadow .14s ease;
}

.skill-context-selected-chip:hover {
  border-color: rgba(51, 112, 255, .46);
  box-shadow: 0 1px 2px rgba(31, 35, 41, .06);
}
.skill-context-selected-chip-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-context-selected-chip-remove {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 300;
  line-height: 1;
}

.skill-context-card-grid {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 7px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1px 2px;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(31, 35, 41, .14) transparent;
}

.skill-context-card-grid::-webkit-scrollbar {
  width: 6px;
}

.skill-context-card-grid::-webkit-scrollbar-track {
  background: transparent;
}

.skill-context-card-grid::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(31, 35, 41, .14);
}

.skill-context-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 104px;
  padding: 9px 10px 8px;
  border: 1px solid var(--border-light, #e5e6eb);
  border-radius: 10px;
  background: #fff;
  color: var(--text, #1f2329);
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
}

.skill-context-card:hover { border-color: rgba(51, 112, 255, .48); box-shadow: 0 1px 3px rgba(31, 35, 41, .06); }
.skill-context-card.selected { padding: 8px 9px 7px; border: 2px solid var(--primary, #3370ff); background: rgba(51, 112, 255, .055); }

.skill-context-card b {
  position: absolute;
  top: 13px;
  right: 10px;
  left: 10px;
  display: block;
  overflow: hidden;
  color: var(--text, #1f2329);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.skill-context-card.selected b { top: 12px; right: 9px; left: 9px; }
.skill-context-card.recommended b { right: 48px; }
.skill-context-card.selected.recommended b { right: 47px; }

.skill-context-card-subtitle {
  position: absolute;
  top: 35px;
  right: 10px;
  left: 10px;
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-secondary, #646a73);
  font-size: 10px;
  line-height: 15px;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.skill-context-card.selected .skill-context-card-subtitle { top: 34px; right: 9px; left: 9px; }

.skill-context-card em {
  position: absolute;
  right: 10px;
  bottom: 9px;
  left: 10px;
  overflow: hidden;
  color: var(--text-tertiary, #8f959e);
  font-size: 10px;
  font-style: normal;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.skill-context-card.selected em { right: 9px; bottom: 8px; left: 9px; color: var(--primary, #3370ff); }

.skill-context-card-recommend {
  position: absolute;
  top: 8px;
  right: 8px;
  max-width: calc(100% - 20px);
  padding: 1px 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(51, 112, 255, .1);
  color: var(--primary, #3370ff);
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.skill-context-card.selected .skill-context-card-recommend { top: 7px; right: 7px; }
.skill-context-card:focus-visible { z-index: 1; outline: 2px solid rgba(51, 112, 255, .3); outline-offset: 2px; }
.skill-context-empty-state { grid-column: 1 / -1; padding: 26px 12px; color: var(--text-tertiary, #8f959e); font-size: 12px; text-align: center; }

.skill-context-subtitle-tooltip {
  position: fixed;
  z-index: 1800;
  box-sizing: border-box;
  padding: 7px 9px;
  border-radius: 6px;
  background: rgba(31, 35, 41, .96);
  box-shadow: 0 4px 12px rgba(31, 35, 41, .18);
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: left;
  white-space: normal;
  pointer-events: none;
}

.skill-context-resource-metrics {
  flex: 0 0 auto;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  height: 74px;
  min-height: 74px;
  margin: 0 -10px -10px;
  padding: 15px 14px;
  border-top: 1px solid var(--border-light, #e5e6eb);
  background: #fff;
}

.skill-context-resource-metrics > div { display: grid; justify-items: center; gap: 3px; min-width: 0; }
.skill-context-resource-metrics b { color: var(--text, #1f2329); font-size: 16px; line-height: 1.2; }
.skill-context-resource-metrics span { color: var(--text-tertiary, #8f959e); font-size: 10px; white-space: nowrap; }
</style>
