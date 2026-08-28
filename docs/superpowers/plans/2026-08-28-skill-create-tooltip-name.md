# Skill Create Tooltip Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the capability name above its description in the Skill creation capability-card tooltip.

**Architecture:** Extend the existing local tooltip view model with a `name` field and render the existing teleported tooltip as two semantic lines. Keep positioning, hover/focus lifecycle, card selection, and all Skill workflow state unchanged.

**Tech Stack:** Vue 3, TypeScript, scoped CSS, Node test runner, Vite.

## Global Constraints

- First line is the capability name in bold; second line is the existing description.
- Mouse hover and keyboard focus expose identical tooltip content.
- Do not modify capability selection, Skill lifecycle, permissions, AI assistant, or `admin-runtime`.
- Deploy to `new` only; formal and external Git remain separate confirmations.

---

### Task 1: Add capability name to the existing tooltip

**Files:**
- Modify: `vue-app/scripts/product-contract-regression.test.mjs`
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`

**Interfaces:**
- Consumes: existing `ContextItem.name`, `ContextItem.subtitle`, and `showContextSubtitleTooltip()`.
- Produces: `ContextSubtitleTooltip.name: string` and a two-line tooltip template.

- [ ] **Step 1: Write the failing source regression test**

Add a test that requires the tooltip to render both fields and populate the name:

```js
test('Skill creation capability tooltip shows name above description', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')

  assert.match(view, /<strong>\{\{ contextSubtitleTooltip\.name \}\}<\/strong>\s*<span>\{\{ contextSubtitleTooltip\.text \}\}<\/span>/)
  assert.match(view, /name: item\.name,\s*text: item\.subtitle,/)
})
```

- [ ] **Step 2: Verify the test fails for the missing name**

Run:

```bash
cd vue-app && node --test scripts/product-contract-regression.test.mjs
```

Expected: the new test fails because the current tooltip renders only `contextSubtitleTooltip.text`.

- [ ] **Step 3: Implement the two-line tooltip**

Update the view model and assignment:

```ts
type ContextSubtitleTooltip = {
  code: string
  name: string
  text: string
  left: number
  top: number
  width: number
  placement: 'top' | 'bottom'
}

contextSubtitleTooltip.value = {
  code: item.code,
  name: item.name,
  text: item.subtitle,
  left,
  top: placement === 'bottom' ? rect.bottom + 6 : rect.top - 6,
  width,
  placement
}
```

Render and style two lines:

```vue
<strong>{{ contextSubtitleTooltip.name }}</strong>
<span>{{ contextSubtitleTooltip.text }}</span>
```

```css
.skill-context-subtitle-tooltip strong,
.skill-context-subtitle-tooltip span { display: block; }
.skill-context-subtitle-tooltip strong { margin-bottom: 2px; font-weight: 600; }
```

- [ ] **Step 4: Verify the regression test passes**

Run the product contract test again and expect all tests to pass.

### Task 2: Record and preview the isolated change

**Files:**
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`

**Interfaces:**
