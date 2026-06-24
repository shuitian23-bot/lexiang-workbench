<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">线索池</div>
        <div class="page-desc">企业客户管理 · 线索分配、跟进、触达与转商机</div>
      </div>
      <div class="lead-seg">
        <button class="lead-seg-btn" :class="{ active: role === 'ops' }" @click="setRole('ops')">运营视图</button>
        <button class="lead-seg-btn" :class="{ active: role === 'leader' }" @click="setRole('leader')">Leader视图</button>
        <button class="lead-seg-btn" :class="{ active: role === 'sales' }" @click="setRole('sales')">Sales视图</button>
      </div>
    </div>

    <!-- 概览卡 -->
    <div class="lead-stat-grid" style="grid-template-columns:repeat(6,minmax(0,1fr))">
      <div class="lead-stat" :class="{ hl: sf === null }" @click="setSf(null)">
        <div class="lead-stat-label">线索总数</div>
        <div class="lead-stat-val">{{ poolBaseList.length }}</div>
      </div>
      <div class="lead-stat" :class="{ hl: sf === 'un' }" @click="setSf('un')">
        <div class="lead-stat-label">未分配</div>
        <div class="lead-stat-val">{{ poolBaseList.filter(l => dispAssign(l) === '待分配').length }}</div>
      </div>
      <div class="lead-stat" :class="{ hl: sf === 'as' }" @click="setSf('as')">
        <div class="lead-stat-label">已分配</div>
        <div class="lead-stat-val">{{ poolBaseList.filter(l => dispAssign(l) === '已分配').length }}</div>
      </div>
      <div class="lead-stat" :class="{ hl: sf === 'rc' }" @click="setSf('rc')">
        <div class="lead-stat-label">已接收</div>
        <div class="lead-stat-val">{{ poolBaseList.filter(l => l.status === '已接收').length }}</div>
      </div>
      <div class="lead-stat" :class="{ hl: sf === 'ip' }" @click="setSf('ip')">
        <div class="lead-stat-label">跟进中</div>
        <div class="lead-stat-val">{{ poolBaseList.filter(l => dispStatus(l) === '跟进中').length }}</div>
      </div>
      <div class="lead-stat" :class="{ hl: sf === 'rt' }" @click="setSf('rt')">
        <div class="lead-stat-label">已退回</div>
        <div class="lead-stat-val">{{ poolBaseList.filter(l => l.status === '已退回').length }}</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="lead-toolbar">
      <button v-if="role !== 'sales'" class="btn btn-sm btn-secondary" @click="mockImport">📥 导入线索</button>
      <button v-if="role === 'ops'" class="btn btn-sm btn-secondary" @click="openTouch(null)">触达</button>
      <button v-if="role === 'ops' || role === 'leader'" class="btn btn-sm btn-secondary" @click="openAssign">分配</button>
      <span v-if="sel.size > 0" style="font-size:13px;color:var(--primary);font-weight:500;margin-left:4px">已选 {{ sel.size }} 条</span>
      <button class="btn btn-sm btn-secondary" style="margin-left:auto" @click="exportCSV(false)">⬇ 导出（脱敏）</button>
      <button class="btn btn-sm btn-primary" @click="openExportApproval">⬇ 导出（明文）</button>
    </div>

    <!-- 筛选栏 -->
    <div class="lead-filter card">
      <!-- 创建日期 -->
      <select class="ops-select" style="width:108px" title="创建日期（快捷）" v-model="dateShortcutCreate" @change="applyDateShortcut('create')">
        <option value="">创建日期</option>
        <option v-for="s in DATE_SHORTCUTS" :key="s.k" :value="s.k">{{ s.t }}</option>
      </select>
      <input type="date" class="ops-select lead-date" title="创建日期起" v-model="fdFrom" @change="page = 1" />
      <span class="filter-separator">至</span>
      <input type="date" class="ops-select lead-date" title="创建日期止" v-model="fdTo" @change="page = 1" />
      <!-- 分配时间 -->
      <select class="ops-select" style="width:108px" title="分配时间（快捷）" v-model="dateShortcutAssign" @change="applyDateShortcut('assign')">
        <option value="">分配时间</option>
        <option v-for="s in DATE_SHORTCUTS" :key="s.k" :value="s.k">{{ s.t }}</option>
      </select>
      <input type="date" class="ops-select lead-date" title="分配时间起" v-model="fadFrom" @change="page = 1" />
      <span class="filter-separator">至</span>
      <input type="date" class="ops-select lead-date" title="分配时间止" v-model="fadTo" @change="page = 1" />
      <!-- 文本筛选 -->
      <input class="ops-select" style="width:140px" placeholder="线索编号" v-model="fLeadNo" @input="page = 1" />
      <input class="ops-select" style="width:140px" placeholder="Lenovo ID" v-model="fLenovo" @input="page = 1" />
      <input class="ops-select" style="width:140px" placeholder="手机号" v-model="fPhone" @input="page = 1" />
      <input class="ops-select" style="width:140px" placeholder="公司名称" v-model="fCompany" @input="page = 1" />
      <!-- 多选：线索状态 -->
      <div class="lead-ms" :class="{ open: msOpen === 'fs' }">
        <div class="lead-ms-trig" @click.stop="toggleMs('fs')">
          <span class="lead-ms-text" :class="{ ph: !fs.length }">{{ fs.length ? fs.map(v => STATUS_FILTER_OPTS.find(o=>o.value===v)?.label || v).join('、') : '线索状态' }}</span>
        </div>
        <div class="lead-ms-panel">
          <label class="lead-ms-opt" v-for="o in STATUS_FILTER_OPTS" :key="o.value">
            <input type="checkbox" :value="o.value" v-model="fs" @change="page = 1" />{{ o.label }}
          </label>
        </div>
      </div>
      <input class="ops-select" style="width:140px" placeholder="所属IS" v-model="fown" @input="page = 1" />
      <!-- 销售团队（仅运营） -->
      <select v-if="role === 'ops'" class="ops-select" v-model="fdTeam" @change="page = 1">
        <option value="all">销售团队（全部）</option>
        <option value="beijing">北京IS</option>
        <option value="chengdu">成都IS</option>
      </select>
      <!-- 多选：客户分级 -->
      <div class="lead-ms" :class="{ open: msOpen === 'fdGrade' }">
        <div class="lead-ms-trig" @click.stop="toggleMs('fdGrade')">
          <span class="lead-ms-text" :class="{ ph: !fdGrade.length }">{{ fdGrade.length ? fdGrade.join('、') : '客户分级' }}</span>
        </div>
        <div class="lead-ms-panel">
          <label class="lead-ms-opt" v-for="g in GRADES" :key="g">
            <input type="checkbox" :value="g" v-model="fdGrade" @change="page = 1" />{{ g }}
          </label>
        </div>
      </div>
      <!-- 多选：线索来源 -->
      <div class="lead-ms" :class="{ open: msOpen === 'fSource' }">
        <div class="lead-ms-trig" @click.stop="toggleMs('fSource')">
          <span class="lead-ms-text" :class="{ ph: !fSource.length }">{{ fSource.length ? fSource.join('、') : '线索来源' }}</span>
        </div>
        <div class="lead-ms-panel">
          <label class="lead-ms-opt" v-for="s in LEAD_SOURCES" :key="s">
            <input type="checkbox" :value="s" v-model="fSource" @change="page = 1" />{{ s }}
          </label>
        </div>
      </div>
      <button class="btn btn-sm btn-secondary" @click="resetFilter">重置</button>
    </div>

    <!-- 分配明细面板 -->
    <div v-if="sf === 'as'" class="card" style="padding:0;margin-bottom:14px">
      <div class="card-header" style="padding:13px 18px">
        <div class="card-title">分配明细</div>
        <span style="font-size:13px;color:var(--text-tertiary)">共 {{ allocList.length }} 条已分配 · 随筛选联动 · <span class="lead-link" @click="setSf('as')">收起 ✕</span></span>
      </div>
      <div style="overflow:auto">
        <table class="lead-src-table">
          <thead><tr><th style="text-align:left">ONE ID</th><th style="text-align:left">Lenovo ID</th><th style="text-align:left">线索编号</th><th style="text-align:left">姓名</th><th style="text-align:left">分配时间</th><th style="text-align:left">分配人</th><th style="text-align:left">所属IS</th></tr></thead>
          <tbody>
            <tr v-if="!allocList.length"><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:30px">暂无分配记录</td></tr>
            <tr v-for="l in allocList" :key="l.rowId">
              <td style="text-align:left">{{ l.oneId }}</td>
              <td style="text-align:left">{{ l.lenovoId || '-' }}</td>
              <td style="text-align:left">{{ l.leadNo || '-' }}</td>
              <td style="text-align:left">{{ l.name }}</td>
              <td style="text-align:left">{{ fmtDate(l.assignedAt) }}</td>
              <td style="text-align:left">{{ l.assignedBy || '-' }}</td>
              <td style="text-align:left">{{ l.owner || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 线索列表 -->
    <div class="card" style="padding:0">
      <div class="card-header" style="padding:13px 18px">
        <div class="card-title">线索列表</div>
        <span style="font-size:13px;color:var(--text-tertiary)">共 {{ poolRows.length }} 条</span>
      </div>
      <div style="overflow-x:auto">
        <table class="lead-table">
          <thead>
            <tr>
              <th style="width:40px"><input type="checkbox" :checked="allChecked" @change="toggleAll($event)" /></th>
              <th :style="'min-width:' + (isSL ? 230 : 96) + 'px;text-align:left'">操作</th>
              <th class="lead-sort" @click="sort('oneId')">ONE ID<span class="lead-si" :class="{ on: sk === 'oneId' }">{{ sk === 'oneId' ? (sd === 'asc' ? '▲' : '▼') : '↕' }}</span></th>
              <th>Lenovo ID</th>
              <th>线索编号</th>
              <th class="lead-sort" @click="sort('name')">姓名<span class="lead-si" :class="{ on: sk === 'name' }">{{ sk === 'name' ? (sd === 'asc' ? '▲' : '▼') : '↕' }}</span></th>
              <th class="lead-sort" @click="sort('company')">客户名称<span class="lead-si" :class="{ on: sk === 'company' }">{{ sk === 'company' ? (sd === 'asc' ? '▲' : '▼') : '↕' }}</span></th>
              <th>手机号</th>
              <th>客户分级</th>
              <th>线索状态</th>
              <th>分配状态</th>
              <th>线索一级来源</th>
              <th>线索二级来源</th>
              <th>Leads质量</th>
              <th>所属IS</th>
              <th class="lead-sort" @click="sort('createdAt')">创建时间<span class="lead-si" :class="{ on: sk === 'createdAt' }">{{ sk === 'createdAt' ? (sd === 'asc' ? '▲' : '▼') : '↕' }}</span></th>
              <th class="lead-sort" @click="sort('pushAt')">推送销售时间<span class="lead-si" :class="{ on: sk === 'pushAt' }">{{ sk === 'pushAt' ? (sd === 'asc' ? '▲' : '▼') : '↕' }}</span></th>
              <th class="lead-sort" @click="sort('assignedAt')">分配时间<span class="lead-si" :class="{ on: sk === 'assignedAt' }">{{ sk === 'assignedAt' ? (sd === 'asc' ? '▲' : '▼') : '↕' }}</span></th>
              <th class="lead-sort" @click="sort('feedbackAt')">反馈时间<span class="lead-si" :class="{ on: sk === 'feedbackAt' }">{{ sk === 'feedbackAt' ? (sd === 'asc' ? '▲' : '▼') : '↕' }}</span></th>
              <th class="lead-sort" @click="sort('convertedAt')">转商机时间<span class="lead-si" :class="{ on: sk === 'convertedAt' }">{{ sk === 'convertedAt' ? (sd === 'asc' ? '▲' : '▼') : '↕' }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!pagedRows.length"><td colspan="20" style="text-align:center;color:var(--text-tertiary);padding:40px">暂无数据</td></tr>
            <tr v-for="l in pagedRows" :key="l.rowId" :class="{ sel: sel.has(l.rowId) }">
              <td>
                <input type="checkbox" :checked="sel.has(l.rowId)"
                  :disabled="!!l.reassigned || (l.status === '已退回' && role !== 'ops')"
                  @change="toggleRow(l.rowId)" />
              </td>
              <td style="white-space:nowrap;text-align:left">
                <button class="btn btn-sm btn-secondary" @click.stop="showDetail(l)">查看详情</button>
                <button v-if="isSL && l.status && !isReadonly(l)" class="btn btn-sm btn-secondary" @click.stop="openFollow(l)">反馈线索</button>
                <button v-if="isSL && ['已接收','跟进中'].includes(dispStatus(l)) && !isReadonly(l)" class="btn btn-sm btn-primary" @click.stop="openConvert(l)">转商机</button>
              </td>
              <td>{{ l.oneId }}</td>
              <td>{{ l.lenovoId || '-' }}</td>
              <td>{{ l.leadNo || '-' }}</td>
              <td>{{ l.name }}</td>
              <td>{{ l.company }}</td>
              <td>{{ maskPhone(l.phone) }}</td>
              <td>{{ l.grade }}</td>
              <td>
                <span v-if="dispStatus(l) && dispStatus(l) !== '待接收'" class="badge" :class="badgeClass(dispStatus(l))">{{ dispStatus(l) }}</span>
                <span v-else style="color:var(--text-tertiary)">-</span>
              </td>
              <td>
                <span v-if="l.reassigned" class="badge">已重新分配</span>
                <span v-else-if="dispAssign(l) === '已分配'" class="badge badge-blue">已分配</span>
                <span v-else class="badge badge-orange">待分配</span>
              </td>
              <td>{{ l.source || '-' }}</td>
              <td>{{ l.source2 || '-' }}</td>
              <td>
                <span v-if="l.quality" class="badge badge-blue" style="font-size:11px">{{ l.quality }}</span>
                <span v-else>-</span>
              </td>
              <td>{{ l.owner || '-' }}</td>
              <td>{{ fmtDate(l.createdAt) }}</td>
              <td>{{ fmtDate(l.pushAt) }}</td>
              <td>{{ fmtDate(l.assignedAt) }}</td>
              <td>{{ fmtDate(l.feedbackAt) }}</td>
              <td>{{ fmtDate(l.convertedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="employee-pagination in-card">
        <div>共 <strong>{{ poolRows.length }}</strong> 条记录，当前第 <strong>{{ page }}</strong> 页，共 <strong>{{ totalPages }}</strong> 页</div>
        <div class="pagination-actions">
          <button class="btn btn-sm btn-secondary" :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
          <button class="btn btn-sm btn-secondary" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detailLead" class="emp-detail-overlay" @click.self="detailLead = null">
      <div class="emp-detail-panel">
        <div class="card-header" style="padding:16px 20px">
          <span class="card-title">线索详情</span>
          <button class="btn btn-sm btn-secondary" @click="detailLead = null">关闭</button>
        </div>
        <div style="padding:16px 20px">
          <div class="lead-desc-grid">
            <div class="lead-desc-item"><div class="lead-desc-l">ONE ID</div><div class="lead-desc-v" style="font-family:monospace;font-size:12px">{{ detailLead.oneId }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">线索编号</div><div class="lead-desc-v">{{ detailLead.leadNo || '-' }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">Lenovo ID</div><div class="lead-desc-v">{{ detailLead.lenovoId || '-' }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">姓名</div><div class="lead-desc-v">{{ detailLead.name }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">客户名称</div><div class="lead-desc-v">{{ detailLead.company }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">手机号</div><div class="lead-desc-v">{{ maskPhone(detailLead.phone) }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">客户分级</div><div class="lead-desc-v">{{ detailLead.grade }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">产品组</div><div class="lead-desc-v">{{ detailLead.product }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">线索状态</div><div class="lead-desc-v"><span class="badge" :class="badgeClass(detailLead.status)">{{ detailLead.status || '-' }}</span></div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">Leads质量</div><div class="lead-desc-v">{{ detailLead.quality || '-' }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">线索分</div><div class="lead-desc-v"><b style="color:var(--primary)">{{ detailLead.score }}</b></div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">SQL金额</div><div class="lead-desc-v">{{ detailLead.sqlAmt > 0 ? detailLead.sqlAmt.toFixed(2) + '万' : '-' }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">所属IS</div><div class="lead-desc-v">{{ detailLead.owner || '-' }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">创建时间</div><div class="lead-desc-v">{{ fmtDate(detailLead.createdAt) }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">分配时间</div><div class="lead-desc-v">{{ fmtDate(detailLead.assignedAt) }}</div></div>
            <div class="lead-desc-item"><div class="lead-desc-l">反馈时间</div><div class="lead-desc-v">{{ fmtDate(detailLead.feedbackAt) }}</div></div>
          </div>
          <div v-if="detailLead.followLogs && detailLead.followLogs.length" style="margin-top:16px">
            <div style="font-weight:600;margin-bottom:8px;color:var(--text)">跟进记录</div>
            <div v-for="(log, li) in detailLead.followLogs" :key="li" class="lead-log">
              <div>{{ log.note || '' }}</div>
              <div class="lead-log-meta">{{ log.op }} · {{ fmtDate(log.time) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分配弹窗 -->
    <div v-if="showAssign" class="emp-detail-overlay" @click.self="showAssign = false">
      <div class="emp-detail-panel" style="width:min(400px,92vw)">
        <div class="card-header" style="padding:16px 20px"><span class="card-title">分配线索</span><button class="btn btn-sm btn-secondary" @click="showAssign = false">关闭</button></div>
        <div style="padding:16px 20px">
          <div class="lead-field"><label>已选线索</label><div class="lead-field-c"><span style="color:var(--text-secondary)">{{ sel.size }} 条</span></div></div>
          <div class="lead-field">
            <label>分配给</label>
            <div class="lead-field-c">
              <select class="lead-inp" v-model="assignTarget">
                <option value="">请选择人员</option>
                <option v-for="s in assignableSPS" :key="s.itcode" :value="s.itcode">{{ s.name }}（{{ s.itcode }}）</option>
              </select>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
            <button class="btn btn-sm btn-secondary" @click="showAssign = false">取消</button>
            <button class="btn btn-sm btn-primary" @click="confirmAssign">确认分配</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 触达弹窗 -->
    <div v-if="showTouch" class="emp-detail-overlay" @click.self="showTouch = false">
      <div class="emp-detail-panel" style="width:min(440px,92vw)">
        <div class="card-header" style="padding:16px 20px"><span class="card-title">触达记录</span><button class="btn btn-sm btn-secondary" @click="showTouch = false">关闭</button></div>
        <div style="padding:16px 20px">
          <div class="lead-field"><label>触达方式</label><div class="lead-field-c"><select class="lead-inp" v-model="touchMethod"><option value="">请选择</option><option v-for="m in ['电话','邮件','短信','微信','上门拜访']" :key="m">{{ m }}</option></select></div></div>
          <div class="lead-field"><label>触达结果</label><div class="lead-field-c"><select class="lead-inp" v-model="touchResult"><option value="">请选择</option><option v-for="r in ['接通-有意向','接通-暂无意向','接通-已转介绍','未接通','空号/停机']" :key="r">{{ r }}</option></select></div></div>
          <div class="lead-field"><label>备注</label><div class="lead-field-c"><textarea class="lead-inp" rows="2" placeholder="选填" v-model="touchNote" style="height:auto;padding:8px 10px;resize:vertical"></textarea></div></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
            <button class="btn btn-sm btn-secondary" @click="showTouch = false">取消</button>
            <button class="btn btn-sm btn-primary" @click="confirmTouch">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 反馈线索弹窗 -->
    <div v-if="showFollow" class="emp-detail-overlay" @click.self="showFollow = false">
      <div class="emp-detail-panel" style="width:min(580px,92vw)">
        <div class="card-header" style="padding:16px 20px"><span class="card-title">反馈线索</span><button class="btn btn-sm btn-secondary" @click="showFollow = false">关闭</button></div>
        <div style="padding:16px 20px">
          <div class="lead-field"><label>ONE ID</label><div class="lead-field-c"><input class="lead-inp" :value="followTarget?.oneId" disabled /></div></div>
          <div class="lead-field">
            <label>Leads质量</label>
            <div class="lead-field-c">
              <select class="lead-inp" v-model="ffQuality" @change="onFFQualityChange">
                <option value="">请选择质量</option>
                <option v-for="q in QS" :key="q">{{ q }}</option>
              </select>
            </div>
          </div>
          <div class="lead-field">
            <label>线索状态</label>
            <div class="lead-field-c">
              <input class="lead-inp" style="width:220px" :value="ffStatus || '（请先选择线索质量）'" disabled />
              <span v-if="ffStatus" class="badge" :class="badgeClass(ffStatus)">{{ ffStatus }}</span>
            </div>
            <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">由线索质量自动映射，不可手动修改</div>
          </div>
          <div class="lead-field">
            <label>产品类别 / SQL金额</label>
            <div>
              <div class="lead-pa-row" v-for="(r, ri) in ffProductAmounts" :key="ri">
                <select class="lead-inp" style="flex:1" v-model="r.product"><option value="">产品类别</option><option v-for="p in FOLLOW_PRODS" :key="p">{{ p }}</option></select>
                <input class="lead-inp" type="number" placeholder="SQL金额（万元）" v-model="r.amount" style="flex:1" />
                <button class="lead-abtn dan" :disabled="ffProductAmounts.length === 1" @click="ffProductAmounts.splice(ri,1)">✕</button>
              </div>
              <button class="btn btn-sm btn-secondary" style="margin-top:6px" @click="ffProductAmounts.push({product:'',amount:''})">+ 添加产品</button>
              <div v-if="ffQuality && ffQuality.indexOf('有效-') === 0" style="font-size:12px;color:var(--red);margin-top:4px">选择有效质量时，至少填写一条产品类别和SQL金额</div>
            </div>
          </div>
          <div class="lead-field"><label>跟进记录</label><div class="lead-field-c"><textarea class="lead-inp" rows="3" placeholder="选填" v-model="ffNote" style="height:auto;padding:8px 10px;resize:vertical"></textarea></div></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
            <button class="btn btn-sm btn-secondary" @click="showFollow = false">关闭</button>
            <button class="btn btn-sm btn-primary" @click="confirmFollow">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 转商机弹窗 -->
    <div v-if="showConvert" class="emp-detail-overlay" @click.self="showConvert = false">
      <div class="emp-detail-panel" style="width:min(700px,92vw)">
        <div class="card-header" style="padding:16px 20px"><span class="card-title">转商机</span><button class="btn btn-sm btn-secondary" @click="showConvert = false">关闭</button></div>
        <div style="padding:16px 20px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="lead-field"><label>ONE ID</label><div class="lead-field-c"><input class="lead-inp" :value="convertTarget?.oneId" disabled /></div></div>
            <div class="lead-field"><label>Lenovo ID</label><div class="lead-field-c"><input class="lead-inp" :value="convertTarget?.lenovoId || '-'" disabled /></div></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="lead-field"><label>日期</label><div class="lead-field-c"><input type="date" class="lead-inp" v-model="cvtDate" /></div></div>
            <div class="lead-field"><label>产品组</label><div class="lead-field-c"><select class="lead-inp" v-model="cvtProduct"><option value="">请选择</option><option v-for="p in PRODS" :key="p">{{ p }}</option></select></div></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="lead-field"><label>型号</label><div class="lead-field-c"><input class="lead-inp" v-model="cvtModel" placeholder="请输入" /></div></div>
            <div class="lead-field"><label>商机CA</label><div class="lead-field-c"><input class="lead-inp" v-model="cvtCa" placeholder="请输入" /></div></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="lead-field"><label>商机总金额(万)</label><div class="lead-field-c"><input class="lead-inp" type="number" v-model="cvtAmount" placeholder="请输入" /></div></div>
            <div class="lead-field"><label>商机阶段</label><div class="lead-field-c"><select class="lead-inp" v-model="cvtStage"><option value="">请选择</option><option v-for="s in ['初步接触','需求确认','方案报价','谈判中','合同签署']" :key="s">{{ s }}</option></select></div></div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
            <button class="btn btn-sm btn-secondary" @click="showConvert = false">取消</button>
            <button class="btn btn-sm btn-primary" @click="confirmConvert">确认</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出审批弹窗 -->
    <div v-if="showExportApproval" class="emp-detail-overlay" @click.self="showExportApproval = false">
      <div class="emp-detail-panel" style="width:min(480px,92vw)">
        <div class="card-header" style="padding:16px 20px"><span class="card-title">明文导出审批</span><button class="btn btn-sm btn-secondary" @click="showExportApproval = false">关闭</button></div>
        <div style="padding:16px 20px">
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:8px">明文导出含<strong style="color:var(--text)">手机号等敏感信息</strong>，需提交审批，审批通过后方可下载。本次导出范围：<strong style="color:var(--primary)">{{ sel.size > 0 ? sel.size : poolRows.length }}</strong> 条线索。</div>
          <div class="lead-field"><label>审批人</label><div class="lead-field-c"><select class="lead-inp" v-model="exportApprover"><option>数据安全负责人</option><option>线索运营 Leader</option><option>合规审计</option></select></div></div>
          <div class="lead-field"><label>导出事由</label><div class="lead-field-c"><textarea class="lead-inp" rows="3" placeholder="请说明明文导出用途（必填）" v-model="exportReason" style="height:auto;padding:8px 10px;resize:vertical"></textarea></div></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
            <button class="btn btn-sm btn-secondary" @click="showExportApproval = false">取消</button>
            <button class="btn btn-sm btn-primary" @click="submitExportApproval">提交审批</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="lead-toast-box">
      <div v-for="(t, ti) in toasts" :key="ti" class="lead-toast-item" :class="t.type">{{ t.msg }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

// ── 静态字典 ──
const QSM = {
  '有效-已知销售线索': '已接收', '有效-新销售线索': '已接收', '有效-暂无商机可经营': '已接收',
  '无法经营-电话接通但拒绝沟通': '已退回', '无法经营-非相关联系人': '已退回',
  '无效-无采购权': '已退回', '无效-公司名称无法识别机构': '已退回', '无效-非本BU客户': '已退回',
  '无效-电话错误或联系人错误': '已退回', '无效-公司已经注销或破产': '已退回',
  '重复派发-2周内重复导入工单': '匹配历史线索状态', '重新分配-转正确客户负责人': '跟进中',
}
const QS = Object.keys(QSM)
const GRADES = ['B3', 'B4', 'B5']
const PRODS = ['83-TB', '84-TPP', '84-TPE', '49-YTNB', '68-YTDT']
const FOLLOW_PRODS = ['TP', 'BEY', '服务', '选件', 'DT', 'RT', '外采-PC', '外采其他']
const LEAD_SOURCES = ['官网传递', 'AI营销', '自挖掘']
const LEAD_SOURCES2 = ['企业购首页', '商品详情页', '活动落地页', '搜索', '客户经理录入', '']
const NAMES = ['张伟', '李娜', '王芳', '刘强', '陈明', '杨红', '赵磊', '周晓', '吴静', '孙鹏', '马超', '胡敏', '郑浩', '朱艳', '高峰', '林雪', '何涛', '罗琳', '徐峰', '曾丽']
const CORPS = ['联想科技', '阿里云', '腾讯云', '华为技术', '百度在线', '字节跳动', '美团点评', '滴滴出行', '京东物流', '网易游戏', '小米科技', 'OPPO', 'vivo', '中兴通讯', '三星中国', '戴尔科技', '惠普中国', '英特尔', 'AMD中国', 'IBM中国']
const SPS = [
  { itcode: 'l001', name: 'Leader张', team: 'beijing', role: 'leader' },
  { itcode: 'z001', name: '张三', team: 'beijing', role: 'sales' },
  { itcode: 'z002', name: '李四', team: 'beijing', role: 'sales' },
  { itcode: 'z003', name: '王五', team: 'chengdu', role: 'sales' },
]
const LEADER_ITCODE = 'l001'
const SALES_ITCODE = 'z001'
const OPS_ITCODE = 'yunying2'
const STS20 = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0]
const STATUS_FILTER_OPTS = [{ value: '已接收', label: '已接收' }, { value: '跟进中', label: '跟进中' }, { value: '已退回', label: '已退回' }, { value: '__none__', label: '无' }]
const DATE_SHORTCUTS = [
  { k: 'today', t: '今日', fn: () => { const d = new Date(); return [d, d] } },
  { k: 'yesterday', t: '昨日', fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); return [new Date(d), new Date(d)] } },
  { k: 'thisWeek', t: '本周', fn: () => { const n = new Date(), w = n.getDay() || 7, m = new Date(n); m.setDate(n.getDate() - w + 1); return [m, n] } },
  { k: 'lastWeek', t: '上周', fn: () => { const n = new Date(), w = n.getDay() || 7, m = new Date(n); m.setDate(n.getDate() - w - 6); const e = new Date(m); e.setDate(m.getDate() + 6); return [m, e] } },
  { k: 'thisMonth', t: '本月', fn: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n] } },
  { k: 'lastMonth', t: '上月', fn: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)] } },
  { k: 'last7', t: '近7天', fn: () => { const n = new Date(), s = new Date(); s.setDate(n.getDate() - 6); return [s, n] } },
  { k: 'last30', t: '近30天', fn: () => { const n = new Date(), s = new Date(); s.setDate(n.getDate() - 29); return [s, n] } },
]

// ── helpers ──
let _uid = 0
function uid() { return 'OID-' + String(Date.now()).slice(-5) + String(++_uid).padStart(3, '0') }
let _leadNoSeq = 100200
function genLeadNo() { return 'XS' + (++_leadNoSeq) }
let _rowSeq = 0
function genRowId() { return 'row-' + (++_rowSeq) }
function zp(n) { return String(n).padStart(2, '0') }
function fmtDate(d) {
  if (!d) return '-'
  const t = new Date(d)
  return `${t.getFullYear()}-${zp(t.getMonth() + 1)}-${zp(t.getDate())} ${zp(t.getHours())}:${zp(t.getMinutes())}`
}
function fmtDateStr(d) { return `${d.getFullYear()}-${zp(d.getMonth() + 1)}-${zp(d.getDate())}` }
function maskPhone(p) { return p ? p.slice(0, 3) + '****' + p.slice(-4) : '-' }
function badgeClass(s) {
  if (s === '待接收') return 'badge-orange'
  if (s === '已接收') return 'badge-blue'
  if (s === '跟进中') return 'badge-green'
  if (s === '已退回') return 'badge-red'
  if (s === '匹配历史线索状态') return 'badge-orange'
  if (s === '已转商机') return 'badge-purple'
  return ''
}

// ── 生成演示数据 ──
function mkLead(i) {
  const level = STS20[i % 20]
  const base = new Date(2026, 2, 1)
  const ca = new Date(base.getTime() + i * 86400000)
  const quality = level > 0 ? QS[i % QS.length] : ''
  let status = quality ? QSM[quality] : ''
  if (status === '匹配历史线索状态') status = ['已接收', '已退回', '跟进中'][i % 3]
  const salesPeople = SPS.filter(s => s.role === 'sales')
  const owner = level === 1 ? LEADER_ITCODE : level === 2 ? salesPeople[i % salesPeople.length].itcode : ''
  const leaderItcode = level >= 1 ? LEADER_ITCODE : ''
  const pushAt = level >= 1 ? new Date(ca.getTime() + 86400000) : null
  const aa = level >= 2 ? new Date(ca.getTime() + 1.5 * 86400000) : null
  const assignStatus = (level > 0 && status !== '已退回') ? '已分配' : '待分配'
  const fol = ['已接收', '跟进中', '已退回', '匹配历史线索状态'].includes(status)
  const fa = fol ? new Date(ca.getTime() + 2 * 86400000) : null
  const sqlAmt = fol ? parseFloat((20 + i * 7.3).toFixed(2)) : 0
  const leadNo = level > 0 ? 'XS' + String(100001 + i) : ''
  return {
    rowId: genRowId(), oneId: uid(), leadNo, lenovoId: i % 3 === 0 ? `LD${100000 + i * 7}` : '',
    name: NAMES[i % 20], company: CORPS[i % 20],
    phone: `138${String(10000000 + i * 1357913).slice(0, 8)}`,
    grade: GRADES[i % 3], product: PRODS[i % 5],
    status, quality, score: 10 + Math.floor(i * 4.7) % 91, sqlAmt,
    source: LEAD_SOURCES[i % LEAD_SOURCES.length], source2: LEAD_SOURCES2[i % LEAD_SOURCES2.length],
    productAmounts: fol ? [{ product: FOLLOW_PRODS[i % FOLLOW_PRODS.length], amount: parseFloat((20 + i * 7.3).toFixed(2)) }] : [],
    assignLevel: level, assignStatus, leaderItcode,
    assignedBy: level === 1 ? OPS_ITCODE : level === 2 ? LEADER_ITCODE : '',
    owner, createdAt: ca, pushAt, assignedAt: aa, feedbackAt: fa, convertedAt: null,
    scoreLogs: [], followLogs: [],
  }
}

// ── 响应式状态 ──
const leads = ref(Array.from({ length: 20 }, (_, i) => mkLead(i)))
const role = ref('ops')
const sf = ref(null)
const page = ref(1)
const sk = ref('createdAt')
const sd = ref('desc')
const sel = reactive(new Set())
const msOpen = ref(null)

// 筛选条件
const fdFrom = ref('')
const fdTo = ref('')
const fadFrom = ref('')
const fadTo = ref('')
const fLeadNo = ref('')
const fLenovo = ref('')
const fPhone = ref('')
const fCompany = ref('')
const fs = ref([])
const fown = ref('')
const fdTeam = ref('all')
const fdGrade = ref([])
const fSource = ref([])
const dateShortcutCreate = ref('')
const dateShortcutAssign = ref('')

// 弹窗
const detailLead = ref(null)
const showAssign = ref(false)
const assignTarget = ref('')
const showTouch = ref(false)
const touchLeads = ref([])
const touchMethod = ref('')
const touchResult = ref('')
const touchNote = ref('')
const showFollow = ref(false)
const followTarget = ref(null)
const ffQuality = ref('')
const ffStatus = ref('')
const ffProductAmounts = ref([{ product: '', amount: '' }])
const ffNote = ref('')
const showConvert = ref(false)
const convertTarget = ref(null)
const cvtDate = ref('')
const cvtProduct = ref('')
const cvtModel = ref('')
const cvtCa = ref('')
const cvtAmount = ref('')
const cvtStage = ref('')
const showExportApproval = ref(false)
const exportApprover = ref('数据安全负责人')
const exportReason = ref('')
const toasts = ref([])

// ── Toast ──
function toast(msg, type = 'success') {
  toasts.value.push({ msg, type })
  setTimeout(() => toasts.value.shift(), 2600)
}

// ── 角色/分配辅助 ──
const isSL = computed(() => role.value === 'sales' || role.value === 'leader')
function currentItcode() { return role.value === 'ops' ? OPS_ITCODE : role.value === 'leader' ? LEADER_ITCODE : SALES_ITCODE }
function dispStatus(l) {
  if (role.value === 'leader' && l.assignLevel === 1) return l.status === '已退回' ? '已退回' : ''
  if (!l.quality) return (l.assignStatus === '已分配' && l.assignLevel >= 2) ? '跟进中' : ''
  return l.status
}
function dispAssign(l) {
  if (l.assignStatus === '待分配') return '待分配'
  if (role.value === 'ops') return '已分配'
  if (role.value === 'leader') return l.assignLevel >= 2 ? '已分配' : '待分配'
  return '已分配'
}
function isReadonly(l) { return l.status === '已退回' || !!l.reassigned }
function canSelect(l) { return !l.reassigned && !(l.status === '已退回' && role.value !== 'ops') }
const assignableSPS = computed(() => role.value === 'ops' ? SPS.filter(s => s.role === 'leader') : SPS.filter(s => s.role === 'sales'))

// ── 筛选计算 ──
function curLeads() {
  if (role.value === 'sales') return leads.value.filter(l => l.owner === SALES_ITCODE && l.assignLevel >= 2)
  if (role.value === 'leader') return leads.value.filter(l => l.leaderItcode === LEADER_ITCODE)
  return leads.value
}
const poolBaseList = computed(() => {
  let list = [...curLeads()]
  const rangeF = (key, from, to) => {
    if (from) { const f = new Date(from); f.setHours(0, 0, 0, 0); list = list.filter(l => l[key] && new Date(l[key]) >= f) }
    if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); list = list.filter(l => l[key] && new Date(l[key]) <= t) }
  }
  rangeF('createdAt', fdFrom.value, fdTo.value)
  rangeF('assignedAt', fadFrom.value, fadTo.value)
  if (fLeadNo.value.trim()) list = list.filter(l => (l.leadNo || '').toLowerCase().includes(fLeadNo.value.trim().toLowerCase()))
  if (fLenovo.value.trim()) list = list.filter(l => (l.lenovoId || '').toLowerCase() === fLenovo.value.trim().toLowerCase())
  if (fPhone.value.trim()) list = list.filter(l => l.phone === fPhone.value.trim())
  if (fCompany.value.trim()) list = list.filter(l => (l.company || '').includes(fCompany.value.trim()))
  if (fs.value.length) list = list.filter(l => fs.value.includes(l.status) || (fs.value.includes('__none__') && !l.status))
  if (fown.value.trim()) list = list.filter(l => (l.owner || '').toLowerCase().includes(fown.value.trim().toLowerCase()))
  if (fdTeam.value && fdTeam.value !== 'all') {
    const codes = SPS.filter(s => s.team === fdTeam.value).map(s => s.itcode)
    list = list.filter(l => codes.includes(l.owner))
  }
  if (fdGrade.value.length) list = list.filter(l => fdGrade.value.includes(l.grade))
  if (fSource.value.length) list = list.filter(l => fSource.value.includes(l.source))
  return list
})
const poolRows = computed(() => {
  let list = [...poolBaseList.value]
  if (sf.value === 'as') list = list.filter(l => dispAssign(l) === '已分配')
  else if (sf.value === 'un') list = list.filter(l => dispAssign(l) === '待分配')
  else if (sf.value === 'rc') list = list.filter(l => l.status === '已接收')
  else if (sf.value === 'ip') list = list.filter(l => dispStatus(l) === '跟进中')
  else if (sf.value === 'rt') list = list.filter(l => l.status === '已退回')
  return list.sort((a, b) => {
    let av = a[sk.value], bv = b[sk.value]
    if (av instanceof Date) av = av.getTime(); if (bv instanceof Date) bv = bv.getTime()
    if (av == null) av = ''; if (bv == null) bv = ''
    return sd.value === 'asc' ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0)
  })
})
const PAGE_SIZE = 20
const totalPages = computed(() => Math.max(1, Math.ceil(poolRows.value.length / PAGE_SIZE)))
const pagedRows = computed(() => poolRows.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const allChecked = computed(() => {
  const selectable = pagedRows.value.filter(canSelect)
  return selectable.length > 0 && selectable.every(l => sel.has(l.rowId))
})
const allocList = computed(() => poolBaseList.value.filter(l => dispAssign(l) === '已分配'))

// ── 方法 ──
function setRole(r) { role.value = r; sel.clear(); page.value = 1 }
function setSf(k) { sf.value = sf.value === k && k !== null ? null : k; page.value = 1 }
function goPage(p) { page.value = Math.min(Math.max(1, p), totalPages.value) }
function sort(k) { if (sk.value === k) sd.value = sd.value === 'asc' ? 'desc' : 'asc'; else { sk.value = k; sd.value = 'asc' } }
function toggleMs(key) { msOpen.value = msOpen.value === key ? null : key }
document.addEventListener('click', () => { msOpen.value = null })
function toggleAll(e) { pagedRows.value.filter(canSelect).forEach(l => e.target.checked ? sel.add(l.rowId) : sel.delete(l.rowId)) }
function toggleRow(id) { sel.has(id) ? sel.delete(id) : sel.add(id) }

function resetFilter() {
  fdFrom.value = ''; fdTo.value = ''; fadFrom.value = ''; fadTo.value = ''
  fLeadNo.value = ''; fLenovo.value = ''; fPhone.value = ''; fCompany.value = ''
  fs.value = []; fown.value = ''; fdTeam.value = 'all'; fdGrade.value = []; fSource.value = []
  sf.value = null; page.value = 1
}
function applyDateShortcut(scope) {
  const key = scope === 'create' ? dateShortcutCreate.value : dateShortcutAssign.value
  if (!key) return
  const sc = DATE_SHORTCUTS.find(s => s.k === key); if (!sc) return
  const [f, t] = sc.fn()
  if (scope === 'create') { fdFrom.value = fmtDateStr(f); fdTo.value = fmtDateStr(t) }
  else { fadFrom.value = fmtDateStr(f); fadTo.value = fmtDateStr(t) }
  page.value = 1
}

// 新增（导入）
function mockImport() {
  const i = leads.value.length
  const l = Object.assign(mkLead(i % 20), { oneId: uid(), leadNo: '', status: '', quality: '', assignStatus: '待分配', owner: '', assignLevel: 0, pushAt: null, assignedAt: null, feedbackAt: null, productAmounts: [] })
  leads.value.unshift(l)
  toast('导入成功，已追加 1 条模拟数据')
}

// 详情
function showDetail(l) { detailLead.value = l }

// 分配
function openAssign() { if (!sel.size) return toast('请先勾选线索', 'warn'); assignTarget.value = ''; showAssign.value = true }
function confirmAssign() {
  if (!assignTarget.value) return toast('请选择销售人员', 'warn')
  const sp = assignTarget.value
  const assignee = SPS.find(s => s.itcode === sp), now = new Date()
  const isLeader = assignee && assignee.role === 'leader'
  const pathTxt = role.value === 'ops' ? '运营→Leader' : 'Leader→Sales'
  const selected = leads.value.filter(l => sel.has(l.rowId) && canSelect(l))
  let newCount = 0
  selected.forEach(l => {
    if (l.status === '已退回') {
      const oldNo = l.leadNo
      const newLead = Object.assign({}, l, {
        rowId: genRowId(), leadNo: genLeadNo(), status: '', quality: '', sqlAmt: 0, productAmounts: [],
        owner: sp, assignStatus: '已分配', assignLevel: isLeader ? 1 : 2,
        leaderItcode: isLeader ? assignee.itcode : (l.leaderItcode || ''),
        pushAt: isLeader ? now : (l.pushAt || now),
        assignedAt: isLeader ? null : now, assignedBy: currentItcode(),
        feedbackAt: null, convertedAt: null, reassigned: false,
        relatedFromLeadNo: oldNo || '', followLogs: [],
      })
      newLead.followLogs.push({ type: 'reassign', op: currentItcode(), note: `退回线索重新分配（${pathTxt}）：跟进IS ${sp}；新线索编号 ${newLead.leadNo}`, time: now })
      l.reassigned = true
      l.followLogs.push({ type: 'reassign', op: currentItcode(), note: `线索退回后由运营重新分配，生成新线索编号 ${newLead.leadNo}（本线索锁定）`, time: now })
      leads.value.unshift(newLead)
      newCount++
    } else {
      l.owner = sp
      if (role.value === 'ops') {
        if (isLeader) { l.assignLevel = 1; l.leaderItcode = assignee.itcode; l.pushAt = now }
        else { l.assignLevel = 2; l.leaderItcode = l.leaderItcode || ''; l.pushAt = l.pushAt || now; l.assignedAt = now }
        l.assignStatus = '已分配'
      } else { l.assignLevel = 2; l.assignStatus = '已分配'; l.assignedAt = now }
      l.assignedBy = currentItcode()
      if (!l.leadNo) l.leadNo = genLeadNo()
      l.followLogs.push({ type: 'assign', op: currentItcode(), note: `分配（${pathTxt}）：跟进IS ${sp}；线索编号 ${l.leadNo}`, time: now })
    }
  })
  showAssign.value = false; sel.clear()
  toast(`已分配给 ${assignee ? assignee.name : sp}${newCount ? `（${newCount} 条退回线索已生成新线索）` : ''}`)
}

// 触达
function openTouch(id) {
  const targets = id ? [leads.value.find(l => l.rowId === id)] : leads.value.filter(l => sel.has(l.rowId))
  if (!targets.length || targets.some(t => !t)) return toast('请先勾选线索', 'warn')
  touchLeads.value = targets; touchMethod.value = ''; touchResult.value = ''; touchNote.value = ''
  showTouch.value = true
}
function confirmTouch() {
  if (!touchMethod.value) return toast('请选择触达方式', 'warn')
  const content = `触达：方式=${touchMethod.value}，结果=${touchResult.value || '—'}，备注=${touchNote.value || '—'}`
  const now = new Date()
  touchLeads.value.forEach(l => l.followLogs.push({ type: 'touch', op: currentItcode(), note: content, time: now }))
  showTouch.value = false; sel.clear()
  toast(`触达记录已保存，共 ${touchLeads.value.length} 条线索`)
}

// 反馈
function openFollow(l) {
  followTarget.value = l
  ffQuality.value = l.quality || ''
  ffStatus.value = l.quality ? (QSM[l.quality] || '') : ''
  ffProductAmounts.value = (l.productAmounts && l.productAmounts.length) ? l.productAmounts.map(r => ({ ...r })) : [{ product: '', amount: '' }]
  ffNote.value = ''
  showFollow.value = true
}
function onFFQualityChange() {
  ffStatus.value = ffQuality.value ? (QSM[ffQuality.value] || '') : ''
}
function confirmFollow() {
  if (!ffQuality.value) return toast('请选择线索质量', 'warn')
  if (ffQuality.value.indexOf('有效-') === 0) {
    const ok = ffProductAmounts.value.some(r => r.product && String(r.amount).trim() !== '')
    if (!ok) return toast('选择有效质量时，至少填写一条产品类别和SQL金额', 'warn')
  }
  const l = followTarget.value, now = new Date(), prev = l.status
  l.quality = ffQuality.value
  let mapped = QSM[ffQuality.value] || l.status
  if (mapped === '匹配历史线索状态') mapped = (prev && ['已接收', '已退回', '跟进中'].includes(prev)) ? prev : '跟进中'
  l.status = mapped
  if (!l.feedbackAt) l.feedbackAt = now
  if (l.status === '已退回') l.assignStatus = '待分配'
  const valid = ffProductAmounts.value.filter(r => r.product && String(r.amount).trim() !== '')
  if (valid.length) { l.productAmounts = valid.map(r => ({ product: r.product, amount: parseFloat(r.amount) || 0 })); l.sqlAmt = l.productAmounts.reduce((s, r) => s + r.amount, 0) }
  l.followLogs.push({ type: 'feedback', op: currentItcode(), note: `反馈线索：Leads质量=${ffQuality.value}；线索状态 ${prev || '-'} → ${l.status}${ffNote.value ? '；备注：' + ffNote.value : ''}`, time: now, sc: l.status })
  showFollow.value = false; sel.clear()
  toast('跟进记录已保存')
}

// 转商机
function openConvert(l) {
  convertTarget.value = l
  const today = new Date()
  cvtDate.value = fmtDateStr(today); cvtProduct.value = l.product || ''; cvtModel.value = ''; cvtCa.value = ''; cvtAmount.value = ''; cvtStage.value = ''
  showConvert.value = true
}
function confirmConvert() {
  if (!cvtDate.value) return toast('请选择日期', 'warn')
  if (!cvtProduct.value) return toast('请选择产品组', 'warn')
  if (!cvtCa.value) return toast('请输入商机CA', 'warn')
  if (!cvtAmount.value) return toast('请输入商机金额', 'warn')
  if (!cvtStage.value) return toast('请选择商机阶段', 'warn')
  const l = convertTarget.value, now = new Date()
  l.convertedAt = now
  if (cvtAmount.value) l.sqlAmt = parseFloat(cvtAmount.value) || l.sqlAmt
  if (cvtProduct.value) l.product = cvtProduct.value
  l.followLogs.push({ type: 'convert', op: currentItcode(), note: `转商机：产品组=${cvtProduct.value}，商机CA=${cvtCa.value}，金额=${cvtAmount.value}万，阶段=${cvtStage.value}`, time: now })
  showConvert.value = false; sel.clear()
  toast('已转商机，商机系统同步创建记录')
}

// 导出
function exportCSV(plain) {
  const list = sel.size > 0 ? leads.value.filter(l => sel.has(l.rowId)) : poolRows.value
  if (!list.length) { toast('暂无可导出数据', 'warn'); return }
  const headers = ['ONE ID', '线索编号', 'Lenovo ID', '姓名', '客户名称', '手机号', '客户分级', '线索状态', 'Leads质量', '所属IS', '创建时间']
  const escc = v => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const rows = [headers.join(','), ...list.map(l => [l.oneId, l.leadNo || '', l.lenovoId || '', l.name, l.company, plain ? l.phone : maskPhone(l.phone), l.grade, l.status, l.quality || '', l.owner || '', fmtDate(l.createdAt)].map(escc).join(','))]
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `线索列表${plain ? '_明文' : '_脱敏'}.csv`; a.click(); URL.revokeObjectURL(a.href)
  toast(`${plain ? '明文' : '脱敏'}导出成功，共 ${list.length} 条`)
}
function openExportApproval() {
  const n = sel.size > 0 ? sel.size : poolRows.value.length
  if (!n) return toast('暂无可导出数据', 'warn')
  exportReason.value = ''; showExportApproval.value = true
}
function submitExportApproval() {
  if (!exportReason.value) return toast('请填写导出事由', 'warn')
  showExportApproval.value = false
  toast('明文导出申请已提交审批')
  setTimeout(() => exportCSV(true), 1200)
}
</script>

<style scoped>
.lead-seg { display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border-light);border-radius:8px;padding:2px;gap:2px;vertical-align:middle }
.lead-seg-btn { height:28px;padding:0 13px;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s }
.lead-seg-btn:hover { color:var(--text) }
.lead-seg-btn.active { background:var(--card-bg);color:var(--primary);font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.06) }
.lead-stat-grid { display:grid;gap:14px;margin-bottom:16px }
.lead-stat { border-radius:12px;padding:15px 18px;box-shadow:0 1px 2px rgba(15,23,42,.035);cursor:pointer;transition:box-shadow .2s;background:linear-gradient(135deg,rgba(51,112,255,.08),rgba(51,112,255,.025) 46%,var(--card-bg));border:1px solid rgba(51,112,255,.09) }
.lead-stat:nth-child(4n+2) { background:linear-gradient(135deg,rgba(20,184,166,.07),rgba(20,184,166,.025) 46%,var(--card-bg));border-color:rgba(20,184,166,.09) }
.lead-stat:nth-child(4n+3) { background:linear-gradient(135deg,rgba(99,102,241,.07),rgba(99,102,241,.025) 46%,var(--card-bg));border-color:rgba(99,102,241,.09) }
.lead-stat:nth-child(4n+4) { background:linear-gradient(135deg,rgba(139,92,246,.07),rgba(139,92,246,.025) 46%,var(--card-bg));border-color:rgba(139,92,246,.09) }
.lead-stat:hover,.lead-stat.hl { box-shadow:0 8px 22px rgba(15,23,42,.07) }
.lead-stat.hl { border-color:var(--primary);box-shadow:0 0 0 1px var(--primary) }
.lead-stat-label { font-size:12px;color:var(--text-secondary);margin-bottom:9px }
.lead-stat-val { font-size:25px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums }
.lead-toolbar { display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap }
.lead-filter { display:flex;align-items:center;gap:12px;padding:14px 16px;margin-bottom:14px;flex-wrap:wrap;position:relative;z-index:30;overflow:visible }
.lead-filter .ops-select,.lead-filter input:not([type=checkbox]):not([type=radio]),.lead-filter select { height:36px;min-height:36px;padding:0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--card-bg);color:var(--text) }
.lead-date { width:148px }
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
.lead-table { width:100%;border-collapse:collapse;white-space:nowrap;font-size:13px }
.lead-table thead th { position:sticky;top:0;z-index:2;background:var(--bg);padding:0 12px;height:40px;text-align:left;font-weight:500;color:var(--text-secondary);font-size:12px;border-bottom:1px solid var(--border) }
.lead-table tbody td { padding:0 12px;height:44px;border-bottom:1px solid var(--border-light);color:var(--text);text-align:left;font-weight:400 }
.lead-table tbody tr:hover td,.lead-table tbody tr.sel td { background:var(--primary-light) }
.lead-table td .btn { height:28px;min-height:28px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;border-width:1px;border-style:solid;box-sizing:border-box }
.lead-table td .btn-secondary { border-color:var(--border);background:var(--card-bg);color:var(--text) }
.lead-table td .btn-secondary:hover { border-color:var(--primary);color:var(--primary);background:var(--primary-light) }
.lead-table td .btn-primary { border-color:var(--primary) }
.lead-table td .btn + .btn { margin-left:6px }
.lead-sort { cursor:pointer }
.lead-sort:hover { color:var(--primary) }
.lead-si { margin-left:4px;font-size:11px;color:var(--border) }
.lead-si.on { color:var(--primary) }
.lead-src-table { width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap }
.lead-src-table th,.lead-src-table td { padding:9px 12px;border:1px solid var(--border-light);text-align:right }
.lead-src-table th { background:var(--bg);font-weight:600;color:var(--text-secondary) }
.lead-src-table th:first-child,.lead-src-table td:first-child { text-align:left }
.lead-src-table tbody tr:hover td { background:var(--primary-light) }
.lead-link { color:var(--primary);cursor:pointer;text-decoration:underline;font-size:12px }
.lead-desc-grid { display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border-light);border:1px solid var(--border-light);border-radius:8px;overflow:hidden }
.lead-desc-item { display:flex;background:var(--card-bg) }
.lead-desc-l { width:110px;flex-shrink:0;padding:9px 12px;background:var(--bg);font-size:12px;color:var(--text-secondary) }
.lead-desc-v { flex:1;padding:9px 12px;font-size:13px;color:var(--text) }
.lead-log { padding:10px 0;border-bottom:1px solid var(--border-light);font-size:13px }
.lead-log-meta { font-size:12px;color:var(--text-tertiary);margin-top:3px }
.lead-field { margin-bottom:12px }
.lead-field > label { display:block;font-size:13px;color:var(--text-secondary);margin-bottom:5px }
.lead-field-c { display:flex;align-items:center;gap:8px;flex-wrap:wrap }
.lead-inp { width:100%;height:34px;padding:0 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--card-bg);outline:none;font-family:inherit }
.lead-inp:focus { border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light) }
.lead-inp:disabled { background:var(--bg);color:var(--text-tertiary) }
.lead-pa-row { display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap }
.lead-abtn { height:26px;padding:0 9px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);cursor:pointer;font-size:12px;color:var(--text-secondary);margin-right:4px;transition:all .15s }
.lead-abtn.dan { border-color:rgba(226,0,26,.4);color:var(--red) }
.lead-abtn:disabled { opacity:.5;cursor:not-allowed }
.lead-toast-box { position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center }
.lead-toast-item { padding:8px 16px;border-radius:8px;font-size:13px;color:#fff;box-shadow:0 6px 18px rgba(15,23,42,.16);animation:leadFade .2s }
.lead-toast-item.success { background:var(--green) }
.lead-toast-item.warn { background:var(--orange) }
.lead-toast-item.error { background:var(--red) }
@keyframes leadFade { from{opacity:0;transform:translateY(-6px)} to{opacity:1} }
.emp-detail-overlay { position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center }
.emp-detail-panel { background:var(--bg-primary,#fff);border-radius:10px;width:min(640px,92vw);max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.18) }
.employee-pagination { display:flex;align-items:center;justify-content:space-between;padding:12px 18px;font-size:13px;color:var(--text-secondary) }
.employee-pagination.in-card { border-top:1px solid var(--border-light) }
.pagination-actions { display:flex;gap:8px }
</style>
