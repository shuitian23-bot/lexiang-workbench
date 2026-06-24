<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">GEO · 各平台意图分布</div>
        <div class="page-desc">各 AI 平台覆盖意图总数及可见性矩阵</div>
      </div>
      <button class="btn btn-sm btn-secondary" @click="loadData">刷新</button>
    </div>
    <div class="geo-dark">
      <!-- 各平台意图总数 -->
      <div class="geo-panel" style="margin-bottom:12px">
        <div class="gpnl-title">各优化平台意图总数 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 每平台覆盖意图数量</span></div>
        <div v-html="intentPlatSummaryHtml || pendingHtml('加载中...')"></div>
      </div>

      <!-- 意图列表 -->
      <div class="geo-panel" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div class="gpnl-title" style="margin:0">GEO 意图列表 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 共 <strong>{{ qCount ?? '--' }}</strong> 个意图 · 按模型展示可见性</span></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
            <!-- 可见性过滤 -->
            <div style="display:inline-flex;gap:4px;flex-wrap:wrap">
              <button
                v-for="f in visibilityFilters" :key="f.key"
                :style="visibilityFilter === f.key ? 'padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid #3f78c5;background:#3f78c5;color:#fff;cursor:pointer;font-weight:500;transition:all .15s' : 'padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid #d1d5db;background:#fff;color:#6b7280;cursor:pointer;font-weight:500;transition:all .15s'"
                @click="setVisibilityFilter(f.key)"
              >{{ f.label }}</button>
            </div>
            <!-- 平台过滤 -->
            <div style="display:inline-flex;gap:4px;flex-wrap:wrap">
              <button
                v-for="p in intentPlatFilters" :key="p.key"
                :style="intentPlatform === p.key ? `padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid ${p.color};background:${p.color};color:#fff;cursor:pointer;font-weight:500;transition:all .15s` : `padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid #d1d5db;background:#fff;color:#6b7280;cursor:pointer;font-weight:500;transition:all .15s`"
                @click="setIntentModel(p.key)"
              >{{ p.label }}</button>
            </div>
          </div>
        </div>
        <div class="geo-scroll-wrap" style="max-height:600px" v-html="questionsTableHtml || pendingHtml('加载中...')"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const GEO_PROJECT_ID = 143
const PENDING = '待接口提供数据'
const geoPlatNames = { doubao:'豆包', deepseek:'DeepSeek', yuanbao:'元宝', kimi:'Kimi' }
const geoPlatColors = { doubao:'#3f78c5', deepseek:'#3f9ead', yuanbao:'#58a86a', kimi:'#c89532' }

const GEO_INTENT_FIELD_KEYS = ['lenovo_brand_visibility','official_visibility','leai_visibility','competitor_visibility']
const GEO_FIELD_LABELS = {
  lenovo_brand_visibility:'联想品牌可见性',
  official_visibility:'联想官网可见性',
  leai_visibility:'联想乐享可见',
  competitor_visibility:'竞品可见'
}

const visibilityFilters = [
  { key:'all', label:'全部展示' },
  { key:'lenovo_brand_visibility', label:'联想品牌可见' },
  { key:'official_visibility', label:'联想官网可见' },
  { key:'leai_visibility', label:'联想乐享可见' },
  { key:'competitor_visibility', label:'竞品可见' },
]

const visibilityFilter = ref('all')
const intentPlatform = ref('all')
const qCount = ref(null)
const questionsTableHtml = ref('')
const intentPlatSummaryHtml = ref('')
const intentPlatFilters = ref([{ key:'all', label:'全平台', color:'#3f78c5' }])

let _questionsData = []

function pendingHtml(msg) {
  return `<div class="geo-pending"><div class="geo-pending-title">${msg || PENDING}</div></div>`
}
function geoEsc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

function geoIntentDerivedValue(modelData, key) {
  const fields = modelData?.fields || []
  const get = f => fields.find(x => x.field===f)?.value
  const official = get('brand_composite_exposure_rate')
  const leai = get('brand_precise_exposure_rate')
  const competitor = get('competitor_exposure_rate')
  if (key==='official_visibility') return official
  if (key==='leai_visibility') return leai
  if (key==='competitor_visibility') return competitor
  if (key==='lenovo_brand_visibility') return official==='是'||leai==='是' ? '是' : (official==='否'&&leai==='否' ? '否' : '-')
  return '-'
}

function questionHasVis(q, fieldKey, models) {
  const targetModels = models?.length ? models : (q.models||[]).map(m=>m.model)
  return targetModels.some(m => {
    const md = (q.models||[]).find(x=>x.model===m)
    return geoIntentDerivedValue(md, fieldKey) === '是'
  })
}

