import { ref, watch } from 'vue'

const THEME_KEY = 'admin-theme'

export function useTheme() {
  const theme = ref(localStorage.getItem(THEME_KEY) || 'light')

  const setTheme = (newTheme) => {
    theme.value = newTheme
    localStorage.setItem(THEME_KEY, newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  const initTheme = () => {
    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  }

  watch(theme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
  }, { immediate: true })

  return {
    theme,
    setTheme,
    toggleTheme,
    initTheme
  }
}
