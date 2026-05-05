<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useDashboard } from './useDashboard'
import { useGoal } from '../goal/useGoal'

Chart.register(...registerables)

const store = useDashboard()
const goalStore = useGoal()

// 睡眠时长格式化 — 精确到 0.1h（6分钟）
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
const formSleep = ref(3)
const formSoreness = ref(2)

// 图表 refs
const weightCanvas = ref<HTMLCanvasElement | null>(null)
const waistCanvas = ref<HTMLCanvasElement | null>(null)
const chartsRendered = ref(false)
let weightChart: Chart | null = null
let waistChart: Chart | null = null

// 统计数字滚动动画
const animatedValues = ref({ completionRate: 0, completedDays: 0, totalMinutes: 0 })
const statsAnimated = ref(false)

function openBodyForm() {
  formWeight.value = goalStore.currentWeight ?? 70
  formWaist.value = 80
  formSleepHours.value = 7
  formSleep.value = 3
  formSoreness.value = 2
  showBodyForm.value = true
}

function submitBodyData() {
  store.addBodyData({
    date: new Date().toISOString().slice(0, 10),
    weight: formWeight.value,
    waist: formWaist.value,
    sleepHours: formSleepHours.value,
    sleepQuality: formSleep.value,
    soreness: formSoreness.value
  })
  showBodyForm.value = false
}

function animateStats() {
  if (statsAnimated.value) return
  statsAnimated.value = true
  const target = store.weeklyStats
  const duration = 800
  const start = performance.now()

  function tick(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    // easeOutCubic
    const ease = 1 - Math.pow(1 - progress, 3)

    animatedValues.value = {
      completionRate: Math.round(target.completionRate * ease),
      completedDays: Math.round(target.completedDays * ease),
      totalMinutes: Math.round(target.totalMinutes * ease)
    }

    if (progress < 1) {
      requestAnimationFrame(tick)
    } else {
      animatedValues.value = {
        completionRate: target.completionRate,
        completedDays: target.completedDays,
        totalMinutes: target.totalMinutes
      }
    }
  }
  requestAnimationFrame(tick)
}

function renderCharts() {
  if (weightCanvas.value) {
    weightChart?.destroy()
    weightChart = new Chart(weightCanvas.value, {
      type: 'line',
      data: store.weightChartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, grace: '5%' }
        }
      }
    })
  }
  if (waistCanvas.value) {
    waistChart?.destroy()
    waistChart = new Chart(waistCanvas.value, {
      type: 'line',
      data: store.waistChartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, grace: '5%' }
        }
      }
    })
  }
  chartsRendered.value = true
}

onMounted(() => {
  nextTick(() => {
    renderCharts()
    animateStats()
  })
})

watch(() => store.bodyTrend, () => {
  nextTick(renderCharts)
}, { deep: true })

watch(() => store.weeklyStats, () => {
  statsAnimated.value = false
  animateStats()
}, { deep: true })

const qualityLabels: Record<number, string> = {
  1: '很差', 2: '较差', 3: '一般', 4: '好', 5: '很好'
}
</script>

