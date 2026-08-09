<template>
  <div ref="root" class="data-directory-list">
    <section v-for="directory in directories" :key="directory.id" class="data-directory" :data-directory-id="directory.id">
      <header class="data-directory-head">
        <button
          type="button"
          class="data-directory-toggle"
          :aria-expanded="isExpanded(directory.id)"
          @click="toggleDirectory(directory.id)"
        >
          <span class="directory-chevron" aria-hidden="true">›</span>
          <b>{{ directory.name }}</b>
          <span>{{ directory.datasets.length }} 个数据集</span>
        </button>
        <button
          type="button"
          :class="['directory-search-trigger', { active: isSearchVisible(directory.id) }]"
          :aria-label="isSearchVisible(directory.id) ? `关闭${directory.name}下的数据集搜索` : `搜索${directory.name}下的数据集`"
          :title="isSearchVisible(directory.id) ? '关闭搜索' : '搜索当前目录的数据集'"
          @click="toggleDirectorySearch(directory.id, $event)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
        </button>
      </header>

      <div v-if="isExpanded(directory.id)" class="data-directory-body">
        <div v-if="isSearchVisible(directory.id)" class="directory-search-box">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            :value="directoryKeyword(directory.id)"
            :placeholder="`搜索${directory.name}下的数据集`"
            :aria-label="`搜索${directory.name}下的数据集`"
            @input="updateDirectoryKeyword(directory.id, $event)"
            @keydown.esc.stop="closeDirectorySearch(directory.id)"
          >
          <button
            v-if="directoryKeyword(directory.id)"
            type="button"
            class="directory-search-clear"
            :aria-label="`清空${directory.name}搜索关键词`"
            title="清空搜索"
            @click="clearDirectoryKeyword(directory.id, $event)"
          >×</button>
        </div>

        <div v-if="filteredDatasets(directory).length" class="data-directory-datasets">
          <label v-for="dataset in filteredDatasets(directory)" :key="dataset.id" class="data-dataset-item">
            <input
              type="checkbox"
              :checked="selectedIds.includes(dataset.id)"
              :disabled="disabled || disabledIds.includes(dataset.id)"
              @change="$emit('toggle', dataset.id)"
            >
            <span>{{ dataset.name }}</span>
            <em v-if="sourceLabels[dataset.id]" class="dataset-source-badge">{{ sourceLabels[dataset.id] }}</em>
          </label>
        </div>
        <div v-else class="directory-empty" role="status">
          {{ directoryKeyword(directory.id) ? '暂无匹配的数据集' : '该一级目录暂无数据集' }}
        </div>
      </div>
    </section>

    <div v-if="!directories.length" class="directory-list-empty">
      <b>暂无数据权限</b>
      <p>当前没有可展示的数据集。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'

export interface DataPermissionDataset {
  id: string
  name: string
  description?: string
  scope?: string
}

export interface DataPermissionDirectory {
  id: string
  name: string
  datasets: DataPermissionDataset[]
}

const props = withDefaults(defineProps<{
  directories: DataPermissionDirectory[]
  selectedIds?: string[]
  disabledIds?: string[]
  sourceLabels?: Record<string, string>
  disabled?: boolean
  defaultExpanded?: boolean
}>(), {
  selectedIds: () => [],
  disabledIds: () => [],
  sourceLabels: () => ({}),
  disabled: false,
  defaultExpanded: true
})

defineEmits<{ toggle: [id: string] }>()

const root = ref<HTMLElement | null>(null)
const expandedDirectories = reactive<Record<string, boolean>>({})
const searchVisible = reactive<Record<string, boolean>>({})
const searchKeywords = reactive<Record<string, string>>({})

watch(() => props.directories.map((directory) => directory.id), (ids) => {
  ids.forEach((id) => {
    if (!(id in expandedDirectories)) expandedDirectories[id] = props.defaultExpanded
  })
}, { immediate: true })

const isExpanded = (id: string) => !!expandedDirectories[id]
const isSearchVisible = (id: string) => !!searchVisible[id]
const directoryKeyword = (id: string) => searchKeywords[id] || ''

function toggleDirectory(id: string) {
  expandedDirectories[id] = !isExpanded(id)
}

