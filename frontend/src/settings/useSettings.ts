// settings/useSettings.ts — Pinia defineStore：用户偏好管理

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Settings } from './storage'
import { loadSettings, saveSettings } from './storage'
import { usePlan } from '../plan/usePlan'

export const useSettings = defineStore('settings', () => {
  const settings = ref<Settings>(loadSettings())

  // 持久化
  watch(settings, (val) => {
    saveSettings(val)
  }, { deep: true })

  function toggleTrainingDay(day: number) {
    const idx = settings.value.trainingDays.indexOf(day)
    if (idx === -1) {
      settings.value.trainingDays = [...settings.value.trainingDays, day].sort()
    } else {
      settings.value.trainingDays = settings.value.trainingDays.filter(d => d !== day)
    }
  }

  function setSleepReminderTime(time: string) {
    settings.value.sleepReminderTime = time
  }

  /** 应用设置：重新生成计划 */
  function applySettings() {
    const planStore = usePlan()
    planStore.regenerate({ trainingDays: settings.value.trainingDays })
  }

  return {
    settings,
    toggleTrainingDay,
    setSleepReminderTime,
    applySettings
  }
})
