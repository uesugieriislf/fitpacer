// plan/usePlan.ts — Pinia defineStore：计划生成 + 调整 + 状态

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DayPlan, PlanConfig } from './storage'
import { loadPlan, savePlan, loadConfig, saveConfig } from './storage'
import { generatePlan, getAdjustOptions, getWeekInfo, getCurrentWeekMonday, formatDate, parseDate, addDays } from './planEngine'
import { exportICS, getICSBlobUrl, getICSFile } from './ics'

export const usePlan = defineStore('plan', () => {
  // === 状态 ===
  const plan = ref<DayPlan[]>(loadPlan())
  const currentWeekMonday = ref<string>(getCurrentWeekMonday())
  const showAdjustModal = ref(false)
  const adjustDate = ref<string | null>(null)

  // === 计算属性 ===
  const weekInfo = computed(() => getWeekInfo(plan.value, currentWeekMonday.value))

  const hasPlan = computed(() => plan.value.length > 0)

  // === 初始化计划 ===
  function initPlan(startDate?: string) {
    const config = loadConfig()
    const trainingDays = config?.trainingDays ?? [0, 1, 2, 4, 5] // 默认含周日（周日长有氧）

    const start = startDate ?? getCurrentWeekMonday()
    const planConfig: PlanConfig = { startDate: start, trainingDays }
    const newPlan = generatePlan(planConfig)
    plan.value = newPlan
    savePlan(newPlan)
    saveConfig(planConfig)
  }

  /** 确保计划存在：若不存在则自动生成 */
  function ensurePlan() {
    if (plan.value.length === 0) {
      initPlan()
    }
  }

  // === 标记完成 ===
  function markCompleted(date: string) {
    plan.value = plan.value.map(p =>
      p.date === date ? { ...p, completed: !p.completed, missed: false } : p
    )
    savePlan(plan.value)
  }

  // === 跳过/错过 ===
  function skipDay(date: string) {
    adjustDate.value = date
    showAdjustModal.value = true
  }

  function applyAdjustOption(optionIndex: number) {
    if (!adjustDate.value) return

    const options = getAdjustOptions(plan.value, adjustDate.value)
    if (optionIndex < 0 || optionIndex >= options.length) return

    plan.value = options[optionIndex].apply(plan.value)
    savePlan(plan.value)
    showAdjustModal.value = false
    adjustDate.value = null
  }

  function cancelAdjust() {
    showAdjustModal.value = false
    adjustDate.value = null
  }

  // === 周导航 ===
  function goToWeek(offset: number) {
    const mon = parseDate(currentWeekMonday.value)
    currentWeekMonday.value = formatDate(addDays(mon, offset * 7))
  }

  function goToCurrentWeek() {
    currentWeekMonday.value = getCurrentWeekMonday()
  }

  // === 导出 ===
  function handleExportICS() {
    exportICS(plan.value)
  }

  /** 直接添加到系统日历 / 下载并引导导入 */
  async function handleOpenInCalendar() {
    // 策略 1: navigator.share() — Android 原生分享面板，可直选日历
    if (navigator.share && navigator.canShare) {
      const file = getICSFile(plan.value)
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'FitPacer 训练计划',
            files: [file]
          })
          return // 用户已在分享面板中选择了目标应用
        } catch {
          // 用户取消分享，继续往下尝试
        }
      }
    }

    // 策略 2: window.open blob URL — iOS Safari 会弹出日历导入 sheet
    const url = getICSBlobUrl(plan.value)
    const w = window.open(url, '_blank')
    if (w && !w.closed && typeof w.closed !== 'undefined') {
      // 窗口成功打开（iOS 等），延迟清理 blob URL
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      return
    }

    // 策略 3: 回退到下载（Flyme/Android 等），用户从通知栏点击导入
    URL.revokeObjectURL(url)
    exportICS(plan.value)
  }

  // === 重新生成计划 ===
  function regenerate(config?: Partial<PlanConfig>) {
    const existing = loadConfig()
    const base = existing ?? {
      startDate: getCurrentWeekMonday(),
      trainingDays: [0, 1, 2, 4, 5]
    }
    const merged: PlanConfig = { ...base, ...config }
    plan.value = generatePlan(merged)
    savePlan(plan.value)
    saveConfig(merged)
  }

  return {
    // 状态
    plan,
    currentWeekMonday,
    showAdjustModal,
    adjustDate,
    // 计算
    weekInfo,
    hasPlan,
    // 方法
    initPlan,
    ensurePlan,
    markCompleted,
    skipDay,
    applyAdjustOption,
    cancelAdjust,
    goToWeek,
    goToCurrentWeek,
    handleExportICS,
    handleOpenInCalendar,
    regenerate
  }
})
