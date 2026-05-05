<script setup lang="ts">
import { ref } from 'vue'
import { useRecord } from './useRecord'
import { weekdayLabels, strengthExercises, cardioExercises, rpeLabels } from '../shared/icons'

const store = useRecord()

// 表单状态
const showForm = ref(false)
const formAction = ref('')
const formSets = ref(3)
const formReps = ref(10)
const formRpe = ref(5)
const formNote = ref('')

// 自定义动作输入
const customAction = ref('')
const useCustom = ref(false)

// 当前日期字符串
const dateStr = store.selectedDate
const dateObj = new Date(dateStr + 'T00:00:00')

function openForm() {
  formAction.value = ''
  formSets.value = 3
  formReps.value = 10
  formRpe.value = 5
  formNote.value = ''
  customAction.value = ''
  useCustom.value = false
  showForm.value = true
}

function submitRecord() {
  const action = useCustom.value ? customAction.value.trim() : formAction.value
  if (!action) return

  store.createRecord({
    date: store.selectedDate,
    action,
    sets: formSets.value,
    reps: formReps.value,
    rpe: formRpe.value,
    note: formNote.value
  })

  showForm.value = false
}

function changeDate(days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  store.selectDate(d.toISOString().slice(0, 10))
}

function isToday(d: string): boolean {
  return d === new Date().toISOString().slice(0, 10)
}
</script>

<template>
  <div class="record-view view">
    <h1 class="record-title">📝 训练记录</h1>

    <!-- 日期导航 -->
    <div class="date-nav">
      <button class="btn btn-sm nav-arrow" @click="changeDate(-1)">◀</button>
      <div class="date-display">
        <span class="date-main">{{ dateObj.getMonth() + 1 }}/{{ dateObj.getDate() }}</span>
        <span class="date-weekday">周{{ weekdayLabels[dateObj.getDay()] }}</span>
        <span v-if="isToday(dateStr)" class="date-today-badge">今天</span>
      </div>
      <button class="btn btn-sm nav-arrow" @click="changeDate(1)">▶</button>
    </div>

    <!-- 当日记录列表 -->
    <div class="records-list card-stagger">
      <div v-if="store.todayRecords.length === 0" class="empty-state">
        <span class="empty-icon">📝</span>
        <p>暂无记录，点击下方按钮添加</p>
      </div>

      <div
        v-for="rec in store.todayRecords"
        :key="rec.id"
        class="record-card card"
      >
        <div class="record-top">
          <span class="record-action">{{ rec.action }}</span>
          <button class="btn btn-sm record-delete-btn" @click="store.removeRecord(rec.id)">
            🗑️
          </button>
        </div>
        <div class="record-stats">
          <span>💪 {{ rec.sets }} 组 × {{ rec.reps }} 次</span>
          <span class="record-rpe">🎯 RPE {{ rec.rpe }} — {{ rpeLabels[rec.rpe] ?? '' }}</span>
        </div>
        <div class="record-note" v-if="rec.note">💬 {{ rec.note }}</div>
      </div>
    </div>

    <!-- 添加按钮 -->
    <button v-if="!showForm" class="btn btn-primary add-btn" @click="openForm">
      ➕ 添加记录
    </button>

    <!-- 表单 -->
    <div v-if="showForm" class="form-panel card">
      <h3>新训练记录</h3>

      <!-- 动作选择 -->
      <div class="form-field">
        <div class="label">训练动作</div>

        <!-- 预设动作 -->
        <div class="action-chips" v-if="!useCustom">
          <div class="chip-section">
            <span class="chip-label">💪 力量</span>
            <button
              v-for="ex in strengthExercises"
              :key="ex"
              :class="['chip', { 'chip-active': formAction === ex }]"
              @click="formAction = ex"
            >{{ ex }}</button>
          </div>
          <div class="chip-section">
            <span class="chip-label">🏃 有氧</span>
            <button
              v-for="ex in cardioExercises"
              :key="ex"
              :class="['chip', { 'chip-active': formAction === ex }]"
              @click="formAction = ex"
            >{{ ex }}</button>
          </div>
          <button class="btn btn-sm chip-toggle-btn" @click="useCustom = true">
            ✏️ 自定义动作
          </button>
        </div>

        <!-- 自定义动作 -->
        <div v-else class="custom-action-area">
          <input
            v-model="customAction"
            class="text-input"
            placeholder="输入动作名称..."
          />
          <button class="btn btn-sm chip-toggle-btn" @click="useCustom = false">
            ↩️ 使用预设
          </button>
        </div>
      </div>

      <!-- 组数 / 次数 -->
      <div class="form-row">
        <div class="form-field">
          <div class="label">组数</div>
          <div class="stepper">
            <button class="btn btn-sm" @click="formSets = Math.max(1, formSets - 1)">−</button>
            <span class="stepper-val">{{ formSets }}</span>
            <button class="btn btn-sm" @click="formSets = Math.min(10, formSets + 1)">+</button>
          </div>
        </div>
        <div class="form-field">
          <div class="label">次数</div>
          <div class="stepper">
            <button class="btn btn-sm" @click="formReps = Math.max(1, formReps - 1)">−</button>
            <span class="stepper-val">{{ formReps }}</span>
            <button class="btn btn-sm" @click="formReps = Math.min(50, formReps + 1)">+</button>
          </div>
        </div>
      </div>

      <!-- RPE -->
      <div class="form-field">
        <div class="label">RPE {{ formRpe }} — {{ rpeLabels[formRpe] ?? '' }}</div>
        <input
          type="range"
          min="1"
          max="10"
          v-model.number="formRpe"
          class="slider"
        />
        <div class="rpe-marks">
          <span>1 极轻</span>
          <span>5 中等</span>
          <span>10 极限</span>
        </div>
      </div>

      <!-- 备注 -->
      <div class="form-field">
        <div class="label">备注（可选）</div>
        <input
          v-model="formNote"
          class="text-input"
          placeholder="感受、注意事项..."
        />
      </div>

      <!-- 按钮 -->
      <div class="form-actions">
        <button class="btn btn-sm" @click="showForm = false">取消</button>
        <button class="btn btn-primary" @click="submitRecord">💾 保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record-view {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
}

