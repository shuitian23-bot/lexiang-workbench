export interface SkillPackageFeedbackTarget {
  element: HTMLElement
  key: string
  mountKey: number
  title: string
}

const modalSelector = '#agent-skill-modal'
const cardSelector = '.agent-skill-card'
const feedbackSelector = '.skill-package-feedback'
const mountStates = new WeakMap<HTMLElement, { key: number; mounted: boolean }>()
let nextMountKey = 1

function mountState(element: HTMLElement) {
  let state = mountStates.get(element)
  if (!state) {
    state = { key: nextMountKey++, mounted: false }
    mountStates.set(element, state)
  }
  return state
}

function hasFeedbackRoot(nodes: NodeList): boolean {
  return Array.from(nodes).some(node => node instanceof Element && node.matches(feedbackSelector))
}

function feedbackOnly(nodes: NodeList): boolean {
  return nodes.length > 0 && Array.from(nodes).every(node =>
    node instanceof Element && (node.matches(feedbackSelector) || !!node.closest(feedbackSelector))
  )
}

function touchesModal(node: Node): boolean {
  return node instanceof Element &&
    (node.matches(modalSelector) || !!node.querySelector(modalSelector))
}

function needsScan(mutation: MutationRecord): boolean {
  if (mutation.type === 'attributes') return mutation.target instanceof Element && mutation.target.matches(modalSelector)
  const target = mutation.target
  if (target instanceof Element && target.closest(feedbackSelector)) return false
  if (target instanceof HTMLElement && target.matches('.agent-skill-card-foot')) {
    const state = mountStates.get(target)
    if (hasFeedbackRoot(mutation.addedNodes) && state) state.mounted = true
    if (hasFeedbackRoot(mutation.removedNodes)) return true
  }
  if (feedbackOnly(mutation.addedNodes) || feedbackOnly(mutation.removedNodes)) return false
  return (target instanceof Element && !!target.closest(modalSelector)) ||
    Array.from(mutation.addedNodes).some(touchesModal) ||
    Array.from(mutation.removedNodes).some(touchesModal)
}

function collectTargets(): SkillPackageFeedbackTarget[] {
  const modal = document.querySelector<HTMLElement>(`${modalSelector}.open`)
  if (!modal) return []

  const cards = Array.from(modal.querySelectorAll<HTMLElement>(cardSelector))
  const names = cards.map(card => card.querySelector('.agent-skill-card-name')?.textContent?.trim() || '')

  const result: SkillPackageFeedbackTarget[] = []
  cards.forEach((card, index) => {
    const element = card.querySelector<HTMLElement>('.agent-skill-card-foot')
    const title = names[index]
    if (!element || !title) return

    const skillId = card.getAttribute('data-skill-id')?.trim()
    const packageId = card.getAttribute('data-package-id')?.trim()
    const skillName = card.getAttribute('data-skill-name')?.trim()
    const key = skillId ? `skill-id:${skillId}`
      : packageId ? `package-id:${packageId}`
      : skillName ? `skill-name:${skillName}`
      : `legacy-title:${title}`
    const state = mountState(element)
    if (state.mounted && !element.querySelector(feedbackSelector)) {
      state.key = nextMountKey++
      state.mounted = false
    }
    if (element.querySelector(feedbackSelector)) state.mounted = true
    result.push({ element, key, mountKey: state.key, title })
  })
  return result
}

function sameTargets(a: SkillPackageFeedbackTarget[], b: SkillPackageFeedbackTarget[]): boolean {
  return a.length === b.length && a.every((target, index) =>
    target.element === b[index].element && target.key === b[index].key &&
    target.mountKey === b[index].mountKey && target.title === b[index].title
  )
}

/** Observe the live legacy modal without changing its renderer or card behavior. */
export function observeSkillPackageCards(onChange: (cards: SkillPackageFeedbackTarget[]) => void): () => void {
  let previous: SkillPackageFeedbackTarget[] = []
  let scheduled = false
  let connected = true

  const scan = () => {
    scheduled = false
    if (!connected) return
    const current = collectTargets()
    if (!sameTargets(previous, current)) {
      previous = current
      onChange(current)
    }
  }
  const scheduleScan = () => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(scan)
  }

  const observer = new MutationObserver(mutations => {
    let shouldScan = false
    mutations.forEach(mutation => { if (needsScan(mutation)) shouldScan = true })
    if (shouldScan) scheduleScan()
  })
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
  scan()

  return () => {
    connected = false
    observer.disconnect()
  }
}
