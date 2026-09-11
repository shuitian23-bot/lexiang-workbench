import type { Directive } from 'vue'

const OVERFLOW_TOLERANCE = 1
const states = new WeakMap<HTMLElement, ModalOverflowState>()

interface ModalOverflowState {
  frame: number
  regions: HTMLElement[]
  resizeObserver: ResizeObserver
  mutationObserver: MutationObserver
  schedule: () => void
  handleScroll: () => void
}

function getScrollRegions(element: HTMLElement) {
  const markedRegions = Array.from(element.querySelectorAll<HTMLElement>('[data-modal-scroll-region]'))
  return markedRegions.length ? markedRegions : [element]
}

function updateState(element: HTMLElement, state: ModalOverflowState) {
  const regions = getScrollRegions(element)
  const regionsChanged = regions.length !== state.regions.length || regions.some((region, index) => region !== state.regions[index])

  if (regionsChanged) {
    state.resizeObserver.disconnect()
    regions.forEach((region) => state.resizeObserver.observe(region))
    state.regions = regions
  }

  const overflowingRegions = regions.filter((region) => region.scrollHeight - region.clientHeight > OVERFLOW_TOLERANCE)
  const canScrollDown = overflowingRegions.some(
    (region) => region.scrollTop + region.clientHeight < region.scrollHeight - OVERFLOW_TOLERANCE,
  )

  element.classList.toggle('modal-content-overflowing', overflowingRegions.length > 0)
  element.classList.toggle('modal-content-can-scroll-down', canScrollDown)
}

function mount(element: HTMLElement) {
  const state = {} as ModalOverflowState
  state.frame = 0
  state.regions = []
  state.schedule = () => {
    cancelAnimationFrame(state.frame)
    state.frame = requestAnimationFrame(() => updateState(element, state))
  }
  state.handleScroll = state.schedule
  state.resizeObserver = new ResizeObserver(state.schedule)
  state.mutationObserver = new MutationObserver(state.schedule)

  element.addEventListener('scroll', state.handleScroll, true)
  state.mutationObserver.observe(element, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['open', 'hidden', 'aria-expanded'],
  })
  states.set(element, state)
  state.schedule()
}

function unmount(element: HTMLElement) {
  const state = states.get(element)
  if (!state) return
  cancelAnimationFrame(state.frame)
  state.resizeObserver.disconnect()
  state.mutationObserver.disconnect()
  element.removeEventListener('scroll', state.handleScroll, true)
  states.delete(element)
}

export const vModalOverflowState: Directive<HTMLElement, boolean | undefined> = {
  mounted(element, binding) {
    if (binding?.value !== false) mount(element)
  },
  updated(element, binding) {
    if (binding?.value === false) {
      unmount(element)
      element.classList.toggle('modal-content-overflowing', false)
      element.classList.toggle('modal-content-can-scroll-down', false)
    } else if (!states.has(element)) {
      mount(element)
    } else {
      states.get(element)?.schedule()
    }
  },
  unmounted: unmount,
}
