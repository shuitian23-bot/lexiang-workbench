// ===== 乐享 Pipeline 页面模块 =====
// 适配 workbench admin：API 走 /api/pipeline/，echarts 走 /admin/assets/

// ===== 额外样式（内联） =====
(function() {
  if (document.getElementById('pipeline-extra-style')) return;
  const s = document.createElement('style');
  s.id = 'pipeline-extra-style';
  s.textContent = `
    .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500; }
    .badge.status-on { background:var(--green-light,#e8f5e9); color:var(--green,#34c724); }
    .badge.status-off { background:var(--red-light,#fce4ec); color:var(--red,#e2001a); }
    .badge.status-warn { background:var(--orange-light,#fff3e0); color:var(--orange,#ff7d00); }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
    .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }
    .ops-section-title { font-size:14px; font-weight:600; margin:20px 0 12px; padding-left:8px; border-left:3px solid var(--primary); }
    .ops-kpi { background:var(--card-bg); border:1px solid var(--border-light); border-radius:var(--radius); padding:16px; text-align:center; }
    .ops-kpi-val { font-size:24px; font-weight:700; color:var(--text); margin:4px 0; }
    .ops-kpi-label { font-size:12px; color:var(--text-tertiary); }
    .ops-kpi-sub { font-size:11px; color:var(--text-tertiary); margin-top:4px; }
    .ops-kpi.highlight { border-color:var(--primary); }
    .ops-card { background:var(--card-bg); border:1px solid var(--border-light); border-radius:var(--radius); padding:16px; }
    .ops-card h3 { font-size:13px; font-weight:600; margin-bottom:12px; }
    .spinner { display:inline-block; border:2px solid var(--border-light); border-top-color:var(--primary); border-radius:50%; width:16px; height:16px; animation:spin 0.8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `;
  document.head.appendChild(s);
})();

// ===== Dashboard 状态 =====
let _availableDates = []; // 有数据的日期列表
let _dashCharts = {};
let _dashRecords = [];
let _allRecords = [];
let _dateFrom = '';
let _dateTo = '';
let _trendFrom = '';
let _trendTo = '';
let _tagTrendFrom = '';
let _tagTrendTo = '';
let _apTrendFrom = '';
let _apTrendTo = '';
let _atTrendFrom = '';
let _atTrendTo = '';
let _autoRefreshTimer = null;
let _tag3Mode = 'active';
let _hotMode = 'active';

const TAG_COLORS = {'电商':'#3370ff','服务':'#34c724','会员':'#722ed1','门店':'#ff7d00','咨询':'#e2001a','其他':'#8f959e','多模态':'#00b578'};
const PALETTE = ['#3370ff','#34c724','#722ed1','#ff7d00','#e2001a','#8f959e','#00b578','#f59e0b','#ec4899','#14b8a6'];
const TAG_ORDER = ['电商','服务','会员','门店','咨询','其他','多模态'];
function tagColor(name) { return TAG_COLORS[name] || PALETTE[Object.keys(TAG_COLORS).indexOf(name) % PALETTE.length]; }
const AP_COLOR = {'主动':'#3370ff','被动':'#ff7d00','口令活动':'#e2001a'};

// ===== PAGE RENDERERS =====

// ──────────────── 智能标注（看板首页 + 标注功能）────────────────
PAGE_RENDERERS['pipeline.annotate'] = () => `
    <div class="page-header">
      <div><div class="page-title">Query 分析</div>
      <div class="page-desc">智能体交互数据深度分析</div></div>
      <div style="display:flex;gap:6px;align-items:center">
        <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
          <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">FROM</span>
          <input type="date" id="dateFrom" style="padding:1px 4px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center" onchange="applyDateFilter()">
        </div>
        <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
          <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">TO</span>
          <input type="date" id="dateTo" style="padding:1px 4px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center" onchange="applyDateFilter()">
        </div>
        <button class="btn btn-primary" style="padding:3px 10px;font-size:11px;border-radius:5px" onclick="applyDateFilter()">筛选</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" onclick="clearDateFilter()">清除</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" onclick="refreshDashboard()" title="刷新">&#8635;</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" onclick="downloadExcel()" title="下载Excel">&#8595;</button>
        <button class="btn btn-primary" style="padding:3px 10px;font-size:11px;border-radius:5px" onclick="document.getElementById('anno-upload').click()">上传</button>
      </div>
    </div>
    <input type="file" id="anno-upload" accept=".xlsx,.xls,.csv" style="display:none"
      onchange="pipelineAnnotate(this.files[0])">

    <div class="kpi-grid" style="grid-template-columns:repeat(8,1fr)">
      <div class="kpi-card"><div class="kpi-label">Query 总数</div><div class="kpi-value" style="color:var(--primary);font-size:20px" id="dk-total">--</div></div>
      <div class="kpi-card"><div class="kpi-label">昨日 Query</div><div class="kpi-value" style="color:var(--primary);font-size:20px" id="dk-yday">--</div></div>
      <div class="kpi-card"><div class="kpi-label">总用户数</div><div class="kpi-value" style="color:var(--orange);font-size:20px" id="dk-users">--</div></div>
      <div class="kpi-card"><div class="kpi-label">总对话数</div><div class="kpi-value" style="color:var(--green);font-size:20px" id="dk-sessions">--</div></div>
      <div class="kpi-card"><div class="kpi-label">好评·客服</div><div class="kpi-value" style="color:var(--green);font-size:20px" id="dk-gcs">--</div></div>
      <div class="kpi-card"><div class="kpi-label">好评·原生</div><div class="kpi-value" style="color:var(--green);font-size:20px" id="dk-gn">--</div></div>
      <div class="kpi-card"><div class="kpi-label">差评·客服</div><div class="kpi-value" style="color:var(--red);font-size:20px" id="dk-bcs">--</div></div>
      <div class="kpi-card"><div class="kpi-label">差评·原生</div><div class="kpi-value" style="color:var(--red);font-size:20px" id="dk-bn">--</div></div>
    </div>

    <div style="margin-top:16px">
      <div class="grid-2">
        <div class="card"><div class="card-header"><div class="card-title">一级分类·整体</div></div><div id="cTagAll" style="height:300px"></div></div>
        <div class="card"><div class="card-header"><div class="card-title">一级分类·主动语义</div></div><div id="cTagSem" style="height:300px"></div></div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card"><div class="card-header"><div class="card-title">渠道分布</div></div><div id="cChannel" style="height:300px"></div></div>
        <div class="card"><div class="card-header">
          <div class="card-title">三级分类 TOP20</div>
          <div style="display:flex;gap:4px;margin-left:auto;background:var(--bg);border-radius:6px;padding:2px">
            <span style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)" id="tag3-tab-active" onclick="switchTag3Mode('active')">主动</span>
            <span style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)" id="tag3-tab-nokouling" onclick="switchTag3Mode('nokouling')">去口令</span>
          </div>
        </div><div id="cTag3" style="height:300px"></div></div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><div class="card-title">日度查询量趋势</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
            <span style="font-size:10px">从</span><input type="date" id="trendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <span style="font-size:10px">至</span><input type="date" id="trendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" onclick="applyTrendFilter('daily')">确定</button>
          </div>
        </div>
        <div id="cDaily" style="height:280px"></div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><div class="card-title">场景分布趋势</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
            <span style="font-size:10px">从</span><input type="date" id="tagTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <span style="font-size:10px">至</span><input type="date" id="tagTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" onclick="applyTrendFilter('tag')">确定</button>
          </div>
        </div>
        <div id="cTagTrend" style="height:280px"></div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-header"><div class="card-title">主被动 Query 趋势</div>
            <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
              <span style="font-size:10px">从</span><input type="date" id="apTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <span style="font-size:10px">至</span><input type="date" id="apTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" onclick="applyTrendFilter('ap')">确定</button>
            </div>
          </div>
          <div id="cApTrend" style="height:280px"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">主动场景变化趋势</div>
            <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
              <span style="font-size:10px">从</span><input type="date" id="atTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <span style="font-size:10px">至</span><input type="date" id="atTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" onclick="applyTrendFilter('at')">确定</button>
            </div>
          </div>
          <div id="cAtTrend" style="height:280px"></div>
        </div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">热门 Query TOP10</div>
            <div style="display:flex;gap:4px;margin-left:auto;background:var(--bg);border-radius:6px;padding:2px">
              <span style="padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)" id="hot-tab-all" onclick="switchHotMode('all')">全部</span>
              <span style="padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)" id="hot-tab-active" onclick="switchHotMode('active')">主动</span>
              <span style="padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)" id="hot-tab-passive" onclick="switchHotMode('passive')">被动</span>
            </div>
          </div>
          <div style="overflow-y:auto;max-height:300px">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr><th style="text-align:left;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);width:28px">#</th><th style="text-align:left;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light)">Query</th><th style="text-align:right;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);width:60px">频次</th></tr></thead>
              <tbody id="hot-table-body"></tbody>
            </table>
          </div>
        </div>
        <div class="card"><div class="card-header"><div class="card-title">商品咨询 TOP20</div></div><div id="cProduct" style="height:300px"></div></div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card"><div class="card-header"><div class="card-title">来源分布</div></div><div id="cSource" style="height:300px"></div></div>
        <div class="card"><div class="card-header"><div class="card-title">终端类型分布</div></div><div id="cMedium" style="height:300px"></div></div>
      </div>
    </div>
  `;

