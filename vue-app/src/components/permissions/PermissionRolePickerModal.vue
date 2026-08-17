<template>
  <div v-if="visible" class="permission-modal permission-scope-picker-modal" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <section ref="dialog" :class="['modal-panel', 'role-picker-modal', { 'with-detail': detailRole }]" role="dialog" aria-modal="true" aria-labelledby="role-picker-title" tabindex="-1" @keydown.tab="trapFocus">
      <button type="button" class="modal-close" aria-label="关闭" @click="$emit('close')">×</button>
      <h3 id="role-picker-title">添加角色</h3>
      <p class="modal-note">可在所选角色范围内勾选功能和数据权限；复制角色带入的权限保持只读。</p>
      <input ref="searchInput" :value="keyword" class="modal-search-input" placeholder="搜索角色名称、功能权限" @input="updateKeyword">

      <div class="role-picker-layout">
        <div class="role-picker-list">
          <article v-for="role in roles" :key="role.id" :class="['role-picker-row', { active: detailRole?.id === role.id }]" @click="$emit('open-detail', role)">
            <label class="role-picker-check" @click.stop>
              <input type="checkbox" :checked="selectedRoleIds.includes(role.id)" :disabled="lockedRoleIds.includes(role.id)" @change="$emit('toggle-role', role.id)">
            </label>
            <div class="role-picker-content">
              <div class="role-picker-title">
                <b>{{ role.name }}</b>
                <button type="button" class="link-btn" @click.stop="$emit('open-detail', role)">查看详情</button>
              </div>
              <p>{{ roleDescription(role) }}</p>
              <small>{{ roleFunctionIds(role).length }} 项功能权限 / {{ roleDataIds(role).length }} 项数据权限</small>
            </div>
          </article>
        </div>

        <aside v-if="detailRole" class="role-detail-drawer">
          <button type="button" class="modal-close drawer-close" aria-label="关闭角色详情" @click="$emit('close-detail')">×</button>
          <span class="drawer-eyebrow">角色详情</span>
          <h4>{{ detailRole.name }}</h4>
          <p>{{ roleDescription(detailRole) }}</p>
          <div class="role-permission-tabs" role="tablist" aria-label="角色权限类型">
            <button type="button" :class="{ active: activePermissionTab === 'function' }" @click="$emit('update:active-permission-tab', 'function')">功能权限 <b>{{ roleFunctionIds(detailRole).length }}</b></button>
            <button type="button" :class="{ active: activePermissionTab === 'data' }" @click="$emit('update:active-permission-tab', 'data')">数据权限 <b>{{ roleDataIds(detailRole).length }}</b></button>
          </div>
          <input v-if="activePermissionTab === 'function'" :value="detailKeyword" class="modal-search-input drawer-search" placeholder="搜索功能权限名称、说明或分类" @input="updateDetailKeyword">
          <div v-if="activePermissionTab === 'function'" class="role-permission-tree">
            <details v-for="group in functionPermissionGroups" :key="group.id" class="permission-tree-root" open>
              <summary><b>{{ group.name }}</b><span>{{ groupItemCount(group) }} 项功能</span></summary>
              <div class="permission-tree-branch-list">
                <details v-for="branch in group.children" :key="branch.id" class="permission-tree-branch" open>
                  <summary><b>{{ branch.name }}</b><span>{{ branchItems(branch).length }} 项功能</span></summary>
                  <div class="permission-item-list">
                    <label v-for="permission in branchItems(branch)" :key="permission.id" class="permission-detail-check">
                      <input type="checkbox" :checked="selectedPermissionIds.includes(permission.id)" :disabled="lockedRoleIds.includes(detailRole.id)" @change="$emit('toggle-function', permission.id)">
                      <span><b>{{ permission.name }}</b><small>{{ permission.description || permission.scope || permission.id }}</small></span>
                    </label>
                  </div>
                </details>
              </div>
            </details>
            <div v-if="!functionPermissionGroups.length" class="scope-empty"><b>没有匹配的功能权限</b><p>请调整搜索关键词后再试。</p></div>
          </div>
          <div v-else class="role-permission-tree data-directory-tree">
            <PermissionDataDirectoryList
              :directories="dataPermissionDirectories"
              :selected-ids="selectedDataIds"
              :disabled="lockedRoleIds.includes(detailRole.id)"
              @toggle="$emit('toggle-data', $event)"
            />
          </div>
        </aside>
      </div>

      <footer class="modal-actions">
        <button type="button" class="secondary-btn" @click="$emit('close')">取消</button>
        <button type="button" class="primary-btn" @click="$emit('confirm')">确认</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import PermissionDataDirectoryList, { type DataPermissionDirectory } from './PermissionDataDirectoryList.vue'

