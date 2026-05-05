<script setup lang="ts">
import { onMounted, computed, ref, reactive, watch } from 'vue'
import { usePlan } from './usePlan'
import { useSettings } from '../settings/useSettings'
import { getTypeIcon, getTypeLabel, weekdayLabels } from '../shared/icons'
import { getAdjustOptions, CARDIO_ACTIONS, ensureDayExercises } from './planEngine'
import type { DayPlan, CardioRecord, ExerciseItem } from './storage'

const store = usePlan()
const settingsStore = useSettings()

onMounted(() => {
  store.ensurePlan()
  // 自动展开今天的卡片
  const today = new Date().toISOString().slice(0, 10)
  expandedDates.value.add(today)
})

const weekInfo = computed(() => store.weekInfo)
const weekLabel = computed(() => weekInfo.value?.label ?? '')

/** 展开中的日期集合 */
const expandedDates = ref(new Set<string>())

function toggleExpand(date: string) {
  const next = new Set(expandedDates.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  expandedDates.value = next
}

function isExpanded(date: string): boolean {
  return expandedDates.value.has(date)
}

/** 有氧完成弹窗表单 */
const cardioForm = reactive({
  durationMinutes: 30,
  avgHeartRate: undefined as number | undefined,
  action: '慢跑'
})

function openCardioModal(date: string) {
  cardioForm.durationMinutes = 30
  cardioForm.avgHeartRate = undefined
  cardioForm.action = '慢跑'
  store.markCompleted(date)
}

function submitCardio() {
  if (!store.cardioModalDate) return
  const record: CardioRecord = {
    durationMinutes: cardioForm.durationMinutes,
    avgHeartRate: cardioForm.avgHeartRate || undefined,
    action: cardioForm.action
  }
  store.saveCardioRecord(store.cardioModalDate, record)
}

/** 力量完成弹窗：本地拷贝 exercises 供编辑 */
const strengthEdit = ref<ExerciseItem[]>([])

function openStrengthModal(date: string) {
  let day = store.plan.find(p => p.date === date)
  if (!day) return
  // 兜底：旧数据可能没有 exercises
  if (!day.exercises || day.exercises.length === 0) {
    day = ensureDayExercises(day)
  }
  strengthEdit.value = day.exercises.map(e => ({ ...e }))
  store.markCompleted(date)
}

function toggleStrengthExercise(index: number) {
  const exs = [...strengthEdit.value]
  exs[index] = { ...exs[index], completed: !exs[index].completed }
  strengthEdit.value = exs
}

function allDone() {
  strengthEdit.value = strengthEdit.value.map(e => ({ ...e, completed: true }))
}

function submitStrength() {
  if (!store.strengthModalDate) return
  store.saveStrengthCompletion(store.strengthModalDate, strengthEdit.value)
}

function isToday(date: string): boolean {
  return date === new Date().toISOString().slice(0, 10)
}

function getBadgeClass(type: string): string {
  if (type === 'strength') return 'badge-strength'
  if (type === 'cardio') return 'badge-cardio'
  return 'badge-rest'
}

function getAdjustOptionsForDate(plan: DayPlan[], date: string) {
  return getAdjustOptions(plan, date)
}

function isNeglected(name: string): boolean {
  return store.neglectedExercises.has(name)
}

function completionPct(day: DayPlan): number {
  if (!day.exercises || day.exercises.length === 0) return 0
  return Math.round((day.exercises.filter(e => e.completed).length / day.exercises.length) * 100)
}

/** 有氧进度 */
const cardioTarget = computed(() => settingsStore.settings.cardioTargetMinutes)
const cardioPct = computed(() => Math.min(100, Math.round((store.weekCardioMinutes / cardioTarget.value) * 100)))
const cardioLabel = computed(() => {
  const done = store.weekCardioMinutes
  const target = cardioTarget.value
  if (done >= target) {
    return `🎉 本周有氧已超 ${done} 分钟`
  }
  return `🏃 本周有氧 ${done} / ${target} 分钟`
})
const cardioDiff = computed(() => {
  const diff = cardioTarget.value - store.weekCardioMinutes
  return diff > 0 ? `还差 ${diff} 分钟` : `已超过 ${-diff} 分钟`
})
</script>

<template>
  <div class="view">
    <div class="view-header">
      <div class="header-top">
        <h1 class="view-title">训练计划</h1>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm" @click="store.handleOpenInCalendar">添加到日历</button>
          <button class="btn btn-primary btn-sm" @click="store.handleExportICS">导出</button>
        </div>
      </div>
      <div class="week-nav">
        <button class="btn btn-ghost week-arrow" @click="store.goToWeek(-1)">‹</button>
        <span class="week-label">{{ weekLabel }}</span>
        <button class="btn btn-ghost week-arrow" @click="store.goToWeek(1)">›</button>
      </div>
    </div>

    <div class="view-body">
    <!-- 有氧进度条 -->
    <div class="cardio-progress" v-if="store.hasPlan">
      <div class="cardio-progress-text">
        <span>{{ cardioLabel }}</span>
        <span class="cardio-diff">{{ cardioDiff }}</span>
      </div>
      <div class="cardio-progress-bar">
        <div class="cardio-progress-fill" :style="{ width: cardioPct + '%' }"></div>
      </div>
    </div>

    <div class="day-list card-stagger" v-if="weekInfo">
      <div v-for="day in weekInfo.days" :key="day.date"
        :class="['day-card card', `day-${day.type}`, {
          'day-today': isToday(day.date),
          'day-done': day.completed,
          'day-skipped': day.missed
        }]">
        <!-- 顶部：日期 + 标签 -->
        <div class="day-top">
          <div class="day-date-block">
            <span class="day-date-num">{{ new Date(day.date + 'T00:00:00').getDate() }}</span>
            <span class="day-date-wd">周{{ weekdayLabels[new Date(day.date + 'T00:00:00').getDay()] }}</span>
          </div>
          <span v-if="isToday(day.date)" class="today-tag">今天</span>
          <span :class="['badge', getBadgeClass(day.type)]">{{ getTypeLabel(day.type) }}</span>
        </div>

        <!-- 摘要 + 展开指示器（足够的点击区域） -->
        <div class="day-detail-area" v-if="day.type !== 'rest'"
          @click="toggleExpand(day.date)">
          <div class="day-detail-text">
            <span class="detail-icon">📋</span>
            <span v-if="day.type === 'strength' && day.exercises.length > 0">
              {{ completionPct(day) > 0 ? `${completionPct(day)}% 已完成` : `${day.exercises.length} 个动作` }}
            </span>
            <span v-else-if="day.type === 'cardio'">{{ day.details }}</span>
          </div>
          <span :class="['expand-chevron', { 'chevron-open': isExpanded(day.date) }]">▸</span>
        </div>

        <!-- 有氧记录概要（已完成且有 cardioRecord） -->
        <div class="day-cardio-summary" v-if="day.type === 'cardio' && day.completed && day.cardioRecord">
          <span class="cardio-stat">🕐 {{ day.cardioRecord.durationMinutes }}分钟</span>
          <span class="cardio-stat" v-if="day.cardioRecord.avgHeartRate">💓 {{ day.cardioRecord.avgHeartRate }} bpm</span>
          <span class="cardio-stat" v-if="day.cardioRecord.action">{{ day.cardioRecord.action }}</span>
        </div>

        <!-- 已展开：动作清单 -->
        <div class="exercise-list" v-if="isExpanded(day.date) && day.exercises && day.exercises.length > 0">
          <div class="exercise-progress" v-if="day.type === 'strength'">
            <div class="progress-bar-mini">
              <div class="progress-fill-mini" :style="{ width: completionPct(day) + '%' }"></div>
            </div>
            <span class="progress-label">{{ completionPct(day) }}%</span>
          </div>
          <div
            v-for="(ex, ei) in day.exercises"
            :key="ei"
            :class="['exercise-item', {
              'exercise-done': ex.completed,
              'exercise-neglected': !ex.completed && isNeglected(ex.name) && !day.completed
            }]"
          >
            <span :class="['ex-check', ex.completed ? 'ex-checked' : '']">
              {{ ex.completed ? '✅' : '○' }}
            </span>
            <span class="ex-name">{{ ex.name }}</span>
            <span class="ex-prescription">{{ ex.prescription }}</span>
            <span v-if="!ex.completed && isNeglected(ex.name) && !day.completed" class="ex-warn">⚠️</span>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="day-foot" v-if="day.type !== 'rest' && !day.completed && !day.missed">
          <button class="btn btn-primary btn-sm" @click="day.type === 'cardio' ? openCardioModal(day.date) : openStrengthModal(day.date)">
            {{ day.type === 'cardio' ? '完成' : '完成' }}
          </button>
          <button class="btn btn-ghost btn-sm" @click="store.skipDay(day.date)">跳过</button>
        </div>
        <div class="day-foot" v-if="day.completed">
          <span class="done-badge">
            ✅ 已完成
            <span v-if="day.type === 'cardio' && day.cardioRecord"> · {{ day.cardioRecord.durationMinutes }}分钟</span>
            <span v-if="day.type === 'strength'"> · {{ completionPct(day) }}%</span>
          </span>
          <button class="btn btn-ghost btn-sm" @click="store.markCompleted(day.date)">撤销</button>
        </div>
      </div>
    </div>

    <div v-if="!store.hasPlan" class="empty-state">
      <span class="empty-icon">📅</span>
      <p>还没有训练计划</p>
      <button class="btn btn-primary" @click="store.initPlan()">生成计划</button>
    </div>

    <!-- 调整弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="store.showAdjustModal" @click.self="store.cancelAdjust">
        <div class="modal-content">
          <h3>调整计划</h3>
          <p class="modal-desc">你错过了 {{ store.adjustDate }} 的训练，如何调整？</p>
          <div v-for="(opt, i) in getAdjustOptionsForDate(store.plan, store.adjustDate!)" :key="i"
            class="adj-option card" @click="store.applyAdjustOption(i)">
            <strong>{{ opt.label }}</strong>
            <p>{{ opt.description }}</p>
          </div>
          <button class="btn btn-ghost" style="margin-top:12px" @click="store.cancelAdjust">取消</button>
        </div>
      </div>
    </Teleport>

    <!-- 有氧完成弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="store.showCardioModal" @click.self="store.cancelCardioModal">
        <div class="modal-content">
          <h3>🏃 记录有氧训练</h3>
          <p class="modal-desc">{{ store.cardioModalDate }}</p>

          <div class="form-group">
            <label class="label">运动类型</label>
            <div class="cardio-action-grid">
              <button
                v-for="act in CARDIO_ACTIONS"
                :key="act"
                :class="['chip', { 'chip-active': cardioForm.action === act }]"
                @click="cardioForm.action = act"
              >{{ act }}</button>
            </div>
          </div>

          <div class="form-group">
            <label class="label">运动时长</label>
            <div class="stepper-row">
              <button class="btn btn-ghost btn-sm" @click="cardioForm.durationMinutes = Math.max(5, cardioForm.durationMinutes - 5)">−</button>
              <span class="stepper-value">{{ cardioForm.durationMinutes }} 分钟</span>
              <button class="btn btn-ghost btn-sm" @click="cardioForm.durationMinutes = Math.min(180, cardioForm.durationMinutes + 5)">+</button>
            </div>
            <div class="duration-quick">
              <button v-for="d in [20, 30, 40, 60, 90]" :key="d"
                :class="['chip chip-sm', { 'chip-active': cardioForm.durationMinutes === d }]"
                @click="cardioForm.durationMinutes = d">{{ d }}分钟</button>
              <button class="chip chip-sm"
                @click="(() => { const d = store.plan.find(p => p.date === store.cardioModalDate); cardioForm.durationMinutes = d?.details?.includes('长有氧') ? 65 : 38 })()">计划量</button>
            </div>
          </div>

          <div class="form-group">
            <label class="label">平均心率 <span class="label-optional">（可选）</span></label>
            <div class="stepper-row">
              <button class="btn btn-ghost btn-sm" @click="cardioForm.avgHeartRate = (cardioForm.avgHeartRate || 120) > 60 ? (cardioForm.avgHeartRate || 120) - 5 : 60">−</button>
              <span class="stepper-value">{{ cardioForm.avgHeartRate ? cardioForm.avgHeartRate + ' bpm' : '未设置' }}</span>
              <button class="btn btn-ghost btn-sm" @click="cardioForm.avgHeartRate = Math.min(220, (cardioForm.avgHeartRate || 120) + 5)">+</button>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-ghost" @click="store.cancelCardioModal">取消</button>
            <button class="btn btn-primary" @click="submitCardio">保存并完成</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 力量完成弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="store.showStrengthModal" @click.self="store.cancelStrengthModal">
        <div class="modal-content">
          <h3>💪 完成力量训练</h3>
          <p class="modal-desc">{{ store.strengthModalDate }}</p>
          <div class="str-quick-row">
            <button class="chip chip-sm" @click="allDone">全部完成</button>
          </div>
          <div
            v-for="(ex, ei) in strengthEdit"
            :key="ei"
            :class="['exercise-item', 'exercise-item-modal', {
              'exercise-done': ex.completed,
              'exercise-neglected': !ex.completed && isNeglected(ex.name)
            }]"
            @click="toggleStrengthExercise(ei)"
          >
            <span :class="['ex-check', ex.completed ? 'ex-checked' : '']">
              {{ ex.completed ? '✅' : '○' }}
            </span>
            <span class="ex-name">{{ ex.name }}</span>
            <span class="ex-prescription">{{ ex.prescription }}</span>
            <span v-if="!ex.completed && isNeglected(ex.name)" class="ex-warn">⚠️ 上周未做</span>
          </div>

          <div class="form-actions">
            <button class="btn btn-ghost" @click="store.cancelStrengthModal">取消</button>
            <button class="btn btn-primary" @click="submitStrength">保存并完成</button>
          </div>
        </div>
      </div>
    </Teleport>
    </div>
  </div>