// ──────────────── 标注任务页面（上传后跳转）────────────────
PAGE_RENDERERS['pipeline.task'] = () => `
    <div class="page-header">
      <div><div class="page-title" id="task-page-title">任务</div>
      <div class="page-desc" id="task-page-desc">标注进度与结果</div></div>
      <div style="display:flex;gap:6px;margin-left:auto">
        <button class="btn btn-primary" style="padding:3px 12px;font-size:11px;border-radius:5px" onclick="document.getElementById('task-upload').click()">上传标注</button>
        <button class="btn btn-secondary" style="padding:3px 12px;font-size:11px;border-radius:5px" onclick="loadTaskHistory()">历史记录</button>
        <button class="btn btn-secondary" style="padding:3px 12px;font-size:11px;border-radius:5px" onclick="switchPage('pipeline.annotate')">← 返回看板</button>
      </div>
    </div>
    <input type="file" id="task-upload" accept=".xlsx,.xls,.csv" style="display:none"
      onchange="pipelineAnnotate(this.files[0])">

    <div id="task-panel">
      <div class="card" id="task-file-info" style="border-color:var(--primary);background:var(--primary-light)">
        <div style="padding:12px 16px;display:flex;align-items:center;gap:12px">
          <span style="font-size:18px">📁</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" id="task-filename"></div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px" id="task-file-meta"></div>
          </div>
          <div id="task-file-status"></div>
        </div>
      </div>
      <div class="card" style="margin-top:12px" id="task-progress-card">
        <div class="card-header">
          <div class="card-title">标注进度</div>
          <button class="btn btn-sm btn-secondary" style="padding:2px 10px;font-size:11px;border-radius:4px;color:var(--red);border-color:var(--red);display:none" id="task-cancel-btn" onclick="cancelAnnoTask()">取消标注</button>
        </div>
        <div style="padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="flex:1;background:var(--bg);border-radius:6px;height:8px;overflow:hidden">
              <div id="task-progress-bar" style="height:100%;background:var(--primary);border-radius:6px;width:0%;transition:width 0.5s"></div>
            </div>
            <span id="task-progress-pct" style="font-size:11px;color:var(--text-tertiary);min-width:32px;text-align:right">0%</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:12px">
            <div class="spinner" id="task-spinner" style="width:14px;height:14px;border:2px solid var(--border-light);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite"></div>
            <span id="task-progress-text" style="color:var(--text-secondary)">准备中...</span>
            <span id="task-progress-eta" style="color:var(--text-tertiary);font-size:11px;margin-left:auto"></span>
          </div>
        </div>
      </div>
      <div id="task-result" style="display:none">
        <div class="card" style="margin-top:12px">
          <div class="card-header">
            <div class="card-title">标注结果</div>
            <div style="display:flex;gap:6px;margin-left:auto">
              <button class="btn btn-sm btn-primary" style="padding:3px 12px;font-size:11px;border-radius:5px" onclick="downloadAnnoResult()">下载</button>
              <button class="btn btn-sm btn-secondary" style="padding:3px 12px;font-size:11px;border-radius:5px" onclick="aiQuick('总结标注结果')">AI 总结</button>
            </div>
          </div>
          <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:0" id="task-kpi-grid"></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-header"><div class="card-title">一级分类·整体</div></div><div id="task-tag-chart" style="height:300px"></div><div id="task-tag-summary" style="padding:0 16px 12px;font-size:11px;color:var(--text-secondary)"></div></div>
          <div class="card"><div class="card-header"><div class="card-title">一级分类·主动语义</div></div><div id="task-tag-sem-chart" style="height:300px"></div><div id="task-tag-sem-summary" style="padding:0 16px 12px;font-size:11px;color:var(--text-secondary)"></div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-header"><div class="card-title">主动 vs 被动占比</div></div><div id="task-active-pie" style="height:280px"></div><div id="task-active-summary" style="padding:0 16px 12px;font-size:11px;color:var(--text-secondary)"></div></div>
          <div class="card">
            <div class="card-header"><div class="card-title">商品咨询 TOP20</div></div>
            <div id="task-product-table" style="overflow-y:auto;max-height:300px"></div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:12px;display:none" id="task-history-card">
        <div class="card-header">
          <div class="card-title">标注历史</div>
          <span id="task-history-page-info" style="font-size:11px;color:var(--text-tertiary);margin-left:auto"></span>
        </div>
        <div id="task-history-list" style="padding:0"></div>
        <div id="task-history-pager" style="padding:8px 16px;display:flex;justify-content:center;gap:4px"></div>
      </div>
    </div>
  `;

// ──────────────── 统计分析（AI助手导航进入）────────────────
PAGE_RENDERERS['pipeline.stats'] = () => `
    <div class="page-header">
      <div><div class="page-title">统计分析</div>
      <div class="page-desc">上传已标注文件查看分类分布，或查看历史趋势</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="document.getElementById('stats-upload').click()">上传标注文件</button>
        <button class="btn btn-secondary" onclick="loadPipelineHistory()">刷新历史</button>
        <button class="btn btn-secondary" onclick="switchPage('pipeline.annotate')">← 返回看板</button>
      </div>
    </div>
    <input type="file" id="stats-upload" accept=".xlsx,.xls,.csv" style="display:none"
      onchange="pipelineStats(this.files[0])">

    <div id="stats-result" style="display:none;margin-bottom:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">当前文件统计</div></div>
        <div id="stats-current"></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">历史统计趋势</div></div>
      <div id="stats-history">
        <div style="text-align:center;padding:30px;color:var(--text-tertiary)">加载中...</div>
      </div>
    </div>
  `;

// ──────────────── 口令过滤（AI助手导航进入）────────────────
PAGE_RENDERERS['pipeline.filter'] = () => `
    <div class="page-header">
      <div><div class="page-title">口令过滤</div>
      <div class="page-desc">多文件合并 → 过滤access_channel含auto → 剔除口令类query</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="document.getElementById('filter-upload').click()">上传文件</button>
        <button class="btn btn-secondary" onclick="switchPage('pipeline.annotate')">← 返回看板</button>
      </div>
    </div>
    <input type="file" id="filter-upload" accept=".xlsx,.xls" multiple style="display:none"
      onchange="pipelineFilter(this.files)">

    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi-card"><div class="kpi-label">过滤规则1</div><div class="kpi-value" style="font-size:16px">去auto</div></div>
      <div class="kpi-card"><div class="kpi-label">过滤规则2</div><div class="kpi-value" style="font-size:16px">去口令</div></div>
      <div class="kpi-card"><div class="kpi-label">输出</div><div class="kpi-value" style="font-size:16px">Excel</div></div>
    </div>

    <div id="filter-progress" style="display:none" class="card">
      <div class="card-header"><div class="card-title">过滤进度</div></div>
      <div id="filter-progress-body" style="padding:12px"></div>
    </div>

    <div id="filter-result" style="display:none;margin-top:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">过滤结果</div></div>
        <div id="filter-result-body"></div>
      </div>
    </div>
  `;

// ──────────────── 监控看板（AI助手导航进入）────────────────
PAGE_RENDERERS['pipeline.monitor'] = () => `
    <div class="page-header">
      <div><div class="page-title">监控看板</div>
      <div class="page-desc">Pipeline 自动化控制 + 运行状态 + 历史趋势</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="loadPipelineHistory()">刷新</button>
        <button class="btn btn-secondary" onclick="switchPage('pipeline.annotate')">← 返回看板</button>
      </div>
    </div>

    <!-- Pipeline 控制 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div class="card-title">流水线控制</div>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <input type="text" id="pl-watch-dir" placeholder="监控目录（默认 D:\\全量数据）" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;width:200px">
          <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="pl-skip-existing" checked> 跳过已处理</label>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding:0 16px 16px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="pipelineAction('monitor/start')" id="pl-btn-monitor">启动监控</button>
        <button class="btn btn-secondary" onclick="pipelineAction('batch')" id="pl-btn-batch">批量处理</button>
        <button class="btn btn-primary" style="background:var(--green)" onclick="pipelineAction('start')" id="pl-btn-pipeline">启动流水线</button>
        <button class="btn btn-secondary" style="color:var(--red);border-color:var(--red)" onclick="pipelineAction('monitor/stop')" id="pl-btn-stop">停止</button>
      </div>
    </div>

    <!-- 运行状态 -->
    <div class="kpi-grid" style="grid-template-columns:repeat(6,1fr);margin-bottom:16px">
      <div class="kpi-card highlight"><div class="kpi-label">运行状态</div><div class="kpi-value" style="font-size:16px" id="pl-state-status">-</div></div>
      <div class="kpi-card"><div class="kpi-label">模式</div><div class="kpi-value" style="font-size:16px" id="pl-state-mode">-</div></div>
      <div class="kpi-card"><div class="kpi-label">已处理</div><div class="kpi-value" style="font-size:20px;color:var(--green)" id="pl-state-processed">0</div></div>
      <div class="kpi-card"><div class="kpi-label">失败</div><div class="kpi-value" style="font-size:20px;color:var(--red)" id="pl-state-failed">0</div></div>
      <div class="kpi-card"><div class="kpi-label">跳过</div><div class="kpi-value" style="font-size:20px;color:var(--text-tertiary)" id="pl-state-skipped">0</div></div>
      <div class="kpi-card"><div class="kpi-label">当前文件</div><div class="kpi-value" style="font-size:14px" id="pl-state-current">-</div></div>
    </div>

    <!-- 运行日志 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div class="card-title">运行日志</div>
        <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary)" id="pl-state-started">-</span>
      </div>
      <div id="pl-log" style="max-height:200px;overflow-y:auto;padding:12px;font-family:monospace;font-size:12px;background:var(--bg);border-radius:6px;margin:0 16px 16px">
        <div style="color:var(--text-tertiary)">暂无日志</div>
      </div>
    </div>

    <!-- API + 数据概览 -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card"><div class="kpi-label">API 服务</div><div class="kpi-value" style="font-size:20px" id="mon-api-status">-</div></div>
      <div class="kpi-card"><div class="kpi-label">历史记录数</div><div class="kpi-value" style="font-size:20px" id="mon-records">-</div></div>
      <div class="kpi-card"><div class="kpi-label">最近更新</div><div class="kpi-value" style="font-size:16px" id="mon-last-update">-</div></div>
      <div class="kpi-card"><div class="kpi-label">监控目录</div><div class="kpi-value" style="font-size:14px" id="pl-state-watchdir">-</div></div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">历史数据趋势</div></div>
      <div id="mon-trend">
        <div style="text-align:center;padding:30px;color:var(--text-tertiary)">加载中...</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">最近统计记录</div></div>
      <div id="mon-table" style="overflow-x:auto"></div>
    </div>
  `;

// ===== 日期筛选 =====

function filteredRecords() {
  let recs = _allRecords;
  if (_dateFrom) recs = recs.filter(r => r.date >= _dateFrom);
  if (_dateTo) recs = recs.filter(r => r.date <= _dateTo);
  return recs;
}

function trendFilteredRecords() {
  let recs = _allRecords;
  if (_trendFrom) recs = recs.filter(r => r.date >= _trendFrom);
  if (_trendTo) recs = recs.filter(r => r.date <= _trendTo);
  return recs;
}

function tagTrendFilteredRecords() {
  let recs = _allRecords;
  if (_tagTrendFrom) recs = recs.filter(r => r.date >= _tagTrendFrom);
  if (_tagTrendTo) recs = recs.filter(r => r.date <= _tagTrendTo);
  return recs;
}

function apTrendFilteredRecords() {
  let recs = _allRecords;
  if (_apTrendFrom) recs = recs.filter(r => r.date >= _apTrendFrom);
  if (_apTrendTo) recs = recs.filter(r => r.date <= _apTrendTo);
  return recs;
}

function atTrendFilteredRecords() {
  let recs = _allRecords;
  if (_atTrendFrom) recs = recs.filter(r => r.date >= _atTrendFrom);
  if (_atTrendTo) recs = recs.filter(r => r.date <= _atTrendTo);
  return recs;
}

function applyDateFilter() {
  const fromEl = document.getElementById('dateFrom');
  const toEl = document.getElementById('dateTo');
  if (fromEl) _dateFrom = fromEl.value;
  if (toEl) _dateTo = toEl.value;
  _dashRecords = filteredRecords();
  if (_dashRecords.length) {
    renderDashboardKPI(_dashRecords);
    renderDashboardCharts(_dashRecords);
  }
}

