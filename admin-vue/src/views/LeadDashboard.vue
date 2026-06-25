<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">线索看板</div>
        <div class="page-desc">企业客户管理 · 漏斗转化、线索质量与销售团队业绩</div>
      </div>
      <!-- 角色切换 -->
      <div class="lead-seg">
        <button class="lead-seg-btn" :class="{ active: role === 'ops' }" @click="setRole('ops')">运营视图</button>
        <button class="lead-seg-btn" :class="{ active: role === 'leader' }" @click="setRole('leader')">Leader视图</button>
        <button class="lead-seg-btn" :class="{ active: role === 'sales' }" @click="setRole('sales')">Sales视图</button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="card lead-tab-wrap">
      <div class="lead-tabs">
        <div v-if="role === 'ops'" class="tab-item" :class="{ active: kbTab === 'funnel' }" @click="kbTab = 'funnel'">整体看板</div>
        <div v-if="role === 'ops'" class="tab-item" :class="{ active: kbTab === 'quality' }" @click="kbTab = 'quality'">线索质量看板</div>
        <div class="tab-item" :class="{ active: kbTab === 'team' }" @click="kbTab = 'team'">销售团队漏斗</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="lead-filter card">
      <template v-if="kbTab === 'quality'">
        <select class="ops-select" style="width:104px" title="时间周期" v-model="kbTab2Period">
          <option v-for="[v,t] in periods" :key="v" :value="v">{{ t }}</option>
        </select>
        <input type="date" class="ops-select lead-date" title="开始日期" v-model="kbTab2From" />
        <span class="filter-separator">至</span>
        <input type="date" class="ops-select lead-date" title="结束日期" v-model="kbTab2To" />
        <label class="lead-ck"><input type="checkbox" v-model="kbTab2Yoy" />同比</label>
        <label class="lead-ck"><input type="checkbox" v-model="kbTab2Mom" />环比</label>
        <button class="btn btn-sm btn-secondary" @click="exportQuality">⬇ 导出数据</button>
      </template>
      <template v-else>
        <select class="ops-select" style="width:104px" title="时间周期" v-model="kbPeriod">
          <option v-for="[v,t] in periods" :key="v" :value="v">{{ t }}</option>
        </select>
        <input type="date" class="ops-select lead-date" title="开始日期" v-model="kbMainFrom" />
        <span class="filter-separator">至</span>
        <input type="date" class="ops-select lead-date" title="结束日期" v-model="kbMainTo" />
        <template v-if="kbTab === 'funnel'">
          <label class="lead-ck"><input type="checkbox" v-model="kbYoy" />同比</label>
          <label class="lead-ck"><input type="checkbox" v-model="kbMom" />环比</label>
        </template>
        <template v-if="role === 'ops'">
          <!-- 多选：销售团队 -->
          <div class="lead-ms" :class="{ open: msOpen === 'team' }">
            <div class="lead-ms-trig" @click.stop="toggleMs('team')">
              <span class="lead-ms-text" :class="{ ph: !kbTeamSel.length }">{{ kbTeamSel.length ? kbTeamSel.map(v => TEAM_OPTS.find(o=>o.value===v)?.label).join('、') : '销售团队' }}</span>
            </div>
            <div class="lead-ms-panel">
              <label class="lead-ms-opt" v-for="o in TEAM_OPTS" :key="o.value">
                <input type="checkbox" :value="o.value" v-model="kbTeamSel" @change="renderKbChart" />{{ o.label }}
              </label>
            </div>
          </div>
          <template v-if="kbTab === 'funnel' || kbTab === 'team'">
            <!-- 多选：销售个人 -->
            <div class="lead-ms" :class="{ open: msOpen === 'person' }">
              <div class="lead-ms-trig" @click.stop="toggleMs('person')">
                <span class="lead-ms-text" :class="{ ph: !kbPersonSel.length }">{{ kbPersonSel.length ? kbPersonSel.join('、') : (kbTab==='team'?'销售itcode':'销售个人') }}</span>
              </div>
              <div class="lead-ms-panel">
                <label class="lead-ms-opt" v-for="p in PERSON_OPTS" :key="p">
                  <input type="checkbox" :value="p" v-model="kbPersonSel" @change="renderKbChart" />{{ p }}
                </label>
              </div>
            </div>
          </template>
          <template v-if="kbTab === 'funnel'">
            <!-- 多选：产品组 -->
            <div class="lead-ms" :class="{ open: msOpen === 'product' }">
              <div class="lead-ms-trig" @click.stop="toggleMs('product')">
                <span class="lead-ms-text" :class="{ ph: !kbProductSel.length }">{{ kbProductSel.length ? kbProductSel.join('、') : '产品组' }}</span>
              </div>
              <div class="lead-ms-panel">
                <label class="lead-ms-opt" v-for="p in PRODUCT_OPTS" :key="p">
                  <input type="checkbox" :value="p" v-model="kbProductSel" @change="renderKbChart" />{{ p }}
                </label>
              </div>
            </div>
          </template>
          <!-- 多选：线索来源 -->
          <div class="lead-ms" :class="{ open: msOpen === 'source' }">
            <div class="lead-ms-trig" @click.stop="toggleMs('source')">
              <span class="lead-ms-text" :class="{ ph: !kbSourceSel.length }">{{ kbSourceSel.length ? kbSourceSel.map(v=>KB_SOURCE_FILTER_OPTIONS.find(o=>o.value===v)?.label).join('、') : '线索来源' }}</span>
            </div>
            <div class="lead-ms-panel">
              <label class="lead-ms-opt" v-for="o in KB_SOURCE_FILTER_OPTIONS" :key="o.value">
                <input type="checkbox" :value="o.value" v-model="kbSourceSel" @change="renderKbChart" />{{ o.label }}
              </label>
            </div>
          </div>
        </template>
        <template v-else-if="role === 'leader'">
          <div class="lead-ms" :class="{ open: msOpen === 'person' }">
            <div class="lead-ms-trig" @click.stop="toggleMs('person')">
              <span class="lead-ms-text" :class="{ ph: !kbPersonSel.length }">{{ kbPersonSel.length ? kbPersonSel.join('、') : '销售itcode' }}</span>
            </div>
            <div class="lead-ms-panel">
              <label class="lead-ms-opt" v-for="p in PERSON_OPTS" :key="p">
                <input type="checkbox" :value="p" v-model="kbPersonSel" @change="renderKbChart" />{{ p }}
              </label>
            </div>
          </div>
          <div class="lead-ms" :class="{ open: msOpen === 'source' }">
            <div class="lead-ms-trig" @click.stop="toggleMs('source')">
              <span class="lead-ms-text" :class="{ ph: !kbSourceSel.length }">{{ kbSourceSel.length ? kbSourceSel.map(v=>KB_SOURCE_FILTER_OPTIONS.find(o=>o.value===v)?.label).join('、') : '线索来源' }}</span>
            </div>
            <div class="lead-ms-panel">
              <label class="lead-ms-opt" v-for="o in KB_SOURCE_FILTER_OPTIONS" :key="o.value">
                <input type="checkbox" :value="o.value" v-model="kbSourceSel" @change="renderKbChart" />{{ o.label }}
              </label>
            </div>
          </div>
          <span class="lead-fl" style="color:var(--text-tertiary)">数据范围：Leader 团队（北京IS）</span>
        </template>
        <template v-else>
          <span class="lead-ro-box">销售itcode：z001（本人）</span>
          <div class="lead-ms" :class="{ open: msOpen === 'source' }">
            <div class="lead-ms-trig" @click.stop="toggleMs('source')">
              <span class="lead-ms-text" :class="{ ph: !kbSourceSel.length }">{{ kbSourceSel.length ? kbSourceSel.map(v=>KB_SOURCE_FILTER_OPTIONS.find(o=>o.value===v)?.label).join('、') : '线索来源' }}</span>
            </div>
            <div class="lead-ms-panel">
              <label class="lead-ms-opt" v-for="o in KB_SOURCE_FILTER_OPTIONS" :key="o.value">
                <input type="checkbox" :value="o.value" v-model="kbSourceSel" @change="renderKbChart" />{{ o.label }}
              </label>
            </div>
          </div>
          <span class="lead-fl" style="color:var(--text-tertiary)">数据范围：本人（北京IS）</span>
        </template>
        <button v-if="kbTab === 'funnel'" class="btn btn-sm btn-secondary" @click="exportFunnel">⬇ 导出数据</button>
      </template>
    </div>

    <!-- 整体看板面板 -->
    <template v-if="kbTab === 'funnel'">
      <div class="card">
        <div class="card-header">
          <div class="card-title">漏斗转化总览</div>
          <div style="display:flex;gap:8px">
            <span class="badge badge-blue">IQL→MQL {{ convRate(funnelCur.mql, funnelCur.iql) }}</span>
            <span class="badge badge-blue">MQL→SQL {{ convRate(funnelCur.sql, funnelCur.mql) }}</span>
            <span class="badge badge-blue">SQL→OPP {{ convRate(funnelCur.opp, funnelCur.sql) }}</span>
          </div>
        </div>
        <div id="lead-funnel-chart" style="height:280px"></div>
      </div>
      <div class="kpi-grid lead-kpi-grid">
        <div class="lead-kpi" v-for="c in KPI_CARDS" :key="c.key">
          <div class="lead-kpi-label">{{ c.label }}</div>
          <div class="lead-kpi-code">{{ c.code }}</div>
          <div class="lead-kpi-value">{{ c.isAmt ? fmtAmt(funnelCur[c.key]) : fmt(funnelCur[c.key]) }}</div>
          <div v-if="kbYoy || kbMom" class="lead-kpi-trend">
            <span v-if="kbYoy" class="lead-trend" :class="trendClass(funnelCur[c.key], KB_FUNNEL[kbPeriod].yoy[c.key])">同比 {{ trendPct(funnelCur[c.key], KB_FUNNEL[kbPeriod].yoy[c.key]) }}</span>
            <span v-if="kbMom" class="lead-trend" :class="trendClass(funnelCur[c.key], KB_FUNNEL[kbPeriod].mom[c.key])">环比 {{ trendPct(funnelCur[c.key], KB_FUNNEL[kbPeriod].mom[c.key]) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 线索质量看板面板 -->
    <template v-else-if="kbTab === 'quality'">
      <div class="card">
        <div class="card-header"><div class="card-title">退回原因分布（按数量降序）</div></div>
        <div id="lead-return-chart" style="height:380px"></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">线索评分分布</div></div>
        <div id="lead-score-chart" style="height:300px"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">分来源漏斗指标 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（合计行自动汇总）</span></div>
        </div>
        <div style="overflow-x:auto">
          <table class="lead-src-table">
            <thead>
              <tr>
                <th>线索来源</th>
                <th v-for="c in KB_SOURCE_COLS" :key="c">{{ c }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in sourceTableData" :key="ri" :class="{ 'lead-total': ri === sourceTableData.length - 1 }">
                <td style="text-align:left">{{ row[0] }}</td>
                <td v-for="(col, ci) in KB_SOURCE_COLS" :key="ci" style="text-align:right">
                  {{ typeof row[ci+1] === 'number' ? (col.includes('金额') || col.includes('GMV') ? fmtAmt(row[ci+1]) : row[ci+1].toLocaleString('zh-CN')) : row[ci+1] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 销售团队漏斗面板 -->
    <template v-else>
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap">
          <div class="card-title">销售团队漏斗 &amp; 指标明细 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（退回 = MQL − SQL − 跟进中，蓝色加粗）</span></div>
          <template v-if="role === 'leader'">
            <div style="margin-left:auto;display:flex;gap:8px">
              <button class="btn btn-sm btn-secondary" @click="openDataLogs">操作日志</button>
              <button class="btn btn-sm btn-primary" @click="openDataEdit">数据维护</button>
            </div>
          </template>
        </div>
        <div class="lead-two-col">
          <div id="lead-team-chart" style="height:420px"></div>
          <div style="overflow:auto;max-height:460px">
            <table class="lead-src-table">
              <thead>
                <tr>
                  <th style="text-align:left">指标名称</th>
                  <th v-if="showTotal" style="text-align:right;background:var(--primary-light);color:var(--primary)">合计</th>
                  <th v-if="showCD" style="text-align:right">成都IS</th>
                  <th v-if="showBJ" style="text-align:right">北京IS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in teamTableData" :key="r.metric">
                  <td style="text-align:left;font-weight:500">{{ r.metric }}</td>
                  <td v-if="showTotal" style="text-align:right;background:var(--primary-light);font-weight:600" :style="r.isCalc ? 'color:var(--primary)' : ''">{{ r.total != null ? r.total.toLocaleString('zh-CN') : '-' }}</td>
                  <td v-if="showCD" style="text-align:right" :style="r.isCalc ? 'color:var(--primary);font-weight:700' : ''">{{ r.chengdu != null ? r.chengdu.toLocaleString('zh-CN') : '-' }}</td>
                  <td v-if="showBJ" style="text-align:right" :style="r.isCalc ? 'color:var(--primary);font-weight:700' : ''">{{ r.beijing != null ? r.beijing.toLocaleString('zh-CN') : '-' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="role === 'sales'" style="font-size:12px;color:var(--text-tertiary);margin-top:8px">* 销售视图仅显示个人数据</div>
          </div>
        </div>
      </div>
    </template>

    <!-- 数据维护弹窗 -->
    <div v-if="showDataEdit" class="emp-detail-overlay" @click.self="showDataEdit = false">
      <div class="emp-detail-panel" style="width:min(580px,92vw)">
        <div class="card-header" style="padding:16px 20px">
          <span class="card-title">数据维护</span>
          <button class="btn btn-sm btn-secondary" @click="showDataEdit = false">关闭</button>
        </div>
        <div style="padding:16px 20px">
          <div class="lead-field">
            <label>销售团队</label>
            <div class="lead-field-c">
              <label class="lead-ck" style="margin-right:16px"><input type="radio" name="de-team" v-model="defTeam" value="chengdu" />成都IS</label>
              <label class="lead-ck"><input type="radio" name="de-team" v-model="defTeam" value="beijing" />北京IS</label>
            </div>
          </div>
          <div class="lead-field">
            <label>日期</label>
            <div class="lead-field-c"><input type="date" class="lead-inp" style="width:180px" v-model="defDay" /></div>
          </div>
          <div class="lead-field">
            <label>维护指标</label>
            <div class="lead-field-c" style="display:flex;flex-wrap:wrap;gap:4px">
              <label class="lead-ck" style="margin-right:12px" v-for="m in DE_METRICS" :key="m.key">
                <input type="checkbox" :value="m.key" v-model="defMetrics" />{{ m.label }}
              </label>
            </div>
          </div>
          <div v-if="defMetrics.length" style="border-top:1px solid var(--border-light);margin-top:10px;padding-top:10px">
            <div class="lead-pa-row" v-for="m in DE_METRICS.filter(m => defMetrics.includes(m.key))" :key="m.key">
              <span style="width:110px;font-size:13px;color:var(--text-secondary)">{{ m.label }}{{ m.unit ? '('+m.unit+')' : '' }}</span>
              <input class="lead-inp" type="number" placeholder="增量" v-model="defValues[m.key]" style="width:140px" />
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
            <button class="btn btn-sm btn-secondary" @click="showDataEdit = false">取消</button>
            <button class="btn btn-sm btn-primary" @click="confirmDataEdit">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作日志弹窗 -->
    <div v-if="showDataLogs" class="emp-detail-overlay" @click.self="showDataLogs = false">
      <div class="emp-detail-panel" style="width:min(640px,92vw)">
        <div class="card-header" style="padding:16px 20px">
          <span class="card-title">数据维护操作日志</span>
          <button class="btn btn-sm btn-secondary" @click="showDataLogs = false">关闭</button>
        </div>
        <div style="padding:0 20px 16px;max-height:500px;overflow-y:auto">
          <div v-if="!dataEditLogs.length" style="text-align:center;color:var(--text-tertiary);padding:40px 0">暂无操作记录</div>
          <div v-for="(log, li) in dataEditLogs" :key="li" class="lead-log" style="border-bottom:1px solid var(--border-light);padding:10px 0">
            <div style="font-size:13px;margin-bottom:6px">
              <span style="font-weight:600;color:var(--text)">{{ log.operator }}</span> · <span style="color:var(--text-secondary)">{{ log.team }}</span> · <span style="color:var(--text-secondary)">{{ log.period }}</span>
            </div>
            <table class="lead-src-table" style="font-size:12px">
              <thead><tr><th style="text-align:left">指标</th><th style="text-align:right">原值</th><th style="text-align:center">增量</th><th style="text-align:right">结果值</th></tr></thead>
              <tbody>
                <tr v-for="(it, ii) in log.items" :key="ii">
                  <td style="text-align:left;color:var(--text)">{{ it.label }}</td>
                  <td style="text-align:right;color:var(--text-tertiary)">{{ it.oldVal }}{{ it.unit }}</td>
                  <td style="text-align:center;font-weight:600" :style="it.increment > 0 ? 'color:var(--green)' : 'color:var(--red)'">{{ it.increment > 0 ? '+' : '' }}{{ it.increment }}{{ it.unit }}</td>
                  <td style="text-align:right;font-weight:600;color:var(--text)">{{ it.newVal }}{{ it.unit }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

// ── 颜色 ──
const LCHART = {
  seq: ['#EAF3FF', '#CFE3F8', '#9FC4EA', '#6EA2D7', '#3F78C5'],
  c: ['#3F78C5', '#3F9EAD', '#58A86A', '#C89532', '#9070C3', '#B45F86', '#6F879E', '#4F6578'],
  danger: '#D24A4A', sub: '#646A73', axis: '#9AA3AF', grid: '#E5E8EC', label: '#1F2329',
}

// ── 静态数据 ──
const KB_FUNNEL = {
  month: { cur: { iql: 12450, mql: 8320, sql: 5140, opp: 1870, oppAmt: 892.50, actUserTTL: 3240, actCorpTTL: 1820, ca: 756, gmv: 4218.60 }, yoy: { iql: 10800, mql: 7100, sql: 4320, opp: 1540, oppAmt: 750.00, actUserTTL: 2800, actCorpTTL: 1580, ca: 620, gmv: 3540.00 }, mom: { iql: 11900, mql: 7980, sql: 4850, opp: 1720, oppAmt: 820.00, actUserTTL: 3100, actCorpTTL: 1740, ca: 710, gmv: 3980.00 } },
  quarter: { cur: { iql: 38200, mql: 25400, sql: 15800, opp: 5620, oppAmt: 2680.00, actUserTTL: 9800, actCorpTTL: 5420, ca: 2340, gmv: 12860.00 }, yoy: { iql: 32000, mql: 21200, sql: 13000, opp: 4500, oppAmt: 2100.00, actUserTTL: 8200, actCorpTTL: 4600, ca: 1980, gmv: 10500.00 }, mom: { iql: 36000, mql: 24000, sql: 14800, opp: 5200, oppAmt: 2480.00, actUserTTL: 9200, actCorpTTL: 5100, ca: 2180, gmv: 11900.00 } },
  year: { cur: { iql: 152000, mql: 98000, sql: 61000, opp: 21500, oppAmt: 10240.00, actUserTTL: 38200, actCorpTTL: 21000, ca: 9100, gmv: 50800.00 }, yoy: { iql: 128000, mql: 82000, sql: 50000, opp: 17500, oppAmt: 8200.00, actUserTTL: 31000, actCorpTTL: 17200, ca: 7500, gmv: 42000.00 }, mom: { iql: 140000, mql: 90000, sql: 55000, opp: 19200, oppAmt: 9100.00, actUserTTL: 34500, actCorpTTL: 19000, ca: 8300, gmv: 46500.00 } },
  week: { cur: { iql: 3112, mql: 2080, sql: 1285, opp: 468, oppAmt: 223.10, actUserTTL: 810, actCorpTTL: 455, ca: 189, gmv: 1054.65 }, yoy: { iql: 2700, mql: 1775, sql: 1080, opp: 385, oppAmt: 187.50, actUserTTL: 700, actCorpTTL: 395, ca: 155, gmv: 885.00 }, mom: { iql: 2975, mql: 1995, sql: 1212, opp: 430, oppAmt: 205.00, actUserTTL: 775, actCorpTTL: 435, ca: 177, gmv: 995.00 } },
  day: { cur: { iql: 498, mql: 333, sql: 206, opp: 75, oppAmt: 35.70, actUserTTL: 130, actCorpTTL: 73, ca: 30, gmv: 168.74 }, yoy: { iql: 432, mql: 284, sql: 173, opp: 62, oppAmt: 30.00, actUserTTL: 112, actCorpTTL: 63, ca: 25, gmv: 141.60 }, mom: { iql: 476, mql: 319, sql: 194, opp: 69, oppAmt: 32.80, actUserTTL: 124, actCorpTTL: 70, ca: 28, gmv: 159.20 } },
}
const KB_TEAM_RAW = {
  month: { chengdu: [5200, 3480, 2150, 380.50, 820, 0, 800, 680, 312.40, 205, 120, 480.50, 210, 180, 680.50], beijing: [7250, 4840, 2990, 512.00, 1140, 0, 1205, 950, 435.60, 307, 160, 680.00, 298, 252, 950.00] },
  quarter: { chengdu: [16200, 10800, 6700, 1180.00, 2560, 0, 2400, 2100, 960.00, 615, 380, 1480.00, 650, 540, 2040.00], beijing: [22000, 14600, 9100, 1500.00, 3480, 0, 3605, 2860, 1320.00, 921, 520, 2020.00, 880, 760, 2850.00] },
  year: { chengdu: [63000, 41800, 25900, 4580.00, 9900, 0, 9600, 8100, 3720.00, 2460, 1480, 5720.00, 2520, 2100, 7920.00], beijing: [89000, 56200, 35100, 5660.00, 13400, 0, 14445, 11000, 5020.00, 3688, 2040, 7820.00, 3380, 2960, 11200.00] },
  week: { chengdu: [1300, 870, 537, 95.13, 205, 0, 200, 170, 78.10, 51, 30, 120.13, 52, 45, 170.13], beijing: [1813, 1210, 748, 128.00, 285, 0, 301, 238, 108.90, 77, 40, 170.00, 74, 63, 237.50] },
  day: { chengdu: [208, 139, 86, 15.22, 33, 0, 32, 27, 12.50, 8, 5, 19.22, 8, 7, 27.22], beijing: [290, 194, 120, 20.48, 46, 0, 48, 38, 17.42, 12, 6, 27.20, 12, 10, 38.00] },
}
const KB_TEAM_METRICS = [
  { label: 'IQL', note: '线索池总量' }, { label: 'MQL', note: '已分配线索量' }, { label: 'SQL', note: '线索接收量' },
  { label: 'SQL金额(万)', note: 'SQL阶段合计金额' }, { label: '跟进中', note: '线索质量字段为空的数量' },
  { label: '退回', note: '= MQL − SQL − 跟进中（自动计算）', isCalc: true },
  { label: '商机客户数', note: '商机数据中客户去重数量' }, { label: '商机CA', note: 'PC+NUC+服务器+工作站数量' },
  { label: '商机金额(万)', note: '商机数据金额合计' }, { label: '激活客户数', note: '已购买商品用户数（去重）' },
  { label: '订单CA', note: '特定产品组非赠品商品数量' }, { label: '订单金额(万)', note: '所有产品组非赠品收款金额合计' },
  { label: 'B4激活数', note: '下单客户分级不为B123的激活数' }, { label: 'B4激活CA', note: 'B4激活客户中的CA数量' },
  { label: 'B4激活金额(万)', note: 'B4激活客户金额合计' },
]
const KB_RETURN_REASONS = ['无法经营-电话接通但拒绝沟通', '无法经营-非相关联系人', '无效-无采购权', '无效-公司名称无法识别机构', '无效-非本BU客户', '无效-电话错误或联系人错误', '无效-公司已经注销或破产', '重复派发-2周内重复导入工单', '重新分配-转正确客户负责人']
const KB_RETURN_DATA = {
  month: { cur: [182, 145, 98, 74, 62, 88, 43, 120, 55], yoy: [210, 168, 112, 88, 74, 104, 52, 142, 68], mom: [195, 155, 105, 80, 68, 96, 48, 130, 60] },
  quarter: { cur: [548, 435, 294, 222, 186, 264, 129, 360, 165], yoy: [634, 504, 340, 256, 216, 308, 150, 420, 196], mom: [586, 466, 315, 240, 200, 284, 138, 386, 177] },
  year: { cur: [2180, 1720, 1160, 880, 740, 1040, 510, 1420, 650], yoy: [2520, 1996, 1340, 1020, 860, 1208, 592, 1652, 756], mom: [2340, 1848, 1244, 946, 798, 1118, 548, 1526, 698] },
  week: { cur: [46, 36, 25, 19, 16, 22, 11, 30, 14], yoy: [53, 42, 29, 22, 19, 26, 13, 36, 17], mom: [49, 39, 27, 20, 17, 24, 12, 32, 15] },
  day: { cur: [7, 6, 4, 3, 2, 4, 2, 5, 2], yoy: [8, 7, 5, 4, 3, 5, 2, 6, 3], mom: [8, 6, 4, 3, 3, 4, 2, 5, 2] },
}
const KB_SCORE_BANDS = ['0-20分', '21-40分', '41-60分', '61-80分', '81-100分']
const KB_SCORE_COLORS = ['#EAF3FF', '#CFE3F8', '#9FC4EA', '#6EA2D7', '#3F78C5']
const KB_SCORE_DATA = { month: [420, 1840, 3280, 4120, 2790], quarter: [1260, 5520, 9840, 12360, 8370], year: [4900, 21400, 38200, 47800, 32400], week: [105, 460, 820, 1030, 698], day: [17, 74, 131, 165, 112] }
const KB_SOURCES = ['官网注册', 'AI营销', '批量导入', '自挖掘', '外呼']
const KB_SOURCE_KEYS = ['web', 'ai', 'batch', 'self', 'call']
const KB_SOURCE_COLS = ['IQL', 'MQL', 'SQL', 'OPP', '商机金额(万)', '激活客户数(TTL)', '激活公司数(TTL)', '激活客户数(SMB)', '激活公司数(SMB)', '成交CA', '成交GMV(万)']
const KB_SOURCE_RAW = {
  month: [[4820, 3210, 1980, 720, 342.00, 1240, 680, 760, 420, 290, 1620.00], [2840, 1890, 1170, 430, 206.00, 730, 400, 450, 248, 172, 960.00], [1980, 1320, 820, 298, 142.00, 510, 278, 314, 172, 120, 670.00], [1640, 1100, 680, 248, 118.00, 420, 232, 260, 142, 98, 556.00], [1170, 800, 490, 174, 84.50, 340, 230, 196, 138, 76, 412.60]],
  quarter: [[14820, 9870, 6100, 2220, 1054.00, 3820, 2090, 2340, 1290, 892, 4990.00], [8740, 5820, 3600, 1320, 630.00, 2240, 1230, 1380, 762, 530, 2950.00], [6100, 4060, 2520, 918, 438.00, 1570, 856, 966, 532, 370, 2060.00], [5040, 3360, 2080, 756, 362.00, 1290, 708, 794, 436, 304, 1700.00], [3500, 2310, 1500, 404, 196.00, 1080, 538, 620, 360, 244, 1160.00]],
  year: [[58900, 39200, 24200, 8800, 4200.00, 15200, 8300, 9300, 5120, 3540, 19800.00], [34700, 23100, 14300, 5240, 2500.00, 8900, 4880, 5480, 3020, 2100, 11700.00], [24200, 16100, 10000, 3660, 1740.00, 6210, 3400, 3840, 2120, 1470, 8180.00], [20000, 13300, 8280, 3020, 1440.00, 5120, 2810, 3170, 1740, 1210, 6750.00], [14200, 9300, 5220, 2780, 360.00, 2770, 2610, 2010, 1200, 980, 4370.00]],
  week: [[1205, 803, 495, 180, 85.50, 310, 170, 190, 105, 72, 405.00], [710, 473, 293, 108, 51.50, 183, 100, 113, 62, 43, 240.00], [495, 330, 205, 75, 35.50, 128, 70, 79, 43, 30, 167.50], [410, 275, 170, 62, 29.50, 105, 58, 65, 36, 25, 139.00], [293, 200, 123, 44, 21.13, 85, 58, 49, 35, 19, 103.15]],
  day: [[193, 128, 79, 29, 13.68, 50, 27, 30, 17, 12, 64.80], [114, 76, 47, 17, 8.24, 29, 16, 18, 10, 7, 38.40], [79, 53, 33, 12, 5.68, 20, 11, 13, 7, 5, 26.80], [66, 44, 27, 10, 4.72, 17, 9, 10, 6, 4, 22.24], [47, 32, 20, 7, 3.38, 14, 9, 8, 6, 3, 16.50]],
}
const TEAM_OPTS = [{ label: '成都IS', value: 'chengdu' }, { label: '北京IS', value: 'beijing' }]
const PERSON_OPTS = ['xuhq5', 'peicui2', 'wangw3', 'lihua5']
const KB_SOURCE_FILTER_OPTIONS = [{ label: '官网注册', value: 'web' }, { label: 'AI营销', value: 'ai' }, { label: '批量导入', value: 'batch' }, { label: '自挖掘', value: 'self' }, { label: '外呼', value: 'call' }]
const PRODUCT_OPTS = ['官网全部', '83-TB', '84-TPP', '84-TPE', '49-YTNB', '68-YTDT', '82-TCDT', 'R1-RTDT', 'R2-RTNB', '46-服务', '86-选件', '显示器', '外采-工作站', '外采-服务器', '外采-PC', '外采-其它']
const KPI_CARDS = [
  { key: 'iql', label: '线索池总量', code: 'IQL', isAmt: false }, { key: 'mql', label: '已分配线索量', code: 'MQL', isAmt: false },
  { key: 'sql', label: '线索接收量', code: 'SQL', isAmt: false }, { key: 'opp', label: '商机条数', code: 'OPP', isAmt: false },
  { key: 'oppAmt', label: '商机金额', code: 'OPP金额', isAmt: true }, { key: 'actUserTTL', label: '激活客户数', code: 'TTL', isAmt: false },
  { key: 'actCorpTTL', label: '激活公司数', code: 'TTL', isAmt: false }, { key: 'ca', label: '成交CA', code: '成交CA', isAmt: false },
  { key: 'gmv', label: '成交GMV', code: '成交GMV', isAmt: true },
]
const DE_METRICS = [
  { key: 'iql', label: 'IQL', idx: 0, unit: '' }, { key: 'mql', label: 'MQL', idx: 1, unit: '' }, { key: 'sql', label: 'SQL', idx: 2, unit: '' },
  { key: 'sqlAmt', label: 'SQL金额', idx: 3, unit: '万' }, { key: 'act', label: '激活客户数', idx: 9, unit: '' },
  { key: 'oca', label: '订单CA', idx: 10, unit: '' }, { key: 'oAmt', label: '订单金额', idx: 11, unit: '万' },
  { key: 'b4', label: 'B4激活数', idx: 12, unit: '' }, { key: 'b4ca', label: 'B4激活CA', idx: 13, unit: '' }, { key: 'b4amt', label: 'B4激活金额', idx: 14, unit: '万' },
]
const DE_LOGS_KEY = 'clue_data_edit_logs'
const periods = [['day', '今日'], ['week', '本周'], ['month', '本月'], ['quarter', '本季度'], ['year', '本年']]

// ── 响应式状态 ──
const role = ref('ops')
const kbTab = ref('funnel')
const kbPeriod = ref('month')
const kbYoy = ref(false)
const kbMom = ref(false)
const kbMainFrom = ref('')
const kbMainTo = ref('')
const kbTab2Period = ref('month')
const kbTab2Yoy = ref(false)
const kbTab2Mom = ref(false)
const kbTab2From = ref('')
const kbTab2To = ref('')
const kbTeamSel = ref([])
const kbPersonSel = ref([])
const kbProductSel = ref([])
const kbSourceSel = ref([])
const msOpen = ref(null)
const showDataEdit = ref(false)
const showDataLogs = ref(false)
const defTeam = ref('beijing')
const defDay = ref('')
const defMetrics = ref([])
const defValues = reactive({})
const dataEditLogs = ref(JSON.parse(localStorage.getItem(DE_LOGS_KEY) || '[]'))
const charts = {}

// ── 点击空白关闭多选 ──
function handleDocClick() { msOpen.value = null }

function toggleMs(key) { msOpen.value = msOpen.value === key ? null : key }

function setRole(r) {
  role.value = r
  if ((r === 'sales' || r === 'leader') && kbTab.value !== 'team') kbTab.value = 'team'
}

// ── 数字格式 ──
function fmt(n) { return n == null ? '-' : Math.round(n).toLocaleString('zh-CN') }
function fmtAmt(n) { return n == null ? '-' : '¥' + n.toFixed(2) + '万' }
function convRate(a, b) { return b > 0 ? (a / b * 100).toFixed(1) + '%' : '-' }
function trendPct(c, b) { if (!b) return '-'; const d = ((c - b) / b * 100).toFixed(1); return (d >= 0 ? '↑+' : '↓') + Math.abs(d) + '%' }
function trendClass(c, b) { if (!b) return 'flat'; return c >= b ? 'up' : 'down' }

// ── 计算漏斗当前值 ──
const funnelCur = computed(() => {
  const p = kbPeriod.value
  const selSrc = kbSourceSel.value, teamSel = kbTeamSel.value
  const teamToObj = arr => ({ iql: arr[0], mql: arr[1], sql: arr[2], opp: arr[7], oppAmt: arr[8], actUserTTL: arr[9], actCorpTTL: Math.round(arr[9] * 0.56), ca: arr[10], gmv: arr[11] })
  let base
  const effectiveTeams = teamSel.length ? teamSel : ['chengdu', 'beijing']
  const singleTeam = effectiveTeams.length === 1 ? effectiveTeams[0] : null
  if (singleTeam && KB_TEAM_RAW[p][singleTeam]) base = teamToObj(KB_TEAM_RAW[p][singleTeam])
  else if (selSrc.length) {
    const raw = KB_SOURCE_RAW[p]
    const rs = KB_SOURCE_KEYS.map((k, i) => selSrc.includes(k) ? raw[i] : null).filter(Boolean)
    if (rs.length) { const sc = ci => rs.reduce((s, r) => s + r[ci], 0); base = { iql: sc(0), mql: sc(1), sql: sc(2), opp: sc(3), oppAmt: sc(4), actUserTTL: sc(5), actCorpTTL: sc(6), ca: sc(9), gmv: sc(10) } }
    else base = KB_FUNNEL[p].cur
  } else base = KB_FUNNEL[p].cur
  let ratio = 1
  if (kbPersonSel.value.length) ratio *= Math.min(0.5 * kbPersonSel.value.length, 1)
  if (kbProductSel.value.length) ratio *= kbProductSel.value.length / 15
  if (ratio === 1) return base
  const sc = v => Math.round(v * ratio), sa = v => +((v * ratio).toFixed(2))
  return { iql: sc(base.iql), mql: sc(base.mql), sql: sc(base.sql), opp: sc(base.opp), oppAmt: sa(base.oppAmt), actUserTTL: sc(base.actUserTTL), actCorpTTL: sc(base.actCorpTTL), ca: sc(base.ca), gmv: sa(base.gmv) }
})

// ── 质量面板 ──
const sourceTableData = computed(() => {
  const p = kbTab2Period.value
  const rows = KB_SOURCES.map((s, i) => [s, ...KB_SOURCE_RAW[p][i]])
  const totals = ['合计']
  for (let c = 0; c < KB_SOURCE_COLS.length; c++) totals.push(rows.reduce((sum, r) => sum + (r[c + 1] || 0), 0))
  return [...rows, totals]
})

function returnSorted() {
  const d = KB_RETURN_DATA[kbTab2Period.value].cur
  return KB_RETURN_REASONS.map((r, i) => ({ reason: r, val: d[i] })).sort((a, b) => b.val - a.val)
}

// ── 团队面板 ──
const isAmtIdx = i => [3, 8, 11, 14].includes(i)
function teamRatio() {
  let r = 1
  if (kbPersonSel.value.length) r *= Math.min(0.5 * kbPersonSel.value.length, 1)
  if (kbSourceSel.value.length) r *= Math.min(kbSourceSel.value.length / KB_SOURCE_KEYS.length, 1)
  return r
}
const effectiveTeamSel = computed(() => {
  if (role.value === 'sales' || role.value === 'leader') return ['beijing']
  return kbTeamSel.value.length ? kbTeamSel.value : ['chengdu', 'beijing']
})
const showCD = computed(() => effectiveTeamSel.value.includes('chengdu'))
const showBJ = computed(() => effectiveTeamSel.value.includes('beijing'))
const showTotal = computed(() => effectiveTeamSel.value.length > 1)
const teamTableData = computed(() => {
  const p = kbPeriod.value, r = teamRatio()
  const sc = (arr, i) => isAmtIdx(i) ? +(arr[i] * r).toFixed(2) : Math.round(arr[i] * r)
  const cd = KB_TEAM_RAW[p].chengdu, bj = KB_TEAM_RAW[p].beijing
  return KB_TEAM_METRICS.map((m, i) => {
    const cdVal = i === 5 ? sc(cd, 1) - sc(cd, 2) - sc(cd, 4) : sc(cd, i)
    const bjVal = i === 5 ? sc(bj, 1) - sc(bj, 2) - sc(bj, 4) : sc(bj, i)
    return { metric: m.label, note: m.note, isCalc: !!m.isCalc, chengdu: cdVal, beijing: bjVal, total: +((cdVal + bjVal).toFixed(2)) }
  })
})

// ── ECharts ──
function ec(id) {
  const el = document.getElementById(id)
  if (!el) return null
  if (charts[id]) { charts[id].dispose() }
  charts[id] = echarts.init(el)
  return charts[id]
}
function drawFunnel() {
  const c = ec('lead-funnel-chart'); if (!c) return
  const d = funnelCur.value, total = d.iql || 1
  c.setOption({
    color: LCHART.seq,
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>数量：${(p.data.rv || 0).toLocaleString('zh-CN')}` },
    series: [{ type: 'funnel', width: '55%', left: '22%', top: 20, bottom: 10, sort: 'none', gap: 4,
      label: { show: true, position: 'inside', fontSize: 13, color: LCHART.label, fontWeight: 600, formatter: p => `${p.data.sn}\n${(p.data.rv || 0).toLocaleString('zh-CN')}` },
      itemStyle: { borderWidth: 0 },
      data: [
        { name: 'IQL 线索池', sn: 'IQL', rv: d.iql, value: 100, itemStyle: { color: LCHART.seq[4] } },
        { name: 'MQL 已分配', sn: 'MQL', rv: d.mql, value: Math.round(d.mql / total * 100), itemStyle: { color: LCHART.seq[3] } },
        { name: 'SQL 已接收', sn: 'SQL', rv: d.sql, value: Math.round(d.sql / total * 100), itemStyle: { color: LCHART.seq[2] } },
        { name: 'OPP 商机', sn: 'OPP', rv: d.opp, value: Math.round(d.opp / total * 100), itemStyle: { color: LCHART.seq[1] } },
      ]}],
  })
}
function drawTeam() {
  const c = ec('lead-team-chart'); if (!c) return
  const p = kbPeriod.value, sel = effectiveTeamSel.value, r = teamRatio()
  const pick = i => { const sum = sel.reduce((s, tm) => s + (KB_TEAM_RAW[p][tm] ? KB_TEAM_RAW[p][tm][i] : 0), 0) * r; return isAmtIdx(i) ? +sum.toFixed(1) : Math.round(sum) }
  const iql = pick(0), mql = pick(1), sql = pick(2), sqlAmt = pick(3), oppCnt = pick(6), oppAmt = pick(8), actCnt = pick(9), actAmt = pick(11)
  const tot = iql || 1, f2 = n => n.toLocaleString('zh-CN'), fA = n => '¥' + n.toFixed(1) + '万'
  c.setOption({
    color: LCHART.seq,
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>${p.data.tip || ''}` },
    graphic: [
      { type: 'text', left: '58%', top: '16%', style: { text: convRate(mql, iql), fill: LCHART.sub, fontSize: 12, fontWeight: 600 } },
      { type: 'text', left: '58%', top: '34%', style: { text: convRate(sql, mql), fill: LCHART.sub, fontSize: 12, fontWeight: 600 } },
      { type: 'text', left: '58%', top: '52%', style: { text: convRate(oppCnt, sql), fill: LCHART.sub, fontSize: 12, fontWeight: 600 } },
      { type: 'text', left: '58%', top: '70%', style: { text: convRate(actCnt, oppCnt), fill: LCHART.sub, fontSize: 12, fontWeight: 600 } },
    ],
    series: [{ type: 'funnel', width: '54%', left: '2%', top: 20, bottom: 10, sort: 'none', gap: 3,
      label: { show: true, position: 'inside', fontSize: 12, color: LCHART.label, fontWeight: 600, formatter: p => p.data.l2 ? `${p.data.sn}\n${p.data.l1}\n${p.data.l2}` : `${p.data.sn}\n${p.data.l1}` },
      itemStyle: { borderWidth: 0 },
      data: [
        { name: 'IQL 线索池', sn: 'IQL', l1: f2(iql), tip: `IQL：${f2(iql)}`, value: 100, itemStyle: { color: LCHART.seq[4] } },
        { name: 'MQL 已分配', sn: 'MQL', l1: f2(mql), tip: `MQL：${f2(mql)}`, value: Math.round(mql / tot * 100), itemStyle: { color: LCHART.seq[3] } },
        { name: 'SQL 已接收', sn: 'SQL', l1: f2(sql), l2: fA(sqlAmt), tip: `SQL：${f2(sql)}<br/>SQL金额：${fA(sqlAmt)}`, value: Math.round(sql / tot * 100), itemStyle: { color: LCHART.seq[2] } },
        { name: '商机', sn: '商机', l1: f2(oppCnt), l2: fA(oppAmt), tip: `商机客户数：${f2(oppCnt)}<br/>商机金额：${fA(oppAmt)}`, value: Math.round(oppCnt / tot * 100), itemStyle: { color: LCHART.seq[1] } },
        { name: '激活', sn: '激活', l1: f2(actCnt), l2: fA(actAmt), tip: `激活客户数：${f2(actCnt)}<br/>订单金额：${fA(actAmt)}`, value: Math.round(actCnt / tot * 100), itemStyle: { color: LCHART.seq[0] } },
      ]}],
  })
}
function drawReturn() {
  const c = ec('lead-return-chart'); if (!c) return
  const sorted = returnSorted(), yoy = kbTab2Yoy.value, mom = kbTab2Mom.value
  const p = kbTab2Period.value
  const yoyMap = Object.fromEntries(KB_RETURN_REASONS.map((r, i) => [r, KB_RETURN_DATA[p].yoy[i]]))
  const momMap = Object.fromEntries(KB_RETURN_REASONS.map((r, i) => [r, KB_RETURN_DATA[p].mom[i]]))
  const pct = (cu, b) => { if (!b) return ''; const d = ((cu - b) / b * 100).toFixed(1); return d >= 0 ? ` ↑+${d}%` : ` ↓${Math.abs(d)}%` }
  const series = [{ name: '当期', type: 'bar', data: sorted.map(x => x.val), barMaxWidth: 20, itemStyle: { color: LCHART.danger, borderRadius: [0, 3, 3, 0] },
    label: { show: true, position: 'right', fontSize: 11, formatter: pp => { const x = sorted[pp.dataIndex]; let s = String(x.val); if (yoy) s += `  同比${pct(x.val, yoyMap[x.reason])}`; if (mom) s += `  环比${pct(x.val, momMap[x.reason])}`; return s } } }]
  if (yoy) series.push({ name: '同比基准', type: 'bar', data: sorted.map(x => yoyMap[x.reason]), barMaxWidth: 20, itemStyle: { color: LCHART.seq[2], borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 11 } })
  if (mom) series.push({ name: '环比基准', type: 'bar', data: sorted.map(x => momMap[x.reason]), barMaxWidth: 20, itemStyle: { color: LCHART.c[6], borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 11 } })
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: (yoy || mom) ? { top: 0, right: 8 } : { show: false },
    grid: { left: '38%', right: '8%', top: (yoy || mom) ? 30 : 10, bottom: 40 },
    xAxis: { type: 'value', axisLine: { lineStyle: { color: LCHART.axis } }, splitLine: { lineStyle: { color: LCHART.grid } }, axisLabel: { color: LCHART.sub } },
    yAxis: { type: 'category', data: sorted.map(x => x.reason), axisLine: { lineStyle: { color: LCHART.axis } }, axisLabel: { fontSize: 11, width: 220, overflow: 'truncate', color: LCHART.sub } },
    series,
  })
}
function drawScore() {
  const c = ec('lead-score-chart'); if (!c) return
  const d = KB_SCORE_DATA[kbTab2Period.value]
  c.setOption({
    tooltip: { trigger: 'item', formatter: '{b}：{c}条 ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: 'center' },
    series: [{ type: 'pie', radius: ['38%', '65%'], center: ['40%', '50%'], avoidLabelOverlap: true, label: { show: true, formatter: '{b}\n{c}条' },
      data: KB_SCORE_BANDS.map((band, i) => ({ name: band, value: d[i], itemStyle: { color: KB_SCORE_COLORS[i] } })) }],
  })
}

function renderKbChart() {
  nextTick(() => {
    if (kbTab.value === 'funnel') drawFunnel()
    else if (kbTab.value === 'quality') { drawReturn(); drawScore() }
    else drawTeam()
  })
}

// ── 数据维护 ──
function openDataEdit() { defTeam.value = 'beijing'; defDay.value = ''; defMetrics.value = []; showDataEdit.value = true }
function openDataLogs() { showDataLogs.value = true }
function confirmDataEdit() {
  if (!defTeam.value) return alert('请选择销售团队')
  if (!defDay.value) return alert('请选择日期')
  if (!defMetrics.value.length) return alert('请选择至少一个维护指标')
  const teamLabel = defTeam.value === 'beijing' ? '北京IS' : '成都IS'
  const changed = []
  defMetrics.value.forEach(key => {
    const meta = DE_METRICS.find(m => m.key === key), inc = parseFloat(defValues[key])
    if (meta && !isNaN(inc) && inc !== 0) {
      const oldVal = +KB_TEAM_RAW.day[defTeam.value][meta.idx].toFixed(2)
      KB_TEAM_RAW.day[defTeam.value][meta.idx] = +(oldVal + inc).toFixed(2)
      changed.push({ label: meta.label, oldVal, increment: inc, newVal: KB_TEAM_RAW.day[defTeam.value][meta.idx], unit: meta.unit })
    }
  })
  if (!changed.length) return alert('请填写至少一个非零增量值')
  dataEditLogs.value.unshift({ time: new Date().toLocaleString('zh-CN', { hour12: false }), operator: 'Leader张（l001）', team: teamLabel, period: defDay.value, items: changed })
  localStorage.setItem(DE_LOGS_KEY, JSON.stringify(dataEditLogs.value))
  showDataEdit.value = false
  renderKbChart()
}

// ── 导出 ──
function downloadCsv(content, name) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
}
function exportFunnel() {
  const d = funnelCur.value
  const e = c => `"${String(c).replace(/"/g, '""')}"`
  const rows = [['指标名称', '代号', '当前值'].map(e).join(','), ...KPI_CARDS.map(c => [c.label, c.code, c.isAmt ? fmtAmt(d[c.key]) : fmt(d[c.key])].map(e).join(','))]
  downloadCsv(rows.join('\r\n'), '整体看板数据.csv')
}
function exportQuality() {
  const p = kbTab2Period.value
  const e = c => `"${String(c).replace(/"/g, '""')}"`
  const retRows = [['退回原因', '当期数量'].map(e).join(','), ...returnSorted().map(({ reason, val }) => [reason, val].map(e).join(','))]
  const srcRows = [[], ['分来源漏斗'].map(e).join(','), ['线索来源', ...KB_SOURCE_COLS].map(e).join(','), ...sourceTableData.value.map(r => r.map(e).join(','))]
  downloadCsv([...retRows, ...srcRows].join('\r\n'), '线索质量看板数据.csv')
}

// ── 监听 tab / 周期变化重绘图表 ──
watch([kbTab, kbPeriod, kbTab2Period, kbYoy, kbMom, kbTab2Yoy, kbTab2Mom], renderKbChart)

function handleResize() { Object.values(charts).forEach(c => c && c.resize && c.resize()) }

onMounted(() => {
  renderKbChart()
  document.addEventListener('click', handleDocClick)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocClick)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.lead-seg { display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border-light);border-radius:8px;padding:2px;gap:2px;vertical-align:middle }
.lead-seg-btn { height:28px;padding:0 13px;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s }
.lead-seg-btn:hover { color:var(--text) }
.lead-seg-btn.active { background:var(--card-bg);color:var(--primary);font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.06) }
.lead-filter { display:flex;align-items:center;gap:12px;padding:14px 16px;margin-bottom:14px;flex-wrap:wrap;position:relative;z-index:30;overflow:visible }
.lead-filter .ops-select,.lead-filter input:not([type=checkbox]):not([type=radio]),.lead-filter select { height:36px;min-height:36px;padding:0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--card-bg);color:var(--text) }
.lead-tab-wrap { padding:0 16px;margin-bottom:14px }
.lead-tabs { display:flex;gap:28px;min-height:46px }
.lead-tabs .tab-item { padding:12px 2px }
.lead-date { width:148px }
.lead-ro-box { height:36px;display:inline-flex;align-items:center;padding:0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text) }
.lead-ck { font-size:13px;color:var(--text);display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap }
.lead-ck input { accent-color:var(--primary);cursor:pointer }
.lead-ms { position:relative;flex-shrink:0 }
.lead-ms.open { z-index:1300 }
.lead-ms-trig { height:36px;min-width:120px;max-width:180px;display:flex;align-items:center;padding:0 26px 0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--card-bg);cursor:pointer;position:relative;white-space:nowrap;overflow:hidden }
.lead-ms-trig span { overflow:hidden;text-overflow:ellipsis }
.lead-ms-text.ph { color:var(--text-tertiary) }
.lead-ms-trig::after { content:"▾";position:absolute;right:9px;color:var(--text-tertiary) }
.lead-ms.open .lead-ms-trig { border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light) }
.lead-ms-panel { display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:1000;min-width:100%;width:max-content;max-height:240px;overflow:auto;background:var(--card-bg);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12);padding:5px }
.lead-ms.open .lead-ms-panel { display:block }
.lead-ms-opt { display:flex;align-items:center;gap:8px;height:32px;padding:0 10px;border-radius:6px;font-size:13px;color:var(--text);cursor:pointer;white-space:nowrap }
.lead-ms-opt:hover { background:var(--bg) }
.lead-ms-opt input { accent-color:var(--primary) }
.lead-kpi-grid { display:grid;gap:14px;margin-bottom:16px;grid-template-columns:repeat(3,1fr) }
.lead-kpi { border-radius:12px;padding:15px 18px;box-shadow:0 1px 2px rgba(15,23,42,.035);position:relative;overflow:hidden;transition:box-shadow .2s;background:linear-gradient(135deg,rgba(51,112,255,.08),rgba(51,112,255,.025) 46%,var(--card-bg));border:1px solid rgba(51,112,255,.09) }
.lead-kpi:nth-child(4n+2) { background:linear-gradient(135deg,rgba(20,184,166,.07),rgba(20,184,166,.025) 46%,var(--card-bg));border-color:rgba(20,184,166,.09) }
.lead-kpi:nth-child(4n+3) { background:linear-gradient(135deg,rgba(99,102,241,.07),rgba(99,102,241,.025) 46%,var(--card-bg));border-color:rgba(99,102,241,.09) }
.lead-kpi:nth-child(4n+4) { background:linear-gradient(135deg,rgba(139,92,246,.07),rgba(139,92,246,.025) 46%,var(--card-bg));border-color:rgba(139,92,246,.09) }
.lead-kpi:hover { box-shadow:0 8px 22px rgba(15,23,42,.07) }
.lead-kpi-label { font-size:12px;color:var(--text-secondary);margin-bottom:3px }
.lead-kpi-code { font-size:11px;color:var(--text-tertiary);margin-bottom:8px }
.lead-kpi-value { font-size:24px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums }
.lead-kpi-trend { margin-top:6px;font-size:12px;display:flex;gap:10px;flex-wrap:wrap }
.lead-trend.up { color:var(--green) }
.lead-trend.down { color:var(--red) }
.lead-trend.flat { color:var(--text-tertiary) }
.lead-fl { font-size:13px;color:var(--text-secondary);white-space:nowrap }
.lead-two-col { display:grid;grid-template-columns:45% 55%;gap:16px }
.lead-src-table { width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap }
.lead-src-table th,.lead-src-table td { padding:9px 12px;border:1px solid var(--border-light);text-align:right }
.lead-src-table th { background:var(--bg);font-weight:600;color:var(--text-secondary) }
.lead-src-table th:first-child,.lead-src-table td:first-child { text-align:left;position:sticky;left:0;background:var(--card-bg) }
.lead-src-table thead th:first-child { background:var(--bg) }
.lead-src-table tbody tr:hover td { background:var(--primary-light) }
.lead-src-table .lead-total td { font-weight:700;background:var(--primary-light)!important;color:var(--primary) }
.lead-field { margin-bottom:12px }
.lead-field > label { display:block;font-size:13px;color:var(--text-secondary);margin-bottom:5px }
.lead-field-c { display:flex;align-items:center;gap:8px;flex-wrap:wrap }
.lead-inp { width:100%;height:34px;padding:0 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--card-bg);outline:none;font-family:inherit }
.lead-inp:focus { border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light) }
.lead-pa-row { display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap }
.lead-log { padding:10px 0;border-bottom:1px solid var(--border-light);font-size:13px }
.emp-detail-overlay { position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center }
.emp-detail-panel { background:var(--bg-primary,#fff);border-radius:10px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.18) }
@media (max-width:1280px) { .lead-two-col { grid-template-columns:1fr } }
</style>
