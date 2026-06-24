<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">Query 分析</div>
        <div class="page-desc">智能体交互数据深度分析</div>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);">
      <div class="kpi-card">
        <div class="kpi-label">Query 总数</div>
        <div class="kpi-value" style="font-size:22px">{{ kpi.total }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">今日 Query</div>
        <div class="kpi-value" style="font-size:22px">{{ kpi.today }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">总对话数</div>
        <div class="kpi-value" style="font-size:22px">{{ kpi.convs }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">好评数</div>
        <div class="kpi-value" style="font-size:22px;color:var(--green)">{{ kpi.likes }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">差评数</div>
        <div class="kpi-value" style="font-size:22px;color:var(--red)">{{ kpi.dislikes }}</div>
      </div>
    </div>

    <!-- 趋势 + TOP10 -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">7日 Query 趋势</div></div>
        <div style="display:flex;align-items:flex-end;gap:12px;height:140px;padding-top:10px">
          <template v-if="trend.length">
            <div
              v-for="t in trend"
              :key="t.day"
              style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"
            >
              <span style="font-size:12px;font-weight:600">{{ t.n }}</span>
              <div
                :style="{
                  width:'100%',
                  maxWidth:'40px',
                  height: trendBarHeight(t.n) + 'px',
                  background:'var(--primary)',
                  borderRadius:'4px 4px 0 0',
                  minHeight:'4px'
                }"
              ></div>
              <span style="font-size:11px;color:var(--text-tertiary)">{{ t.day.slice(5) }}</span>
            </div>
          </template>
          <div v-else style="text-align:center;width:100%;color:var(--text-tertiary)">暂无数据</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">热门 Query TOP10</div></div>
        <div v-if="topQueries.length">
          <table>
            <tr><th>Query</th><th>频次</th></tr>
            <tr v-for="q in topQueries" :key="q.content">
              <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ q.content }}</td>
              <td>{{ q.freq }}</td>
            </tr>
          </table>
        </div>
        <div v-else style="text-align:center;padding:10px;color:var(--text-tertiary)">暂无数据</div>
      </div>
    </div>

    <!-- 差评 Query -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">差评 Query</div>
        <button class="btn btn-sm btn-primary" @click="goKnowledge">去补充知识</button>
      </div>
      <div v-if="badQueries.length">
        <table>
          <tr><th>Query</th><th>时间</th></tr>
          <tr v-for="q in badQueries" :key="q.content + q.created_at">
            <td>{{ q.content || '-' }}</td>
            <td>{{ (q.created_at || '').slice(0, 10) }}</td>
          </tr>
        </table>
      </div>
      <div v-else-if="loaded" style="text-align:center;padding:10px;color:var(--green)">暂无差评</div>
      <div v-else style="text-align:center;padding:20px;color:var(--text-tertiary)">加载中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const kpi = reactive({ total: '-', today: '-', convs: '-', likes: '-', dislikes: '-' })
const trend = ref([])
const topQueries = ref([])
const badQueries = ref([])
const loaded = ref(false)

function trendBarHeight(n) {
  const max = Math.max(...trend.value.map(t => t.n), 1)
  return Math.max(n / max * 100, 4)
}

function goKnowledge() {
  router.push('/content/knowledge')
}

async function loadQueryAnalysis() {
  try {
    const res = await fetch('/api/admin/query-analysis')
    const data = await res.json()
    kpi.total = (data.totalQueries || 0).toLocaleString()
    kpi.today = (data.todayQueries || 0).toLocaleString()
    kpi.convs = (data.totalConvs || 0).toLocaleString()
    kpi.likes = (data.likes || 0).toLocaleString()
    kpi.dislikes = (data.dislikes || 0).toLocaleString()
    trend.value = data.trend || []
    topQueries.value = data.topQueries || []
    badQueries.value = data.badQueries || []
  } catch (e) {
    console.error('[DashboardQuery]', e.message)
  } finally {
    loaded.value = true
  }
}

onMounted(() => {
  loadQueryAnalysis()
})
</script>
