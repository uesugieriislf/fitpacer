// plan/usePlan.ts — Pinia defineStore：计划生成 + 调整 + 状态

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DayPlan, PlanConfig, CardioRecord } from './storage'
import { loadPlan, savePlan, loadConfig, saveConfig } from './storage'
import { generatePlan, getAdjustOptions, getWeekInfo, getCurrentWeekMonday, formatDate, parseDate, addDays, getNeglectedExercises, ensureDayExercises, moveToSlot } from './planEngine'
import { exportICS, getICSBlobUrl, getICSFile } from './ics'

export const usePlan = defineStore('plan', () => {
  // === 状态 ===
  const plan = ref<DayPlan[]>(loadPlan())
  const currentWeekMonday = ref<string>(getCurrentWeekMonday())
  const showAdjustModal = ref(false)
  const adjustDate = ref<string | null>(null)
  const showCardioModal = ref(false)
  const cardioModalDate = ref<string | null>(null)
  const showStrengthModal = ref(false)
  const strengthModalDate = ref<string | null>(null)

  // === 计算属性 ===
  const weekInfo = computed(() => getWeekInfo(plan.value, currentWeekMonday.value))

  const hasPlan = computed(() => plan.value.length > 0)

  /** 过去一周内被忽视的力量训练动作 */
  const neglectedExercises = computed(() =>
    getNeglectedExercises(plan.value, currentWeekMonday.value)
  )

  /** 本周已完成的有氧总时长（分钟） */
  const weekCardioMinutes = computed(() => {
    const wi = getWeekInfo(plan.value, currentWeekMonday.value)
    if (!wi) return 0
    return wi.days
      .filter(d => d.type === 'cardio' && d.completed && d.cardioRecord)
      .reduce((sum, d) => sum + (d.cardioRecord!.durationMinutes), 0)
  })

  /** 今日训练信息 */
  const todayStr = computed(() => formatDate(new Date()))

  const todayPlan = computed(() =>
    plan.value.find(p => p.date === todayStr.value) ?? null
  )

  /** 连续打卡天数（从今天往前数连续完成的训练日） */
  const streakCount = computed(() => {
    let count = 0
    const today = todayStr.value
    // 从今天往前遍历
    for (let i = plan.value.length - 1; i >= 0; i--) {
      const day = plan.value[i]
      if (day.date > today) continue // 跳过未来
      // 跳过休息日
      if (day.type === 'rest') continue
      // 如果训练日已完成
      if (day.completed) {
        count++
      } else {
        // 遇到未完成的训练日，中断
        break
      }
    }
    return count
  })

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

  /** 确保计划存在：若不存在则自动生成；存在则迁移旧数据（补全 exercises） */
  function ensurePlan() {
    if (plan.value.length === 0) {
      initPlan()
      return
    }
    // 迁移：补全旧数据缺失的 exercises
    let migrated = false
    const updated = plan.value.map(d => {
      if (d.exercises && d.exercises.length > 0) return d
      if (d.type === 'rest') return d
      migrated = true
      return ensureDayExercises(d)
    })
    if (migrated) {
      plan.value = updated
      savePlan(updated)
    }
  }

  // === 标记完成 ===
  function markCompleted(date: string) {
    const day = plan.value.find(p => p.date === date)
    if (!day) return

    // 有氧日：弹出记录弹窗
    if (day.type === 'cardio' && !day.completed) {
      cardioModalDate.value = date
      showCardioModal.value = true
      return
    }

    // 力量日：弹出动作清单弹窗
    if (day.type === 'strength' && !day.completed) {
      strengthModalDate.value = date
      showStrengthModal.value = true
      return
    }

    // 休息日 / 撤销（已完成的任何类型）：直接切换
    plan.value = plan.value.map(p =>
      p.date === date ? { ...p, completed: !p.completed, missed: false } : p
    )
    savePlan(plan.value)
  }

  /** 切换力量训练中单个动作的完成状态 */
  function toggleExercise(date: string, exerciseIndex: number) {
    plan.value = plan.value.map(p => {
      if (p.date !== date) return p
      const exs = [...p.exercises]
      if (exerciseIndex >= 0 && exerciseIndex < exs.length) {
        exs[exerciseIndex] = { ...exs[exerciseIndex], completed: !exs[exerciseIndex].completed }
      }
      return { ...p, exercises: exs }
    })
    savePlan(plan.value)
  }

  /** 保存有氧训练完成记录并标记完成 */
  function saveCardioRecord(date: string, record: CardioRecord) {
    plan.value = plan.value.map(p =>
      p.date === date ? { ...p, cardioRecord: record, completed: true, missed: false } : p
    )
    savePlan(plan.value)
    showCardioModal.value = false
    cardioModalDate.value = null
  }

  /** 关闭有氧完成弹窗（不标记完成） */
  function cancelCardioModal() {
    showCardioModal.value = false
    cardioModalDate.value = null
  }

  /** 保存力量训练完成情况并标记完成 */
  function saveStrengthCompletion(date: string, exercises: typeof plan.value[0]['exercises']) {
    plan.value = plan.value.map(p =>
      p.date === date ? { ...p, exercises, completed: true, missed: false } : p
    )
    savePlan(plan.value)
    showStrengthModal.value = false
    strengthModalDate.value = null
  }

  /** 关闭力量完成弹窗（不标记完成） */
  function cancelStrengthModal() {
    showStrengthModal.value = false
    strengthModalDate.value = null
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

  /** 手动将某天训练推迟到指定空档日 */
  function postponeToDate(fromDate: string, toDate: string) {
    plan.value = moveToSlot(plan.value, fromDate, toDate)
    savePlan(plan.value)
    showAdjustModal.value = false
    adjustDate.value = null
  }

  return {
    // 状态
    plan,
    currentWeekMonday,
    showAdjustModal,
    adjustDate,
    showCardioModal,
    cardioModalDate,
    showStrengthModal,
    strengthModalDate,
    // 计算
    weekInfo,
    hasPlan,
    neglectedExercises,
    weekCardioMinutes,
    todayStr,
    todayPlan,
    streakCount,
    // 方法
    initPlan,
    ensurePlan,
    markCompleted,
    toggleExercise,
    saveCardioRecord,
    cancelCardioModal,
    saveStrengthCompletion,
    cancelStrengthModal,
    skipDay,
    applyAdjustOption,
    cancelAdjust,
    postponeToDate,
    goToWeek,
    goToCurrentWeek,
    handleExportICS,
    handleOpenInCalendar,
    regenerate
  }
})
