// shared/useTheme.ts — 主题切换（亮/暗）

import { ref, watchEffect } from 'vue'

const THEME_KEY = 'fitpacer_theme'

function getSavedTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {}
  // 默认跟随系统偏好
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

const theme = ref<'light' | 'dark'>(getSavedTheme())

// 同步到 DOM
watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  try { localStorage.setItem(THEME_KEY, theme.value) } catch {}
})

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(mode: 'light' | 'dark') {
    theme.value = mode
  }

  return { theme, toggle, setTheme }
}
