<template>
  <section class="legacy-page-shell">
    <div class="page-header">
      <div>
        <div class="page-title">{{ page.title }}</div>
        <div class="page-desc">{{ page.desc }}</div>
      </div>
      <div class="filter-bar">
        <button
          v-for="item in page.filters"
          :key="item"
          type="button"
          class="btn btn-sm"
          :class="item === page.filters[0] ? 'btn-primary' : 'btn-secondary'"
        >
          {{ item }}
        </button>
      </div>
    </div>

    <div class="grid-4 legacy-kpi-grid">
      <div
        v-for="(metric, index) in page.metrics"
        :key="metric.label"
        class="ops-kpi"
        :class="{ highlight: index === 0 }"
      >
        <div class="ops-kpi-label">{{ metric.label }}</div>
        <div class="ops-kpi-val">{{ metric.value }}</div>
        <div class="ops-kpi-sub">{{ metric.sub }}</div>
      </div>
    </div>

    <div class="ops-section-title">{{ page.sectionTitle }}</div>

    <div class="grid-2 legacy-chart-grid">
      <div class="ops-card">
        <div class="ops-card-head">
          <h3>{{ page.charts[0]?.title }}</h3>
          <button type="button" class="btn btn-secondary btn-sm">AI 解读</button>
        </div>
        <div class="legacy-chart-bars" aria-hidden="true">
          <span
            v-for="(bar, index) in page.charts[0]?.bars"
            :key="index"
            :style="{ height: `${bar}%` }"
          ></span>
        </div>
        <div class="legacy-chart-axis">
          <span v-for="label in page.axis" :key="label">{{ label }}</span>
        </div>
      </div>

      <div class="ops-card">
        <div class="ops-card-head">
          <h3>{{ page.charts[1]?.title }}</h3>
          <button type="button" class="btn btn-secondary btn-sm">导出</button>
        </div>
        <div class="legacy-chart-lines" aria-hidden="true">
          <div
            v-for="(point, index) in page.charts[1]?.points"
            :key="index"
            :style="{ left: `${index * 16 + 6}%`, bottom: `${point}%` }"
          ></div>
        </div>
        <div class="legacy-chart-axis">
          <span v-for="label in page.axis" :key="label">{{ label }}</span>
        </div>
      </div>
    </div>

    <div class="ops-card">
      <div class="ops-card-head">
        <h3>{{ page.tableTitle }}</h3>
        <div class="filter-bar">
          <input class="form-input legacy-search-input" :placeholder="page.searchPlaceholder" />
          <button type="button" class="btn btn-secondary btn-sm">筛选</button>
          <button type="button" class="btn btn-secondary btn-sm">刷新</button>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="head in page.columns" :key="head">{{ head }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in page.rows" :key="row[0]">
              <td v-for="(cell, index) in row" :key="`${row[0]}-${index}`">
                <span v-if="index === row.length - 1" class="status-pill" :class="statusClass(cell)">{{ cell }}</span>
                <span v-else>{{ cell }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()

const DEFAULT_AXIS = ['06-24', '06-25', '06-26', '06-27', '06-28']

const PAGE_CONFIG = {
  'dashboard.overview': {
    title: '运营总览',
    desc: '聚合乐享运营核心经营指标，支持多维度数据拆解与趋势对比',
    sectionTitle: '核心经营概览',
    filters: ['近7天', '近14天', '近30天', '自定义'],
    metrics: [
      ['访问用户', '128.6万', '较上期 +8.4%'],
      ['活跃会员', '42.3万', '登录转化 32.9%'],
      ['运营任务', '186', '待处理 12'],
      ['异常预警', '7', '高优先级 2']
    ],
    charts: ['活跃趋势', '业务模块分布'],
    tableTitle: '运营事项列表',
    searchPlaceholder: '搜索业务模块或负责人',
    columns: ['模块', '负责人', '今日数据', '变化', '状态'],
    rows: [
      ['会员运营', '乐享运营组', '42.3万', '+6.8%', '正常'],
      ['内容分发', '内容运营组', '18.9万', '+3.1%', '正常'],
      ['活动承接', '增长组', '8.6万', '-1.4%', '关注']
    ]
  },
  'pipeline.annotate': {
    title: 'Query 分析',
    desc: '用户查询、意图识别、命中率与标注闭环分析',
    sectionTitle: 'Query 质量概览',
    filters: ['今日', '近7天', '近30天', '未命中'],
    metrics: [
      ['Query 总量', '86,420', '主动 query 口径'],
      ['意图命中率', '91.6%', '较上期 +2.2%'],
      ['待标注', '328', '高频未命中 64'],
      ['知识召回率', '87.3%', '核心场景']
    ],
    charts: ['Query 趋势', '意图分布'],
    tableTitle: '高频 Query 样本',
    searchPlaceholder: '搜索 query / 意图 / 来源',
    columns: ['Query', '意图', '来源', '次数', '状态'],
    rows: [
      ['售后网点怎么查', '服务网点', '乐享原生', '2,184', '正常'],
      ['ThinkPad 保修政策', '保修查询', 'AI 助手', '1,465', '正常'],
      ['企业采购报价', '商机线索', '搜索入口', '806', '关注']
    ]
  },
  'pipeline.quality': {
    title: '质量分析',
    desc: '服务满意度 · 性能 · 对话质量 · 异常监控 · 用户评分',
    sectionTitle: '质量指标分层',
    filters: ['T-1', '近7天', '近30天', '清除'],
    metrics: [
      ['点踩率', '1.42%', '点踩 case / 主动 query'],
      ['低满意率', '3.8%', '弹窗样本口径'],
      ['首 token P95', '2.6s', '问答类正文'],
      ['异常占比', '0.31%', '异常 case / 总 case']
    ],
    charts: ['Badcase 总数概况', '点踩率 + 低满意率'],
    tableTitle: '质量问题样本',
    searchPlaceholder: '搜索问题、场景或 Agent',
    columns: ['场景', '问题类型', '样本量', '影响', '状态'],
    rows: [
      ['售后咨询', '答案不完整', '126', '中', '关注'],
      ['商品推荐', '召回偏弱', '84', '低', '处理中'],
      ['保修查询', '工具超时', '31', '高', '异常']
    ]
  },
  'ops.traffic': {
    title: '流量分析',
    desc: '核心活跃趋势 · 监测入口 · 分端口 · 分业务',
    sectionTitle: '核心流量指标',
    filters: ['1日', '7日', '14日', '30日'],
    metrics: [
      ['DAU', '31.8万', '日均登录 18.4万'],
      ['MAU', '129.5万', '月活用户'],
      ['互动用户', '9.6万', '互动 / 登录 52.1%'],
      ['访问入口', '16', '重点入口监测']
    ],
    charts: ['DAU / 登录 / 互动趋势', '入口流量分布'],
    tableTitle: '入口流量明细',
    searchPlaceholder: '搜索入口、端口或业务',
    columns: ['入口', 'PV', 'UV', '登录', '状态'],
    rows: [
      ['App 首页', '186.2万', '38.4万', '21.6万', '正常'],
      ['服务频道', '74.1万', '16.8万', '9.3万', '正常'],
      ['活动页', '32.7万', '8.1万', '3.9万', '关注']
    ]
  },
  'ops.gmv': {
    title: 'GMV 分析',
    desc: '交易规模、购买人数、客单价与业务模块贡献',
    sectionTitle: '交易指标',
    filters: ['1日', '7日', '14日', '30日'],
    metrics: [
      ['GMV', '¥8,642万', '较上期 +12.4%'],
      ['购买人数', '48,216', '转化率 3.8%'],
      ['客单价', '¥1,792', '较上期 +4.2%'],
      ['非官网占比', '27.6%', '平台回算口径']
    ],
    charts: ['GMV 趋势', '业务 GMV 分布'],
    tableTitle: '业务交易明细',
    searchPlaceholder: '搜索业务、渠道或商品线',
    columns: ['业务', 'GMV', '购买人数', '占比', '状态'],
    rows: [
      ['消费商品', '¥4,186万', '25,306', '48.4%', '正常'],
      ['SMB 商品', '¥2,742万', '14,882', '31.7%', '正常'],
      ['政企商品', '¥1,714万', '8,028', '19.9%', '关注']
    ]
  },
  'dashboard.geo': {
    title: 'GEO · 整体数据概览',
    desc: 'AI 搜索可见度、信源、意图与转化的整体监测',
    sectionTitle: 'GEO 概览',
    filters: ['近7天', '近30天', '品牌词', '品类词'],
    metrics: [
      ['品牌可见度', '76.8%', '核心平台平均'],
      ['有效信源', '1,286', '新增 42'],
      ['意图覆盖', '89.2%', '关键意图'],
      ['转化线索', '3,416', '较上期 +9.3%']
    ],
    charts: ['平台可见度趋势', '信源结构'],
    tableTitle: '平台 GEO 明细',
    searchPlaceholder: '搜索平台、关键词或信源',
    columns: ['平台', '可见度', '信源数', '转化线索', '状态'],
    rows: [
      ['豆包', '82.4%', '326', '928', '正常'],
      ['Kimi', '74.8%', '284', '816', '正常'],
      ['通义', '69.5%', '221', '642', '关注']
    ]
  },
  'dashboard.geoSource': {
    title: 'GEO · 各平台信源分布',
    desc: '按平台查看可抓取信源、引用频次与内容质量',
    sectionTitle: '信源分布',
    filters: ['全部平台', '官方', '媒体', '社区'],
    metrics: [
      ['信源总数', '1,286', '有效信源'],
      ['官方占比', '38.2%', '官网 / 乐享'],
      ['媒体占比', '24.6%', '评测与资讯'],
      ['社区占比', '19.8%', '问答与论坛']
    ],
    charts: ['信源趋势', '平台引用占比'],
    tableTitle: '信源列表',
    searchPlaceholder: '搜索信源、平台或类型',
    columns: ['信源', '类型', '平台', '引用次数', '状态'],
    rows: [
      ['lenovo.com.cn', '官方', '多平台', '18,642', '正常'],
      ['乐享服务知识库', '官方', '豆包', '9,816', '正常'],
      ['产品评测文章', '媒体', 'Kimi', '4,216', '关注']
    ]
  },
  'dashboard.geoIntent': {
    title: 'GEO · 各平台意图分布',
    desc: '不同平台下用户意图、品牌露出和回答路径对比',
    sectionTitle: '意图分布',
    filters: ['购买', '服务', '对比', '知识'],
    metrics: [
      ['购买意图', '36.4%', '较上期 +5.2%'],
      ['服务意图', '28.1%', '保修 / 网点'],
      ['对比意图', '17.6%', '竞品对比'],
      ['知识意图', '12.8%', '参数 / 政策']
    ],
    charts: ['意图趋势', '平台意图占比'],
    tableTitle: '意图样本',
    searchPlaceholder: '搜索意图或关键词',
    columns: ['意图', '代表 Query', '平台', '样本量', '状态'],
    rows: [
      ['购买咨询', 'ThinkPad 哪款适合办公', '豆包', '3,286', '正常'],
      ['售后服务', '联想售后电话', 'Kimi', '2,104', '正常'],
      ['竞品对比', '联想和戴尔怎么选', '通义', '816', '关注']
    ]
  },
  'dashboard.geoConversion': {
    title: 'GEO · 转化看板',
    desc: 'AI 搜索引导至官网、线索、购买和服务路径的转化分析',
    sectionTitle: '转化链路',
    filters: ['官网', '非官网', '消费', 'SMB'],
    metrics: [
      ['总转化', '3,416', '线索 + 交易'],
      ['官网承接', '61.2%', '官方路径'],
      ['线索转化', '1,284', '企业客户'],
      ['GMV 贡献', '¥426万', '估算口径']
    ],
    charts: ['转化趋势', '业务转化分布'],
    tableTitle: '转化明细',
    searchPlaceholder: '搜索平台、业务或路径',
    columns: ['路径', '平台', '线索', 'GMV', '状态'],
    rows: [
      ['AI 搜索到官网', '豆包', '486', '¥168万', '正常'],
      ['AI 搜索到服务页', 'Kimi', '326', '¥92万', '正常'],
      ['AI 搜索到电商页', '通义', '214', '¥64万', '关注']
    ]
  },
  'dashboard.geoKnowledge': {
    title: 'GEO · 手工上传知识',
    desc: '上传文档或手动添加 QA 对，补充 AI 搜索引擎可抓取的知识内容',
    sectionTitle: '知识维护',
    filters: ['全部', '待审核', '已发布', '需优化'],
    metrics: [
      ['知识条目', '2,184', '已发布 1,946'],
      ['待审核', '38', '本周新增'],
      ['引用次数', '18,426', '近30天'],
      ['需优化', '24', '低命中条目']
    ],
    charts: ['知识引用趋势', '知识类型分布'],
    tableTitle: '知识条目',
    searchPlaceholder: '搜索标题、标签或来源',
    columns: ['标题', '类型', '来源', '引用', '状态'],
    rows: [
      ['ThinkPad 保修政策', 'FAQ', '服务团队', '2,184', '正常'],
      ['企业采购流程', '文档', 'SMB 团队', '1,426', '正常'],
      ['新品参数补充', '表格', '产品团队', '326', '处理中']
    ]
  }
}

const FALLBACK_CONFIG = {
  title: '业务页面',
  desc: '按导航目录展示原项目风格的页面内容骨架',
  sectionTitle: '业务概览',
  filters: ['全部', '待处理', '已完成', '异常'],
  metrics: [
    ['总量', '12,486', '较上期 +6.2%'],
    ['待处理', '328', '今日新增 42'],
    ['已完成', '11,902', '完成率 95.3%'],
    ['异常', '18', '需关注 4']
  ],
  charts: ['趋势概览', '结构分布'],
  tableTitle: '业务明细',
  searchPlaceholder: '搜索名称、状态或负责人',
  columns: ['名称', '类型', '负责人', '数据', '状态'],
  rows: [
    ['核心业务项', '运营', '平台团队', '2,184', '正常'],
    ['待处理事项', '流程', '业务团队', '328', '处理中'],
    ['异常样本', '监控', '风控团队', '18', '关注']
  ]
}

const PAGE_OVERRIDES = {
  'lead.dashboard': ['线索看板', '企业客户线索来源、阶段、转化和负责人跟进概览'],
  'lead.pool': ['线索池', '线索列表、分配规则与跟进进展管理'],
  'lead.score': ['打分模型', '企业客户线索评分、规则权重和模型效果监测'],
  'agent.skills': ['Skill Hub', 'Skill 提交、审批、测试、启停和发布状态管理'],
  'agent.skillCreate': ['创建 Skill', '从业务场景定义新能力、参数、输入输出和审批规则'],
  'agent.permissions': ['权限管理', '菜单权限、Skill 权限和角色范围管理']
}

const pageId = computed(() => route.meta?.pageId || 'dashboard.overview')

const page = computed(() => {
  const base = PAGE_CONFIG[pageId.value] || makeFallbackPage(pageId.value)
  return {
    ...base,
    axis: DEFAULT_AXIS,
    metrics: normalizeMetrics(base.metrics),
    charts: normalizeCharts(base.charts)
  }
})

onMounted(() => {
  appStore.ensureStaticTab(pageId.value)
  appStore.setActiveStaticTab(pageId.value)
})

function makeFallbackPage(id) {
  const [title, desc] = PAGE_OVERRIDES[id] || FALLBACK_CONFIG.title
  const group = id.split('.')[0]
  const domainRows = {
    lead: [
      ['联想企业采购', '高意向', '李想', '92分', '正常'],
      ['教育行业客户', '跟进中', '王宁', '84分', '处理中'],
      ['制造业客户', '待分配', '赵敏', '76分', '关注']
    ],
    agent: [
      ['商品配置 Skill', '运营能力', 'PM 团队', '已启用', '正常'],
      ['报告生成 Skill', '分析能力', '数据团队', '测试中', '处理中'],
      ['知识维护 Skill', '知识能力', '内容团队', '待审批', '关注']
    ]
  }
  return {
    ...FALLBACK_CONFIG,
    title,
    desc,
    rows: domainRows[group] || FALLBACK_CONFIG.rows,
    charts: [`${title}趋势`, `${title}结构`]
  }
}

function normalizeMetrics(metrics) {
  return metrics.map(([label, value, sub]) => ({ label, value, sub }))
}

function normalizeCharts(charts) {
  const bars = [42, 58, 46, 72, 64, 82]
  const points = [28, 42, 36, 62, 54, 76]
  return charts.map((title, index) => ({
    title,
    bars: bars.map(v => Math.max(20, v - index * 6)),
    points: points.map(v => Math.max(18, v - index * 4))
  }))
}

function statusClass(text) {
  if (text === '正常') return 'success'
  if (text === '异常') return 'danger'
  if (text === '处理中') return 'primary'
  if (text === '关注') return 'warning'
  return 'muted'
}
</script>

<style scoped>
.legacy-page-shell {
  min-width: 0;
}

.legacy-kpi-grid {
  margin-top: 16px;
}

.legacy-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.legacy-chart-bars,
.legacy-chart-lines {
  position: relative;
  height: 220px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background:
    linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px) 0 0 / 100% 25%,
    var(--bg);
  overflow: hidden;
}

.legacy-chart-bars {
  display: flex;
  align-items: end;
  gap: 8px;
  padding: 18px 20px;
}

.legacy-chart-bars span {
  flex: 1;
  min-width: 18px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, #5b8cff, #2f6df6);
  box-shadow: 0 8px 18px rgba(47, 109, 246, 0.16);
}

.legacy-chart-lines::before {
  content: "";
  position: absolute;
  inset: 34px 24px 44px;
  border-bottom: 2px solid rgba(47, 109, 246, 0.3);
  transform: skewY(-8deg);
}

.legacy-chart-lines div {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #2f6df6;
  box-shadow: 0 0 0 4px rgba(47, 109, 246, 0.12);
}

.legacy-chart-axis {
  display: flex;
  justify-content: space-between;
  padding: 8px 4px 0;
  color: var(--text-tertiary);
  font-size: 11px;
}

.legacy-search-input {
  width: 220px;
  height: 30px;
}

@media (max-width: 1180px) {
  .legacy-chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