</template>

<style scoped>
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.header-actions { display: flex; gap: 6px; }

.week-nav { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 8px 0 12px; }
.week-arrow { font-size: 20px; font-weight: 400; color: var(--color-text); padding: 4px 12px; }
.week-label { font-size: 14px; font-weight: 650; min-width: 140px; text-align: center; color: var(--color-text); }

/* 有氧进度条 */
.cardio-progress {
  margin: 4px 0 8px; padding: 12px 14px;
  background: var(--color-surface); border-radius: var(--radius-sm);
  box-shadow: var(--shadow-xs);
}
.cardio-progress-text { display: flex; justify-content: space-between; align-items: baseline;
  font-size: 13px; font-weight: 550; margin-bottom: 8px; }
.cardio-diff { font-size: 11px; color: var(--color-text-secondary); font-weight: 500; }
.cardio-progress-bar { height: 6px; background: var(--color-border-light); border-radius: 3px; overflow: hidden; }
.cardio-progress-fill { height: 100%; background: var(--color-cardio); border-radius: 3px;
  transition: width 0.5s var(--ease-out); }

.day-list { display: flex; flex-direction: column; gap: 8px; padding-bottom: 100px; }

.day-card { padding: 14px; border-left: 3px solid transparent; border-radius: var(--radius-sm); background: var(--color-surface);
  transition: all var(--duration-fast) var(--ease-out); }
