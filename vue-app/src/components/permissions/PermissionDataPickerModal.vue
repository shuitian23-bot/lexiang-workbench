<template>
  <div v-if="visible" class="permission-modal" @click.self="$emit('close')">
    <section class="modal-panel">
      <button type="button" class="modal-close" aria-label="关闭" @click="$emit('close')">×</button>
      <h3>添加数据权限</h3>
      <p class="modal-note">默认展示系统全部数据权限；复制带入的权限保持锁定，只能调整本次手工添加的数据权限。</p>
      <input :value="keyword" class="modal-search-input" placeholder="搜索数据权限名称、页面或分组" @input="updateKeyword">
      <div class="data-tree-picker">
        <details v-for="group in permissionTree" :key="group.id" class="permission-tree-root" open>
          <summary><b>{{ group.name }}</b><span>{{ group.children.length }} 个页面</span></summary>
          <div class="permission-tree-branch-list">
            <details v-for="branch in group.children" :key="branch.id" class="permission-tree-branch" open>
              <summary><b>{{ branch.name }}</b><span>{{ branch.children.length }} 项数据权限</span></summary>
              <div class="data-tree-leaf-list">
                <label v-for="permission in branch.children" :key="permission.id" class="data-tree-leaf">
                  <input type="checkbox" :checked="selectedIds.includes(permission.id)" :disabled="lockedIds.includes(permission.id)" @change="$emit('toggle', permission.id)">
                  <span>{{ permission.name }}</span>
                  <em v-if="lockedIds.includes(permission.id)" class="readonly-badge">{{ lockedLabels[permission.id] || lockedLabel }}</em>
                </label>
              </div>
            </details>
          </div>
        </details>
        <div v-if="!permissionTree.length" class="scope-empty"><b>没有匹配的数据权限</b><p>请调整关键词后再试。</p></div>
      </div>
      <footer class="modal-actions">
        <button type="button" class="secondary-btn" @click="$emit('close')">取消</button>
        <button type="button" class="primary-btn" @click="$emit('confirm')">确认</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
interface PermissionItem { id: string; name: string }
interface PermissionBranch { id: string; name: string; children: PermissionItem[] }
interface PermissionGroup { id: string; name: string; children: PermissionBranch[] }

withDefaults(defineProps<{
  visible: boolean
  permissionTree: PermissionGroup[]
  keyword: string
  selectedIds: string[]
  lockedIds: string[]
  lockedLabel?: string
  lockedLabels?: Record<string, string>
}>(), { lockedLabel: '复制带入', lockedLabels: () => ({}) })

const emit = defineEmits<{
  close: []
  confirm: []
  toggle: [id: string]
  'update:keyword': [value: string]
}>()

function updateKeyword(event: Event) {
  emit('update:keyword', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.permission-modal { position: fixed; inset: 0; z-index: 1400; display: grid; place-items: center; overflow-y: auto; padding: 24px; background: rgba(17, 24, 39, .25); backdrop-filter: blur(8px); }
.modal-panel { position: relative; box-sizing: border-box; width: min(820px, 100%); max-height: min(720px, calc(100vh - 48px)); overflow: auto; border: 1px solid #dfe7f3; border-radius: 8px; padding: 24px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .18); }
h3 { margin: 0; color: #172033; font-size: 20px; }
.modal-note { margin: 7px 42px 0 0; color: #667085; font-size: 13px; line-height: 1.6; }
.modal-close { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border: 1px solid #d8e1ee; border-radius: 8px; background: #fff; color: #667085; font-size: 20px; cursor: pointer; }
.modal-search-input { box-sizing: border-box; width: 100%; min-height: 36px; margin-top: 16px; border: 1px solid #d8e1ee; border-radius: 8px; padding: 0 12px; color: #172033; font: inherit; font-size: 13px; }
.data-tree-picker { display: grid; gap: 6px; max-height: 520px; margin-top: 14px; overflow: auto; }
.permission-tree-root, .permission-tree-branch { overflow: hidden; border: 1px solid #e6edf5; border-radius: 8px; background: #fff; }
.permission-tree-branch { border: 0; border-radius: 6px; background: transparent; }
summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 34px; padding: 0 10px; color: #172033; font-size: 13px; font-weight: 700; list-style: none; cursor: pointer; }
.permission-tree-root > summary { background: #f8fafc; }
summary::-webkit-details-marker { display: none; }
summary::before { content: '›'; flex: 0 0 auto; color: #8a96a8; font-size: 16px; transform: rotate(0); transition: transform .16s ease; }
details[open] > summary::before { transform: rotate(90deg); }
summary b { flex: 1 1 auto; min-width: 0; }
summary span { color: #7a8798; font-size: 12px; font-weight: 600; }
summary:hover { background: #f4f7fb; }
.permission-tree-branch-list { display: grid; gap: 4px; padding: 6px 8px 8px 22px; border-top: 1px solid #edf2f8; }
.data-tree-leaf-list { display: grid; gap: 2px; margin: 0 8px 8px 24px; padding-left: 10px; border-left: 1px solid #e6edf5; }
.data-tree-leaf { display: flex; align-items: center; gap: 8px; min-height: 30px; border-radius: 6px; padding: 0 8px; color: #455468; font-size: 13px; cursor: pointer; }
.data-tree-leaf:hover { background: #f8fafc; }
.data-tree-leaf input { width: 16px; height: 16px; accent-color: #316dff; }
.data-tree-leaf > span { flex: 1; }
.readonly-badge { display: inline-flex; align-items: center; min-height: 24px; border-radius: 999px; padding: 0 9px; background: #eef2f7; color: #667085; font-size: 11px; font-style: normal; font-weight: 800; }
.scope-empty { border: 1px dashed #cfd9e7; border-radius: 8px; padding: 24px; text-align: center; }
.scope-empty p { margin: 6px 0 0; color: #7a8798; font-size: 12px; }
.modal-actions { display: flex; justify-content: flex-start; gap: 10px; margin-top: 18px; border-top: 1px solid #e6edf5; padding-top: 14px; }
.primary-btn, .secondary-btn { min-height: 38px; border-radius: 8px; padding: 0 18px; font-weight: 800; cursor: pointer; }
.primary-btn { border: 1px solid #316dff; background: #316dff; color: #fff; }
.secondary-btn { border: 1px solid #d8e1ee; background: #fff; color: #455468; }
</style>
