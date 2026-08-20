import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function isFocusable(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && !element.hasAttribute('inert')
}

function focusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable)
}

function findCloseControl(dialog: HTMLElement) {
  const explicit = dialog.querySelector<HTMLElement>('[data-dialog-close], .modal-close')
  if (explicit) return explicit

  return Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find((button) => (
    /^(取消|关闭|返回)$/.test(button.textContent?.trim() || '')
  )) || null
}

export function useDialogFocusManager(
  rootRef: Ref<HTMLElement | null>,
  overlaySelector = '.permission-modal',
  panelSelector = '.modal-panel'
) {
  let observer: MutationObserver | null = null
  let activeOverlay: HTMLElement | null = null
  let activePanel: HTMLElement | null = null
  let restoreTarget: HTMLElement | null = null
  const mutedChildren = new Map<HTMLElement, string | null>()

  function restoreBackground() {
    mutedChildren.forEach((ariaHidden, element) => {
      element.removeAttribute('inert')
      if (ariaHidden === null) element.removeAttribute('aria-hidden')
      else element.setAttribute('aria-hidden', ariaHidden)
    })
    mutedChildren.clear()
  }

  function muteBackground(overlay: HTMLElement) {
    const root = rootRef.value
    if (!root) return

    Array.from(root.children).forEach((child) => {
      if (!(child instanceof HTMLElement) || child === overlay || child.contains(overlay)) return
      mutedChildren.set(child, child.getAttribute('aria-hidden'))
      child.setAttribute('inert', '')
      child.setAttribute('aria-hidden', 'true')
    })
  }

  function ensureDialogName(panel: HTMLElement) {
    if (panel.hasAttribute('aria-label') || panel.hasAttribute('aria-labelledby')) return
    const title = panel.querySelector<HTMLElement>('h1, h2, h3, h4')
    if (!title) {
      panel.setAttribute('aria-label', '对话框')
      return
    }
    if (!title.id) title.id = `permission-dialog-title-${Math.random().toString(36).slice(2, 9)}`
    panel.setAttribute('aria-labelledby', title.id)
  }

  function visibleOverlays() {
    const root = rootRef.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(overlaySelector)).filter((overlay) => (
      window.getComputedStyle(overlay).display !== 'none'
    ))
  }

  function activate(overlay: HTMLElement | null) {
    if (overlay === activeOverlay) return

    const previousOverlay = activeOverlay
    const previousRestoreTarget = restoreTarget
    restoreBackground()
    activeOverlay = overlay
    activePanel = overlay?.querySelector<HTMLElement>(panelSelector) || null

    if (!overlay || !activePanel) {
      restoreTarget = null
      if (previousOverlay && previousRestoreTarget?.isConnected) nextTick(() => previousRestoreTarget.focus())
      return
    }

    const panel = activePanel
    restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
    panel.setAttribute('tabindex', '-1')
    ensureDialogName(panel)
    muteBackground(overlay)

    nextTick(() => {
      const preferred = panel.querySelector<HTMLElement>('[autofocus], input:not([readonly]), select, textarea')
      const target = preferred && isFocusable(preferred) ? preferred : focusableElements(panel)[0]
      ;(target || panel).focus()
    })
  }

  function sync() {
    const overlays = visibleOverlays()
    activate(overlays[overlays.length - 1] || null)
  }

  function onKeydown(event: KeyboardEvent) {
    if (!activePanel) return

    if (event.key === 'Escape') {
      const closeControl = findCloseControl(activePanel)
      if (closeControl) {
        event.preventDefault()
        closeControl.click()
      }
      return
    }

    if (event.key !== 'Tab') return
    const items = focusableElements(activePanel)
    if (!items.length) {
      event.preventDefault()
      activePanel.focus()
      return
    }

    const first = items[0]
    const last = items[items.length - 1]
    if (!activePanel.contains(document.activeElement)) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  onMounted(() => {
    const root = rootRef.value
    if (!root) return
    observer = new MutationObserver(sync)
    observer.observe(root, { childList: true, subtree: true })
    document.addEventListener('keydown', onKeydown, true)
    sync()
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    document.removeEventListener('keydown', onKeydown, true)
    restoreBackground()
  })
}
