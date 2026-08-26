<template>
  <section class="video-config-page">
    <div class="page-content-flow">
      <ContentPageHeader
        title="商品视频配置"
        description="统一配置商品橱窗图视频与商详页开箱视频，提交后需手动启用才对前端生效。"
      >
        <template #actions>
          <button ref="createButton" class="primary-button" type="button" @click="openCreate">新建配置</button>
        </template>
      </ContentPageHeader>

      <div class="page-flow">
        <section class="list-workspace" aria-label="商品视频配置列表">
          <form class="video-filter-panel" @submit.prevent="applyFilters">
            <div class="filter-primary-row">
              <label><span>商品信息</span><input
                v-model="draft.keyword"
                list="product-filter-options"
                type="search"
                autocomplete="off"
                placeholder="物料编码 / 商品 Code / 产品名称"
              /><datalist
                id="product-filter-options"
              >
                <option v-for="item in productSuggestions" :key="item" :value="item" /></datalist></label>
              <label><span>商城</span><select v-model="draft.mall">
                <option value="all">全部商城</option>
                <option>联想商城</option>
                <option>Epp 聚享汇</option>
              </select></label>
              <label><span>状态</span><select v-model="draft.status">
                <option value="all">全部状态</option>
                <option value="inactive">未启用</option>
                <option value="active">已启用</option>
                <option value="stopped">已停用</option>
              </select></label>
              <div class="filter-actions">
                <button
                  class="advanced-toggle"
                  type="button"
                  :aria-expanded="advancedOpen"
                  @click="advancedOpen = !advancedOpen"
                >
                  {{ advancedOpen ? '收起筛选' : '高级筛选' }}
                </button>
                <button class="primary-button" type="submit">查询</button><button class="secondary-button" type="button" @click="resetFilters">重置</button>
              </div>
            </div>
            <div v-if="advancedOpen" class="filter-advanced-row">
              <label><span>BU Owner</span><select v-model="draft.owner">
                <option value="all">全部客服队列</option>
                <option v-for="queue in BU_OWNER_OPTIONS" :key="queue" :value="queue">
                  {{ queue }}
                </option>
              </select></label>
              <label><span>视频位置</span><select v-model="draft.position">
                <option value="all">全部位置</option>
                <option value="showcase">橱窗图视频</option>
                <option value="detail">商详页开箱视频</option>
              </select></label>
              <label><span>创建人</span><input
                v-model="draft.creator"
                list="creator-filter-options"
                autocomplete="off"
                placeholder="请输入 IT Code"
              /><datalist id="creator-filter-options">
                <option v-for="item in creatorSuggestions" :key="item" :value="item" /></datalist></label>
              <span class="advanced-state">已展开 3 个高级条件</span>
            </div>
          </form>

          <div class="list-surface">
            <div class="list-toolbar">
              <div class="list-toolbar-title">
                <h2>配置列表</h2>
                <p>当前视图 {{ filteredRows.length }} 条，支持按商品、商城和视频状态快速定位。</p>
              </div>
              <div class="list-toolbar-actions">
                <span class="toolbar-meta">我的更新时间：{{ myLastUpdatedAt }}</span>
                <span class="active-summary"><i></i>{{ activeCount }} 条已生效</span>
                <button class="secondary-button" type="button" @click="refreshList">刷新</button>
              </div>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>物料编码</th>
                    <th>商品 Code</th>
                    <th>商城</th>
                    <th>产品名称</th>
                    <th>BU Owner</th>
                    <th>视频位置</th>
                    <th>状态</th>
                    <th>操作人</th>
                    <th>操作时间</th>
                    <th class="sticky-action">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in pagedRows" :key="row.id">
                    <td class="mono">{{ row.materialCode }}</td>
                    <td class="mono">{{ row.productCode }}</td>
                    <td>{{ row.mall }}</td>
                    <td>
                      <span class="product-name">{{ row.productName }}</span><small>{{ statusAssist(row.status) }}</small>
                    </td>
                    <td>{{ row.owner }}</td>
                    <td>
                      <span
                        v-for="position in row.positions"
                        :key="position"
                        class="position-tag"
                      >{{ VIDEO_POSITION_LABELS[position] }}</span>
                    </td>
                    <td>
                      <span class="status-tag" :data-status="row.status"><i></i>{{ VIDEO_STATUS_LABELS[row.status] }}</span>
                    </td>
                    <td>
                      {{ row.operator }}<small>{{ row.operatorAccount }}</small>
                    </td>
                    <td>{{ row.operatedAt }}</td>
                    <td class="sticky-action row-actions">
                      <button type="button" @click="openEdit(row)">编辑</button><button type="button" @click="openDetail(row)">详情</button><button type="button" @click="requestStatusChange(row)">
                        {{ row.status === 'active' ? '停用' : '启用' }}
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!filteredRows.length">
                    <td colspan="10">
                      <div class="empty-state">
                        <strong>未找到匹配配置</strong><span>请调整筛选条件或重置后重试。</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <footer class="pagination">
              <span>共 {{ filteredRows.length }} 条</span>
              <div class="pagination-actions">
                <select v-model.number="pageSize" aria-label="每页条数" @change="currentPage = 1">
                  <option :value="10">10 条/页</option>
                  <option :value="20">20 条/页</option>
                  <option :value="50">50 条/页</option>
                </select>
                <button type="button" :disabled="currentPage === 1" @click="currentPage--">
                  上一页
                </button>
                <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
                <button type="button" :disabled="currentPage === totalPages" @click="currentPage++">
                  下一页
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </div>

    <div
      v-if="drawerMode"
      class="overlay"
      @click.self="closeDrawer"
      @keydown.esc="closeDrawer"
    >
      <div
        :class="['drawer', { 'config-editor-modal': drawerMode !== 'detail' }]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="drawerMode === 'detail' ? 'detail-title' : 'config-editor-title'"
      >
        <header class="drawer-header">
          <div>
            <h2 :id="drawerMode === 'detail' ? 'detail-title' : 'config-editor-title'">
              {{
                drawerMode === 'create'
                  ? '新增商品视频配置'
                  : drawerMode === 'edit'
                    ? '编辑商品视频配置'
                    : '商品视频配置详情'
              }}
            </h2>
            <p>
              {{
                drawerMode === 'detail'
                  ? '查看商品、视频、存储信息和最近操作记录。'
                  : '当前修改仅保存在弹窗草稿中，取消不会影响商品视频配置列表。'
              }}
            </p>
          </div>
          <button class="modal-close-button" type="button" aria-label="关闭" @click="closeDrawer">×</button>
        </header>

        <div v-if="drawerMode === 'detail' && selectedRow" class="drawer-body detail-body">
          <section>
            <h3>商品信息</h3>
            <dl>
              <div>
                <dt>配置编号</dt>
                <dd>{{ selectedRow.id }}</dd>
              </div>
              <div>
                <dt>物料编码</dt>
                <dd>{{ selectedRow.materialCode }}</dd>
              </div>
              <div>
                <dt>商品 Code</dt>
                <dd>{{ selectedRow.productCode }}</dd>
              </div>
              <div>
                <dt>商城</dt>
                <dd>{{ selectedRow.mall }}</dd>
              </div>
              <div>
                <dt>产品名称</dt>
                <dd>{{ selectedRow.productName }}</dd>
              </div>
              <div>
                <dt>BU Owner</dt>
                <dd>{{ selectedRow.owner }}</dd>
              </div>
              <div>
                <dt>当前状态</dt>
                <dd>{{ VIDEO_STATUS_LABELS[selectedRow.status] }}</dd>
              </div>
            </dl>
          </section>
          <section v-for="position in selectedRow.positions" :key="position">
            <h3>{{ VIDEO_POSITION_LABELS[position] }}</h3>
            <div class="upload-card detail-video-card">
              <div>
                <strong>{{ selectedRow.videoName }}</strong>
                <p>视频文件已完成配置与存储同步。</p>
              </div>
              <span class="position-tag">已配置</span>
            </div>
            <div class="sync-result">
              <b><i></i>联想校验通过 · COS 同步完成</b>
              <span>存储文件夹：{{ folderFor(position) }}</span>
              <span>ObjectKey：{{ detailObjectKeyFor(selectedRow, position) }}</span>
              <span>CDN URL：{{ detailCdnUrlFor(selectedRow, position) }}</span>
            </div>
            <div class="detail-cover-grid">
              <article
                v-for="cover in selectedRow.covers.filter((item) => item.position === position)"
                :key="cover.kind"
                class="detail-cover-card"
              >
                <div
                  class="cover-thumbnail"
                  role="img"
                  :aria-label="`${VIDEO_POSITION_LABELS[cover.position]}封面缩略示意`"
                >
                  <span aria-hidden="true">▶</span>
                  <small>封面缩略图示意</small>
                </div>
                <div>
                  <strong>{{
                    cover.kind === 'mobile'
                      ? '移动端封面'
                      : position === 'detail'
                        ? 'PC 端封面'
                        : '橱窗图封面'
                  }}</strong>
                  <span>{{ cover.name }}</span>
                  <span>{{ cover.resolution }}</span>
                  <span class="mono wrap">{{ cover.url }}</span>
                </div>
              </article>
            </div>
          </section>
          <section>
            <h3>操作记录</h3>
            <dl>
              <div>
                <dt>创建人 IT Code</dt>
                <dd>{{ selectedRow.creatorAccount }}</dd>
              </div>
              <div>
                <dt>创建时间</dt>
                <dd>{{ selectedRow.createdAt }}</dd>
              </div>
              <div>
                <dt>最后操作人</dt>
                <dd>{{ selectedRow.operator }}（{{ selectedRow.operatorAccount }}）</dd>
              </div>
              <div>
                <dt>最后操作时间</dt>
                <dd>{{ selectedRow.operatedAt }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <form
          v-else
          id="product-video-config-form"
          class="drawer-body config-form"
          @submit.prevent="submitConfig"
        >
          <section>
            <SectionHeader
              title="商品与生效范围"
              description="输入物料编码或产品名称，系统自动联想并匹配商品信息。"
            />
            <div class="form-section-body">
              <label class="field material-field">
                <span><em>*</em> 物料编码 <small>必填</small></span>
                <div class="material-search-row">
                  <input
                    ref="materialCodeInput"
                    v-model="materialQuery"
                    type="search"
                    autocomplete="off"
                    :class="{ invalid: attempted && !selectedMaterial }"
                    :aria-expanded="materialSearchPending || materialSearchSubmitted"
                    aria-controls="material-search-results"
                    placeholder="请输入物料编码 / 物料名称"
                    @input="queueMaterialSearch"
                    @keyup.enter.prevent="searchMaterials"
                  />
                  <button class="secondary-button" type="button" @click="searchMaterials">查询物料</button>
                </div>
                <small class="field-help">输入 1 个字符后自动联想；每次仅可选择一个物料。</small>
                <small v-if="attempted && !selectedMaterial" class="field-error">未找到该物料，请检查编码。</small>
              </label>

              <div
                v-if="materialSearchPending || materialSearchSubmitted"
                id="material-search-results"
                class="inline-material-results"
                aria-live="polite"
                :aria-busy="materialSearchPending"
              >
                <div class="material-result-caption">
                  <strong>检索结果</strong><span>{{ materialSearchPending ? '正在联想…' : `找到 ${materialResults.length} 个物料` }}</span>
                </div>
                <div v-if="materialSearchPending" class="inline-material-loading" role="status">正在检索匹配物料…</div>
                <div v-else-if="materialResults.length" class="material-result-table">
                  <div class="material-result-columns" aria-hidden="true"><span></span><span>物料编码</span><span>物料名称</span><span>商城</span><span>BU Owner</span></div>
                  <div class="material-result-list" role="radiogroup" aria-label="物料检索结果">
                    <label
                      v-for="item in materialResults"
                      :key="item.code"
                      class="material-result-row"
                      :class="{ selected: pickerSelection === item.code }"
                    >
                      <input v-model="pickerSelection" type="radio" :value="item.code" @change="selectMaterial(item.code)" />
                      <span class="mono">{{ item.code }}</span>
                      <strong>{{ item.name }}</strong>
                      <span>{{ item.links[0]?.[1] }}</span>
                      <span>{{ item.owner }}</span>
                    </label>
                  </div>
                </div>
                <div v-else class="inline-material-empty">未检索到匹配物料，请更换关键词。</div>
              </div>

              <div v-if="selectedMaterial" class="related-products selected-related-products" aria-live="polite">
                <div class="related-products-heading"><strong>关联商品 Code</strong><span>共 {{ selectedMaterial.links.length }} 个</span></div>
                <div class="related-products-table">
                  <table>
                    <thead><tr><th>商品 Code</th><th>商城</th><th>BU Owner</th></tr></thead>
                    <tbody>
                      <tr v-for="link in selectedMaterial.links" :key="link[0]">
                        <td class="mono">{{ link[0] }}</td><td>{{ link[1] }}</td><td>{{ selectedMaterial.owner }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section ref="positionSection">
            <SectionHeader
              title="选择视频场景（必填）"
              description="至少选择一种；支持同时配置两种视频。"
            />
            <div class="form-section-body">
              <div class="choice-grid" :class="{ invalidBlock: attempted && !form.positions.length }">
                <label><span><strong>橱窗图视频</strong><small>展示在商品主图区域，校验通过后同步至橱窗图业务目录。</small></span><input v-model="form.positions" type="checkbox" value="showcase" /></label><label><span><strong>商详页开箱视频</strong><small>作为官方种草／开箱内容，展示在商品详情页。</small></span><input v-model="form.positions" type="checkbox" value="detail" /></label>
              </div>
              <small v-if="attempted && !form.positions.length" class="field-error">请至少选择一种视频场景。</small>
              <div class="process-notice">上传与校验均在联想后台完成。校验通过后由 API 同步至腾讯后台；腾讯返回 CDN 播放 URL 后，系统自动回填。</div>
            </div>
          </section>

          <section v-for="position in form.positions" :key="position" class="media-form-section">
            <SectionHeader
              :title="`上传${VIDEO_POSITION_LABELS[position]}（必填）`"
              :description="position === 'detail' ? '展示在商详页页面介绍的第一帧，作为官方开箱／种草视频。' : '上传并校验视频及封面素材。'"
            />
            <div class="form-section-body"><div class="upload-module">
              <label class="storage-row"><span>业务目录</span><select v-model="businessDirectoryIds[position]"><option v-for="directory in BUSINESS_DIRECTORY_OPTIONS" :key="directory.id" :value="directory.id">{{ directory.label }} · {{ directory.path }}</option></select></label>
              <div class="video-upload-area">
                <strong>选择本地视频上传</strong>
                <div class="upload-rules"><span>大小 ≤ 1 GB</span><span>时长 ≤ 30 分钟</span><span>最高 1080P，禁止 4K</span></div>
                <label class="primary-button file-button">{{ uploads[position] ? '重新上传视频' : '选择并上传视频' }}<input type="file" accept="video/*" @change="handleVideoFile(position, $event)" /></label>
              </div>
              <div v-if="uploads[position]" :class="['uploaded-video-state', uploads[position]?.status]">
                <div class="uploaded-video-row">
                  <div class="uploaded-video-info"><span class="video-file-icon" aria-hidden="true">MP4</span><div><strong :title="uploads[position]?.name">{{ uploads[position]?.name }}</strong><small>{{ uploads[position]?.status === 'validating' ? '正在识别视频大小、时长和规格' : uploads[position]?.status === 'valid' ? '视频校验通过' : '视频校验失败' }}</small></div></div>
                </div>
                <div v-if="uploads[position]?.status === 'validating'" class="validation-progress" role="status">正在校验视频，请稍候…</div>
                <div v-else class="validation-metrics" aria-label="视频校验结果">
                  <div :class="{ failed: !uploads[position]?.checks.size }"><span>文件大小</span><strong>{{ uploads[position]?.checks.size ? '✓' : '×' }} {{ formatVideoSize(uploads[position]?.size || 0) }}</strong></div>
                  <div :class="{ failed: !uploads[position]?.checks.duration }"><span>视频时长</span><strong>{{ uploads[position]?.checks.duration ? '✓' : '×' }} {{ formatVideoDuration(uploads[position]?.duration || 0) }}</strong></div>
                  <div :class="{ failed: !uploads[position]?.checks.resolution }"><span>视频清晰度</span><strong>{{ uploads[position]?.checks.resolution ? '✓' : '×' }} {{ formatVideoClarity(uploads[position]) }}</strong></div>
                </div>
                <div v-if="uploads[position]?.status === 'invalid'" class="validation-error" role="alert">{{ uploads[position]?.error }}</div>
                <div v-if="uploads[position]?.status === 'valid'" class="sync-result">
                  <b><i></i>联想校验通过 · COS 同步完成</b>
                  <dl><div><dt>ObjectKey</dt><dd>{{ objectKeyFor(position) }}</dd></div><div><dt>CDN URL</dt><dd>https://media.example.lenovo.com/{{ objectKeyFor(position) }}</dd></div></dl>
                </div>
              </div>
              <div class="cover-section">
                <h4>{{ position === 'showcase' ? '橱窗图视频封面' : '商详页视频封面' }}</h4>
                <div :class="['cover-grid', { 'showcase-cover-grid': position === 'showcase' }]">
                  <div :class="['cover-upload', { 'showcase-cover-upload': position === 'showcase' }, covers[`${position}-primary`]?.status]">
                    <div class="cover-preview"><img v-if="covers[`${position}-primary`]?.preview || defaultCoverPreview(position)" :src="covers[`${position}-primary`]?.preview || defaultCoverPreview(position)" alt="" /><span v-else>默认取视频第一帧</span></div>
                    <div class="cover-copy"><strong>{{ position === 'showcase' ? '橱窗图封面' : 'PC 端封面' }}</strong><small>{{ position === 'showcase' ? '建议尺寸 800×800 · JPG/PNG · 文件 ≤ 5 MB' : '建议尺寸 1920×1080 · JPG/PNG · 文件 ≤ 5 MB' }}</small>
                      <div class="cover-actions"><label class="secondary-button file-button">上传封面<input type="file" accept="image/jpeg,image/png" @change="handleCover(position, 'primary', $event)" /></label><button v-if="covers[`${position}-primary`]" class="text-button" type="button" @click="removeCustomCover(position, 'primary')">使用默认帧</button></div>
                      <small v-if="covers[`${position}-primary`]?.error" class="field-error">{{ covers[`${position}-primary`]?.error }}</small></div>
                  </div>
                  <div v-if="position === 'detail'" :class="['cover-upload', covers['detail-mobile']?.status]">
                    <div class="cover-preview"><img v-if="covers['detail-mobile']?.preview || defaultCoverPreview(position)" :src="covers['detail-mobile']?.preview || defaultCoverPreview(position)" alt="" /><span v-else>默认取视频第一帧</span></div>
                    <div class="cover-copy"><strong>移动端封面</strong><small>建议尺寸 750×422 · JPG/PNG · 文件 ≤ 5 MB</small>
                      <div class="cover-actions"><label class="secondary-button file-button">上传封面<input type="file" accept="image/jpeg,image/png" @change="handleCover(position, 'mobile', $event)" /></label><button v-if="covers['detail-mobile']" class="text-button" type="button" @click="removeCustomCover(position, 'mobile')">使用默认帧</button></div>
                      <small v-if="covers['detail-mobile']?.error" class="field-error">{{ covers['detail-mobile']?.error }}</small></div>
                  </div>
                </div>
              </div>
            </div></div>
          </section>
        </form>
        <footer v-if="drawerMode !== 'detail'" class="drawer-footer">
          <button class="secondary-button" type="button" @click="closeDrawer">取消</button><button
            class="primary-button"
            type="submit"
            form="product-video-config-form"
            :disabled="!formReady"
          >保存配置</button>
        </footer>
      </div>
    </div>

    <div v-if="pendingStatusRow" class="overlay modal-layer" @click.self="pendingStatusRow = null">
      <div class="confirm-dialog" role="alertdialog" aria-modal="true">
        <span class="confirm-icon">!</span>
        <h2>{{ pendingStatusRow.status === 'active' ? '停用' : '启用' }}该商品视频？</h2>
        <p>
          {{
            pendingStatusRow.status === 'active'
              ? '停用后视频将立即停止前端展示，配置与审计记录保留。'
              : '启用后视频将对当前商品生效。'
          }}
        </p>
        <footer>
          <button class="secondary-button" type="button" @click="pendingStatusRow = null">
            取消</button><button class="primary-button" type="button" @click="confirmStatusChange">
            确认{{ pendingStatusRow.status === 'active' ? '停用' : '启用' }}
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content-slot/ContentPageHeader.vue'
import SectionHeader from '@/components/content-slot/SectionHeader.vue'
import {
  BU_OWNER_OPTIONS,
  MATERIAL_OPTIONS,
  VIDEO_POSITION_LABELS,
  VIDEO_STATUS_LABELS,
  listProductVideos,
  saveProductVideo,
  updateVideoStatus,
  type ProductVideoRecord,
  type VideoFilters,
  type VideoPosition
} from '@/services/productVideos'

const appStore = useAppStore()
const route = useRoute()
const router = useRouter()
const defaults: VideoFilters = {
  keyword: '',
  mall: 'all',
  status: 'all',
  owner: 'all',
  position: 'all',
  creator: ''
}
const draft = reactive<VideoFilters>({ ...defaults })
const applied = ref<VideoFilters>({ ...defaults })
const advancedOpen = ref(false)
const refreshKey = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const drawerMode = ref<'create' | 'edit' | 'detail' | null>(null)
const selectedRow = ref<ProductVideoRecord | null>(null)
const pendingStatusRow = ref<ProductVideoRecord | null>(null)
const materialQuery = ref('')
const pickerSelection = ref('')
const materialSearchSubmitted = ref(false)
const materialSearchPending = ref(false)
let materialSearchTimer: ReturnType<typeof setTimeout> | null = null
const attempted = ref(false)
type VideoValidationStatus = 'validating' | 'valid' | 'invalid'
interface VideoUploadState {
  name: string
  size: number
  duration: number
  width: number
  height: number
  status: VideoValidationStatus
  checks: { size: boolean; duration: boolean; resolution: boolean }
  error: string
  firstFrame: string
}
type CoverValidationStatus = 'validating' | 'valid' | 'invalid'
interface CoverUploadState {
  name: string
  size: number
  width: number
  height: number
  preview: string
  status: CoverValidationStatus
  checks: { format: boolean; size: boolean; dimensions: boolean }
  error: string
}
const uploads = reactive<Partial<Record<VideoPosition, VideoUploadState>>>({})
const covers = reactive<Record<string, CoverUploadState>>({})
const createButton = ref<HTMLButtonElement | null>(null)
const materialCodeInput = ref<HTMLInputElement | null>(null)
const positionSection = ref<HTMLElement | null>(null)
const form = reactive({ materialCode: '', positions: [] as VideoPosition[] })
const BUSINESS_DIRECTORY_OPTIONS = [
  { id: 'showcase', label: '橱窗图业务', path: 'consumer-1257188835/cckx' },
  { id: 'detail', label: '商详页开箱业务', path: 'consumer-1257188835/spxq/kxsp' }
] as const
type BusinessDirectoryId = (typeof BUSINESS_DIRECTORY_OPTIONS)[number]['id']
const businessDirectoryIds = reactive<Record<VideoPosition, BusinessDirectoryId>>({
  showcase: BUSINESS_DIRECTORY_OPTIONS[0].id,
  detail: BUSINESS_DIRECTORY_OPTIONS[1].id
})
const filteredRows = computed(() => {
  refreshKey.value
  return listProductVideos(applied.value)
})
const activeCount = computed(
  () => filteredRows.value.filter((row) => row.status === 'active').length
)
const allRows = computed(() => {
  refreshKey.value
  return listProductVideos(defaults)
})
const productSuggestions = computed(() => [
  ...new Set(allRows.value.flatMap((row) => [row.materialCode, row.productCode, row.productName]))
])
const creatorSuggestions = computed(() => [
  ...new Set(allRows.value.map((row) => row.creatorAccount))
])
const totalCount = computed(() => allRows.value.length)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value))
)
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})
const myLastUpdatedAt = computed(() => {
  const mine = allRows.value
    .filter((row) => row.operatorAccount === 'demo')
    .map((row) => row.operatedAt)
    .sort((a, b) => b.localeCompare(a))
  return mine[0] || '暂无操作'
})
const selectedMaterial = computed(
  () => MATERIAL_OPTIONS.find((item) => item.code === form.materialCode.trim()) || null
)
const materialResults = computed(() => {
  const q = materialQuery.value.trim().toLowerCase()
  return q
    ? MATERIAL_OPTIONS.filter(
        (item) => item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      )
    : []
})
const formReady = computed(() =>
  Boolean(
    selectedMaterial.value &&
    form.positions.length &&
    form.positions.every(
      (position) =>
        uploads[position]?.status === 'valid' &&
        (!covers[`${position}-primary`] || covers[`${position}-primary`].status === 'valid') &&
        (position !== 'detail' || !covers['detail-mobile'] || covers['detail-mobile'].status === 'valid')
    )
  )
)

