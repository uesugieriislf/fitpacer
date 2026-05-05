// dashboard/useDashboard.ts — Pinia defineStore：数据聚合 + 图表数据

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BodyData } from './storage'
import { loadBodyData, saveBodyData, generateId } from './storage'
import { usePlan } from '../plan/usePlan'
import { useRecord } from '../record/useRecord'

export const useDashboard = defineStore('dashboard', () => {
  const bodyData = ref<BodyData[]>(loadBodyData())

  // === 身体数据 CRUD ===
  function addBodyData(entry: Omit<BodyData, 'id'>) {
    const item: BodyData = { id: generateId(), ...entry }
    bodyData.value = [...bodyData.value, item]
    saveBodyData(bodyData.value)
  }

  function removeBodyData(id: string) {
    bodyData.value = bodyData.value.filter(d => d.id !== id)
    saveBodyData(bodyData.value)
  }

  // === 周报数据 ===
  const weeklyStats = computed(() => {
    const planStore = usePlan()
    const recordStore = useRecord()
    const plan = planStore.plan

    // 当前周
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const mondayStr = monday.toISOString().slice(0, 10)
    const sundayStr = sunday.toISOString().slice(0, 10)

    // 本周计划中的训练日
    const weekPlan = plan.filter(p => p.date >= mondayStr && p.date <= sundayStr)
    const totalTrainingDays = weekPlan.filter(p => p.type !== 'rest').length
    const completedDays = weekPlan.filter(p => p.completed).length
    const missedDays = weekPlan.filter(p => p.missed).length
    const completionRate = totalTrainingDays > 0
      ? Math.round((completedDays / totalTrainingDays) * 100)
      : 0

    // 统计训练时长（从有氧训练详情中推算）
    let strengthMinutes = 0
    let cardioMinutes = 0
    weekPlan.forEach(day => {
      if (!day.completed) return
      if (day.type === 'strength') {
        strengthMinutes += 45 // 力量训练约 45 分钟
      } else if (day.type === 'cardio') {
        if (day.details.includes('50-60')) {
          cardioMinutes += 55
        } else {
          cardioMinutes += 35
        }
      }
    })

    return {
      totalTrainingDays,
      completedDays,
      missedDays,
      completionRate,
      strengthMinutes,
      cardioMinutes,
      totalMinutes: strengthMinutes + cardioMinutes
    }
  })

  // === 月度趋势数据（近 30 天） ===
  const bodyTrend = computed(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().slice(0, 10)

    return bodyData.value
      .filter(d => d.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  // Chart.js 数据格式
  const weightChartData = computed(() => {
    const trend = bodyTrend.value
    return {
      labels: trend.map(d => d.date.slice(5)), // MM-DD
      datasets: [{
        label: '体重 (kg)',
        data: trend.map(d => d.weight),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }
  })

  const waistChartData = computed(() => {
    const trend = bodyTrend.value
    return {
      labels: trend.map(d => d.date.slice(5)),
      datasets: [{
        label: '腰围 (cm)',
        data: trend.map(d => d.waist),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }
  })

  return {
    bodyData,
    addBodyData,
    removeBodyData,
    weeklyStats,
    bodyTrend,
    weightChartData,
    waistChartData
  }
})