function applyTrendFilter(which) {
  if (which === 'tag') {
    const atfEl = document.getElementById('tagTrendFrom');
    const attEl = document.getElementById('tagTrendTo');
    if (atfEl) _tagTrendFrom = atfEl.value;
    if (attEl) _tagTrendTo = attEl.value;
  } else if (which === 'ap') {
    const apfEl = document.getElementById('apTrendFrom');
    const aptEl = document.getElementById('apTrendTo');
    if (apfEl) _apTrendFrom = apfEl.value;
    if (aptEl) _apTrendTo = aptEl.value;
  } else if (which === 'at') {
    const atfEl = document.getElementById('atTrendFrom');
    const attEl = document.getElementById('atTrendTo');
    if (atfEl) _atTrendFrom = atfEl.value;
    if (attEl) _atTrendTo = attEl.value;
  } else {
    const tfEl = document.getElementById('trendFrom');
    const ttEl = document.getElementById('trendTo');
    if (tfEl) _trendFrom = tfEl.value;
    if (ttEl) _trendTo = ttEl.value;
  }
  if (_dashRecords.length && window.echarts) {
    const TH = { backgroundColor: 'transparent', textStyle: { color: '#646a73' }, legend: { textStyle: { color: '#646a73', fontSize: 10 } }, tooltip: { backgroundColor: '#fff', borderColor: '#e5e6eb', borderWidth: 1, textStyle: { color: '#1f2329', fontSize: 12 }, extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.08)' } };
    renderDailyVolume(trendFilteredRecords(), TH);
    renderTagTrend(tagTrendFilteredRecords(), TH);
    renderApTrend(apTrendFilteredRecords(), TH);
    renderAtTrend(atTrendFilteredRecords(), TH);
  }
}

function clearDateFilter() {
  _dateFrom = '';
  _dateTo = '';
  const fromEl = document.getElementById('dateFrom');
  const toEl = document.getElementById('dateTo');
  if (fromEl) fromEl.value = '';
  if (toEl) toEl.value = '';
  _dashRecords = _allRecords;
  if (_dashRecords.length) {
    renderDashboardKPI(_dashRecords);
    renderDashboardCharts(_dashRecords);
  }
}

function downloadExcel(type) {
  if (!type) {
    // Show dropdown menu
    let menu = document.getElementById('download-menu');
    if (menu) { menu.remove(); return; }
    const btn = event.currentTarget;
    menu = document.createElement('div');
    menu.id = 'download-menu';
    menu.style.cssText = 'position:fixed;background:#fff;border:1px solid var(--border-light);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.12);z-index:999;min-width:220px;overflow:hidden';
    const rect = btn.getBoundingClientRect();
    let top = rect.bottom + 4;
    let right = window.innerWidth - rect.right;
    if (top + 200 > window.innerHeight) top = rect.top - 200;
    if (right + 220 > window.innerWidth) right = 8;
    menu.style.top = top + 'px';
    menu.style.right = right + 'px';
    const types = [
      { key: 'detail', label: '原始标注数据', desc: '标注后完整源数据（CSV）' },
      { key: 'ratio', label: '一级分类占比', desc: '一级分类分布及占比' },
      { key: 'tag3', label: '细分类别分布', desc: '二级分类映射+占比+主要意图' },
    ];
    types.forEach(t => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 16px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border-light)';
      item.innerHTML = `<div style="font-weight:500">${t.label}</div><div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">${t.desc}</div>`;
      item.onmouseenter = () => item.style.background = 'var(--primary-light)';
      item.onmouseleave = () => item.style.background = '';
      item.onclick = () => { document.getElementById('download-menu')?.remove(); downloadExcel(t.key); };
      menu.appendChild(item);
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', function close(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); }
    }), 0);
    return;
  }
  let url = '/api/pipeline/download?';
  if (_dateFrom) url += 'from=' + _dateFrom + '&';
  if (_dateTo) url += 'to=' + _dateTo + '&';
  url += 'type=' + type + '&';
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.click();
}

// ===== AI 助手：日期解析 =====
// parseDateRange defined in preview.html (host page)

// ===== Dashboard 看板逻辑 =====

function initDashboard() {
  ensureECharts(() => {
    if (!window.echarts) { refreshDashboard(); return; }
    const ids = ['cTagAll','cTagSem','cChannel','cTag3','cDaily','cTagTrend','cSource','cProduct','cMedium','cApTrend','cAtTrend'];
    _dashCharts = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) _dashCharts[id] = echarts.init(el);
    });
    window.addEventListener('resize', () => {
      Object.values(_dashCharts).forEach(c => { try { c.resize(); } catch(e) {} });
    });
    refreshDashboard();
  });
  // Auto-refresh every 30s
  if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);
  _autoRefreshTimer = setInterval(refreshDashboard, 30000);
}

function ensureECharts(cb) {
  if (window.echarts) { cb(); return; }
  const s = document.createElement('script');
  s.src = '/admin/assets/echarts.min.js';
  s.onload = cb;
  s.onerror = () => { console.error('ECharts load failed'); cb(); };
  document.head.appendChild(s);
}

function _initDefaultDates() {
  if (!_allRecords.length) return;
  _availableDates = [...new Set(_allRecords.map(r => r.date).filter(Boolean))].sort();
  const dates = _availableDates;
  if (!dates.length) return;

  const d = new Date(); d.setDate(d.getDate() - 1);
  const yd = d.toISOString().slice(0, 10);
  const defDate = dates.includes(yd) ? yd : dates[dates.length - 1];

  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  // 给所有日期输入框设置 min/max 并绑定校验
  const allDateInputs = ['dateFrom', 'dateTo', 'trendFrom', 'trendTo', 'tagTrendFrom', 'tagTrendTo', 'apTrendFrom', 'apTrendTo', 'atTrendFrom', 'atTrendTo'];
  allDateInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.min = minDate;
      el.max = maxDate;
      if (!el._dateValidated) {
        el._dateValidated = true;
        el.addEventListener('change', function() {
          if (this._adjusting) return;
          if (this.value && !dates.includes(this.value)) {
            const nearest = _findNearestDate(this.value, dates);
            const label = this.value;
            _showDateTip(this, label + ' 无数据，已切换至 ' + nearest);
            this._adjusting = true;
            this.value = nearest;
            this._adjusting = false;
            this.dispatchEvent(new Event('change', { cancelable: true }));
          }
        });
      }
    }
  });

  // Top filter: default to yesterday (or latest date)
  const fromEl = document.getElementById('dateFrom');
  const toEl = document.getElementById('dateTo');
  if (fromEl && !fromEl.value) fromEl.value = defDate;
  if (toEl && !toEl.value) toEl.value = defDate;
  if (fromEl && fromEl.value) _dateFrom = fromEl.value;
  if (toEl && toEl.value) _dateTo = toEl.value;

  // Trend panels: default last 30 days from latest data date
  const latestDate = new Date(defDate + 'T00:00:00');
  latestDate.setDate(latestDate.getDate() - 29);
  const d30Str = latestDate.toISOString().slice(0, 10);
  const trendFromDef = _findNearestDate(d30Str, dates);

  const tfEl = document.getElementById('trendFrom');
  const ttEl = document.getElementById('trendTo');
  if (tfEl && !tfEl.value) tfEl.value = trendFromDef;
  if (ttEl && !ttEl.value) ttEl.value = defDate;
  if (tfEl && tfEl.value) _trendFrom = tfEl.value;
  if (ttEl && ttEl.value) _trendTo = ttEl.value;

  const atfEl = document.getElementById('tagTrendFrom');
  const attEl = document.getElementById('tagTrendTo');
  if (atfEl && !atfEl.value) atfEl.value = trendFromDef;
  if (attEl && !attEl.value) attEl.value = defDate;
  if (atfEl && atfEl.value) _tagTrendFrom = atfEl.value;
  if (attEl && attEl.value) _tagTrendTo = attEl.value;

  const apfEl = document.getElementById('apTrendFrom');
  const aptEl = document.getElementById('apTrendTo');
  if (apfEl && !apfEl.value) apfEl.value = trendFromDef;
  if (aptEl && !aptEl.value) aptEl.value = defDate;
  if (apfEl && apfEl.value) _apTrendFrom = apfEl.value;
  if (aptEl && aptEl.value) _apTrendTo = aptEl.value;

  const atf2El = document.getElementById('atTrendFrom');
  const att2El = document.getElementById('atTrendTo');
  if (atf2El && !atf2El.value) atf2El.value = trendFromDef;
  if (att2El && !att2El.value) att2El.value = defDate;
  if (atf2El && atf2El.value) _atTrendFrom = atf2El.value;
  if (att2El && att2El.value) _atTrendTo = att2El.value;
}

function _findNearestDate(target, dates) {
  if (!dates.length) return target;
  // 找最近的早于或等于 target 的日期，没有则取最早的
  let best = dates[0];
  for (const d of dates) {
    if (d <= target) best = d;
    else break;
  }
  return best;
}

function _showDateTip(inputEl, msg) {
  let tip = inputEl.parentNode.querySelector('.date-tip');
  if (!tip) {
    tip = document.createElement('span');
    tip.className = 'date-tip';
    tip.style.cssText = 'font-size:10px;color:var(--orange);margin-left:4px;white-space:nowrap';
    inputEl.parentNode.appendChild(tip);
  }
  tip.textContent = msg;
  setTimeout(() => { if (tip.parentNode) tip.remove(); }, 3000);
}

// Strip trailing spaces from tag keys to merge duplicates like "电商 " → "电商"
function _cleanRecordKeys(rec) {
  const tagKeys = ['tag_dist_all', 'tag_dist_active', 'tag_dist_semantic', 'channel_dist', 'source_dist', 'product_dist', 'medium_dist', 'turn_distribution'];
  for (const key of tagKeys) {
    const dist = rec[key];
    if (!dist || typeof dist !== 'object') continue;
    const cleaned = {};
    for (const [k, v] of Object.entries(dist)) {
      const ck = k.trim();
      cleaned[ck] = (cleaned[ck] || 0) + v;
    }
    rec[key] = cleaned;
  }
  return rec;
}

async function refreshDashboard() {
  try {
    const res = await fetch('/api/pipeline/stats/history');
    const data = await res.json();
    _allRecords = (data.records || []).map(_cleanRecordKeys);

    // Init default dates on first load
    _initDefaultDates();

    _dashRecords = filteredRecords();
    if (!_dashRecords.length) return;
    renderDashboardKPI(_dashRecords);
    if (window.echarts) {
      renderDashboardCharts(_dashRecords);
    } else {
      renderDashboardTables(_dashRecords);
    }
  } catch (e) {
    console.error('Dashboard refresh failed:', e);
  }
}

function fmtNum(n) {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
  return n.toLocaleString();
}