onMounted(() => {
  appStore.ensureStaticTab('advertising.productVideo')
  appStore.setActiveStaticTab('advertising.productVideo')
  syncEditorFromRoute()
})
onBeforeUnmount(cancelQueuedMaterialSearch)
watch(() => route.fullPath, syncEditorFromRoute)
function applyFilters() {
  currentPage.value = 1
  applied.value = {
    ...draft,
    keyword: draft.keyword.trim(),
    owner: draft.owner.trim(),
    creator: draft.creator.trim()
  }
}
function resetFilters() {
  currentPage.value = 1
  Object.assign(draft, defaults)
  applied.value = { ...defaults }
  advancedOpen.value = false
}
function refreshList() {
  refreshKey.value++
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  appStore.notify('列表已刷新')
}
function statusAssist(status: ProductVideoRecord['status']) {
  return status === 'active'
    ? '视频已对前端生效'
    : status === 'stopped'
      ? '曾启用，当前已停止展示'
      : '配置尚未发布'
}
function resetForm() {
  cancelQueuedMaterialSearch()
  form.materialCode = ''
  form.positions = []
  materialQuery.value = ''
  pickerSelection.value = ''
  materialSearchSubmitted.value = false
  materialSearchPending.value = false
  businessDirectoryIds.showcase = BUSINESS_DIRECTORY_OPTIONS[0].id
  businessDirectoryIds.detail = BUSINESS_DIRECTORY_OPTIONS[1].id
  attempted.value = false
  Object.keys(uploads).forEach((key) => delete uploads[key as VideoPosition])
  Object.keys(covers).forEach((key) => delete covers[key])
}
function openCreate() {
  router.push({ path: '/advertising/product-videos', query: { mode: 'create' } })
}
function openEdit(row: ProductVideoRecord) {
  router.push({ path: '/advertising/product-videos', query: { mode: 'edit', id: row.id } })
}
function loadEditForm(row: ProductVideoRecord) {
  resetForm()
  selectedRow.value = row
  form.materialCode = row.materialCode
  materialQuery.value = row.materialCode
  pickerSelection.value = row.materialCode
  form.positions = [...row.positions]
  row.positions.forEach((position) => {
    uploads[position] = {
      name: row.videoName,
      size: 0,
      duration: 0,
      width: 1920,
      height: 1080,
      status: 'valid',
      checks: { size: true, duration: true, resolution: true },
      error: '',
      firstFrame: ''
    }
    covers[`${position}-primary`] = existingCoverState('已配置封面', position === 'showcase' ? 800 : 1920, position === 'showcase' ? 800 : 1080)
    if (position === 'detail') covers['detail-mobile'] = existingCoverState('已配置移动端封面', 750, 422)
  })
  drawerMode.value = 'edit'
}
function openDetail(row: ProductVideoRecord) {
  selectedRow.value = row
  drawerMode.value = 'detail'
}
function closeDrawer() {
  const shouldRestoreCreateFocus = drawerMode.value === 'create'
  if (route.query.mode === 'create' || route.query.mode === 'edit') {
    router.push('/advertising/product-videos')
  }
  drawerMode.value = null
  if (shouldRestoreCreateFocus) nextTick(() => createButton.value?.focus())
}
function syncEditorFromRoute() {
  if (route.query.mode === 'create') {
    resetForm()
    selectedRow.value = null
    drawerMode.value = 'create'
    nextTick(() => materialCodeInput.value?.focus())
    return
  }
  if (route.query.mode === 'edit') {
    const id = typeof route.query.id === 'string' ? route.query.id : ''
    const row = listProductVideos(defaults).find((item) => item.id === id)
    if (row) loadEditForm(row)
    else router.replace('/advertising/product-videos')
    return
  }
  if (drawerMode.value !== 'detail') drawerMode.value = null
}
function cancelQueuedMaterialSearch() {
  if (materialSearchTimer !== null) {
    clearTimeout(materialSearchTimer)
    materialSearchTimer = null
  }
}
function completeMaterialSearch() {
  materialQuery.value = materialQuery.value.trim()
  materialSearchPending.value = false
  materialSearchTimer = null
  if (!materialQuery.value) {
    materialSearchSubmitted.value = false
    return
  }
  pickerSelection.value = form.materialCode
  materialSearchSubmitted.value = true
}
function queueMaterialSearch() {
  cancelQueuedMaterialSearch()
  const query = materialQuery.value.trim()
  if (!query) {
    materialSearchPending.value = false
    materialSearchSubmitted.value = false
    return
  }
  materialSearchPending.value = true
  materialSearchSubmitted.value = false
  materialSearchTimer = setTimeout(completeMaterialSearch, 300)
}
function searchMaterials() {
  cancelQueuedMaterialSearch()
  completeMaterialSearch()
}
function selectMaterial(code: string) {
  pickerSelection.value = code
  form.materialCode = code
}
async function handleVideoFile(position: VideoPosition, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploads[position] = {
    name: file.name,
    size: file.size,
    duration: 0,
    width: 0,
    height: 0,
    status: 'validating',
    checks: { size: file.size <= 1024 ** 3, duration: false, resolution: false },
    error: '',
    firstFrame: ''
  }
  try {
    const metadata = await readVideoMetadata(file)
    const checks = {
      size: file.size <= 1024 ** 3,
      duration: metadata.duration <= 30 * 60,
      resolution:
        Math.max(metadata.width, metadata.height) <= 1920 &&
        Math.min(metadata.width, metadata.height) <= 1080
    }
    const fixes: string[] = []
    if (!checks.size) fixes.push('将文件压缩至 1 GB 以内')
    if (!checks.duration) fixes.push('将视频时长裁剪至 30 分钟以内')
    if (!checks.resolution) fixes.push('将视频转为最高 1080P')
    uploads[position] = {
      name: file.name,
      size: file.size,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      status: fixes.length ? 'invalid' : 'valid',
      checks,
      error: fixes.length ? `请${fixes.join('，')}后重新上传。` : '',
      firstFrame: metadata.firstFrame
    }
  } catch {
    uploads[position] = {
      name: file.name,
      size: file.size,
      duration: 0,
      width: 0,
      height: 0,
      status: 'invalid',
      checks: { size: file.size <= 1024 ** 3, duration: false, resolution: false },
      error: '无法读取视频时长和规格，请选择有效的视频文件重新上传。',
      firstFrame: ''
    }
  } finally {
    input.value = ''
  }
}
function readVideoMetadata(file: File) {
  return new Promise<{ duration: number; width: number; height: number; firstFrame: string }>((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false
    const cleanup = () => {
      video.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
    const finish = (firstFrame = '') => {
      if (settled) return
      settled = true
      const metadata = {
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
        firstFrame
      }
      cleanup()
      metadata.duration > 0 && metadata.width > 0 && metadata.height > 0
        ? resolve(metadata)
        : reject(new Error('invalid video metadata'))
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas')
          const scale = Math.min(1, 640 / video.videoWidth)
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
          finish(canvas.toDataURL('image/jpeg', 0.82))
        } catch {
          finish()
        }
      }
      video.currentTime = Math.min(0.1, video.duration / 2)
      setTimeout(() => finish(), 1200)
    }
    video.onerror = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('video metadata load failed'))
    }
    video.src = url
  })
}
function formatVideoSize(bytes: number) {
  if (!bytes) return '已配置'
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : `${(bytes / 1024 ** 2).toFixed(1)} MB`
}
function formatVideoDuration(seconds: number) {
  if (!seconds) return '待识别'
  const minutes = Math.floor(seconds / 60)
  const remain = Math.round(seconds % 60)
  return `${minutes} 分 ${remain} 秒`
}
function formatVideoClarity(upload?: VideoUploadState) {
  if (!upload?.width || !upload.height) return '待识别'
  const shortEdge = Math.min(upload.width, upload.height)
  const clarity = shortEdge >= 1080 ? '全高清' : shortEdge >= 720 ? '高清' : '标清'
  return `${clarity} · ${upload.width}×${upload.height}`
}
function existingCoverState(name: string, width: number, height: number): CoverUploadState {
  return {
    name,
    size: 0,
    width,
    height,
    preview: '',
    status: 'valid',
    checks: { format: true, size: true, dimensions: true },
    error: ''
  }
}
function coverKey(position: VideoPosition, kind: 'primary' | 'mobile') {
  return `${position}-${kind}`
}
function coverRequirements(position: VideoPosition, kind: 'primary' | 'mobile') {
  if (position === 'showcase') return { width: 800, height: 800 }
  return kind === 'mobile' ? { width: 750, height: 422 } : { width: 1920, height: 1080 }
}
async function handleCover(position: VideoPosition, kind: 'primary' | 'mobile', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const key = coverKey(position, kind)
  const formatValid = ['image/jpeg', 'image/png'].includes(file.type)
  const sizeValid = file.size <= 5 * 1024 ** 2
  covers[key] = {
    name: file.name,
    size: file.size,
    width: 0,
    height: 0,
    preview: '',
    status: 'validating',
    checks: { format: formatValid, size: sizeValid, dimensions: false },
    error: ''
  }
  try {
    const metadata = await readImageMetadata(file)
    const required = coverRequirements(position, kind)
    const dimensionsValid = metadata.width === required.width && metadata.height === required.height
    const checks = { format: formatValid, size: sizeValid, dimensions: dimensionsValid }
    const fixes: string[] = []
    if (!checks.format) fixes.push('转换为 JPG、JPEG 或 PNG 格式')
    if (!checks.size) fixes.push('将图片压缩至 5 MB 以内')
    if (!checks.dimensions) fixes.push(`调整为 ${required.width}×${required.height}`)
    covers[key] = {
      name: file.name,
      size: file.size,
      width: metadata.width,
      height: metadata.height,
      preview: metadata.preview,
      status: fixes.length ? 'invalid' : 'valid',
      checks,
      error: fixes.length ? `请${fixes.join('，')}后重新上传。` : ''
    }
  } catch {
    covers[key] = {
      name: file.name,
      size: file.size,
      width: 0,
      height: 0,
      preview: '',
      status: 'invalid',
      checks: { format: formatValid, size: sizeValid, dimensions: false },
      error: '无法读取图片尺寸，请选择有效的 JPG、JPEG 或 PNG 图片。'
    }
  } finally {
    input.value = ''
  }
}
function readImageMetadata(file: File) {
  return new Promise<{ width: number; height: number; preview: string }>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('image read failed'))
    reader.onload = () => {
      const preview = typeof reader.result === 'string' ? reader.result : ''
      const image = new Image()
      image.onerror = () => reject(new Error('image metadata load failed'))
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, preview })
      image.src = preview
    }
    reader.readAsDataURL(file)
  })
}
function removeCustomCover(position: VideoPosition, kind: 'primary' | 'mobile') {
  delete covers[coverKey(position, kind)]
}
function defaultCoverPreview(position: VideoPosition) {
  return uploads[position]?.firstFrame || ''
}
function folderFor(position: VideoPosition) {
  return BUSINESS_DIRECTORY_OPTIONS.find(
    (directory) => directory.id === businessDirectoryIds[position]
  )?.path || ''
}
function objectKeyFor(position: VideoPosition) {
  return `${folderFor(position)}/${form.materialCode}/${uploads[position]?.name || ''}`
}
function detailObjectKeyFor(row: ProductVideoRecord, position: VideoPosition) {
  return `${folderFor(position)}/${row.materialCode}/${row.videoName}`
}
function detailCdnUrlFor(row: ProductVideoRecord, position: VideoPosition) {
  return `https://media.example.lenovo.com/${detailObjectKeyFor(row, position)}`
}
async function submitConfig() {
  attempted.value = true
  if (!formReady.value) {
    if (!form.positions.length) {
      await nextTick()
      positionSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return
  }
  const material = selectedMaterial.value!
  const link = material.links[0]
  const position = form.positions[0]
  saveProductVideo({
    id: selectedRow.value?.id || `VC-260817-${String(Date.now()).slice(-3)}`,
    materialCode: material.code,
    productCode: link[0],
    mall: link[1],
    productName: material.name,
    owner: material.owner,
    positions: [...form.positions],
    status: selectedRow.value?.status || 'inactive',
    creatorAccount: selectedRow.value?.creatorAccount || 'demo',
    createdAt: selectedRow.value?.createdAt || '2026-08-18 09:30',
    operator: '当前用户',
    operatorAccount: 'demo',
    operatedAt: '2026-08-17 12:30',
    videoName: uploads[position]?.name || '',
    folder: folderFor(position),
    objectKey: objectKeyFor(position),
    cdnUrl: `https://media.example.lenovo.com/${objectKeyFor(position)}`,
    covers: form.positions.flatMap((item) => {
      const primaryName = covers[`${item}-primary`]?.name || '视频第一帧（系统默认）'
      const assets = [
        {
          position: item,
          kind: 'primary' as const,
          name: primaryName,
          resolution: item === 'showcase' ? '800×800' : '1920×1080',
          url: `https://media.example.lenovo.com/covers/${material.code}/${primaryName}`
        }
      ]
      return item === 'detail'
        ? [
            ...assets,
            {
              position: item,
              kind: 'mobile' as const,
              name: covers['detail-mobile']?.name || '视频第一帧（系统默认）',
              resolution: '750×422',
              url: `https://media.example.lenovo.com/covers/${material.code}/${covers['detail-mobile']?.name || 'video-first-frame.jpg'}`
            }
          ]
        : assets
    })
  })
  refreshKey.value++
  closeDrawer()
  appStore.notify(selectedRow.value ? '配置已更新' : '配置已创建，当前状态为“未启用”')
}
function requestStatusChange(row: ProductVideoRecord) {
  pendingStatusRow.value = row
}
function confirmStatusChange() {
  if (!pendingStatusRow.value) return
  updateVideoStatus(
    pendingStatusRow.value.id,
    pendingStatusRow.value.status === 'active' ? 'stopped' : 'active'
  )
  refreshKey.value++
  appStore.notify(
    pendingStatusRow.value.status === 'active' ? '已停用，前端将停止展示' : '已启用，视频开始生效'
  )
  pendingStatusRow.value = null
}
</script>

<style scoped>
.video-config-page {
  container-type: inline-size;
  min-width: 0;
  color: var(--color-text);
}
.video-config-page :is(h2, h3, strong, b, button, label, th, dd),
.video-config-page label > span,
.advanced-state {
  font-weight: 400 !important;
}
.confirm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: var(--color-primary);
  color: var(--color-surface);
  font-size: 12px;
  font-weight: 800;
}
.list-toolbar p,
.drawer-header span,
.config-form section > p,
.modal header p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.page-content-flow,
.page-flow,
.list-workspace {
  display: grid;
  min-width: 0;
}
.page-content-flow {
  gap: 16px;
}
.page-content-flow > * {
  margin-block: 0;
}
.page-flow {
  gap: 16px;
}
.list-workspace {
  gap: 12px;
}
.row-actions button:focus-visible {
  border-radius: var(--radius);
  outline: none;
  box-shadow: var(--focus-ring);
}
.video-filter-panel,
.list-surface,
.detail-body section {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.video-filter-panel {
  display: grid;
  gap: 12px;
  padding: 20px;
}
.filter-primary-row,
.filter-advanced-row {
  display: grid;
  gap: 12px;
  align-items: end;
}
.filter-primary-row {
  grid-template-columns: repeat(3, minmax(0, 1fr)) 220px;
}
.filter-advanced-row {
  grid-template-columns: repeat(3, minmax(0, 1fr)) 220px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-subtle);
}
.video-filter-panel label,
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.video-filter-panel label > span,
.field > span,
.cover-grid label > span {
  font-size: 13px;
  font-weight: 700;
}
.video-filter-panel input,
.video-filter-panel select,
.field input,
.modal-body > input {
  width: 100%;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0 12px;
  font-size: 13px;
  outline: none;
}
.video-filter-panel input:focus,
.video-filter-panel select:focus,
.field input:focus,
.modal-body > input:focus {
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.primary-button,
.secondary-button,
.advanced-toggle,
.pagination button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0 16px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600 !important;
  cursor: pointer;
  white-space: nowrap;
}
.primary-button {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-surface);
}
.primary-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.advanced-toggle {
  color: var(--color-text-secondary);
}
.advanced-state {
  grid-column: 1/4;
  width: max-content;
  border-radius: 9999px;
  padding: 4px 8px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}
