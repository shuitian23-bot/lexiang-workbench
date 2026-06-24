<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">客户行为分析</div>
        <div class="page-desc">客户转化、流失、营销、商机等行为指标</div>
      </div>
    </div>

    <div class="demo-banner"><span class="demo-icon">💡</span> 以下为示例数据，接入埋点系统后将展示真实行为分析</div>

    <!-- 子 Tab 切换 -->
    <div class="tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</div>
    </div>

    <!-- 转化漏斗 -->
    <div v-show="activeTab === 'conversion'">
      <div class="kpi-grid" style="grid-template-columns:repeat(6,1fr);">
        <div class="kpi-card"><div class="kpi-label">浏览商品客户</div><div class="kpi-value" style="font-size:18px;">456,789</div></div>
        <div class="kpi-card"><div class="kpi-label">收藏行为客户</div><div class="kpi-value" style="font-size:18px;">123,456</div></div>
        <div class="kpi-card"><div class="kpi-label">对比行为客户</div><div class="kpi-value" style="font-size:18px;">89,012</div></div>
        <div class="kpi-card"><div class="kpi-label">加购客户</div><div class="kpi-value" style="font-size:18px;">67,890</div></div>
        <div class="kpi-card"><div class="kpi-label">未支付客户</div><div class="kpi-value" style="font-size:18px;color:var(--orange);">23,456</div></div>
        <div class="kpi-card"><div class="kpi-label">Query→转化客户</div><div class="kpi-value" style="font-size:18px;color:var(--green);">34,567</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">转化漏斗</div></div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="width:100px;font-size:12px;text-align:right;">浏览</span>
            <div style="flex:1;height:32px;background:var(--primary);border-radius:4px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;">456,789 (100%)</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="width:100px;font-size:12px;text-align:right;">收藏/对比</span>
            <div style="width:46%;height:32px;background:rgba(51,112,255,0.7);border-radius:4px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;">212,468 (46.5%)</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="width:100px;font-size:12px;text-align:right;">加购</span>
            <div style="width:15%;height:32px;background:rgba(51,112,255,0.5);border-radius:4px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;">67,890 (14.9%)</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="width:100px;font-size:12px;text-align:right;">下单</span>
            <div style="width:10%;height:32px;background:rgba(51,112,255,0.3);border-radius:4px;display:flex;align-items:center;padding:0 10px;font-size:12px;">44,434 (9.7%)</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="width:100px;font-size:12px;text-align:right;">支付</span>
            <div style="width:7.5%;height:32px;background:var(--green);border-radius:4px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;">34,567 (7.6%)</div>
          </div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">跨品类浏览客户</div></div>
          <div style="font-size:26px;font-weight:700;margin-bottom:6px;">78,901</div>
          <div style="font-size:12px;color:var(--text-secondary);">浏览 ≥2 个品类的客户，购买意向更广泛</div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">多次咨询客户</div></div>
          <div style="font-size:26px;font-weight:700;margin-bottom:6px;">45,678</div>
          <div style="font-size:12px;color:var(--text-secondary);">同一客户多次咨询，高意向客户</div>
        </div>
      </div>
    </div>

    <!-- 意向分析 -->
    <div v-show="activeTab === 'intent'">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">高意向未转化</div>
          <div class="kpi-value" style="font-size:22px;color:var(--red);">12,345</div>
          <div class="kpi-sub">多次咨询/加购但未下单</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">以旧换新咨询</div>
          <div class="kpi-value" style="font-size:22px;">8,765</div>
          <div class="kpi-sub">换机需求客户</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">企业采购咨询</div>
          <div class="kpi-value" style="font-size:22px;">3,456</div>
          <div class="kpi-sub">SMB 线索</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">推荐未采纳</div>
          <div class="kpi-value" style="font-size:22px;color:var(--orange);">15,678</div>
          <div class="kpi-sub">需优化推荐算法</div>
        </div>
      </div>
    </div>

    <!-- 流失预警 -->
    <div v-show="activeTab === 'churn'">
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card"><div class="kpi-label">咨询后离开客户</div><div class="kpi-value" style="font-size:22px;color:var(--orange);">34,567</div></div>
        <div class="kpi-card"><div class="kpi-label">流失风险客户</div><div class="kpi-value" style="font-size:22px;color:var(--red);">8,456</div></div>
        <div class="kpi-card"><div class="kpi-label">服务不满意客户</div><div class="kpi-value" style="font-size:22px;color:var(--red);">3,201</div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">流失风险客户列表</div>
          <button class="btn btn-sm btn-primary" @click="aiQuick('批量发送挽留优惠')">批量发送挽留优惠</button>
        </div>
        <table>
          <tr><th>客户</th><th>最后活跃</th><th>历史消费</th><th>风险等级</th><th>操作</th></tr>
          <tr>
            <td>用户 A***8</td><td>14 天前</td><td>¥12,890</td>
            <td><span class="badge badge-red">高</span></td>
            <td><button class="btn btn-sm btn-primary">发送优惠</button></td>
          </tr>
          <tr>
            <td>用户 B***3</td><td>21 天前</td><td>¥8,456</td>
            <td><span class="badge badge-red">高</span></td>
            <td><button class="btn btn-sm btn-primary">发送优惠</button></td>
          </tr>
          <tr>
            <td>用户 C***7</td><td>10 天前</td><td>¥5,678</td>
            <td><span class="badge badge-orange">中</span></td>
            <td><button class="btn btn-sm btn-primary">发送优惠</button></td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 营销效果 -->
    <div v-show="activeTab === 'marketing'">
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card"><div class="kpi-label">优惠券使用客户</div><div class="kpi-value" style="font-size:22px;">56,789</div></div>
        <div class="kpi-card"><div class="kpi-label">优惠券领取未使用</div><div class="kpi-value" style="font-size:22px;color:var(--orange);">45,678</div></div>
        <div class="kpi-card"><div class="kpi-label">负反馈内容</div><div class="kpi-value" style="font-size:22px;color:var(--red);">156</div></div>
      </div>
    </div>

    <!-- 会员分析 -->
    <div v-show="activeTab === 'member'">
      <div class="card">
        <div class="card-header"><div class="card-title">会员等级分布</div></div>
        <div class="bar-chart" style="height:140px;">
          <div class="bar-col"><div class="bar-value">58%</div><div class="bar" style="height:87%;background:#8f959e;"></div><div class="bar-label">普通</div></div>
          <div class="bar-col"><div class="bar-value">22%</div><div class="bar" style="height:66%;background:#c0c0c0;"></div><div class="bar-label">银卡</div></div>
          <div class="bar-col"><div class="bar-value">14%</div><div class="bar" style="height:42%;background:#ffd700;"></div><div class="bar-label">金卡</div></div>
          <div class="bar-col"><div class="bar-value">6%</div><div class="bar" style="height:18%;background:#b8860b;"></div><div class="bar-label">铂金</div></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const tabs = [
  { key: 'conversion', label: '转化漏斗' },
  { key: 'intent', label: '意向分析' },
  { key: 'churn', label: '流失预警' },
  { key: 'marketing', label: '营销效果' },
  { key: 'member', label: '会员分析' }
]

const activeTab = ref('conversion')

function aiQuick(msg) {
  if (typeof window.aiQuick === 'function') window.aiQuick(msg)
}
</script>
