<template>
  <div v-if="tab" class="workspace-report-page">
    <div class="page-header workspace-report-header">
      <div>
        <div class="page-title">{{ displayTitle }}</div>
        <div class="page-desc">{{ pageDescription }}</div>
      </div>
      <div class="workspace-report-actions">
        <button class="btn btn-secondary btn-sm" @click="saveTab">{{ tab.saved ? '已保存' : '保存' }}</button>
        <button class="btn btn-secondary btn-sm" @click="copyTabLink">复制链接</button>
        <button class="btn btn-secondary btn-sm" @click="downloadTab">下载</button>
        <button class="btn btn-primary btn-sm" @click="closeTab">返回页面</button>
      </div>
    </div>

    <SkillApplicationReport v-if="visualReport" :report="visualReport" />

    <template v-else>
      <article class="workspace-report-body workspace-report-body-standalone">
        <div v-if="tab.externalUrl" class="workspace-link-panel">
          <b>链接地址</b>
          <code>{{ tab.externalUrl }}</code>
          <button class="btn btn-secondary btn-sm" @click="copyUrl">复制链接</button>
        </div>

        <div v-if="tab.previewHtml" class="workspace-preview-shell">
          <iframe :title="displayTitle" sandbox="allow-same-origin allow-scripts allow-forms" :srcdoc="tab.previewHtml"></iframe>
        </div>

        <div v-else class="workspace-report-sections">
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
      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore, getPageLabel } from '@/stores/app'
import { downloadTextFile } from '@/utils/download'
import SkillApplicationReport from '@/components/report/SkillApplicationReport.vue'
import { createEmployeeCertificationReport } from '@/services/skillApplicationReport'

const appStore = useAppStore()
const { tempTabs, activeTempTabId } = storeToRefs(appStore)

const tab = computed(() => tempTabs.value.find(t => t.id === activeTempTabId.value) || null)

const visualReport = computed(() => {
  if (tab.value?.reportData) return tab.value.reportData
  const isSkillReport = tab.value?.sourcePage === 'agent.skills'
    || tab.value?.sourcePage === 'agent.skillCreate'
    || /Skill Hub|presentation-employee-cert|职场员工审核/i.test(`${tab.value?.title || ''}\n${tab.value?.content || ''}`)
  if (!isSkillReport) return null
  return createEmployeeCertificationReport({
    prompt: tab.value?.summary || tab.value?.content || undefined,
    generatedAt: createdText.value
  })
})

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
  const isOverviewReport = tab.value.sourcePage === 'dashboard.overview' || page === '运营总览' || /运营总览/.test(clean)
  if (isOverviewReport && /风控|策略命中|DPL|限购/i.test(clean)) {
    return '运营总览 · 经营指标解读'
  }
  if (page) clean = clean.replace(new RegExp(`^${escapeRegExp(page)}\\s*[·:：-]?\\s*`), '').trim()
  if (!clean || clean === page) return `${page || '当前页面'} · 数据解读报告`
  return page ? `${page} · ${clean}` : clean
})

const pageDescription = computed(() => {
  if (visualReport.value) {
    return `数据区间 ${visualReport.value.dateStart} 至 ${visualReport.value.dateEnd} · ${visualReport.value.dayCount} 天 · ${createdText.value}`
  }
  return `来自 AI 对话 · ${tab.value?.groupLabel || 'AI 报告'} / ${tab.value?.sourcePageLabel || '当前页面'} · ${createdText.value}`
})

const sections = computed(() => parseReportSections(tab.value?.content || ''))

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
