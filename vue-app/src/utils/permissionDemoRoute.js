export function createPermissionDemoRouteItems(steps, options = {}) {
  const beforeExpanded = Boolean(options.beforeExpanded)
  const afterExpanded = Boolean(options.afterExpanded)
  if (steps.length <= 3) return steps.map((step) => ({ ...step, kind: 'step' }))

  const matchedIndex = steps.findIndex((step) => step.state === 'current')
  const currentIndex = matchedIndex >= 0 ? matchedIndex : 0
  const windowStart = Math.max(0, currentIndex - 1)
  const windowEnd = Math.min(steps.length - 1, currentIndex + 1)
  const before = steps.slice(0, windowStart)
  const currentWindow = steps.slice(windowStart, windowEnd + 1)
  const after = steps.slice(windowEnd + 1)
  const items = []

  if (before.length) {
    items.push({
      key: 'fold-before',
      kind: 'fold',
      direction: 'before',
      expanded: beforeExpanded,
      label: `${beforeExpanded ? '收起已完成' : '已完成'} ${before.length} 步`
    })
    if (beforeExpanded) items.push(...before.map((step) => ({ ...step, kind: 'step' })))
  }

  items.push(...currentWindow.map((step) => ({ ...step, kind: 'step' })))

  if (after.length) {
    items.push({
      key: 'fold-after',
      kind: 'fold',
      direction: 'after',
      expanded: afterExpanded,
      label: `${afterExpanded ? '收起后续' : '还有'} ${after.length} 步`
    })
    if (afterExpanded) items.push(...after.map((step) => ({ ...step, kind: 'step' })))
  }

  return items
}