function renderDashboardKPI(recs) {
  // 汇总所有筛选记录，而非只取最后一天
  const sumTotal = recs.reduce((s, r) => s + (r.total || 0), 0);
  const sumUsers = recs.reduce((s, r) => s + (r.total_users || 0), 0);
  const sumSessions = recs.reduce((s, r) => s + (r.total_sessions || 0), 0);
  const sumRating = { good_cs: 0, good_native: 0, bad_cs: 0, bad_native: 0 };
  recs.forEach(r => { const rt = r.rating || {}; for (const k in sumRating) sumRating[k] += rt[k] || 0; });

  document.getElementById('dk-total').textContent = fmtNum(sumTotal);
  // 昨日数据：取最新数据日期那天的记录
  let yrec = null;
  if (_allRecords.length) {
    const latestDate = _allRecords[_allRecords.length - 1].date;
    yrec = _allRecords.find(x => x.date === latestDate);
  }
  const ydayTotal = yrec ? yrec.total : 0;
  const ydayEl = document.getElementById('dk-yday');
  ydayEl.textContent = fmtNum(ydayTotal);
  if (!yrec) ydayEl.style.opacity = '0.4';
  else ydayEl.style.opacity = '';

  document.getElementById('dk-users').textContent = fmtNum(sumUsers);
  document.getElementById('dk-sessions').textContent = fmtNum(sumSessions);
  document.getElementById('dk-gcs').textContent = fmtNum(sumRating.good_cs);
  document.getElementById('dk-gn').textContent = fmtNum(sumRating.good_native);
  document.getElementById('dk-bcs').textContent = fmtNum(sumRating.bad_cs);
  document.getElementById('dk-bn').textContent = fmtNum(sumRating.bad_native);
}

function _mergeDist(recs, ...keys) {
  // 合并多条记录的分布 dict，支持单个 key 或多个 key 合并到一个 dict
  const merged = {};
  recs.forEach(r => {
    for (const key of keys) {
      const dist = r[key];
      if (!dist || typeof dist !== 'object') continue;
      for (const [k, v] of Object.entries(dist)) {
        const ck = k.trim();
        merged[ck] = (merged[ck] || 0) + v;
      }
    }
  });
  return merged;
}

function _mergeHotQueries(recs) {
  // 合并多条记录的热门 query，按模式分组
  const merged = { all: [], active: [], passive: [] };
  const qMap = { all: {}, active: {}, passive: {} };
  recs.forEach(r => {
    const hq = r.hot_queries_top20 || {};
    for (const mode of ['all', 'active', 'passive']) {
      for (const item of (hq[mode] || [])) {
        const q = item.query || '';
        if (!q) continue;
        qMap[mode][q] = (qMap[mode][q] || 0) + item.count;
      }
    }
  });
  for (const mode of ['all', 'active', 'passive']) {
    merged[mode] = Object.entries(qMap[mode])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }));
  }
  return merged;
}

function renderDashboardTables(recs) {
  const mergedTagAll = _mergeDist(recs, 'tag_dist_all');
  const mergedTagSem = _mergeDist(recs, 'tag_dist_semantic');
  const mergedChannel = _mergeDist(recs, 'channel_dist');
  const mergedTag3Sem = _mergeDist(recs, 'tag3_dist_top20_semantic');
  const mergedTag3NoKou = _mergeDist(recs, 'tag3_dist_top20_no_kouling');
  const mergedSource = _mergeDist(recs, 'source_dist');
  const mergedProduct = _mergeDist(recs, 'product_dist');
  const mergedHot = _mergeHotQueries(recs);
  const r = { tag_dist_all: mergedTagAll, tag_dist_semantic: mergedTagSem, channel_dist: mergedChannel, tag3_dist_top20_semantic: mergedTag3Sem, tag3_dist_top20_no_kouling: mergedTag3NoKou, source_dist: mergedSource, product_dist: mergedProduct, hot_queries_top20: mergedHot };

  const S = 'width:100%;border-collapse:collapse;font-size:12px';
  const TH = 'text-align:left;padding:8px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light)';
  const TD = 'padding:8px;border-bottom:1px solid var(--border-light)';

  const mk = (el, data, cols) => {
    if (!el) return;
    const total = cols.length === 3 ? Object.values(data).reduce((a,b)=>a+b,0) || 1 : 0;
    el.innerHTML = `<table style="${S}"><tr>${cols.map(c=>`<th style="${TH}">${c}</th>`).join('')}</tr>` +
      Object.entries(data).sort((a,b)=>b[1]-a[1]).map(([k,v]) =>
        `<tr><td style="${TD}">${k}</td><td style="${TD}">${v.toLocaleString()}</td>${cols.length===3?`<td style="${TD}">${(v/total*100).toFixed(1)}%</td>`:''}</tr>`
      ).join('') + '</table>';
  };

  mk(document.getElementById('cTagAll'), r.tag_dist_all || {}, ['分类','数量','占比']);
  mk(document.getElementById('cTagSem'), r.tag_dist_semantic || {}, ['分类','数量','占比']);
  mk(document.getElementById('cChannel'), r.channel_dist || {}, ['渠道','数量']);
  mk(document.getElementById('cTag3'), (_tag3Mode==='nokouling'?r.tag3_dist_top20_no_kouling:r.tag3_dist_top20_semantic)||{}, ['分类','数量']);
  mk(document.getElementById('cSource'), r.source_dist || {}, ['来源','数量']);
  mk(document.getElementById('cProduct'), r.product_dist || {}, ['商品','数量']);

  const tRecs = trendFilteredRecords();
  const dailyM = {};
  tRecs.forEach(r => { Object.entries(r.daily_volume || {}).forEach(([d,v]) => { if (d !== '1970-01-01') dailyM[d] = (dailyM[d] || 0) + v; }); });
  const dvEl = document.getElementById('cDaily');
  if (dvEl) dvEl.innerHTML = `<table style="${S}"><tr><th style="${TH}">日期</th><th style="${TH}">查询量</th></tr>` +
    Object.entries(dailyM).sort().map(([k,v]) => `<tr><td style="${TD}">${k}</td><td style="${TD}">${v.toLocaleString()}</td></tr>`).join('') + '</table>';

  const aRecs = tagTrendFilteredRecords();
  const ttEl = document.getElementById('cTagTrend');
  if (ttEl) ttEl.innerHTML = `<table style="${S}"><tr><th style="${TH}">日期</th>${TAG_ORDER.map(t=>`<th style="${TH}">${t}</th>`).join('')}</tr>` +
    aRecs.slice(-10).map(r => `<tr><td style="${TD}">${r.date||'-'}</td>${TAG_ORDER.map(t=>`<td style="${TD}">${(r.tag_dist_all||{})[t]||0}</td>`).join('')}</tr>`).join('') + '</table>';

  renderHotCurrent(r);
}

function renderDashboardCharts(recs) {
  // 合并范围内所有记录的分布数据
  const mergedTagAll = _mergeDist(recs, 'tag_dist_all');
  const mergedTagSem = _mergeDist(recs, 'tag_dist_semantic');
  const mergedChannel = _mergeDist(recs, 'channel_dist');
  const mergedSource = _mergeDist(recs, 'source_dist');
  const mergedProduct = _mergeDist(recs, 'product_dist');
  const mergedMedium = _mergeDist(recs, 'medium_dist');
  const mergedHot = _mergeHotQueries(recs);
  const r = { tag_dist_all: mergedTagAll, tag_dist_semantic: mergedTagSem, channel_dist: mergedChannel, source_dist: mergedSource, product_dist: mergedProduct, medium_dist: mergedMedium, hot_queries_top20: mergedHot, tag3_dist_top20_semantic: _mergeDist(recs, 'tag3_dist_top20_semantic'), tag3_dist_top20_no_kouling: _mergeDist(recs, 'tag3_dist_top20_no_kouling') };

  const TH = {
    backgroundColor: 'transparent',
    textStyle: { color: '#646a73' },
    legend: { textStyle: { color: '#646a73', fontSize: 10 } },
    tooltip: { backgroundColor: '#fff', borderColor: '#e5e6eb', borderWidth: 1, textStyle: { color: '#1f2329', fontSize: 12 }, extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.08)' }
  };
  donutChart('cTagAll', mergedTagAll, true, TH);
  donutChart('cTagSem', mergedTagSem, true, TH);
  donutChannel('cChannel', mergedChannel, TH);
  renderTag3Current(r);
  renderDailyVolume(trendFilteredRecords(), TH);
  renderTagTrend(tagTrendFilteredRecords(), TH);
  renderApTrend(apTrendFilteredRecords(), TH);
  renderAtTrend(atTrendFilteredRecords(), TH);
  renderHotCurrent(r);
  hbarChart('cSource', mergedSource, '#722ed1', TH, 100);
  hbarChart('cProduct', mergedProduct, '#ff7d00', TH, 100);
  hbarChart('cMedium', mergedMedium, '#00b578', TH, 100);
}