function filterByScope(qs, models) {
  return (qs||[]).filter(q => questionHasVis(q, 'lenovo_brand_visibility', models))
}

function filterByVisibility(qs, models) {
  if (visibilityFilter.value==='all') return qs||[]
  return (qs||[]).filter(q => questionHasVis(q, visibilityFilter.value, models))
}

function renderQuestions(qs) {
  if (!qs.length) { qCount.value = null; questionsTableHtml.value = pendingHtml(); return }
  const allModels = (qs[0].models||[]).map(m=>m.model)
  const models = intentPlatform.value && intentPlatform.value !== 'all' ? allModels.filter(m=>m===intentPlatform.value) : allModels

  // 更新平台筛选按钮
  intentPlatFilters.value = [{ key:'all', label:'全平台', color:'#3f78c5' }].concat(allModels.map(m => ({ key:m, label:geoPlatNames[m]||m, color:geoPlatColors[m]||'#6b7280' })))

  const scoped = filterByScope(qs, models)
  const rows = filterByVisibility(scoped, models)
  qCount.value = rows.length || null
  if (!rows.length) { questionsTableHtml.value = pendingHtml(); return }

  let html = '<table class="geo-intent-table" style="width:100%"><thead><tr><th style="text-align:left;min-width:180px">意图</th>'
  models.forEach(m => {
    const name = geoPlatNames[m]||m
    GEO_INTENT_FIELD_KEYS.forEach(f => { html += `<th>${geoEsc(name)}<br><span style="font-size:10px;font-weight:400">${geoEsc(GEO_FIELD_LABELS[f]||f)}</span></th>` })
  })
  html += '</tr></thead><tbody>'
  rows.forEach(q => {
    const questionText = q.question||''
    html += `<tr><td class="name" title="${geoEsc(questionText)}">${geoEsc(questionText.length>20?questionText.slice(0,20)+'...':questionText)}</td>`
    models.forEach(m => {
      const md = (q.models||[]).find(x=>x.model===m)
      GEO_INTENT_FIELD_KEYS.forEach(f => {
        const v = geoIntentDerivedValue(md, f)
        const cls = v==='是' ? 'yes' : (v==='否' ? 'no' : '')
        html += `<td class="${cls}"><span class="geo-yn-badge ${cls}">${geoEsc(v||'-')}</span></td>`
      })
    })
    html += '</tr>'
  })
  html += '</tbody></table>'
  questionsTableHtml.value = html
}

function renderIntentPlatSummary(qs) {
  if (!qs.length) { intentPlatSummaryHtml.value = pendingHtml(); return }
  const allModels = (qs[0].models||[]).map(m=>m.model)
  const totalCount = filterByScope(qs, allModels).length
  if (!totalCount) { intentPlatSummaryHtml.value = pendingHtml(); return }
  let html = '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:8px 0">'
  html += `<div style="flex:1;min-width:140px;padding:16px;background:#f0f7ff;border-radius:10px;text-align:center;border:1px solid #dbeafe"><div style="font-size:28px;font-weight:700;color:#1e40af">${totalCount}</div><div style="font-size:12px;color:#6b7280;margin-top:4px">优化意图总数</div></div>`
  allModels.forEach(m => {
    const count = filterByScope(qs, [m]).length
    const color = geoPlatColors[m]||'#6b7280'
    html += `<div style="flex:1;min-width:140px;padding:16px;background:#fff;border-radius:10px;text-align:center;border:1px solid #e5e8ec"><div style="font-size:28px;font-weight:700;color:${color}">${count}</div><div style="font-size:12px;color:#6b7280;margin-top:4px">${geoPlatNames[m]||m} 覆盖意图数</div></div>`
  })
  html += '</div>'
  intentPlatSummaryHtml.value = html
}

async function loadData() {
  questionsTableHtml.value = pendingHtml('加载中...')
  intentPlatSummaryHtml.value = pendingHtml('加载中...')
  try {
    const end = new Date(); end.setDate(end.getDate()-1)
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const resp = await fetch('/api/geo-dashboard/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ project_id: GEO_PROJECT_ID, date: fmt(end) }) })
    const json = await resp.json()
    if (json.code !== 200) { _questionsData = []; renderQuestions([]); renderIntentPlatSummary([]); return }
    _questionsData = json.data?.questions || []
    renderIntentPlatSummary(_questionsData)
    renderQuestions(_questionsData)
  } catch(e) { console.error('geoLoadQuestions', e); renderQuestions([]); renderIntentPlatSummary([]) }
}

function setIntentModel(model) {
  intentPlatform.value = model||'all'
  renderQuestions(_questionsData)
}
function setVisibilityFilter(filter) {
  visibilityFilter.value = filter||'all'
  renderQuestions(_questionsData)
}

onMounted(loadData)
</script>