async function toggleDirectorySearch(id: string, event: MouseEvent) {
  if (isSearchVisible(id)) {
    closeDirectorySearch(id)
    return
  }
  expandedDirectories[id] = true
  searchVisible[id] = true
  await nextTick()
  const section = (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.data-directory')
  section?.querySelector<HTMLInputElement>('.directory-search-box input')?.focus()
}

function closeDirectorySearch(id: string) {
  searchVisible[id] = false
  searchKeywords[id] = ''
}

function clearDirectoryKeyword(id: string, event: MouseEvent) {
  searchKeywords[id] = ''
  const section = (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.data-directory')
  section?.querySelector<HTMLInputElement>('.directory-search-box input')?.focus()
}

function updateDirectoryKeyword(id: string, event: Event) {
  searchKeywords[id] = (event.target as HTMLInputElement).value
}

function filteredDatasets(directory: DataPermissionDirectory) {
  const keyword = directoryKeyword(directory.id).trim().toLowerCase()
  if (!keyword) return directory.datasets
  return directory.datasets.filter((dataset) => dataset.name.toLowerCase().includes(keyword))
}
</script>

<style scoped>
.data-directory-list { display: grid; gap: 8px; min-width: 0; }
.data-directory { overflow: hidden; border: 1px solid #e4eaf3; border-radius: 8px; background: #fff; }
.data-directory-head { display: grid; grid-template-columns: minmax(0, 1fr) 32px; align-items: center; min-height: 40px; background: #f8fafc; }
.data-directory-toggle { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 40px; border: 0; padding: 0 4px 0 10px; background: transparent; color: #172033; text-align: left; cursor: pointer; }
.data-directory-toggle:hover { background: #f4f7fb; }
.data-directory-toggle:focus-visible, .directory-search-trigger:focus-visible, .directory-search-clear:focus-visible { outline: 2px solid #316dff; outline-offset: -2px; }
.directory-chevron { flex: 0 0 auto; color: #8a96a8; font-size: 17px; line-height: 1; transform: rotate(0); transition: transform .16s ease; }
.data-directory-toggle[aria-expanded='true'] .directory-chevron { transform: rotate(90deg); }
.data-directory-toggle b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.data-directory-toggle span:last-child { flex: 0 0 auto; margin-left: auto; color: #7a8798; font-size: 12px; font-weight: 600; }
.directory-search-trigger { display: grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 6px; padding: 0; background: transparent; color: #667085; cursor: pointer; }
.directory-search-trigger:hover, .directory-search-trigger.active { background: #eaf1ff; color: #316dff; }
.directory-search-trigger svg, .directory-search-box > svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.8; }
.data-directory-body { display: grid; gap: 8px; border-top: 1px solid #edf2f8; padding: 10px; }
.directory-search-box { display: grid; grid-template-columns: 18px minmax(0, 1fr) 28px; align-items: center; min-height: 34px; border: 1px solid #d8e1ee; border-radius: 7px; padding: 0 5px 0 10px; background: #fff; color: #8a96a8; }
.directory-search-box:focus-within { border-color: #7fa5ff; box-shadow: 0 0 0 3px rgba(49, 109, 255, .1); }
.directory-search-box input { min-width: 0; height: 32px; border: 0; outline: 0; padding: 0 8px; background: transparent; color: #172033; font: inherit; font-size: 13px; }
.directory-search-clear { width: 26px; height: 26px; border: 0; border-radius: 6px; padding: 0; background: transparent; color: #7a8798; font-size: 18px; line-height: 1; cursor: pointer; }
.directory-search-clear:hover { background: #f1f4f8; color: #172033; }
.data-directory-datasets { display: grid; gap: 4px; }
.data-dataset-item { display: flex; align-items: center; gap: 9px; min-width: 0; min-height: 34px; border-radius: 7px; padding: 4px 8px; color: #455468; font-size: 13px; cursor: pointer; }
.data-dataset-item:hover { background: #f5f8fc; }
.data-dataset-item input { flex: 0 0 auto; width: 16px; height: 16px; accent-color: #316dff; }
.data-dataset-item > span { min-width: 0; overflow-wrap: anywhere; }
.dataset-source-badge { flex: 0 0 auto; margin-left: auto; border-radius: 999px; padding: 4px 8px; background: #eef2f7; color: #667085; font-size: 11px; font-style: normal; font-weight: 700; }
.directory-empty { border: 1px dashed #d7e0ec; border-radius: 7px; padding: 16px; color: #7a8798; text-align: center; font-size: 12px; }
.directory-list-empty { border: 1px dashed #cfd9e7; border-radius: 8px; padding: 24px; text-align: center; }
.directory-list-empty p { margin: 6px 0 0; color: #7a8798; font-size: 12px; }
@media (max-width: 520px) {
  .data-directory-toggle span:last-child { display: none; }
  .data-directory-body { padding: 8px; }
  .dataset-source-badge { padding-inline: 6px; }
}
</style>