<template>
  <div class="dashboard-view view">
    <h1 class="dashboard-title">📊 数据看板</h1>

    <!-- 目标进度 -->
    <section class="section card-stagger">
      <h2 class="section-title">🎯 目标进度</h2>
      <div class="goal-card card" v-if="goalStore.currentWeight !== null">
        <div class="goal-bmi">
          <span class="goal-bmi-value">BMI {{ goalStore.bmi }}</span>
          <span :class="['goal-bmi-badge', 'bmi-badge-' + (
            goalStore.bmi !== null && goalStore.bmi < 24 ? 'normal' :
            goalStore.bmi !== null && goalStore.bmi < 28 ? 'warn' : 'danger'
          )]">{{ goalStore.bmiCategory }}</span>
        </div>

        <div class="goal-progress">
          <div class="goal-row">
            <span>当前体重</span>
            <span class="goal-val">{{ goalStore.currentWeight }} kg</span>
          </div>
          <div class="goal-row">
            <span>目标体重</span>
            <span class="goal-val goal-target">{{ goalStore.config.targetWeight }} kg</span>
          </div>
          <div class="goal-row goal-diff" v-if="goalStore.weightRemaining !== null && goalStore.weightRemaining > 0">
            <span>还需减重</span>
            <span class="goal-val goal-remaining">{{ goalStore.weightRemaining }} kg</span>
          </div>
          <div class="goal-row goal-diff" v-else-if="goalStore.isCompleted">
            <span>🎉 目标达成！</span>
          </div>

          <!-- 进度条 -->
          <div class="progress-bar-track">
            <div
              class="progress-bar-fill"
              :style="{ width: goalStore.progressPercent + '%' }"
            ></div>
          </div>
          <div class="progress-label">
            已完成 {{ goalStore.progressPercent }}%
            <span v-if="goalStore.totalToLose > 0">
              （{{ (goalStore.config.startWeight - (goalStore.currentWeight ?? goalStore.config.startWeight)).toFixed(1) }}/{{ goalStore.totalToLose }} kg）
            </span>
          </div>
        </div>
      </div>

      <div class="goal-card card" v-else>
        <div class="goal-empty">
          <p>还没有身体数据，先录入体重开始追踪目标进度</p>
          <p class="goal-hint">💡 在「设置」中设定身高和目标体重</p>
        </div>
      </div>
    </section>

    <!-- 周报卡片 -->
    <section class="section">
      <h2 class="section-title">📋 本周概览</h2>
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-value chart-fade-in">{{ animatedValues.completionRate }}%</div>
          <div class="stat-label">完成率</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value chart-fade-in">{{ animatedValues.completedDays }}/{{ store.weeklyStats.totalTrainingDays }}</div>
          <div class="stat-label">训练日</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value chart-fade-in">{{ animatedValues.totalMinutes }}</div>
          <div class="stat-label">总时长 (分)</div>
        </div>
      </div>

      <div class="stats-detail card">
        <div class="detail-row">
          <span>💪 力量训练</span>
          <span>{{ store.weeklyStats.strengthMinutes }} 分钟</span>
        </div>
        <div class="detail-row">
          <span>🏃 有氧训练</span>
          <span>{{ store.weeklyStats.cardioMinutes }} 分钟</span>
        </div>
        <div class="detail-row">
          <span>⏭️ 错过训练</span>
          <span>{{ store.weeklyStats.missedDays }} 天</span>
        </div>
      </div>
    </section>

    <!-- 身体数据 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">📏 身体数据</h2>
        <button class="btn btn-primary btn-sm" @click="openBodyForm">➕ 录入</button>
      </div>

      <!-- 体重趋势图 -->
      <div class="chart-container card" v-if="store.bodyTrend.length > 0" :class="{ 'chart-visible': chartsRendered }">
        <h3>体重趋势 (kg)</h3>
        <div class="chart-wrap">
          <canvas ref="weightCanvas"></canvas>
        </div>
      </div>

      <!-- 腰围趋势图 -->
      <div class="chart-container card" v-if="store.bodyTrend.length > 0" :class="{ 'chart-visible': chartsRendered }">
        <h3>腰围趋势 (cm)</h3>
        <div class="chart-wrap">
          <canvas ref="waistCanvas"></canvas>
        </div>
      </div>

      <div v-if="store.bodyTrend.length === 0" class="empty-hint">
        暂无身体数据，点击右上角录入
      </div>

      <!-- 历史数据 -->
      <div class="body-list card-stagger" v-if="store.bodyData.length > 0">
        <div
          v-for="item in store.bodyData.slice().reverse().slice(0, 10)"
          :key="item.id"
          class="body-card card"
        >
          <div class="body-date">{{ item.date }}</div>
          <div class="body-metrics">
            <span>⚖️ {{ item.weight }} kg</span>
            <span>📏 {{ item.waist }} cm</span>
            <span class="sleep-display">😴 {{ formatSleepHours(item.sleepHours ?? 0) }}</span>
            <span>💢 {{ qualityLabels[item.soreness] ?? '' }}</span>
          </div>
          <button class="btn btn-sm delete-btn" @click="store.removeBodyData(item.id)">🗑️</button>
        </div>
      </div>
    </section>

    <!-- 录入表单 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showBodyForm" @click.self="showBodyForm = false">
        <div class="modal-content card">
          <h3>录入身体数据</h3>

          <div class="form-field">
            <div class="label">晨起体重 (kg)</div>
            <input type="number" v-model.number="formWeight" class="text-input" step="0.1" min="30" max="200" />
          </div>

          <div class="form-field">
            <div class="label">腰围 (cm)</div>
            <input type="number" v-model.number="formWaist" class="text-input" step="0.1" min="40" max="150" />
          </div>

          <div class="form-field">
            <div class="label">睡眠时长</div>
            <div class="sleep-input-row">
              <div class="stepper">
                <button class="btn btn-sm" @click="formSleepHours = Math.max(1, +(formSleepHours - 0.1).toFixed(1))">−</button>
                <span class="stepper-val sleep-stepper-val">{{ formatSleepHours(formSleepHours) }}</span>
                <button class="btn btn-sm" @click="formSleepHours = Math.min(16, +(formSleepHours + 0.1).toFixed(1))">+</button>
              </div>
              <span class="sleep-precise-val">{{ formSleepHours.toFixed(1) }}h</span>
            </div>
            <div class="rpe-marks">
              <span>不足</span>
              <span>7-9h 最佳</span>
              <span>过多</span>
            </div>
          </div>

          <div class="form-field">
            <div class="label">睡眠质量 — {{ qualityLabels[formSleep] }}</div>
            <input type="range" min="1" max="5" v-model.number="formSleep" class="slider" />
            <div class="rpe-marks">
              <span>1 很差</span>
              <span>3 一般</span>
              <span>5 很好</span>
            </div>
          </div>

          <div class="form-field">
            <div class="label">肌肉酸痛度 — {{ qualityLabels[formSoreness] }}</div>
            <input type="range" min="1" max="5" v-model.number="formSoreness" class="slider" />
            <div class="rpe-marks">
              <span>1 不酸</span>
              <span>3 适中</span>
              <span>5 很酸</span>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-sm" @click="showBodyForm = false">取消</button>
            <button class="btn btn-primary" @click="submitBodyData">💾 保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dashboard-view {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
}

