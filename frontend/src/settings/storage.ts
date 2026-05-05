// settings/storage.ts — localStorage 读写 + 类型定义

export interface Settings {
  trainingDays: number[]     // 0=Sun, 1=Mon, ..., 6=Sat
  sleepReminderTime: string  // 'HH:MM'
}

const SETTINGS_KEY = 'fitpacer_settings'

const DEFAULT_SETTINGS: Settings = {
  trainingDays: [1, 2, 3, 4, 5, 6], // 周一至周六
  sleepReminderTime: '22:00'
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const data = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...data } as Settings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
