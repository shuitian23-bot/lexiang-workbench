<template>
  <div v-if="tab" class="workspace-report-page">
    <div class="page-header workspace-report-header">
      <div>
        <div class="page-title">{{ displayTitle }}</div>
        <div class="page-desc">来自 AI 对话 · {{ tab.groupLabel || 'AI 报告' }} / {{ tab.sourcePageLabel || '当前页面' }} · {{ createdText }}</div>
      </div>
      <div class="workspace-report-actions">
        <button class="btn btn-secondary btn-sm" @click="saveTab">{{ tab.saved ? '已保存' : '保存' }}</button>
        <button class="btn btn-secondary btn-sm" @click="copyTabLink">复制链接</button>
        <button class="btn btn-secondary btn-sm" @click="downloadTab">下载</button>
        <button class="btn btn-primary btn-sm" @click="closeTab">返回页面</button>
      </div>
    </div>

    <section class="workspace-report-hero">
      <div>
        <span class="workspace-report-kicker">AI GENERATED REPORT</span>
        <p>{{ tab.summary || '已将右侧 AI 对话中的长篇数据、解读和建议整理为临时工作页签，便于在中间内容槽阅读、保存和对比。' }}</p>
      </div>
      <div class="workspace-report-meta">
        <span v-for="chip in reportChips" :key="chip">{{ chip }}</span>
      </div>
    </section>

    <div class="workspace-report-metrics">
      <div v-for="metric in metricCards" :key="metric.label">
        <span>{{ metric.label }}</span>
        <b>{{ metric.value }}</b>
      </div>
    </div>

    <div class="workspace-report-grid">
      <aside class="workspace-report-outline">
        <b>报告目录</b>
        <span v-for="(heading, index) in outlineHeadings" :key="`${heading}-${index}`">
          <i>{{ String(index + 1).padStart(2, '0') }}</i>{{ heading }}
        </span>
      </aside>

      <article class="workspace-report-body">
        <div v-if="tab.externalUrl" class="workspace-link-panel">
          <b>链接地址</b>
          <code>{{ tab.externalUrl }}</code>
          <button class="btn btn-secondary btn-sm" @click="copyUrl">复制链接</button>
        </div>

        <div v-if="tab.previewHtml" class="workspace-preview-shell">
          <iframe :title="displayTitle" sandbox="allow-same-origin allow-scripts allow-forms" :srcdoc="tab.previewHtml"></iframe>
        </div>

        <template v-else>
          <div v-if="sections.bullets.length" class="workspace-report-summary">
            <b>结论摘要</b>
            <p v-for="item in sections.bullets" :key="item">{{ item }}</p>
          </div>

          <div class="workspace-report-sections">
            <section
              v-for="(section, index) in sections.sections"
              :key="`${section.title}-${index}`"
              class="workspace-report-section"
            >
              <div class="workspace-report-section-head">
                <span>{{ String(index + 1).padStart(2, '0') }}</span>
                <h3>{{ section.title }}</h3>
              </div>
              <div class="workspace-report-section-body">
                <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
                <ul v-if="section.items.length">
                  <li v-for="item in section.items" :key="item">{{ item }}</li>
                </ul>
              </div>
            </section>

            <div v-if="!sections.sections.length" class="workspace-report-markdown" v-html="renderMarkdown(tab.content || '')"></div>
          </div>
        </template>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore, getPageLabel, type TempTab } from '@/stores/app'
import { downloadTextFile } from '@/utils/download'

const appStore = useAppStore()
const { tempTabs, activeTempTabId } = storeToRefs(appStore)

const tab = computed(() => tempTabs.value.find(t => t.id === activeTempTabId.value) || null)

const createdText = computed(() => {
  try {
    return new Date(tab.value?.createdAt || Date.now()).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return ''
  }
})

const displayTitle = computed(() => {
  if (!tab.value) return ''
  const page = tab.value.sourcePageLabel || getPageLabel(tab.value.sourcePage) || ''
  let clean = String(tab.value.title || '')
    .replace(/^AI\s*报告\s*[·:：-]\s*/i, '')
    .replace(/\s*#\d+\s*$/g, '')
    .trim()
  if (page) clean = clean.replace(new RegExp(`^${escapeRegExp(page)}\\s*[·:：-]?\\s*`), '').trim()
  if (!clean || clean === page) return `${page || '当前页面'} · 数据解读报告`
  return page ? `${page} · ${clean}` : clean
})

const sections = computed(() => parseReportSections(tab.value?.content || ''))
const reportChips = computed(() => {
  const chips = tab.value?.chips?.length
    ? tab.value.chips
    : ['AI 对话', tab.value?.sourcePageLabel || '当前页面']
  return chips.slice(0, 4)
})
const outlineHeadings = computed(() => {
  return sections.value.headings.length
    ? sections.value.headings
    : ['核心结论', '关键证据', '建议动作']
})
const metricCards = computed(() => reportMetricCards(tab.value, sections.value.sections))

interface ReportSection {
  title: string
  paragraphs: string[]
  items: string[]
}

interface ParsedReportSections {
  bullets: string[]
  sections: ReportSection[]
  headings: string[]
}

function parseReportSections(content: string): ParsedReportSections {
  const lines = String(content || '').split(/\r?\n/)
  const bullets: string[] = []
  const sections: ReportSection[] = []
  let current: ReportSection | null = null

  lines.forEach(raw => {
    const line = raw.trim()
    if (!line) return
    const heading = line.match(/^#{1,3}\s+(.+)$/)
    if (heading) {
      current = { title: heading[1].trim(), paragraphs: [], items: [] }
      sections.push(current)
      return
    }
    const bullet = line.match(/^[-•]\s+(.+)$/)
    if (bullet) {
      const text = bullet[1].trim()
      if (current) current.items.push(text)
      else bullets.push(text)
      return
    }
    if (current) current.paragraphs.push(line)
    else bullets.push(line)
  })

  return {
    bullets: bullets.slice(0, 4),
    sections,
    headings: sections.map(section => section.title).slice(0, 6)
  }
}

function reportMetricCards(report: TempTab | null, parsedSections: ReportSection[]) {
  const chips = report?.chips || []
  return [
    { label: '来源页面', value: report?.sourcePageLabel || '当前页面' },
    { label: '报告段落', value: `${Math.max(parsedSections?.length || 0, 1)} 段` },
    { label: '生成方式', value: report?.previewHtml ? 'HTML 预览' : 'AI 对话' }
  ].concat(chips.slice(0, 1).map((chip: string) => ({ label: '主题标签', value: chip }))).slice(0, 4)
}

function renderMarkdown(text: string) {
  return escapeHtml(text)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/^[-•] (.+)$/gm, '<p>• $1</p>')
    .replace(/\n/g, '<br>')
}

function closeTab() {
  if (tab.value) appStore.closeTempTab(tab.value.id)
}

function saveTab() {
  if (!tab.value) return
  appStore.saveTempTab(tab.value.id)
  appStore.notify('AI 报告已保存，可在本机继续查看')
}

function copyTabLink() {
  if (tab.value) appStore.copyTempTabUrl(tab.value.id)
}

function downloadTab() {
  if (!tab.value) return
  const isHtml = !!tab.value.previewHtml
  downloadTextFile({
    content: isHtml ? tab.value.previewHtml : `# ${displayTitle.value}\n\n${tab.value.content || ''}`,
    fileName: `${displayTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.${isHtml ? 'html' : 'md'}`,
    mimeType: isHtml ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8'
  })
}

function copyUrl() {
  if (tab.value) appStore.copyTempTabUrl(tab.value.id)
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegExp(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>
