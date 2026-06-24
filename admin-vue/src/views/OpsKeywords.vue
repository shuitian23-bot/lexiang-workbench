<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">敏感词库</div>
        <div class="page-desc">维护业务敏感词，统计分析相关Query命中情况</div>
      </div>
      <button class="btn btn-primary" @click="showAddForm = true">+ 添加词条</button>
    </div>

    <div class="ops-kw-stats">
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ keywords.length }}</div>
        <div class="ops-kpi-label">词库总数</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ Object.keys(grouped).length }}</div>
        <div class="ops-kpi-label">分类数</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">-</div>
        <div class="ops-kpi-label">今日命中Query</div>
        <div class="ops-kpi-sub">待接入</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">-</div>
        <div class="ops-kpi-label">命中率</div>
        <div class="ops-kpi-sub">待接入</div>
      </div>
    </div>

    <!-- 添加表单 -->
    <div v-if="showAddForm" class="ops-card" style="margin-bottom:16px">
      <h3>添加敏感词</h3>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <input v-model="newWord" class="ops-input" placeholder="敏感词" style="flex:2" />
        <select v-model="newCat" class="ops-select" style="flex:1">
          <option value="政企">政企</option>
          <option value="消费">消费</option>
          <option value="SMB">SMB</option>
          <option value="品牌">品牌</option>
          <option value="竞品">竞品</option>
          <option value="其他">其他</option>
        </select>
        <select v-model="newLevel" class="ops-select" style="flex:1">
          <option value="高">高敏感</option>
          <option value="中">中敏感</option>
          <option value="低">低敏感</option>
        </select>
        <button class="btn btn-primary" @click="addKeyword">添加</button>
        <button class="btn btn-secondary" @click="showAddForm = false">取消</button>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-tertiary)">支持批量：多个词用逗号分隔</div>
    </div>

    <div class="ops-section-title">📋 词库列表</div>

    <div v-if="Object.keys(grouped).length === 0" class="ops-card" style="text-align:center;padding:40px;color:var(--text-tertiary)">
      词库为空，点击上方按钮添加敏感词
    </div>

    <div v-for="(words, cat) in grouped" :key="cat" class="ops-card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h3>{{ cat }} <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">({{ words.length }}个)</span></h3>
      </div>
      <div class="ops-kw-tags">
        <span
          v-for="w in words"
          :key="w.word + w.category"
          class="ops-kw-tag"
          :class="{ danger: w.level === '高', warn: w.level === '中' }"
          :title="w.level + '敏感'"
        >
          {{ w.word }}
          <span class="ops-kw-del" @click="delKeyword(w.word, w.category)">×</span>
        </span>
      </div>
    </div>

    <div class="ops-section-title">📊 命中分析</div>
    <div class="ops-card">
      <div style="text-align:center;padding:30px;color:var(--text-tertiary)">
        命中分析功能将在Query数据接入后自动启用。<br />
        将展示：各敏感词被Query命中的次数、趋势、热力图。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ---- 持久化 ----
function loadKeywords() {
  try { return JSON.parse(localStorage.getItem('ops_keywords') || '[]') } catch { return [] }
}
function saveKeywords(list) { localStorage.setItem('ops_keywords', JSON.stringify(list)) }

// ---- 状态 ----
const keywords = ref(loadKeywords())
const showAddForm = ref(false)
const newWord = ref('')
const newCat = ref('政企')
const newLevel = ref('高')

// ---- 分组 ----
const grouped = computed(() => {
  const g = {}
  keywords.value.forEach(k => {
    if (!g[k.category]) g[k.category] = []
    g[k.category].push(k)
  })
  return g
})

// ---- 操作 ----
function addKeyword() {
  const wordInput = newWord.value.trim()
  if (!wordInput) return
  const words = wordInput.split(/[,，、;；\s]+/).filter(Boolean)
  const list = loadKeywords()
  let added = 0
  words.forEach(w => {
    if (!list.some(k => k.word === w && k.category === newCat.value)) {
      list.push({ word: w, category: newCat.value, level: newLevel.value, addedAt: new Date().toISOString() })
      added++
    }
  })
  if (added > 0) {
    saveKeywords(list)
    keywords.value = list
  }
  newWord.value = ''
  showAddForm.value = false
}

function delKeyword(word, cat) {
  const list = loadKeywords().filter(k => !(k.word === word && k.category === cat))
  saveKeywords(list)
  keywords.value = list
}
</script>

<style scoped>
.ops-kw-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
</style>
