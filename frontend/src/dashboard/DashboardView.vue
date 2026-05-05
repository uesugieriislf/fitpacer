<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useDashboard } from './useDashboard'

Chart.register(...registerables)

const store = useDashboard()

// 身体数据表单
const showBodyForm = ref(false)
const formWeight = ref(70)
const formWaist = ref(80)
const formSleep = ref(3)
const formSoreness = ref(2)

// 图表 refs
const weightCanvas = ref<HTMLCanvasElement | null>(null)
const waistCanvas = ref<HTMLCanvasElement | null>(null)
let weightChart: Chart | null = null
let waistChart: Chart | null = null

function openBodyForm() {
  formWeight.value = 70
  formWaist.value = 80
  formSleep.value = 3
  formSoreness.value = 2
  showBodyForm.value = true
}

function submitBodyData() {
  store.addBodyData({
    date: new Date().toISOString().slice(0, 10),
    weight: formWeight.value,
    waist: formWaist.value,
    sleepQuality: formSleep.value,
    soreness: formSoreness.value
  })
  showBodyForm.value = false
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
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, grace: '5%' }
        }
      }
    })
  }
}

onMounted(() => {
  nextTick(renderCharts)
})

watch(() => store.bodyTrend, () => {
  nextTick(renderCharts)
}, { deep: true })

// RPE 标签
const qualityLabels: Record<number, string> = {
  1: '很差', 2: '较差', 3: '一般', 4: '好', 5: '很好'
}
</script>

<template>
  <div class="dashboard-view">
    <h1 class="dashboard-title">📊 数据看板</h1>

    <!-- 周报卡片 -->
    <section class="section">
      <h2 class="section-title">📋 本周概览</h2>
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-value">{{ store.weeklyStats.completionRate }}%</div>
          <div class="stat-label">完成率</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value">{{ store.weeklyStats.completedDays }}/{{ store.weeklyStats.totalTrainingDays }}</div>
          <div class="stat-label">训练日</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value">{{ store.weeklyStats.totalMinutes }}</div>
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
      <div class="chart-container card" v-if="store.bodyTrend.length > 0">
        <h3>体重趋势 (kg)</h3>
        <div class="chart-wrap">
          <canvas ref="weightCanvas"></canvas>
        </div>
      </div>

      <!-- 腰围趋势图 -->
      <div class="chart-container card" v-if="store.bodyTrend.length > 0">
        <h3>腰围趋势 (cm)</h3>
        <div class="chart-wrap">
          <canvas ref="waistCanvas"></canvas>
        </div>
      </div>

      <div v-if="store.bodyTrend.length === 0" class="empty-hint">
        暂无身体数据，点击右上角录入
      </div>

      <!-- 历史数据 -->
      <div class="body-list" v-if="store.bodyData.length > 0">
        <div v-for="item in store.bodyData.slice().reverse().slice(0, 10)" :key="item.id" class="body-card card">
          <div class="body-date">{{ item.date }}</div>
          <div class="body-metrics">
            <span>⚖️ {{ item.weight }} kg</span>
            <span>📏 {{ item.waist }} cm</span>
            <span>😴 {{ qualityLabels[item.sleepQuality] }}</span>
            <span>💢 {{ qualityLabels[item.soreness] }}</span>
          </div>
          <button class="btn btn-sm" @click="store.removeBodyData(item.id)">🗑️</button>
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.stat-card {
  text-align: center;
  padding: 16px 8px;
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
  gap: 8px;
  font-size: 13px;
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
