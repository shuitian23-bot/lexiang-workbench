export function showWorkbenchToast(message: string) {
  if (!message) return

  const toast = document.createElement('div')
  toast.className = 'skill-hub-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  window.setTimeout(() => {
    toast.classList.remove('show')
    window.setTimeout(() => toast.remove(), 220)
  }, 2600)
}
