<script setup lang="ts">
import { useSettings } from './useSettings'
import { useGoal } from '../goal/useGoal'
import { useTheme } from '../shared/useTheme'
import { weekdayLabels } from '../shared/icons'

const settingsStore = useSettings()
const goalStore = useGoal()
const { theme, toggle: toggleTheme } = useTheme()

const allDays = [0, 1, 2, 3, 4, 5, 6] // Sun-Sat

function onToggleDay(day: number) {
  settingsStore.toggleTrainingDay(day)
}
</script>

<template>
  <div class="settings-view view">
    <h1 class="settings-title">⚙️ 设置</h1>

    <!-- 目标设定 -->
    <section class="section card-stagger">
      <h2 class="section-title">🎯 减重目标</h2>
      <p class="section-desc">设定目标参数，看板会实时追踪进度和 BMI</p>

      <div class="form-field">
        <div class="label">身高 (cm)</div>
        <input
          type="number"
          :value="goalStore.config.height"
          @input="goalStore.updateConfig({ height: parseFloat(($event.target as HTMLInputElement).value) || 170 })"
          class="text-input"
          step="1"
          min="100"
          max="250"
        />
      </div>

      <div class="form-row">
        <div class="form-field">
          <div class="label">起始体重 (kg)</div>
          <input
            type="number"
            :value="goalStore.config.startWeight"
            @input="goalStore.updateConfig({ startWeight: parseFloat(($event.target as HTMLInputElement).value) || 80 })"
            class="text-input"
            step="0.1"
            min="30"
            max="200"
          />
        </div>
        <div class="form-field">
          <div class="label">目标体重 (kg)</div>
          <input
            type="number"
            :value="goalStore.config.targetWeight"
            @input="goalStore.updateConfig({ targetWeight: parseFloat(($event.target as HTMLInputElement).value) || 65 })"
            class="text-input"
            step="0.1"
            min="30"
            max="200"
          />
        </div>
      </div>

      <div class="goal-preview card" v-if="goalStore.currentWeight !== null">
        <div class="preview-row">
          <span>当前体重</span>
          <span class="preview-val">{{ goalStore.currentWeight }} kg</span>
        </div>
        <div class="preview-row">
          <span>BMI</span>
          <span class="preview-val">{{ goalStore.bmi }} — {{ goalStore.bmiCategory }}</span>
        </div>
        <div class="preview-row" v-if="goalStore.weightRemaining !== null && goalStore.weightRemaining > 0">
          <span>还需减重</span>
          <span class="preview-val preview-remaining">{{ goalStore.weightRemaining }} kg</span>
        </div>
      </div>
    </section>

    <!-- 训练天数 -->
    <section class="section card-stagger">
      <h2 class="section-title">训练日</h2>
      <p class="section-desc">选择允许安排训练的日期（当前为「力量+有氧混合」模式）</p>
      <div class="day-toggles">
        <button
          v-for="day in allDays"
          :key="day"
          :class="[
            'day-toggle',
            { 'day-toggle-active': settingsStore.settings.trainingDays.includes(day) }
          ]"
          @click="onToggleDay(day)"
        >
          周{{ weekdayLabels[day] }}
        </button>
      </div>
    </section>

    <!-- 睡眠提醒 -->
    <section class="section card-stagger">
      <h2 class="section-title">😴 睡眠提醒</h2>
      <p class="section-desc">设定提醒时间（仅页面提示，不会触发系统闹钟）</p>
      <div class="time-input-row">
        <input
          type="time"
          :value="settingsStore.settings.sleepReminderTime"
          @change="settingsStore.setSleepReminderTime(($event.target as HTMLInputElement).value)"
          class="text-input"
        />
      </div>
    </section>

    <!-- 主题 -->
    <section class="section card-stagger">
      <h2 class="section-title">🎨 主题</h2>
      <div class="theme-row">
        <button
          :class="['btn', theme === 'light' ? 'btn-primary' : 'btn-outline']"
          @click="toggleTheme"
        >
          {{ theme === 'dark' ? '🌙 深色模式' : '☀️ 浅色模式' }}
        </button>
      </div>
    </section>

    <!-- 应用设置按钮 -->
    <section class="section">
      <button class="btn btn-primary apply-btn" @click="settingsStore.applySettings">
        🔄 应用设置并重新生成计划
      </button>
    </section>

    <!-- 关于 -->
    <section class="section about card-stagger">
      <h2 class="section-title">ℹ️ 关于</h2>
      <p>FitPacer — 极简智能的个人训练助手</p>
      <p class="version">v1.0.0 | PWA 离线可用</p>
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
}

.settings-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 20px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 4px;
}

.section-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.form-field {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-field {
  flex: 1;
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

.label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.goal-preview {
  margin-top: 8px;
  transition: all var(--duration) var(--ease-out);
}

.goal-preview:active {
  transform: scale(0.99);
  box-shadow: var(--shadow-sm);
}

.preview-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
}

.preview-row + .preview-row {
  border-top: 1px solid var(--color-border);
}

.preview-val {
  font-weight: 600;
}

.preview-remaining {
  color: #FF9800;
}

.day-toggles {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.day-toggle {
  flex: 1;
  min-width: 44px;
  padding: 10px 8px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
  text-align: center;
}

.day-toggle:active {
  transform: scale(0.95);
}

.day-toggle-active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(46, 125, 81, 0.3);
}

.time-input-row {
  max-width: 200px;
}

.theme-row {
  display: flex;
  gap: 8px;
}

.apply-btn {
  width: 100%;
  padding: 14px;
  transition: all var(--duration-fast) var(--ease-out);
}

.apply-btn:active {
  transform: scale(0.97);
  box-shadow: none;
}

.about {
  opacity: 0.6;
}

.about p {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.version {
  margin-top: 4px;
  font-size: 12px;
}
</style>