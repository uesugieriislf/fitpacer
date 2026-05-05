// goal/useGoal.ts — Pinia defineStore：目标跟踪 + BMI 计算

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GoalConfig } from './storage'
import { loadGoal, saveGoal } from './storage'
import { useDashboard } from '../dashboard/useDashboard'

export const useGoal = defineStore('goal', () => {
  const config = ref<GoalConfig>(loadGoal())

  // === 持久化 ===
  function updateConfig(partial: Partial<GoalConfig>) {
    config.value = { ...config.value, ...partial }
    saveGoal(config.value)
  }

  // === 当前体重（来自 Dashboard 的最新身体数据，按 createdAt 取最新） ===
  const currentWeight = computed(() => {
    const dash = useDashboard()
    const sorted = [...dash.bodyData].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return sorted.length > 0 ? sorted[0].weight : null
  })

  // === BMI 计算 ===
  const bmi = computed<number | null>(() => {
    if (currentWeight.value === null || config.value.height <= 0) return null
    const h = config.value.height / 100
    return parseFloat((currentWeight.value / (h * h)).toFixed(1))
  })

  const bmiCategory = computed<string>(() => {
    if (bmi.value === null) return '—'
    if (bmi.value < 18.5) return '偏瘦'
    if (bmi.value < 24) return '正常'
    if (bmi.value < 28) return '偏胖'
    return '肥胖'
  })

  // === 进度计算 ===
  const weightRemaining = computed<number | null>(() => {
    if (currentWeight.value === null) return null
    return parseFloat((currentWeight.value - config.value.targetWeight).toFixed(1))
  })

  const totalToLose = computed(() => {
    return config.value.startWeight - config.value.targetWeight
  })

  const progressPercent = computed<number>(() => {
    if (currentWeight.value === null || totalToLose.value <= 0) return 0
    const lost = config.value.startWeight - currentWeight.value
    return Math.min(100, Math.max(0, Math.round((lost / totalToLose.value) * 100)))
  })

  const isCompleted = computed(() => {
    return currentWeight.value !== null && currentWeight.value <= config.value.targetWeight
  })

  return {
    config,
    updateConfig,
    currentWeight,
    bmi,
    bmiCategory,
    weightRemaining,
    totalToLose,
    progressPercent,
    isCompleted
  }
})
