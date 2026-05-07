<script setup lang="ts">
import { useSettings } from './useSettings'
import { useGoal } from '../goal/useGoal'
import { useTheme } from '../shared/useTheme'
import { weekdayLabels } from '../shared/icons'
import { useExercise } from '../exercise/useExercise'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from '../shared/exercises'
import type { MuscleGroup } from '../shared/exercises'
import { ref } from 'vue'

const settingsStore = useSettings()
const goalStore = useGoal()
const exerciseStore = useExercise()
const { theme, toggle: toggleTheme } = useTheme()
const allDays = [0, 1, 2, 3, 4, 5, 6]

function onToggleDay(day: number) { settingsStore.toggleTrainingDay(day) }

// === 动作库管理 ===
const showLibModal = ref(false)
const libFormName = ref('')
const libFormGroup = ref<MuscleGroup>('chest')
const libFormPrescription = ref('3×10')
const editingId = ref<string | null>(null)

function openAddLib() {
  libFormName.value = ''
  libFormGroup.value = 'chest'
  libFormPrescription.value = '3×10'
  editingId.value = null
  showLibModal.value = true
}

function openEditLib(id: string) {
  const ex = exerciseStore.allCustom.find(e => e.id === id)
  if (!ex) return
  libFormName.value = ex.name
  libFormGroup.value = ex.muscleGroup
  libFormPrescription.value = ex.defaultPrescription
  editingId.value = id
  showLibModal.value = true
}

function submitLibForm() {
  const name = libFormName.value.trim()
  if (!name) return
  if (editingId.value) {
    exerciseStore.update(editingId.value, { name, muscleGroup: libFormGroup.value, defaultPrescription: libFormPrescription.value })
  } else {
    exerciseStore.add(name, libFormGroup.value, libFormPrescription.value)
  }
  showLibModal.value = false
}

function confirmRemove(id: string) {
  const ex = exerciseStore.allCustom.find(e => e.id === id)
  if (!ex) return
  if (confirm(`删除「${ex.name}」？`)) {
    exerciseStore.remove(id)
  }
}
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
      <h2 class="section-title">有氧目标</h2>
      <p class="section-desc">每周有氧运动的推荐时长（WHO 建议 150 分钟）</p>
      <div class="form-row">
        <div class="form-field">
          <div class="input-with-unit">
            <input type="number" :value="settingsStore.settings.cardioTargetMinutes"
              @input="settingsStore.setCardioTarget(parseInt(($event.target as HTMLInputElement).value) || 150)"
              class="text-input" step="10" min="10" max="600" />
            <span class="unit">分钟/周</span>
          </div>
        </div>
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

    <!-- 动作库管理 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">动作库</h2>
        <button class="btn btn-primary btn-sm" @click="openAddLib">+ 添加</button>
      </div>
      <p class="section-desc">管理自定义训练动作，添加后可在训练弹窗中直接选用</p>
      <div class="ex-lib-list" v-if="exerciseStore.allCustom.length > 0">
        <div v-for="ex in exerciseStore.allCustom" :key="ex.id" class="ex-lib-item card">
          <div class="ex-lib-info">
            <span class="ex-lib-name">{{ ex.name }}</span>
            <span class="ex-lib-meta">{{ MUSCLE_GROUP_LABELS[ex.muscleGroup] }} · {{ ex.defaultPrescription }}</span>
          </div>
          <div class="ex-lib-actions">
            <button class="btn btn-ghost btn-xs" @click="openEditLib(ex.id)">编辑</button>
            <button class="btn btn-ghost btn-xs ex-del" @click="confirmRemove(ex.id)">删除</button>
          </div>
        </div>
      </div>
      <div v-else class="ex-lib-empty">
        <p>暂无自定义动作，点击「+ 添加」创建一个</p>
      </div>
    </section>

    <!-- 动作库编辑弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showLibModal" @click.self="showLibModal = false">
        <div class="modal-content">
          <h3>{{ editingId ? '编辑动作' : '添加动作' }}</h3>

          <div class="form-field">
            <div class="label">动作名称</div>
            <input v-model="libFormName" class="text-input" placeholder="如：哑铃弯举" />
          </div>

          <div class="form-field">
            <div class="label">部位</div>
            <div class="lib-group-chips">
              <button v-for="mg in MUSCLE_GROUPS" :key="mg"
                :class="['chip', { 'chip-active': libFormGroup === mg }]"
                @click="libFormGroup = mg"
              >{{ MUSCLE_GROUP_LABELS[mg] }}</button>
            </div>
          </div>

          <div class="form-field">
            <div class="label">默认组数×次数</div>
            <input v-model="libFormPrescription" class="text-input" placeholder="如：3×10" />
          </div>

          <div class="form-actions">
            <button class="btn btn-ghost" @click="showLibModal = false">取消</button>
            <button class="btn btn-primary" @click="submitLibForm">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <section class="section about">
      <p>FitPacer — 极简智能个人训练助手</p>
      <p class="version">v1.0 · PWA</p>
    </section>
    </div>
  </div>
</template>

<style scoped>

.section-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }


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

/* 动作库管理 */
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.ex-lib-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.ex-lib-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; }
.ex-lib-info { display: flex; flex-direction: column; gap: 2px; }
.ex-lib-name { font-size: 14px; font-weight: 600; }
.ex-lib-meta { font-size: 11px; color: var(--color-text-secondary); }
.ex-lib-actions { display: flex; gap: 4px; }
.btn-xs { font-size: 11px; padding: 3px 8px; }
.ex-del { color: var(--color-danger) !important; }
.ex-lib-empty { padding: 20px 0; text-align: center; font-size: 13px; color: var(--color-text-secondary); }
.lib-group-chips { display: flex; gap: 8px; }
.lib-group-chips .chip {
  flex: 1; padding: 10px 14px; border: 2px solid var(--color-border);
  border-radius: var(--radius); background: var(--color-bg); color: var(--color-text);
  font-size: 14px; font-weight: 600; cursor: pointer; text-align: center;
  transition: all var(--duration-fast) var(--ease-out);
}
.lib-group-chips .chip:active { transform: scale(0.96); }
.lib-group-chips .chip-active {
  background: var(--color-primary); color: #fff; border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 179, 101, 0.25);
}
</style>