.record-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}

.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.nav-arrow {
  transition: transform var(--duration-fast) var(--ease-out);
}

.nav-arrow:active {
  transform: scale(0.9);
}

.date-display {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: center;
}

.date-main {
  font-size: 18px;
  font-weight: 700;
}

.date-weekday {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.date-today-badge {
  background: var(--color-primary-gradient);
  color: white;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  animation: bounceIn 0.4s var(--ease-bounce);
  box-shadow: 0 1px 4px rgba(46, 125, 81, 0.3);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.record-card {
  transition: all var(--duration) var(--ease-out);
}

.record-card:active {
  transform: scale(0.99);
  box-shadow: var(--shadow-sm);
}

.record-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.record-action {
  font-size: 16px;
  font-weight: 600;
}

.record-delete-btn {
  color: var(--color-danger);
  opacity: 0.4;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.record-delete-btn:active {
  opacity: 1;
}

.record-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.record-rpe {
  color: var(--color-primary);
  font-weight: 600;
}

.record-note {
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-style: italic;
}

.add-btn {
  width: 100%;
  padding: 14px;
  transition: all var(--duration-fast) var(--ease-out);
}

.add-btn:active {
  transform: scale(0.97);
}

/* Form */
.form-panel {
  margin-top: 16px;
  animation: slideUp 0.3s var(--ease-out);
}

.form-panel h3 {
  margin-bottom: 16px;
}

.form-field {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-field {
  flex: 1;
}

.action-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chip-section {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.chip-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  width: 100%;
  margin-bottom: 2px;
}

.chip {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-bg);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}

.chip:active {
  transform: scale(0.95);
}

.chip-active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.chip-toggle-btn {
  margin-top: 4px;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
}

.custom-action-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

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

.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stepper-val {
  font-size: 20px;
  font-weight: 700;
  min-width: 24px;
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

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  animation: fadeIn var(--duration) var(--ease-out);
}

.empty-state .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  display: block;
  animation: float 3s ease-in-out infinite;
}

.empty-state p {
  margin-bottom: 16px;
  font-size: 15px;
}
</style>