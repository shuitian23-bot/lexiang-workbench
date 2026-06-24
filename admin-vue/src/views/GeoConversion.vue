<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">GEO · 转化看板</div>
        <div class="page-desc">通过 AI 搜索平台入站的访问 / 登录 / 注册 / 购买转化</div>
      </div>
    </div>
    <div class="geo-dark">
      <!-- 时间范围 -->
      <div class="geo-filter-row" style="flex-wrap:wrap;gap:8px">
        <span class="geo-label">时间范围</span>
        <input type="date" v-model="dateStart" style="padding:4px 8px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer" @change="onDateChange">
        <span style="font-size:12px;color:#6b7280">至</span>
        <input type="date" v-model="dateEnd" style="padding:4px 8px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer" @change="onDateChange">
        <div style="display:inline-flex;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;margin-left:4px">
          <button
            v-for="p in periodList" :key="p.key"
            :style="period === p.key ? 'padding:4px 12px;font-size:12px;border:none;cursor:pointer;background:#2563eb;color:#fff;transition:all .15s' : 'padding:4px 12px;font-size:12px;border:none;cursor:pointer;background:#fff;color:#374151;transition:all .15s'"
            @click="quickPeriod(p.key)"
          >{{ p.label }}</button>
        </div>
        <span class="geo-label" style="margin-left:8px">数据T+1更新</span>
      </div>
      <div class="geo-status-line">{{ statusText }}</div>

      <!-- UV 趋势占位 -->
      <div class="geo-conv-section">
        <div class="geo-conv-title">UV 趋势</div>
        <div class="geo-pending"><div class="geo-pending-title">UV 趋势待接口提供数据</div></div>
      </div>

      <!-- 整体 -->
      <div class="geo-conv-section">
        <div class="geo-conv-title">GEO看板 · 整体（URL 包含 lenovo，排除 wiki.lenovo.com.cn）</div>
        <div class="geo-interface-note">接口待提供：当前仅展示字段结构；访问、登录、注册、购买和乐享下单转化数据接入后替换占位。</div>
        <div class="geo-conv-grid">
          <div class="geo-conv-cell" v-for="f in allFields" :key="f.id">
            <div class="gcc-label">{{ f.label }}</div>
            <div class="gcc-val">--</div>
            <div class="gcc-def">{{ f.def }}</div>
            <div class="geo-business-split-row" v-if="f.split">
              <span>消费业务 <strong>{{ PENDING }}</strong></span>
              <span>SMB业务 <strong>{{ PENDING }}</strong></span>
              <span>政企业务 <strong>{{ PENDING }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 联想乐享 -->
      <div class="geo-conv-section">
        <div class="geo-conv-title">GEO看板 · 联想乐享（URL 包含 leai.lenovo.com.cn / wiki.lenovo.com.cn）</div>
        <div class="geo-interface-note">接口待提供：当前仅展示字段结构；乐享访问、互动、购买和自主下单数据接入后替换占位。</div>
        <div class="geo-conv-grid">
          <div class="geo-conv-cell" v-for="f in leaiFields" :key="f.id">
            <div class="gcc-label">{{ f.label }}</div>
            <div class="gcc-val">--</div>
            <div class="gcc-def">{{ f.def }}</div>
            <div class="geo-business-split-row" v-if="f.split">
              <span>消费业务 <strong>{{ PENDING }}</strong></span>
              <span>SMB业务 <strong>{{ PENDING }}</strong></span>
              <span>政企业务 <strong>{{ PENDING }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 联想官网 -->
      <div class="geo-conv-section">
        <div class="geo-conv-title">联想官网 · 总数看板</div>
        <div class="geo-interface-note">接口待提供：UV 站点拆分、Top5 页面、销量/销售额总数及业务拆分接入后替换占位。</div>
        <div class="geo-official-board">
          <div class="geo-official-total-card">
            <div class="gcc-label">总 UV（不含挂奖页面）</div>
            <div class="gcc-val">--</div>
            <div class="gcc-def">按被触点归属统计后的联想官网访问用户数</div>
          </div>
          <div class="geo-official-donut-card">
            <div class="gcc-label">UV 按站点拆分</div>
            <div class="geo-official-donut">
              <div class="geo-donut-placeholder">待接口提供数据</div>
              <div class="geo-donut-list">
                <span>联想首页 <strong>--</strong></span>
                <span>联想商城 <strong>--</strong></span>
                <span>消费业务 <strong>--</strong></span>
                <span>SMB业务 <strong>--</strong></span>
                <span>政企业务 <strong>--</strong></span>
                <span>服务 <strong>--</strong></span>
                <span>其他 <strong>--</strong></span>
              </div>
            </div>
          </div>
          <div class="geo-official-trend-card">
            <div class="gcc-label">UV 趋势（不含挂奖页面）</div>
            <div class="geo-pending compact">待接口提供数据</div>
          </div>
          <div class="geo-official-top-card">
            <div class="gcc-label">用户访问 Top5 页面</div>
            <div class="geo-pending"><div class="geo-pending-title">用户访问Top5页面待接口提供数据</div></div>
          </div>
          <div class="geo-official-sales-card">
            <div class="gcc-label">销量概览</div>
            <div class="gcc-val">--</div>
            <div class="geo-business-split">
              <span>消费商品 <strong>--</strong></span>
              <span>SMB商品 <strong>--</strong></span>
              <span>政企商品 <strong>--</strong></span>
            </div>
          </div>
          <div class="geo-official-sales-card">
            <div class="gcc-label">销售额概览（元）</div>
            <div class="gcc-val">--</div>
            <div class="geo-business-split">
              <span>消费商品 <strong>--</strong></span>
              <span>SMB商品 <strong>--</strong></span>
              <span>政企商品 <strong>--</strong></span>
            </div>
          </div>
        </div>
        <div class="geo-business-title">分业务模块</div>
        <div class="geo-business-modules">
          <div class="geo-business-module" v-for="biz in bizModules" :key="biz">
            <div class="geo-business-name">{{ biz }}</div>
            <div class="geo-business-grid">
              <div><span>业务归属 UV</span><strong>待接口提供数据</strong></div>
              <div><span>UV 趋势</span><strong>待接口提供数据</strong></div>
              <div class="wide"><span>业务 UV Top5 页面</span><strong>待接口提供数据</strong></div>
              <div><span>业务销量</span><strong>待接口提供数据</strong></div>
              <div><span>业务销售额</span><strong>待接口提供数据</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const PENDING = '待接口提供数据'
const period = ref('30d')
const dateStart = ref('')
const dateEnd = ref('')

const periodList = [
  { key:'7d', label:'近7天' },
  { key:'30d', label:'近30天' },
]

const bizModules = ['消费业务','SMB业务（含企业购）','政企业务']

const allFields = [
  { id:'gc-all-uv',        label:'访问联想UV',     def:'通过AI搜索平台访问联想域名的用户数', split:false },
  { id:'gc-all-login',     label:'登录用户',        def:'访问联想的用户中，有Lenovoid登录行为的用户数', split:false },
  { id:'gc-all-newreg',    label:'新注册用户',      def:'访问联想的登录用户中，是新注册的用户数', split:false },
  { id:'gc-all-paid',      label:'付费用户',        def:'用户入站后，发生了购买行为的用户数', split:true },
  { id:'gc-all-ca',        label:'CA',             def:'购买用户产生的订单销量', split:true },
  { id:'gc-all-gmv',       label:'GMV',            def:'购买用户产生的订单交易额', split:true },
  { id:'gc-all-newpaid',   label:'新付费用户',      def:'购买用户中，是首次发生购买行为的用户数', split:true },
  { id:'gc-all-newca',     label:'新付费CA',        def:'首次购买用户，产生的订单销量', split:true },
  { id:'gc-all-newgmv',    label:'新付费GMV',       def:'首次购买用户，产生的交易额', split:true },
  { id:'gc-all-leai-user', label:'乐享·下单用户',   def:'付费用户中，通过乐享自主下单功能，发生购买行为的用户数', split:true },
  { id:'gc-all-leai-ca',   label:'乐享-CA',         def:'通过乐享自主下单功能，发生购买行为的用户产生的销量', split:true },
  { id:'gc-all-leai-gmv',  label:'乐享-GMV',        def:'通过乐享自主下单功能，发生购买行为的用户产生的交易额', split:true },
]
const leaiFields = [
  { id:'gc-leai-uv',            label:'访问联想乐享UV',     def:'通过AI搜索平台访问联想乐享的用户', split:false },
  { id:'gc-leai-login',         label:'登录用户-乐享',      def:'访问联想乐享的用户中，有Lenovoid登录行为的用户数', split:false },
  { id:'gc-leai-newreg',        label:'新注册用户-乐享',    def:'访问联想乐享的登录用户中，是新注册的用户数', split:false },
  { id:'gc-leai-interact',      label:'互动用户数',         def:'访问联想乐享的用户中，至少有1次会话的用户数', split:false },
  { id:'gc-leai-login-interact',label:'登录状态下互动人数', def:'互动用户中，是有登录状态的互动用户数', split:false },
  { id:'gc-leai-paid',          label:'付费用户数',         def:'访问联想乐享后，在站内发生了购买行为的用户数', split:true },
  { id:'gc-leai-ca',            label:'CA',                def:'访问联想乐享后的购买用户，产生的订单销量', split:true },
  { id:'gc-leai-gmv',           label:'GMV',               def:'访问联想乐享后的购买用户，产生的订单交易额', split:true },
  { id:'gc-leai-newpaid',       label:'新付费用户',        def:'访问联想乐享后发生购买的用户中，首次购买的用户', split:true },
  { id:'gc-leai-newca',         label:'新付费CA',          def:'首次购买用户，产生的订单销量', split:true },
  { id:'gc-leai-newgmv',        label:'新付费GMV',         def:'首次购买用户，产生的交易额', split:true },
  { id:'gc-leai-order-user',    label:'乐享·下单用户',     def:'付费用户中，通过乐享自主下单功能，发生购买行为的用户', split:true },
  { id:'gc-leai-order-ca',      label:'乐享-CA',           def:'通过乐享自主下单功能，购买用户产生的销量', split:true },
  { id:'gc-leai-order-gmv',     label:'乐享-GMV',          def:'通过乐享自主下单功能，购买用户产生的交易额', split:true },
]

function geoFmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function resolveDateRange() {
  if (dateStart.value && dateEnd.value) return { start_date: dateStart.value, end_date: dateEnd.value }
  const days = period.value === '7d' ? 7 : 30
  const end = new Date(); end.setDate(end.getDate()-1)
  const start = new Date(end.getTime()-(days-1)*86400000)
  return { start_date: geoFmtDate(start), end_date: geoFmtDate(end) }
}
function initDatePicker() {
  if (dateStart.value && dateEnd.value) return
  const r = resolveDateRange(); dateStart.value = r.start_date; dateEnd.value = r.end_date
}

const statusText = computed(() => {
  const r = resolveDateRange()
  return `${PENDING} · ${r.start_date} ~ ${r.end_date} · 数据T+1更新`
})

function quickPeriod(p) {
  period.value = p; dateStart.value = ''; dateEnd.value = ''
  initDatePicker()
}
function onDateChange() {
  if (dateStart.value && dateEnd.value) period.value = null
}

onMounted(initDatePicker)
</script>
