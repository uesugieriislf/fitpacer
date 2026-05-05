<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useDashboard } from './useDashboard'
import { useGoal } from '../goal/useGoal'

Chart.register(...registerables)

const store = useDashboard()
const goalStore = useGoal()

// 睡眠时长格式化
function formatSleepHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}分钟`
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}

// 身体数据表单
const showBodyForm = ref(false)
const formWeight = ref(70)
const formWaist = ref(80)
const formSleepHours = ref(7)
const formSleepMinutes = ref(0)
const formSleepQuality = ref(3)
const formSoreness = ref(2)

// 滚动选择器 refs
const hoursPicker = ref<HTMLDivElement | null>(null)
const minutesPicker = ref<HTMLDivElement | null>(null)

// 小时列表 1-16
const hoursList = Array.from({ length: 16 }, (_, i) => i + 1)
// 分钟列表：0, 10, 20, 30, 40, 50
const minutesList = [0, 10, 20, 30, 40, 50]

function openBodyForm() {
  formWeight.value = goalStore.currentWeight ?? 70
  formWaist.value = 80
  const total = formSleepHours.value + formSleepMinutes.value / 60
  const h = Math.floor(total)
  const m = Math.round((total - h) * 60)
  formSleepHours.value = Math.max(1, Math.min(16, h || 7))
  formSleepMinutes.value = m % 10 < 5 ? Math.floor(m / 10) * 10 : Math.round(m / 10) * 10
  if (formSleepMinutes.value >= 60) { formSleepMinutes.value -= 60; formSleepHours.value++ }
  formSleepQuality.value = 3
  formSoreness.value = 2
  showBodyForm.value = true
  nextTick(() => {
    scrollPickerTo(hoursPicker.value, formSleepHours.value - 1)
    scrollPickerTo(minutesPicker.value, formSleepMinutes.value / 10)
  })
}

function scrollPickerTo(el: HTMLElement | null, index: number) {
  if (!el) return
  const itemH = 48
  el.scrollTop = index * itemH
}

function onHoursScroll() {
  if (!hoursPicker.value) return
  const idx = Math.round(hoursPicker.value.scrollTop / 48)
  formSleepHours.value = Math.max(1, Math.min(16, idx + 1))
}

function onMinutesScroll() {
  if (!minutesPicker.value) return
  const idx = Math.round(minutesPicker.value.scrollTop / 48)
  formSleepMinutes.value = Math.min(50, Math.max(0, idx * 10))
}

const totalSleepHours = () => {
  return parseFloat((formSleepHours.value + formSleepMinutes.value / 60).toFixed(1))
}

function submitBodyData() {
  store.addBodyData({
    date: new Date().toISOString().slice(0, 10),
    weight: formWeight.value,
    waist: formWaist.value,
    sleepHours: totalSleepHours(),
    sleepQuality: formSleepQuality.value,
    soreness: formSoreness.value
  })
  showBodyForm.value = false
}

// 图表
const weightCanvas = ref<HTMLCanvasElement | null>(null)
const waistCanvas = ref<HTMLCanvasElement | null>(null)
const chartsRendered = ref(false)
let weightChart: Chart | null = null
let waistChart: Chart | null = null

// 统计动画
const animatedValues = ref({ completionRate: 0, completedDays: 0, totalMinutes: 0 })
const statsAnimated = ref(false)

function animateStats() {
  if (statsAnimated.value) return
  statsAnimated.value = true
  const target = store.weeklyStats
  const duration = 800
  const start = performance.now()

  function tick(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)

    animatedValues.value = {
      completionRate: Math.round(target.completionRate * ease),
      completedDays: Math.round(target.completedDays * ease),
      totalMinutes: Math.round(target.totalMinutes * ease)
    }

    if (progress < 1) {
      requestAnimationFrame(tick)
    } else {
      animatedValues.value = target
    }
  }
  requestAnimationFrame(tick)
}

function renderCharts() {
  const chartColors = {
    weight: '#2BA245',
    weightBg: 'rgba(43, 162, 69, 0.08)',
    waist: '#FF6B35',
    waistBg: 'rgba(255, 107, 53, 0.08)'
  }

  if (weightCanvas.value) {
    weightChart?.destroy()
    weightChart = new Chart(weightCanvas.value, {
      type: 'line',
      data: {
        labels: store.weightChartData.labels,
        datasets: [{
          ...store.weightChartData.datasets[0],
          borderColor: chartColors.weight,
          backgroundColor: chartColors.weightBg,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: chartColors.weight,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: false, grace: '8%',
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 0 }
          }
        }
      }
    })
  }
  if (waistCanvas.value) {
    waistChart?.destroy()
    waistChart = new Chart(waistCanvas.value, {
      type: 'line',
      data: {
        labels: store.waistChartData.labels,
        datasets: [{
          ...store.waistChartData.datasets[0],
          borderColor: chartColors.waist,
          backgroundColor: chartColors.waistBg,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: chartColors.waist,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: false, grace: '8%',
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 0 }
          }
        }
      }
    })
  }
  chartsRendered.value = true
}

onMounted(() => nextTick(() => { renderCharts(); animateStats() }))
watch(() => store.bodyTrend, () => nextTick(renderCharts), { deep: true })
watch(() => store.weeklyStats, () => { statsAnimated.value = false; animateStats() }, { deep: true })

const qualityLabels: Record<number, string> = {
  1: '很差', 2: '较差', 3: '一般', 4: '好', 5: '很好'
}
</script>

<template>
  <div class="view">
    <h1 class="view-title">数据看板</h1>

    <!-- 目标进度 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">目标进度</h2>
        <span v-if="goalStore.isCompleted" class="goal-done-badge">🎉 达成</span>
      </div>

      <div class="goal-hero card card-elevated" v-if="goalStore.currentWeight !== null">
        <div class="goal-hero-top">
          <div class="goal-bmi-block">
            <div class="goal-bmi-number">{{ goalStore.bmi }}</div>
            <div class="goal-bmi-label">BMI</div>
          </div>
          <div class="goal-weight-block">
            <div class="goal-weight-current">{{ goalStore.currentWeight }}<span class="goal-unit"> kg</span></div>
            <div class="goal-weight-target">目标 {{ goalStore.config.targetWeight }} kg</div>
          </div>
        </div>

        <div class="goal-progress-bar">
          <div class="goal-progress-track">
            <div class="goal-progress-fill" :style="{ width: goalStore.progressPercent + '%' }"></div>
          </div>
          <div class="goal-progress-meta">
            <span>{{ goalStore.progressPercent }}%</span>
            <span v-if="goalStore.weightRemaining !== null && goalStore.weightRemaining > 0">
              还差 {{ goalStore.weightRemaining }} kg
            </span>
            <span v-else-if="goalStore.isCompleted">已达成</span>
          </div>
        </div>
      </div>

      <div class="goal-hero card" v-else>
        <div class="empty-state">
          <span class="empty-icon">📊</span>
          <p>还没有身体数据</p>
          <p class="section-desc">💡 在「设置」中设定身高和目标体重，然后录入体重开始追踪</p>
        </div>
      </div>
    </section>

    <!-- 周报卡片 -->
    <section class="section">
      <h2 class="section-title">本周概览</h2>
      <div class="stats-row">
        <div class="stat-item card">
          <div class="stat-number">{{ animatedValues.completionRate }}%</div>
          <div class="stat-label">完成率</div>
        </div>
        <div class="stat-item card">
          <div class="stat-number">{{ animatedValues.completedDays }}/{{ store.weeklyStats.totalTrainingDays }}</div>
          <div class="stat-label">训练日</div>
        </div>
        <div class="stat-item card">
          <div class="stat-number">{{ animatedValues.totalMinutes }}</div>
          <div class="stat-label">分钟</div>
        </div>
      </div>

      <div class="stats-breakdown card">
        <div class="breakdown-row">
          <span>💪 力量训练</span>
          <span class="breakdown-val">{{ store.weeklyStats.strengthMinutes }} 分钟</span>
        </div>
        <div class="breakdown-row">
          <span>🏃 有氧训练</span>
          <span class="breakdown-val">{{ store.weeklyStats.cardioMinutes }} 分钟</span>
        </div>
        <div class="breakdown-row">
          <span>⏭️ 错过训练</span>
          <span class="breakdown-val">{{ store.weeklyStats.missedDays }} 天</span>
        </div>
      </div>
    </section>

    <!-- 身体数据 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">身体数据</h2>
        <button class="btn btn-primary btn-sm" @click="openBodyForm">+ 录入</button>
      </div>

      <div class="chart-card card card-elevated" v-if="store.bodyTrend.length > 0" :class="{ 'chart-visible': chartsRendered }">
        <div class="chart-header">
          <span class="chart-dot chart-dot-green"></span>
          <span>体重趋势</span>
          <span class="chart-unit">kg</span>
        </div>
        <div class="chart-body"><canvas ref="weightCanvas"></canvas></div>
      </div>

      <div class="chart-card card card-elevated" v-if="store.bodyTrend.length > 0" :class="{ 'chart-visible': chartsRendered }">
        <div class="chart-header">
          <span class="chart-dot chart-dot-orange"></span>
          <span>腰围趋势</span>
          <span class="chart-unit">cm</span>
        </div>
        <div class="chart-body"><canvas ref="waistCanvas"></canvas></div>
      </div>

      <div v-if="store.bodyTrend.length === 0" class="empty-state">
        <span class="empty-icon">📏</span>
        <p>暂无身体数据，点击右上角录入</p>
      </div>

      <div class="body-list card-stagger" v-if="store.bodyData.length > 0">
        <div v-for="item in store.bodyData.slice().reverse().slice(0, 10)" :key="item.id" class="body-item card">
          <div class="body-item-date">{{ item.date.slice(5) }}</div>
          <div class="body-item-metrics">
            <span class="body-metric">⚖️ {{ item.weight }} kg</span>
            <span class="body-metric">📏 {{ item.waist }} cm</span>
            <span class="body-metric body-metric-sleep">😴 {{ formatSleepHours(item.sleepHours ?? 0) }}</span>
          </div>
          <button class="btn btn-sm btn-ghost body-del" @click="store.removeBodyData(item.id)">✕</button>
        </div>
      </div>
    </section>

    <!-- 录入表单 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showBodyForm" @click.self="showBodyForm = false">
        <div class="modal-content">
          <h3>录入身体数据</h3>

          <div class="form-row">
            <div class="form-field form-field-half">
              <div class="label">晨起体重</div>
              <input type="number" v-model.number="formWeight" class="text-input" step="0.1" min="30" max="200" />
              <span class="input-suffix">kg</span>
            </div>
            <div class="form-field form-field-half">
              <div class="label">腰围</div>
              <input type="number" v-model.number="formWaist" class="text-input" step="0.1" min="40" max="150" />
              <span class="input-suffix">cm</span>
            </div>
          </div>

          <!-- 睡眠选择器 -->
          <div class="form-field">
            <div class="label">睡眠时长</div>
            <div class="picker-overlay">
              <div class="picker-mask picker-mask-top"></div>
              <div class="picker-mask picker-mask-bottom"></div>
              <div class="picker-indicator"></div>
              <div class="picker-row">
                <!-- 小时 -->
                <div class="picker-col" ref="hoursPicker" @scroll.passive="onHoursScroll">
                  <div class="picker-col-inner">
                    <div
                      v-for="h in hoursList" :key="h"
                      class="picker-item"
                      :class="{ 'picker-item-active': h === formSleepHours }"
                      @click="formSleepHours = h; scrollPickerTo(hoursPicker as any, h - 1)"
                    >{{ h }} 时</div>
                  </div>
                </div>
                <!-- 分钟 -->
                <div class="picker-col" ref="minutesPicker" @scroll.passive="onMinutesScroll">
                  <div class="picker-col-inner">
                    <div
                      v-for="m in minutesList" :key="m"
                      class="picker-item"
                      :class="{ 'picker-item-active': m === formSleepMinutes }"
                      @click="formSleepMinutes = m; scrollPickerTo(minutesPicker as any, m / 10)"
                    >{{ String(m).padStart(2, '0') }} 分</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="picker-summary">{{ formatSleepHours(totalSleepHours()) }}</div>
          </div>

          <div class="form-field">
            <div class="label">睡眠质量 — {{ qualityLabels[formSleepQuality] }}</div>
            <input type="range" min="1" max="5" v-model.number="formSleepQuality" class="slider" />
            <div class="rpe-marks">
              <span>很差</span><span>一般</span><span>很好</span>
            </div>
          </div>

          <div class="form-field">
            <div class="label">肌肉酸痛度 — {{ qualityLabels[formSoreness] }}</div>
            <input type="range" min="1" max="5" v-model.number="formSoreness" class="slider" />
            <div class="rpe-marks">
              <span>不酸</span><span>适中</span><span>很酸</span>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-ghost" @click="showBodyForm = false">取消</button>
            <button class="btn btn-primary" @click="submitBodyData">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.view {
  flex: 1; overflow-y: auto; padding: 24px 20px; padding-bottom: 100px;
}

.view-title {
  font-size: 28px; font-weight: 700; margin-bottom: 24px; letter-spacing: -0.5px;
}

.section { margin-bottom: 32px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 20px; font-weight: 650; letter-spacing: -0.3px; }
.section-desc { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }

/* Goal hero */
.goal-done-badge {
  background: var(--color-primary-gradient); color: #fff;
  padding: 3px 14px; border-radius: 20px; font-size: 13px; font-weight: 700;
  animation: bounceIn 0.5s var(--ease-bounce);
}

.goal-hero { padding: 22px; }
.goal-hero-top { display: flex; gap: 20px; align-items: center; margin-bottom: 18px; }

.goal-bmi-block {
  background: var(--color-primary-bg);
  border-radius: var(--radius); padding: 16px 18px; text-align: center; min-width: 80px;
}
.goal-bmi-number { font-size: 32px; font-weight: 800; color: var(--color-primary); line-height: 1.1; }
.goal-bmi-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; font-weight: 600; }

.goal-weight-block { flex: 1; }
.goal-weight-current { font-size: 36px; font-weight: 800; line-height: 1.1; }
.goal-unit { font-size: 18px; font-weight: 600; color: var(--color-text-secondary); }
.goal-weight-target { font-size: 14px; color: var(--color-text-secondary); margin-top: 4px; }

.goal-progress-bar { }
.goal-progress-track {
  height: 8px; background: var(--color-border-light); border-radius: 4px; overflow: hidden;
}
.goal-progress-fill {
  height: 100%; background: var(--color-primary-gradient); border-radius: 4px;
  transition: width 0.7s var(--ease-out); animation: fillRight 0.7s var(--ease-out);
  min-width: 0;
}
.goal-progress-meta {
  display: flex; justify-content: space-between; margin-top: 8px;
  font-size: 12px; color: var(--color-text-secondary); font-weight: 500;
}

/* Stats */
.stats-row { display: flex; gap: 8px; margin-bottom: 12px; }
.stat-item { flex: 1; text-align: center; padding: 16px 8px; }
.stat-number { font-size: 24px; font-weight: 800; color: var(--color-primary); }
.stat-label { font-size: 11px; color: var(--color-text-secondary); margin-top: 4px; font-weight: 600; }

.stats-breakdown { }
.breakdown-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; }
.breakdown-row + .breakdown-row { border-top: 1px solid var(--color-border-light); }
.breakdown-val { font-weight: 600; }

/* Charts */
.chart-card { margin-bottom: 12px; opacity: 0; transform: translateY(20px);
  transition: all 0.5s var(--ease-out); }
.chart-visible { opacity: 1; transform: translateY(0); }
.chart-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  font-size: 14px; font-weight: 600; }
.chart-dot { width: 10px; height: 10px; border-radius: 50%; }
.chart-dot-green { background: var(--color-primary); }
.chart-dot-orange { background: var(--color-accent); }
.chart-unit { margin-left: auto; font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }
.chart-body { height: 180px; }

/* Body list */
.body-list { display: flex; flex-direction: column; gap: 8px; }
.body-item { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
.body-item-date { font-size: 13px; color: var(--color-text-secondary); min-width: 48px; font-weight: 500; }
.body-item-metrics { flex: 1; display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 13px; }
.body-metric { font-weight: 500; }
.body-metric-sleep { background: var(--color-primary-bg); color: var(--color-primary);
  padding: 2px 10px; border-radius: 10px; font-weight: 600; }
.body-del { font-size: 16px; color: var(--color-text-tertiary); padding: 4px 8px; }

/* Form */
.form-row { display: flex; gap: 12px; margin-bottom: 16px; }
.form-field-half { flex: 1; position: relative; }
.input-suffix { position: absolute; right: 14px; top: 38px; font-size: 13px;
  color: var(--color-text-secondary); pointer-events: none; }

.form-field { margin-bottom: 20px; }

.picker-summary {
  text-align: center; margin-top: 12px; font-size: 18px; font-weight: 700;
  color: var(--color-primary);
}

.empty-state { text-align: center; padding: 32px 24px; color: var(--color-text-secondary);
  animation: fadeInUp 0.4s var(--ease-out); }
.empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; display: block;
  animation: float 3s ease-in-out infinite; }
.empty-state p { margin-bottom: 12px; font-size: 14px; color: var(--color-text-secondary); }
</style>