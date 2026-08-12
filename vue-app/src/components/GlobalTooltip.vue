<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="tooltipEl"
      class="workbench-tooltip"
      :class="{ 'is-visible': positioned }"
      :style="tooltipStyle"
      role="tooltip"
    >
      {{ text }}
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const text = ref('')
const visible = ref(false)
const positioned = ref(false)
const left = ref(0)
const top = ref(0)
const activeTarget = ref(null)
const tooltipEl = ref(null)
let showTimer = 0

const tooltipStyle = computed(() => ({
  left: `${left.value}px`,
  top: `${top.value}px`
}))

function getTooltipTarget(event) {
  const target = event.target
  return target instanceof Element ? target.closest('[data-tooltip]') : null
}

function scheduleShow(event) {
  const target = getTooltipTarget(event)
  if (!target) return
  window.clearTimeout(showTimer)
  showTimer = window.setTimeout(() => show(target), 80)
}

async function show(target) {
  const content = target.getAttribute('data-tooltip')
  if (!content) return
  activeTarget.value = target
  text.value = content
  visible.value = true
  positioned.value = false
  await nextTick()
  positionTooltip()
}

function hide(event) {
  const related = event.relatedTarget
  if (activeTarget.value && related instanceof Node && activeTarget.value.contains(related)) return
  window.clearTimeout(showTimer)
  activeTarget.value = null
  visible.value = false
  positioned.value = false
}

function positionTooltip() {
  const target = activeTarget.value
  const tooltip = tooltipEl.value
  if (!target || !tooltip) return

  const gap = 8
  const viewportGap = 8
  const targetRect = target.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const preferredPlacement = target.getAttribute('data-tooltip-placement') || 'bottom'
  const align = target.getAttribute('data-tooltip-align') || 'center'
  const width = tooltipRect.width
  const height = tooltipRect.height

  let nextLeft = align === 'end'
    ? targetRect.right - width
    : targetRect.left + targetRect.width / 2 - width / 2

  nextLeft = Math.max(viewportGap, Math.min(nextLeft, window.innerWidth - width - viewportGap))

  let nextTop = preferredPlacement === 'top'
    ? targetRect.top - height - gap
    : targetRect.bottom + gap

  if (nextTop < viewportGap) nextTop = targetRect.bottom + gap
  if (nextTop + height > window.innerHeight - viewportGap) {
    nextTop = Math.max(viewportGap, targetRect.top - height - gap)
  }

  left.value = Math.round(nextLeft)
  top.value = Math.round(nextTop)
  positioned.value = true
}

function handleKeydown(event) {
  if (event.key === 'Escape') hide({ relatedTarget: null })
}

onMounted(() => {
  document.addEventListener('pointerover', scheduleShow)
  document.addEventListener('pointerout', hide)
  document.addEventListener('focusin', scheduleShow)
  document.addEventListener('focusout', hide)
  window.addEventListener('resize', positionTooltip)
  window.addEventListener('scroll', positionTooltip, true)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.clearTimeout(showTimer)
  document.removeEventListener('pointerover', scheduleShow)
  document.removeEventListener('pointerout', hide)
  document.removeEventListener('focusin', scheduleShow)
  document.removeEventListener('focusout', hide)
  window.removeEventListener('resize', positionTooltip)
  window.removeEventListener('scroll', positionTooltip, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