function donutChart(id, data, useTagColor, TH) {
  const ch = _dashCharts[id]; if (!ch) return;
  const n = Object.keys(data), v = Object.values(data);
  ch.setOption({ ...TH, tooltip: { ...TH.tooltip, trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#646a73', fontSize: 10 } },
    series: [{ type: 'pie', radius: ['40%','68%'], center: ['50%','46%'], padAngle: 1.5,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      data: n.map((t,i) => ({ name: t, value: v[i], itemStyle: { color: useTagColor ? tagColor(t) : PALETTE[i % PALETTE.length] } })),
      label: { color: '#646a73', fontSize: 10, formatter: '{b}\n{d}%' },
      emphasis: { label: { fontSize: 12, fontWeight: 700, color: '#1f2329' } },
      animationType: 'scale', animationEasing: 'elasticOut', animationDelay: i => i * 50
    }]
  });
}

function donutChannel(id, data, TH) {
  const ch = _dashCharts[id]; if (!ch) return;
  const cm = {'主动':'#3370ff','被动':'#ff7d00','口令活动':'#e2001a'};
  const n = Object.keys(data), v = Object.values(data);
  ch.setOption({ ...TH, tooltip: { ...TH.tooltip, trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#646a73', fontSize: 10 } },
    series: [{ type: 'pie', radius: ['40%','68%'], center: ['50%','46%'], padAngle: 1.5,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      data: n.map((t,i) => ({ name: t, value: v[i], itemStyle: { color: cm[t] || PALETTE[i] } })),
      label: { color: '#646a73', fontSize: 10, formatter: '{b}\n{c}' },
      emphasis: { label: { fontSize: 12, fontWeight: 700, color: '#1f2329' } },
      animationType: 'scale', animationEasing: 'elasticOut'
    }]
  });
}

function hbarChart(id, data, color, TH, left) {
  const ch = _dashCharts[id]; if (!ch) return;
  const sorted = Object.entries(data).sort((a,b) => b[1] - a[1]).slice(0, 20);
  const n = sorted.map(e => e[0]).reverse(), v = sorted.map(e => e[1]).reverse();
  ch.setOption({ ...TH, tooltip: { ...TH.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: left || 170, right: 16, top: 4, bottom: 20 },
    xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'category', data: n, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#646a73', fontSize: 10, width: (left||170) - 24, overflow: 'truncate' } },
    series: [{ type: 'bar', data: v, itemStyle: { color, borderRadius: [0,3,3,0] }, barWidth: '55%' }]
  });
}

function _expandRecordsByDailyVolume(recs) {
  // 将周汇总记录按 daily_volume 拆成单天记录，tag_dist_all 按查询量等比拆分
  const expanded = [];
  recs.forEach(r => {
    const dv = r.daily_volume || {};
    const dvClean = Object.entries(dv).filter(([d]) => d !== '1970-01-01');
    if (dvClean.length <= 1) {
      expanded.push(r);
      return;
    }
    // 周汇总：按每天查询量占比拆分 tag_dist_all
    const dvTotal = dvClean.reduce((s, [,v]) => s + v, 0) || 1;
    const tagAll = r.tag_dist_all || {};
    dvClean.forEach(([day, vol]) => {
      const ratio = vol / dvTotal;
      const splitTag = {};
      for (const [t, c] of Object.entries(tagAll)) {
        splitTag[t] = Math.round(c * ratio);
      }
      expanded.push({ ...r, date: day, daily_volume: { [day]: vol }, tag_dist_all: splitTag });
    });
  });
  return expanded;
}

function renderDailyVolume(recs, TH) {
  const ch = _dashCharts.cDaily; if (!ch) return;
  const m = {};
  recs.forEach(r => { Object.entries(r.daily_volume || {}).forEach(([d,v]) => { if (d !== '1970-01-01') m[d] = (m[d] || 0) + v; }); });
  const dates = Object.keys(m).sort(), vals = dates.map(d => m[d]);
  ch.setOption({ ...TH, tooltip: { ...TH.tooltip, trigger: 'axis', formatter: p => `${p[0].axisValue}<br/>查询量: <b>${p[0].value.toLocaleString()}</b>` },
    grid: { left: 64, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9, formatter: v => v >= 1e4 ? (v/1e4).toFixed(0) + '万' : v } },
    series: [{ type: 'line', data: vals, smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { color: '#3370ff', width: 1.5 }, itemStyle: { color: '#3370ff', borderColor: '#fff', borderWidth: 1.5 },
      areaStyle: { color: window.echarts ? new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(51,112,255,.10)'},{offset:1,color:'rgba(51,112,255,0)'}]) : undefined }
    }]
  });
}

function renderTagTrend(recs, TH) {
  const ch = _dashCharts.cTagTrend; if (!ch) return;
  // 拆分周汇总记录，使每天一条
  const expanded = _expandRecordsByDailyVolume(recs);
  // 合并同日期记录
  const dateMap = {};
  expanded.forEach(r => {
    const d = r.date;
    if (!dateMap[d]) dateMap[d] = {};
    for (const [t, c] of Object.entries(r.tag_dist_all || {})) {
      dateMap[d][t] = (dateMap[d][t] || 0) + c;
    }
  });
  const ts = new Set();
  Object.values(dateMap).forEach(dist => Object.keys(dist).forEach(t => ts.add(t)));
  const tags = TAG_ORDER.filter(t => ts.has(t));
  const dates = Object.keys(dateMap).sort();
  ch.setOption({ ...TH, tooltip: { ...TH.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#646a73', fontSize: 10 } },
    grid: { left: 64, right: 16, top: 12, bottom: 36 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9, formatter: v => v >= 1e4 ? (v/1e4).toFixed(0) + '万' : v } },
    series: tags.map((tag, i) => ({
      name: tag, type: 'bar', stack: 't', emphasis: { focus: 'series' },
      itemStyle: { color: tagColor(tag), borderRadius: tags.length - 1 === i ? [2,2,0,0] : [0,0,0,0] },
      data: dates.map(d => (dateMap[d] || {})[tag] || 0)
    }))
  });
}

function renderApTrend(recs, TH) {
  const ch = _dashCharts.cApTrend; if (!ch) return;
  const dateMap = {};
  recs.forEach(r => {
    const dap = r.daily_active_passive || {};
    Object.entries(dap).forEach(([d, vals]) => {
      if (!dateMap[d]) dateMap[d] = { '主动': 0, '被动': 0, '口令活动': 0 };
      dateMap[d]['主动'] += (vals['主动'] || 0);
      dateMap[d]['被动'] += (vals['被动'] || 0);
      dateMap[d]['口令活动'] += (vals['口令活动'] || 0);
    });
  });
  const dates = Object.keys(dateMap).sort();
  const series = ['主动', '被动', '口令活动'].map(key => ({
    name: key, type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
    lineStyle: { width: 1.5 }, itemStyle: { color: AP_COLOR[key] },
    data: dates.map(d => dateMap[d][key] || 0)
  }));
  ch.setOption({ ...TH, tooltip: { ...TH.tooltip, trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#646a73', fontSize: 10 } },
    grid: { left: 64, right: 16, top: 12, bottom: 36 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    series
  });
}

function renderAtTrend(recs, TH) {
  const ch = _dashCharts.cAtTrend; if (!ch) return;
  const dateMap = {};
  recs.forEach(r => {
    const dat = r.daily_active_tag || {};
    Object.entries(dat).forEach(([d, dist]) => {
      if (!dateMap[d]) dateMap[d] = {};
      Object.entries(dist).forEach(([tag, cnt]) => {
        dateMap[d][tag] = (dateMap[d][tag] || 0) + cnt;
      });
    });
  });
  const dates = Object.keys(dateMap).sort();
  const tagSet = new Set();
  Object.values(dateMap).forEach(dist => Object.keys(dist).forEach(t => tagSet.add(t)));
  const tags = TAG_ORDER.filter(t => tagSet.has(t));
  ch.setOption({ ...TH, tooltip: { ...TH.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#646a73', fontSize: 10 } },
    grid: { left: 64, right: 16, top: 12, bottom: 36 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    series: tags.map((tag, i) => ({
      name: tag, type: 'bar', stack: 't', emphasis: { focus: 'series' },
      itemStyle: { color: tagColor(tag), borderRadius: tags.length - 1 === i ? [2,2,0,0] : [0,0,0,0] },
      data: dates.map(d => (dateMap[d] || {})[tag] || 0)
    }))
  });
}

function switchTag3Mode(mode) {
  _tag3Mode = mode;
  const a = document.getElementById('tag3-tab-active');
  const n = document.getElementById('tag3-tab-nokouling');
  if (a) a.style.cssText = mode === 'active' ? 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)' : 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)';
  if (n) n.style.cssText = mode === 'nokouling' ? 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)' : 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)';
  if (_dashRecords.length) renderTag3Current(_dashRecords[_dashRecords.length - 1]);
}

function renderTag3Current(r) {
  const TH = { backgroundColor: 'transparent', tooltip: { backgroundColor: '#fff', borderColor: '#e5e6eb', borderWidth: 1, textStyle: { color: '#1f2329', fontSize: 12 }, trigger: 'axis', axisPointer: { type: 'shadow' } } };
  const data = _tag3Mode === 'nokouling' ? (r.tag3_dist_top20_no_kouling || {}) : (r.tag3_dist_top20_semantic || {});
  hbarChart('cTag3', data, _tag3Mode === 'nokouling' ? '#ff7d00' : '#3370ff', TH, 170);
}

function switchHotMode(mode) {
  _hotMode = mode;
  ['all','active','passive'].forEach(m => {
    const el = document.getElementById('hot-tab-' + m);
    if (el) el.style.cssText = m === mode ? 'padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)' : 'padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)';
  });
  if (_dashRecords.length) renderHotCurrent(_dashRecords[_dashRecords.length - 1]);
}

function renderHotCurrent(r) {
  const hq = r.hot_queries_top20 || {};
  let rows;
  if (_hotMode === 'passive') rows = hq.passive || [];
  else if (_hotMode === 'all') rows = hq.all || [];
  else rows = hq.active || [];
  const tb = document.getElementById('hot-table-body');
  if (!tb) return;
  if (!rows || !rows.length) { tb.innerHTML = ''; return; }
  tb.innerHTML = rows.map((r, i) => {
    const ct = r.count >= 1e4 ? (r.count / 1e4).toFixed(1) + '万' : r.count.toLocaleString();
    return `<tr style="border-bottom:1px solid var(--border-light)"><td style="padding:8px 10px;color:${i < 3 ? 'var(--orange)' : 'var(--text-tertiary)'};font-weight:${i < 3 ? '600' : '400'};text-align:center">${i + 1}</td><td style="padding:8px 10px;max-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.query.replace(/"/g,'&quot;')}">${r.query}</td><td style="padding:8px 10px;color:var(--primary);text-align:right;font-size:10px">${ct}</td></tr>`;
  }).join('');
}

// ===== 智能标注逻辑 =====

let _annoPollTimer = null;
let _annoTaskId = null;       // 当前运行中的任务 ID
let _annoFilename = '';       // 当前运行中的文件名
let _annoRunning = false;     // 是否有正在运行的任务
let _annoStartTime = 0;       // 标注开始时间（用于ETA）
let _annoVisitedResult = false; // 用户是否已查看过当前任务结果

// 从 localStorage 恢复运行中任务的状态
(function() {
  try {
    const saved = localStorage.getItem('lexiang_running_task');
    if (saved) {
      const t = JSON.parse(saved);
      if (t.taskId && t.running) {
        _annoTaskId = t.taskId;
        _annoFilename = t.filename || '';
        _annoRunning = true;
        // 启动轮询继续跟踪
        _startPolling();
      }
    }
  } catch(e) {}
})();

function _saveAnnoState() {
  try {
    if (_annoRunning && _annoTaskId) {
      localStorage.setItem('lexiang_running_task', JSON.stringify({ taskId: _annoTaskId, filename: _annoFilename, running: true }));
    } else {
      localStorage.removeItem('lexiang_running_task');
    }
  } catch(e) {}
}

async function pipelineAnnotate(file) {
  if (!file) return;

  // 文件格式验证
  const suffix = file.name.split('.').pop().toLowerCase();
  const allowedExt = ['csv', 'xlsx', 'xls'];
  if (!allowedExt.includes(suffix)) {
    alert('不支持的文件格式：.' + suffix + '\n\n请上传 CSV (.csv) 或 Excel (.xlsx/.xls) 文件');
    return;
  }

  // 先读取文件验证必填字段
  try {
    const columns = await _readFileColumns(file);
    const required = ['user_question', 'query'];
    const hasRequired = required.some(c => columns.includes(c));
    if (!hasRequired) {
      alert('文件缺少必填字段！\n\n必须包含以下列之一：' + required.join('、') + '\n\n当前文件列：' + columns.slice(0, 10).join('、') + (columns.length > 10 ? '...' : ''));
      return;
    }
  } catch (e) {
    console.warn('前端字段预检失败:', e);
  }

  const fd = new FormData();
  fd.append('file', file);
  if (typeof USER_ID !== 'undefined') fd.append('user_id', USER_ID);

  try {
    const res = await fetch('/api/pipeline/classify', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) {
      alert('上传失败: ' + (data.detail || data.error || '未知错误'));
      return;
    }

    // 记录运行中的任务
    _annoTaskId = data.task_id;
    _annoFilename = file.name;
    _annoRunning = true;
    _annoStartTime = Date.now();
    _annoVisitedResult = false;
    _saveAnnoState();

    // 启动后台轮询
    _startPolling();

    // 跳转到任务页面展示进度
    switchPage('pipeline.task');
    _renderTaskRunning(data.task_id, file.name);

  } catch (e) {
    alert('请求失败: ' + e.message);
  }
}

function _startPolling() {
  if (_annoPollTimer) clearInterval(_annoPollTimer);
  _annoPollTimer = setInterval(async () => {
    if (!_annoTaskId) return;
    try {
      const r = await fetch('/api/pipeline/classify/' + _annoTaskId);
      const t = await r.json();
      if (t.status === 'running') {
        _updateRunningProgress(t.progress);
      } else if (t.status === 'done') {
        clearInterval(_annoPollTimer); _annoPollTimer = null;
        _annoRunning = false;
        _saveAnnoState();
        _showTaskDoneNotification(t);
        // 如果当前在任务页面，直接渲染结果
        if (STATE.currentPage === 'pipeline.task') {
          _renderTaskDone(t.result);
        }
      } else if (t.status === 'error') {
        clearInterval(_annoPollTimer); _annoPollTimer = null;
        _annoRunning = false;
        _saveAnnoState();
        _showTaskErrorNotification(t.progress);
        if (STATE.currentPage === 'pipeline.task') {
          _renderTaskError(t.progress);
        }
      }
    } catch (e) {}
  }, 2000);
}

// 更新任务页面中的进度（安全检查元素是否存在）
function _updateRunningProgress(progressText) {
  const bar = document.getElementById('task-progress-bar');
  const text = document.getElementById('task-progress-text');
  const pctEl = document.getElementById('task-progress-pct');
  const etaEl = document.getElementById('task-progress-eta');
  let pct = 5;
  const m = String(progressText).match(/(\d+)\/(\d+)/);
  if (m) {
    pct = Math.min(90, 5 + (parseInt(m[1]) / parseInt(m[2]) * 85));
  } else if (String(progressText).match(/上下文|自查|修正|LLM|生成/)) {
    pct = 92;
  }
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = Math.round(pct) + '%';

  // ETA 计算
  if (etaEl && m && _annoStartTime) {
    const done = parseInt(m[1]), total = parseInt(m[2]);
    if (done > 0) {
      const elapsed = (Date.now() - _annoStartTime) / 1000;
      const remaining = (elapsed / done) * (total - done);
      if (remaining > 60) etaEl.textContent = '预计剩余 ' + Math.ceil(remaining / 60) + ' 分钟';
      else if (remaining > 5) etaEl.textContent = '预计剩余 ' + Math.ceil(remaining) + ' 秒';
      else etaEl.textContent = '';
    }
  }

  if (text) text.textContent = progressText || '处理中...';
}

// 取消标注
async function cancelAnnoTask() {
  if (!_annoTaskId || !_annoRunning) return;
  if (!confirm('确定要取消当前标注任务吗？')) return;
  try {
    await fetch('/api/pipeline/classify/' + _annoTaskId + '/cancel', { method: 'POST' });
  } catch (e) {}
  clearInterval(_annoPollTimer); _annoPollTimer = null;
  _annoRunning = false;
  _saveAnnoState();
  _renderTaskCancelled();
}

function _renderTaskCancelled() {
  const statusEl = document.getElementById('task-file-status');
  const progressText = document.getElementById('task-progress-text');
  const spinner = document.getElementById('task-spinner');
  const progressBar = document.getElementById('task-progress-bar');
  const progressPct = document.getElementById('task-progress-pct');
  const progressEta = document.getElementById('task-progress-eta');
  const cancelBtn = document.getElementById('task-cancel-btn');

  if (statusEl) statusEl.innerHTML = '<span style="color:var(--orange);font-size:12px">已取消</span>';
  if (progressText) progressText.textContent = '标注已取消';
  if (spinner) spinner.style.display = 'none';
  if (progressEta) progressEta.textContent = '';
  if (progressBar) progressBar.style.background = 'var(--orange)';

  // 取消按钮改为"继续任务"
  if (cancelBtn) {
    cancelBtn.textContent = '继续任务';
    cancelBtn.style.color = 'var(--primary)';
    cancelBtn.style.borderColor = 'var(--primary)';
    cancelBtn.onclick = () => { _restartAnnoTask(); };
  }
}

async function _restartAnnoTask() {
  if (!_annoTaskId) return;
  const cancelBtn = document.getElementById('task-cancel-btn');
  if (cancelBtn) { cancelBtn.disabled = true; cancelBtn.textContent = '启动中...'; }
  try {
    const res = await fetch('/api/pipeline/classify/' + _annoTaskId + '/restart', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      // 原文件不可用，提示重新上传
      if (cancelBtn) { cancelBtn.textContent = '重新上传'; cancelBtn.onclick = () => { document.getElementById('task-upload').click(); }; cancelBtn.disabled = false; }
      return;
    }
    _annoRunning = true;
    _annoStartTime = Date.now();
    _saveAnnoState();
    _startPolling();
    _renderTaskRunning(_annoTaskId, _annoFilename);
  } catch (e) {
    if (cancelBtn) { cancelBtn.textContent = '继续任务'; cancelBtn.disabled = false; }
  }
}

// 完成通知（右上角 toast）
function _showTaskDoneNotification(task) {
  _showToast('✅ 标注完成: ' + (task.filename || _annoFilename) + ' — 共 ' + fmtNum(task.result?.total || 0) + ' 条', 'success');
}

function _showTaskErrorNotification(msg) {
  _showToast('❌ 标注失败: ' + (msg || '未知错误'), 'error');
}

function _showToast(msg, type) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--primary)';
  toast.style.cssText = `background:${bg};color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.15);cursor:pointer;max-width:360px;animation:toastIn .3s ease`;
  toast.textContent = msg;
  toast.onclick = () => { toast.remove(); if (_annoTaskId) { switchPage('pipeline.task'); setTimeout(() => _loadDoneTask(_annoTaskId), 50); } };
  container.appendChild(toast);
  // 自动消失
  setTimeout(() => { if (toast.parentNode) toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 8000);
  // 动画
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = '@keyframes toastIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(s);
  }
}

// ===== 任务页面渲染 =====

function _renderTaskRunning(taskId, filename) {
  const titleEl = document.getElementById('task-page-title');
  const descEl = document.getElementById('task-page-desc');
  const fileInfo = document.getElementById('task-file-info');
  const filenameEl = document.getElementById('task-filename');
  const metaEl = document.getElementById('task-file-meta');
  const statusEl = document.getElementById('task-file-status');
  const progressCard = document.getElementById('task-progress-card');
  const progressBar = document.getElementById('task-progress-bar');
  const progressText = document.getElementById('task-progress-text');
  const progressPct = document.getElementById('task-progress-pct');
  const progressEta = document.getElementById('task-progress-eta');
  const spinner = document.getElementById('task-spinner');
  const cancelBtn = document.getElementById('task-cancel-btn');
  const resultEl = document.getElementById('task-result');
  const historyCard = document.getElementById('task-history-card');

  if (!titleEl) return;

  titleEl.textContent = '任务（' + filename + '）';
  descEl.textContent = '标注进行中，你可以返回看板继续其他操作';
  fileInfo.style.display = 'block';
  filenameEl.textContent = filename;
  metaEl.textContent = new Date().toLocaleTimeString();
  statusEl.innerHTML = '<span style="color:var(--orange);font-size:12px;font-weight:500">标注中</span>';
  progressCard.style.display = 'block';
  progressBar.style.width = '5%';
  if (progressPct) progressPct.textContent = '5%';
  if (progressEta) progressEta.textContent = '';
  spinner.style.display = 'inline-block';
  progressText.textContent = '标注中...';
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  resultEl.style.display = 'none';
  historyCard.style.display = 'none';
}

function _renderTaskDone(result) {
  const fileInfo = document.getElementById('task-file-info');
  const statusEl = document.getElementById('task-file-status');
  const progressCard = document.getElementById('task-progress-card');
  const resultEl = document.getElementById('task-result');

  if (statusEl) statusEl.innerHTML = '<span style="color:var(--green);font-size:12px;font-weight:500">✓ 标注完成</span>';
  if (progressCard) progressCard.style.display = 'none';
  if (resultEl) { resultEl.style.display = 'block'; renderAnnotateResult(result); }
}

function _renderTaskError(msg) {
  const statusEl = document.getElementById('task-file-status');
  const progressCard = document.getElementById('task-progress-card');
  const progressText = document.getElementById('task-progress-text');
  const spinner = document.getElementById('task-spinner');

  if (statusEl) statusEl.innerHTML = '<span style="color:var(--red);font-size:12px">标注失败</span>';
  if (progressText) progressText.textContent = '标注失败: ' + (msg || '');
  if (spinner) spinner.style.display = 'none';
}

async function _loadDoneTask(taskId) {
  try {
    const res = await fetch('/api/pipeline/classify/' + taskId);
    const task = await res.json();
    if (task.status === 'done') {
      _annoTaskId = taskId;
      const titleEl = document.getElementById('task-page-title');
      const descEl = document.getElementById('task-page-desc');
      const filenameEl = document.getElementById('task-filename');
      const metaEl = document.getElementById('task-file-meta');
      const statusEl = document.getElementById('task-file-status');
      const fileInfo = document.getElementById('task-file-info');
      const progressCard = document.getElementById('task-progress-card');

      if (titleEl) titleEl.textContent = '任务（' + (task.filename || taskId) + '）';
      if (descEl) descEl.textContent = '标注结果';
      if (fileInfo) fileInfo.style.display = 'block';
      if (filenameEl) filenameEl.textContent = task.filename || taskId;
      if (metaEl) metaEl.textContent = task.created_at ? task.created_at.slice(0, 16).replace('T', ' ') : '';
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--green);font-size:12px;font-weight:500">✓ 已完成</span>';
      if (progressCard) progressCard.style.display = 'none';

      _renderTaskDone(task.result || {});
    }
  } catch (e) {}
}

// 页面切换时渲染任务页面的钩子
function _initTaskPage() {
  if (_annoRunning) {
    // 有运行中的任务，显示进度
    _renderTaskRunning(_annoTaskId, _annoFilename);
  } else if (_annoTaskId && !_annoVisitedResult) {
    // 有已完成任务且用户还没看过结果，加载结果
    _loadDoneTask(_annoTaskId);
    _annoVisitedResult = true;
  } else {
    // 无活跃任务或已查看过结果，显示历史
    _renderHistoryOnly();
  }
}

function _renderHistoryOnly() {
  const titleEl = document.getElementById('task-page-title');
  const descEl = document.getElementById('task-page-desc');
  const fileInfo = document.getElementById('task-file-info');
  const progressCard = document.getElementById('task-progress-card');
  const resultEl = document.getElementById('task-result');
  const historyCard = document.getElementById('task-history-card');

  if (titleEl) titleEl.textContent = '标注记录';
  if (descEl) descEl.textContent = '历史标注任务';
  if (fileInfo) fileInfo.style.display = 'none';
  if (progressCard) progressCard.style.display = 'none';
  if (resultEl) resultEl.style.display = 'none';
  if (historyCard) historyCard.style.display = 'block';

  loadTaskHistory();
}

function downloadAnnoResult() {
  if (!_annoTaskId) return;
  const url = '/api/pipeline/classify/' + _annoTaskId + '/download';
  const a = document.createElement('a'); a.href = url; a.download = ''; a.click();
}

let _historyTasks = [];
let _historyPage = 1;
const _historyPageSize = 10;

async function loadTaskHistory() {
  const card = document.getElementById('task-history-card');
  const list = document.getElementById('task-history-list');
  card.style.display = 'block';
  list.innerHTML = '<div style="padding:12px;color:var(--text-tertiary);text-align:center">加载中...</div>';

  try {
    let url = '/api/pipeline/classify/tasks';
    if (typeof USER_ID !== 'undefined' && USER_ID) url += '?user_id=' + encodeURIComponent(USER_ID);
    const res = await fetch(url);
    const data = await res.json();
    _historyTasks = data.tasks || [];
    _historyPage = 1;
    _renderHistoryPage();
  } catch (e) {
    list.innerHTML = '<div style="padding:12px;color:var(--red);text-align:center">加载失败: ' + e.message + '</div>';
  }
}

function _renderHistoryPage() {
  const list = document.getElementById('task-history-list');
  const pager = document.getElementById('task-history-pager');
  const pageInfo = document.getElementById('task-history-page-info');
  const tasks = _historyTasks;
  const total = tasks.length;
  const totalPages = Math.max(1, Math.ceil(total / _historyPageSize));
  _historyPage = Math.min(_historyPage, totalPages);

  if (!total) {
    list.innerHTML = '<div style="padding:12px;color:var(--text-tertiary);text-align:center">暂无标注历史</div>';
    if (pager) pager.innerHTML = '';
    if (pageInfo) pageInfo.textContent = '';
    return;
  }

  const start = (_historyPage - 1) * _historyPageSize;
  const page = tasks.slice(start, start + _historyPageSize);

  list.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<tr><th style="text-align:left;padding:10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light)">文件名</th><th style="padding:10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);text-align:center">数据量</th><th style="padding:10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);text-align:center">状态</th><th style="padding:10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);text-align:center">时间</th><th style="padding:10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);text-align:right">操作</th></tr>' +
    page.map(t => {
      const statusColor = t.status === 'done' ? 'var(--green)' : t.status === 'error' ? 'var(--red)' : 'var(--orange)';
      const statusLabel = t.status === 'done' ? '完成' : t.status === 'error' ? '失败' : '进行中';
      const time = t.created_at ? t.created_at.slice(0, 16).replace('T', ' ') : '--';
      const totalVal = t.total != null ? fmtNum(t.total) : '--';
      const btns = [];
      if (t.status === 'done') {
        btns.push('<span style="color:var(--primary);cursor:pointer;font-size:11px" onclick="viewTaskResult(\'' + t.task_id + '\')">查看</span>');
        btns.push('<span style="color:var(--primary);cursor:pointer;font-size:11px;margin-left:8px" onclick="downloadTaskResult(\'' + t.task_id + '\')">下载</span>');
      }
      return '<tr>' +
        '<td style="padding:10px;border-bottom:1px solid var(--border-light);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (t.filename || '') + '">' + (t.filename || '--') + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid var(--border-light);text-align:center">' + totalVal + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid var(--border-light);text-align:center;color:' + statusColor + '">' + statusLabel + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid var(--border-light);text-align:center;font-size:11px;color:var(--text-tertiary)">' + time + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid var(--border-light);text-align:right">' + btns.join('') + '</td>' +
        '</tr>';
    }).join('') + '</table>';

  if (pageInfo) pageInfo.textContent = total + ' 条记录，第 ' + _historyPage + '/' + totalPages + ' 页';

  if (pager) {
    let btns = '';
    if (_historyPage > 1) btns += '<button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" onclick="_historyPage--;_renderHistoryPage()">上一页</button>';
    if (_historyPage < totalPages) btns += '<button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" onclick="_historyPage++;_renderHistoryPage()">下一页</button>';
    pager.innerHTML = btns;
  }
}

async function viewTaskResult(taskId) {
  try {
    const res = await fetch('/api/pipeline/classify/' + taskId);
    const task = await res.json();
    if (task.status !== 'done') { alert('任务未完成'); return; }

    _annoTaskId = taskId;
    _annoRunning = false;

    const fileInfo = document.getElementById('task-file-info');
    const filenameEl = document.getElementById('task-filename');
    const metaEl = document.getElementById('task-file-meta');
    const statusEl = document.getElementById('task-file-status');
    const titleEl = document.getElementById('task-page-title');
    const descEl = document.getElementById('task-page-desc');
    const progressCard = document.getElementById('task-progress-card');
    const resultEl = document.getElementById('task-result');
    const historyCard = document.getElementById('task-history-card');

    if (titleEl) titleEl.textContent = '任务（' + (task.filename || taskId) + '）';
    if (descEl) descEl.textContent = '标注结果';
    if (fileInfo) fileInfo.style.display = 'block';
    if (filenameEl) filenameEl.textContent = task.filename || taskId;
    if (metaEl) metaEl.textContent = task.created_at ? task.created_at.slice(0, 16).replace('T', ' ') : '';
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--green);font-size:12px;font-weight:500">✓ 已完成</span>';
    if (progressCard) progressCard.style.display = 'none';
    if (resultEl) { resultEl.style.display = 'block'; renderAnnotateResult(task.result || {}); }
    if (historyCard) historyCard.style.display = 'none';
  } catch (e) {
    alert('加载失败: ' + e.message);
  }
}

