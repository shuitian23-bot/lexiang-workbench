# Shell Seal Status

This file records the current sealed shell boundary for the Vue migration preview.

## Sealed Shell Areas

- Left navigation: `shell/sidebar/WorkbenchSidebar.vue`, `sidebar/SidebarHeader.vue`, `sidebar/SidebarNavGroup.vue`, `sidebar/SidebarFooter.vue`
- Top navigation: `shell/topbar/WorkbenchTopbar.vue`, `topbar/StaticTabs.vue`, `topbar/DynamicTabs.vue`, `topbar/TopbarActions.vue`
- Agent panel: `shell/agent/WorkbenchAgentPanel.vue`, `agent/AgentPanelHeader.vue`, `agent/AgentMessageList.vue`, `agent/AgentComposer.vue`

Compatibility wrappers remain at `AppSidebar.vue`, `AppTopbar.vue`, and `AppAIPanel.vue` so older imports keep working while new shell work imports from `components/shell/...`.

## Current Contract

- Left navigation keeps the Vue component structure and includes the account hub popover plus POC adjustment log modal.
- Left navigation brand header is sealed after 0707 confirmation: expanded state shows only the red `联想乐享` full logo, without a `工作台` pill/tag. The expanded logo renders at about `112x23px` inside the `168px` sidebar, the sidebar header remains `56px`, and the expanded collapse button remains `28x28px` with about `3px` gap from the logo lockup. Collapsed state keeps the centered `36x36px` icon mark and the `24x24px` rail handle.
- Top navigation owns static tabs, dynamic report tabs, dark/light toggle, and the AI assistant entry button.
- Agent panel owns the header actions, conversation history, task log, message/report cards, queue state, waiting state, file attachment, shortcut query chips, and composer controls.
- Middle content pages can continue to use sealed runtime renderers through `NativeWorkbenchPage.vue` only for hidden/detail compatibility routes or pages explicitly out of the current release scope.
- 当前可见左导航页面已经进入 Vue route/page layer：乐享运营 5 页、GEO 看板 5 页、在职员工管理 2 页、企业客户管理 3 页。它们不得在普通迁移中回退到 `NativeWorkbenchPage.vue`。
- 搜索后台、风控管理已从当前第一版封板项目删除；不保留左侧入口、业务路由或旧占位页。

## Do Not Change Casually

- Do not move shell interaction code back into page renderers.
- Do not add page-specific behavior into the shell components unless it is explicitly part of navigation, tabs, or Agent panel behavior.
- Do not replace sealed runtime pages with WIP placeholder views in the router.