.day-card:active { transform: scale(0.985); }
.day-strength { border-left-color: var(--color-strength); }
.day-cardio { border-left-color: var(--color-cardio); }
.day-today { box-shadow: 0 0 0 2px var(--color-primary); }
.day-done { opacity: 0.7; border-left-color: var(--color-primary) !important; background: var(--color-primary-bg); }
.day-skipped { opacity: 0.45; border-left-color: var(--color-danger) !important; }

.day-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.day-date-block { display: flex; flex-direction: column; }
.day-date-num { font-size: 22px; font-weight: 700; line-height: 1.1; letter-spacing: -0.3px; }
.day-date-wd { font-size: 11px; color: var(--color-text-secondary); font-weight: 500; }
.today-tag { background: var(--color-primary); color: #fff; padding: 2px 8px; border-radius: 10px;
  font-size: 10px; font-weight: 600; animation: bounceIn 0.4s var(--ease-bounce); }

/* 展开控制区 —— 大点击区域 */
.day-detail-area {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; margin: 4px -8px 2px;
  border-radius: 10px; cursor: pointer;
  background: var(--color-bg);
  transition: all var(--duration-fast) var(--ease-out);
  user-select: none;
}
.day-detail-area:active { background: var(--color-surface-hover); transform: scale(0.985); }
.day-detail-text { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 550; color: var(--color-text); }
.detail-icon { font-size: 15px; }

