<template>
  <div
    id="ai-file-preview"
    class="ai-file-preview"
    :style="{
      display: attachedFile ? 'flex' : 'none',
      background: 'var(--primary-light)'
    }"
  >
    <button
      v-if="isImageAttachment"
      type="button"
      class="ai-file-thumb"
      title="查看参考图"
      aria-label="查看参考图"
      @click="previewOpen = true"
    >
      <img :src="attachedFile.dataUrl" :alt="attachedFile.name" />
    </button>
    <span v-else class="ai-file-icon" aria-hidden="true">📎</span>
    <button
      type="button"
      class="ai-file-meta"
      :class="{ 'is-clickable': isImageAttachment }"
      :title="isImageAttachment ? '查看参考图' : attachedFile?.name"
      @click="isImageAttachment && (previewOpen = true)"
    >
      <span class="ai-file-label">{{ isImageAttachment ? '参考图' : '附件' }}</span>
      <span id="ai-file-name">{{ attachedFile?.name }}</span>
    </button>
    <button type="button" class="ai-file-clear" title="移除附件" aria-label="移除附件" @click="$emit('clear-file')">×</button>
  </div>

  <div
    class="ai-input-area"
    id="ai-input-area"
    :class="{
      'has-file': !!attachedFile,
      'is-sending': loading,
      'has-queue': queuedMessages.length > 0
    }"
  >
    <input
      type="file"
      id="ai-file-input"
      ref="fileInputEl"
      style="display:none"
      accept=".txt,.md,.pdf,.docx,.xlsx,.csv,.json,image/*"
      @change="onFileSelected"
    />
    <div class="ai-input-combo">
      <div v-if="queuedMessages.length" class="ai-queue-list" id="ai-queue-list">
        <div class="ai-queue-list-head">排队中 · {{ queuedMessages.length }}</div>
        <div v-for="(item, index) in queuedMessages" :key="item.queueId" class="ai-queue-item" :title="item.userMsg">
          <span>{{ index + 1 }}</span>
          <b>{{ item.userMsg }}</b>
        </div>
      </div>

      <div class="ai-scope-row" aria-label="选择提问范围">
        <button type="button" class="ai-scope-arrow left" id="ai-scope-left" aria-label="向左滚动项目标签" @click="scrollShortcuts(-1)">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 5-5 5 5 5"/></svg>
        </button>
        <div class="ai-shortcuts" id="ai-shortcuts" role="toolbar" aria-label="快捷查询" ref="shortcutsEl">
          <button
            v-for="(label, idx) in shortcuts"
            :key="label"
            type="button"
            class="ai-shortcut"
            :data-ai-shortcut="idx"
            :title="shortcutQuery(label)"
            @click="$emit('send-shortcut', label)"
          >{{ label }}</button>
        </div>
        <button type="button" class="ai-scope-arrow right" id="ai-scope-right" aria-label="向右滚动项目标签" @click="scrollShortcuts(1)">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 5 5 5-5 5"/></svg>
        </button>
        <select class="ai-scope-select" id="ai-scope-select" aria-label="选择提问范围" :value="activeShortcut" @change="e => $emit('send-shortcut', e.target.value)">
          <option v-for="label in shortcuts" :key="label">{{ label }}</option>
        </select>
      </div>

      <div class="ai-composer-box">
        <button type="button" class="ai-composer-action" @click="fileInputEl?.click()" title="上传文件" aria-label="上传文件">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 10.5 11 7a2.2 2.2 0 1 1 3.1 3.1l-5 5a3.6 3.6 0 0 1-5.1-5.1l5.5-5.5"/></svg>
        </button>
        <textarea
          class="ai-input"
          id="ai-input"
          ref="inputEl"
          :value="inputText"
          :placeholder="inputPlaceholder"
          rows="1"
          @input="onInput"
          @keydown.enter.exact.prevent="$emit('send')"
        ></textarea>
        <button
          class="ai-send"
          id="ai-send"
          :class="{ 'is-stop': stopMode }"
          :disabled="!loading && !canSend"
          @click="$emit('send')"
          :title="sendButtonTitle"
          :aria-label="sendButtonTitle"
          :aria-disabled="(!loading && !canSend) ? 'true' : 'false'"
        >
          <svg v-if="stopMode" viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
            <rect x="5.2" y="5.2" width="9.6" height="9.6" rx="2.2"></rect>
          </svg>
          <svg v-else viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 16 3l-3.2 14-3.1-5.6L3 10z"/><path d="m9.7 11.4 3.8-4.8"/></svg>
        </button>
      </div>
    </div>
    <div class="ai-composer-hint" :class="{ 'has-queue': !!queueNotice }">
      {{ queueNotice || '支持数据、报告、配置、知识库，写入前确认。' }}
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="previewOpen && isImageAttachment"
      class="ai-image-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="参考图预览"
      @click.self="previewOpen = false"
    >
      <div class="ai-image-preview-panel">
        <div class="ai-image-preview-head">
          <div>
            <span>参考图</span>
            <b>{{ attachedFile.name }}</b>
          </div>
          <button type="button" title="关闭预览" aria-label="关闭预览" @click="previewOpen = false">×</button>
        </div>
        <div class="ai-image-preview-stage">
          <img :src="attachedFile.dataUrl" :alt="attachedFile.name" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  inputText: { type: String, default: '' },
  attachedFile: { type: Object, default: null },
  activeShortcut: { type: String, default: '' },
  shortcuts: { type: Array, default: () => [] },
  inputPlaceholder: { type: String, default: '' },
  queuedMessages: { type: Array, default: () => [] },
  queueNotice: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  shortcutQuery: { type: Function, required: true }
})

const emit = defineEmits(['update-input', 'send', 'send-shortcut', 'attach-file', 'clear-file'])

const inputEl = ref(null)
const fileInputEl = ref(null)
const shortcutsEl = ref(null)
const previewOpen = ref(false)

const canSend = computed(() => !!props.inputText.trim() || !!props.attachedFile)
const isImageAttachment = computed(() => !!props.attachedFile?.isImage && !!props.attachedFile?.dataUrl)
const stopMode = computed(() => props.loading && !canSend.value)
const sendButtonTitle = computed(() => {
  if (stopMode.value) return '停止当前回答'
  if (props.loading) return '加入队列'
  return canSend.value ? '发送' : '请输入内容后发送'
})

watch(() => props.inputText, () => nextTick(autoResize))
watch(() => props.attachedFile, () => {
  previewOpen.value = false
})

function onInput(event) {
  emit('update-input', event.target.value)
  autoResize()
}

function autoResize() {
  const el = inputEl.value
  if (!el) return
  const maxHeight = 76
  el.style.height = 'auto'
  const nextHeight = Math.min(el.scrollHeight, maxHeight)
  el.style.height = nextHeight + 'px'
  el.classList.toggle('is-scrollable', el.scrollHeight > maxHeight)
}

function scrollShortcuts(dir) {
  const el = shortcutsEl.value
  if (!el) return
  el.scrollBy({ left: dir * 80, behavior: 'smooth' })
}

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''
  if (file.type.startsWith('image/')) {
    const dataUrl = await readFileAsDataUrl(file)
    emit('attach-file', {
      name: file.name,
      type: file.type,
      dataUrl,
      isImage: true,
      text: `参考图：${file.name}\n\n用户上传了一张参考图，请结合图像内容和当前页面上下文分析。`
    })
    return
  }
  try {
    const text = await file.text()
    emit('attach-file', { name: file.name, text: `📎 ${file.name}\n\n${text}` })
  } catch {
    emit('attach-file', { name: file.name, text: `📎 ${file.name}` })
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
</script>
