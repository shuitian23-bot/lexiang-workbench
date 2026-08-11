// PRD imported admin modules for Leaibot workbench.
(function () {
  if (typeof PAGE_RENDERERS === 'undefined') return;

  const badge = (text, type = 'primary') => `<span class="prd-badge ${type}"><i></i>${text}</span>`;
  const stat = (label, value, sub, type = '') => `
    <div class="prd-stat ${type}">
      <div class="prd-stat-label">${label}</div>
      <div class="prd-stat-value">${value}</div>
      <div class="prd-stat-sub">${sub}</div>
    </div>`;
  const pageHead = (title, desc, actions = '') => `
    <div class="page-header">
      <div>
        <div class="page-title">${title}</div>
        <div class="page-desc">${desc}</div>
      </div>
      <div class="prd-head-actions">${actions}</div>
    </div>`;
  const filterCard = (items, extraClass = '') => `<div class="prd-filter-card ${extraClass}"><div class="prd-filter-grid">${items}</div></div>`;
  const table = (heads, rows, minWidth = 960) => `
    <div class="prd-table-wrap">
      <table class="prd-data-table" style="min-width:${minWidth}px">
        <thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
  const leadShell = html => `<div class="prd-lead-0615">${html}</div>`;

  window.switchLeadDashboardTab = function (tab, el) {
    const root = (el && el.closest('.page-content')) || document;
    root.querySelectorAll('.prd-tabs[data-tab-group="lead-dashboard"] button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    root.querySelectorAll('[data-lead-dashboard-panel]').forEach(panel => {
      panel.style.display = panel.dataset.leadDashboardPanel === tab ? '' : 'none';
    });
  };

  function renderLeadDashboard() {
    return leadShell(`
      ${pageHead('线索看板', '按整体看板、线索质量、销售团队漏斗查看线索经营状态',
        '<button class="btn btn-secondary">导出看板</button><button class="btn btn-primary">查看分配明细</button>')}
      ${filterCard(`
        <input class="ops-input" placeholder="搜索销售 / 团队 / ONE ID">
        <select class="ops-select"><option>运营全量视图</option><option>Leader 权限视图</option><option>Sales 个人视图</option></select>
        <select class="ops-select"><option>销售团队 - 全部</option><option>北京 IS</option><option>成都 IS</option></select>
        <select class="ops-select"><option>产品组 - 全部</option><option>84-TPP</option><option>46-服务</option></select>
        <select class="ops-select"><option>线索来源 - 全部</option><option>官网传递</option><option>AI营销</option><option>批量导入</option></select>
        <button class="btn btn-primary">查询</button>
      `)}
      <div class="prd-tabs" data-tab-group="lead-dashboard">
        <button class="active" data-tab="overview" onclick="switchLeadDashboardTab('overview', this)">整体看板</button>
        <button data-tab="quality" onclick="switchLeadDashboardTab('quality', this)">线索质量看板</button>
        <button data-tab="team" onclick="switchLeadDashboardTab('team', this)">销售团队漏斗</button>
      </div>
      <div data-lead-dashboard-panel="overview">
        <div class="kpi-grid">
          ${stat('IQL 线索池总量', '18,642', '官网传递 / AI营销 / 自挖掘')}
          ${stat('MQL 已分配线索量', '9,826', '分配率 52.7%', 'success')}
          ${stat('SQL 线索接收量', '4,338', '接收率 44.1%', 'purple')}
          ${stat('OPP 商机条数', '1,092', '转商机率 25.2%', 'orange')}
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><span class="card-title">IQL → MQL → SQL → OPP 漏斗</span><span class="dash-card-note">节点间展示转化率</span></div>
            <div class="prd-funnel">
              <div><b>IQL</b><strong>18,642</strong><span>100%</span></div>
              <div><b>MQL</b><strong>9,826</strong><span>52.7%</span></div>
              <div><b>SQL</b><strong>4,338</strong><span>44.1%</span></div>
              <div><b>OPP</b><strong>1,092</strong><span>25.2%</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title">来源与质量分布</span><span class="dash-card-note">筛选联动</span></div>
            <div class="prd-bars">
              <div class="prd-bar-row"><span>官网注册</span><div><i style="width:76%;background:#3f78c5"></i></div><b>7,624</b></div>
              <div class="prd-bar-row"><span>AI营销</span><div><i style="width:58%;background:#58a86a"></i></div><b>5,892</b></div>
              <div class="prd-bar-row"><span>批量导入</span><div><i style="width:36%;background:#c89532"></i></div><b>3,226</b></div>
              <div class="prd-bar-row"><span>自挖掘</span><div><i style="width:22%;background:#9070c3"></i></div><b>1,900</b></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">销售团队漏斗明细</span><span class="dash-card-note">支持点击团队进入明细</span></div>
          ${table(['团队', '负责人', 'IQL', 'MQL', 'SQL', 'OPP', '成交 GMV', '操作'], [
            ['北京 IS', 'peicui2', '6,234', '3,018', '1,244', '318', '¥ 894.6 万', '<a>查看</a>'],
            ['成都 IS', 'xuhq5', '4,882', '2,506', '998', '251', '¥ 623.1 万', '<a>查看</a>'],
            ['华南 IS', 'liuyt8', '3,921', '2,014', '836', '206', '¥ 488.8 万', '<a>查看</a>']
          ])}
        </div>
      </div>
      <div data-lead-dashboard-panel="quality" style="display:none">
        <div class="kpi-grid">
          ${stat('高质量线索', '6,284', '线索分 ≥ 80', 'success')}
          ${stat('待补充信息', '2,146', '企业名称 / 联系方式缺失', 'orange')}
          ${stat('低意向线索', '1,058', '30 天无有效行为', 'red')}
          ${stat('平均线索分', '74.6', '较上周 +3.8', 'purple')}
        </div>
        <div class="grid-2">
          <div class="card"><div class="card-header"><span class="card-title">质量分布</span></div><div class="prd-bars">
            <div class="prd-bar-row"><span>90-100</span><div><i style="width:34%;background:#58a86a"></i></div><b>2,184</b></div>
            <div class="prd-bar-row"><span>80-89</span><div><i style="width:64%;background:#3f78c5"></i></div><b>4,100</b></div>
            <div class="prd-bar-row"><span>60-79</span><div><i style="width:42%;background:#c89532"></i></div><b>3,226</b></div>
            <div class="prd-bar-row"><span>&lt;60</span><div><i style="width:18%;background:#d24a4a"></i></div><b>1,058</b></div>
          </div></div>
          <div class="card">${table(['质量问题', '数量', '占比', '建议动作'], [
            ['手机号缺失', '842', '39.2%', '补全企业联系方式'],
            ['企业主体未识别', '618', '28.8%', '关联 ONE ID / 企业库'],
            ['近 30 天无行为', '686', '32.0%', '进入唤醒池']
          ], 680)}</div>
        </div>
      </div>
      <div data-lead-dashboard-panel="team" style="display:none">
        <div class="kpi-grid">
          ${stat('团队接收率', '44.1%', 'SQL / MQL', 'success')}
          ${stat('平均跟进时长', '18.6h', '较上周 -2.4h', 'purple')}
          ${stat('退回线索', '426', '需运营复核', 'orange')}
          ${stat('成交 GMV', '2,006.5万', '来自 775 条商机')}
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">销售团队漏斗</span><span class="dash-card-note">按团队展示 IQL-MQL-SQL-OPP 转化</span></div>
          ${table(['团队', '负责人', 'MQL 接收率', 'SQL 转化率', 'OPP 转化率', '退回率', '下一步动作'], [
            ['北京 IS', 'peicui2', '48.4%', '41.2%', '25.6%', '3.1%', '<a>查看团队</a>'],
            ['成都 IS', 'xuhq5', '51.3%', '39.8%', '25.1%', '2.8%', '<a>查看团队</a>'],
            ['华南 IS', 'liuyt8', '49.6%', '41.5%', '24.6%', '3.4%', '<a>查看团队</a>']
          ], 920)}
        </div>
      </div>`);
  }

  function renderLeadPool() {
    return leadShell(`
      ${pageHead('线索池', '线索列表管理、分配、触达、反馈线索和转商机',
        '<button class="btn btn-secondary">明文导出审批</button><button class="btn btn-secondary">批量触达</button><button class="btn btn-primary">分配线索</button>')}
      <div class="kpi-grid">
        ${stat('线索总量', '42,186', '全量企业用户与企业站访问用户')}
        ${stat('待分配', '8,214', '运营可重新分配', 'orange')}
        ${stat('已分配', '23,087', '点击查看分配明细', 'success')}
        ${stat('已退回', '1,452', '仅运营可重新分配', 'red')}
      </div>
      ${filterCard(`
        <input class="ops-input" placeholder="ONE ID / 姓名 / Lenovo ID">
        <select class="ops-select"><option>线索状态 - 全部</option><option>已接收</option><option>跟进中</option><option>已退回</option></select>
        <select class="ops-select"><option>分配状态 - 全部</option><option>待分配</option><option>已分配</option></select>
        <select class="ops-select"><option>产品类别 - 全部</option><option>TP</option><option>BEY</option><option>服务</option><option>选件</option></select>
        <select class="ops-select"><option>一级来源 - 全部</option><option>官网传递</option><option>AI营销</option><option>自挖掘</option></select>
        <button class="btn btn-primary">搜索</button>
      `)}
      <div class="prd-batch-bar">
        ${badge('已选 0 条', 'gray')}<span>分配不改变线索状态，线索状态仅由反馈线索更新。</span>
      </div>
      <div class="card">
        ${table(['ONE ID', '姓名', 'Lenovo ID', '企业名称', '线索分', '分配状态', '线索状态', '所属 IS', '操作'], [
          ['ONE20260605001', '王思佳', 'L44271098', '联想集团', '86', badge('已分配', 'success'), badge('跟进中', 'primary'), 'peicui2', '<a>详情</a><a>反馈线索</a><a>转商机</a>'],
          ['ONE20260605002', '赵九', 'L36099188', '北京中嘉和信通信技术有限公司', '73', badge('待分配', 'orange'), badge('未接收', 'gray'), '-', '<a>详情</a><a>分配</a>'],
          ['ONE20260605003', '周五', 'L61356183', '深圳汽车科技有限公司', '68', badge('已分配', 'success'), badge('已接收', 'primary'), 'xuhq5', '<a>详情</a><a>反馈线索</a><a>转商机</a>']
        ], 1180)}
      </div>`);
  }

})();