.expand-chevron {
  font-size: 14px; color: var(--color-text-tertiary);
  transition: transform var(--duration-fast) var(--ease-out);
  display: inline-block;
}
.chevron-open { transform: rotate(90deg); color: var(--color-primary); }

/* 有氧记录概要 */
.day-cardio-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.cardio-stat { font-size: 11px; background: var(--color-cardio-bg); color: var(--color-cardio);
  padding: 3px 8px; border-radius: 8px; font-weight: 550; }

/* 动作清单 */
.exercise-list { margin-bottom: 8px; animation: fadeInUp 0.25s var(--ease-out); }

.exercise-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.progress-bar-mini { flex: 1; height: 4px; background: var(--color-border-light); border-radius: 2px; overflow: hidden; }
.progress-fill-mini { height: 100%; background: var(--color-primary); border-radius: 2px; transition: width var(--duration-fast) var(--ease-out); }
.progress-label { font-size: 11px; font-weight: 600; color: var(--color-primary); min-width: 32px; text-align: right; }

.exercise-item { display: flex; align-items: center; gap: 6px; padding: 7px 8px; border-radius: 8px;
  transition: all var(--duration-fast) var(--ease-out);
  background: var(--color-bg); margin-bottom: 4px; }
.exercise-item-modal { cursor: pointer; }
.exercise-item-modal:active { transform: scale(0.98); background: var(--color-surface-hover); }
.exercise-done { opacity: 0.6; background: var(--color-primary-bg); }
.exercise-neglected { background: rgba(255, 107, 53, 0.1); border: 1px solid rgba(255, 107, 53, 0.25); }

