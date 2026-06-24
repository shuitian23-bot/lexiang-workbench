<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">GEO · 手工上传知识</div>
        <div class="page-desc">上传文档或手动添加 QA 对，补充 AI 搜索引擎可抓取的知识内容</div>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi-card">
        <div class="kpi-label">文档总数</div>
        <div class="kpi-value" style="font-size:20px">{{ stats.docs ?? '-' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">向量数</div>
        <div class="kpi-value" style="font-size:20px">{{ stats.vectors ?? '-' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">QA 对数</div>
        <div class="kpi-value" style="font-size:20px">{{ stats.qa ?? '-' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">图谱实体</div>
        <div class="kpi-value" style="font-size:20px">{{ stats.kg ?? '-' }}</div>
      </div>
    </div>

    <!-- Tab 卡片 -->
    <div class="card" style="margin-bottom:16px">
      <div class="tab-bar" style="display:flex;border-bottom:1px solid var(--border-light);margin-bottom:16px">
        <div
          v-for="t in tabs" :key="t.key"
          class="tab-item"
          :class="{ active: activeTab === t.key }"
          :style="activeTab===t.key ? 'padding:10px 20px;cursor:pointer;font-size:13px;font-weight:500;border-bottom:2px solid var(--primary);color:var(--primary)' : 'padding:10px 20px;cursor:pointer;font-size:13px;font-weight:500;border-bottom:2px solid transparent;color:var(--text-tertiary)'"
          @click="switchTab(t.key)"
        >{{ t.label }}</div>
      </div>

      <!-- 上传文档 -->
      <div v-show="activeTab === 'upload'">
        <div style="padding:20px;text-align:center;border:2px dashed var(--border-light);border-radius:10px;margin:0 16px 16px">
          <div style="font-size:32px;margin-bottom:8px">📄</div>
          <div style="margin-bottom:12px;color:var(--text-secondary);font-size:13px">支持 .txt / .md / .pdf / .docx / .xlsx 格式</div>
          <input ref="fileInput" type="file" accept=".txt,.md,.pdf,.docx,.xlsx,.csv" style="display:none" @change="onFileSelect">
          <button class="btn btn-sm btn-secondary" @click="fileInput.click()">选择文件</button>
          <button class="btn btn-sm btn-primary" :disabled="!uploadFile" @click="doUpload">上传并处理</button>
          <div v-if="uploadStatus" style="margin-top:10px;font-size:12px" :style="{ color: uploadStatusColor }">{{ uploadStatus }}</div>
        </div>
      </div>

      <!-- 手动添加 QA -->
      <div v-show="activeTab === 'qa'">
        <div style="padding:0 16px 16px">
          <div style="margin-bottom:12px">
            <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px">问题</label>
            <input type="text" v-model="qaForm.question" placeholder="输入问题" style="width:100%;padding:8px 12px;border:1px solid var(--border-light);border-radius:6px;font-size:13px;box-sizing:border-box">
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px">答案</label>
            <textarea v-model="qaForm.answer" placeholder="输入答案" rows="4" style="width:100%;padding:8px 12px;border:1px solid var(--border-light);border-radius:6px;font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px">场景标签（可选）</label>
            <input type="text" v-model="qaForm.scene" placeholder="如：售前咨询、产品对比" style="width:100%;padding:8px 12px;border:1px solid var(--border-light);border-radius:6px;font-size:13px;box-sizing:border-box">
          </div>
          <button class="btn btn-sm btn-primary" @click="doSaveQA">保存 QA 对</button>
          <div v-if="qaStatus" style="display:inline-block;margin-left:12px;font-size:12px" :style="{ color: qaStatusColor }">{{ qaStatus }}</div>
        </div>
      </div>

      <!-- 文档列表 -->
      <div v-show="activeTab === 'docs'">
        <div style="padding:0 16px 16px">
          <div v-if="docsLoading" style="color:var(--text-tertiary);font-size:12px">加载中...</div>
          <div v-else>
            <table style="width:100%" v-if="docs.length">
              <thead><tr><th>标题</th><th>来源</th><th>分块数</th><th>创建时间</th></tr></thead>
              <tbody>
                <tr v-for="d in docs" :key="d.id">
                  <td>{{ d.title || '-' }}</td>
                  <td>{{ d.source_type || '-' }}</td>
                  <td>{{ d.chunk_count || 0 }}</td>
                  <td>{{ (d.created_at || '').slice(0,10) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else style="text-align:center;padding:20px;color:var(--text-tertiary)">暂无文档，请上传知识库文件</div>
            <!-- 分页 -->
            <div v-if="docsTotalPages > 1" style="margin-top:12px;display:flex;gap:6px;align-items:center;font-size:12px">
              <button class="btn btn-sm btn-secondary" :disabled="docsPage<=1" @click="loadDocs(docsPage-1)">上一页</button>
              <span>第 {{ docsPage }} / {{ docsTotalPages }} 页，共 {{ docsTotal }} 条</span>
              <button class="btn btn-sm btn-secondary" :disabled="docsPage>=docsTotalPages" @click="loadDocs(docsPage+1)">下一页</button>
            </div>
          </div>
        </div>
      </div>

      <!-- QA 列表 -->
      <div v-show="activeTab === 'qalist'">
        <div style="padding:0 16px 16px">
          <div style="margin-bottom:8px;font-size:12px;color:var(--text-tertiary)">共 {{ qaTotal }} 条</div>
          <div v-if="qaListLoading" style="color:var(--text-tertiary);font-size:12px">加载中...</div>
          <table v-else style="width:100%">
            <thead><tr><th style="width:35%">问题</th><th style="width:50%">答案</th><th>来源</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-if="!qaList.length"><td colspan="4" style="text-align:center;color:var(--text-tertiary)">暂无QA数据</td></tr>
              <tr v-for="q in qaList" :key="q.id">
                <td style="font-size:12px">{{ (q.question||'').slice(0,80) }}</td>
                <td style="font-size:12px;color:var(--text-secondary)">{{ (q.answer||'').slice(0,100) }}</td>
                <td style="font-size:11px">{{ q.source || '-' }}</td>
                <td><a style="color:var(--red);cursor:pointer;font-size:12px" @click="doDeleteQA(q.id)">删除</a></td>
              </tr>
            </tbody>
          </table>
          <div v-if="qaListTotalPages > 1" style="margin-top:12px;display:flex;gap:6px;align-items:center;font-size:12px">
            <button class="btn btn-sm btn-secondary" :disabled="qaListPage<=1" @click="loadQAList(qaListPage-1)">上一页</button>
            <span>第 {{ qaListPage }} / {{ qaListTotalPages }} 页</span>
            <button class="btn btn-sm btn-secondary" :disabled="qaListPage>=qaListTotalPages" @click="loadQAList(qaListPage+1)">下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const PAGE_SIZE = 30

const tabs = [
  { key:'upload', label:'上传文档' },
  { key:'qa',     label:'手动添加 QA' },
  { key:'docs',   label:'文档列表' },
  { key:'qalist', label:'QA 列表' },
]
const activeTab = ref('upload')

const stats = reactive({ docs: null, vectors: null, qa: null, kg: null })

const fileInput = ref(null)
const uploadFile = ref(null)
const uploadStatus = ref('')
const uploadStatusColor = ref('var(--text-secondary)')

const qaForm = reactive({ question:'', answer:'', scene:'' })
const qaStatus = ref('')
const qaStatusColor = ref('var(--text-secondary)')

const docs = ref([])
const docsPage = ref(1)
const docsTotal = ref(0)
const docsTotalPages = ref(1)
const docsLoading = ref(false)

const qaList = ref([])
const qaListPage = ref(1)
const qaTotal = ref(0)
const qaListTotalPages = ref(1)
const qaListLoading = ref(false)

function switchTab(key) {
  activeTab.value = key
  if (key === 'docs') loadDocs(1)
  if (key === 'qalist') loadQAList(1)
}

async function loadStats() {
  try {
    const r = await fetch('/api/knowledge/stats')
    if (!r.ok) return
    const d = await r.json()
    stats.docs = d.document_count ?? d.docs ?? null
    stats.vectors = d.vector_count ?? d.vectors ?? null
    stats.qa = d.qa_count ?? d.qa ?? null
    stats.kg = d.kg_count ?? d.kg ?? null
  } catch {}
}

function onFileSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadFile.value = file
  uploadStatus.value = `已选择: ${file.name} (${(file.size/1024).toFixed(1)}KB)`
  uploadStatusColor.value = 'var(--text-secondary)'
}

async function doUpload() {
  if (!uploadFile.value) return
  uploadStatus.value = '正在上传并处理...'; uploadStatusColor.value = 'var(--primary)'
  try {
    const fd = new FormData()
    fd.append('file', uploadFile.value)
    fd.append('source', 'workbench_upload')
    const r = await fetch('/api/knowledge/upload', { method:'POST', body:fd })
    const d = await r.json()
    if (r.ok) {
      uploadStatus.value = `上传成功！${d.title||''} 共 ${d.chunkCount||0} 个分块`
      uploadStatusColor.value = 'var(--green)'
      uploadFile.value = null
      if (fileInput.value) fileInput.value.value = ''
      setTimeout(loadStats, 1000)
    } else {
      uploadStatus.value = '上传失败: ' + (d.error||'未知错误')
      uploadStatusColor.value = 'var(--red)'
    }
  } catch(e) {
    uploadStatus.value = '上传失败: ' + e.message; uploadStatusColor.value = 'var(--red)'
  }
}

async function doSaveQA() {
  const { question, answer, scene } = qaForm
  if (!question.trim() || !answer.trim()) {
    qaStatus.value = '问题和答案不能为空'; qaStatusColor.value = 'var(--red)'; return
  }
  qaStatus.value = '保存中...'; qaStatusColor.value = 'var(--primary)'
  try {
    const r = await fetch('/api/admin/manual-qa', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ question, answer, source:'workbench_manual:'+(scene||'') }) })
    const d = await r.json()
    if (r.ok) {
      qaStatus.value = '保存成功！'; qaStatusColor.value = 'var(--green)'
      qaForm.question = ''; qaForm.answer = ''; qaForm.scene = ''
      loadStats()
    } else {
      qaStatus.value = '保存失败: ' + (d.error||'未知错误'); qaStatusColor.value = 'var(--red)'
    }
  } catch(e) { qaStatus.value = '保存失败: ' + e.message; qaStatusColor.value = 'var(--red)' }
}

async function loadDocs(page) {
  docsPage.value = page || 1
  docsLoading.value = true
  try {
    const r = await fetch(`/api/knowledge/?limit=${PAGE_SIZE}&page=${docsPage.value}`)
    if (!r.ok) { docs.value = []; return }
    const d = await r.json()
    docs.value = d.docs || []
    docsTotal.value = d.total || docs.value.length
    docsTotalPages.value = Math.ceil(docsTotal.value / PAGE_SIZE) || 1
  } catch { docs.value = [] } finally { docsLoading.value = false }
}

async function loadQAList(page) {
  qaListPage.value = page || 1
  qaListLoading.value = true
  const offset = (qaListPage.value - 1) * PAGE_SIZE
  try {
    const r = await fetch(`/api/knowledge/qa/list?limit=${PAGE_SIZE}&offset=${offset}`)
    if (!r.ok) { qaList.value = []; return }
    const d = await r.json()
    const items = d.items || d.qas || d || []
    qaList.value = Array.isArray(items) ? items : []
    qaTotal.value = d.total || qaList.value.length
    qaListTotalPages.value = Math.ceil(qaTotal.value / PAGE_SIZE) || 1
  } catch { qaList.value = [] } finally { qaListLoading.value = false }
}

async function doDeleteQA(id) {
  if (!confirm('确定删除此QA对？')) return
  try {
    await fetch('/api/knowledge/qa/' + id, { method:'DELETE' })
    loadQAList(qaListPage.value)
    loadStats()
  } catch {}
}

onMounted(() => {
  loadStats()
})
</script>
