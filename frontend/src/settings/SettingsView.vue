<script setup lang="ts">
import { useSettings } from './useSettings'
import { useGoal } from '../goal/useGoal'
import { useTheme } from '../shared/useTheme'
import { weekdayLabels } from '../shared/icons'

const settingsStore = useSettings()
const goalStore = useGoal()
const { theme, toggle: toggleTheme } = useTheme()
const allDays = [0, 1, 2, 3, 4, 5, 6]

function onToggleDay(day: number) { settingsStore.toggleTrainingDay(day) }
</script>

<template>
  <div class="view">
    <div class="view-header">
      <h1 class="view-title">设置</h1>
    </div>

    <div class="view-body">
    <section class="section">
      <div class="section-title-row">
        <h2 class="section-title">减重目标</h2>
      </div>
      <p class="section-desc">设定目标参数，看板会实时追踪进度和 BMI</p>

      <div class="form-field">
        <div class="label">身高</div>
        <div class="input-with-unit">
          <input type="number" :value="goalStore.config.height"
            @input="goalStore.updateConfig({ height: parseFloat(($event.target as HTMLInputElement).value) || 170 })"
            class="text-input" step="1" min="100" max="250" />
          <span class="unit">cm</span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <div class="label">起始体重</div>
          <div class="input-with-unit">
            <input type="number" :value="goalStore.config.startWeight"
              @input="goalStore.updateConfig({ startWeight: parseFloat(($event.target as HTMLInputElement).value) || 80 })"
              class="text-input" step="0.1" min="30" max="200" />
            <span class="unit">kg</span>
          </div>
        </div>
        <div class="form-field">
          <div class="label">目标体重</div>
          <div class="input-with-unit">
            <input type="number" :value="goalStore.config.targetWeight"
              @input="goalStore.updateConfig({ targetWeight: parseFloat(($event.target as HTMLInputElement).value) || 65 })"
              class="text-input" step="0.1" min="30" max="200" />
            <span class="unit">kg</span>
          </div>
        </div>
      </div>

      <div class="preview-card card" v-if="goalStore.currentWeight !== null">
        <div class="preview-row">
          <span>当前体重</span><span class="preview-val">{{ goalStore.currentWeight }} kg</span>
        </div>
        <div class="preview-row">
          <span>BMI</span><span class="preview-val">{{ goalStore.bmi }} — {{ goalStore.bmiCategory }}</span>
        </div>
        <div class="preview-row" v-if="goalStore.weightRemaining !== null && goalStore.weightRemaining > 0">
          <span>还需减重</span><span class="preview-val remaining">{{ goalStore.weightRemaining }} kg</span>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">训练日</h2>
      <p class="section-desc">选择允许安排训练的日期</p>
      <div class="day-toggles">
        <button v-for="day in allDays" :key="day"
          :class="['day-toggle', { on: settingsStore.settings.trainingDays.includes(day) }]"
          @click="onToggleDay(day)">周{{ weekdayLabels[day] }}</button>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">睡眠提醒</h2>
      <p class="section-desc">设定提醒时间（页面提示）</p>
      <div class="time-row">
        <input type="time" :value="settingsStore.settings.sleepReminderTime"
          @change="settingsStore.setSleepReminderTime(($event.target as HTMLInputElement).value)" class="text-input time-input" />
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">主题</h2>
      <div class="theme-row">
        <button :class="['btn', theme === 'light' ? 'btn-primary' : 'btn-outline']" @click="toggleTheme">
          {{ theme === 'dark' ? '🌙 深色' : '☀️ 浅色' }}
        </button>
      </div>
    </section>

    <section class="section">
      <button class="btn btn-primary apply-btn" @click="settingsStore.applySettings">
        应用设置并重新生成计划
      </button>
    </section>

    <section class="section about">
      <p>FitPacer — 极简智能个人训练助手</p>
      <p class="version">v1.0 · PWA</p>
    </section>
    </div>
  </div>
</template>

<style scoped>
.view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.view-header { flex-shrink: 0; padding: 16px 16px 0; }
.view-body { flex: 1; overflow-y: auto; padding: 8px 16px 0; }
.view-title { font-size: 24px; font-weight: 700; letter-spacing: -0.4px; }
.section { margin-bottom: 24px; }
.section-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.section-title { font-size: 20px; font-weight: 650; letter-spacing: -0.3px; }
.section-desc { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }

.form-field { margin-bottom: 18px; }
.form-row { display: flex; gap: 12px; }
.form-row .form-field { flex: 1; }
.input-with-unit { position: relative; }
.input-with-unit .text-input { padding-right: 40px; }
.unit { position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  font-size: 13px; color: var(--color-text-secondary); pointer-events: none; font-weight: 500; }

.preview-card { margin-top: 8px; }
.preview-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
.preview-row + .preview-row { border-top: 1px solid var(--color-border-light); }
.preview-val { font-weight: 600; }
.remaining { color: var(--color-accent); }

.day-toggles { display: flex; gap: 6px; flex-wrap: wrap; }
.day-toggle { flex: 1; min-width: 44px; padding: 10px 8px; border: 2px solid var(--color-border);
  border-radius: var(--radius); background: var(--color-bg); color: var(--color-text);
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all var(--duration-fast) var(--ease-out); text-align: center; }
.day-toggle:active { transform: scale(0.95); }
.day-toggle.on { background: var(--color-primary); color: #fff; border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(43,162,69,0.25); }

.time-row { max-width: 200px; }
.time-input { font-size: 15px; }

.theme-row { display: flex; gap: 8px; }

.apply-btn { width: 100%; padding: 16px; font-size: 15px; border-radius: var(--radius); }

.about { opacity: 0.5; padding-top: 16px; border-top: 1px solid var(--color-border-light); }
.about p { font-size: 13px; color: var(--color-text-secondary); }
.version { margin-top: 4px; font-size: 12px !important; }
</style>