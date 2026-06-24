<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">打分模型</div>
        <div class="page-desc">企业客户管理 · 线索打分规则配置（加分 / 减分规则；停用规则不计入满分）</div>
      </div>
      <!-- 角色切换（仅展示，非 ops 则隐藏操作） -->
      <div class="lead-seg">
        <button class="lead-seg-btn" :class="{ active: role === 'ops' }" @click="role = 'ops'">运营视图</button>
        <button class="lead-seg-btn" :class="{ active: role === 'leader' }" @click="role = 'leader'">Leader视图</button>
        <button class="lead-seg-btn" :class="{ active: role === 'sales' }" @click="role = 'sales'">Sales视图</button>
      </div>
    </div>

    <!-- 仅运营可见 -->
    <template v-if="role !== 'ops'">
      <div class="empty-state">
        <div class="title">仅运营可查看与操作</div>
        <div>打分模型配置权限仅对运营开放。</div>
      </div>
    </template>

    <template v-else>
      <!-- 概览卡 -->
      <div class="lead-stat-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div class="lead-stat" style="cursor:default">
          <div class="lead-stat-label">满分</div>
          <div class="lead-stat-val">1000</div>
        </div>
        <div class="lead-stat" style="cursor:default">
          <div class="lead-stat-label">启用加分项满分</div>
          <div class="lead-stat-val">+{{ addMax }}</div>
        </div>
        <div class="lead-stat" style="cursor:default">
          <div class="lead-stat-label">启用减分项满分</div>
          <div class="lead-stat-val">{{ subMax ? '-' + subMax : '0' }}</div>
        </div>
        <div class="lead-stat" style="cursor:default">
          <div class="lead-stat-label">启用规则 / 总规则</div>
          <div class="lead-stat-val">{{ enabledCount }} / {{ rules.length }}</div>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="lead-toolbar">
        <button class="btn btn-sm btn-primary" @click="openAdd">＋ 新建规则</button>
      </div>

      <!-- 加分项表格 -->
      <div class="card" style="padding:0;margin-bottom:14px">
        <div class="card-header" style="padding:13px 18px">
          <div class="card-title">加分项</div>
          <span style="font-size:13px;color:var(--text-tertiary)">共 {{ addRules.length }} 条</span>
        </div>
        <div style="overflow:auto">
          <table class="lead-src-table lead-score-table">
            <thead>
              <tr>
                <th style="text-align:left;width:64px">分类</th>
                <th style="text-align:right;width:70px">分值</th>
                <th style="text-align:left;min-width:120px">名称</th>
                <th style="text-align:right;width:110px">累计次数上限</th>
                <th style="text-align:left">条件</th>
                <th style="text-align:center;width:80px">状态</th>
                <th style="text-align:center;width:130px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!addRules.length"><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:30px">暂无加分规则</td></tr>
              <tr v-for="r in addRules" :key="r.id" :class="{ 'lead-row-off': !r.enabled }">
                <td style="text-align:left">加分</td>
                <td style="text-align:right;font-weight:600" :style="r.enabled ? 'color:var(--green)' : ''">+{{ r.score }}</td>
                <td style="text-align:left">{{ r.name }}</td>
                <td style="text-align:right">{{ r.cap }}</td>
                <td style="text-align:left;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="condText(r)">{{ condText(r) }}</td>
                <td style="text-align:center"><span class="badge" :class="r.enabled ? 'badge-green' : ''">{{ r.enabled ? '启用' : '已停用' }}</span></td>
                <td style="text-align:center;white-space:nowrap">
                  <button class="lead-abtn" @click="openEdit(r)">编辑</button>
                  <button class="lead-abtn" :class="r.enabled ? 'dan' : 'suc'" @click="toggleRule(r)">{{ r.enabled ? '停用' : '启用' }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 减分项表格 -->
      <div class="card" style="padding:0;margin-bottom:14px">
        <div class="card-header" style="padding:13px 18px">
          <div class="card-title">减分项</div>
          <span style="font-size:13px;color:var(--text-tertiary)">共 {{ subRules.length }} 条</span>
        </div>
        <div style="overflow:auto">
          <table class="lead-src-table lead-score-table">
            <thead>
              <tr>
                <th style="text-align:left;width:64px">分类</th>
                <th style="text-align:right;width:70px">分值</th>
                <th style="text-align:left;min-width:120px">名称</th>
                <th style="text-align:right;width:110px">累计次数上限</th>
                <th style="text-align:left">条件</th>
                <th style="text-align:center;width:80px">状态</th>
                <th style="text-align:center;width:130px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!subRules.length"><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:30px">暂无减分规则</td></tr>
              <tr v-for="r in subRules" :key="r.id" :class="{ 'lead-row-off': !r.enabled }">
                <td style="text-align:left">减分</td>
                <td style="text-align:right;font-weight:600" :style="r.enabled ? 'color:var(--red)' : ''">-{{ r.score }}</td>
                <td style="text-align:left">{{ r.name }}</td>
                <td style="text-align:right">{{ r.cap }}</td>
                <td style="text-align:left;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="condText(r)">{{ condText(r) }}</td>
                <td style="text-align:center"><span class="badge" :class="r.enabled ? 'badge-green' : ''">{{ r.enabled ? '启用' : '已停用' }}</span></td>
                <td style="text-align:center;white-space:nowrap">
                  <button class="lead-abtn" @click="openEdit(r)">编辑</button>
                  <button class="lead-abtn" :class="r.enabled ? 'dan' : 'suc'" @click="toggleRule(r)">{{ r.enabled ? '停用' : '启用' }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 新增/编辑规则弹窗 -->
    <div v-if="showRuleModal" class="emp-detail-overlay" @click.self="showRuleModal = false">
      <div class="emp-detail-panel" style="width:min(720px,92vw)">
        <div class="card-header" style="padding:16px 20px">
          <span class="card-title">{{ editId ? '编辑规则' : '新增规则' }}</span>
          <button class="btn btn-sm btn-secondary" @click="showRuleModal = false">关闭</button>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;max-height:70vh">
          <!-- 基础字段 -->
          <div style="display:flex;gap:12px">
            <div class="lead-field" style="flex:2">
              <label>规则名称</label>
              <div class="lead-field-c"><input class="lead-inp" maxlength="30" placeholder="请输入规则名称" v-model="form.name" /></div>
            </div>
            <div class="lead-field" style="flex:1">
              <label>获得分值</label>
              <div class="lead-field-c"><input class="lead-inp" type="number" min="1" placeholder="≥1 整数" v-model="form.score" /></div>
            </div>
            <div class="lead-field" style="flex:1">
              <label>累计次数上限</label>
              <div class="lead-field-c"><input class="lead-inp" type="number" min="1" placeholder="≥1 整数" v-model="form.cap" /></div>
            </div>
          </div>
          <div class="lead-field">
            <label>规则类型</label>
            <div class="lead-field-c">
              <label class="lead-ck" style="margin-right:16px"><input type="radio" name="sr-kind" v-model="form.kind" value="add" />加分规则</label>
              <label class="lead-ck"><input type="radio" name="sr-kind" v-model="form.kind" value="sub" />减分规则</label>
            </div>
          </div>
          <!-- 用户属性 -->
          <div class="lead-cond-group" style="margin-bottom:12px">
            <div class="lead-cond-head">
              <span>用户属性</span>
              <template v-if="form.attrConditions.length > 1">
                <span style="font-weight:400;color:var(--text-secondary);font-size:12px">组内</span>
                <div class="lead-seg" style="margin-left:4px">
                  <button type="button" class="lead-seg-btn" :class="{ active: form.attrLogic === 'and' }" @click="form.attrLogic = 'and'">且</button>
                  <button type="button" class="lead-seg-btn" :class="{ active: form.attrLogic === 'or' }" @click="form.attrLogic = 'or'">或</button>
                </div>
              </template>
              <button type="button" class="btn btn-sm btn-secondary" style="margin-left:auto" @click="addAttrCond">+ 添加</button>
            </div>
            <div v-if="!form.attrConditions.length" style="font-size:12px;color:var(--text-tertiary);padding:4px 0">暂无属性条件</div>
            <div v-for="(c, i) in form.attrConditions" :key="i" class="lead-pa-row">
              <select class="lead-inp" style="flex:1.4" v-model="c.field" @change="onAttrFieldChange(i)">
                <option v-for="a in ATTR_FIELDS" :key="a.key" :value="a.key">{{ a.label }}</option>
              </select>
              <select class="lead-inp" style="flex:.8" v-model="c.op">
                <option value="eq">等于</option>
                <option value="ne">不等于</option>
              </select>
              <select class="lead-inp" style="flex:1.2" v-model="c.value">
                <option v-for="v in getAttrOptions(c.field)" :key="v">{{ v }}</option>
              </select>
              <button class="lead-abtn dan" :disabled="form.attrConditions.length === 1 && form.behaviorConditions.length === 0" @click="form.attrConditions.splice(i, 1)">×</button>
            </div>
          </div>
          <!-- 组间关系 -->
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0">
            <span style="font-size:12px;color:var(--text-secondary)">属性组与行为组之间</span>
            <div class="lead-seg">
              <button type="button" class="lead-seg-btn" :class="{ active: form.groupLogic === 'and' }" @click="form.groupLogic = 'and'">且</button>
              <button type="button" class="lead-seg-btn" :class="{ active: form.groupLogic === 'or' }" @click="form.groupLogic = 'or'">或</button>
            </div>
          </div>
          <!-- 用户行为 -->
          <div class="lead-cond-group">
            <div class="lead-cond-head">
              <span>用户行为</span>
              <template v-if="form.behaviorConditions.length > 1">
                <span style="font-weight:400;color:var(--text-secondary);font-size:12px">组内</span>
                <div class="lead-seg" style="margin-left:4px">
                  <button type="button" class="lead-seg-btn" :class="{ active: form.behaviorLogic === 'and' }" @click="form.behaviorLogic = 'and'">且</button>
                  <button type="button" class="lead-seg-btn" :class="{ active: form.behaviorLogic === 'or' }" @click="form.behaviorLogic = 'or'">或</button>
                </div>
              </template>
              <button type="button" class="btn btn-sm btn-secondary" style="margin-left:auto" @click="addBehCond">+ 添加</button>
            </div>
            <div v-if="!form.behaviorConditions.length" style="font-size:12px;color:var(--text-tertiary);padding:4px 0">暂无行为条件</div>
            <div v-for="(c, i) in form.behaviorConditions" :key="i" class="lead-beh-row">
              <div class="lead-pa-row">
                <input type="date" class="lead-inp" style="width:140px;flex:none" v-model="c.dayFrom" />
                <span style="color:var(--text-tertiary);font-size:12px">至</span>
                <input type="date" class="lead-inp" style="width:140px;flex:none" v-model="c.dayTo" />
                <select class="lead-inp" style="width:96px;flex:none" v-model="c.verb">
                  <option value="did">做过</option>
                  <option value="not">未做过</option>
                </select>
                <select class="lead-inp" style="min-width:170px" v-model="c.behavior" @change="onBehFieldChange(i)">
                  <option v-for="b in BEHAVIOR_FIELDS" :key="b.key" :value="b.key">{{ b.label }}</option>
                </select>
                <!-- 子选项 -->
                <template v-if="getBehField(c.behavior).sub">
                  <select class="lead-inp" style="min-width:120px" v-model="c.sub">
                    <option v-for="s in getBehField(c.behavior).sub" :key="s">{{ s }}</option>
                  </select>
                </template>
                <template v-else-if="getBehField(c.behavior).noCount && getBehField(c.behavior).opts && c.verb !== 'not'">
                  <select class="lead-inp" style="min-width:120px" v-model="c.target">
                    <option value="">请选择</option>
                    <option v-for="o in getBehField(c.behavior).opts" :key="o">{{ o }}</option>
                  </select>
                </template>
                <!-- url/code 输入 -->
                <input v-if="getBehField(c.behavior).url" class="lead-inp" style="flex:1;min-width:280px" placeholder="请输入url" v-model="c.target" />
                <input v-else-if="getBehField(c.behavior).code" class="lead-inp" style="flex:1;min-width:320px" placeholder="请输入商品编码，多个用英文,隔开" v-model="c.target" />
                <button class="lead-abtn dan" :disabled="form.behaviorConditions.length === 1 && form.attrConditions.length === 0" @click="form.behaviorConditions.splice(i, 1)">×</button>
              </div>
              <!-- 计数/天数 -->
              <template v-if="needCount(c)">
                <div class="lead-pa-row" style="margin-left:0;margin-top:4px">
                  <template v-if="getBehField(c.behavior).key === 'login'">
                    <span style="font-size:13px;color:var(--text-secondary);white-space:nowrap">距离最近一次登录</span>
                    <input class="lead-inp" type="number" min="1" style="width:90px;flex:none" placeholder="N" v-model="c.count" />
                    <span style="font-size:13px;color:var(--text-secondary)">天内</span>
                  </template>
                  <template v-else-if="c.verb === 'not' && getBehField(c.behavior).key === 'pageView'">
                    <span style="font-size:13px;color:var(--text-secondary);white-space:nowrap">距离最近一次浏览</span>
                    <input class="lead-inp" type="number" min="1" style="width:90px;flex:none" placeholder="N" v-model="c.count" />
                    <span style="font-size:13px;color:var(--text-secondary)">天内</span>
                  </template>
                  <template v-else-if="getBehField(c.behavior).countMode === 'dwell' && c.verb !== 'not'">
                    <select class="lead-inp" style="width:auto;min-width:96px" v-model="c.device"><option>PC端</option><option>WAP端</option></select>
                    <span style="font-size:13px;color:var(--text-secondary)">每</span>
                    <input class="lead-inp" type="number" min="1" style="width:90px;flex:none" placeholder="N" v-model="c.count" />
                    <span style="font-size:13px;color:var(--text-secondary)">s</span>
                  </template>
                  <template v-else-if="c.verb !== 'not'">
                    <span style="font-size:13px;color:var(--text-secondary);white-space:nowrap">{{ countWord(getBehField(c.behavior)) }}</span>
                    <input class="lead-inp" type="number" min="1" style="width:90px;flex:none" placeholder="N" v-model="c.count" />
                    <span style="font-size:13px;color:var(--text-secondary)">次</span>
                  </template>
                </div>
              </template>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
            <button class="btn btn-sm btn-secondary" @click="resetForm">重置</button>
            <button class="btn btn-sm btn-primary" @click="confirmRule">确认</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

// ── 元数据 ──
const ATTR_FIELDS = [
  { key: 'isNewProspect', label: '是否为新潜客', options: ['是', '否'] },
  { key: 'ageRange', label: '年龄', options: ['24岁以下', '24-35岁', '35岁-60岁', '60岁以上'] },
  { key: 'gender', label: '性别', options: ['男性', '女性'] },
  { key: 'isKeyBuyer', label: '是否为关键采购人', options: ['是', '否'] },
  { key: 'industry', label: '行业', options: ['制造业', '服务业', '批发零售业', '建筑业', '其他'] },
  { key: 'companyType', label: '企业', options: ['国企', '民企', '外企', '事业单位', '初创公司', '专精特新'] },
  { key: 'companyScale', label: '企业规模', options: ['B3', 'B4', 'B5'] },
  { key: 'budgetCA', label: '预算（CA）', options: ['1-5台', '5-10台', '10台以上'] },
]
const BEHAVIOR_FIELDS = [
  { key: 'consultCount', label: '在线咨询次数', target: 'select', opts: ['1次', '2-3次', '4-7次', '7次以上'], noCount: true },
  { key: 'phoneDuration', label: '电话沟通时长', target: 'select', opts: ['小于30s', '大于30s'], noCount: true },
  { key: 'addCart', label: '加购', target: 'select', opts: ['是', '否'], noCount: true },
  { key: 'submitUnpaid', label: '提交未支付', target: 'select', opts: ['是', '否'], noCount: true },
  { key: 'leaveContact', label: '留资', target: 'select', opts: ['是', '否'], noCount: true },
  { key: 'signUpActivity', label: '报名参与指定活动', target: 'select', opts: ['是', '否'], noCount: true },
  { key: 'historyCategory', label: '历史采购过品类', target: 'select', opts: ['主机', '选件', '服务'], noCount: true },
  { key: 'companyRegistIncomplete', label: '企业注册未完成', target: 'select', opts: ['是'], noCount: true },
  { key: 'pageView', label: '页面浏览', sub: ['企业购', '惠采', '活动页', '留资页面', '自定义页面'], url: true, countMode: 'visit' },
  { key: 'productDetail', label: '商详页浏览', code: true, countMode: 'dwell' },
  { key: 'search', label: '搜索', sub: ['搜索页面'], url: true, countMode: 'search' },
  { key: 'touch', label: '触达', sub: ['点击短信', '点击push', '点击站内信'], countMode: 'click' },
  { key: 'coupon', label: '领取', sub: ['领取优惠券'], countMode: 'receive' },
  { key: 'login', label: '登录', countMode: 'login' },
  { key: 'noOpportunity', label: '销售经理确认无商机/无经营必要' },
]
const SR_KEY = 'clue_score_rules_v4'
const DEFAULT_RULES = [
  { name: '潜客 + 浏览商品详情', kind: 'add', score: 10, cap: 3, enabled: true, attrLogic: 'and', attrConditions: [{ field: 'isNewProspect', op: 'eq', value: '是' }], groupLogic: 'and', behaviorLogic: 'and', behaviorConditions: [{ dayFrom: '', dayTo: '', verb: 'did', behavior: 'productDetail', sub: '', target: '10001234', count: '30', device: 'PC端' }] },
  { name: '长期未登录', kind: 'sub', score: 5, cap: 1, enabled: true, attrLogic: 'and', attrConditions: [], groupLogic: 'and', behaviorLogic: 'and', behaviorConditions: [{ dayFrom: '', dayTo: '', verb: 'not', behavior: 'login', sub: '', target: '', count: '180', device: 'PC端' }] },
]

// ── 响应式状态 ──
const role = ref('ops')
const rules = ref((() => {
  const saved = JSON.parse(localStorage.getItem(SR_KEY) || 'null') || DEFAULT_RULES
  return saved.map((r, i) => Object.assign({ id: 'SR-' + (Date.now() + i) }, r))
})())
const showRuleModal = ref(false)
const editId = ref(null)
const form = reactive({ name: '', kind: 'add', score: '', cap: '', attrLogic: 'and', attrConditions: [], groupLogic: 'and', behaviorLogic: 'and', behaviorConditions: [] })

// ── 计算属性 ──
const addRules = computed(() => rules.value.filter(r => r.kind === 'add'))
const subRules = computed(() => rules.value.filter(r => r.kind === 'sub'))
const addMax = computed(() => rules.value.filter(r => r.kind === 'add' && r.enabled).reduce((s, r) => s + (+r.score) * (+r.cap), 0))
const subMax = computed(() => rules.value.filter(r => r.kind === 'sub' && r.enabled).reduce((s, r) => s + (+r.score) * (+r.cap), 0))
const enabledCount = computed(() => rules.value.filter(r => r.enabled).length)

// ── helpers ──
function getBehField(key) { return BEHAVIOR_FIELDS.find(f => f.key === key) || BEHAVIOR_FIELDS[0] }
function getAttrOptions(key) { return (ATTR_FIELDS.find(f => f.key === key) || ATTR_FIELDS[0]).options }
function countWord(bf) {
  const map = { visit: '每访问', search: '每搜索', click: '每点击', receive: '每领取' }
  return map[bf.countMode] || '每发生'
}
function needCount(c) {
  const bf = getBehField(c.behavior)
  if (bf.noCount || bf.key === 'noOpportunity') return false
  if (bf.key === 'login') return true
  if (c.verb === 'not') return bf.key === 'pageView'
  return true
}

// 条件文本
function condText(rule) {
  const opT = o => o === 'ne' ? '≠' : '='
  const parts = []
  if (rule.attrConditions && rule.attrConditions.length) {
    const ap = rule.attrConditions.map(c => {
      const af = ATTR_FIELDS.find(f => f.key === c.field) || ATTR_FIELDS[0]
      return `${af.label} ${opT(c.op)} ${c.value}`
    }).join(rule.attrLogic === 'or' ? ' 或 ' : ' 且 ')
    parts.push(`(${ap})`)
  }
  if (rule.behaviorConditions && rule.behaviorConditions.length) {
    const bp = rule.behaviorConditions.map(c => {
      const bf = getBehField(c.behavior)
      const dayT = (c.dayFrom || c.dayTo) ? `${c.dayFrom || ''}~${c.dayTo || ''} ` : ''
      const verbT = c.verb === 'not' ? '未做过 ' : '做过 '
      const subT = c.sub ? c.sub : ''
      const tg = c.target ? `"${c.target}"` : ''
      return `${dayT}${verbT}${bf.label}${subT ? '·' + subT : ''}${tg}`
    }).join(rule.behaviorLogic === 'or' ? ' 或 ' : ' 且 ')
    parts.push(`(${bp})`)
  }
  return parts.length ? parts.join(rule.groupLogic === 'or' ? ' 或 ' : ' 且 ') : '—'
}

function saveRules() { localStorage.setItem(SR_KEY, JSON.stringify(rules.value)) }

// 表单辅助
function makeAttrCond() { const f = ATTR_FIELDS[0]; return { field: f.key, op: 'eq', value: f.options[0] } }
function makeBehCond() { const b = BEHAVIOR_FIELDS[0]; return { dayFrom: '', dayTo: '', verb: 'did', behavior: b.key, sub: b.sub ? b.sub[0] : (b.opts ? b.opts[0] : ''), target: '', count: '', device: 'PC端' } }
function blankForm() { return { name: '', kind: 'add', score: '', cap: '', attrLogic: 'and', attrConditions: [makeAttrCond()], groupLogic: 'and', behaviorLogic: 'and', behaviorConditions: [makeBehCond()] } }

function openAdd() { editId.value = null; Object.assign(form, blankForm()); showRuleModal.value = true }
function openEdit(r) {
  editId.value = r.id
  const copy = JSON.parse(JSON.stringify(r))
  Object.assign(form, { name: copy.name, kind: copy.kind, score: copy.score, cap: copy.cap, attrLogic: copy.attrLogic, attrConditions: copy.attrConditions, groupLogic: copy.groupLogic, behaviorLogic: copy.behaviorLogic, behaviorConditions: copy.behaviorConditions })
  showRuleModal.value = true
}
function resetForm() { const kind = form.kind; Object.assign(form, blankForm()); form.kind = kind }
function addAttrCond() { form.attrConditions.push(makeAttrCond()) }
function addBehCond() { form.behaviorConditions.push(makeBehCond()) }
function onAttrFieldChange(i) { const c = form.attrConditions[i]; c.value = getAttrOptions(c.field)[0] || '' }
function onBehFieldChange(i) {
  const c = form.behaviorConditions[i], bf = getBehField(c.behavior)
  c.target = ''; c.count = ''; c.device = 'PC端'
  c.sub = bf.sub ? bf.sub[0] : (bf.opts ? bf.opts[0] : '')
}

function toggleRule(r) { r.enabled = !r.enabled; saveRules() }

function confirmRule() {
  if (!form.name || !form.name.trim()) return alert('请输入规则名称')
  if (form.name.length > 30) return alert('规则名称最长 30 字')
  const score = Number(form.score), cap = Number(form.cap)
  if (!Number.isInteger(score) || score < 1) return alert('获得分值需为 ≥1 的整数')
  if (!Number.isInteger(cap) || cap < 1) return alert('累计次数上限需为 ≥1 的整数')
  if (form.attrConditions.length === 0 && form.behaviorConditions.length === 0) return alert('至少添加 1 条属性或行为条件')
  for (const c of form.behaviorConditions) {
    const bf = getBehField(c.behavior)
    if ((bf.url || bf.code) && !c.target) return alert(`行为「${bf.label}」需填写${bf.code ? '商品编码' : 'URL'}`)
    if (bf.noCount || bf.key === 'noOpportunity') continue
    if (bf.key === 'login') { const n = Number(c.count); if (!Number.isInteger(n) || n < 1) return alert('登录请填写天数（≥1 整数）') }
    else if (c.verb !== 'not' && bf.countMode === 'dwell') { if (!(Number(c.count) >= 1)) return alert('请填写商详页停留时长(秒)') }
    else if (c.verb !== 'not') { const n = Number(c.count); if (!Number.isInteger(n) || n < 1) return alert(`行为「${bf.label}」请填写次数（≥1 整数）`) }
  }
  const payload = { name: form.name.trim(), kind: form.kind, score, cap, attrLogic: form.attrLogic, attrConditions: form.attrConditions.map(c => ({ ...c })), groupLogic: form.groupLogic, behaviorConditions: form.behaviorConditions.map(c => ({ ...c })), behaviorLogic: form.behaviorLogic }
  if (editId.value) {
    const idx = rules.value.findIndex(r => r.id === editId.value)
    if (idx >= 0) rules.value[idx] = Object.assign({}, rules.value[idx], payload)
  } else {
    rules.value.unshift(Object.assign({ id: 'SR-' + Date.now(), enabled: true }, payload))
  }
  saveRules(); showRuleModal.value = false
}
</script>

<style scoped>
.lead-seg { display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--border-light);border-radius:8px;padding:2px;gap:2px;vertical-align:middle }
.lead-seg-btn { height:28px;padding:0 13px;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s }
.lead-seg-btn:hover { color:var(--text) }
.lead-seg-btn.active { background:var(--card-bg);color:var(--primary);font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.06) }
.lead-stat-grid { display:grid;gap:14px;margin-bottom:16px }
.lead-stat { border-radius:12px;padding:15px 18px;box-shadow:0 1px 2px rgba(15,23,42,.035);transition:box-shadow .2s;background:linear-gradient(135deg,rgba(51,112,255,.08),rgba(51,112,255,.025) 46%,var(--card-bg));border:1px solid rgba(51,112,255,.09) }
.lead-stat:nth-child(4n+2) { background:linear-gradient(135deg,rgba(20,184,166,.07),rgba(20,184,166,.025) 46%,var(--card-bg));border-color:rgba(20,184,166,.09) }
.lead-stat:nth-child(4n+3) { background:linear-gradient(135deg,rgba(99,102,241,.07),rgba(99,102,241,.025) 46%,var(--card-bg));border-color:rgba(99,102,241,.09) }
.lead-stat:nth-child(4n+4) { background:linear-gradient(135deg,rgba(139,92,246,.07),rgba(139,92,246,.025) 46%,var(--card-bg));border-color:rgba(139,92,246,.09) }
.lead-stat-label { font-size:12px;color:var(--text-secondary);margin-bottom:9px }
.lead-stat-val { font-size:25px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums }
.lead-toolbar { display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap }
.lead-src-table { width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap }
.lead-src-table th,.lead-src-table td { padding:9px 12px;border:1px solid var(--border-light);text-align:right }
.lead-src-table th { background:var(--bg);font-weight:600;color:var(--text-secondary) }
.lead-src-table th:first-child,.lead-src-table td:first-child { text-align:left;position:sticky;left:0;background:var(--card-bg) }
.lead-src-table thead th:first-child { background:var(--bg) }
.lead-src-table tbody tr:hover td { background:var(--primary-light) }
.lead-score-table td { vertical-align:middle }
.lead-row-off td { color:var(--text-tertiary)!important;background:var(--bg) }
.lead-row-off td .badge { opacity:.85 }
.lead-abtn { height:26px;padding:0 9px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);cursor:pointer;font-size:12px;color:var(--text-secondary);margin-right:4px;transition:all .15s }
.lead-abtn:hover { border-color:var(--primary);color:var(--primary);background:var(--primary-light) }
.lead-abtn.suc { border-color:rgba(52,199,36,.4);color:var(--green) }
.lead-abtn.dan { border-color:rgba(226,0,26,.4);color:var(--red) }
.lead-abtn:disabled { opacity:.5;cursor:not-allowed }
.lead-field { margin-bottom:12px }
.lead-field > label { display:block;font-size:13px;color:var(--text-secondary);margin-bottom:5px }
.lead-field-c { display:flex;align-items:center;gap:8px;flex-wrap:wrap }
.lead-inp { width:100%;height:34px;padding:0 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--card-bg);outline:none;font-family:inherit }
.lead-inp:focus { border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light) }
.lead-pa-row { display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap }
.lead-cond-group { border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg) }
.lead-cond-head { display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;font-weight:600;color:var(--text) }
.lead-beh-row { padding:8px;border:1px dashed var(--border-light);border-radius:8px;background:var(--card-bg);margin-bottom:8px }
.lead-beh-row:last-child { margin-bottom:0 }
.lead-ck { font-size:13px;color:var(--text);display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap }
.lead-ck input { accent-color:var(--primary);cursor:pointer }
.emp-detail-overlay { position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center }
.emp-detail-panel { background:var(--bg-primary,#fff);border-radius:10px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.18) }
.empty-state { text-align:center;padding:80px 0;color:var(--text-secondary) }
.empty-state .title { font-size:16px;font-weight:600;color:var(--text);margin-bottom:8px }
</style>