function downloadTaskResult(taskId) {
  const url = '/api/pipeline/classify/' + taskId + '/download';
  const a = document.createElement('a'); a.href = url; a.download = ''; a.click();
}

let _taskCharts = {};

function _initChart(domId) {
  const el = document.getElementById(domId);
  if (!el || !window.echarts) return null;
  if (_taskCharts[domId]) { _taskCharts[domId].dispose(); }
  const ch = echarts.init(el);
  _taskCharts[domId] = ch;
  return ch;
}

function _renderTagSummary(elId, data) {
  const el = document.getElementById(elId);
  if (!el || !data) return;
  const total = Object.values(data).reduce((a,b) => a+b, 0) || 1;
  el.innerHTML = TAG_ORDER.filter(k => data[k]).map(k =>
    `${k} ${data[k].toLocaleString()}(${(data[k]/total*100).toFixed(1)}%)`
  ).join(' · ');
}

function renderAnnotateResult(result) {
  if (typeof _lastAnnoResult !== 'undefined') _lastAnnoResult = result;
  const resultEl = document.getElementById('task-result');
  resultEl.style.display = 'block';

  // KPI: 总数、用户数、对话数
  const kpiGrid = document.getElementById('task-kpi-grid');
  kpiGrid.innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Query 总数</div><div class="kpi-value" style="color:var(--primary)">${fmtNum(result.total||0)}</div></div>
    <div class="kpi-card"><div class="kpi-label">总用户数</div><div class="kpi-value" style="color:var(--orange)">${fmtNum(result.total_users||0)}</div></div>
    <div class="kpi-card"><div class="kpi-label">总对话数</div><div class="kpi-value" style="color:var(--green)">${fmtNum(result.total_sessions||0)}</div></div>
  `;

  // 一级分类·整体 环形图
  const tagData = result.distribution?.tag || {};
  const ch = _initChart('task-tag-chart');
  if (ch && Object.keys(tagData).length) {
    const pieData = TAG_ORDER.filter(k => tagData[k]).map(k => ({ name: k, value: tagData[k], itemStyle: { color: tagColor(k) } }));
    ch.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
      series: [{ type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'], label: { formatter: '{b}\n{d}%', fontSize: 11 }, data: pieData }]
    });
  }
  _renderTagSummary('task-tag-summary', tagData);

  // 一级分类·主动语义 环形图
  const tagSemData = result.distribution?.tag_semantic || tagData;
  const ch2 = _initChart('task-tag-sem-chart');
  if (ch2 && Object.keys(tagSemData).length) {
    const pieData2 = TAG_ORDER.filter(k => tagSemData[k]).map(k => ({ name: k, value: tagSemData[k], itemStyle: { color: tagColor(k) } }));
    ch2.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
      series: [{ type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'], label: { formatter: '{b}\n{d}%', fontSize: 11 }, data: pieData2 }]
    });
  }
  _renderTagSummary('task-tag-sem-summary', tagSemData);

  // 主动 vs 被动占比
  const ch3 = _initChart('task-active-pie');
  const activeCount = result.active_count || 0;
  const passiveCount = result.passive_count || 0;
  if (ch3) {
    ch3.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
        label: { formatter: '{b}\n{c} ({d}%)', fontSize: 12 },
        data: [
          { name: '主动 Query', value: activeCount, itemStyle: { color: '#3370ff' } },
          { name: '被动 Query', value: passiveCount, itemStyle: { color: '#8f959e' } },
        ]
      }]
    });
  }
  // 主动/被动摘要
  const activeSummaryEl = document.getElementById('task-active-summary');
  if (activeSummaryEl) {
    const apTotal = activeCount + passiveCount || 1;
    activeSummaryEl.innerHTML = `主动 ${activeCount.toLocaleString()} (${(activeCount/apTotal*100).toFixed(1)}%) · 被动 ${passiveCount.toLocaleString()} (${(passiveCount/apTotal*100).toFixed(1)}%)`;
  }

  // 商品咨询 TOP20
  const productEl = document.getElementById('task-product-table');
  const productData = result.distribution?.product || {};
  const productEntries = Object.entries(productData).sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (productEntries.length) {
    productEl.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr><th style="text-align:left;padding:8px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);width:28px">#</th><th style="text-align:left;padding:8px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light)">商品</th><th style="text-align:right;padding:8px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);width:60px">频次</th></tr>' +
      productEntries.map(([k, v], i) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid var(--border-light);color:${i < 3 ? 'var(--orange)' : 'var(--text-tertiary)'};font-weight:${i < 3 ? '600' : '400'};text-align:center">${i + 1}</td><td style="padding:6px 8px;border-bottom:1px solid var(--border-light);max-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${k}">${k}</td><td style="padding:6px 8px;border-bottom:1px solid var(--border-light);text-align:right;color:var(--primary);font-size:11px">${v.toLocaleString()}</td></tr>`
      ).join('') + '</table>';
  } else {
    productEl.innerHTML = '<div style="color:var(--text-tertiary);padding:12px;text-align:center">无商品咨询数据</div>';
  }
}

