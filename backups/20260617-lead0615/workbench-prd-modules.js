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
    return `
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
      </div>`;
  }

  function renderLeadPool() {
    return `
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
      </div>`;
  }

  const searchRows = {
    categories: [['产品介绍 / 笔记本', 'NB-INTRO', '否', '12', badge('已发布', 'success'), '王运营', '2026-06-04 16:20', '<a>编辑</a><a>发布</a>'], ['产品销售 / ThinkPad', 'SALE-TP', '否', '8', badge('草稿', 'orange'), '李品类', '2026-06-04 11:02', '<a>编辑</a><a>发布</a>']],
    filters: [['屏幕尺寸', '单选', 'screen_size', '笔记本', '6', '14 / 16 / 18 英寸', '<a>编辑</a><a>导出</a>'], ['处理器', '多选', 'cpu', '台式机', '12', 'Ultra 7 / AI 9 / i7', '<a>编辑</a><a>导出</a>']],
    activity: [['618 ThinkPad 会场', 'thinkpad, t14p', badge('生效中', 'success'), '活动卡片', 'PC/H5/APP', '2026-06-01 至 2026-06-18', '<a>编辑</a><a>日志</a>'], ['国补会场直达', '国补, 补贴', badge('待发布', 'orange'), 'URL 直达', 'PC/H5', '2026-06-05 至 2026-07-31', '<a>编辑</a><a>发布</a>']],
    express: [['ADG20260601', 'ThinkPad 高转化词包', badge('生效中', 'success'), '联想商城', 'thinkpad,t14p,x1', '3 张', '2026-06-01 至 2026-06-30', '<a>编辑</a><a>停用</a>'], ['ADG20260602', 'AI PC 新品', badge('草稿', 'gray'), '乐享商城', 'aipc,ai电脑', '2 张', '2026-06-10 至 2026-07-10', '<a>编辑</a><a>发布</a>']],
    dictionary: [['纠错词', 'thinkapd', 'thinkpad', '联想商城', badge('有效', 'success'), '2026-06-04', '<a>编辑</a><a>删除</a>'], ['同义词', '小新, ideapad', '双向召回', '全商城', badge('有效', 'success'), '2026-06-03', '<a>编辑</a><a>删除</a>']],
    box: [['默认搜索词', 'AI PC 至高优惠', '首页搜索框', 'PC/H5', badge('生效中', 'success'), '2026-06-01 至 2026-06-18', '<a>编辑</a><a>排序</a>'], ['热搜词', 'thinkplus 充电器', '热搜榜', 'APP/小程序', badge('待发布', 'orange'), '2026-06-06 至 2026-06-30', '<a>编辑</a><a>发布</a>']]
  };

  function renderSearchPage(type, title, desc, heads) {
    return `
      ${pageHead(title, desc, '<button class="btn btn-secondary">操作日志</button><button class="btn btn-primary">新增配置</button>')}
      ${filterCard(`
        <input class="ops-input" placeholder="关键词 / 编码 / 配置名称">
        <select class="ops-select"><option>商城 - 全部</option><option>联想商城</option><option>乐享商城</option></select>
        <select class="ops-select"><option>终端 - 全部</option><option>PC</option><option>H5</option><option>APP</option><option>小程序</option></select>
        <select class="ops-select"><option>状态 - 全部</option><option>生效中</option><option>待发布</option><option>草稿</option></select>
        <input class="ops-date-input" type="date">
        <button class="btn btn-primary">查询</button>
      `)}
      <div class="card">${table(heads, searchRows[type], 1080)}</div>`;
  }

  function renderRiskOverview() {
    return `
      ${pageHead('风控概况', '平台级风险态势、策略命中、拦截趋势与预警监控',
        '<button class="btn btn-secondary">刷新</button><button class="btn btn-primary">导出日报</button>')}
      <div class="kpi-grid">
        ${stat('今日调用量', '2,846,120', '每 5 分钟聚合一次')}
        ${stat('拦截量', '18,426', '拦截率 0.65%', 'orange')}
        ${stat('高危账户', '1,284', '较昨日 -6.2%', 'red')}
        ${stat('生效策略', '96', '运行正常 91 条', 'success')}
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><span class="card-title">拦截构成</span></div><div class="prd-bars">
          <div class="prd-bar-row"><span>下单风险</span><div><i style="width:82%;background:#d24a4a"></i></div><b>7,912</b></div>
          <div class="prd-bar-row"><span>优惠券风险</span><div><i style="width:58%;background:#c47f24"></i></div><b>5,604</b></div>
          <div class="prd-bar-row"><span>登录异常</span><div><i style="width:37%;background:#d24a4a"></i></div><b>3,118</b></div>
          <div class="prd-bar-row"><span>DPL 命中</span><div><i style="width:18%;background:#9070c3"></i></div><b>422</b></div>
        </div></div>
        <div class="card"><div class="card-header"><span class="card-title">实时事件流</span></div>
          ${table(['时间', '场景', '账户', '风险等级', '处置'], [
            ['17:08:22', '下单', '153****7206', badge('高危', 'red'), '禁止下单'],
            ['17:07:54', '优惠券', '180****8855', badge('中危', 'orange'), '禁止用券'],
            ['17:06:31', '登录', '138****2568', badge('低危', 'primary'), '验证码挑战']
          ], 720)}
        </div>
      </div>`;
  }

  function renderRiskList(title, desc, heads, rows) {
    return `
      ${pageHead(title, desc, '<button class="btn btn-secondary">导出</button><button class="btn btn-primary">新增</button>')}
      ${filterCard(`
        <input class="ops-input" placeholder="策略 / 对象 / 账户 / 记录 ID">
        <select class="ops-select"><option>场景 - 全部</option><option>注册</option><option>登录</option><option>下单</option><option>优惠券</option></select>
        <select class="ops-select"><option>状态 - 全部</option><option>生效</option><option>待审核</option><option>已失效</option></select>
        <select class="ops-select"><option>风险等级 - 全部</option><option>高危</option><option>中危</option><option>低危</option></select>
        <input class="ops-date-input" type="date">
        <button class="btn btn-primary">查询</button>
      `)}
      <div class="card">${table(heads, rows, 1120)}</div>`;
  }

  Object.assign(PAGE_RENDERERS, {
    'lead.dashboard': renderLeadDashboard,
    'lead.pool': renderLeadPool,
    'search.categories': () => renderSearchPage('categories', '分类标签', '维护产品介绍与产品销售分类树、叶子节点、排序、发布状态和绑定关系', ['分类名称', '分类编码', '叶子节点', '排序', '发布状态', '操作人', '更新时间', '操作']),
    'search.filters': () => renderSearchPage('filters', '筛选条件', '维护筛选标签、参数名称、显示值和对应值，支撑前台筛选联动', ['标签名称', '筛选类型', '参数名称', '适用设备', '参数值数量', '示例值', '操作']),
    'search.activity': () => renderSearchPage('activity', '活动直达', '配置关键词命中后的 URL 直达、活动卡片、通栏和子模块', ['活动名称', '关键词', '状态', '形态', '终端', '有效期', '操作']),
    'search.express': () => renderSearchPage('express', '直通车', '配置广告组、关键词、图片项和展示周期', ['组 ID', '组名', '状态', '商城', '关键词', '图片项', '展示周期', '操作']),
    'search.dictionary': () => renderSearchPage('dictionary', '词典管理', '维护纠错词、同义词、转换词、停用词等搜索召回前处理规则', ['类型', '原词/词组', '处理结果', '商城', '状态', '更新时间', '操作']),
    'search.box': () => renderSearchPage('box', '搜索框管理', '维护默认搜索词、热搜词、下拉词、快速链接词和热搜榜', ['类型', '关键词', '页面范围', '终端', '状态', '有效期', '操作']),
    'risk.overview': renderRiskOverview,
    'risk.strategy': () => renderRiskList('策略管理', '策略列表、策略审核、异常地址/邮箱、策略黑白名单', ['策略名称', '场景', '风险类型', '处置动作', '状态', '命中量', '更新时间', '操作'], [
      ['下单高危设备拦截', '下单', '设备聚集', '禁止下单', badge('生效', 'success'), '8,912', '2026-06-05 10:20', '<a>详情</a><a>停用</a>'],
      ['优惠券异常领取', '优惠券', '批量领取', '禁止用券', badge('待审核', 'orange'), '2,184', '2026-06-05 09:12', '<a>审核</a><a>编辑</a>']
    ]),
    'risk.limit': () => renderRiskList('限购管理', '商品限购、活动限购、券码限购、相似地址与名单维护', ['规则名称', '类型', '限制维度', '周期/次数', '适用范围', '状态', '更新时间', '操作'], [
      ['国补笔记本限购', '商品限购', '同账户 + 同地址', '30 天 / 1 次', '笔记本 / 国补', badge('生效', 'success'), '2026-06-04', '<a>详情</a><a>编辑</a>'],
      ['618 抽奖限购', '活动限购', '同手机号', '1 天 / 3 次', '活动 ACT618', badge('生效', 'success'), '2026-06-03', '<a>详情</a><a>名单</a>']
    ]),
    'risk.dpl': () => renderRiskList('DPL', '受限当事人清单审批、实体维护与命中追踪', ['审批/实体 ID', '实体名称', '国家/地区', '风险等级', '状态', '申请人', '更新时间', '操作'], [
      ['DPL20260605001', 'Acme Trading LLC', 'US', badge('高危', 'red'), badge('待审批', 'orange'), '王运营', '2026-06-05', '<a>审批</a><a>详情</a>'],
      ['ENT20260604012', 'Global Sample Co.', 'SG', badge('中危', 'orange'), badge('生效', 'success'), '合规组', '2026-06-04', '<a>详情</a><a>停用</a>']
    ]),
    'risk.data': () => renderRiskList('数据查询', '全局数据、策略数据、限购数据、DPL 数据、验证码、地址与邮箱查询', ['记录 ID', '账户', '场景', '命中策略', '风险等级', '处置结果', '请求时间', '操作'], [
      ['RISK202606050001', '153****7206', '下单', '下单高危设备拦截', badge('高危', 'red'), '禁止下单', '2026-06-05 17:08:22', '<a>详情</a><a>复制 ID</a>'],
      ['RISK202606050002', '180****8855', '优惠券', '优惠券异常领取', badge('中危', 'orange'), '禁止用券', '2026-06-05 17:07:54', '<a>详情</a><a>标白</a>']
    ])
  });
})();