interface PermissionItem { id: string; name: string; description?: string; scope?: string }
interface PermissionBranch { id: string; name: string; children?: PermissionItem[]; functions?: PermissionItem[]; dataPermissions?: PermissionItem[] }
interface PermissionGroup { id: string; name: string; children: PermissionBranch[] }
interface RoleOption {
  id: string
  name: string
  description?: string
  desc?: string
  functionIds?: string[]
  dataIds?: string[]
  functionPermissionIds?: string[]
  dataPermissionIds?: string[]
}

const props = defineProps<{
  visible: boolean
  roles: RoleOption[]
  detailRole: RoleOption | null
  permissionGroups: Array<PermissionGroup | DataPermissionDirectory>
  keyword: string
  detailKeyword: string
  activePermissionTab: string
  selectedRoleIds: string[]
  selectedFunctionIds: string[]
  selectedDataIds: string[]
  lockedRoleIds: string[]
}>()

const dialog = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
let returnFocus: HTMLElement | null = null

const emit = defineEmits<{
  close: []
  confirm: []
  'open-detail': [role: RoleOption]
  'close-detail': []
  'toggle-role': [id: string]
  'toggle-function': [id: string]
  'toggle-data': [id: string]
  'update:keyword': [value: string]
  'update:detail-keyword': [value: string]
  'update:active-permission-tab': [value: string]
}>()

const selectedPermissionIds = computed(() => props.activePermissionTab === 'function' ? props.selectedFunctionIds : props.selectedDataIds)
const functionPermissionGroups = computed(() => props.permissionGroups.filter((group): group is PermissionGroup => 'children' in group))
const dataPermissionDirectories = computed(() => props.permissionGroups.filter((group): group is DataPermissionDirectory => 'datasets' in group))
const roleDescription = (role: RoleOption) => role.description || role.desc || ''
const roleFunctionIds = (role: RoleOption) => role.functionPermissionIds || role.functionIds || []
const roleDataIds = (role: RoleOption) => role.dataPermissionIds || role.dataIds || []
const branchItems = (branch: PermissionBranch) => branch.children || (props.activePermissionTab === 'function' ? branch.functions : branch.dataPermissions) || []
const groupItemCount = (group: PermissionGroup) => group.children.reduce((count, branch) => count + branchItems(branch).length, 0)
const inputValue = (event: Event) => (event.target as HTMLInputElement).value
const updateKeyword = (event: Event) => emit('update:keyword', inputValue(event))
const updateDetailKeyword = (event: Event) => emit('update:detail-keyword', inputValue(event))

watch(() => props.visible, async (visible) => {
  if (!visible) {
    returnFocus?.focus()
    returnFocus = null
    return
  }
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  searchInput.value?.focus()
})