.ex-check { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0;
  color: var(--color-text-tertiary); }
.ex-checked { color: var(--color-primary); }

.ex-name { font-size: 13px; font-weight: 550; flex: 1; }
.exercise-done .ex-name { text-decoration: line-through; }
.ex-prescription { font-size: 11px; color: var(--color-text-secondary); white-space: nowrap; }
.ex-warn { font-size: 10px; color: var(--color-accent); font-weight: 600; margin-left: 4px; }

.day-foot { display: flex; gap: 6px; align-items: center; }
.done-badge { font-size: 12px; color: var(--color-primary); font-weight: 600; }

/* 力量弹窗 */
.str-quick-row { display: flex; gap: 6px; margin-bottom: 12px; }

/* 有氧弹窗 */
.form-group { margin-bottom: 20px; }
.label-optional { font-weight: 400; color: var(--color-text-tertiary); font-size: 12px; }

.cardio-action-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 8px 14px; border: 1.5px solid var(--color-border); border-radius: 20px;
  background: var(--color-bg); font-size: 13px; color: var(--color-text);
  cursor: pointer; transition: all var(--duration-fast) var(--ease-out);
  font-weight: 500; font-family: var(--font-stack); }
.chip:active { transform: scale(0.96); }
.chip-active { border-color: var(--color-primary); background: var(--color-primary-bg);
  color: var(--color-primary); font-weight: 600; }
.chip-sm { padding: 5px 10px; font-size: 12px; }

.stepper-row { display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 8px 0; }
.stepper-value { font-size: 20px; font-weight: 650; min-width: 90px; text-align: center; }

.duration-quick { display: flex; gap: 6px; justify-content: center; margin-top: 8px; }

/* Modal */
.modal-desc { color: var(--color-text-secondary); margin: 4px 0 16px; font-size: 14px; }
.adj-option { cursor: pointer; margin-bottom: 8px; border: 1px solid transparent; border-radius: var(--radius);
  transition: all var(--duration-fast) var(--ease-out); }
.adj-option:active { transform: scale(0.98); border-color: var(--color-primary); background: var(--color-primary-bg); }
.adj-option p { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }

.empty-state { text-align: center; padding: 40px 20px; animation: fadeInUp 0.4s var(--ease-out); }
.empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; display: block; animation: float 3s ease-in-out infinite; }
.empty-state p { margin-bottom: 12px; font-size: 14px; color: var(--color-text-secondary); }
</style>
