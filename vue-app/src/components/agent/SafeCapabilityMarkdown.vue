<template>
  <div class="safe-capability-markdown">
    <template v-for="(block, index) in blocks" :key="`${block.type}-${index}`">
      <component
        :is="block.level === 1 ? 'h3' : 'h4'"
        v-if="block.type === 'heading'"
      >
        {{ block.text }}
      </component>
      <p v-else-if="block.type === 'paragraph'">{{ block.text }}</p>
      <ul v-else-if="block.type === 'list'">
        <li v-for="item in block.items" :key="item">{{ item }}</li>
      </ul>
      <div v-else-if="block.type === 'table'" class="safe-capability-table-wrap">
        <table>
          <thead>
            <tr><th v-for="header in block.headers" :key="header">{{ header }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { parseCapabilityMarkdown } from '@/services/safeCapabilityMarkdown'

const props = defineProps({ markdown: { type: String, default: '' } })
const blocks = computed(() => parseCapabilityMarkdown(props.markdown))
</script>

<style scoped>
.safe-capability-markdown { color: #344054; font-size: 13px; line-height: 1.7; }
.safe-capability-markdown h3,
.safe-capability-markdown h4 { color: #101828; margin: 18px 0 8px; }
.safe-capability-markdown h3:first-child,
.safe-capability-markdown h4:first-child { margin-top: 0; }
.safe-capability-markdown h3 { font-size: 16px; }
.safe-capability-markdown h4 { font-size: 14px; }
.safe-capability-markdown p,
.safe-capability-markdown ul { margin: 8px 0; }
.safe-capability-markdown ul { padding-left: 20px; }
.safe-capability-table-wrap { margin: 10px 0; overflow-x: auto; }
.safe-capability-markdown table { border-collapse: collapse; min-width: 620px; width: 100%; }
.safe-capability-markdown th,
.safe-capability-markdown td { border: 1px solid #e4e7ec; padding: 8px 10px; text-align: left; vertical-align: top; }
.safe-capability-markdown th { background: #f8fafc; color: #475467; font-weight: 600; }
</style>