function trapFocus(event: KeyboardEvent) {
  const focusable = [...(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary') || [])]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<style scoped>
.permission-modal.permission-scope-picker-modal { position: fixed; inset: 0; z-index: 1400; display: grid; place-items: center; overflow-y: auto; padding: 24px; background: rgba(17, 24, 39, .25); backdrop-filter: blur(8px); }
.modal-panel { position: relative; box-sizing: border-box; width: min(820px, 100%); max-height: min(720px, calc(100vh - 48px)); overflow: auto; border: 1px solid #dfe7f3; border-radius: 8px; padding: 24px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .18); }
.role-picker-modal.with-detail { width: min(1280px, calc(100vw - 72px)); }
h3 { margin: 0; color: #172033; font-size: 20px; }
.modal-note { margin: 7px 42px 0 0; color: #667085; font-size: 13px; line-height: 1.6; }
.modal-close { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border: 1px solid #d8e1ee; border-radius: 8px; background: #fff; color: #667085; font-size: 20px; cursor: pointer; }
.modal-search-input { box-sizing: border-box; width: 100%; min-height: 36px; margin-top: 16px; border: 1px solid #d8e1ee; border-radius: 8px; padding: 0 12px; color: #172033; font: inherit; font-size: 13px; }
.role-picker-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.with-detail .role-picker-layout { grid-template-columns: minmax(420px, .95fr) minmax(500px, 1.05fr); align-items: stretch; }
.role-picker-list { display: grid; gap: 8px; max-height: 520px; margin-top: 14px; overflow: auto; }
.role-picker-row { display: grid; grid-template-columns: 18px 1fr; gap: 10px; align-items: flex-start; border: 1px solid #e6edf5; border-radius: 8px; padding: 12px; background: #fff; color: #455468; cursor: pointer; }
.role-picker-row.active { border-color: #8fb2ff; background: #f7fbff; box-shadow: 0 0 0 3px rgba(49, 109, 255, .08); }
.role-picker-check { display: flex; padding-top: 2px; }
.role-picker-check input, .permission-detail-check input { width: 16px; min-height: 16px; accent-color: #316dff; }
.role-picker-content { min-width: 0; }
.role-picker-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.role-picker-title b { color: #172033; font-size: 13px; }
.role-picker-content p { margin: 4px 0 8px; color: #6b778c; font-size: 12px; line-height: 1.5; }
.role-picker-content small { display: block; color: #8a96a8; font-size: 12px; }
.link-btn { border: 0; padding: 0; background: transparent; color: #316dff; font: inherit; font-size: 12px; cursor: pointer; }
.role-detail-drawer { position: relative; display: flex; min-height: 0; max-height: 520px; flex-direction: column; margin-top: 14px; border: 1px solid #dfe7f3; border-radius: 8px; padding: 14px; background: #fbfdff; }
.drawer-close { top: 10px; right: 10px; }
.drawer-eyebrow { color: #316dff; font-size: 12px; font-weight: 800; }
.role-detail-drawer h4 { margin: 6px 32px 4px 0; color: #172033; font-size: 16px; }
.role-detail-drawer > p { margin: 0; color: #6b778c; font-size: 12px; line-height: 1.5; }
.role-permission-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.role-permission-tabs button { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; border: 1px solid #dfe7f3; border-radius: 6px; padding: 0 10px; background: #fff; color: #455468; font-size: 12px; font-weight: 800; cursor: pointer; }
.role-permission-tabs button.active { border-color: #316dff; background: #eef4ff; color: #316dff; }
.drawer-search { flex: 0 0 auto; margin-top: 12px; }
.role-permission-tree { display: grid; flex: 1 1 auto; gap: 6px; min-height: 0; margin-top: 10px; overflow-y: auto; }
.permission-tree-root, .permission-tree-branch { overflow: hidden; border: 1px solid #e6edf5; border-radius: 8px; background: #fff; }
.permission-tree-branch { border: 0; border-radius: 6px; background: transparent; }
summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 34px; padding: 0 10px; color: #172033; font-size: 13px; font-weight: 700; list-style: none; cursor: pointer; }
.permission-tree-root > summary { background: #f8fafc; }
summary::-webkit-details-marker { display: none; }
summary::before { content: '›'; flex: 0 0 auto; color: #8a96a8; font-size: 16px; transform: rotate(0); transition: transform .16s ease; }
details[open] > summary::before { transform: rotate(90deg); }
summary b { flex: 1 1 auto; min-width: 0; }
summary span { color: #7a8798; font-size: 12px; font-weight: 600; }
.permission-tree-branch-list { display: grid; gap: 4px; padding: 6px 8px 8px 22px; border-top: 1px solid #edf2f8; }
.permission-item-list { display: grid; gap: 4px; margin: 0 8px 8px 24px; }
.permission-detail-check { display: flex; align-items: flex-start; gap: 8px; min-width: 0; border: 1px solid #edf2f8; border-radius: 6px; padding: 9px 10px; background: #fff; color: #455468; cursor: pointer; }
.permission-detail-check:hover, summary:hover { background: #f4f7fb; }
.permission-detail-check span { display: grid; gap: 3px; min-width: 0; }
.permission-detail-check b { color: #172033; font-size: 12px; }
.permission-detail-check small { color: #7a8798; font-size: 12px; line-height: 1.45; word-break: break-all; }
.scope-empty { border: 1px dashed #cfd9e7; border-radius: 8px; padding: 24px; text-align: center; }
.scope-empty p { margin: 6px 0 0; color: #7a8798; font-size: 12px; }
.modal-actions { display: flex; justify-content: flex-start; gap: 10px; margin-top: 18px; border-top: 1px solid #e6edf5; padding-top: 14px; }
.primary-btn, .secondary-btn { min-height: 38px; border-radius: 8px; padding: 0 18px; font-weight: 800; cursor: pointer; }
.primary-btn { border: 1px solid #316dff; background: #316dff; color: #fff; }
.secondary-btn { border: 1px solid #d8e1ee; background: #fff; color: #455468; }
@media (max-width: 980px) { .with-detail .role-picker-layout { grid-template-columns: 1fr; } .role-detail-drawer { max-height: 360px; } }
</style>