.list-surface {
  overflow: hidden;
}
.list-toolbar,
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}
.list-toolbar {
  border-bottom: 1px solid var(--color-border-subtle);
}
.list-toolbar h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600 !important;
}
.list-toolbar > span,
.pagination {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.list-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.toolbar-meta {
  padding-right: 12px;
  border-right: 1px solid var(--color-border-subtle);
}
.active-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
}
.active-summary i {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: var(--color-success);
}
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 1260px;
  border-collapse: collapse;
}
th,
td {
  border-bottom: 1px solid var(--color-border-subtle);
  padding: 12px 16px;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}
.list-surface th {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-weight: 400 !important;
}
td {
  color: var(--color-text-secondary);
}
td .product-name,
td small {
  display: block;
}
td .product-name {
  color: var(--color-text);
  font-weight: 600 !important;
}
td small {
  margin-top: 4px;
  color: var(--color-text-tertiary);
}
.mono {
  font-family: var(--font-mono);
}
.position-tag,
.status-tag {
  display: inline-flex;
  align-items: center;
  width: max-content;
  border-radius: 9999px;
  padding: 4px 8px;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
}
.position-tag + .position-tag {
  margin-top: 4px;
}
.status-tag i,
.sync-result i {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: currentColor;
  margin-right: 8px;
}
.status-tag[data-status='active'] {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.status-tag[data-status='stopped'] {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
}
.status-tag[data-status='inactive'] {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.sticky-action {
  position: sticky;
  right: 0;
  background: var(--color-surface);
  box-shadow: var(--shadow);
}
thead .sticky-action {
  background: var(--color-bg-muted);
}
.row-actions {
  min-width: 180px;
}
.row-actions button,
.section-heading button {
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600 !important;
  cursor: pointer;
  padding: 4px;
}
.row-actions button {
  font-weight: 400;
}
.empty-state {
  display: flex;
  min-height: 140px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-text-tertiary);
}
.pagination {
  border-top: 1px solid var(--color-border-subtle);
}
.pagination div {
  display: flex;
  gap: 8px;
}
.pagination-actions {
  align-items: center;
}
.pagination-actions select {
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  padding: 0 12px;
  font-size: 13px;
}
.pagination button:disabled {
  opacity: 0.45;
}
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--color-text) 25%, transparent);
  backdrop-filter: blur(8px);
}
.drawer {
  position: relative;
  display: flex;
  width: min(960px, 100%);
  max-height: calc(100vh - 48px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}
.config-editor-modal {
  container-type: inline-size;
  width: min(1180px, 100%);
  max-height: min(820px, calc(100vh - 48px));
  border-radius: var(--radius);
}
.drawer-header,
.drawer-footer,
.modal header,
.modal footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.drawer-header h1,
.drawer-header h2,
.modal h2,
.confirm-dialog h2 {
  margin: 4px 0 0;
  font-size: 18px;
}
.drawer-header p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.drawer-header > button,
.modal header > button {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 24px;
  cursor: pointer;
}
.modal-close-button {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
}
.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}
.drawer-footer,
.modal footer {
  justify-content: flex-end;
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 0;
}
.config-form {
  display: grid;
  gap: 24px;
}
.config-form section {
  display: grid;
  gap: 16px;
  padding: 0 0 20px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.form-section-body {
  min-width: 0;
}
.config-form section:last-of-type {
  padding-bottom: 0;
  border-bottom: 0;
}
.detail-body section {
  padding: 16px;
}
.config-form h3,
.detail-body h3 {
  margin: 0 0 12px;
  font-size: 16px;
}
.config-form em {
  color: var(--color-danger);
  font-style: normal;
}
.config-editor-modal .drawer-header {
  flex: 0 0 auto;
  align-items: flex-start;
  padding: 20px 24px 16px;
}
.config-editor-modal .drawer-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700 !important;
  line-height: 1.4;
}
.config-editor-modal .drawer-header p {
  margin-top: 4px;
  font-size: 12px;
}
.config-editor-modal .drawer-body {
  padding: 20px 24px;
  background: var(--color-bg-muted);
}
.config-editor-modal .config-form section {
  padding: 20px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.config-editor-modal .drawer-footer {
  flex: 0 0 auto;
  padding: 12px 24px;
  background: var(--color-surface);
  box-shadow: 0 -4px 12px color-mix(in srgb, var(--color-text) 4%, transparent);
}
.config-editor-modal .media-form-section {
  grid-column: 1 / -1;
}
@container (min-width: 1040px) {
  .config-editor-modal .config-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
.material-field > span:first-child {
  display: flex;
  align-items: center;
  gap: 4px;
}
.material-field > span:first-child small {
  color: var(--color-danger);
}
.material-search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
.material-search-row button {
  white-space: nowrap;
}
.material-search-row input {
  width: 100%;
  min-width: 0;
  height: 36px;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0 12px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
}
.material-search-row input::placeholder {
  color: var(--color-text-tertiary);
}
.material-search-row input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--focus-ring);
}
.field-help {
  color: var(--color-text-secondary) !important;
  line-height: 1.5;
}
.field small,
.form-error {
  color: var(--color-danger);
  font-size: 12px;
}
.field input.invalid,
.invalidBlock {
  border-color: var(--color-danger) !important;
}
.inline-material-results {
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.material-result-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.material-result-caption {
  padding: 8px 12px;
  background: var(--color-bg-muted);
}
.material-result-caption strong,
.material-result-row strong,
.related-products-heading strong,
.related-products-table th {
  font-weight: 600 !important;
}
.material-result-caption span {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.material-result-list {
  max-height: 176px;
  overflow: auto;
}
.material-result-columns,
.material-result-row {
  display: grid;
  grid-template-columns: 16px 104px minmax(120px, 1fr) 88px 112px;
  align-items: center;
  gap: 8px;
  min-width: 520px;
}
.material-result-columns {
  padding: 8px 12px;
  border-top: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
  font-size: 12px;
}
.material-result-row {
  padding: 12px;
  border-top: 1px solid var(--color-border-subtle);
  cursor: pointer;
}
.material-result-row:hover,
.material-result-row.selected {
  background: var(--color-primary-subtle);
}
.material-result-row > span,
.material-result-row > strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.material-result-row > strong {
  white-space: normal;
  line-height: 1.4;
}
.material-result-row > span:nth-last-child(-n + 2) {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.inline-material-loading,
.inline-material-empty {
  padding: 24px 12px;
  color: var(--color-text-tertiary);
  text-align: center;
  font-size: 12px;
}
.related-products {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-subtle);
}
.selected-related-products {
  margin-top: 16px;
}
.related-products-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.related-products-heading span {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.related-products-table {
  margin-top: 8px;
  overflow: auto;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.related-products-table table {
  width: 100%;
  min-width: 420px;
  border-collapse: collapse;
}
.related-products-table th,
.related-products-table td {
  padding: 8px 12px;
  text-align: left;
}
.related-products-table th {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 12px;
}
.related-products-table td {
  border-top: 1px solid var(--color-border-subtle);
  font-size: 13px;
}
.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  padding: 4px;
}
.choice-grid label,
.material-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 12px;
  cursor: pointer;
}
.choice-grid label:has(input:checked) {
  border-color: var(--color-primary-border);
  background: var(--color-primary-subtle);
}
.choice-grid input {
  order: 2;
  flex: 0 0 auto;
  margin: 4px 0 0 auto;
}
.choice-grid label > span {
  min-width: 0;
  flex: 1;
}
.choice-grid span,
.choice-grid small {
  display: block;
}
.choice-grid small {
  margin-top: 4px;
  color: var(--color-text-tertiary);
  line-height: 1.5;
}
.process-notice {
  margin-top: 12px;
  border-radius: var(--radius);
  padding: 12px;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  font-size: 12px;
  line-height: 1.6;
}
.upload-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
  padding: 16px;
}
.upload-card p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.file-button {
  position: relative;
  overflow: hidden;
}
.file-button input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.sync-result {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  border-radius: var(--radius);
  background: var(--color-success-subtle);
  padding: 12px;
  color: var(--color-success);
  font-size: 12px;
}
.sync-result b {
  display: flex;
  align-items: center;
}
.sync-result span {
  overflow-wrap: anywhere;
}
.sync-result dl {
  display: grid;
  gap: 8px;
  margin: 0;
}
.sync-result dl div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
}
.sync-result dt {
  color: color-mix(in srgb, var(--color-success) 72%, var(--color-text-secondary));
}
.sync-result dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}
.upload-module {
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.storage-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-muted);
}
.storage-row select {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0 32px 0 12px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
}
.storage-row select:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--focus-ring);
}
.video-upload-area {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 20px 16px;
  text-align: center;
}
.video-upload-area p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.uploaded-video-state {
  overflow: hidden;
  margin: 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.uploaded-video-state.invalid {
  border-color: var(--color-danger);
}
.uploaded-video-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}
.uploaded-video-info {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}
.uploaded-video-info > div {
  min-width: 0;
}
.uploaded-video-info strong,
.uploaded-video-info small {
  display: block;
}
.uploaded-video-info strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.uploaded-video-info small {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.video-file-icon {
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  font-size: 12px;
}
.validation-progress {
  border-top: 1px solid var(--color-border-subtle);
  padding: 12px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 12px;
}
.validation-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  border-top: 1px solid var(--color-border-subtle);
  padding: 12px;
}
.validation-metrics > div {
  display: grid;
  gap: 4px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  padding: 12px;
}
.validation-metrics span {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.validation-metrics strong {
  color: var(--color-success);
  overflow-wrap: anywhere;
}
.validation-metrics > div.failed {
  border-color: color-mix(in srgb, var(--color-danger) 38%, var(--color-border));
  background: var(--color-danger-subtle);
}
.validation-metrics > div.failed strong {
  color: var(--color-danger);
}
.validation-error {
  margin: 0 12px 12px;
  border-radius: var(--radius);
  padding: 12px;
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  font-size: 12px;
  line-height: 1.5;
}
.upload-rules {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.upload-rules span {
  border-radius: 9999px;
  padding: 4px 8px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 12px;
}
.upload-module .sync-result {
  margin: 0;
  border-top: 1px solid var(--color-border-subtle);
  border-radius: 0;
}
.cover-section {
  border-top: 1px solid var(--color-border-subtle);
  padding: 16px;
  background: var(--color-bg-muted);
}
.cover-section h4 {
  margin: 0;
  font-size: 14px;
}
.cover-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.showcase-cover-grid {
  grid-template-columns: minmax(220px, 320px);
}
.cover-upload {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.cover-upload.invalid {
  border-color: var(--color-danger);
}
.cover-preview {
  display: flex;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border-subtle);
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 12px;
}
.cover-preview img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
}
.showcase-cover-upload .cover-preview {
  min-height: 0;
  aspect-ratio: 1;
}
.showcase-cover-upload .cover-preview img {
  height: 100%;
}
.cover-copy {
  display: grid;
  min-width: 0;
  gap: 8px;
  padding: 12px;
}
.cover-copy > small {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.cover-actions,
.cover-validation-result {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.cover-actions .secondary-button {
  max-width: 100%;
}
.cover-actions button {
  border: 0;
  padding: 4px;
  background: transparent;
  color: var(--color-primary);
  font-size: 12px;
  cursor: pointer;
}
.cover-validation-note,
.cover-validation-result span {
  color: var(--color-success);
  font-size: 12px;
}
.cover-validation-note {
  color: var(--color-text-secondary);
}
.cover-validation-result span.failed {
  color: var(--color-danger);
}
.cover-error {
  border-radius: var(--radius);
  padding: 8px;
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  font-size: 12px;
  line-height: 1.5;
}
.cover-grid input,
.cover-grid small {
  font-size: 12px;
}
.detail-body {
  display: grid;
  gap: 16px;
}
.detail-body dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
}
.detail-body dl.single {
  grid-template-columns: 1fr;
}
.detail-body dt {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.detail-body dd {
  margin: 4px 0 0;
  font-weight: 700;
}
.wrap {
  overflow-wrap: anywhere;
}
.detail-body p {
  margin: 0;
  color: var(--color-text-secondary);
}
.detail-cover-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.detail-cover-card {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  padding: 12px;
}
.cover-thumbnail {
  display: flex;
  min-height: 88px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--color-primary-subtle), var(--color-bg-muted));
  color: var(--color-primary);
}
.cover-thumbnail > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background: var(--color-surface);
}
.cover-thumbnail small,
.detail-cover-card > div:last-child span {
  display: block;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.detail-cover-card > div:last-child {
  min-width: 0;
}
.detail-cover-card > div:last-child span {
  margin-top: 4px;
}
.modal-layer {
  z-index: 1400;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal,
.confirm-dialog {
  width: min(620px, 100%);
  max-height: 80vh;
  overflow: auto;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}
.confirm-dialog {
  width: min(420px, 100%);
  padding: 24px;
  text-align: center;
}
.confirm-icon {
  margin: auto;
  background: var(--color-warning);
}
.confirm-dialog p {
  color: var(--color-text-secondary);
  line-height: 1.6;
}
.confirm-dialog footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}
.form-error {
  border-radius: var(--radius);
  background: var(--color-danger-subtle);
  padding: 12px;
}
@container (max-width:1039px) {
  .filter-primary-row,
  .filter-advanced-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .filter-actions {
    grid-column: 1/-1;
  }
  .advanced-state {
    grid-column: 1/-1;
  }
  .list-toolbar {
    align-items: flex-start;
  }
  .list-toolbar-actions {
    flex-wrap: wrap;
  }
  .choice-grid,
  .cover-grid,
  .detail-cover-grid {
    grid-template-columns: 1fr;
  }
  .showcase-cover-grid {
    grid-template-columns: minmax(0, 320px);
  }
}
@container (max-width:719px) {
  .filter-primary-row,
  .filter-advanced-row {
    grid-template-columns: 1fr;
  }
  .filter-actions {
    grid-column: auto;
  }
  .list-toolbar,
  .pagination {
    align-items: flex-start;
    flex-direction: column;
  }
  .list-toolbar-actions {
    justify-content: flex-start;
  }
  .toolbar-meta {
    padding-right: 0;
    border-right: 0;
  }
  .upload-card {
    align-items: flex-start;
    flex-direction: column;
  }
  .uploaded-video-row {
    align-items: stretch;
    flex-direction: column;
  }
  .uploaded-video-row .secondary-button {
    align-self: flex-start;
  }
  .storage-row {
    grid-template-columns: 1fr;
  }
  .sync-result dl div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .validation-metrics {
    grid-template-columns: 1fr;
  }
  .showcase-cover-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .detail-body dl {
    grid-template-columns: 1fr;
  }
  .detail-cover-card {
    grid-template-columns: 1fr;
  }
  .material-search-row {
    grid-template-columns: 1fr;
  }
  .material-search-row button {
    justify-self: start;
  }
}
</style>
