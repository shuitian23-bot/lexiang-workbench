import { onBeforeUnmount } from 'vue'

export function useBodyClass(className: string) {
  function add() {
    document.body.classList.add(className)
  }

  function remove() {
    document.body.classList.remove(className)
  }

  function toggle(force?: boolean) {
    document.body.classList.toggle(className, force)
  }

  onBeforeUnmount(remove)

  return { add, remove, toggle }
}
