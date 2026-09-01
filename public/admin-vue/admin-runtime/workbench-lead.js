// ===== 企业客户管理 · 线索管理（线索看板 + 线索池） =====
// 原生 JS 模块，移植自 线索管理系统(Vue) POC，复用 workbench CSS 与本地 ECharts。
// 注册 PAGE_RENDERERS['lead.dashboard'] / ['lead.pool']，通过 page-change 事件初始化图表与交互。
(function () {
  'use strict';

  // ── 图表中低饱和色板（对齐 design-tokens，亦由 workbench 主题桥接兜底）──
  const LCHART = {
    seq: ['#EAF3FF', '#CFE3F8', '#9FC4EA', '#6EA2D7', '#3F78C5'],
    c: ['#3F78C5', '#3F9EAD', '#58A86A', '#C89532', '#9070C3', '#B45F86', '#6F879E', '#4F6578'],
    danger: '#D24A4A', sub: '#646A73', axis: '#9AA3AF', grid: '#E5E8EC', label: '#1F2329',
  };

  // ── 业务字典 ──
  const QSM = {
    '有效-已知销售线索': '已接收', '有效-新销售线索': '已接收', '有效-暂无商机可经营': '已接收',
    '无法经营-电话接通但拒绝沟通': '已退回', '无法经营-非相关联系人': '已退回',
    '无效-无采购权': '已退回', '无效-公司名称无法识别机构': '已退回', '无效-非本BU客户': '已退回',
    '无效-电话错误或联系人错误': '已退回', '无效-公司已经注销或破产': '已退回',
    '重复派发-2周内重复导入工单': '匹配历史线索状态', '重新分配-转正确客户负责人': '跟进中',
  };
  const QS = Object.keys(QSM);
  const STATS = ['已接收', '跟进中', '已退回', '匹配历史线索状态'];
  const GRADES = ['B3', 'B4', 'B5'];
  const PRODS = ['83-TB', '84-TPP', '84-TPE', '49-YTNB', '68-YTDT'];
  const SQL_AMOUNT_FIELDS = [
    { key: 'sqlAmountPc', code: 'PC', label: 'SQL金额-PC（万元）' },
    { key: 'sqlAmountSd', code: 'SD', label: 'SQL金额-SD（万元）' },
    { key: 'sqlAmountSs', code: 'SS', label: 'SQL金额-SS（万元）' },
    { key: 'sqlAmountSi', code: 'SI', label: 'SQL金额-SI（万元）' },
  ];
  const SQL_AMOUNT_LIMITS = { sqlAmountPc: 500, sqlAmountSd: 50, sqlAmountSs: 50 };
  // 3.6 线索一级来源：AI营销 / 官网传递 / 自挖掘（非导入线索默认「官网传递」）
  const LEAD_SOURCES = ['官网传递', 'AI营销', '自挖掘'];
  // 3.7 线索二级来源：业务导入自定义，无预设（mock 给少量示例）
  const LEAD_SOURCES2 = ['企业购首页', '商品详情页', '活动落地页', '搜索', '客户经理录入', ''];
  const LEAD_SOURCES3 = ['SEM', '信息流', 'EDM', '社群', '转介绍', ''];
  const CUSTOMER_MANAGER_CODES = ['CM001', 'CM002', 'CM003', 'CM004'];
  const SPS = [
    { itcode: 'l001', name: 'Leader张', team: 'beijing', role: 'leader' },
    { itcode: 'z001', name: '张三', team: 'beijing', role: 'sales' },
    { itcode: 'z002', name: '李四', team: 'beijing', role: 'sales' },
    { itcode: 'z003', name: '王五', team: 'chengdu', role: 'sales' },
  ];
  const LEADER_ITCODE = 'l001';
  const SALES_ITCODE = 'z001';

  // ── 通用 helper ──
  function dispStatus(l, role) {
    if (role === 'leader' && l.assignLevel === 1) return l.status === '已退回' ? '已退回' : '';
    // 已分配但无质量：仅到 Sales（level≥2）才视为跟进中；仅推送到 Leader（level1）线索状态为空(-)
    if (!l.quality) return (l.assignStatus === '已分配' && l.assignLevel >= 2) ? '跟进中' : '';
    return l.status;
  }
  function dispAssign(l, role) {
    if (l.assignStatus === '待分配') return '待分配';
    if (role === 'ops') return '已分配';
    if (role === 'leader') return l.assignLevel >= 2 ? '已分配' : '待分配';
    return '已分配';
  }
  // 状态 → workbench badge class
  function badgeClass(s) {
    if (s === '待接收') return 'badge-orange';
    if (s === '已接收') return 'badge-blue';
    if (s === '跟进中') return 'badge-green';
    if (s === '已退回') return 'badge-red';
    if (s === '匹配历史线索状态') return 'badge-orange';
    if (s === '已转商机') return 'badge-purple';
    return 'badge';
  }
  function leadTag(s) {
    if (!s) return '<span style="color:var(--text-tertiary)">-</span>';
    const c = badgeClass(s);
    return `<span class="badge ${c === 'badge' ? '' : c}">${s}</span>`;
  }
  function maskPhone(p) { return p ? p.slice(0, 3) + '****' + p.slice(-4) : '-'; }
  function hasSqlBreakdown(lead) { return SQL_AMOUNT_FIELDS.some(f => Object.prototype.hasOwnProperty.call(lead, f.key)); }
  function leadSqlAmount(lead, key) {
    if (hasSqlBreakdown(lead)) return lead[key] == null ? null : Number(lead[key]);
    return key === 'sqlAmountPc' && Number(lead.sqlAmt) > 0 ? Number(lead.sqlAmt) : null;
  }
  function leadSqlTotal(lead) { return SQL_AMOUNT_FIELDS.reduce((sum, f) => sum + (Number(lead[f.key]) || 0), 0); }
  function fmtSqlAmount(value) { return value == null || value === '' ? '-' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
  function fmtSqlAmountWithUnit(value) { const text = fmtSqlAmount(value); return text === '-' ? '-' : text + '万'; }
  function z(n) { return String(n).padStart(2, '0'); }
  function fmt(d) {
    if (!d) return '-';
    const t = new Date(d);
    return `${t.getFullYear()}-${z(t.getMonth() + 1)}-${z(t.getDate())} ${z(t.getHours())}:${z(t.getMinutes())}`;
  }
  let _uid = 0;
  function uid() { return 'OID-' + String(Date.now()).slice(-5) + String(++_uid).padStart(3, '0'); }
  let _leadNoSeq = 100200;
  function genLeadNo() { return 'XS' + (++_leadNoSeq); }
  let _rowSeq = 0;
  function genRowId() { return 'row-' + (++_rowSeq); }
  // 当前操作人 itcode（按角色）
  const OPS_ITCODE = 'yunying2';
  function currentItcode() { return LEAD.role === 'ops' ? OPS_ITCODE : LEAD.role === 'leader' ? LEADER_ITCODE : SALES_ITCODE; }
  // 统一写入跟进记录日志：操作人 itcode / 变更内容 / 时间（可选状态变更、关联编号）
  function pushLog(lead, type, content, extra) {
    lead.followLogs.push(Object.assign({ type, op: currentItcode(), note: content, time: new Date(), sc: null }, extra || {}));
  }
  function esc(v) { const s = String(v == null ? '' : v); return s.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  const NAMES = ['张伟', '李娜', '王芳', '刘强', '陈明', '杨红', '赵磊', '周晓', '吴静', '孙鹏', '马超', '胡敏', '郑浩', '朱艳', '高峰', '林雪', '何涛', '罗琳', '徐峰', '曾丽'];
  const CORPS = ['联想科技', '阿里云', '腾讯云', '华为技术', '百度在线', '字节跳动', '美团点评', '滴滴出行', '京东物流', '网易游戏', '小米科技', 'OPPO', 'vivo', '中兴通讯', '三星中国', '戴尔科技', '惠普中国', '英特尔', 'AMD中国', 'IBM中国'];
  const STS20 = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0];
  function mkLead(i) {
    const level = STS20[i];
    const base = new Date(2026, 2, 1);
    const ca = new Date(base.getTime() + i * 86400000);
    const quality = level > 0 ? QS[i % QS.length] : '';
    let status = quality ? QSM[quality] : '';
    // “匹配历史线索状态”不作为展示值，解析为历史状态（已接收/已退回/跟进中）
    if (status === '匹配历史线索状态') status = ['已接收', '已退回', '跟进中'][i % 3];
    const salesPeople = SPS.filter(s => s.role === 'sales');
    const owner = level === 1 ? LEADER_ITCODE : level === 2 ? salesPeople[i % salesPeople.length].itcode : '';
    const leaderItcode = level >= 1 ? LEADER_ITCODE : '';
    const pushAt = level >= 1 ? new Date(ca.getTime() + 86400000) : null;       // 运营→leader 推送销售时间
    const aa = level >= 2 ? new Date(ca.getTime() + 1.5 * 86400000) : null;     // leader→sales 分配时间
    const assignStatus = (level > 0 && status !== '已退回') ? '已分配' : '待分配';
    const fol = ['已接收', '跟进中', '已退回', '匹配历史线索状态'].includes(status);
    const fa = fol ? new Date(ca.getTime() + 2 * 86400000) : null;
    const sqlAmountPc = fol ? parseFloat((12 + i * 2.1).toFixed(2)) : null;
    const sqlAmountSd = fol ? parseFloat((3 + i * 0.7).toFixed(2)) : null;
    const sqlAmountSs = fol ? parseFloat((2 + i * 0.5).toFixed(2)) : null;
    const sqlAmountSi = fol ? parseFloat((1 + i * 0.3).toFixed(2)) : null;
    const sqlAmt = [sqlAmountPc, sqlAmountSd, sqlAmountSs, sqlAmountSi].reduce((sum, value) => sum + (value || 0), 0);
    const leadNo = level > 0 ? 'XS' + String(100001 + i) : '';                   // 线索编号：已分配后生成
    return {
      rowId: genRowId(), oneId: uid(), leadNo, lenovoId: i % 3 === 0 ? `LD${100000 + i * 7}` : '',
      name: NAMES[i], company: CORPS[i],
      phone: `138${String(10000000 + i * 1357913).slice(0, 8)}`,
      grade: GRADES[i % 3], product: PRODS[i % 5],
      status, quality, score: 10 + Math.floor(i * 4.7) % 91, sqlAmt, sqlAmountPc, sqlAmountSd, sqlAmountSs, sqlAmountSi,
      source: LEAD_SOURCES[i % LEAD_SOURCES.length], source2: LEAD_SOURCES2[i % LEAD_SOURCES2.length], source3: LEAD_SOURCES3[i % LEAD_SOURCES3.length],
      assignLevel: level, assignStatus, leaderItcode, isMql: level >= 1 ? '是' : '否',
      assignedBy: level === 1 ? OPS_ITCODE : level === 2 ? LEADER_ITCODE : '',
      owner,
      customerManagerCode: i % 4 === 0 ? '' : CUSTOMER_MANAGER_CODES[i % CUSTOMER_MANAGER_CODES.length],
      relGabIs: i % 3 === 0 ? 'GAB-' + String(1001 + i) : '',
      relKabIs: i % 3 === 1 ? 'KAB-' + String(2001 + i) : '',
      relEmergingMarketIs: i % 3 === 2 ? 'EM-' + String(3001 + i) : '',
      createdAt: ca, pushAt, assignedAt: aa, feedbackAt: fa, convertedAt: null,
      scoreLogs: [], followLogs: [],
    };
  }

  // ── 看板 mock 数据 ──
  const KB_FUNNEL = {
    month: { cur: { iql: 12450, mql: 8320, sql: 5140, opp: 1870, oppAmt: 892.50, actUserTTL: 3240, actCorpTTL: 1820, ca: 756, gmv: 4218.60 }, yoy: { iql: 10800, mql: 7100, sql: 4320, opp: 1540, oppAmt: 750.00, actUserTTL: 2800, actCorpTTL: 1580, ca: 620, gmv: 3540.00 }, mom: { iql: 11900, mql: 7980, sql: 4850, opp: 1720, oppAmt: 820.00, actUserTTL: 3100, actCorpTTL: 1740, ca: 710, gmv: 3980.00 } },
    quarter: { cur: { iql: 38200, mql: 25400, sql: 15800, opp: 5620, oppAmt: 2680.00, actUserTTL: 9800, actCorpTTL: 5420, ca: 2340, gmv: 12860.00 }, yoy: { iql: 32000, mql: 21200, sql: 13000, opp: 4500, oppAmt: 2100.00, actUserTTL: 8200, actCorpTTL: 4600, ca: 1980, gmv: 10500.00 }, mom: { iql: 36000, mql: 24000, sql: 14800, opp: 5200, oppAmt: 2480.00, actUserTTL: 9200, actCorpTTL: 5100, ca: 2180, gmv: 11900.00 } },
    year: { cur: { iql: 152000, mql: 98000, sql: 61000, opp: 21500, oppAmt: 10240.00, actUserTTL: 38200, actCorpTTL: 21000, ca: 9100, gmv: 50800.00 }, yoy: { iql: 128000, mql: 82000, sql: 50000, opp: 17500, oppAmt: 8200.00, actUserTTL: 31000, actCorpTTL: 17200, ca: 7500, gmv: 42000.00 }, mom: { iql: 140000, mql: 90000, sql: 55000, opp: 19200, oppAmt: 9100.00, actUserTTL: 34500, actCorpTTL: 19000, ca: 8300, gmv: 46500.00 } },
    week: { cur: { iql: 3112, mql: 2080, sql: 1285, opp: 468, oppAmt: 223.10, actUserTTL: 810, actCorpTTL: 455, ca: 189, gmv: 1054.65 }, yoy: { iql: 2700, mql: 1775, sql: 1080, opp: 385, oppAmt: 187.50, actUserTTL: 700, actCorpTTL: 395, ca: 155, gmv: 885.00 }, mom: { iql: 2975, mql: 1995, sql: 1212, opp: 430, oppAmt: 205.00, actUserTTL: 775, actCorpTTL: 435, ca: 177, gmv: 995.00 } },
    day: { cur: { iql: 498, mql: 333, sql: 206, opp: 75, oppAmt: 35.70, actUserTTL: 130, actCorpTTL: 73, ca: 30, gmv: 168.74 }, yoy: { iql: 432, mql: 284, sql: 173, opp: 62, oppAmt: 30.00, actUserTTL: 112, actCorpTTL: 63, ca: 25, gmv: 141.60 }, mom: { iql: 476, mql: 319, sql: 194, opp: 69, oppAmt: 32.80, actUserTTL: 124, actCorpTTL: 70, ca: 28, gmv: 159.20 } },
  };
  const KB_TEAM_METRICS = [
    { label: 'IQL', note: '线索池总量' }, { label: 'MQL', note: '已分配线索量' }, { label: 'SQL', note: '线索接收量' },
    { label: 'SQL金额(万)', note: 'SQL阶段合计金额' }, { label: '跟进中', note: '线索质量字段为空的数量' },
    { label: '退回', note: '= MQL − SQL − 跟进中（自动计算）', isCalc: true },
    { label: '商机客户数', note: '商机数据中客户去重数量' }, { label: '商机CA', note: 'PC+NUC+服务器+工作站数量' },
    { label: '商机金额(万)', note: '商机数据金额合计' }, { label: '激活客户数', note: '已购买商品用户数（去重）' },
    { label: '订单CA', note: '特定产品组非赠品商品数量' }, { label: '订单金额(万)', note: '所有产品组非赠品收款金额合计' },
    { label: 'B4激活数', note: '下单客户分级不为B123的激活数' }, { label: 'B4激活CA', note: 'B4激活客户中的CA数量' },
    { label: 'B4激活金额(万)', note: 'B4激活客户金额合计' },
  ];
  const KB_TEAM_RAW = {
    month: { chengdu: [5200, 3480, 2150, 380.50, 820, 0, 800, 680, 312.40, 205, 120, 480.50, 210, 180, 680.50], beijing: [7250, 4840, 2990, 512.00, 1140, 0, 1205, 950, 435.60, 307, 160, 680.00, 298, 252, 950.00] },
    quarter: { chengdu: [16200, 10800, 6700, 1180.00, 2560, 0, 2400, 2100, 960.00, 615, 380, 1480.00, 650, 540, 2040.00], beijing: [22000, 14600, 9100, 1500.00, 3480, 0, 3605, 2860, 1320.00, 921, 520, 2020.00, 880, 760, 2850.00] },
    year: { chengdu: [63000, 41800, 25900, 4580.00, 9900, 0, 9600, 8100, 3720.00, 2460, 1480, 5720.00, 2520, 2100, 7920.00], beijing: [89000, 56200, 35100, 5660.00, 13400, 0, 14445, 11000, 5020.00, 3688, 2040, 7820.00, 3380, 2960, 11200.00] },
    week: { chengdu: [1300, 870, 537, 95.13, 205, 0, 200, 170, 78.10, 51, 30, 120.13, 52, 45, 170.13], beijing: [1813, 1210, 748, 128.00, 285, 0, 301, 238, 108.90, 77, 40, 170.00, 74, 63, 237.50] },
    day: { chengdu: [208, 139, 86, 15.22, 33, 0, 32, 27, 12.50, 8, 5, 19.22, 8, 7, 27.22], beijing: [290, 194, 120, 20.48, 46, 0, 48, 38, 17.42, 12, 6, 27.20, 12, 10, 38.00] },
  };
  const KB_RETURN_REASONS = ['无法经营-电话接通但拒绝沟通', '无法经营-非相关联系人', '无效-无采购权', '无效-公司名称无法识别机构', '无效-非本BU客户', '无效-电话错误或联系人错误', '无效-公司已经注销或破产', '重复派发-2周内重复导入工单', '重新分配-转正确客户负责人'];
  const KB_RETURN_DATA = {
    month: { cur: [182, 145, 98, 74, 62, 88, 43, 120, 55], yoy: [210, 168, 112, 88, 74, 104, 52, 142, 68], mom: [195, 155, 105, 80, 68, 96, 48, 130, 60] },
    quarter: { cur: [548, 435, 294, 222, 186, 264, 129, 360, 165], yoy: [634, 504, 340, 256, 216, 308, 150, 420, 196], mom: [586, 466, 315, 240, 200, 284, 138, 386, 177] },
    year: { cur: [2180, 1720, 1160, 880, 740, 1040, 510, 1420, 650], yoy: [2520, 1996, 1340, 1020, 860, 1208, 592, 1652, 756], mom: [2340, 1848, 1244, 946, 798, 1118, 548, 1526, 698] },
    week: { cur: [46, 36, 25, 19, 16, 22, 11, 30, 14], yoy: [53, 42, 29, 22, 19, 26, 13, 36, 17], mom: [49, 39, 27, 20, 17, 24, 12, 32, 15] },
    day: { cur: [7, 6, 4, 3, 2, 4, 2, 5, 2], yoy: [8, 7, 5, 4, 3, 5, 2, 6, 3], mom: [8, 6, 4, 3, 3, 4, 2, 5, 2] },
  };
  const KB_SCORE_BANDS = ['0-20分', '21-40分', '41-60分', '61-80分', '81-100分'];
  const KB_SCORE_COLORS = [...LCHART.seq];
  const KB_SCORE_DATA = { month: [420, 1840, 3280, 4120, 2790], quarter: [1260, 5520, 9840, 12360, 8370], year: [4900, 21400, 38200, 47800, 32400], week: [105, 460, 820, 1030, 698], day: [17, 74, 131, 165, 112] };
  const KB_SOURCES = ['官网注册', 'AI营销', '批量导入', '自挖掘', '外呼'];
  const KB_SOURCE_KEYS = ['web', 'ai', 'batch', 'self', 'call'];
  const KB_SOURCE_COLS = ['IQL', 'MQL', 'SQL', 'OPP', '商机金额(万)', '激活客户数(TTL)', '激活公司数(TTL)', '激活客户数(SMB)', '激活公司数(SMB)', '成交CA', '成交GMV(万)'];
  const KB_SOURCE_RAW = {
    month: [[4820, 3210, 1980, 720, 342.00, 1240, 680, 760, 420, 290, 1620.00], [2840, 1890, 1170, 430, 206.00, 730, 400, 450, 248, 172, 960.00], [1980, 1320, 820, 298, 142.00, 510, 278, 314, 172, 120, 670.00], [1640, 1100, 680, 248, 118.00, 420, 232, 260, 142, 98, 556.00], [1170, 800, 490, 174, 84.50, 340, 230, 196, 138, 76, 412.60]],
    quarter: [[14820, 9870, 6100, 2220, 1054.00, 3820, 2090, 2340, 1290, 892, 4990.00], [8740, 5820, 3600, 1320, 630.00, 2240, 1230, 1380, 762, 530, 2950.00], [6100, 4060, 2520, 918, 438.00, 1570, 856, 966, 532, 370, 2060.00], [5040, 3360, 2080, 756, 362.00, 1290, 708, 794, 436, 304, 1700.00], [3500, 2310, 1500, 404, 196.00, 1080, 538, 620, 360, 244, 1160.00]],
    year: [[58900, 39200, 24200, 8800, 4200.00, 15200, 8300, 9300, 5120, 3540, 19800.00], [34700, 23100, 14300, 5240, 2500.00, 8900, 4880, 5480, 3020, 2100, 11700.00], [24200, 16100, 10000, 3660, 1740.00, 6210, 3400, 3840, 2120, 1470, 8180.00], [20000, 13300, 8280, 3020, 1440.00, 5120, 2810, 3170, 1740, 1210, 6750.00], [14200, 9300, 5220, 2780, 360.00, 2770, 2610, 2010, 1200, 980, 4370.00]],
    week: [[1205, 803, 495, 180, 85.50, 310, 170, 190, 105, 72, 405.00], [710, 473, 293, 108, 51.50, 183, 100, 113, 62, 43, 240.00], [495, 330, 205, 75, 35.50, 128, 70, 79, 43, 30, 167.50], [410, 275, 170, 62, 29.50, 105, 58, 65, 36, 25, 139.00], [293, 200, 123, 44, 21.13, 85, 58, 49, 35, 19, 103.15]],
    day: [[193, 128, 79, 29, 13.68, 50, 27, 30, 17, 12, 64.80], [114, 76, 47, 17, 8.24, 29, 16, 18, 10, 7, 38.40], [79, 53, 33, 12, 5.68, 20, 11, 13, 7, 5, 26.80], [66, 44, 27, 10, 4.72, 17, 9, 10, 6, 4, 22.24], [47, 32, 20, 7, 3.38, 14, 9, 8, 6, 3, 16.50]],
  };
  const KB_ALLOC_DATA = [
    { oneid: 'XS00001', lenovoid: '10000010', allocTime: '2026.03.01', allocator: 'huangjq5', followIS: 'xuhq3', score: 50 },
    { oneid: 'XS00002', lenovoid: '10000011', allocTime: '2026.03.02', allocator: 'huangjq5', followIS: 'xuhq3', score: 72 },
    { oneid: 'XS00003', lenovoid: '10000012', allocTime: '2026.03.03', allocator: 'huangjq5', followIS: 'peicui2', score: 85 },
    { oneid: 'XS00004', lenovoid: '10000013', allocTime: '2026.03.04', allocator: 'yunying2', followIS: 'peicui2', score: 60 },
    { oneid: 'XS00005', lenovoid: '10000014', allocTime: '2026.03.05', allocator: 'yunying2', followIS: 'xuhq3', score: 91 },
  ];
  const DE_METRICS = [
    { key: 'iql', label: 'IQL', idx: 0, unit: '' }, { key: 'mql', label: 'MQL', idx: 1, unit: '' }, { key: 'sql', label: 'SQL', idx: 2, unit: '' },
    { key: 'sqlAmt', label: 'SQL金额', idx: 3, unit: '万' }, { key: 'act', label: '激活客户数', idx: 9, unit: '' },
    { key: 'oca', label: '订单CA', idx: 10, unit: '' }, { key: 'oAmt', label: '订单金额', idx: 11, unit: '万' },
    { key: 'b4', label: 'B4激活数', idx: 12, unit: '' }, { key: 'b4ca', label: 'B4激活CA', idx: 13, unit: '' }, { key: 'b4amt', label: 'B4激活金额', idx: 14, unit: '万' },
  ];
  const TEAM_OPTS = [{ label: '成都IS', value: 'chengdu' }, { label: '北京IS', value: 'beijing' }];
  const PERSON_OPTS = ['xuhq5', 'peicui2', 'wangw3', 'lihua5'];
  const KB_SOURCE_FILTER_OPTIONS = [{ label: '官网注册', value: 'web' }, { label: 'AI营销', value: 'ai' }, { label: '批量导入', value: 'batch' }, { label: '自挖掘', value: 'self' }, { label: '外呼', value: 'call' }];
  const PRODUCT_TYPE_OPTIONS = [{ label: 'PC', value: 'PC' }, { label: '选件', value: '选件' }, { label: '服务', value: '服务' }];
  const PRODUCT_TYPE_WEIGHTS = { PC: 0.6, 服务: 0.25, 选件: 0.15 };
  const MOCK_IMPORT_BATCHES = [
    { id: 'IMP20260815001', file: '线索批量导入_0815.csv', time: '2026-08-15 14:26', user: 'yunying2', status: '执行完成', total: 20, success: 18, fail: 2, rows: [
      { oneId: 'OID-081501', lenovoId: 'LD081501', name: '陈晨', phone: '138****2101', company: '星河科技有限公司', grade: 'B4', source: '批量导入', reason: '手机号格式不正确' },
      { oneId: 'OID-081502', lenovoId: '', name: '林晓', phone: '139****3782', company: '', grade: 'B3', source: '批量导入', reason: '客户名称不能为空' },
    ] },
    { id: 'IMP20260812002', file: '线索导入模板_0812.csv', time: '2026-08-12 10:08', user: 'huangjq5', status: '执行中', total: 8, success: 5, fail: 0, rows: [] },
    { id: 'IMP20260810003', file: '线索批量导入_0810.csv', time: '2026-08-10 09:35', user: 'yunying2', status: '待执行', total: 12, success: 0, fail: 0, rows: [] },
  ];

  // ── 模块状态 ──
  const DE_LOGS_KEY = 'clue_data_edit_logs';
  const LEAD = {
    role: 'ops',
    leads: Array.from({ length: 20 }, (_, i) => mkLead(i)),
    // 线索池筛选
    fdFrom: '', fdTo: '', fadFrom: '', fadTo: '', fpdFrom: '', fpdTo: '', ffdFrom: '', ffdTo: '', fcvFrom: '', fcvTo: '',
    fLeadNo: '', fLenovo: '', fPhone: '', fCompany: '', fName: '', fQuality: '', fScoreMin: '', fScoreMax: '', fSource2: '', fSource3: '',
    fs: [], fAssign: [], fown: '', fCustomerManagerCodes: [], fdTeam: 'all', fdGrade: [], fSource: [], fMql: [], sf: null, page: 1,
    sk: 'createdAt', sd: 'desc', sel: new Set(),
    // 看板
    kbTab: 'funnel',
    kbFilters: { period: 'month', yoy: false, mom: false, team: [], person: [], source: [], grade: [], productType: [], source2: '', source3: '' },
    kbTab2Period: 'month', kbTab2Yoy: false, kbTab2Mom: false,
    kbMainFrom: '', kbMainTo: '', kbTab2From: '', kbTab2To: '',
    dataEditLogs: JSON.parse(localStorage.getItem(DE_LOGS_KEY) || '[]'),
    poolView: 'list', importBatchId: '', importBatches: MOCK_IMPORT_BATCHES.map(batch => ({ ...batch, rows: batch.rows.map(row => ({ ...row })) })),
    // 弹窗临时表单
    ff: null, _modalCharts: [],
  };
  const POOL_FILTER_KEYS = ['fdFrom', 'fdTo', 'fadFrom', 'fadTo', 'fpdFrom', 'fpdTo', 'ffdFrom', 'ffdTo', 'fcvFrom', 'fcvTo', 'fLeadNo', 'fLenovo', 'fPhone', 'fCompany', 'fName', 'fQuality', 'fScoreMin', 'fScoreMax', 'fSource2', 'fSource3', 'fs', 'fAssign', 'fown', 'fCustomerManagerCodes', 'fdTeam', 'fdGrade', 'fSource', 'fMql'];
  function capturePoolFilters() {
    const snapshot = {};
    POOL_FILTER_KEYS.forEach(key => { snapshot[key] = Array.isArray(LEAD[key]) ? [...LEAD[key]] : LEAD[key]; });
    return snapshot;
  }
  LEAD.poolAppliedFilters = capturePoolFilters();
  const KB_FILTER_KEYS = ['period', 'yoy', 'mom', 'team', 'person', 'source', 'grade', 'productType', 'source2', 'source3'];
  function defaultKbFilters() { return { period: 'month', yoy: false, mom: false, team: [], person: [], source: [], grade: [], productType: [], source2: '', source3: '' }; }
  function captureKbFilters() {
    const snapshot = {};
    KB_FILTER_KEYS.forEach(key => { snapshot[key] = Array.isArray(LEAD.kbFilters[key]) ? [...LEAD.kbFilters[key]] : LEAD.kbFilters[key]; });
    return snapshot;
  }
  function activeKbFilters() { return LEAD.kbAppliedFilters || captureKbFilters(); }
  LEAD.kbAppliedFilters = captureKbFilters();

  const charts = {}; // id -> echarts instance

  // ── 数字格式 ──
  const kbFmt = n => n == null ? '-' : Math.round(n).toLocaleString('zh-CN');
  const kbFmtAmt = n => n == null ? '-' : '¥' + n.toFixed(2) + '万';
  const kbConvRate = (a, b) => b > 0 ? (a / b * 100).toFixed(1) + '%' : '-';
  const kbTT = (c, b) => { if (!b) return '-'; const d = ((c - b) / b * 100).toFixed(1); return (d >= 0 ? '↑+' : '↓') + Math.abs(d) + '%'; };
  const kbTC = (c, b) => !b ? 'flat' : c >= b ? 'up' : 'down';

  // ── 计算：当前视角线索 ──
  function curLeads() {
    if (LEAD.role === 'sales') return LEAD.leads.filter(l => l.owner === SALES_ITCODE && l.assignLevel >= 2);
    if (LEAD.role === 'leader') return LEAD.leads.filter(l => l.leaderItcode === LEADER_ITCODE);
    return LEAD.leads;
  }
  // 2.5.1 分配路径 运营→Leader→Sales：运营只可选 Leader，Leader 只可选 Sales
  function assignableSPS() {
    if (LEAD.role === 'ops') return SPS.filter(s => s.role === 'leader');
    return SPS.filter(s => s.role === 'sales');
  }
  // 2.4 筛选条件：概览卡 + 列表都基于「筛选栏」联动（poolBase）；概览卡快捷筛选(sf)只再叠加到列表
  function poolBase() {
    let list = [...curLeads()];
    const filters = LEAD.poolAppliedFilters || capturePoolFilters();
    const rangeF = (key, from, to) => {
      if (from) { const f = new Date(from); f.setHours(0, 0, 0, 0); list = list.filter(l => l[key] && new Date(l[key]) >= f); }
      if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); list = list.filter(l => l[key] && new Date(l[key]) <= t); }
    };
    rangeF('createdAt', filters.fdFrom, filters.fdTo);    // 创建日期
    rangeF('assignedAt', filters.fadFrom, filters.fadTo); // 分配时间
    rangeF('pushAt', filters.fpdFrom, filters.fpdTo);     // 推送销售时间
    rangeF('feedbackAt', filters.ffdFrom, filters.ffdTo); // 反馈时间
    rangeF('convertedAt', filters.fcvFrom, filters.fcvTo); // 转商机时间
    const eq = (v, f) => String(v || '').trim().toLowerCase() === f.trim().toLowerCase();
    const inc = (v, f) => String(v || '').toLowerCase().includes(f.trim().toLowerCase());
    if (filters.fLeadNo.trim()) list = list.filter(l => inc(l.leadNo, filters.fLeadNo)); // 线索编号
    if (filters.fLenovo.trim()) list = list.filter(l => eq(l.lenovoId, filters.fLenovo)); // Lenovo ID 精准
    if (filters.fPhone.trim()) list = list.filter(l => eq(l.phone, filters.fPhone));      // 手机号 精准
    if (filters.fName.trim()) list = list.filter(l => inc(l.name, filters.fName));        // 姓名 模糊
    if (filters.fCompany.trim()) list = list.filter(l => inc(l.company, filters.fCompany)); // 客户名称 模糊
    if (filters.fQuality.trim()) list = list.filter(l => inc(l.quality, filters.fQuality)); // Leads质量 模糊
    if (filters.fScoreMin !== '') list = list.filter(l => Number(l.score) >= Number(filters.fScoreMin));
    if (filters.fScoreMax !== '') list = list.filter(l => Number(l.score) < Number(filters.fScoreMax));
    if (filters.fSource2.trim()) list = list.filter(l => inc(l.source2, filters.fSource2)); // 二级来源
    if (filters.fSource3.trim()) list = list.filter(l => inc(l.source3, filters.fSource3)); // 三级来源
    if (filters.fs.length) list = list.filter(l => filters.fs.includes(l.status) || (filters.fs.includes('__none__') && !l.status)); // 线索状态（含"无"=状态为空）
    if (filters.fAssign.length) list = list.filter(l => filters.fAssign.includes(dispAssign(l, LEAD.role))); // 分配状态
    if (filters.fown.trim()) list = list.filter(l => inc(l.owner, filters.fown));         // 所属IS 模糊
    if (filters.fCustomerManagerCodes.length) list = list.filter(l => filters.fCustomerManagerCodes.includes(l.customerManagerCode) || (filters.fCustomerManagerCodes.includes('__none__') && !l.customerManagerCode)); // 客户经理编码（含无）
    if (filters.fdTeam && filters.fdTeam !== 'all') {                                      // 销售团队（仅运营）
      const codes = SPS.filter(s => s.team === filters.fdTeam).map(s => s.itcode);
      list = list.filter(l => codes.includes(l.owner));
    }
    if (filters.fdGrade.length) list = list.filter(l => filters.fdGrade.includes(l.grade)); // 客户分级
    if (filters.fSource.length) list = list.filter(l => filters.fSource.includes(l.source)); // 线索来源
    if (filters.fMql.length) list = list.filter(l => filters.fMql.includes(l.isMql || '否')); // 是否MQL
    return list;
  }
  function poolRows() {
    let list = poolBase();
    if (LEAD.sf === 'as') list = list.filter(l => dispAssign(l, LEAD.role) === '已分配');
    else if (LEAD.sf === 'un') list = list.filter(l => dispAssign(l, LEAD.role) === '待分配');
    else if (LEAD.sf === 'rc') list = list.filter(l => l.status === '已接收');
    else if (LEAD.sf === 'ip') list = list.filter(l => dispStatus(l, LEAD.role) === '跟进中');
    else if (LEAD.sf === 'rt') list = list.filter(l => l.status === '已退回');
    return list.slice().sort((a, b) => {
      let av = a[LEAD.sk], bv = b[LEAD.sk];
      if (av instanceof Date) av = av.getTime(); if (bv instanceof Date) bv = bv.getTime();
      if (av == null) av = ''; if (bv == null) bv = '';
      return LEAD.sd === 'asc' ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
    });
  }

  // ── 看板：整体漏斗当前值（含团队/来源/个人/产品筛选）──
  // 角色限定团队：sales/leader 仅看本人/本团队数据（看板数据随角色切换）
  function roleTeam() {
    if (LEAD.role === 'sales') return [(SPS.find(s => s.itcode === SALES_ITCODE) || {}).team].filter(Boolean);
    if (LEAD.role === 'leader') return [(SPS.find(s => s.itcode === LEADER_ITCODE) || {}).team].filter(Boolean);
    return null;
  }
  function kbTeamSel() { const rt = roleTeam(); if (rt && rt.length) return rt; const t = activeKbFilters().team; return (!t || !t.length) ? ['chengdu', 'beijing'] : t; }
  // 团队漏斗：销售个人(itcode) / 线索来源 筛选 → 数据按比例缩放（demo）
  function productTypeRatio(filters) { const selected = filters.productType || []; return selected.length ? selected.reduce((sum, type) => sum + (PRODUCT_TYPE_WEIGHTS[type] || 0), 0) : 1; }
  function teamRatio() {
    const filters = activeKbFilters();
    let r = productTypeRatio(filters); const person = filters.person, source = filters.source, grade = filters.grade;
    if (person && person.length) r *= Math.min(0.5 * person.length, 1);
    if (source && source.length) r *= Math.min(source.length / KB_SOURCE_KEYS.length, 1);
    if (grade && grade.length) r *= Math.min(grade.length / GRADES.length, 1);
    if (filters.source2 && filters.source2.trim()) r *= 0.8;
    if (filters.source3 && filters.source3.trim()) r *= 0.8;
    return r;
  }
  const _isAmtIdx = i => [3, 8, 11, 14].includes(i);
  function kbFunnelCur() {
    const filters = activeKbFilters();
    const p = filters.period, selSrc = filters.source;
    const teamSel = kbTeamSel(), person = filters.person;
    const singleTeam = teamSel.length === 1 ? teamSel[0] : null;
    const teamToObj = arr => ({ iql: arr[0], mql: arr[1], sql: arr[2], opp: arr[7], oppAmt: arr[8], actUserTTL: arr[9], actCorpTTL: Math.round(arr[9] * 0.56), ca: arr[10], gmv: arr[11] });
    let base;
    if (singleTeam) base = teamToObj(KB_TEAM_RAW[p][singleTeam]);
    else if (selSrc.length) {
      const raw = KB_SOURCE_RAW[p];
      const rs = KB_SOURCE_KEYS.map((k, i) => selSrc.includes(k) ? raw[i] : null).filter(Boolean);
      if (rs.length) { const sc = ci => rs.reduce((s, r) => s + r[ci], 0); base = { iql: sc(0), mql: sc(1), sql: sc(2), opp: sc(3), oppAmt: sc(4), actUserTTL: sc(5), actCorpTTL: sc(6), ca: sc(9), gmv: sc(10) }; }
      else base = KB_FUNNEL[p].cur;
    } else base = KB_FUNNEL[p].cur;
    let ratio = productTypeRatio(filters);
    if (person && person.length) ratio *= Math.min(0.5 * person.length, 1);
    if (ratio === 1) return base;
    const sc = v => Math.round(v * ratio), sa = v => +((v * ratio).toFixed(2));
    return { iql: sc(base.iql), mql: sc(base.mql), sql: sc(base.sql), opp: sc(base.opp), oppAmt: sa(base.oppAmt), actUserTTL: sc(base.actUserTTL), actCorpTTL: sc(base.actCorpTTL), ca: sc(base.ca), gmv: sa(base.gmv) };
  }
  const kbKpiCards = [
    { key: 'iql', label: '线索池总量', code: 'IQL', isAmt: false }, { key: 'mql', label: '已分配线索量', code: 'MQL', isAmt: false },
    { key: 'sql', label: '线索接收量', code: 'SQL', isAmt: false }, { key: 'opp', label: '商机条数', code: 'OPP', isAmt: false },
    { key: 'oppAmt', label: '商机金额', code: 'OPP金额', isAmt: true }, { key: 'actUserTTL', label: '激活客户数', code: 'TTL', isAmt: false },
    { key: 'actCorpTTL', label: '激活公司数', code: 'TTL', isAmt: false }, { key: 'ca', label: '成交CA', code: '成交CA', isAmt: false },
    { key: 'gmv', label: '成交GMV', code: '成交GMV', isAmt: true },
  ];
  function kbTeamTableData() {
    const p = activeKbFilters().period, cd = KB_TEAM_RAW[p].chengdu, bj = KB_TEAM_RAW[p].beijing;
    const r = teamRatio();
    const sc = (arr, i) => _isAmtIdx(i) ? +(arr[i] * r).toFixed(2) : Math.round(arr[i] * r);
    return KB_TEAM_METRICS.map((m, i) => {
      const cdVal = i === 5 ? sc(cd, 1) - sc(cd, 2) - sc(cd, 4) : sc(cd, i);
      const bjVal = i === 5 ? sc(bj, 1) - sc(bj, 2) - sc(bj, 4) : sc(bj, i);
      return { metric: m.label, note: m.note, isCalc: !!m.isCalc, chengdu: cdVal, beijing: bjVal, total: +((cdVal + bjVal).toFixed(2)) };
    });
  }
  function kbReturnSorted() { const d = KB_RETURN_DATA[LEAD.kbTab2Period].cur; return KB_RETURN_REASONS.map((r, i) => ({ reason: r, val: d[i] })).sort((a, b) => b.val - a.val); }
  function kbSourceTableData() {
    const p = LEAD.kbTab2Period;
    const rows = KB_SOURCES.map((s, i) => [s, ...KB_SOURCE_RAW[p][i]]);
    const totals = ['合计'];
    for (let c = 0; c < KB_SOURCE_COLS.length; c++) totals.push(rows.reduce((sum, r) => sum + (r[c + 1] || 0), 0));
    return [...rows, totals];
  }
  const kbDaysToKey = days => days <= 1 ? 'day' : days <= 7 ? 'week' : days <= 35 ? 'month' : days <= 100 ? 'quarter' : 'year';

  // ===================== 渲染：线索看板 =====================
  function renderDashboard() {
    return `
      <div class="page-header">
        <div><div class="page-title">线索看板</div><div class="page-desc">企业客户管理 · 漏斗转化、线索质量与销售团队业绩</div></div>
        ${roleSwitchHtml()}
      </div>
      <div id="lead-kb"></div>`;
  }
  function roleSwitchHtml() {
    const opt = (v, t) => `<button class="lead-seg-btn ${LEAD.role === v ? 'active' : ''}" onclick="leadSetRole('${v}')">${t}</button>`;
    return `<div class="lead-seg">${opt('ops', '运营视图')}${opt('leader', 'Leader视图')}${opt('sales', 'Sales视图')}</div>`;
  }
  function kbTabsHtml() {
    const tab = (v, t, show) => show ? `<div class="tab-item ${LEAD.kbTab === v ? 'active' : ''}" onclick="leadSetKbTab('${v}')">${t}</div>` : '';
    const ops = LEAD.role === 'ops';
    return `<div class="card lead-tab-wrap"><div class="lead-tabs">
      ${tab('funnel', '整体看板', ops)}${tab('quality', '线索质量看板', ops)}${tab('team', '销售团队漏斗', true)}</div></div>`;
  }
  // 时间周期：周期下拉（框内显示当前周期）+ 自定义日期范围（与线索池/员工筛选同款，无独立标签）
  function periodBarHtml(scope) {
    const cur = scope === 'quality' ? LEAD.kbTab2Period : LEAD.kbFilters.period;
    const fk = scope === 'quality' ? 'kbTab2From' : 'kbMainFrom', tk = scope === 'quality' ? 'kbTab2To' : 'kbMainTo';
    const from = LEAD[fk] || '', to = LEAD[tk] || '', custom = !!(from && to);
    const periods = [['day', '今日'], ['week', '本周'], ['month', '本月'], ['quarter', '本季度'], ['year', '本年']];
    const opts = periods.map(([v, t]) => `<option value="${v}" ${(!custom && cur === v) ? 'selected' : ''}>${t}</option>`).join('');
    return `<select class="ops-select" style="width:104px" title="时间周期" onchange="leadSetPeriod('${scope}',this.value)">${opts}</select>
      <input type="date" class="ops-select lead-date" title="开始日期" value="${from}" onchange="leadSetPeriodDate('${scope}',0,this.value)"/>
      <span class="filter-separator">至</span>
      <input type="date" class="ops-select lead-date" title="结束日期" value="${to}" onchange="leadSetPeriodDate('${scope}',1,this.value)"/>`;
  }
  function kbFilterBarHtml() {
    const ops = LEAD.role === 'ops';
    if (LEAD.kbTab === 'quality') {
      return `<div class="lead-filter card">
        ${periodBarHtml('quality')}
        <label class="lead-ck"><input type="checkbox" ${LEAD.kbTab2Yoy ? 'checked' : ''} onchange="leadSet('kbTab2Yoy',this.checked);leadRenderQuality()"/>同比</label>
        <label class="lead-ck"><input type="checkbox" ${LEAD.kbTab2Mom ? 'checked' : ''} onchange="leadSet('kbTab2Mom',this.checked);leadRenderQuality()"/>环比</label>
        <button class="btn btn-sm btn-secondary" onclick="leadExportQuality()">⬇ 导出数据</button></div>`;
    }
    let html = `<div class="lead-filter card">${periodBarHtml('main')}`;
    if (LEAD.kbTab === 'funnel') {
      html += `<label class="lead-ck"><input type="checkbox" ${LEAD.kbFilters.yoy ? 'checked' : ''} onchange="leadSetKbf('yoy',this.checked)"/>同比</label>
        <label class="lead-ck"><input type="checkbox" ${LEAD.kbFilters.mom ? 'checked' : ''} onchange="leadSetKbf('mom',this.checked)"/>环比</label>`;
    }
    if (ops) {
      html += msHtml('team', TEAM_OPTS, LEAD.kbFilters.team, '销售团队');
      if (LEAD.kbTab === 'funnel') {
        html += msHtml('person', PERSON_OPTS.map(p => ({ label: p, value: p })), LEAD.kbFilters.person, '销售个人');
        html += msHtml('source', KB_SOURCE_FILTER_OPTIONS, LEAD.kbFilters.source, '线索来源');
      } else if (LEAD.kbTab === 'team') {
        // 销售团队漏斗：增加 销售itcode（个人）+ 线索来源 筛选
        html += msHtml('person', PERSON_OPTS.map(p => ({ label: p, value: p })), LEAD.kbFilters.person, '销售itcode');
        html += msHtml('source', KB_SOURCE_FILTER_OPTIONS, LEAD.kbFilters.source, '线索来源');
      }
    } else if (LEAD.role === 'leader') {
      // Leader：销售itcode + 线索来源 筛选（数据锁定本团队）
      html += msHtml('person', PERSON_OPTS.map(p => ({ label: p, value: p })), LEAD.kbFilters.person, '销售itcode');
      html += msHtml('source', KB_SOURCE_FILTER_OPTIONS, LEAD.kbFilters.source, '线索来源');
      html += `<span class="lead-fl" style="color:var(--text-tertiary)">数据范围：Leader 团队（北京IS）</span>`;
    } else {
      // Sales：销售itcode 默认本人（只读）+ 线索来源 筛选
      html += `<span class="lead-ro-box">销售itcode：${SALES_ITCODE}（本人）</span>`;
      html += msHtml('source', KB_SOURCE_FILTER_OPTIONS, LEAD.kbFilters.source, '线索来源');
      html += `<span class="lead-fl" style="color:var(--text-tertiary)">数据范围：本人（北京IS）</span>`;
    }
    html += msHtml('productType', PRODUCT_TYPE_OPTIONS, LEAD.kbFilters.productType, '产品类型');
    if (LEAD.kbTab === 'team') {
      html += msHtml('grade', GRADE_OPTS, LEAD.kbFilters.grade, '客户分级');
      // 销售团队漏斗：线索二级来源 / 三级来源 检索
      html += `<input class="ops-select" style="width:150px" placeholder="线索二级来源" value="${esc(LEAD.kbFilters.source2 || '')}" onchange="leadSetKbInput('source2',this.value)">`;
      html += `<input class="ops-select" style="width:150px" placeholder="线索三级来源" value="${esc(LEAD.kbFilters.source3 || '')}" onchange="leadSetKbInput('source3',this.value)">`;
    }
    html += `<button class="btn btn-sm btn-primary" onclick="leadApplyKbFilters()">查询</button><button class="btn btn-sm btn-secondary" onclick="leadResetKbFilters()">重置</button>`;
    if (LEAD.kbTab === 'funnel') html += `<button class="btn btn-sm btn-secondary" onclick="leadExportFunnel()">⬇ 导出数据</button>`;
    html += `</div>`;
    return html;
  }
  // 自定义多选下拉（未选时框内显示字段名占位）
  function msHtml(key, opts, selected, ph) {
    const has = selected && selected.length;
    const label = has ? opts.filter(o => selected.includes(o.value)).map(o => o.label).join('、') : ph;
    const panel = opts.map(o => `<label class="lead-ms-opt"><input type="checkbox" ${selected.includes(o.value) ? 'checked' : ''} onchange="leadMsToggle('${key}','${o.value}')"/>${esc(o.label)}</label>`).join('');
    return `<div class="lead-ms" data-ms="${key}" style="min-width:120px"><div class="lead-ms-trig" onclick="leadMsOpen(this,event)"><span class="lead-ms-text${has ? '' : ' ph'}">${esc(label)}</span></div><div class="lead-ms-panel">${panel}</div></div>`;
  }

  function renderKbBody() {
    const host = document.getElementById('lead-kb');
    if (!host) return;
    host.innerHTML = kbFilterBarHtml() + kbTabsHtml() + `<div id="lead-kb-panel"></div>`;
    renderKbPanelOnly();
  }
  // 仅重渲染图表/面板区（不动筛选栏，保持多选下拉打开态）
  function renderKbPanelOnly() {
    const panel = document.getElementById('lead-kb-panel'); if (!panel) return;
    if (LEAD.kbTab === 'funnel') panel.innerHTML = panelFunnel();
    else if (LEAD.kbTab === 'quality') panel.innerHTML = panelQuality();
    else panel.innerHTML = panelTeam();
    requestAnimationFrame(() => {
      if (LEAD.kbTab === 'funnel') drawFunnel();
      else if (LEAD.kbTab === 'quality') { drawReturn(); drawScore(); }
      else drawTeam();
    });
  }
  function panelFunnel() {
    const filters = activeKbFilters();
    const d = kbFunnelCur(), yoy = filters.yoy, mom = filters.mom;
    const yo = KB_FUNNEL[filters.period].yoy, mo = KB_FUNNEL[filters.period].mom;
    const cmql = kbConvRate(d.mql, d.iql), csql = kbConvRate(d.sql, d.mql), copp = kbConvRate(d.opp, d.sql);
    const cards = kbKpiCards.map(c => {
      const v = c.isAmt ? kbFmtAmt(d[c.key]) : kbFmt(d[c.key]);
      let trend = '';
      if (yoy || mom) {
        const t = (lbl, b) => { const k = kbTC(d[c.key], b); return `<span class="lead-trend ${k}">${lbl} ${kbTT(d[c.key], b)}</span>`; };
        trend = `<div class="lead-kpi-trend">${yoy ? t('同比', yo[c.key]) : ''}${mom ? t('环比', mo[c.key]) : ''}</div>`;
      }
      return `<div class="lead-kpi"><div class="lead-kpi-label">${c.label}</div><div class="lead-kpi-code">${c.code}</div><div class="lead-kpi-value">${v}</div>${trend}</div>`;
    }).join('');
    return `
      <div class="card"><div class="card-header"><div class="card-title">漏斗转化总览</div>
        <div style="display:flex;gap:8px"><span class="badge badge-blue">IQL→MQL ${cmql}</span><span class="badge badge-blue">MQL→SQL ${csql}</span><span class="badge badge-blue">SQL→OPP ${copp}</span></div></div>
        <div id="lead-funnel-chart" style="height:280px"></div></div>
      <div class="kpi-grid lead-kpi-grid">${cards}</div>`;
  }
  function panelQuality() {
    const rows = kbSourceTableData();
    const head = `<th>线索来源</th>${KB_SOURCE_COLS.map(c => `<th>${c}</th>`).join('')}`;
    const body = rows.map((row, ri) => `<tr class="${ri === rows.length - 1 ? 'lead-total' : ''}"><td style="text-align:left">${row[0]}</td>${KB_SOURCE_COLS.map((col, ci) => { const v = row[ci + 1]; return `<td style="text-align:right">${typeof v === 'number' ? ((col.includes('金额') || col.includes('GMV')) ? kbFmtAmt(v) : v.toLocaleString('zh-CN')) : v}</td>`; }).join('')}</tr>`).join('');
    return `
      <div class="card"><div class="card-header"><div class="card-title">退回原因分布（按数量降序）</div></div><div id="lead-return-chart" style="height:380px"></div></div>
      <div class="card"><div class="card-header"><div class="card-title">线索评分分布</div></div><div id="lead-score-chart" style="height:300px"></div></div>
      <div class="card"><div class="card-header"><div class="card-title">分来源漏斗指标 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（合计行自动汇总）</span></div></div>
        <div style="overflow-x:auto"><table class="lead-src-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
  }
  function panelTeam() {
    const showCD = kbTeamSel().includes('chengdu'), showBJ = kbTeamSel().includes('beijing'), showTotal = kbTeamSel().length > 1;
    const data = kbTeamTableData();
    const maint = LEAD.role === 'leader' ? `<div style="margin-left:auto;display:flex;gap:8px">
        <button class="btn btn-sm btn-secondary" onclick="leadOpenDataLogs()">操作日志${LEAD.dataEditLogs.length ? `<span class="lead-badge-num">${LEAD.dataEditLogs.length}</span>` : ''}</button>
        <button class="btn btn-sm btn-primary" onclick="leadOpenDataEdit()">数据维护</button></div>` : '';
    const dv = (mi, teamKey, v, extra) => `<td class="lead-drill" title="查看明细线索" style="text-align:right;${extra || ''}" onclick="leadTeamDrill(${mi},'${teamKey}')">${v != null ? v.toLocaleString('zh-CN') : '-'}</td>`;
    const rows = data.map((r, mi) => `<tr>
        <td style="text-align:left;font-weight:500">${r.metric}</td>
        ${showTotal ? dv(mi, 'all', r.total, 'background:var(--primary-light);font-weight:600;' + (r.isCalc ? 'color:var(--primary)' : '')) : ''}
        ${showCD ? dv(mi, 'chengdu', r.chengdu, r.isCalc ? 'color:var(--primary);font-weight:700' : '') : ''}
        ${showBJ ? dv(mi, 'beijing', r.beijing, r.isCalc ? 'color:var(--primary);font-weight:700' : '') : ''}
      </tr>`).join('');
    return `<div class="card"><div class="card-header" style="flex-wrap:wrap">
        <div class="card-title">销售团队漏斗 &amp; 指标明细 <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">（退回 = MQL − SQL − 跟进中，蓝色加粗）</span></div>${maint}</div>
        <div class="lead-two-col">
          <div id="lead-team-chart" style="height:420px"></div>
          <div style="overflow:auto;max-height:460px"><table class="lead-src-table"><thead><tr>
            <th style="text-align:left">指标名称</th>${showTotal ? '<th style="text-align:right;background:var(--primary-light);color:var(--primary)">合计</th>' : ''}${showCD ? '<th style="text-align:right">成都IS</th>' : ''}${showBJ ? '<th style="text-align:right">北京IS</th>' : ''}
          </tr></thead><tbody>${rows}</tbody></table>
          ${LEAD.role === 'sales' ? '<div style="font-size:12px;color:var(--text-tertiary);margin-top:8px">* 销售视图仅显示个人数据</div>' : ''}</div>
        </div></div>`;
  }

  // 销售团队漏斗：点击数值 → 跳转线索池并按该指标筛选
  // 指标 → 线索池筛选条件（清空其余筛选后应用）
  const TEAM_METRIC_FILTER = {
    'IQL': {},                              // 全部线索
    'MQL': { fMql: ['是'] },                // 已分配（MQL=是）
    'SQL': { fs: ['已接收'] },              // 线索接收量
    'SQL金额(万)': { fs: ['已接收'] },
    '跟进中': { fs: ['跟进中'] },
    '退回': { fs: ['已退回'] },
    '商机客户数': { fcvFrom: '2000-01-01' }, // 已转商机（转商机时间非空）
    '商机CA': { fcvFrom: '2000-01-01' },
    '商机金额(万)': { fcvFrom: '2000-01-01' },
  };
  window.leadTeamDrill = function (mi, teamKey) {
    const d = kbTeamTableData()[mi]; if (!d) return;
    // 清空线索池筛选
    Object.assign(LEAD, { fdFrom: '', fdTo: '', fadFrom: '', fadTo: '', fpdFrom: '', fpdTo: '', ffdFrom: '', ffdTo: '', fcvFrom: '', fcvTo: '', fLeadNo: '', fLenovo: '', fPhone: '', fCompany: '', fName: '', fQuality: '', fScoreMin: '', fScoreMax: '', fSource2: '', fSource3: '', fs: [], fAssign: [], fown: '', fCustomerManagerCodes: [], fdTeam: 'all', fdGrade: [], fSource: [], fMql: [], sf: null, page: 1 });
    // 按团队（仅运营可按团队筛选）
    if (LEAD.role === 'ops' && (teamKey === 'chengdu' || teamKey === 'beijing')) LEAD.fdTeam = teamKey;
    // 按指标
    Object.assign(LEAD, TEAM_METRIC_FILTER[d.metric] || {});
    LEAD.fdGrade = [...activeKbFilters().grade];
    LEAD.poolAppliedFilters = capturePoolFilters();
    switchPage('lead.pool');
    setTimeout(() => { LEAD.page = 1; poolRefresh(); }, 60);
  };

  // ── ECharts 绘制 ──
  function ec(id) {
    const el = document.getElementById(id);
    if (!el || !window.echarts) return null;
    if (charts[id]) { charts[id].dispose(); }
    charts[id] = echarts.init(el);
    return charts[id];
  }
  function drawFunnel() {
    const c = ec('lead-funnel-chart'); if (!c) return;
    const d = kbFunnelCur(), total = d.iql || 1;
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
        ] }],
    });
  }
  function drawTeam() {
    const c = ec('lead-team-chart'); if (!c) return;
    const filters = activeKbFilters();
    const p = filters.period, sel = kbTeamSel(), r = teamRatio();
    const pick = i => { const sum = sel.reduce((s, tm) => s + KB_TEAM_RAW[p][tm][i], 0) * r; return _isAmtIdx(i) ? +sum.toFixed(1) : Math.round(sum); };
    const iql = pick(0), mql = pick(1), sql = pick(2), sqlAmt = pick(3), oppCnt = pick(6), oppAmt = pick(8), actCnt = pick(9), actAmt = pick(11);
    const tot = iql || 1, f2 = n => n.toLocaleString('zh-CN'), fA = n => '¥' + n.toFixed(1) + '万';
    c.setOption({
      color: LCHART.seq,
      tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>${p.data.tip || ''}` },
      graphic: [
        { type: 'text', left: '58%', top: '16%', style: { text: kbConvRate(mql, iql), fill: LCHART.sub, fontSize: 12, fontWeight: 600 } },
        { type: 'text', left: '58%', top: '34%', style: { text: kbConvRate(sql, mql), fill: LCHART.sub, fontSize: 12, fontWeight: 600 } },
        { type: 'text', left: '58%', top: '52%', style: { text: kbConvRate(oppCnt, sql), fill: LCHART.sub, fontSize: 12, fontWeight: 600 } },
        { type: 'text', left: '58%', top: '70%', style: { text: kbConvRate(actCnt, oppCnt), fill: LCHART.sub, fontSize: 12, fontWeight: 600 } },
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
        ] }],
    });
  }
  function drawReturn() {
    const c = ec('lead-return-chart'); if (!c) return;
    const p = LEAD.kbTab2Period, sorted = kbReturnSorted(), yoy = LEAD.kbTab2Yoy, mom = LEAD.kbTab2Mom;
    const yoyMap = Object.fromEntries(KB_RETURN_REASONS.map((r, i) => [r, KB_RETURN_DATA[p].yoy[i]]));
    const momMap = Object.fromEntries(KB_RETURN_REASONS.map((r, i) => [r, KB_RETURN_DATA[p].mom[i]]));
    const pct = (cu, b) => { if (!b) return ''; const d = ((cu - b) / b * 100).toFixed(1); return d >= 0 ? ` ↑+${d}%` : ` ↓${Math.abs(d)}%`; };
    const series = [{ name: '当期', type: 'bar', data: sorted.map(x => x.val), barMaxWidth: 20, itemStyle: { color: LCHART.danger, borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', fontSize: 11, formatter: pp => { const x = sorted[pp.dataIndex]; let s = String(x.val); if (yoy) s += `  同比${pct(x.val, yoyMap[x.reason])}`; if (mom) s += `  环比${pct(x.val, momMap[x.reason])}`; return s; } } }];
    if (yoy) series.push({ name: '同比基准', type: 'bar', data: sorted.map(x => yoyMap[x.reason]), barMaxWidth: 20, itemStyle: { color: LCHART.seq[2], borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 11 } });
    if (mom) series.push({ name: '环比基准', type: 'bar', data: sorted.map(x => momMap[x.reason]), barMaxWidth: 20, itemStyle: { color: LCHART.c[6], borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 11 } });
    c.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: (yoy || mom) ? { top: 0, right: 8 } : { show: false },
      grid: { left: '38%', right: '8%', top: (yoy || mom) ? 30 : 10, bottom: 40 },
      xAxis: { type: 'value', axisLine: { lineStyle: { color: LCHART.axis } }, splitLine: { lineStyle: { color: LCHART.grid } }, axisLabel: { color: LCHART.sub } },
      yAxis: { type: 'category', data: sorted.map(x => x.reason), axisLine: { lineStyle: { color: LCHART.axis } }, axisLabel: { fontSize: 11, width: 220, overflow: 'truncate', color: LCHART.sub } },
      series,
    });
  }
  function drawScore() {
    const c = ec('lead-score-chart'); if (!c) return;
    const d = KB_SCORE_DATA[LEAD.kbTab2Period];
    c.setOption({
      tooltip: { trigger: 'item', formatter: '{b}：{c}条 ({d}%)' },
      legend: { orient: 'vertical', right: '5%', top: 'center' },
      series: [{ type: 'pie', radius: ['38%', '65%'], center: ['40%', '50%'], avoidLabelOverlap: true, label: { show: true, formatter: '{b}\n{c}条' },
        data: KB_SCORE_BANDS.map((band, i) => ({ name: band, value: d[i], itemStyle: { color: KB_SCORE_COLORS[i] } })) }],
    });
  }

  // ===================== 渲染：线索池 =====================
  function renderPool() {
    if (LEAD.poolView === 'import-results') return renderImportResultsPage();
    if (LEAD.poolView === 'import-failures') return renderImportFailurePage();
    return `
      <div class="page-header">
        <div><div class="page-title">线索池</div><div class="page-desc">企业客户管理 · 线索分配、跟进、触达与转商机</div></div>
        ${roleSwitchHtml()}
      </div>
      <div id="lead-pool-stats"></div>
      <div id="lead-pool-toolbar"></div>
      ${poolFilterHtml()}
      <div id="lead-pool-alloc"></div>
      <div id="lead-pool-table"></div>`;
  }
  function clearGovernmentHiddenFilters() {
    Object.assign(LEAD, { fadFrom: '', fadTo: '', fpdFrom: '', fpdTo: '', ffdFrom: '', ffdTo: '', fcvFrom: '', fcvTo: '', fQuality: '', fSource2: '', fSource3: '', fs: [], fAssign: [], fown: '', fdTeam: 'all', fSource: [], fMql: [], sf: null });
    LEAD.poolAppliedFilters = capturePoolFilters();
  }
  function renderGovernmentPool() {
    clearGovernmentHiddenFilters();
    return `<div class="page-header"><div><div class="page-title">线索池-政企</div><div class="page-desc">企业客户管理 · 政企线索只读查询与导出</div></div></div>
      ${governmentPoolToolbarHtml()}${governmentPoolFilterHtml()}<div id="lead-government-pool-table"></div>`;
  }
  function importPageShell(title, desc, action, content) {
    return `<div id="lead-pool-stats" style="display:none"></div><div class="page-header"><div><div class="page-title">${title}</div><div class="page-desc">${desc}</div></div>${action || ''}</div>${content}`;
  }
  function renderImportResultsPage() {
    const statusTag = status => `<span class="badge ${status === '执行完成' ? 'badge-green' : status === '执行中' ? 'badge-blue' : 'badge-orange'}">${status}</span>`;
    const rows = LEAD.importBatches.map(batch => `<tr><td>${esc(batch.file)}</td><td>${esc(batch.time)}</td><td>${esc(batch.user)}</td><td>${statusTag(batch.status)}</td><td>${batch.total}</td><td style="color:var(--success)">${batch.success}</td><td style="color:${batch.fail ? 'var(--danger)' : 'var(--text-tertiary)'}">${batch.fail}</td><td><div style="display:flex;gap:8px;white-space:nowrap"><button class="btn btn-sm btn-secondary" ${batch.fail ? '' : 'disabled'} onclick="leadOpenImportFailureDetail('${batch.id}')">失败明细</button><button class="btn btn-sm btn-secondary" ${batch.fail ? '' : 'disabled'} onclick="leadDownloadImportFailures('${batch.id}')">下载失败数据</button></div></td></tr>`).join('');
    const body = rows || '<tr><td colspan="8"><div class="empty" style="padding:48px 0">暂无导入记录</div></td></tr>';
    return importPageShell('导入结果', '查看线索导入及数据处理结果', '<button class="btn btn-sm btn-secondary" onclick="leadCloseImportResults()">返回线索池</button>', `<div class="card" style="padding:0"><div class="card-header" style="padding:13px 18px"><div class="card-title">导入记录</div><span style="font-size:13px;color:var(--text-tertiary)">共 ${LEAD.importBatches.length} 条</span></div><div style="overflow-x:auto"><table class="lead-table"><thead><tr><th>文件名</th><th>导入时间</th><th>导入人</th><th>执行状态</th><th>总条数</th><th>成功</th><th>失败</th><th>操作</th></tr></thead><tbody>${body}</tbody></table></div></div>`);
  }
  function renderImportFailurePage() {
    const batch = LEAD.importBatches.find(item => item.id === LEAD.importBatchId);
    if (!batch) { LEAD.poolView = 'import-results'; return renderImportResultsPage(); }
    const rows = batch.rows.map(row => `<tr><td>${esc(row.oneId || '-')}</td><td>${esc(row.lenovoId || '-')}</td><td>${esc(row.name || '-')}</td><td>${esc(row.phone || '-')}</td><td>${esc(row.company || '-')}</td><td>${esc(row.grade || '-')}</td><td>${esc(row.source || '-')}</td><td style="color:var(--danger)">${esc(row.reason)}</td></tr>`).join('');
    const actions = `<div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" onclick="leadOpenImportResults()">返回导入结果</button><button class="btn btn-sm btn-primary" onclick="leadDownloadImportFailures('${batch.id}')">下载失败数据</button></div>`;
    return importPageShell('失败明细', `${esc(batch.file)}`, actions, `<div class="card" style="padding:0"><div class="card-header" style="padding:13px 18px"><div class="card-title">失败数据</div><span style="font-size:13px;color:var(--text-tertiary)">共 ${batch.fail} 条</span></div><div style="overflow-x:auto"><table class="lead-table"><thead><tr><th>ONE ID</th><th>Lenovo ID</th><th>姓名</th><th>手机号</th><th>客户名称</th><th>客户分级</th><th>线索来源</th><th>失败原因</th></tr></thead><tbody>${rows}</tbody></table></div></div>`);
  }
  function poolStatsHtml() {
    // 2.1 运营/Leader/Sales 统一 6 张；计数基于筛选栏联动结果（poolBase）
    const cl = poolBase();
    const cards = [
      { k: null, label: '线索总数', val: cl.length },
      { k: 'un', label: '未分配', val: cl.filter(l => dispAssign(l, LEAD.role) === '待分配').length },
      { k: 'as', label: '已分配', val: cl.filter(l => dispAssign(l, LEAD.role) === '已分配').length },
      { k: 'rc', label: '已接收', val: cl.filter(l => l.status === '已接收').length },
      { k: 'ip', label: '跟进中', val: cl.filter(l => dispStatus(l, LEAD.role) === '跟进中').length },
      { k: 'rt', label: '已退回', val: cl.filter(l => l.status === '已退回').length },
    ];
    const html = cards.map(c => `<div class="lead-stat ${LEAD.sf === c.k ? 'hl' : ''}" onclick="leadStatClick(${c.k === null ? 'null' : `'${c.k}'`})"><div class="lead-stat-label">${c.label}</div><div class="lead-stat-val">${c.val}</div></div>`).join('');
    return `<div class="lead-stat-grid" style="grid-template-columns:repeat(6,minmax(0,1fr))">${html}</div>`;
  }
  function assignDropdown() {
    return `<span class="lead-dd"><button class="btn btn-sm btn-secondary" onclick="leadAssignMenu(this,event)">分配 ▾</button>
      <div class="lead-dd-menu">
        <div class="lead-dd-item" onclick="leadCloseDd();leadOpenAssign()">勾选分配</div>
        <div class="lead-dd-item" onclick="leadOpenAssignCond()">条件分配</div>
        <div class="lead-dd-item" onclick="leadOpenAssignBatch()">批量（上传）分配</div>
      </div></span>`;
  }
  function touchDropdown() { return '<span class="lead-dd"><button class="btn btn-sm btn-secondary" onclick="leadAssignMenu(this,event)">触达 ▾</button><div class="lead-dd-menu"><div class="lead-dd-item" onclick="leadCloseDd();leadOpenTouchChecked()">勾选触达</div><div class="lead-dd-item" onclick="leadOpenTouchCond()">条件触达</div><div class="lead-dd-item" onclick="leadOpenTouchBatch()">批量（上传）触达</div></div></span>'; }
  function mqlDropdown() { return '<span class="lead-dd"><button class="btn btn-sm btn-secondary" onclick="leadAssignMenu(this,event)">更新 MQL ▾</button><div class="lead-dd-menu"><div class="lead-dd-item" onclick="leadCloseDd();leadOpenMqlChecked()">勾选更新 MQL</div><div class="lead-dd-item" onclick="leadOpenMqlCond()">条件更新 MQL</div><div class="lead-dd-item" onclick="leadOpenMqlBatch()">批量（上传）更新 MQL</div></div></span>'; }
  window.leadAssignMenu = function (btn, e) { e.stopPropagation(); const dd = btn.parentElement; const open = dd.classList.contains('open'); document.querySelectorAll('.lead-dd.open').forEach(m => m.classList.remove('open')); if (!open) dd.classList.add('open'); };
  window.leadCloseDd = function () { document.querySelectorAll('.lead-dd.open').forEach(m => m.classList.remove('open')); };
  document.addEventListener('click', e => { if (!(e.target.closest && e.target.closest('.lead-dd'))) leadCloseDd(); });
  function poolToolbarHtml() {
    let btns = '';
    if (LEAD.role !== 'sales') btns += `<button class="btn btn-sm btn-secondary" onclick="leadMockImport()">📥 导入线索</button><button class="btn btn-sm btn-secondary" onclick="leadOpenImportResults()">📋 导入结果${LEAD.importBatches.reduce((sum, batch) => sum + batch.fail, 0) ? ` <span style="color:var(--danger)">${LEAD.importBatches.reduce((sum, batch) => sum + batch.fail, 0)}</span>` : ''}</button>`;
    if (LEAD.role === 'ops') btns += touchDropdown() + assignDropdown() + mqlDropdown();
    else if (LEAD.role === 'leader') btns += assignDropdown();
    // sales：无分配功能
    const tip = LEAD.sel.size > 0 ? `<span style="font-size:13px;color:var(--primary);font-weight:500;margin-left:4px">已选 ${LEAD.sel.size} 条</span>` : '';
    // 2.2 导出：脱敏导出直接下载；明文导出（含手机号等）走审批
    return `<div class="lead-toolbar">${btns}${tip}
      <button class="btn btn-sm btn-secondary" style="margin-left:auto" onclick="leadExportCSV()">⬇ 导出（脱敏）</button>
      <button class="btn btn-sm btn-primary" onclick="leadExportApproval()">⬇ 导出（明文）</button></div>`;
  }
  function governmentPoolToolbarHtml() {
    return `<div class="lead-toolbar" style="justify-content:flex-end"><button class="btn btn-sm btn-secondary" onclick="leadExportCSV()">⬇ 导出（脱敏）</button><button class="btn btn-sm btn-primary" onclick="leadExportApproval()">⬇ 导出（明文）</button></div>`;
  }
  // 12 个日期快捷键
  const DATE_SHORTCUTS = [
    { k: 'today', t: '今日', fn: () => { const d = new Date(); return [d, d]; } },
    { k: 'yesterday', t: '昨日', fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); return [new Date(d), new Date(d)]; } },
    { k: 'thisWeek', t: '本周', fn: () => { const n = new Date(), w = n.getDay() || 7, m = new Date(n); m.setDate(n.getDate() - w + 1); return [m, n]; } },
    { k: 'lastWeek', t: '上周', fn: () => { const n = new Date(), w = n.getDay() || 7, m = new Date(n); m.setDate(n.getDate() - w - 6); const e = new Date(m); e.setDate(m.getDate() + 6); return [m, e]; } },
    { k: 'thisMonth', t: '本月', fn: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n]; } },
    { k: 'lastMonth', t: '上月', fn: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]; } },
    { k: 'thisYear', t: '本年', fn: () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), n]; } },
    { k: 'lastYear', t: '去年', fn: () => { const y = new Date().getFullYear() - 1; return [new Date(y, 0, 1), new Date(y, 11, 31)]; } },
    { k: 'last7', t: '近7天', fn: () => { const n = new Date(), s = new Date(); s.setDate(n.getDate() - 6); return [s, n]; } },
    { k: 'last30', t: '近30天', fn: () => { const n = new Date(), s = new Date(); s.setDate(n.getDate() - 29); return [s, n]; } },
    { k: 'last90', t: '近90天', fn: () => { const n = new Date(), s = new Date(); s.setDate(n.getDate() - 89); return [s, n]; } },
  ];
  const fmtDate = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  const STATUS_FILTER_OPTS = [{ value: '已接收', label: '已接收' }, { value: '跟进中', label: '跟进中' }, { value: '已退回', label: '已退回' }, { value: '__none__', label: '无' }];
  const GRADE_OPTS = GRADES.map(g => ({ value: g, label: g }));
  const SOURCE_OPTS = LEAD_SOURCES.map(s => ({ value: s, label: s }));
  const MQL_OPTS = [{ value: '是', label: '是' }, { value: '否', label: '否' }];
  const ASSIGN_OPTS = [{ value: '已分配', label: '已分配' }, { value: '待分配', label: '待分配' }];
  const CUSTOMER_MANAGER_CODE_OPTS = [...CUSTOMER_MANAGER_CODES.map(code => ({ value: code, label: code })), { value: '__none__', label: '无' }];
  const POOL_MS_OPTS = { fs: STATUS_FILTER_OPTS, fdGrade: GRADE_OPTS, fSource: SOURCE_OPTS, fMql: MQL_OPTS, fAssign: ASSIGN_OPTS, fCustomerManagerCodes: CUSTOMER_MANAGER_CODE_OPTS };
  const POOL_MS_PH = { fs: '线索状态', fdGrade: '客户分级', fSource: '线索来源', fMql: '是否MQL', fAssign: '分配状态', fCustomerManagerCodes: '客户经理编码' }; // 未选时框内显示字段名
  // 线索池自定义多选下拉（切换不重渲染，仅就地更新标签 + 刷新数据）
  function poolMs(key, opts, ph) {
    const sel = LEAD[key];
    const label = sel.length ? opts.filter(o => sel.includes(o.value)).map(o => o.label).join('、') : ph;
    const isPlaceholder = !sel.length;
    const panel = opts.map(o => `<label class="lead-ms-opt"><input type="checkbox" ${sel.includes(o.value) ? 'checked' : ''} onchange="leadPoolMsToggle('${key}','${o.value}')"/>${esc(o.label)}</label>`).join('');
    return `<div class="lead-ms" data-ms="${key}" style="min-width:120px"><div class="lead-ms-trig" onclick="leadMsOpen(this,event)"><span class="lead-ms-text${isPlaceholder ? ' ph' : ''}">${esc(label)}</span></div><div class="lead-ms-panel">${panel}</div></div>`;
  }
  // 日期范围：前置「快捷」下拉首项显示字段名，其后两个原生日期框 + 至
  const DATE_SCOPES = {
    create: { fk: 'fdFrom', tk: 'fdTo', name: '创建日期', src: 'createdAt' },
    assign: { fk: 'fadFrom', tk: 'fadTo', name: '分配时间', src: 'assignedAt' },
    push: { fk: 'fpdFrom', tk: 'fpdTo', name: '推送销售时间', src: 'pushAt' },
    feedback: { fk: 'ffdFrom', tk: 'ffdTo', name: '反馈时间', src: 'feedbackAt' },
    convert: { fk: 'fcvFrom', tk: 'fcvTo', name: '转商机时间', src: 'convertedAt' },
  };
  function dateRangeCtl(scope) {
    const sc = DATE_SCOPES[scope], fk = sc.fk, tk = sc.tk, name = sc.name;
    return `<span class="lead-daterange"><select class="ops-select" style="width:120px" title="${name}（快捷）" onchange="leadDateShortcut('${scope}',this.value)"><option value="">${name}</option>${DATE_SHORTCUTS.map(s => `<option value="${s.k}">${s.t}</option>`).join('')}</select>
      <input type="date" class="ops-select lead-date" title="${name}起" value="${LEAD[fk]}" onchange="leadSet('${fk}',this.value);leadPoolPageReset()"/>
      <span class="filter-separator">至</span>
      <input type="date" class="ops-select lead-date" title="${name}止" value="${LEAD[tk]}" onchange="leadSet('${tk}',this.value);leadPoolPageReset()"/></span>`;
  }
  function poolFilterHtml() {
    const txt = (key, ph, w) => `<input class="ops-select" style="width:${w || 140}px" placeholder="${ph}" value="${esc(LEAD[key])}" oninput="leadSet('${key}',this.value);leadPoolPageReset()"/>`;
    const teamSel = LEAD.role === 'ops' ? `<select class="ops-select" onchange="leadSet('fdTeam',this.value);leadPoolPageReset()">
        <option value="all" ${LEAD.fdTeam === 'all' ? 'selected' : ''}>销售团队（全部）</option>
        <option value="beijing" ${LEAD.fdTeam === 'beijing' ? 'selected' : ''}>北京IS</option>
        <option value="chengdu" ${LEAD.fdTeam === 'chengdu' ? 'selected' : ''}>成都IS</option>
      </select>` : '';
    return `<div class="lead-filter card">
      ${dateRangeCtl('create')}
      ${dateRangeCtl('assign')}
      ${dateRangeCtl('push')}
      ${dateRangeCtl('feedback')}
      ${dateRangeCtl('convert')}
      ${txt('fLeadNo', '线索编号', 140)}
      ${txt('fLenovo', 'Lenovo ID', 140)}
      ${txt('fPhone', '手机号', 140)}
      ${txt('fName', '姓名', 120)}
      ${txt('fCompany', '客户名称', 140)}
      ${txt('fown', '所属IS', 120)}
      ${poolMs('fCustomerManagerCodes', CUSTOMER_MANAGER_CODE_OPTS, '客户经理编码')}
      ${txt('fQuality', 'Leads质量', 140)}
      <input id="lead-score-min" class="ops-select" style="width:120px" type="number" min="0" max="100" step="1" placeholder="线索分 ≥" value="${esc(LEAD.fScoreMin)}" oninput="leadSet('fScoreMin',this.value);leadPoolPageReset()"/>
      <input id="lead-score-max" class="ops-select" style="width:120px" type="number" min="0" max="100" step="1" placeholder="线索分 <" value="${esc(LEAD.fScoreMax)}" oninput="leadSet('fScoreMax',this.value);leadPoolPageReset()"/>
      ${txt('fSource2', '线索二级来源', 140)}
      ${txt('fSource3', '线索三级来源', 140)}
      ${poolMs('fs', STATUS_FILTER_OPTS, '线索状态')}
      ${poolMs('fAssign', ASSIGN_OPTS, '分配状态')}
      ${poolMs('fMql', MQL_OPTS, '是否MQL')}
      ${poolMs('fdGrade', GRADE_OPTS, '客户分级')}
      ${poolMs('fSource', SOURCE_OPTS, '线索一级来源')}
      ${teamSel}
      <button class="btn btn-sm btn-primary" onclick="leadApplyPoolFilters()">查询</button>
      <button class="btn btn-sm btn-secondary" onclick="leadResetFilter()">重置</button>
    </div>`;
  }
  function governmentPoolFilterHtml() {
    const txt = (key, ph, w) => `<input class="ops-select" style="width:${w || 140}px" placeholder="${ph}" value="${esc(LEAD[key])}" oninput="leadSet('${key}',this.value);leadPoolPageReset()"/>`;
    return `<div class="lead-filter card">${dateRangeCtl('create')}${txt('fLeadNo', '线索编号', 140)}${txt('fLenovo', 'Lenovo ID', 140)}${txt('fPhone', '手机号', 140)}${txt('fName', '姓名', 120)}${txt('fCompany', '客户名称', 140)}${poolMs('fCustomerManagerCodes', CUSTOMER_MANAGER_CODE_OPTS, '客户经理编码')}
      <input id="lead-score-min" class="ops-select" style="width:120px" type="number" min="0" max="100" step="1" placeholder="线索分 ≥" value="${esc(LEAD.fScoreMin)}" oninput="leadSet('fScoreMin',this.value);leadPoolPageReset()"/>
      <input id="lead-score-max" class="ops-select" style="width:120px" type="number" min="0" max="100" step="1" placeholder="线索分 <" value="${esc(LEAD.fScoreMax)}" oninput="leadSet('fScoreMax',this.value);leadPoolPageReset()"/>
      ${poolMs('fdGrade', GRADE_OPTS, '客户分级')}<button class="btn btn-sm btn-primary" onclick="leadApplyPoolFilters()">查询</button><button class="btn btn-sm btn-secondary" onclick="leadResetFilter()">重置</button></div>`;
  }
  function poolTableHtml(government) {
    const rows = poolRows();
    const isSL = !government && (LEAD.role === 'sales' || LEAD.role === 'leader');
    // 分页：每页 20 条
    const total = rows.length, pageSize = 20, totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (LEAD.page > totalPages) LEAD.page = totalPages;
    if (LEAD.page < 1) LEAD.page = 1;
    const pageRows = rows.slice((LEAD.page - 1) * pageSize, LEAD.page * pageSize);
    const selectable = pageRows.filter(canSelect);
    const allChk = selectable.length > 0 && selectable.every(l => LEAD.sel.has(l.rowId));
    const sortable = (k, t) => `<th class="lead-sort" onclick="leadSort('${k}')">${t}<span class="lead-si ${LEAD.sk === k ? 'on' : ''}">${LEAD.sk === k ? (LEAD.sd === 'asc' ? '▲' : '▼') : '↕'}</span></th>`;
    const governmentHead = `<tr><th style="min-width:96px;text-align:left">操作</th>${sortable('oneId', 'ONE ID')}${sortable('lenovoId', 'Lenovo ID')}${sortable('leadNo', '线索编号')}${sortable('name', '姓名')}${sortable('company', '客户名称')}${sortable('phone', '手机号')}${sortable('grade', '客户分级')}${sortable('score', '线索分')}${sortable('customerManagerCode', '客户经理编码')}${sortable('relGabIs', 'REL-GAB IS')}${sortable('relKabIs', 'REL-KAB IS')}${sortable('relEmergingMarketIs', 'REL-新兴市场 IS')}${sortable('createdAt', '创建时间')}</tr>`;
    const regularHead = `<tr><th style="width:40px"><input type="checkbox" ${allChk ? 'checked' : ''} onchange="leadToggleAll(this)"/></th>
      <th style="min-width:${isSL ? 230 : 96}px;text-align:left">操作</th>
      ${sortable('oneId', 'ONE ID')}${sortable('lenovoId', 'Lenovo ID')}${sortable('leadNo', '线索编号')}${sortable('name', '姓名')}${sortable('company', '客户名称')}
      ${sortable('phone', '手机号')}${sortable('grade', '客户分级')}${sortable('status', '线索状态')}${sortable('assignStatus', '分配状态')}${sortable('isMql', '是否MQL')}${sortable('source', '线索一级来源')}${sortable('source2', '线索二级来源')}${sortable('source3', '线索三级来源')}${sortable('quality', 'Leads质量')}${sortable('score', '线索分')}${SQL_AMOUNT_FIELDS.map(f => sortable(f.key, f.label)).join('')}${sortable('owner', '所属IS')}${sortable('customerManagerCode', '客户经理编码')}
      ${sortable('createdAt', '创建时间')}${sortable('pushAt', '推送销售时间')}${sortable('assignedAt', '分配时间')}${sortable('feedbackAt', '反馈时间')}${sortable('convertedAt', '转商机时间')}</tr>`;
    const head = government ? governmentHead : regularHead;
    let body;
    if (!total) body = `<tr><td colspan="${government ? 14 : 28}" style="text-align:center;color:var(--text-tertiary);padding:40px">暂无数据</td></tr>`;
    else body = pageRows.map(l => {
      const ds = dispStatus(l, LEAD.role);
      // 3.2 已退回线索：Leader/Sales 只能查看不能操作（隐藏反馈/转商机），由运营重新分配
      // 已退回且被运营重新分配的旧线索：锁定，状态不可变更、不可再分配
      const locked = !!l.reassigned;
      const readonly = l.status === '已退回' || locked;
      // 已退回线索仅运营可重新分配：leader/sales 不可勾选分配
      const noAssign = locked || (l.status === '已退回' && LEAD.role !== 'ops');
      const detailAction = government ? `leadShowDetail('${l.rowId}', 'lead.governmentPool')` : `leadShowDetail('${l.rowId}')`;
      const opCell = `<td style="white-space:nowrap;text-align:left"><button class="btn btn-sm btn-secondary" onclick="${detailAction}">查看详情</button>${government ? '' : `${(isSL && l.status && !readonly) ? `<button class="btn btn-sm btn-secondary" onclick="leadOpenFollow('${l.rowId}')">反馈线索</button>` : ''}${(isSL && ['已接收', '跟进中'].includes(ds) && !readonly) ? `<button class="btn btn-sm btn-primary" onclick="leadOpenConvert('${l.rowId}')">转商机</button>` : ''}`}</td>`;
      const governmentCells = `<td>${l.oneId}</td><td>${l.lenovoId || '-'}</td><td>${l.leadNo || '-'}</td><td>${esc(l.name)}</td><td>${esc(l.company)}</td><td>${maskPhone(l.phone)}</td><td>${l.grade}</td><td>${l.score}</td><td>${l.customerManagerCode || '-'}</td><td>${l.relGabIs || '-'}</td><td>${l.relKabIs || '-'}</td><td>${l.relEmergingMarketIs || '-'}</td><td>${fmt(l.createdAt)}</td>`;
      const regularCells = `<td>${l.oneId}</td>
        <td>${l.lenovoId || '-'}</td>
        <td>${l.leadNo || '-'}</td><td>${esc(l.name)}</td><td>${esc(l.company)}</td><td>${maskPhone(l.phone)}</td><td>${l.grade}</td>
        <td>${ds && ds !== '待接收' ? leadTag(ds) : '<span style="color:var(--text-tertiary)">-</span>'}</td>
        <td>${locked ? '<span class="badge">已重新分配</span>' : dispAssign(l, LEAD.role) === '已分配' ? '<span class="badge badge-blue">已分配</span>' : '<span class="badge badge-orange">待分配</span>'}</td>
        <td>${l.isMql === '是' ? '<span class="badge badge-green">是</span>' : '<span class="badge">否</span>'}</td>
        <td>${l.source || '-'}</td><td>${l.source2 || '-'}</td><td>${l.source3 || '-'}</td>
        <td>${l.quality ? `<span class="badge badge-blue" style="font-size:11px">${l.quality}</span>` : '-'}</td><td>${l.score}</td>${SQL_AMOUNT_FIELDS.map(f => `<td>${fmtSqlAmount(leadSqlAmount(l, f.key))}</td>`).join('')}
        <td>${l.owner || '-'}</td><td>${l.customerManagerCode || '-'}</td><td>${fmt(l.createdAt)}</td><td>${fmt(l.pushAt)}</td><td>${fmt(l.assignedAt)}</td><td>${fmt(l.feedbackAt)}</td><td>${fmt(l.convertedAt)}</td>`;
      return `<tr class="${!government && LEAD.sel.has(l.rowId) ? 'sel' : ''}">
        ${government ? '' : `<td><input type="checkbox" ${LEAD.sel.has(l.rowId) ? 'checked' : ''} ${noAssign ? `disabled title="${locked ? '已重新分配，锁定' : '已退回线索仅运营可重新分配'}"` : ''} onchange="leadToggleRow('${l.rowId}')"/></td>`}
        ${opCell}${government ? governmentCells : regularCells}</tr>`;
    }).join('');
    const pager = `<div class="employee-pagination in-card">
      <div>共 ${total} 条记录，当前第 ${LEAD.page} 页，共 ${totalPages} 页</div>
      <div class="pagination-actions">
        <button class="btn btn-sm btn-secondary" ${LEAD.page <= 1 ? 'disabled' : ''} onclick="leadGoPage(${LEAD.page - 1})">上一页</button>
        <button class="btn btn-sm btn-secondary" ${LEAD.page >= totalPages ? 'disabled' : ''} onclick="leadGoPage(${LEAD.page + 1})">下一页</button>
      </div></div>`;
    return `<div class="card" style="padding:0">
      <div class="card-header" style="padding:13px 18px"><div class="card-title">线索列表</div><span style="font-size:13px;color:var(--text-tertiary)">共 ${total} 条</span></div>
      <div style="overflow-x:auto"><table class="lead-table">${head}${body}</table></div>
      ${pager}</div>`;
  }

  // ===================== 交互（全局函数） =====================
  function poolRefresh() {
    const s = document.getElementById('lead-pool-stats'); if (s) s.innerHTML = poolStatsHtml();
    const t = document.getElementById('lead-pool-toolbar'); if (t) t.innerHTML = poolToolbarHtml();
    const al = document.getElementById('lead-pool-alloc'); if (al) al.innerHTML = LEAD.sf === 'as' ? allocPanelHtml() : '';
    const tb = document.getElementById('lead-pool-table'); if (tb) tb.innerHTML = poolTableHtml();
  }
  function governmentPoolRefresh() { const table = document.getElementById('lead-government-pool-table'); if (table) table.innerHTML = poolTableHtml(true); }
  window.governmentPoolRefresh = governmentPoolRefresh;
  function refreshActivePool() { if (document.getElementById('lead-government-pool-table')) governmentPoolRefresh(); else poolRefresh(); }
  // 通过 DOM 判定当前线索页（不依赖外壳的 STATE 全局，const STATE 不挂 window）
  function rerenderCurrent() {
    const marker = document.getElementById('lead-kb') || document.getElementById('lead-pool-stats') || document.getElementById('lead-government-pool-table') || document.getElementById('lead-score-stats');
    const host = marker && marker.closest('.lead-dashboard-native, .lead-pool-native, .lead-government-pool-native, .lead-score-native');
    if (!host) return;
    if (marker.id === 'lead-kb') { host.innerHTML = renderDashboard(); renderKbBody(); }
    else if (marker.id === 'lead-pool-stats') { host.innerHTML = renderPool(); poolRefresh(); }
    else if (marker.id === 'lead-government-pool-table') { host.innerHTML = renderGovernmentPool(); governmentPoolRefresh(); }
    else if (marker.id === 'lead-score-stats') { host.innerHTML = renderScore(); scoreRefresh(); }
  }  function findLead(id) { return LEAD.leads.find(l => l.rowId === id); }
  // 可勾选（用于分配）：已重新分配锁定的旧线索、以及非运营下的已退回线索不可选
  function canSelect(l) { return !l.reassigned && !(l.status === '已退回' && LEAD.role !== 'ops'); }
  function toast(msg, type) {
    let box = document.getElementById('lead-toast');
    if (!box) { box = document.createElement('div'); box.id = 'lead-toast'; box.className = 'lead-toast-box'; document.body.appendChild(box); }
    const el = document.createElement('div'); el.className = 'lead-toast-item ' + (type || 'success'); el.textContent = msg;
    box.appendChild(el); setTimeout(() => el.remove(), 2600);
  }

  // 角色 / Tab / 筛选
  window.leadSetRole = function (r) {
    LEAD.role = r; LEAD.sel = new Set(); LEAD.page = 1;
    if ((r === 'sales' || r === 'leader') && LEAD.kbTab !== 'team') LEAD.kbTab = 'team';
    LEAD.kbAppliedFilters = captureKbFilters();
    rerenderCurrent();
  };
  window.leadSetKbTab = function (t) { LEAD.kbTab = t; renderKbBody(); };
  window.leadSet = function (k, v) { LEAD[k] = v; };
  window.leadSetKbf = function (k, v) { LEAD.kbFilters[k] = v; };
  window.leadSetKbInput = function (k, v) { LEAD.kbFilters[k] = v; };
  window.leadSetKbPeriod = function (v) { LEAD.kbFilters.period = v; };
  window.leadSetPeriod = function (scope, v) {
    if (scope === 'quality') { LEAD.kbTab2Period = v; LEAD.kbTab2From = ''; LEAD.kbTab2To = ''; }
    else { LEAD.kbFilters.period = v; LEAD.kbMainFrom = ''; LEAD.kbMainTo = ''; }
    if (scope === 'quality') renderKbBody();
  };
  window.leadSetPeriodDate = function (scope, idx, val) {
    const fk = scope === 'quality' ? 'kbTab2From' : 'kbMainFrom', tk = scope === 'quality' ? 'kbTab2To' : 'kbMainTo';
    LEAD[idx === 0 ? fk : tk] = val;
    const from = LEAD[fk], to = LEAD[tk];
    if (from && to) {
      const key = kbDaysToKey(Math.abs(new Date(to) - new Date(from)) / 86400000);
      if (scope === 'quality') LEAD.kbTab2Period = key; else LEAD.kbFilters.period = key;
    }
    if (scope === 'quality') renderKbBody();
  };
  window.leadRenderQuality = function () { renderKbBody(); };
  window.leadApplyKbFilters = function () { LEAD.kbAppliedFilters = captureKbFilters(); renderKbBody(); };
  window.leadResetKbFilters = function () {
    LEAD.kbFilters = defaultKbFilters();
    LEAD.kbMainFrom = ''; LEAD.kbMainTo = '';
    LEAD.kbAppliedFilters = captureKbFilters();
    renderKbBody();
  };
  const KB_MS_OPTS = { team: TEAM_OPTS, person: PERSON_OPTS.map(p => ({ label: p, value: p })), source: KB_SOURCE_FILTER_OPTIONS, grade: GRADE_OPTS, productType: PRODUCT_TYPE_OPTIONS };
  const KB_MS_PH = { team: '销售团队', person: '销售个人', source: '线索来源', grade: '客户分级', productType: '产品类型' };
  window.leadMsToggle = function (key, val) {
    const arr = LEAD.kbFilters[key]; const i = arr.indexOf(val);
    if (i >= 0) arr.splice(i, 1); else arr.push(val);
    // 就地更新触发框文字，仅重渲染图表区，保持下拉打开
    const span = document.querySelector('.lead-ms[data-ms="' + key + '"] .lead-ms-text');
    if (span) { const opts = KB_MS_OPTS[key]; span.textContent = arr.length ? opts.filter(o => arr.includes(o.value)).map(o => o.label).join('、') : KB_MS_PH[key]; span.classList.toggle('ph', !arr.length); }
  };
  window.leadMsOpen = function (el, e) {
    e.stopPropagation();
    const open = el.parentElement.classList.contains('open');
    document.querySelectorAll('.lead-ms.open').forEach(m => m.classList.remove('open'));
    if (!open) el.parentElement.classList.add('open');
  };
  // 点击空白处才关闭；点击下拉内部（勾选项）不关闭
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.lead-ms')) return;
    document.querySelectorAll('.lead-ms.open').forEach(m => m.classList.remove('open'));
  });

  // 线索池筛选
  window.leadPoolRefresh = function () { poolRefresh(); };
  window.leadPoolPageReset = function () { LEAD.page = 1; };
  window.leadGoPage = function (p) { LEAD.page = p; refreshActivePool(); };
  window.leadDateShortcut = function (scope, key) {
    if (!key) return;
    const sc = DATE_SHORTCUTS.find(s => s.k === key); if (!sc) return;
    const [f, t] = sc.fn();
    const dsc = DATE_SCOPES[scope]; if (dsc) { LEAD[dsc.fk] = fmtDate(f); LEAD[dsc.tk] = fmtDate(t); }
    LEAD.page = 1;
  };
  window.leadPoolMsToggle = function (key, val) {
    const arr = LEAD[key]; const i = arr.indexOf(val); if (i >= 0) arr.splice(i, 1); else arr.push(val);
    const span = document.querySelector('.lead-ms[data-ms="' + key + '"] .lead-ms-text');
    if (span) { const opts = POOL_MS_OPTS[key]; span.textContent = arr.length ? opts.filter(o => arr.includes(o.value)).map(o => o.label).join('、') : POOL_MS_PH[key]; span.classList.toggle('ph', !arr.length); }
    LEAD.page = 1;
  };
  window.leadApplyPoolFilters = function () {
    const scoreMin = LEAD.fScoreMin === '' ? null : Number(LEAD.fScoreMin), scoreMax = LEAD.fScoreMax === '' ? null : Number(LEAD.fScoreMax);
    const invalidScore = score => score != null && (!Number.isInteger(score) || score < 0 || score > 100);
    if (invalidScore(scoreMin) || invalidScore(scoreMax)) return toast('线索分请输入0-100的整数', 'warn');
    if (scoreMin != null && scoreMax != null && scoreMin >= scoreMax) return toast('线索分最小值必须小于最大值', 'warn');
    for (const scope of Object.keys(DATE_SCOPES)) {
      const cfg = DATE_SCOPES[scope];
      if (LEAD[cfg.fk] && LEAD[cfg.tk] && new Date(LEAD[cfg.fk]) > new Date(LEAD[cfg.tk])) return toast(`${cfg.name}开始日期不能晚于结束日期`, 'warn');
    }
    LEAD.poolAppliedFilters = capturePoolFilters();
    LEAD.page = 1;
    refreshActivePool();
  };
  window.leadResetFilter = function () {
    Object.assign(LEAD, { fdFrom: '', fdTo: '', fadFrom: '', fadTo: '', fpdFrom: '', fpdTo: '', ffdFrom: '', ffdTo: '', fcvFrom: '', fcvTo: '', fLeadNo: '', fLenovo: '', fPhone: '', fCompany: '', fName: '', fQuality: '', fScoreMin: '', fScoreMax: '', fSource2: '', fSource3: '', fs: [], fAssign: [], fown: '', fCustomerManagerCodes: [], fdTeam: 'all', fdGrade: [], fSource: [], fMql: [], sf: null, page: 1 });
    LEAD.poolAppliedFilters = capturePoolFilters();
    rerenderCurrent();
  };
  window.leadStatClick = function (k) {
    // 卡片快捷筛选；「已分配」额外内联展示分配明细面板（poolRefresh 根据 sf==='as' 渲染）
    LEAD.sf = (LEAD.sf === k && k !== null) ? null : k;
    LEAD.page = 1; rerenderCurrent();
  };
  window.leadSort = function (k) { if (LEAD.sk === k) LEAD.sd = LEAD.sd === 'asc' ? 'desc' : 'asc'; else { LEAD.sk = k; LEAD.sd = 'asc'; } refreshActivePool(); };
  window.leadToggleAll = function (cb) { poolRows().filter(canSelect).forEach(l => cb.checked ? LEAD.sel.add(l.rowId) : LEAD.sel.delete(l.rowId)); poolRefresh(); };
  window.leadToggleRow = function (id) { LEAD.sel.has(id) ? LEAD.sel.delete(id) : LEAD.sel.add(id); poolRefresh(); };
  window.leadGotoAssign = function () { switchPage('lead.pool'); setTimeout(() => { LEAD.sf = 'as'; poolRefresh(); }, 60); };

  // ── 通用弹窗 ──
  function modalRoot() {
    let r = document.getElementById('lead-modal-root');
    if (!r) { r = document.createElement('div'); r.id = 'lead-modal-root'; document.body.appendChild(r); }
    return r;
  }
  function openModal(title, body, footer, width) {
    modalRoot().innerHTML = `<div class="modal-mask show" onclick="if(event.target===this)leadCloseModal()"><div class="modal" style="width:${width || 480}px">
      <div class="modal-header"><h3>${title}</h3><span class="modal-close" onclick="leadCloseModal()">×</span></div>
      <div class="modal-body">${body}</div><div class="modal-footer">${footer}</div></div></div>`;
  }
  window.leadCloseModal = function () {
    (LEAD._modalCharts || []).forEach(c => c && c.dispose && c.dispose()); LEAD._modalCharts = [];
    modalRoot().innerHTML = '';
  };
  // 右侧抽屉
  function openDrawer(title, body, width) {
    modalRoot().innerHTML = `<div class="lead-drawer-mask show" onclick="if(event.target===this)leadCloseModal()"><div class="lead-drawer" style="width:${width || 600}px">
      <div class="modal-header"><h3>${title}</h3><span class="modal-close" onclick="leadCloseModal()">×</span></div>
      <div class="modal-body" style="overflow:auto">${body}</div></div></div>`;
  }

  // 新增线索
  let NF = {};
  window.leadOpenAdd = function () {
    NF = { name: '', phone: '', company: '', lenovoId: '', grade: 'B4', product: '83-TB' };
    openModal('新增线索', `
      ${field('姓名', `<input class="lead-inp" id="nf-name" placeholder="请输入姓名">`)}
      ${field('手机号', `<input class="lead-inp" id="nf-phone" placeholder="11位手机号">`)}
      ${field('客户名称', `<input class="lead-inp" id="nf-company" placeholder="客户公司名称">`)}
      ${field('Lenovo ID', `<input class="lead-inp" id="nf-lenovo" placeholder="选填">`)}
      ${field('客户分级', selInp('nf-grade', GRADES, 'B4'))}
      ${field('产品组', selInp('nf-product', PRODS, '83-TB'))}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadConfirmAdd()">确认新增</button>`);
  };
  window.leadConfirmAdd = function () {
    const name = val('nf-name'), phone = val('nf-phone'), company = val('nf-company');
    if (!name) return toast('请输入姓名', 'warn');
    if (!/^1\d{10}$/.test(phone)) return toast('请输入11位有效手机号', 'warn');
    if (!company) return toast('请输入客户名称', 'warn');
    LEAD.leads.unshift({ rowId: genRowId(), oneId: uid(), leadNo: '', lenovoId: val('nf-lenovo'), name, phone, company, grade: val('nf-grade'), product: val('nf-product'), status: '', quality: '', score: 0, sqlAmt: 0, sqlAmountPc: null, sqlAmountSd: null, sqlAmountSs: null, sqlAmountSi: null, source: '官网传递', source2: '', source3: '', isMql: '否', assignStatus: '待分配', owner: '', assignLevel: 0, leaderItcode: '', createdAt: new Date(), pushAt: null, assignedAt: null, feedbackAt: null, convertedAt: null, scoreLogs: [], followLogs: [] });
    leadCloseModal(); poolRefresh(); toast('新增成功，状态：待分配');
  };
  window.leadMockImport = function () {
    const l = Object.assign(mkLead(LEAD.leads.length % 20), { oneId: uid(), leadNo: '', status: '', quality: '', isMql: '否', assignStatus: '待分配', owner: '', assignLevel: 0, pushAt: null, assignedAt: null, feedbackAt: null, sqlAmt: 0, sqlAmountPc: null, sqlAmountSd: null, sqlAmountSs: null, sqlAmountSi: null });
    LEAD.leads.unshift(l);
    const now = new Date();
    LEAD.importBatches.unshift({ id: `IMP${now.getFullYear()}${z(now.getMonth() + 1)}${z(now.getDate())}${z(now.getHours())}${z(now.getMinutes())}`, file: `线索批量导入_${ts()}.csv`, time: `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())} ${z(now.getHours())}:${z(now.getMinutes())}`, user: LEAD.role === 'ops' ? 'yunying2' : 'leader01', status: '待执行', total: 1, success: 0, fail: 0, rows: [] });
    poolRefresh(); toast('导入成功，已追加 1 条模拟数据并生成批次记录');
  };
  window.leadOpenImportResults = function () { LEAD.poolView = 'import-results'; LEAD.importBatchId = ''; rerenderCurrent(); };
  window.leadCloseImportResults = function () { LEAD.poolView = 'list'; LEAD.importBatchId = ''; rerenderCurrent(); };
  window.leadOpenImportFailureDetail = function (id) { const batch = LEAD.importBatches.find(item => item.id === id); if (!batch || !batch.fail) return; LEAD.importBatchId = id; LEAD.poolView = 'import-failures'; rerenderCurrent(); };
  window.leadDownloadImportFailures = function (id) {
    const batch = LEAD.importBatches.find(item => item.id === id); if (!batch || !batch.rows.length) return toast('该批次没有失败数据', 'warn');
    const e = value => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
    const rows = [['ONE ID', 'Lenovo ID', '姓名', '手机号', '客户名称', '客户分级', '线索来源', '失败原因'], ...batch.rows.map(row => [row.oneId, row.lenovoId, row.name, row.phone, row.company, row.grade, row.source, row.reason])];
    downloadCsv(rows.map(row => row.map(e).join(',')).join('\r\n'), `${batch.file.replace(/\.[^.]+$/, '')}_失败数据.csv`);
  };

  // 分配
  window.leadOpenAssign = function () {
    if (!LEAD.sel.size) return toast('请先勾选线索', 'warn');
    const opts = assignableSPS().map(s => `<option value="${s.itcode}">${s.name}（${s.itcode}）</option>`).join('');
    openModal('分配线索', `
      ${field('已选线索', `<span style="color:var(--text-secondary)">${LEAD.sel.size} 条</span>`)}
      ${field('分配给', `<select class="lead-inp" id="af-sp"><option value="">请选择人员</option>${opts}</select>`)}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadConfirmAssign()">确认分配</button>`, 400);
  };
  // 通用分配：对 list 内线索按当前角色路径分配给 sp（退回线索→生成新线索并锁旧）
  function doAssign(list, sp) {
    const assignee = SPS.find(s => s.itcode === sp), now = new Date();
    const pathTxt = LEAD.role === 'ops' ? '运营→Leader' : 'Leader→Sales';
    const isLeader = assignee && assignee.role === 'leader';
    let newCount = 0;
    list.forEach(l => {
      if (l.status === '已退回') {
        // 退回后由运营重新分配：原线索保留并锁定，生成一条新线索（同 ONE ID，新线索编号，状态为-，已分配）
        const oldNo = l.leadNo;
        const newLead = Object.assign({}, l, {
          rowId: genRowId(), leadNo: genLeadNo(),
          status: '', quality: '', sqlAmt: 0, sqlAmountPc: null, sqlAmountSd: null, sqlAmountSs: null, sqlAmountSi: null,
          owner: sp, assignStatus: '已分配', isMql: '是',
          assignLevel: isLeader ? 1 : 2,
          leaderItcode: isLeader ? assignee.itcode : (l.leaderItcode || ''),
          pushAt: isLeader ? now : (l.pushAt || now),
          assignedAt: isLeader ? null : now,
          assignedBy: currentItcode(),
          feedbackAt: null, convertedAt: null, reassigned: false,
          relatedFromLeadNo: oldNo || '', relatedFromOneId: l.oneId,
          followLogs: [],
        });
        pushLog(newLead, 'reassign', `退回线索重新分配生成（${pathTxt}）：跟进IS ${sp}；新线索编号 ${newLead.leadNo} 关联旧线索编号 ${oldNo || '-'}`, { oldLeadNo: oldNo || '', newLeadNo: newLead.leadNo });
        // 锁定旧线索：不可再变更/分配
        l.reassigned = true;
        pushLog(l, 'reassign', `线索退回后由运营重新分配，生成新线索编号 ${newLead.leadNo}（本线索锁定，不可再变更/分配）`, { oldLeadNo: oldNo || '', newLeadNo: newLead.leadNo });
        LEAD.leads.unshift(newLead);
        newCount++;
      } else {
        // 正常分配（首次 / Leader→Sales）
        l.owner = sp;
        if (LEAD.role === 'ops') {
          if (isLeader) { l.assignLevel = 1; l.leaderItcode = assignee.itcode; l.pushAt = now; }
          else { l.assignLevel = 2; l.leaderItcode = l.leaderItcode || ''; l.pushAt = l.pushAt || now; l.assignedAt = now; }
          l.assignStatus = '已分配';
        } else { l.assignLevel = 2; l.assignStatus = '已分配'; l.assignedAt = now; }
        l.isMql = '是'; l.assignedBy = currentItcode();
        if (!l.leadNo) l.leadNo = genLeadNo();
        pushLog(l, 'assign', `分配（${pathTxt}）：跟进IS ${sp}；线索编号 ${l.leadNo}`);
      }
    });
    return { newCount, assignee };
  }
  // 勾选分配
  window.leadConfirmAssign = function () {
    const sp = val('af-sp'); if (!sp) return toast('请选择销售人员', 'warn');
    const selected = LEAD.leads.filter(l => LEAD.sel.has(l.rowId) && canSelect(l));
    if (!selected.length) return toast('没有可分配的线索（已退回仅运营可重新分配）', 'warn');
    const { newCount, assignee } = doAssign(selected, sp);
    leadCloseModal(); LEAD.sel = new Set(); poolRefresh(); toast(`已分配给 ${assignee ? assignee.name : sp}${newCount ? `（${newCount} 条退回线索已生成新线索）` : ''}`);
  };
  // 条件分配：按线索池当前筛选条件分配
  window.leadOpenAssignCond = function () {
    leadCloseDd();
    const list = poolBase().filter(canSelect);
    const opts = assignableSPS().map(s => `<option value="${s.itcode}">${s.name}（${s.itcode}）</option>`).join('');
    openModal('条件分配', `
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:8px">按<strong style="color:var(--text)">线索池当前筛选条件</strong>分配，命中 <strong style="color:var(--primary)">${list.length}</strong> 条可分配线索（如需调整范围，请先在上方筛选栏设置条件）。</div>
      ${field('分配给', `<select class="lead-inp" id="ac-sp"><option value="">请选择人员</option>${opts}</select>`)}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadConfirmAssignCond()">按条件分配</button>`, 440);
  };
  window.leadConfirmAssignCond = function () {
    const sp = val('ac-sp'); if (!sp) return toast('请选择销售人员', 'warn');
    const list = poolBase().filter(canSelect);
    if (!list.length) return toast('当前筛选条件下没有可分配线索', 'warn');
    const { newCount, assignee } = doAssign(list, sp);
    leadCloseModal(); LEAD.sel = new Set(); poolRefresh(); toast(`条件分配完成，共 ${list.length} 条 → ${assignee ? assignee.name : sp}${newCount ? `（含 ${newCount} 条退回重分配）` : ''}`);
  };
  // 批量（上传）分配
  window.leadOpenAssignBatch = function () {
    leadCloseDd();
    const opts = assignableSPS().map(s => `<option value="${s.itcode}">${s.name}（${s.itcode}）</option>`).join('');
    openModal('批量（上传）分配', `
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:8px">下载模板，填写需分配的线索（按 ONE ID 匹配），再上传 CSV 导入分配。</div>
      ${field('模板', `<button class="btn btn-sm btn-secondary" onclick="leadDownloadAssignTpl()">⬇ 下载模板</button>`)}
      ${field('分配给', `<select class="lead-inp" id="ab-sp"><option value="">请选择人员</option>${opts}</select>`)}
      ${field('上传文件', `<input type="file" accept=".csv" id="ab-file" style="display:none" onchange="leadAbFileName(this)">
        <div style="display:flex;align-items:center;gap:10px"><button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('ab-file').click()">选择文件</button><span id="ab-file-name" style="font-size:13px;color:var(--text-tertiary)">未选择文件</span></div>`)}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadConfirmAssignBatch()">导入并分配</button>`, 480);
  };
  window.leadAbFileName = function (input) { const el = document.getElementById('ab-file-name'); if (el) { el.textContent = (input.files && input.files[0]) ? input.files[0].name : '未选择文件'; el.style.color = (input.files && input.files[0]) ? 'var(--text)' : 'var(--text-tertiary)'; } };
  window.leadDownloadAssignTpl = function () {
    downloadCsv('ONE ID,Lenovo ID,手机号,备注\nOID-00001,LD100007,138****0001,示例行（仅 ONE ID 必填）', '线索分配导入模板.csv');
  };
  window.leadConfirmAssignBatch = function () {
    const sp = val('ab-sp'); if (!sp) return toast('请选择销售人员', 'warn');
    const fileEl = document.getElementById('ab-file');
    if (!fileEl || !fileEl.files || !fileEl.files[0]) return toast('请先上传文件', 'warn');
    const reader = new FileReader();
    reader.onload = function (e) {
      const text = String(e.target.result || '');
      const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const ids = lines.slice(1).map(l => l.split(',')[0].trim()).filter(Boolean); // 跳过表头，取 ONE ID 列
      const set = new Set(ids);
      const list = curLeads().filter(l => set.has(l.oneId) && canSelect(l));
      if (!list.length) return toast('文件中未匹配到可分配线索（按 ONE ID 匹配）', 'warn');
      const { newCount, assignee } = doAssign(list, sp);
      leadCloseModal(); LEAD.sel = new Set(); poolRefresh(); toast(`批量分配完成，匹配 ${list.length} 条 → ${assignee ? assignee.name : sp}${newCount ? `（含 ${newCount} 条退回重分配）` : ''}`);
    };
    reader.readAsText(fileEl.files[0], 'utf-8');
  };

  // 触达
  let TCHT = [];
  window.leadOpenTouch = function (id) {
    TCHT = id ? [findLead(id)] : LEAD.leads.filter(l => LEAD.sel.has(l.rowId));
    if (!TCHT.length) return toast('请先勾选线索', 'warn');
    const objTip = TCHT.length === 1 ? `${esc(TCHT[0].name)} · ${esc(TCHT[0].company)}` : `<span style="color:var(--primary);font-weight:600">已选 ${TCHT.length} 条线索（批量触达）</span>`;
    openModal('触达记录', `
      ${field('触达对象', objTip)}
      ${field('触达名称', `<input class="lead-inp" id="tch-name" placeholder="请输入触达名称">`)}
      ${field('触达描述', `<textarea class="lead-inp" id="tch-desc" rows="3" placeholder="请输入触达描述"></textarea>`)}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadConfirmTouch()">确定</button>`, 440);
  };
  window.leadConfirmTouch = function () {
    const name = val('tch-name'); if (!name) return toast('请输入触达名称', 'warn');
    const desc = val('tch-desc');
    const content = `触达：${name}${desc ? `，描述=${desc}` : ''}`;
    TCHT.forEach(l => pushLog(l, 'touch', content));
    const n = TCHT.length; leadCloseModal(); LEAD.sel = new Set(); poolRefresh(); toast(`触达记录已保存，共 ${n} 条线索`);
  };

  // 批量更新 是否MQL
  window.leadOpenMql = function () {
    if (LEAD.role !== 'ops') return toast('仅运营可批量更新MQL', 'warn');
    if (!LEAD.sel.size) return toast('请先勾选线索', 'warn');
    openModal('批量更新 MQL', `
      ${field('已选线索', `<span style="color:var(--text-secondary)">${LEAD.sel.size} 条</span>`)}
      ${field('是否MQL', `<select class="lead-inp" id="mql-val"><option value="是">是</option><option value="否">否</option></select>`)}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadConfirmMql()">确认更新</button>`, 400);
  };
  window.leadConfirmMql = function () {
    if (LEAD.role !== 'ops') return toast('仅运营可批量更新MQL', 'warn');
    const v = val('mql-val') || '是';
    const list = LEAD.leads.filter(l => LEAD.sel.has(l.rowId));
    list.forEach(l => { l.isMql = v; pushLog(l, 'mql', `批量更新 是否MQL → ${v}`); });
    leadCloseModal(); LEAD.sel = new Set(); poolRefresh(); toast(`已更新 ${list.length} 条线索的 MQL 为「${v}」`);
  };

  // 触达与更新 MQL：勾选、条件和 ONE ID 批量上传
  let TCH_MENU = [], MQL_MENU = [];
  function parseBatchOneIds(text) { return [...new Set(String(text || '').split(/\r?\n/).slice(1).map(line => line.split(',')[0].trim()).filter(Boolean))]; }
  function leadMenuModal(title, body, action, primaryText) { openModal(title, body, '<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="' + action + '">' + (primaryText || '确定') + '</button>', 480); }
  window.leadMenuFileName = function (input, labelId) {
    const label = document.getElementById(labelId), file = input && input.files && input.files[0];
    if (!label) return;
    label.textContent = file ? file.name : '未选择文件';
    label.style.color = file ? 'var(--text)' : 'var(--text-tertiary)';
  };
  function leadMenuUploadField(fileId, labelId) {
    return '<input type="file" accept=".csv" id="' + fileId + '" style="display:none" onchange="leadMenuFileName(this,\'' + labelId + '\')"><div style="display:flex;align-items:center;gap:10px"><button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById(\'' + fileId + '\').click()">选择文件</button><span id="' + labelId + '" style="font-size:13px;color:var(--text-tertiary)">未选择文件</span></div>';
  }
  function touchForm(prefix) { return field('触达对象', '<span style="color:var(--text-secondary)">' + prefix + '</span>') + field('触达名称', '<input class="lead-inp" id="tch-name" placeholder="请输入触达名称">') + field('触达描述', '<textarea class="lead-inp" id="tch-desc" rows="3" placeholder="请输入触达描述"></textarea>'); }
  function saveTouch(list, source) { const name = val('tch-name'); if (!name) return toast('请输入触达名称', 'warn'); const desc = val('tch-desc'); list.forEach(lead => pushLog(lead, 'touch', source + '触达：' + name + (desc ? '，描述=' + desc : ''))); leadCloseModal(); LEAD.sel = new Set(); poolRefresh(); toast(source + '已保存，共 ' + list.length + ' 条线索'); }
  window.leadOpenTouchChecked = function () { TCH_MENU=LEAD.leads.filter(lead=>LEAD.sel.has(lead.rowId)); if(!TCH_MENU.length)return toast('请先勾选线索','warn'); leadMenuModal('勾选触达',touchForm('共 '+TCH_MENU.length+' 条'),'leadConfirmTouchMenu()'); };
  window.leadOpenTouchCond = function () { leadCloseDd(); TCH_MENU=poolBase(); if(!TCH_MENU.length)return toast('当前筛选条件下没有线索','warn'); leadMenuModal('条件触达',touchForm('共 '+TCH_MENU.length+' 条'),'leadConfirmTouchMenu()'); };
  window.leadConfirmTouchMenu = function () { saveTouch(TCH_MENU,'触达：'); };
  window.leadDownloadTouchTpl = function () { downloadCsv('ONE ID\nOID-00001','线索触达导入模板.csv'); };
  window.leadOpenTouchBatch = function () { leadCloseDd(); leadMenuModal('批量（上传）触达','<div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:8px">下载模板，填写需触达的线索（按 ONE ID 匹配），再上传 CSV 导入触达。</div>'+field('模板','<button class="btn btn-sm btn-secondary" onclick="leadDownloadTouchTpl()">⬇ 下载模板</button>')+field('上传文件',leadMenuUploadField('tb-file','tb-file-name'))+touchForm('上传后按 ONE ID 匹配'),'leadConfirmTouchBatch()','导入并触达'); };
  window.leadConfirmTouchBatch = function () { const name=val('tch-name'), f=document.getElementById('tb-file'); if(!name)return toast('请输入触达名称','warn');if(!f||!f.files[0])return toast('请先上传文件','warn');const desc=val('tch-desc'),r=new FileReader();r.onload=e=>{const ids=parseBatchOneIds(e.target.result),list=curLeads().filter(lead=>ids.includes(lead.oneId));if(!list.length)return toast('文件中未匹配到当前可见线索（按 ONE ID 匹配）','warn');list.forEach(lead=>pushLog(lead,'touch','批量（上传）触达：触达：'+name+(desc?'，描述='+desc:'')));leadCloseModal();LEAD.sel=new Set();poolRefresh();toast('批量触达已保存，匹配 '+list.length+' 条');};r.readAsText(f.files[0],'utf-8'); };
  window.leadOpenTouch = function (id) { if(id){const x=findLead(id);TCH_MENU=x?[x]:[];if(TCH_MENU.length)leadMenuModal('触达记录',touchForm('共 1 条'),'leadConfirmTouchMenu()');return;}window.leadOpenTouchChecked(); };
  window.leadConfirmTouch = window.leadConfirmTouchMenu;
  function mqlForm(prefix) { return field('目标线索','<span style="color:var(--text-secondary)">'+prefix+'</span>')+field('是否MQL','<select class="lead-inp" id="mql-val"><option value="是">是</option><option value="否">否</option></select>'); }
  function saveMql(list,source){const v=val('mql-val')||'是';if(!list.length)return toast('没有可更新的线索','warn');list.forEach(lead=>{lead.isMql=v;pushLog(lead,'mql',source+'更新 是否MQL → '+v);});leadCloseModal();LEAD.sel=new Set();poolRefresh();toast(source+'完成，共 '+list.length+' 条线索');}
  window.leadOpenMqlChecked=function(){if(LEAD.role!=='ops')return toast('仅运营可更新MQL','warn');MQL_MENU=LEAD.leads.filter(lead=>LEAD.sel.has(lead.rowId));if(!MQL_MENU.length)return toast('请先勾选线索','warn');leadMenuModal('勾选更新 MQL',mqlForm('共 '+MQL_MENU.length+' 条'),'leadConfirmMqlMenu()');};
  window.leadOpenMqlCond=function(){if(LEAD.role!=='ops')return toast('仅运营可更新MQL','warn');leadCloseDd();MQL_MENU=poolBase();if(!MQL_MENU.length)return toast('当前筛选条件下没有线索','warn');leadMenuModal('条件更新 MQL',mqlForm('共 '+MQL_MENU.length+' 条'),'leadConfirmMqlMenu()');};
  window.leadConfirmMqlMenu=function(){if(LEAD.role!=='ops')return toast('仅运营可更新MQL','warn');saveMql(MQL_MENU,'更新 MQL：');};
  window.leadDownloadMqlTpl=function(){downloadCsv('ONE ID\nOID-00001','更新MQL导入模板.csv');};
  window.leadOpenMqlBatch=function(){if(LEAD.role!=='ops')return toast('仅运营可更新MQL','warn');leadCloseDd();leadMenuModal('批量（上传）更新 MQL','<div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:8px">下载模板，填写需更新的线索（按 ONE ID 匹配），再上传 CSV 导入更新。</div>'+field('模板','<button class="btn btn-sm btn-secondary" onclick="leadDownloadMqlTpl()">⬇ 下载模板</button>')+field('上传文件',leadMenuUploadField('mb-file','mb-file-name'))+mqlForm('上传后按 ONE ID 匹配'),'leadConfirmMqlBatch()','导入并更新 MQL');};
  window.leadConfirmMqlBatch=function(){if(LEAD.role!=='ops')return toast('仅运营可更新MQL','warn');const f=document.getElementById('mb-file'),v=val('mql-val')||'是';if(!f||!f.files[0])return toast('请先上传文件','warn');const r=new FileReader();r.onload=e=>{const ids=parseBatchOneIds(e.target.result),list=curLeads().filter(lead=>ids.includes(lead.oneId));if(!list.length)return toast('文件中未匹配到当前可见线索（按 ONE ID 匹配）','warn');list.forEach(lead=>{lead.isMql=v;pushLog(lead,'mql','批量（上传）更新 是否MQL → '+v);});leadCloseModal();LEAD.sel=new Set();poolRefresh();toast('批量更新 MQL 完成，匹配 '+list.length+' 条');};r.readAsText(f.files[0],'utf-8');};
  window.leadOpenMql=function(){window.leadOpenMqlChecked();};
  window.leadConfirmMql=window.leadConfirmMqlMenu;
  // 反馈线索（质量→状态映射 + 四类 SQL 金额）
  let FT = null;
  window.leadOpenFollow = function (id) {
    FT = findLead(id); if (!FT) return toast('请勾选 1 条线索', 'warn');
    LEAD.ff = { quality: FT.quality || '', status: FT.quality ? (QSM[FT.quality] || '') : '', note: '', remark: '' };
    SQL_AMOUNT_FIELDS.forEach(f => { LEAD.ff[f.key] = leadSqlAmount(FT, f.key); });
    renderFollowModal();
  };
  function renderFollowModal() {
    const ff = LEAD.ff;
    const qOpts = `<option value="">请选择质量</option>` + QS.map(q => `<option ${ff.quality === q ? 'selected' : ''}>${q}</option>`).join('');
    const amountFields = SQL_AMOUNT_FIELDS.map(f => field(f.label, `<input class="lead-inp" type="number" min="0" step="any" id="ff-${f.key}" placeholder="选填" value="${ff[f.key] == null ? '' : esc(ff[f.key])}">`)).join('');
    openModal('反馈线索', `
      ${field('ONE ID', `<input class="lead-inp" value="${FT.oneId}" disabled>`)}
      ${field('Lenovo ID', `<input class="lead-inp" value="${FT.lenovoId || '-'}" disabled>`)}
      ${field('Leads质量', `<select class="lead-inp" id="ff-quality" onchange="leadFFQuality(this.value)">${qOpts}</select>`)}
      ${field('线索状态', `<div style="display:flex;align-items:center;gap:10px"><input class="lead-inp" style="width:220px" value="${ff.status || '（请先选择线索质量）'}" disabled>${ff.status ? leadTag(ff.status) : ''}</div><div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">由线索质量自动映射，不可手动修改</div>`)}
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:12px">${amountFields}</div>
      ${field('跟进记录', `<textarea class="lead-inp" id="ff-note" rows="3" placeholder="选填">${esc(ff.note)}</textarea>`)}
      ${field('备注', `<textarea class="lead-inp" id="ff-remark" rows="2" placeholder="选填">${esc(ff.remark)}</textarea>`)}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">关闭</button><button class="btn btn-sm btn-primary" onclick="leadConfirmFollow()">保存</button>`, 580);
  }
  function syncFFInputs() {
    SQL_AMOUNT_FIELDS.forEach(f => { const el = document.getElementById('ff-' + f.key); if (el) LEAD.ff[f.key] = el.value; });
    const n = document.getElementById('ff-note'), r = document.getElementById('ff-remark');
    if (n) LEAD.ff.note = n.value;
    if (r) LEAD.ff.remark = r.value;
  }
  function parseFeedbackAmounts(ff) {
    const values = {};
    for (const f of SQL_AMOUNT_FIELDS) {
      const raw = String(ff[f.key] == null ? '' : ff[f.key]).trim();
      if (raw === '') { values[f.key] = null; continue; }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) return { error: `${f.label}必须是不小于0的数字` };
      values[f.key] = value;
    }
    return { values };
  }
  function commitFollow(amounts) {
    const ff = LEAD.ff, now = new Date(), prev = FT.status, prevQ = FT.quality;
    FT.quality = ff.quality;
    let mapped = QSM[ff.quality] || FT.status;
    // “匹配历史线索状态”→ 取反馈重复派发前的历史状态（已接收/已退回/跟进中）
    if (mapped === '匹配历史线索状态') mapped = (prev && ['已接收', '已退回', '跟进中'].includes(prev)) ? prev : '跟进中';
    FT.status = mapped;
    if (!FT.feedbackAt) FT.feedbackAt = now;
    if (FT.status === '已退回') FT.assignStatus = '待分配';
    SQL_AMOUNT_FIELDS.forEach(f => { FT[f.key] = amounts[f.key]; });
    FT.sqlAmt = leadSqlTotal(FT);
    const amountText = SQL_AMOUNT_FIELDS.map(f => `${f.code}=${amounts[f.key] == null ? '-' : amounts[f.key] + '万'}`).join('；');
    const changed = FT.status !== prev;
    pushLog(FT, 'feedback', `反馈线索：Leads质量 ${prevQ || '-'} → ${ff.quality}；线索状态 ${prev || '-'} → ${FT.status}；${amountText}${ff.note ? '；跟进记录：' + ff.note : ''}${ff.remark ? '；备注：' + ff.remark : ''}`, { sc: changed ? FT.status : null });
    leadCloseModal(); LEAD.sel = new Set(); rerenderCurrent(); toast('反馈线索保存成功');
  }
  window.leadFFQuality = function (q) { syncFFInputs(); LEAD.ff.quality = q; LEAD.ff.status = q ? (QSM[q] || '') : ''; renderFollowModal(); };
  window.leadReturnFollowEdit = function () { renderFollowModal(); };
  window.leadConfirmFollowOverLimit = function () {
    if (!LEAD.ff || !LEAD.ff.normalizedAmounts) return renderFollowModal();
    commitFollow(LEAD.ff.normalizedAmounts);
  };
  window.leadConfirmFollow = function () {
    const ff = LEAD.ff; syncFFInputs();
    if (!ff.quality) return toast('请选择线索质量', 'warn');
    const result = parseFeedbackAmounts(ff);
    if (result.error) return toast(result.error, 'warn');
    const exceeded = SQL_AMOUNT_FIELDS.filter(f => SQL_AMOUNT_LIMITS[f.key] != null && result.values[f.key] != null && result.values[f.key] > SQL_AMOUNT_LIMITS[f.key]);
    if (exceeded.length) {
      ff.normalizedAmounts = result.values;
      const rows = exceeded.map(f => `<div style="display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--border-light)"><span>${f.label}</span><span style="color:var(--red)">${fmtSqlAmount(result.values[f.key])}万，超过${SQL_AMOUNT_LIMITS[f.key]}万</span></div>`).join('');
      openModal('金额超限确认', `<div style="font-size:13px;color:var(--text-secondary);line-height:1.7">以下金额超出建议范围，是否继续提交？</div><div style="margin-top:8px">${rows}</div>`,
        `<button class="btn btn-sm btn-secondary" onclick="leadReturnFollowEdit()">返回修改</button><button class="btn btn-sm btn-primary" onclick="leadConfirmFollowOverLimit()">继续提交</button>`, 480);
      return;
    }
    commitFollow(result.values);
  };
  const CONVERT_PRODUCT_GROUPS = [
    { name: 'ThinkBook', code: '83', models: ['TB 14', 'TB 16', 'TB X', 'TB 14+', 'TB 16+', 'TB 16p', 'TB Plus Hybrid', 'ThinkBook Plus G7 Auto Twist'] },
    { name: 'TP Premium', code: '84', models: ['T14', 'T16', 'T14p', 'T14s', 'T1g', 'T16g', 'P1', 'P14s', 'P16s', 'P16v', 'Lenovo P16v', 'R14', 'S2'] },
    { name: 'Yangtian NB', code: '49', models: ['V14', 'V15'] },
    { name: 'Yangtian DT', code: '68', models: ['M4000q', 'S660', 'M460', 'T4900K', '显示器'] },
    { name: 'ThinkCentre', code: '82', models: ['P900c', 'neo S500', 'P600'] },
    { name: 'RuiTian DT', code: 'R1', models: ['瑞天100', '瑞天300', '瑞天500', '瑞天900'] },
    { name: 'RuiTian NB', code: 'R2', models: ['瑞天T14'] },
    { name: 'thinkplus', code: '86', models: [], allowCustomModel: true },
    { name: 'thinkplus RT', code: 'R3', models: [], allowCustomModel: true },
    { name: '服务', code: '46', models: ['MA'], allowCustomModel: true },
    { name: '百应', code: '百应', models: ['PC内采', 'AI主机-mini 100', 'AI主机 300', 'AI主机 Pro 700', 'PC外采', '工作站', '服务器', '微软', '其它'], allowCustomModel: true },
  ];
  function findConvertProductGroup(productName, productCode) {
    if (productName) {
      const byName = CONVERT_PRODUCT_GROUPS.find(item => item.name === productName);
      if (byName) return byName;
    }
    const current = String(productCode || '');
    return CONVERT_PRODUCT_GROUPS.find(item => current === item.code || current.startsWith(item.code + '-')) || null;
  }
  function convertModelControlHtml(group, value) {
    const safeValue = esc(value || '');
    if (!group) return '<select class="lead-inp" id="cvt-model" disabled><option>请先选择产品组名称</option></select>';
    if (group.allowCustomModel) {
      const listId = group.models.length ? 'cvt-model-options' : '';
      const listAttr = listId ? ` list="${listId}"` : '';
      const options = listId ? `<datalist id="${listId}">${group.models.map(model => `<option value="${esc(model)}"></option>`).join('')}</datalist>` : '';
      return `<input class="lead-inp" id="cvt-model"${listAttr} value="${safeValue}" placeholder="请输入型号">${options}`;
    }
    return `<select class="lead-inp" id="cvt-model"><option value="">请选择</option>${group.models.map(model => `<option value="${esc(model)}" ${model === value ? 'selected' : ''}>${esc(model)}</option>`).join('')}</select>`;
  }
  window.leadRenderConvertModel = function (name, clearModel) {
    const group = CONVERT_PRODUCT_GROUPS.find(item => item.name === name) || null;
    const codeInput = document.getElementById('cvt-product-code');
    const modelInput = document.getElementById('cvt-model');
    const modelHost = document.getElementById('cvt-model-host');
    const modelValue = clearModel ? '' : (modelInput ? modelInput.value : '');
    if (codeInput) codeInput.value = group ? group.code : '';
    if (modelHost) modelHost.innerHTML = convertModelControlHtml(group, modelValue);
  };
  // 转商机
  let CVT = null;
  window.leadOpenConvert = function (id) {
    CVT = findLead(id); if (!CVT) return toast('请选择 1 条线索', 'warn');
    if (CVT.status === '已关闭') return toast('已关闭线索不可转商机', 'warn');
    const today = new Date(), ds = `${today.getFullYear()}-${z(today.getMonth() + 1)}-${z(today.getDate())}`;
    const selectedGroup = findConvertProductGroup(CVT.productName, CVT.product);
    openModal('转商机', `
      ${field('ONE ID', `<input class="lead-inp" value="${CVT.oneId}" disabled>`)}
      ${field('Lenovo ID', `<input class="lead-inp" value="${CVT.lenovoId || '-'}" disabled>`)}
      ${field('日期', `<input type="date" class="lead-inp" id="cvt-date" value="${ds}">`)}
      ${field('产品组名称', `<select class="lead-inp" id="cvt-product-name" onchange="leadConvertProductNameChange(this.value)"><option value="">请选择</option>${CONVERT_PRODUCT_GROUPS.map(item => `<option value="${item.name}" ${selectedGroup && selectedGroup.name === item.name ? 'selected' : ''}>${item.name}</option>`).join('')}</select>`)}
      ${field('产品组', `<input class="lead-inp" id="cvt-product-code" value="${selectedGroup ? selectedGroup.code : ''}" placeholder="根据产品组名称自动回显" readonly>`)}
      ${field('型号', `<div id="cvt-model-host">${convertModelControlHtml(selectedGroup, CVT.model || '')}</div>`)}
      ${field('商机CA', `<input class="lead-inp" id="cvt-ca" placeholder="请输入">`)}
      ${field('商机总金额(万)', `<input class="lead-inp" id="cvt-amount" type="number" placeholder="请输入">`)}
      ${field('商机阶段', `<select class="lead-inp" id="cvt-stage"><option value="">请选择</option>${['初步接触', '需求确认', '方案报价', '谈判中', '合同签署'].map(x => `<option>${x}</option>`).join('')}</select>`)}
      ${field('赢单率', `<select class="lead-inp" id="cvt-win">${['10%', '30%', '50%', '70%', '90%'].map(x => `<option ${x === '50%' ? 'selected' : ''}>${x}</option>`).join('')}</select>`)}
      ${field('跟进进展', `<input class="lead-inp" id="cvt-prog" placeholder="请输入">`)}
      ${field('预计落单时间', `<select class="lead-inp" id="cvt-close"><option value="">请选择</option>${['本月', '本季度', '下季度', '下半年', '明年'].map(x => `<option>${x}</option>`).join('')}</select>`)}
      ${field('商机来源', `<select class="lead-inp" id="cvt-source"><option value="">请选择</option>${['官网注册', 'AI营销', '批量导入', '自挖掘', '外呼'].map(x => `<option>${x}</option>`).join('')}</select>`)}
      ${field('订单号', `<textarea class="lead-inp" id="cvt-order" rows="2" placeholder="请输入"></textarea>`)}
      ${field('备注', `<textarea class="lead-inp" id="cvt-remark" rows="2" placeholder="请输入"></textarea>`)}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadConfirmConvert()">确认</button>`, 700);
  };
  window.leadConvertProductNameChange = function (name) {
    window.leadRenderConvertModel(name, true);
  };
  window.leadConfirmConvert = function () {
    if (!val('cvt-date')) return toast('请选择日期', 'warn');
    if (!val('cvt-product-name')) return toast('请选择产品组名称', 'warn');
    if (!val('cvt-product-code')) return toast('未匹配到产品组，请重新选择产品组名称', 'warn');
    const group = findConvertProductGroup(val('cvt-product-name'), val('cvt-product-code'));
    if (!group) return toast('未匹配到产品组，请重新选择产品组名称', 'warn');
    const model = String(val('cvt-model') || '').trim();
    if (!model) return toast(group && group.allowCustomModel ? '请输入型号' : '请选择型号', 'warn');
    if (!group.allowCustomModel && !group.models.includes(model)) return toast('请选择当前产品组对应的型号', 'warn');
    if (!val('cvt-ca')) return toast('请输入商机CA', 'warn');
    if (!val('cvt-amount')) return toast('请输入商机金额', 'warn');
    if (!val('cvt-stage')) return toast('请选择商机阶段', 'warn');
    // 转商机不变更线索状态，仅记录转商机时间与一条日志
    CVT.convertedAt = new Date();
    CVT.sqlAmt = val('cvt-amount') ? parseFloat(val('cvt-amount')) : CVT.sqlAmt;
    CVT.productName = val('cvt-product-name');
    CVT.product = val('cvt-product-code');
    CVT.model = model;
    pushLog(CVT, 'convert', `转商机：产品组名称=${val('cvt-product-name')}，产品组=${val('cvt-product-code')}，型号=${model}，商机CA=${val('cvt-ca')}，金额=${val('cvt-amount')}万，阶段=${val('cvt-stage')}`);
    leadCloseModal(); LEAD.sel = new Set(); rerenderCurrent(); toast('已转商机，商机系统同步创建记录');
  };

  // 详情
  window.leadOpenDetail = function (id) {
    const d = findLead(id); if (!d) return;
    const item = (l, v) => `<div class="lead-desc-item"><div class="lead-desc-l">${l}</div><div class="lead-desc-v">${v}</div></div>`;
    const logs = d.followLogs.length ? `<div style="margin-top:16px"><div style="font-weight:600;margin-bottom:8px;color:var(--text)">跟进记录</div>${d.followLogs.map(log => `<div class="lead-log"><div>${esc(log.note || '')}</div><div class="lead-log-meta">${log.op} · ${fmt(log.time)} ${log.sc ? '状态→' + leadTag(log.sc) : ''}</div></div>`).join('')}</div>` : '';
    openModal('线索详情', `<div class="lead-desc-grid">
      ${item('ONE ID', `<span style="font-family:monospace;font-size:12px">${d.oneId}</span>`)}${item('线索编号', d.leadNo || '-')}
      ${item('Lenovo ID', d.lenovoId || '-')}${item('姓名', esc(d.name))}${item('客户名称', esc(d.company))}${item('手机号', maskPhone(d.phone))}
      ${item('客户分级', d.grade)}${item('产品组', d.product)}${item('线索状态', leadTag(d.status))}${item('Leads质量', d.quality || '-')}
      ${item('线索分', `<b style="color:var(--primary)">${d.score}</b>`)}${item('SQL金额合计', d.sqlAmt > 0 ? d.sqlAmt.toFixed(2) + '万' : '-')}${SQL_AMOUNT_FIELDS.map(f => item(f.label, fmtSqlAmountWithUnit(leadSqlAmount(d, f.key)))).join('')}
      ${item('所属IS', d.owner || '-')}${item('创建时间', fmt(d.createdAt))}${item('推送销售时间', fmt(d.pushAt))}${item('分配时间', fmt(d.assignedAt))}${item('反馈时间', fmt(d.feedbackAt))}${item('转商机时间', fmt(d.convertedAt))}
    </div>${logs}`, `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">关闭</button>`, 640);
  };

  // 查看详情：应用内切换到详情页（保留左侧导航/外壳，样式同在职员工管理详情页）
  window.leadShowDetail = function (id, backPage) {
    const d = findLead(id); if (!d) return;
    window.__leadDetail = d;
    window.__leadDetailBackPage = backPage === 'lead.governmentPool' ? backPage : 'lead.pool';
    if (typeof switchPage === 'function') switchPage('lead.detail');
  };
  function renderLeadDetailPage() {
    const d = window.__leadDetail;
    const backPage = window.__leadDetailBackPage === 'lead.governmentPool' ? 'lead.governmentPool' : 'lead.pool', backLabel = backPage === 'lead.governmentPool' ? '线索池-政企' : '线索池';
    if (!d) return `<div class="empty-state"><div class="title">未选择线索</div><div><button class="btn btn-secondary" onclick="switchPage('${backPage}')">返回${backLabel}</button></div></div>`;
    const pill = d.status === '已退回' ? 'danger' : (d.status === '已接收' || d.status === '跟进中') ? 'success' : 'muted';
    const fld = (lbl, v, strong) => `<div><div class="employee-field-label">${lbl}</div><div class="employee-field-value${strong ? ' strong' : ''}">${v == null || v === '' ? '-' : v}</div></div>`;
    const logs = d.followLogs && d.followLogs.length
      ? d.followLogs.map(log => `<div class="employee-audit-row"><div><div class="employee-field-value strong">${esc(log.note || '(无备注)')}</div><div class="employee-field-label">${log.op} · ${fmt(log.time)}</div></div>${log.sc ? `<div class="employee-audit-pass">状态→${log.sc}</div>` : ''}</div>`).join('')
      : '<div class="employee-field-label">暂无跟进记录</div>';
    return `
      <div class="employee-detail-page">
        <button class="btn btn-secondary employee-back-btn" onclick="switchPage('${backPage}')">← 返回${backLabel}</button>
        <div class="employee-detail-layout">
          <div class="card employee-profile-card">
            <div class="employee-avatar">${esc((d.name || '?').slice(0, 1))}</div>
            <div class="employee-profile-name">${esc(d.name || '-')}</div>
            <div class="employee-profile-meta">客户名称：${esc(d.company || '-')}</div>
            <div class="employee-profile-meta">Lenovo ID：${d.lenovoId || '-'}</div>
            <div class="employee-profile-info">
              <div>ONE ID：${d.oneId}</div>
              <div>线索编号：${d.leadNo || '-'}</div>
              <div><span class="status-pill ${pill}">${d.status || '待接收'}</span></div>
            </div>
          </div>
          <div class="employee-detail-stack">
            <div class="card"><div class="card-header"><span class="card-title">线索基本信息</span></div>
              <div class="employee-detail-section"><div class="employee-info-grid">
                ${fld('ONE ID', d.oneId)}${fld('线索编号', d.leadNo)}${fld('Lenovo ID', d.lenovoId)}
                ${fld('姓名', esc(d.name))}${fld('客户名称', esc(d.company))}${fld('手机号', maskPhone(d.phone))}
                ${fld('客户分级', d.grade)}${fld('产品组', d.product)}${fld('所属IS', d.owner)}
                ${fld('线索一级来源', d.source)}${fld('线索二级来源', d.source2)}${fld('线索三级来源', d.source3)}${fld('线索分', d.score)}
                ${d.relatedFromLeadNo ? fld('关联旧线索编号', d.relatedFromLeadNo) : ''}
              </div></div>
            </div>
            <div class="card"><div class="card-header"><span class="card-title">线索状态 &amp; 商机</span></div>
              <div class="employee-detail-section"><div class="employee-info-grid">
                ${fld('线索状态', dispStatus(d, LEAD.role) || d.status)}${fld('分配状态', dispAssign(d, LEAD.role))}${fld('是否MQL', d.isMql || '否')}${fld('Leads质量', d.quality)}
                ${fld('SQL金额合计', d.sqlAmt > 0 ? d.sqlAmt.toFixed(2) + '万' : '-')}${SQL_AMOUNT_FIELDS.map(f => fld(f.label, fmtSqlAmountWithUnit(leadSqlAmount(d, f.key)))).join('')}${fld('转商机时间', fmt(d.convertedAt))}
              </div></div>
            </div>
            <div class="card"><div class="card-header"><span class="card-title">时间线</span></div>
              <div class="employee-detail-section"><div class="employee-info-grid">
                ${fld('创建时间', fmt(d.createdAt))}${fld('推送销售时间', fmt(d.pushAt))}${fld('分配时间', fmt(d.assignedAt))}${fld('反馈时间', fmt(d.feedbackAt))}
              </div></div>
            </div>
            <div class="card"><div class="card-header"><span class="card-title">跟进记录</span></div>
              <div class="employee-detail-section">${logs}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  // 分配明细：内联面板（不用抽屉），随筛选联动
  function allocPanelHtml() {
    const list = poolBase().filter(l => dispAssign(l, LEAD.role) === '已分配');
    const rows = list.length ? list.map(l => `<tr><td style="text-align:left">${l.oneId}</td><td style="text-align:left">${l.lenovoId || '-'}</td><td style="text-align:left">${l.leadNo || '-'}</td><td style="text-align:left">${esc(l.name)}</td><td style="text-align:left">${fmt(l.assignedAt)}</td><td style="text-align:left">${l.assignedBy || '-'}</td><td style="text-align:left">${l.owner || '-'}</td></tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:30px">暂无分配记录</td></tr>`;
    return `<div class="card" style="padding:0;margin-bottom:14px">
      <div class="card-header" style="padding:13px 18px"><div class="card-title">分配明细</div>
        <span style="font-size:13px;color:var(--text-tertiary)">共 ${list.length} 条已分配 · 随筛选联动 · <span class="lead-link" style="text-decoration:none" onclick="leadStatClick('as')">收起 ✕</span></span></div>
      <div style="overflow:auto"><table class="lead-src-table"><thead><tr><th style="text-align:left">ONE ID</th><th style="text-align:left">Lenovo ID</th><th style="text-align:left">线索编号</th><th style="text-align:left">姓名</th><th style="text-align:left">分配时间</th><th style="text-align:left">分配人</th><th style="text-align:left">所属IS</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  // 数据维护
  let DEF = {};
  window.leadOpenDataEdit = function (idx) {
    if (idx != null && LEAD.dataEditLogs[idx]) {
      const log = LEAD.dataEditLogs[idx], vals = {}, metrics = [];
      (log.items || []).forEach(it => {
        const meta = DE_METRICS.find(m => m.key === it.key || m.label === it.label);
        if (meta) { metrics.push(meta.key); vals[meta.key] = it.increment; }
      });
      DEF = { team: log.teamKey || (log.team === '北京IS' ? 'beijing' : 'chengdu'), day: log.period || '', note: log.note || '', metrics, values: vals, editIndex: idx };
    } else {
      DEF = { team: 'beijing', day: '', note: '', metrics: [], values: {}, editIndex: null };
    }
    renderDataEditModal();
  };
  function renderDataEditModal() {
    const metricChecks = DE_METRICS.map(m => `<label class="lead-ck" style="margin-right:12px"><input type="checkbox" ${DEF.metrics.includes(m.key) ? 'checked' : ''} onchange="leadDEToggle('${m.key}')"/>${m.label}</label>`).join('');
    const valInputs = DEF.metrics.length ? `<div style="border-top:1px solid var(--border-light);margin-top:10px;padding-top:10px">${DE_METRICS.filter(m => DEF.metrics.includes(m.key)).map(m => `<div class="lead-pa-row"><span style="width:110px;font-size:13px;color:var(--text-secondary)">${m.label}${m.unit ? '(' + m.unit + ')' : ''}</span><input class="lead-inp" type="number" placeholder="增量" value="${DEF.values[m.key] || ''}" oninput="leadDEVal('${m.key}',this.value)"></div>`).join('')}</div>` : '';
    openModal(DEF.editIndex != null ? '修改维护数据' : '数据维护', `
      ${field('销售团队', `<label class="lead-ck"><input type="radio" name="de-team" ${DEF.team === 'chengdu' ? 'checked' : ''} onchange="leadDESet('team','chengdu')">成都IS</label> <label class="lead-ck"><input type="radio" name="de-team" ${DEF.team === 'beijing' ? 'checked' : ''} onchange="leadDESet('team','beijing')">北京IS</label>`)}
      ${field('日期', `<input type="date" class="lead-inp" style="width:180px" value="${DEF.day}" onchange="leadDESet('day',this.value)">`)}
      ${field('备注', `<textarea class="lead-inp" rows="2" placeholder="请填写本次维护说明（必填）" oninput="leadDESet('note',this.value)">${esc(DEF.note || '')}</textarea>`)}
      ${field('维护指标', `<div style="display:flex;flex-wrap:wrap;gap:4px">${metricChecks}</div>`)}
      ${valInputs}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadConfirmDataEdit()">保存</button>`, 560);
  }
  window.leadDESet = function (k, v) { DEF[k] = v; };
  window.leadDEToggle = function (k) { const i = DEF.metrics.indexOf(k); if (i >= 0) DEF.metrics.splice(i, 1); else DEF.metrics.push(k); renderDataEditModal(); };
  window.leadDEVal = function (k, v) { DEF.values[k] = v; };
  window.leadConfirmDataEdit = function () {
    if (!DEF.team) return toast('请选择销售团队', 'warn');
    if (!DEF.day) return toast('请选择日期', 'warn');
    if (!DEF.note || !DEF.note.trim()) return toast('请填写备注', 'warn');
    if (!DEF.metrics.length) return toast('请选择至少一个维护指标', 'warn');
    const pendingMetrics = DEF.metrics.filter(key => { const inc = parseFloat(DEF.values[key]); return !isNaN(inc) && inc !== 0; });
    if (!pendingMetrics.length) return toast('请填写至少一个非零增量值', 'warn');
    const periodKey = 'day';
    const teamLabel = DEF.team === 'beijing' ? '北京IS' : '成都IS';
    const opSP = SPS.find(s => s.itcode === (LEAD.role === 'leader' ? LEADER_ITCODE : SALES_ITCODE));
    const operator = opSP ? `${opSP.name}（${opSP.itcode}）` : LEAD.role;
    // 修改：先回滚原记录对 KB_TEAM_RAW 的增量
    if (DEF.editIndex != null && LEAD.dataEditLogs[DEF.editIndex]) {
      const old = LEAD.dataEditLogs[DEF.editIndex];
      const oldTeamKey = old.teamKey || (old.team === '北京IS' ? 'beijing' : 'chengdu');
      (old.items || []).forEach(it => {
        const meta = DE_METRICS.find(m => m.key === it.key || m.label === it.label);
        if (meta && KB_TEAM_RAW[periodKey][oldTeamKey]) KB_TEAM_RAW[periodKey][oldTeamKey][meta.idx] = +(KB_TEAM_RAW[periodKey][oldTeamKey][meta.idx] - it.increment).toFixed(2);
      });
    }
    const changed = [];
    DEF.metrics.forEach(key => {
      const meta = DE_METRICS.find(m => m.key === key), inc = parseFloat(DEF.values[key]);
      if (meta && !isNaN(inc) && inc !== 0) {
        const oldVal = +KB_TEAM_RAW[periodKey][DEF.team][meta.idx].toFixed(2);
        KB_TEAM_RAW[periodKey][DEF.team][meta.idx] = +(oldVal + inc).toFixed(2);
        changed.push({ key: meta.key, label: meta.label, oldVal, increment: inc, newVal: KB_TEAM_RAW[periodKey][DEF.team][meta.idx], unit: meta.unit });
      }
    });
    if (!changed.length) return toast('请填写至少一个非零增量值', 'warn');
    const rec = { time: new Date().toLocaleString('zh-CN', { hour12: false }), operator, team: teamLabel, teamKey: DEF.team, period: DEF.day, note: DEF.note.trim(), items: changed };
    if (DEF.editIndex != null && LEAD.dataEditLogs[DEF.editIndex]) LEAD.dataEditLogs[DEF.editIndex] = rec;
    else LEAD.dataEditLogs.unshift(rec);
    localStorage.setItem(DE_LOGS_KEY, JSON.stringify(LEAD.dataEditLogs));
    LEAD.kbFilters.period = periodKey;
    leadCloseModal(); renderKbBody(); toast(DEF.editIndex != null ? '维护数据已修改，图表已刷新' : '数据已更新，图表已刷新');
  };
  window.leadOpenDataLogs = function () {
    const logs = LEAD.dataEditLogs;
    const body = !logs.length ? `<div style="text-align:center;color:var(--text-tertiary);padding:40px 0">暂无操作记录</div>` :
      logs.map((log, idx) => `<div class="lead-log" style="border-bottom:1px solid var(--border-light);padding:10px 0">
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px"><span style="font-weight:600;color:var(--text)">${esc(log.operator)}</span> · <span style="color:var(--text-secondary)">${log.team}</span> · <span style="color:var(--text-secondary)">${log.period}</span><button class="btn btn-sm btn-secondary" style="margin-left:auto" onclick="leadOpenDataEdit(${idx})">修改</button></div>
        ${log.note ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">备注：${esc(log.note)}</div>` : ''}
        <table class="lead-src-table" style="font-size:12px"><thead><tr><th style="text-align:left">指标</th><th style="text-align:right">原值</th><th style="text-align:center">增量</th><th style="text-align:right">结果值</th></tr></thead>
        <tbody>${log.items.map(it => `<tr><td style="text-align:left;color:var(--text)">${it.label}</td><td style="text-align:right;color:var(--text-tertiary)">${it.oldVal}${it.unit}</td><td style="text-align:center;color:${it.increment > 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${it.increment > 0 ? '+' : ''}${it.increment}${it.unit}</td><td style="text-align:right;font-weight:600;color:var(--text)">${it.newVal}${it.unit}</td></tr>`).join('')}</tbody></table></div>`).join('');
    openModal('数据维护操作日志', body, `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">关闭</button>`, 620);
  };

  // 导出（plain=true 为明文手机号，需走审批）
  function doExportCsv(plain) {
    const list = LEAD.sel.size > 0 ? LEAD.leads.filter(l => LEAD.sel.has(l.rowId)) : poolRows();
    if (!list.length) { toast('暂无可导出数据', 'warn'); return false; }
    const headers = ['ONE ID', '线索编号', 'Lenovo ID', '姓名', '客户名称', '手机号', '客户分级', '产品组', '线索状态', '是否MQL', 'Leads质量', '线索分', 'SQL金额-PC（万元）', 'SQL金额-SD（万元）', 'SQL金额-SS（万元）', 'SQL金额-SI（万元）', '所属IS', '线索一级来源', '线索二级来源', '线索三级来源', '创建时间', '推送销售时间', '分配时间', '反馈时间', '转商机时间'];
    const escc = v => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [headers.join(',')];
    list.forEach(l => rows.push([l.oneId, l.leadNo || '', l.lenovoId || '', l.name, l.company, plain ? l.phone : maskPhone(l.phone), l.grade, l.product, (dispStatus(l, LEAD.role) === '待接收' ? '' : dispStatus(l, LEAD.role)), l.isMql || '否', l.quality || '', l.score, ...SQL_AMOUNT_FIELDS.map(f => { const amount = leadSqlAmount(l, f.key); return amount == null ? '' : amount; }), l.owner || '', l.source || '', l.source2 || '', l.source3 || '', fmt(l.createdAt), fmt(l.pushAt), fmt(l.assignedAt), fmt(l.feedbackAt), fmt(l.convertedAt)].map(escc).join(',')));
    downloadCsv(rows.join('\n'), `线索列表${plain ? '_明文' : '_脱敏'}_${ts()}.csv`);
    return list.length;
  }
  window.leadExportCSV = function () { const n = doExportCsv(false); if (n) toast(`脱敏导出成功，共 ${n} 条`); };
  // 2.2 明文导出走审批
  window.leadExportApproval = function () {
    const n = (LEAD.sel.size > 0 ? LEAD.sel.size : poolRows().length);
    if (!n) return toast('暂无可导出数据', 'warn');
    openModal('明文导出审批', `
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:8px">明文导出含<strong style="color:var(--text)">手机号等敏感信息</strong>，需提交审批，审批通过后方可下载。本次导出范围：<strong style="color:var(--primary)">${n}</strong> 条线索。</div>
      ${field('审批人', `<select class="lead-inp" id="ex-approver"><option>数据安全负责人</option><option>线索运营 Leader</option><option>合规审计</option></select>`)}
      ${field('导出事由', `<textarea class="lead-inp" id="ex-reason" rows="3" placeholder="请说明明文导出用途（必填）"></textarea>`)}`,
      `<button class="btn btn-sm btn-secondary" onclick="leadCloseModal()">取消</button><button class="btn btn-sm btn-primary" onclick="leadSubmitExportApproval()">提交审批</button>`, 480);
  };
  window.leadSubmitExportApproval = function () {
    if (!val('ex-reason')) return toast('请填写导出事由', 'warn');
    leadCloseModal();
    toast('明文导出申请已提交审批');
    // demo：模拟审批通过后下载明文文件
    setTimeout(() => { const n = doExportCsv(true); if (n) toast(`审批通过（demo），已下载明文 ${n} 条`); }, 1200);
  };
  window.leadExportFunnel = function () {
    const d = kbFunnelCur(), yoy = LEAD.kbFilters.yoy, mom = LEAD.kbFilters.mom;
    const yo = KB_FUNNEL[LEAD.kbFilters.period].yoy, mo = KB_FUNNEL[LEAD.kbFilters.period].mom;
    const e = c => `"${String(c).replace(/"/g, '""')}"`;
    const header = ['指标名称', '代号', '当前值']; if (yoy) header.push('同比基准值', '同比变化'); if (mom) header.push('环比基准值', '环比变化');
    const rows = [header];
    kbKpiCards.forEach(c => { const cur = d[c.key], disp = c.isAmt ? kbFmtAmt(cur) : kbFmt(cur); const r = [c.label, c.code, disp]; if (yoy) r.push(c.isAmt ? kbFmtAmt(yo[c.key]) : kbFmt(yo[c.key]), kbTT(cur, yo[c.key])); if (mom) r.push(c.isAmt ? kbFmtAmt(mo[c.key]) : kbFmt(mo[c.key]), kbTT(cur, mo[c.key])); rows.push(r); });
    downloadCsv(rows.map(r => r.map(e).join(',')).join('\r\n'), '整体看板数据.csv');
  };
  window.leadExportQuality = function () {
    const p = LEAD.kbTab2Period, yoy = LEAD.kbTab2Yoy, mom = LEAD.kbTab2Mom;
    const e = c => `"${String(c).replace(/"/g, '""')}"`;
    const pct = (cu, b) => { if (!b) return '-'; const d = ((cu - b) / b * 100).toFixed(1); return d >= 0 ? `↑+${d}%` : `↓${Math.abs(d)}%`; };
    const rh = ['退回原因', '当期数量']; if (yoy) rh.push('同比数量', '同比变化'); if (mom) rh.push('环比数量', '环比变化');
    const retRows = [['【退回原因】'], rh];
    kbReturnSorted().forEach(({ reason, val }) => { const idx = KB_RETURN_REASONS.indexOf(reason), r = [reason, val]; if (yoy) { const b = KB_RETURN_DATA[p].yoy[idx]; r.push(b, pct(val, b)); } if (mom) { const b = KB_RETURN_DATA[p].mom[idx]; r.push(b, pct(val, b)); } retRows.push(r); });
    const srcRows = [[], ['【分来源漏斗指标】'], ['线索来源', ...KB_SOURCE_COLS], ...kbSourceTableData().map(r => r.map(String))];
    downloadCsv([...retRows, ...srcRows].map(r => r.map(e).join(',')).join('\r\n'), '线索质量看板数据.csv');
  };
  function ts() { const t = new Date(); return `${t.getFullYear()}${z(t.getMonth() + 1)}${z(t.getDate())}_${z(t.getHours())}${z(t.getMinutes())}`; }
  function downloadCsv(content, name) {
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  // ===================== 线索打分（打分模型） =====================
  const SR_KEY = 'clue_score_rules_v4';
  const ATTR_FIELDS = [
    { key: 'isNewProspect', label: '是否为新潜客', options: ['是', '否'] },
    { key: 'ageRange', label: '年龄', options: ['24岁以下', '24-35岁', '35岁-60岁', '60岁以上'] },
    { key: 'gender', label: '性别', options: ['男性', '女性'] },
    { key: 'isKeyBuyer', label: '是否为关键采购人', options: ['是', '否'] },
    { key: 'industry', label: '行业', options: ['制造业', '服务业', '批发零售业', '建筑业', '其他'] },
    { key: 'companyType', label: '企业', options: ['国企', '民企', '外企', '事业单位', '初创公司', '专精特新'] },
    { key: 'companyScale', label: '企业规模', options: ['B1', 'B2', 'B3', 'B4', 'B5'] },
    { key: 'budgetCA', label: '预算（CA）', options: ['1-5台', '5-10台', '10台以上'] },
  ];
  const RULE_SITES=[{value:'enterprise',label:'企业购'},{value:'government',label:'政企'}];
  const PAGE_SITES=['政企','企业购','自定义页面'],NO_BROWSE_SITES=['政企','企业购','官网','自定义页面'],COUPON_CATEGORIES=['主机','选件','服务','通用券'];
  const BEHAVIOR_FIELDS = [
    { key: 'consultCount', label: '在线咨询次数', target: 'select', opts: ['1次', '2-3次', '4-7次', '7次以上'], noCount: true },
    { key: 'phoneDuration', label: '电话沟通时长', target: 'select', opts: ['小于30s', '大于30s'], noCount: true },
    { key: 'addCart', label: '加购', target: 'select', opts: ['是', '否'], noCount: true, productScope: true },
    { key: 'submitUnpaid', label: '提交未支付', target: 'select', opts: ['是', '否'], noCount: true, productScope: true },
    { key: 'leaveContact', label: '留资', target: 'select', opts: ['是', '否'], noCount: true },
    { key: 'historyCategory', label: '历史采购过品类', noCount: true, categoryScope: true },
    { key: 'companyRegistIncomplete', label: '企业注册未完成', target: 'select', opts: ['是'], noCount: true },
    { key: 'pageView', label: '页面浏览', sub: PAGE_SITES, noCount: true },
    { key: 'productDetail', label: '商详页浏览', productTarget: true, noCount: true },
    { key: 'search', label: '搜索', sub: ['搜索页面', '搜索关键词'], searchTarget: true, noCount: true },
    { key: 'coupon', label: '领取优惠券', couponTarget: true, noCount: true },
    { key: 'login', label: '未登陆', daysAbove: true },
    { key: 'noBrowse', label: '未浏览', daysAbove: true, siteTarget: true },
    { key: 'noOpportunity', label: '无商机' },
  ];
  const ATTR_OPS = [{ value: 'eq', label: '等于' }, { value: 'ne', label: '不等于' }];
  const COUNT_OPS = [{ value: 'eq', label: '=' }, { value: 'gte', label: '≥' }, { value: 'lte', label: '≤' }];
  const SCORE_FA_OPTIONS = ['ThinkPad', 'ThinkBook', 'Yoga', '拯救者', '扬天'];
  const SCORE_PRODUCT_GROUP_OPTIONS = ['笔记本', '台式机', '工作站', '服务器', '选件'];
  const attrField = k => ATTR_FIELDS.find(f => f.key === k) || ATTR_FIELDS[0];
  const behField = k => BEHAVIOR_FIELDS.find(f => f.key === k) || BEHAVIOR_FIELDS[0];
  const srReqTarget = k => { const f = behField(k); return !!(f.url || f.code || f.productTarget || f.searchTarget); }; // 需填 url/编码/业务对象
  const DEFAULT_RULES = [
    { name: '潜客 + 浏览商品详情', site: 'enterprise', kind: 'add', score: 10, cap: 3, enabled: true, attrLogic: 'and', attrConditions: [{ field: 'isNewProspect', op: 'eq', value: '是' }], groupLogic: 'and', behaviorLogic: 'and', behaviorConditions: [{ dayFrom: '', dayTo: '', toNow: false, verb: 'did', behavior: 'productDetail', sub: '', targetMode: 'code', target: '10001234', fa: '', productGroup: '', links: [''], keywords: [''] }] },
    { name: '长期未登录', site: 'government', kind: 'sub', score: 5, cap: 1, enabled: true, attrLogic: 'and', attrConditions: [], groupLogic: 'and', behaviorLogic: 'and', behaviorConditions: [{ dayFrom: '', dayTo: '', verb: 'not', behavior: 'login', sub: '', target: '', count: '180', device: 'PC端' }] },
  ];
  function normalizeScoreRule(rule,i){const z=Object.assign({id:'SR-'+(Date.now()+i),createdAt:Date.now()+i,site:'enterprise'},rule);z.behaviorConditions=(z.behaviorConditions||[]).map(raw=>{const c=Object.assign({toNow:false,verb:'did',urlMatch:'contains',siteTarget:'政企',couponCategory:'',links:[''],keywords:[]},raw);if(c.behavior==='touch')c.behavior='pageView';if(c.behavior==='pageView'&&raw.verb==='not'){c.behavior='noBrowse';c.siteTarget=NO_BROWSE_SITES.includes(c.sub)?c.sub:'政企'}c.verb='did';return c});const dated=z.behaviorConditions.find(c=>c.dayFrom||c.dayTo||c.toNow)||{};if(z.behaviorDayFrom==null)z.behaviorDayFrom=dated.dayFrom||'';if(z.behaviorDayTo==null)z.behaviorDayTo=dated.dayTo||'';if(z.behaviorToNow==null)z.behaviorToNow=!!dated.toNow;return z}
  LEAD.scoreRules=((JSON.parse(localStorage.getItem(SR_KEY)||'null'))||DEFAULT_RULES).map(normalizeScoreRule);
  LEAD.srf = null; LEAD.srEditId = null; LEAD.scoreSiteFilter = 'enterprise';
  function saveScoreRules() { localStorage.setItem(SR_KEY, JSON.stringify(LEAD.scoreRules)); }
  function makeAttrCond() { return { field: ATTR_FIELDS[0].key, op: 'eq', value: ATTR_FIELDS[0].options[0] }; }
  function makeBehCond() { const b = BEHAVIOR_FIELDS[0]; return { dayFrom: '', dayTo: '', toNow: false, verb: 'did', behavior: b.key, sub: b.sub ? b.sub[0] : (b.opts ? b.opts[0] : ''), target: '', count: '', targetMode: 'fa', fa: '', productGroup: '', links: [''], keywords: [''] }; }
  // 计数动作词
  const COUNT_WORD = { visit: '每访问', search: '每搜索', click: '每点击', receive: '每领取' };
  // 条件「计数/天数」可读文案
  function condCountText(c) {
    const bf = behField(c.behavior);
    if (bf.noCount || bf.key === 'noOpportunity') return '';
    if (bf.daysAbove) return ` ${c.count||'N'} 天以上`;
    if (c.verb === 'not') return bf.key === 'pageView' ? ` 距离最近一次浏览 ${c.count || 'N'} 天内` : ''; // 未做过：仅页面浏览展示天数，其余不展示
    return ` ${COUNT_WORD[bf.countMode] || '每发生'} ${c.count || 'N'} 次`;
  }
  function blankRuleForm() { return { name: '', site: 'enterprise', kind: 'add', score: '', cap: '', attrLogic: 'and', attrConditions: [makeAttrCond()], groupLogic: 'and', behaviorLogic: 'and', behaviorDayFrom: '', behaviorDayTo: '', behaviorToNow: false, behaviorConditions: [makeBehCond()] }; }

  function renderCondText(rule) {
    const opT = o => o === 'ne' ? '≠' : '=';
    const cntT = o => o === 'gte' ? '≥' : o === 'lte' ? '≤' : '=';
    const parts = [];
    if (rule.attrConditions && rule.attrConditions.length) {
      const ap = rule.attrConditions.map(c => `${attrField(c.field).label} ${opT(c.op)} ${c.value}`).join(rule.attrLogic === 'or' ? ' 或 ' : ' 且 ');
      parts.push(`(${ap})`);
    }
    if (rule.behaviorConditions && rule.behaviorConditions.length) {
      const behaviorDayT=rule.behaviorToNow?(rule.behaviorDayFrom?rule.behaviorDayFrom+'~至今 ':'至今 '):((rule.behaviorDayFrom||rule.behaviorDayTo)?(rule.behaviorDayFrom||'')+'~'+(rule.behaviorDayTo||'')+' ':'');
      const bp = rule.behaviorConditions.map(c => {
        const bf = behField(c.behavior);
        const verbT='做过 ';
        const subT = c.sub ? c.sub : '';
        let tg = c.target ? '"' + c.target + '"' : '';
        if((bf.productScope&&c.target==='是')||bf.categoryScope) tg=(bf.productScope?' 是':'')+' FA：'+(c.fa||'-')+' / 产品组：'+(c.productGroup||'-');
        if (bf.key === 'leaveContact' && c.target === '是') tg = ' 留资链接：' + (c.links || []).filter(Boolean).join('、');
        if (bf.key === 'productDetail') {
          if (c.targetMode === 'faProduct') tg = ' FA + 产品组：' + (c.fa || '-') + ' / ' + (c.productGroup || '-');
          else if (c.targetMode === 'code') tg = ' 商品编码：' + (c.target || '-');
          else tg = ' FA：' + (c.fa || '-');
        }
        if(bf.key==='search'&&c.sub==='搜索关键词')tg=' 搜索关键词：' + (c.keywords || []).filter(Boolean).join('、');
        if(bf.key==='pageView')tg=c.sub==='自定义页面'?' '+(c.urlMatch==='equals'?'等于':'包含')+'：'+(c.target||'-'):'';
        if(bf.key==='coupon')tg=' 品类：'+(c.couponCategory||'-');
        if(bf.key==='noBrowse')tg=' 站点：'+(c.siteTarget||'-')+(c.siteTarget==='自定义页面'?' URL：'+(c.target||'-'):'');
        return verbT + bf.label + (subT ? '·' + subT : '') + tg + condCountText(c);
      }).join(rule.behaviorLogic === 'or' ? ' 或 ' : ' 且 ');
      parts.push(`(${behaviorDayT}${bp})`);
    }
    if (!parts.length) return '—';
    return parts.join(rule.groupLogic === 'or' ? ' 或 ' : ' 且 ');
  }

  // 渲染：线索打分页
  function renderScore() {
    const header = `<div class="page-header">
        <div><div class="page-title">打分模型</div><div class="page-desc">企业客户管理 · 线索打分规则配置（加分 / 减分规则；停用规则不计入满分）</div></div>
      </div>`;
    if (LEAD.role !== 'ops') {
      return header + `<div class="empty-state"><div class="title">仅运营可查看与操作</div><div>打分模型配置权限仅对运营开放。</div></div>`;
    }
    return header + `
      <div id="lead-score-stats"></div>
      <div id="lead-score-toolbar"></div>
      <div id="lead-score-add"></div>
      <div id="lead-score-sub"></div>`;
  }
  function scoreStatsHtml() {
    const rules = LEAD.scoreRules.filter(r => r.site === LEAD.scoreSiteFilter);
    const addMax = rules.filter(r => r.kind === 'add' && r.enabled).reduce((s, r) => s + (+r.score) * (+r.cap), 0);
    const subMax = rules.filter(r => r.kind === 'sub' && r.enabled).reduce((s, r) => s + (+r.score) * (+r.cap), 0);
    const enabled = rules.filter(r => r.enabled).length;
    const cards = [
      { label: '满分', val: '1000' },
      { label: '启用加分项满分', val: '+' + addMax },
      { label: '启用减分项满分', val: subMax ? '-' + subMax : '0' },
      { label: '启用规则 / 总规则', val: `${enabled} / ${rules.length}` },
    ];
    return `<div class="lead-stat-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${cards.map(c => `<div class="lead-stat" style="cursor:default"><div class="lead-stat-label">${c.label}</div><div class="lead-stat-val">${c.val}</div></div>`).join('')}</div>`;
  }
  function scoreToolbarHtml() {
    return `<div class="lead-toolbar" style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><button class="btn btn-sm btn-primary" ${canEditScore() ? '' : 'disabled'} onclick="leadScoreOpenAdd()">＋ 新建规则</button>${canEditScore() ? '' : '<span style="font-size:12px;color:var(--text-tertiary)">当前角色仅可查看</span>'}</div><div class="lead-site-view"><span>查看站点</span><div class="lead-seg">${RULE_SITES.map(site => `<button type="button" class="lead-seg-btn ${LEAD.scoreSiteFilter === site.value ? 'active' : ''}" onclick="leadScoreSetSite('${site.value}')">${site.label}</button>`).join('')}</div></div></div>`;
  }
  function canEditScore() { return LEAD.role === 'ops'; }
  function scoreTableHtml(kind, title) {
    const rules = LEAD.scoreRules.filter(r => r.site === LEAD.scoreSiteFilter).filter(r => r.kind === kind);
    const ops = canEditScore();
    const head = `<tr><th style="text-align:left;width:64px">分类</th><th style="text-align:right;width:70px">分值</th><th style="text-align:left;min-width:120px">名称</th><th style="text-align:right;width:110px">累计次数上限</th><th style="text-align:left">条件</th><th style="text-align:center;width:80px">状态</th>${ops ? '<th style="text-align:center;width:130px">操作</th>' : ''}</tr>`;
    let body;
    if (!rules.length) body = `<tr><td colspan="${ops ? 7 : 6}" style="text-align:center;color:var(--text-tertiary);padding:30px">暂无${kind === 'add' ? '加分' : '减分'}规则</td></tr>`;
    else body = rules.map(r => {
      const cond = renderCondText(r);
      return `<tr class="${r.enabled ? '' : 'lead-row-off'}">
        <td style="text-align:left">${kind === 'add' ? '加分' : '减分'}</td>
        <td style="text-align:right;font-weight:600;${r.enabled ? (kind === 'add' ? 'color:var(--green)' : 'color:var(--red)') : ''}">${kind === 'add' ? '+' : '-'}${r.score}</td>
        <td style="text-align:left">${esc(r.name)}</td>
        <td style="text-align:right">${r.cap}</td>
        <td style="text-align:left;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(cond)}">${esc(cond)}</td>
        <td style="text-align:center">${r.enabled ? '<span class="badge badge-green">启用</span>' : '<span class="badge">已停用</span>'}</td>
        ${ops ? `<td style="text-align:center;white-space:nowrap"><button class="lead-abtn" onclick="leadScoreOpenEdit('${r.id}')">编辑</button><button class="lead-abtn ${r.enabled ? 'dan' : 'suc'}" onclick="leadScoreToggle('${r.id}')">${r.enabled ? '停用' : '启用'}</button></td>` : ''}
      </tr>`;
    }).join('');
    return `<div class="card" style="padding:0;margin-bottom:14px">
      <div class="card-header" style="padding:13px 18px"><div class="card-title">${title}</div><span style="font-size:13px;color:var(--text-tertiary)">共 ${rules.length} 条</span></div>
      <div style="overflow:auto"><table class="lead-src-table lead-score-table">${head}${body}</table></div></div>`;
  }
  function scoreRefresh() {
    const s = document.getElementById('lead-score-stats'); if (s) s.innerHTML = scoreStatsHtml();
    const t = document.getElementById('lead-score-toolbar'); if (t) t.innerHTML = scoreToolbarHtml();
    const a = document.getElementById('lead-score-add'); if (a) a.innerHTML = scoreTableHtml('add', '加分项');
    const b = document.getElementById('lead-score-sub'); if (b) b.innerHTML = scoreTableHtml('sub', '减分项');
  }

  // 弹窗：新建 / 编辑规则
  window.leadScoreSetSite = function (site) { if (!RULE_SITES.some(x => x.value === site)) return; LEAD.scoreSiteFilter = site; scoreRefresh(); };
  window.leadScoreOpenAdd = function () { if (!canEditScore()) return; LEAD.srEditId = null; LEAD.srf = blankRuleForm(); LEAD.srf.site = LEAD.scoreSiteFilter; renderRuleModal(); };
  window.leadScoreOpenEdit = function (id) { if (!canEditScore()) return; const r = LEAD.scoreRules.find(x => x.id === id); if (!r) return; LEAD.srEditId = id; LEAD.srf = JSON.parse(JSON.stringify(r)); renderRuleModal(); };
  window.leadScoreToggle = function (id) { const r = LEAD.scoreRules.find(x => x.id === id); if (!r) return; r.enabled = !r.enabled; saveScoreRules(); scoreRefresh(); toast(r.enabled ? '规则已启用' : '规则已停用'); };

  function srSeg(curr, key) {
    return `<div class="lead-seg">
      <button type="button" class="lead-seg-btn ${curr === 'and' ? 'active' : ''}" onclick="leadSRLogic('${key}','and')">且</button>
      <button type="button" class="lead-seg-btn ${curr === 'or' ? 'active' : ''}" onclick="leadSRLogic('${key}','or')">或</button></div>`;
  }
  function renderRuleModal() {
    const f = LEAD.srf;
    const attrRows = f.attrConditions.map((c, i) => `<div class="lead-pa-row">
      <select class="lead-inp" style="flex:1.4" onchange="leadSRAttrField(${i},this.value)">${ATTR_FIELDS.map(a => `<option value="${a.key}" ${c.field === a.key ? 'selected' : ''}>${a.label}</option>`).join('')}</select>
      <select class="lead-inp" style="flex:.8" onchange="leadSRAttr(${i},'op',this.value)">${ATTR_OPS.map(o => `<option value="${o.value}" ${c.op === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
      <select class="lead-inp" style="flex:1.2" onchange="leadSRAttr(${i},'value',this.value)">${attrField(c.field).options.map(v => `<option ${c.value === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <button class="lead-abtn dan" ${(f.attrConditions.length === 1 && f.behaviorConditions.length === 0) ? 'disabled' : ''} onclick="leadSRAttrDel(${i})">×</button></div>`).join('');
    const behRows = f.behaviorConditions.map((c, i) => {
      const bf = behField(c.behavior);
      const hasVerb = !(bf.noCount || bf.key === 'noOpportunity'); // 是否有计数控件
      // 行为统一按做过处理。
      // 行为
      const behSel = `<select class="lead-inp" style="min-width:170px" onchange="leadSRBehField(${i},this.value)">${BEHAVIOR_FIELDS.map(b => `<option value="${b.key}" ${c.behavior === b.key ? 'selected' : ''}>${b.label}</option>`).join('')}</select>`;
      // 子选项：noCount 用 opts 绑 target（未做过时不展示取值条件）；页面类用 sub 绑 sub
      let subCtl = '';
      if(bf.noCount&&bf.opts)subCtl=`<select class="lead-inp" style="min-width:120px" onchange="leadSRBeh(${i},'target',this.value)"><option value="">请选择</option>${bf.opts.map(o => `<option ${c.target === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
      else if (bf.sub) subCtl = `<select class="lead-inp" style="min-width:120px" onchange="leadSRBeh(${i},'sub',this.value)">${bf.sub.map(o => `<option ${c.sub === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
      // url / 商品编码 输入（加长）
      let inputCtl = '';
      if(bf.key==='pageView'&&c.sub==='自定义页面')inputCtl=`<select class="lead-inp" onchange="leadSRBeh(${i},'urlMatch',this.value)"><option value="contains" ${c.urlMatch!=='equals'?'selected':''}>包含</option><option value="equals" ${c.urlMatch==='equals'?'selected':''}>等于</option></select><input class="lead-inp" placeholder="请输入URL" value="${esc(c.target||'')}" oninput="leadSRBeh(${i},'target',this.value)">`;
      else if(bf.url)inputCtl=`<input class="lead-inp" placeholder="请输入url" value="${esc(c.target||'')}" oninput="leadSRBeh(${i},'target',this.value)">`;
      else if (bf.code) inputCtl = `<input class="lead-inp" style="flex:1;min-width:320px" placeholder="请输入商品编码，多个用英文,隔开" value="${esc(c.target || '')}" oninput="leadSRBeh(${i},'target',this.value)">`;
      if((bf.productScope&&c.target==='是')||bf.categoryScope)inputCtl=`<select class="lead-inp" style="min-width:120px" onchange="leadSRBeh(${i},'fa',this.value)"><option value="">选择FA</option>${SCORE_FA_OPTIONS.map(v=>`<option ${c.fa===v?'selected':''}>${v}</option>`).join('')}</select><select class="lead-inp" style="min-width:130px" onchange="leadSRBeh(${i},'productGroup',this.value)"><option value="">选择产品组</option>${SCORE_PRODUCT_GROUP_OPTIONS.map(v=>`<option ${c.productGroup===v?'selected':''}>${v}</option>`).join('')}</select>`;
      if (bf.key === 'leaveContact' && c.target === '是') {
        const links = (c.links && c.links.length ? c.links : ['']);
        inputCtl = `<div class="lead-score-inline-list">${links.map((link, li) => `<div class="lead-score-link-row"><input class="lead-inp" placeholder="请输入留资链接" value="${esc(link || '')}" oninput="leadSRLinkSet(${i},${li},this.value)"><button class="lead-abtn dan" ${links.length === 1 ? 'disabled' : ''} onclick="leadSRLinkDel(${i},${li})">×</button></div>`).join('')}<button type="button" class="btn btn-sm btn-secondary lead-score-link-add" onclick="leadSRLinkAdd(${i})">+ 添加链接</button></div>`;
      }
      if (bf.productTarget) {
        const mode = c.targetMode || 'fa';
        const modeCtl = `<select class="lead-inp" style="min-width:130px" onchange="leadSRProductTargetMode(${i},this.value)"><option value="fa" ${mode === 'fa' ? 'selected' : ''}>按FA</option><option value="faProduct" ${mode === 'faProduct' ? 'selected' : ''}>FA + 产品组</option><option value="code" ${mode === 'code' ? 'selected' : ''}>商品编码</option></select>`;
        const faCtl = `<select class="lead-inp" style="min-width:120px" onchange="leadSRBeh(${i},'fa',this.value)"><option value="">选择FA</option>${SCORE_FA_OPTIONS.map(x => `<option ${c.fa === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
        const pgCtl = mode === 'faProduct' ? `<select class="lead-inp" style="min-width:130px" onchange="leadSRBeh(${i},'productGroup',this.value)"><option value="">选择产品组</option>${SCORE_PRODUCT_GROUP_OPTIONS.map(x => `<option ${c.productGroup === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : '';
        const codeCtl = mode === 'code' ? `<input class="lead-inp" style="flex:1;min-width:260px" placeholder="请输入商品编码，多个用英文,隔开" value="${esc(c.target || '')}" oninput="leadSRBeh(${i},'target',this.value)">` : '';
        inputCtl = modeCtl + (mode === 'code' ? codeCtl : faCtl + pgCtl);
      }
      if(bf.key==='coupon')inputCtl=`<select class="lead-inp" onchange="leadSRBeh(${i},'couponCategory',this.value)"><option value="">请选择</option>${COUPON_CATEGORIES.map(v=>`<option ${c.couponCategory===v?'selected':''}>${v}</option>`).join('')}</select>`;
      if(bf.key==='noBrowse'){subCtl='';inputCtl=`<select class="lead-inp" onchange="leadSRBeh(${i},'siteTarget',this.value)">${NO_BROWSE_SITES.map(v=>`<option ${c.siteTarget===v?'selected':''}>${v}</option>`).join('')}</select>`+(c.siteTarget==='自定义页面'?`<input class="lead-inp" placeholder="请输入URL" value="${esc(c.target||'')}" oninput="leadSRBeh(${i},'target',this.value)">`:'')}
      if (bf.key === 'search') {
        if (c.sub === '搜索关键词') {
          inputCtl = `<input class="lead-inp" style="flex:1;min-width:280px" placeholder="请输入搜索关键词，多个关键词用英文,隔开" value="${esc((c.keywords || []).filter(Boolean).join(','))}" oninput="leadSRKeywordsSet(${i},this.value)">`;
        } else {
          inputCtl = `<input class="lead-inp" style="flex:1;min-width:280px" placeholder="请输入搜索页面URL" value="${esc(c.target || '')}" oninput="leadSRBeh(${i},'target',this.value)">`;
        }
      }
      // 日期区间（每条行为条件）
      // 计数/天数 控件（登录恒为天数；未做过仅页面浏览展示天数，其余不展示）
      const cntInput = (key, val, ph) => `<input class="lead-inp" type="number" min="1" style="width:90px;flex:none" placeholder="${ph || 'N'}" value="${val}" oninput="leadSRBeh(${i},'${key}',this.value)">`;
      let countCtl = '';
      if (hasVerb) {
        if(bf.daysAbove) countCtl=`<div class="lead-pa-row" style="margin-left:0"><span style="font-size:13px;color:var(--text-secondary)">${bf.key==='login'?'连续未登陆':'距离最近一次浏览'}</span>${cntInput('count',c.count)}<span style="font-size:13px;color:var(--text-secondary)">天以上</span></div>`;
        else countCtl = `<div class="lead-pa-row" style="margin-left:0"><span style="font-size:13px;color:var(--text-secondary);white-space:nowrap">${COUNT_WORD[bf.countMode] || '每发生'}</span>${cntInput('count', c.count)}<span style="font-size:13px;color:var(--text-secondary)">次</span></div>`;
      }
      return `<div class="lead-beh-row">
        <div class="lead-pa-row">
          ${behSel}${subCtl}${inputCtl}
          <button class="lead-abtn dan lead-beh-delete" ${(f.behaviorConditions.length === 1 && f.attrConditions.length === 0) ? 'disabled' : ''} onclick="leadSRBehDel(${i})">×</button>
        </div>
        ${countCtl}</div>`;
    }).join('');
    const body = `
      <div style="display:flex;gap:12px">
        ${field('规则名称', `<input class="lead-inp" id="sr-name" maxlength="30" placeholder="请输入规则名称" value="${esc(f.name)}" oninput="leadSRSet('name',this.value)">`)}
        ${field('获得分值', `<input class="lead-inp" id="sr-score" type="number" min="1" placeholder="≥1 整数" value="${f.score}" oninput="leadSRSet('score',this.value)">`)}
        ${field('累计次数上限', `<input class="lead-inp" id="sr-cap" type="number" min="1" placeholder="≥1 整数" value="${f.cap}" oninput="leadSRSet('cap',this.value)">`)}
      </div>
      <div class="lead-field"><label>站点</label><div class="lead-field-c lead-rule-sites">${RULE_SITES.map(s=>`<label class="lead-ck"><input type="radio" name="sr-site" ${f.site===s.value?'checked':''} onchange="leadSRSet('site','${s.value}')">${s.label}</label>`).join('')}</div></div>
      <div class="lead-field"><label>规则类型</label><div class="lead-field-c">
        <label class="lead-ck" style="margin-right:16px"><input type="radio" name="sr-kind" ${f.kind === 'add' ? 'checked' : ''} onchange="leadSRSet('kind','add')">加分规则</label>
        <label class="lead-ck"><input type="radio" name="sr-kind" ${f.kind === 'sub' ? 'checked' : ''} onchange="leadSRSet('kind','sub')">减分规则</label></div></div>
      <div class="lead-cond-group">
        <div class="lead-cond-head"><span>用户属性</span>${f.attrConditions.length > 1 ? `<span style="font-weight:400;color:var(--text-secondary);font-size:12px">组内</span>${srSeg(f.attrLogic, 'attrLogic')}` : ''}<button type="button" class="btn btn-sm btn-secondary" style="margin-left:auto" onclick="leadSRAttrAdd()">+ 添加</button></div>
        ${attrRows || '<div style="font-size:12px;color:var(--text-tertiary);padding:4px 0">暂无属性条件</div>'}
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0"><span style="font-size:12px;color:var(--text-secondary)">属性组与行为组之间</span>${srSeg(f.groupLogic, 'groupLogic')}</div>
      <div class="lead-cond-group">
        <div class="lead-cond-head"><span>用户行为</span>${f.behaviorConditions.length > 1 ? `<span style="font-weight:400;color:var(--text-secondary);font-size:12px">组内</span>${srSeg(f.behaviorLogic, 'behaviorLogic')}` : ''}<button type="button" class="btn btn-sm btn-secondary" style="margin-left:auto" onclick="leadSRBehAdd()">+ 添加</button></div>
        <div class="lead-behavior-time"><span class="lead-behavior-time-label">时间范围</span><input type="date" class="lead-inp" value="${f.behaviorDayFrom||''}" onchange="leadSRBehaviorTime('behaviorDayFrom',this.value)"><span>至</span><input type="date" class="lead-inp" value="${f.behaviorToNow?'':(f.behaviorDayTo||'')}" ${f.behaviorToNow?'disabled':''} onchange="leadSRBehaviorTime('behaviorDayTo',this.value)"><label class="lead-ck"><input type="checkbox" ${f.behaviorToNow?'checked':''} onchange="leadSRBehaviorTime('behaviorToNow',this.checked)">至今</label></div>
        ${behRows || '<div style="font-size:12px;color:var(--text-tertiary);padding:4px 0">暂无行为条件</div>'}
      </div>`;
    openModal(LEAD.srEditId ? '编辑规则' : '新增规则', body, `<button class="btn btn-sm btn-secondary" onclick="leadSRReset()">重置</button><button class="btn btn-sm btn-primary" onclick="leadScoreConfirm()">确认</button>`, 720);
  }
  window.leadSRSet = function (k, v) { LEAD.srf[k] = v; };
  window.leadSRLogic = function (k, v) { LEAD.srf[k] = v; renderRuleModal(); };
  window.leadSRAttr = function (i, k, v) { LEAD.srf.attrConditions[i][k] = v; };
  window.leadSRAttrField = function (i, v) { const c = LEAD.srf.attrConditions[i]; c.field = v; c.value = attrField(v).options[0]; renderRuleModal(); };
  window.leadSRAttrAdd = function () { LEAD.srf.attrConditions.push(makeAttrCond()); renderRuleModal(); };
  window.leadSRAttrDel = function (i) { LEAD.srf.attrConditions.splice(i, 1); renderRuleModal(); };
  window.leadSRBeh = function (i, k, v) { const c = LEAD.srf.behaviorConditions[i]; c[k] = v; if (k === 'target' || k === 'sub' || k === 'siteTarget') renderRuleModal(); };
  window.leadSRBehField = function (i, v) {
    const c = LEAD.srf.behaviorConditions[i], bf = behField(v);
    c.behavior=v;c.verb='did';c.target='';c.count='';c.urlMatch='contains';c.siteTarget='政企';c.couponCategory=''; c.targetMode = bf.productTarget ? 'fa' : 'fa'; c.fa = ''; c.productGroup = ''; c.links = ['']; c.keywords = ['']; c.toNow = false;
    c.sub = bf.sub ? bf.sub[0] : (bf.opts ? bf.opts[0] : '');
    renderRuleModal();
  };
  window.leadSRBehaviorTime=function(k,v){LEAD.srf[k]=v;if(k==='behaviorToNow'&&v)LEAD.srf.behaviorDayTo='';renderRuleModal();};
  window.leadSRProductTargetMode = function (i, mode) { const c = LEAD.srf.behaviorConditions[i]; c.targetMode = mode; c.target = ''; c.fa = ''; c.productGroup = ''; renderRuleModal(); };
  window.leadSRLinkSet = function (i, li, v) { const c = LEAD.srf.behaviorConditions[i]; c.links = c.links && c.links.length ? c.links : ['']; c.links[li] = v; };
  window.leadSRLinkAdd = function (i) { const c = LEAD.srf.behaviorConditions[i]; c.links = c.links && c.links.length ? c.links : ['']; c.links.push(''); renderRuleModal(); };
  window.leadSRLinkDel = function (i, li) { const c = LEAD.srf.behaviorConditions[i]; c.links = c.links && c.links.length ? c.links : ['']; c.links.splice(li, 1); if (!c.links.length) c.links.push(''); renderRuleModal(); };
  window.leadSRKeywordsSet=function(i,value){LEAD.srf.behaviorConditions[i].keywords=[...new Set(String(value||'').split(',').map(x=>x.trim()).filter(Boolean))]};
  window.leadSRBehDate = function (i, idx, v) { const c = LEAD.srf.behaviorConditions[i]; let dr = c.dateRange ? c.dateRange.slice() : ['', '']; dr[idx] = v; c.dateRange = (dr[0] || dr[1]) ? dr : null; };
  window.leadSRBehAdd = function () { LEAD.srf.behaviorConditions.push(makeBehCond()); renderRuleModal(); };
  window.leadSRBehDel = function (i) { LEAD.srf.behaviorConditions.splice(i, 1); renderRuleModal(); };
  window.leadSRReset = function () { const kind = LEAD.srf.kind; LEAD.srf = blankRuleForm(); LEAD.srf.kind = kind; renderRuleModal(); };
  window.leadScoreConfirm = function () {
    const f = LEAD.srf;
    if(!f.name||!f.name.trim())return toast('请输入规则名称','warn');
    if(!RULE_SITES.some(s=>s.value===f.site))return toast('请选择站点','warn');
    if (f.name.length > 30) return toast('规则名称最长 30 字', 'warn');
    const score = Number(f.score), cap = Number(f.cap);
    if (!Number.isInteger(score) || score < 1) return toast('获得分值需为 ≥1 的整数', 'warn');
    if (!Number.isInteger(cap) || cap < 1) return toast('累计次数上限需为 ≥1 的整数', 'warn');
    if (f.attrConditions.length === 0 && f.behaviorConditions.length === 0) return toast('至少添加 1 条属性或行为条件', 'warn');
    if(!f.behaviorToNow&&((f.behaviorDayFrom&&!f.behaviorDayTo)||(!f.behaviorDayFrom&&f.behaviorDayTo)))return toast('开始日期和结束日期需同时填写','warn');
    if(!f.behaviorToNow&&f.behaviorDayFrom&&f.behaviorDayTo&&f.behaviorDayFrom>f.behaviorDayTo)return toast('开始日期不能晚于结束日期','warn');
    for (const c of f.behaviorConditions) {
      const bf=behField(c.behavior);c.verb='did';
      if(bf.categoryScope){if(!String(c.fa||'').trim())return toast('历史采购过品类请选择 FA','warn');if(!String(c.productGroup||'').trim())return toast('历史采购过品类请选择产品组','warn')}
      if(bf.productScope&&c.target==='是'){if(!String(c.fa||'').trim())return toast('加购/提交未支付请选择 FA','warn');if(!String(c.productGroup||'').trim())return toast('加购/提交未支付请选择产品组','warn')}
      if (bf.key === 'leaveContact' && c.target === '是') {
        c.links=[...new Set((c.links||[]).map(x=>String(x||'').trim()).filter(Boolean))];
        if (!c.links.length) return toast('留资为「是」时请至少填写 1 条链接', 'warn');
      }
      if (bf.productTarget) {
        const mode = c.targetMode || 'fa';
        if (mode === 'code') { if (!String(c.target || '').trim()) return toast('商详页浏览请填写商品编码', 'warn'); }
        else {
          if (!String(c.fa || '').trim()) return toast('商详页浏览请选择 FA', 'warn');
          if (mode === 'faProduct' && !String(c.productGroup || '').trim()) return toast('商详页浏览请选择产品组', 'warn');
        }
      } else if (bf.key === 'search') {
        if (c.sub === '搜索关键词') {
          c.keywords=[...new Set((c.keywords||[]).map(x=>String(x||'').trim()).filter(Boolean))];
          if (!c.keywords.length) return toast('请至少填写 1 个搜索关键词', 'warn');
        } else if (!String(c.target || '').trim()) return toast('搜索页面请填写 URL', 'warn');
      }else if(bf.key==='pageView'&&c.sub==='自定义页面'&&!String(c.target||'').trim())return toast('自定义页面请填写 URL','warn');
      else if(bf.key==='coupon'&&!c.couponCategory)return toast('请选择优惠券品类','warn');
      else if(bf.key==='noBrowse'&&c.siteTarget==='自定义页面'&&!String(c.target||'').trim())return toast('未浏览选择自定义页面时请填写 URL','warn');
      else if ((bf.url || bf.code) && !c.target) return toast(`行为「${bf.label}」需填写${bf.code ? '商品编码' : 'URL'}`, 'warn');
      if (bf.noCount || bf.key === 'noOpportunity') continue;
      if(bf.daysAbove){const n=Number(c.count);if(!Number.isInteger(n)||n<1)return toast(`行为「${bf.label}」请填写 N 天以上（≥1 整数）`,'warn')}else{const n=Number(c.count);if(!Number.isInteger(n)||n<1)return toast(`行为「${bf.label}」请填写次数（≥1 整数）`,'warn')}
    }
    const payload={name:f.name.trim(),site:f.site,behaviorDayFrom:f.behaviorDayFrom,behaviorDayTo:f.behaviorDayTo,behaviorToNow:f.behaviorToNow,kind: f.kind, score, cap, attrLogic: f.attrLogic, attrConditions: f.attrConditions.map(c => ({ ...c })), groupLogic: f.groupLogic, behaviorConditions: f.behaviorConditions.map(c => { const {dayFrom,dayTo,toNow,...condition}=c; return condition; }) };
    if (LEAD.srEditId) {
      const idx = LEAD.scoreRules.findIndex(r => r.id === LEAD.srEditId);
      if (idx >= 0) LEAD.scoreRules[idx] = Object.assign({}, LEAD.scoreRules[idx], payload);
      toast('规则已更新');
    } else {
      LEAD.scoreRules.unshift(Object.assign({ id: 'SR-' + Date.now(), enabled: true, createdAt: Date.now() }, payload));
      toast('规则已新增');
    }
    saveScoreRules(); leadCloseModal(); scoreRefresh();
  };

  // ── 小型 DOM helper ──
  function field(label, inner) { return `<div class="lead-field"><label>${label}</label><div class="lead-field-c">${inner}</div></div>`; }
  function selInp(id, opts, def) { return `<select class="lead-inp" id="${id}">${opts.map(o => `<option ${o === def ? 'selected' : ''}>${o}</option>`).join('')}</select>`; }
  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

  // ── 样式注入（线索专属，复用 workbench token，遵循 ai-admin-ui-design skill）──
  function injectStyle() {
    if (document.getElementById('lead-style')) return;
    const s = document.createElement('style'); s.id = 'lead-style';
    s.textContent = `
    .lead-seg{display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border-light);border-radius:8px;padding:2px;gap:2px;vertical-align:middle}
    .lead-seg-btn{height:28px;padding:0 13px;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s}
    .lead-seg-btn:hover{color:var(--text)}
    .lead-seg-btn.active{background:var(--card-bg);color:var(--primary);font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.06)}
    .lead-site-view{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);white-space:nowrap}
    .lead-behavior-time{display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:10px;border:1px solid var(--border-light);border-radius:8px;background:var(--bg)}
    .lead-behavior-time .lead-inp{width:150px;flex:none}
    .lead-behavior-time-label{font-size:13px;font-weight:600;color:var(--text);margin-right:4px}
    .lead-score-inline-list{display:flex;flex:1 1 420px;min-width:320px;flex-direction:column;align-items:stretch;gap:6px}
    .lead-score-link-row{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;width:100%}
    .lead-score-link-row .lead-inp{flex:1 1 auto;min-width:0;width:auto}
    .lead-score-link-row .lead-abtn{flex:0 0 auto;margin:0}
    .lead-score-link-add{align-self:flex-start}    .lead-filter{display:flex;align-items:center;gap:12px;padding:14px 16px;margin-bottom:14px;flex-wrap:wrap;position:relative;z-index:30;overflow:visible}
    /* 与在职员工管理筛选框统一：高36 / 圆角8 / padding 0 12 / 13px（排除复选框/单选框）*/
    .lead-filter .ops-select,.lead-filter input:not([type=checkbox]):not([type=radio]),.lead-filter select{height:36px;min-height:36px;padding:0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--card-bg);color:var(--text)}
    .lead-filter .ops-select:focus,.lead-filter input:not([type=checkbox]):not([type=radio]):focus,.lead-filter select:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light)}
    .lead-daterange{display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap;white-space:nowrap}
    .lead-dd{position:relative;display:inline-block}
    .lead-dd-menu{display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:1300;min-width:150px;background:var(--card-bg);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12);padding:5px}
    .lead-dd.open .lead-dd-menu{display:block}
    .lead-dd-item{padding:8px 12px;border-radius:6px;font-size:13px;color:var(--text);cursor:pointer;white-space:nowrap}
    .lead-dd-item:hover{background:var(--primary-light);color:var(--primary)}
    .lead-drill{cursor:pointer;color:var(--primary)}
    .lead-drill:hover{text-decoration:underline;background:var(--primary-light)}
    .lead-tab-wrap{padding:0 16px;margin-bottom:14px}
    .lead-tabs{display:flex;gap:28px;min-height:46px}
    .lead-tabs .tab-item{padding:12px 2px}
    .lead-pillgroup{display:inline-flex;gap:6px}
    .lead-pill{height:32px;padding:0 13px;border:1px solid var(--border);border-radius:8px;background:var(--card-bg);color:var(--text-secondary);font-size:13px;cursor:pointer;transition:all .15s;white-space:nowrap}
    .lead-pill:hover{border-color:var(--primary);color:var(--primary)}
    .lead-pill.active{background:var(--primary-light);border-color:var(--primary);color:var(--primary);font-weight:500}
    .lead-date{width:148px}
    .lead-ro-box{height:36px;display:inline-flex;align-items:center;padding:0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text)}
    .lead-pill-tag{font-size:12px;color:var(--text-tertiary);padding:0 8px;height:24px;line-height:24px;border-radius:var(--radius);border:1px dashed var(--border)}
    .lead-pill-tag.on{color:var(--primary);border-color:var(--primary);border-style:solid;background:var(--primary-light)}
    .lead-fl{font-size:13px;color:var(--text-secondary);white-space:nowrap}
    .lead-div{width:1px;height:18px;background:var(--border);flex-shrink:0}
    .lead-ck{font-size:13px;color:var(--text);display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap}
    .lead-ck input{accent-color:var(--primary);cursor:pointer}
    .lead-ms{position:relative;flex-shrink:0}
    .lead-ms.open{z-index:1300}
    .lead-ms-trig{height:36px;min-width:120px;max-width:180px;display:flex;align-items:center;padding:0 26px 0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--card-bg);cursor:pointer;position:relative;white-space:nowrap;overflow:hidden}
    .lead-ms-trig span{overflow:hidden;text-overflow:ellipsis}
    .lead-ms-text.ph{color:var(--text-tertiary)}
    .lead-ms-trig::after{content:"▾";position:absolute;right:9px;color:var(--text-tertiary)}
    .lead-ms.open .lead-ms-trig{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light)}
    .lead-ms-panel{display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:1000;min-width:100%;width:max-content;max-height:240px;overflow:auto;background:var(--card-bg);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12);padding:5px}
    .lead-ms.open .lead-ms-panel{display:block}
    .lead-ms-opt{display:flex;align-items:center;gap:8px;height:32px;padding:0 10px;border-radius:6px;font-size:13px;color:var(--text);cursor:pointer;white-space:nowrap}
    .lead-ms-opt:hover{background:var(--bg)}
    .lead-ms-opt input{accent-color:var(--primary)}
    /* 顶部信息卡：四色极浅渐变循环（skill） */
    .lead-stat-grid,.lead-kpi-grid{display:grid;gap:14px;margin-bottom:16px}
    .lead-stat,.lead-kpi{border-radius:12px;padding:15px 18px;box-shadow:0 1px 2px rgba(15,23,42,.035);position:relative;overflow:hidden;transition:box-shadow .2s;
      background:linear-gradient(135deg,rgba(51,112,255,.08),rgba(51,112,255,.025) 46%,var(--card-bg));border:1px solid rgba(51,112,255,.09)}
    .lead-stat:nth-child(4n+2),.lead-kpi:nth-child(4n+2){background:linear-gradient(135deg,rgba(20,184,166,.07),rgba(20,184,166,.025) 46%,var(--card-bg));border-color:rgba(20,184,166,.09)}
    .lead-stat:nth-child(4n+3),.lead-kpi:nth-child(4n+3){background:linear-gradient(135deg,rgba(99,102,241,.07),rgba(99,102,241,.025) 46%,var(--card-bg));border-color:rgba(99,102,241,.09)}
    .lead-stat:nth-child(4n+4),.lead-kpi:nth-child(4n+4){background:linear-gradient(135deg,rgba(139,92,246,.07),rgba(139,92,246,.025) 46%,var(--card-bg));border-color:rgba(139,92,246,.09)}
    .lead-stat{cursor:pointer}
    .lead-stat:hover,.lead-kpi:hover{box-shadow:0 8px 22px rgba(15,23,42,.07)}
    .lead-stat.hl{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}
    .lead-stat-label{font-size:12px;color:var(--text-secondary);margin-bottom:9px}
    .lead-stat-val{font-size:25px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums}
    .lead-kpi-label{font-size:12px;color:var(--text-secondary);margin-bottom:3px}
    .lead-kpi-code{font-size:11px;color:var(--text-tertiary);margin-bottom:8px}
    .lead-kpi-value{font-size:24px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums}
    .lead-kpi-trend{margin-top:6px;font-size:12px;display:flex;gap:10px;flex-wrap:wrap}
    .lead-trend.up{color:var(--green)}.lead-trend.down{color:var(--red)}.lead-trend.flat{color:var(--text-tertiary)}
    .lead-infobar{background:linear-gradient(135deg,rgba(51,112,255,.06),var(--card-bg));border:1px solid var(--border-light);border-radius:12px;padding:12px 18px;margin-bottom:14px;font-size:13px;color:var(--text);display:flex;gap:28px;flex-wrap:wrap;align-items:center}
    .lead-infobar strong{color:var(--primary)}
    .lead-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
    .lead-two-col{display:grid;grid-template-columns:45% 55%;gap:16px}
    .lead-badge-num{margin-left:4px;background:var(--primary);color:#fff;border-radius:8px;padding:0 5px;font-size:11px}
    /* 表格 */
    .lead-table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:13px}
    .lead-table thead th{position:sticky;top:0;z-index:2;background:var(--bg);padding:0 12px;height:40px;text-align:left;font-weight:500;color:var(--text-secondary);font-size:12px;border-bottom:1px solid var(--border)}
    .lead-table tbody td{padding:0 12px;height:44px;border-bottom:1px solid var(--border-light);color:var(--text);text-align:left;font-weight:400}
    .lead-table tbody td .badge{font-weight:400}
    /* 操作列按钮统一高度/对齐：查看详情/反馈线索/转商机 等高，均带可见边框 */
    .lead-table td .btn{height:28px;min-height:28px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;border-width:1px;border-style:solid;box-sizing:border-box}
    .lead-table td .btn-secondary{border-color:var(--border);background:var(--card-bg);color:var(--text)}
    .lead-table td .btn-secondary:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-light)}
    .lead-table td .btn-primary{border-color:var(--primary)}
    .lead-table td .btn + .btn{margin-left:6px}
    .lead-table tbody tr:hover td{background:var(--primary-light)}
    .lead-table tbody tr.sel td{background:var(--primary-light)}
    .lead-sort{cursor:pointer}.lead-sort:hover{color:var(--primary)}
    .lead-si{margin-left:4px;font-size:11px;color:var(--border)}.lead-si.on{color:var(--primary)}
    .lead-link{font-family:monospace;color:var(--primary);font-size:12px;cursor:pointer;text-decoration:underline}
    .lead-abtn{height:26px;padding:0 9px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);cursor:pointer;font-size:12px;color:var(--text-secondary);margin-right:4px;transition:all .15s}
    .lead-abtn:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-light)}
    .lead-abtn.suc{border-color:rgba(52,199,36,.4);color:var(--green)}
    .lead-abtn.dan{border-color:rgba(226,0,26,.4);color:var(--red)}
    .lead-abtn:disabled{opacity:.5;cursor:not-allowed}
    .lead-src-table{width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap}
    .lead-src-table th,.lead-src-table td{padding:9px 12px;border:1px solid var(--border-light);text-align:right}
    .lead-src-table th{background:var(--bg);font-weight:600;color:var(--text-secondary)}
    .lead-src-table th:first-child,.lead-src-table td:first-child{text-align:left;position:sticky;left:0;background:var(--card-bg)}
    .lead-src-table thead th:first-child{background:var(--bg)}
    .lead-src-table tbody tr:hover td{background:var(--primary-light)}
    .lead-src-table .lead-total td{font-weight:700;background:var(--primary-light)!important;color:var(--primary)}
    /* 弹窗表单 */
    .lead-field{margin-bottom:12px}
    .lead-field>label{display:block;font-size:13px;color:var(--text-secondary);margin-bottom:5px}
    .lead-inp{width:100%;height:34px;padding:0 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--card-bg);outline:none;font-family:inherit}
    textarea.lead-inp{height:auto;padding:8px 10px;resize:vertical}
    .lead-inp:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light)}
    .lead-inp:disabled{background:var(--bg);color:var(--text-tertiary)}
    .lead-pa-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
    .lead-beh-row .lead-inp{box-sizing:border-box}
    .lead-beh-row select.lead-inp{width:auto}
    /* 线索打分：条件构建器 + 表行置灰 */
    .lead-cond-group{border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg)}
    .lead-cond-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;font-weight:600;color:var(--text)}
    .lead-beh-row{padding:8px;border:1px dashed var(--border-light);border-radius:8px;background:var(--card-bg);margin-bottom:8px}
    .lead-beh-row:last-child{margin-bottom:0}
    .lead-score-table td{vertical-align:middle}
    .lead-row-off td{color:var(--text-tertiary)!important;background:var(--bg)}
    .lead-row-off td .badge{opacity:.85}
    .lead-desc-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border-light);border:1px solid var(--border-light);border-radius:8px;overflow:hidden}
    .lead-desc-item{display:flex;background:var(--card-bg)}
    .lead-desc-l{width:110px;flex-shrink:0;padding:9px 12px;background:var(--bg);font-size:12px;color:var(--text-secondary)}
    .lead-desc-v{flex:1;padding:9px 12px;font-size:13px;color:var(--text)}
    .lead-log{padding:10px 0;border-bottom:1px solid var(--border-light);font-size:13px}
    .lead-log-meta{font-size:12px;color:var(--text-tertiary);margin-top:3px}
    .lead-toast-box{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center}
    .lead-toast-item{padding:8px 16px;border-radius:8px;font-size:13px;color:#fff;box-shadow:0 6px 18px rgba(15,23,42,.16);animation:leadFade .2s}
    .lead-toast-item.success{background:var(--green)}.lead-toast-item.warn{background:var(--orange)}.lead-toast-item.error{background:var(--red)}
    @keyframes leadFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1}}
    .lead-drawer-mask{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:none}
    .lead-drawer-mask.show{display:block}
    .lead-drawer{position:absolute;top:0;right:0;bottom:0;background:var(--card-bg);box-shadow:-6px 0 24px rgba(15,23,42,.12);display:flex;flex-direction:column;max-width:92vw;animation:leadSlide .22s ease}
    .lead-drawer .modal-body{flex:1}
    @keyframes leadSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}
    body.ai-squeeze .lead-kpi-grid{grid-template-columns:repeat(2,1fr)!important}
    @media(max-width:1280px){.lead-two-col{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  // ── 注册渲染器 + 事件钩子 ──
  function register() {
    if (typeof PAGE_RENDERERS === 'undefined') return setTimeout(register, 50);
    PAGE_RENDERERS['lead.dashboard'] = renderDashboard;
    PAGE_RENDERERS['lead.pool'] = renderPool;
    PAGE_RENDERERS['lead.governmentPool'] = renderGovernmentPool;
    PAGE_RENDERERS['lead.score'] = renderScore;
    PAGE_RENDERERS['lead.detail'] = renderLeadDetailPage;
    injectStyle();
    document.addEventListener('page-change', e => {
      const pg = e.detail;
      if (pg === 'lead.dashboard') setTimeout(renderKbBody, 30);
      else if (pg === 'lead.pool') setTimeout(poolRefresh, 30);
      else if (pg === 'lead.governmentPool') setTimeout(governmentPoolRefresh, 30);
      else if (pg === 'lead.score') setTimeout(scoreRefresh, 30);
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', register); else register();
})();
