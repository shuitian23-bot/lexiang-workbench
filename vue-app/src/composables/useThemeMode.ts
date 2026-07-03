export function syncThemeMode(isDark: boolean) {
  document.documentElement.classList.toggle('dark-mode', isDark)
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  document.body.classList.toggle('dark-mode', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}