// ===== 统计分析 =====

async function pipelineStats(file) {
  if (!file) return;
  const resultEl = document.getElementById('stats-result');
  const currentEl = document.getElementById('stats-current');
  resultEl.style.display = 'block';
  currentEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-tertiary)">计算中...</div>';

  const fd = new FormData();
  fd.append('file', file);

  try {
    const res = await fetch('/api/pipeline/stats', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { currentEl.innerHTML = '<div style="color:var(--red);padding:20px">统计失败</div>'; return; }
    const tagDist = data.stats?.tag || {};
    const tag3Dist = data.stats?.tag3 || {};
    const total = data.total || 0;
    currentEl.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
        <div class="kpi-card"><div class="kpi-label">总数据量</div><div class="kpi-value">${total.toLocaleString()}</div></div>
        <div class="kpi-card"><div class="kpi-label">一级分类数</div><div class="kpi-value">${Object.keys(tagDist).length}</div></div>
        <div class="kpi-card"><div class="kpi-label">三级分类数</div><div class="kpi-value">${Object.keys(tag3Dist).length}</div></div>
      </div>
      <div class="grid-2">
        <div><table><tr><th>分类</th><th>数量</th><th>占比</th></tr>${Object.entries(tagDist).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `<tr><td>${k}</td><td>${v.toLocaleString()}</td><td>${(v/(total||1)*100).toFixed(1)}%</td></tr>`).join('')}</table></div>
        <div><table><tr><th>分类</th><th>数量</th></tr>${Object.entries(tag3Dist).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v]) => `<tr><td>${k}</td><td>${v.toLocaleString()}</td></tr>`).join('')}</table></div>
      </div>`;
  } catch (e) {
    currentEl.innerHTML = '<div style="color:var(--red);padding:20px">请求失败: ' + e.message + '</div>';
  }
}

async function loadPipelineHistory() {
  const el = document.getElementById('stats-history') || document.getElementById('mon-trend');
  if (!el) return;
  try {
    const res = await fetch('/api/pipeline/stats/history');
    const data = await res.json();
    const records = data.records || [];
    if (!records.length) { el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-tertiary)">暂无历史数据</div>'; return; }
    el.innerHTML = `<table><tr><th>日期</th><th>总数据</th><th>其他</th><th>来源文件</th></tr>` +
      records.slice(-30).reverse().map(r => {
        const tagDist = r.tag_distribution || r.tag_dist_all || {};
        const total = r.total || Object.values(tagDist).reduce((a,b) => a+b, 0);
        return `<tr><td>${r.date || '-'}</td><td>${total.toLocaleString()}</td><td>${(tagDist['其他']||0).toLocaleString()}</td><td>${r.source_file || '-'}</td></tr>`;
      }).join('') + '</table>';
  } catch (e) { el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-tertiary)">加载失败</div>'; }
}

// ===== 口令过滤 =====

async function pipelineFilter(files) {
  if (!files || !files.length) return;
  const progressEl = document.getElementById('filter-progress');
  const progressBody = document.getElementById('filter-progress-body');
  const resultEl = document.getElementById('filter-result');
  progressEl.style.display = 'block';
  resultEl.style.display = 'none';
  progressBody.innerHTML = `正在上传 ${files.length} 个文件...`;

  const fd = new FormData();
  for (const f of files) fd.append('files', f);

  try {
    const res = await fetch('/api/pipeline/filter', { method: 'POST', body: fd });
    const data = await res.json();
    progressEl.style.display = 'none';
    if (!res.ok) { resultEl.style.display = 'block'; document.getElementById('filter-result-body').innerHTML = '<div style="color:var(--red)">过滤失败</div>'; return; }
    const tagDist = data.tag_distribution || {};
    resultEl.style.display = 'block';
    document.getElementById('filter-result-body').innerHTML = `
      <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:12px">
        <div class="kpi-card"><div class="kpi-label">过滤后数据量</div><div class="kpi-value">${(data.total||0).toLocaleString()}</div></div>
        <div class="kpi-card"><div class="kpi-label">分类数</div><div class="kpi-value">${Object.keys(tagDist).length}</div></div>
      </div>
      <table><tr><th>分类</th><th>数量</th><th>占比</th></tr>${Object.entries(tagDist).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `<tr><td>${k}</td><td>${v.toLocaleString()}</td><td>${(v/(data.total||1)*100).toFixed(1)}%</td></tr>`).join('')}</table>`;
  } catch (e) {
    progressEl.style.display = 'none';
    resultEl.style.display = 'block';
    document.getElementById('filter-result-body').innerHTML = '<div style="color:var(--red)">请求失败: ' + e.message + '</div>';
  }
}

// ===== 监控看板 =====

async function loadMonitorStatus() {
  try {
    const res = await fetch('/health');
    await res.json();
    document.getElementById('mon-api-status').innerHTML = '<span class="badge status-on">正常</span>';
  } catch { document.getElementById('mon-api-status').innerHTML = '<span class="badge status-off">离线</span>'; }
  try {
    const res = await fetch('/api/pipeline/stats/history');
    const data = await res.json();
    const records = data.records || [];
    document.getElementById('mon-records').textContent = records.length;
    document.getElementById('mon-last-update').textContent = data.last_updated ? new Date(data.last_updated).toLocaleString() : '-';
    const tableEl = document.getElementById('mon-table');
    if (records.length) {
      tableEl.innerHTML = `<table style="font-size:12px"><tr><th>日期</th><th>总数据</th><th>其他</th><th>来源</th></tr>` +
        records.slice(-10).reverse().map(r => {
          const total = r.total || Object.values(r.tag_dist_all||{}).reduce((a,b)=>a+b,0);
          return `<tr><td>${r.date||'-'}</td><td>${total.toLocaleString()}</td><td>${((r.tag_dist_all||{})['其他']||0).toLocaleString()}</td><td>${r.source_file||'-'}</td></tr>`;
        }).join('') + '</table>';
    }
    loadPipelineHistory();
  } catch {
    document.getElementById('mon-records').textContent = '-';
    document.getElementById('mon-last-update').textContent = '无法连接';
  }
  // 加载运行状态和日志
  pipelineRefreshState();
  // 如果 pipeline 在运行中，启动轮询
  try {
    const r = await fetch('/api/pipeline/pipeline/status');
    const s = await r.json();
    if (s.running) pipelinePollStart();
  } catch {}
}

// ===== 页面切换钩子 =====
// 注册 pipeline 页面切换钩子（适配 workbench 的 switchPage）
document.addEventListener('page-change', function(e) {
  const pageId = e.detail;
  if (pageId !== 'pipeline.monitor') pipelinePollStop();
  if (pageId === 'pipeline.annotate') setTimeout(initDashboard, 200);
  else if (pageId === 'pipeline.monitor') setTimeout(loadMonitorStatus, 100);
  else if (pageId === 'pipeline.stats') setTimeout(loadPipelineHistory, 100);
  else if (pageId === 'pipeline.task') setTimeout(_initTaskPage, 100);
});

// 兜底：如果没有 page-change 事件，hook switchPage
(function() {
  const _orig = window.switchPage;
  if (typeof _orig !== 'function') return;
  window.switchPage = function(pageId) {
    _orig(pageId);
    if (pageId !== 'pipeline.monitor') pipelinePollStop();
    if (pageId === 'pipeline.annotate') setTimeout(initDashboard, 200);
    else if (pageId === 'pipeline.monitor') setTimeout(loadMonitorStatus, 100);
    else if (pageId === 'pipeline.stats') setTimeout(loadPipelineHistory, 100);
    else if (pageId === 'pipeline.task') setTimeout(_initTaskPage, 100);
  };
})();

// 注册隐藏页面（不在侧栏显示，通过页面内按钮跳转）
if (typeof HIDDEN_PAGES !== 'undefined') {
  HIDDEN_PAGES['pipeline.task'] = { label: '标注任务', group: '数据流水线' };
  HIDDEN_PAGES['pipeline.stats'] = { label: '统计分析', group: '数据流水线' };
  HIDDEN_PAGES['pipeline.filter'] = { label: '口令过滤', group: '数据流水线' };
  HIDDEN_PAGES['pipeline.monitor'] = { label: '监控看板', group: '数据流水线' };
}

// ===== Pipeline 自动化控制 =====

let _pipelinePollTimer = null;

async function pipelineAction(action) {
  const dirEl = document.getElementById('pl-watch-dir');
  const skipEl = document.getElementById('pl-skip-existing');
  const watchDir = dirEl ? dirEl.value.trim() : '';
  const skipExisting = skipEl ? skipEl.checked : true;

  const params = new URLSearchParams();
  if (watchDir) params.set('watch_dir', watchDir);
  if (action === 'batch') params.set('skip_existing', skipExisting);

  const method = 'POST';
  const url = '/api/pipeline/pipeline/' + action + (params.toString() ? '?' + params.toString() : '');

  try {
    const res = await fetch(url, { method });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    pipelinePollStart();
  } catch (e) {
    alert('请求失败: ' + e.message);
  }
}

function pipelinePollStart() {
  if (_pipelinePollTimer) clearInterval(_pipelinePollTimer);
  pipelineRefreshState();
  _pipelinePollTimer = setInterval(pipelineRefreshState, 3000);
}

function pipelinePollStop() {
  if (_pipelinePollTimer) { clearInterval(_pipelinePollTimer); _pipelinePollTimer = null; }
}

async function pipelineRefreshState() {
  try {
    const res = await fetch('/api/pipeline/pipeline/status');
    const s = await res.json();

    const setStatus = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

    const running = s.running;
    const modeLabels = { idle: '空闲', monitor: '监控中', batch: '批量处理', pipeline: '流水线' };
    setStatus('pl-state-status', running ? '运行中' : '空闲');
    setHtml('pl-state-status', running ? '<span class="badge status-on">运行中</span>' : '<span class="badge status-off">空闲</span>');
    setStatus('pl-state-mode', modeLabels[s.mode] || s.mode);
    setStatus('pl-state-processed', s.processed || 0);
    setStatus('pl-state-failed', s.failed || 0);
    setStatus('pl-state-skipped', s.skipped || 0);
    setStatus('pl-state-current', s.current_file || '-');
    setStatus('pl-state-watchdir', s.watch_dir || '-');
    setStatus('pl-state-started', s.started_at ? '启动于 ' + new Date(s.started_at).toLocaleTimeString() : '-');

    const logEl = document.getElementById('pl-log');
    if (logEl) {
      const logs = s.log || [];
      if (logs.length) {
        logEl.innerHTML = logs.map(l => '<div>' + l + '</div>').join('');
        logEl.scrollTop = logEl.scrollHeight;
      } else {
        logEl.innerHTML = '<div style="color:var(--text-tertiary)">暂无日志</div>';
      }
    }

    // Button states
    const btnMonitor = document.getElementById('pl-btn-monitor');
    const btnBatch = document.getElementById('pl-btn-batch');
    const btnPipeline = document.getElementById('pl-btn-pipeline');
    const btnStop = document.getElementById('pl-btn-stop');
    if (btnMonitor) btnMonitor.disabled = running;
    if (btnBatch) btnBatch.disabled = running;
    if (btnPipeline) btnPipeline.disabled = running;
    if (btnStop) btnStop.disabled = !running;

    // Stop polling if idle
    if (!running && _pipelinePollTimer) {
      clearInterval(_pipelinePollTimer);
      _pipelinePollTimer = null;
    }
  } catch (e) {}
}