.dashboard-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 16px;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 12px;
}

/* Goal Card */
.goal-card {
  margin-bottom: 12px;
}

.goal-bmi {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.goal-bmi-value {
  font-size: 20px;
  font-weight: 700;
  animation: countUp 0.4s var(--ease-out);
}

.goal-bmi-badge {
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  animation: bounceIn 0.4s var(--ease-bounce);
}

.bmi-badge-normal {
  background: var(--color-primary);
  color: white;
}

.bmi-badge-warn {
  background: #FF9800;
  color: white;
}

.bmi-badge-danger {
  background: #F44336;
  color: white;
}

.goal-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.goal-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.goal-val {
  font-weight: 600;
}

.goal-target {
  color: var(--color-primary);
}

.goal-remaining {
  color: #FF9800;
}

.goal-diff {
  padding-top: 4px;
  border-top: 1px solid var(--color-border);
}

.progress-bar-track {
  height: 10px;
  background: var(--color-border);
  border-radius: 5px;
  overflow: hidden;
  margin-top: 6px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #81C784);
  border-radius: 5px;
  transition: width 0.6s var(--ease-out);
  animation: fillBar 0.6s var(--ease-out);
}

.progress-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: right;
}

.goal-empty {
  text-align: center;
  padding: 16px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.goal-hint {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.7;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.stat-card {
  text-align: center;
  padding: 16px 8px;
  transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration) var(--ease-out);
}

.stat-card:active {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.stats-detail {
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.detail-row + .detail-row {
  border-top: 1px solid var(--color-border);
}

.chart-container {
  margin-bottom: 12px;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out);
}

.chart-visible {
  opacity: 1;
  transform: translateY(0);
}

.chart-container h3 {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.chart-wrap {
  height: 180px;
}

.empty-hint {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 24px 0;
}

.body-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.body-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  overflow: hidden;
}

.body-date {
  font-size: 13px;
  color: var(--color-text-secondary);
  min-width: 80px;
}

.body-metrics {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 13px;
}

.sleep-display {
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 1px 8px;
  border-radius: 10px;
}

/* Sleep input */
.sleep-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sleep-stepper-val {
  min-width: 90px;
  font-size: 17px;
}

.sleep-precise-val {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* Delete btn */
.delete-btn {
  color: var(--color-danger);
  opacity: 0.5;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.delete-btn:active {
  opacity: 1;
}

/* Form */
.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 15px;
  outline: none;
}

.text-input:focus {
  border-color: var(--color-primary);
}

.form-field {
  margin-bottom: 16px;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stepper-val {
  font-size: 20px;
  font-weight: 700;
  min-width: 48px;
  text-align: center;
}

.slider {
  width: 100%;
  accent-color: var(--color-primary);
}

.rpe-marks {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  border-radius: 16px 16px 0 0;
  padding: 24px;
}

.modal-content h3 {
  margin-bottom: 16px;
}
</style>