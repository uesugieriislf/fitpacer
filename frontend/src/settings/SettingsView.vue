<script setup lang="ts">
import { useSettings } from './useSettings'
import { useTheme } from '../shared/useTheme'
import { weekdayLabels } from '../shared/icons'

const settingsStore = useSettings()
const { theme, toggle: toggleTheme } = useTheme()

const allDays = [0, 1, 2, 3, 4, 5, 6] // Sun-Sat

function onToggleDay(day: number) {
  settingsStore.toggleTrainingDay(day)
}
</script>

<template>
  <div class="settings-view">
    <h1 class="settings-title">⚙️ 设置</h1>

    <!-- 训练天数 -->
    <section class="section">
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
    <section class="section">
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
    <section class="section">
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
    <section class="section about">
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
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  text-align: center;
}

.day-toggle-active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.time-input-row {
  max-width: 200px;
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

.theme-row {
  display: flex;
  gap: 8px;
}

.apply-btn {
  width: 100%;
  padding: 14px;
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
