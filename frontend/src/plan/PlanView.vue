<script setup lang="ts">
import { onMounted, computed, ref, reactive, watch } from 'vue'
import { usePlan } from './usePlan'
import { useSettings } from '../settings/useSettings'
import { getTypeIcon, getTypeLabel, weekdayLabels } from '../shared/icons'
import { getAdjustOptions, CARDIO_ACTIONS, ensureDayExercises, findAvailableSlots } from './planEngine'
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

// 手动选日期推迟
const showDatePicker = ref(false)
const datePickerSlots = ref<{ date: string; label: string }[]>([])

function openDatePicker() {
  if (!store.adjustDate) return
  const slots = findAvailableSlots(store.plan, store.adjustDate)
  datePickerSlots.value = slots.map(s => ({
    date: s,
    label: `${s.slice(5)} 周${['日','一','二','三','四','五','六'][new Date(s + 'T00:00:00').getDay()]}`
  }))
  showDatePicker.value = true
}

function applyDatePick(slotDate: string) {
  if (!store.adjustDate) return
  store.postponeToDate(store.adjustDate, slotDate)
  showDatePicker.value = false
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

/** 今日看板数据 */
const weekdayName = computed(() => {
  const d = new Date()
  return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]
})

const todayAction = computed(() => {
  const tp = store.todayPlan
  if (!tp) return { icon: '📅', label: '暂无计划', color: 'var(--color-rest)', sub: '' }
  if (tp.type === 'rest') return { icon: '😴', label: '休息日', color: 'var(--color-rest)', sub: '恢复身体，明天继续' }
  if (tp.type === 'strength') {
    const done = tp.exercises.filter(e => e.completed).length
    const total = tp.exercises.length
    const pct = total > 0 ? Math.round(done / total * 100) : 0
    return { icon: '💪', label: '力量训练', color: 'var(--color-strength)', sub: `${done}/${total}  · ${pct}%` }
  }
  if (tp.type === 'cardio') {
    const done = tp.completed
    return { icon: '🏃', label: '有氧训练', color: 'var(--color-cardio)', sub: done ? '已完成' : (tp.details || '35-40 分钟') }
  }
  return { icon: '📅', label: '—', color: 'var(--color-rest)', sub: '' }
})

const todayPct = computed(() => {
  const tp = store.todayPlan
  if (!tp || tp.type === 'rest') return 0
  if (tp.type === 'strength') {
    const total = tp.exercises.length
    const done = tp.exercises.filter(e => e.completed).length
    return total > 0 ? Math.round(done / total * 100) : 0
  }
  return tp.completed ? 100 : 0
})

const todayDone = computed(() => {
  const tp = store.todayPlan
  return tp ? tp.completed : false
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

      <!-- 今日概览 -->
      <div class="today-overview" v-if="store.hasPlan">
        <div class="today-ring-block">
          <svg class="progress-ring" viewBox="0 0 80 80">
            <circle class="ring-track" cx="40" cy="40" r="34" fill="none" stroke-width="5"/>
            <circle class="ring-fill" cx="40" cy="40" r="34" fill="none" stroke-width="5"
              :stroke="todayAction.color"
              :stroke-dasharray="214"
              :stroke-dashoffset="214 - (214 * todayPct / 100)"
              stroke-linecap="round"
              transform="rotate(-90 40 40)"/>
            <text x="40" y="40" text-anchor="middle" dominant-baseline="central"
              :fill="todayDone ? 'var(--color-primary)' : 'var(--color-text)'"
              font-size="20" font-weight="700">{{ todayDone ? '✓' : todayPct + '%' }}</text>
          </svg>
        </div>
        <div class="today-info">
          <div class="today-date">
            <span class="today-date-num">{{ new Date().getDate() }}</span>
            <span class="today-date-text">{{ weekdayName }} · {{ (new Date().getMonth()+1) }}月</span>
          </div>
          <div class="today-action-row">
            <span class="today-icon">{{ todayAction.icon }}</span>
            <span class="today-label" :style="{ color: todayAction.color }">{{ todayAction.label }}</span>
            <span class="today-sub">{{ todayAction.sub }}</span>
          </div>
          <div class="today-streak" v-if="store.streakCount > 0">
            <span class="streak-fire">🔥</span>
            <span class="streak-text">连续打卡 {{ store.streakCount }} 天</span>
          </div>
        </div>
      </div>

      <!-- 有氧进度环 -->
      <div class="cardio-ring-row" v-if="store.hasPlan">
        <div class="cardio-ring-item">
          <svg class="progress-ring-sm" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="17" fill="none" stroke="var(--color-border-light)" stroke-width="4"/>
            <circle cx="22" cy="22" r="17" fill="none" stroke="var(--color-cardio)" stroke-width="4"
              stroke-linecap="round"
              :stroke-dasharray="107"
              :stroke-dashoffset="107 - (107 * cardioPct / 100)"
              transform="rotate(-90 22 22)"/>
            <text x="22" y="22" text-anchor="middle" dominant-baseline="central"
              font-size="10" font-weight="700" fill="var(--color-cardio)">{{ cardioPct }}%</text>
          </svg>
          <span class="cardio-ring-label">有氧</span>
        </div>
        <div class="cardio-ring-text">
          <span class="cardio-ring-title">{{ cardioLabel }}</span>
          <span class="cardio-ring-diff">{{ cardioDiff }}</span>
        </div>
      </div>

      <div class="week-nav">
        <button class="btn btn-ghost week-arrow" @click="store.goToWeek(-1)">‹</button>
        <span class="week-label">{{ weekLabel }}</span>
        <button class="btn btn-ghost week-arrow" @click="store.goToWeek(1)">›</button>
      </div>
    </div>

    <div class="view-body">
    <!-- 有氧进度条（删除，已替换为环） -->

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
          <span v-if="day.details?.startsWith('📌')" class="makeup-tag">补练</span>
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
          <div class="adj-option card adj-manual" @click="openDatePicker">
            <strong>📅 手动选日期推迟</strong>
            <p>从后续休息日中选一天推迟训练</p>
          </div>
          <button class="btn btn-ghost" style="margin-top:12px" @click="store.cancelAdjust">取消</button>
        </div>
      </div>
    </Teleport>

    <!-- 手动选日期弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showDatePicker" @click.self="showDatePicker = false">
        <div class="modal-content">
          <h3>选择推迟日期</h3>
          <p class="modal-desc">将 {{ store.adjustDate }} 的训练推迟到：</p>
          <div class="slot-list">
            <div v-for="slot in datePickerSlots" :key="slot.date"
              class="slot-item card" @click="applyDatePick(slot.date)">
              <span class="slot-date">{{ slot.label }}</span>
              <span class="slot-arrow">→</span>
            </div>
            <div v-if="datePickerSlots.length === 0" class="empty-state" style="padding:24px">
              <p>没有可用的休息日</p>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" @click="showDatePicker = false">取消</button>
          </div>
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

.week-nav { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 6px 0 8px; }
.week-arrow { font-size: 20px; font-weight: 400; color: var(--color-text); padding: 4px 12px; }
.week-label { font-size: 14px; font-weight: 650; min-width: 140px; text-align: center; color: var(--color-text); }

/* 今日概览 */
.today-overview {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px; margin: 0 0 8px;
  background: var(--color-surface); border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  animation: fadeInUp 0.3s var(--ease-out);
}
.today-ring-block { flex-shrink: 0; }
.progress-ring { width: 64px; height: 64px; }
.ring-track { stroke: var(--color-border-light); }
.ring-fill { transition: stroke-dashoffset 0.6s var(--ease-out); }
.today-info { flex: 1; min-width: 0; }
.today-date { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.today-date-num { font-size: 28px; font-weight: 800; line-height: 1; letter-spacing: -0.5px; color: var(--color-text); }
.today-date-text { font-size: 13px; color: var(--color-text-secondary); font-weight: 500; }
.today-action-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.today-icon { font-size: 18px; line-height: 1; }
.today-label { font-size: 15px; font-weight: 650; letter-spacing: -0.2px; }
.today-sub { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }
.today-streak { margin-top: 6px; display: flex; align-items: center; gap: 4px; }
.streak-fire { font-size: 14px; line-height: 1; animation: pulse 2s ease-in-out infinite; }
.streak-text { font-size: 12px; font-weight: 600; color: var(--color-accent); }

/* 有氧进度环 */
.cardio-ring-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; margin: 0 0 6px;
  background: var(--color-surface); border-radius: var(--radius-sm);
  box-shadow: var(--shadow-xs);
}
.cardio-ring-item { display: flex; flex-direction: column; align-items: center; gap: 2px; flex-shrink: 0; }
.progress-ring-sm { width: 36px; height: 36px; }
.cardio-ring-label { font-size: 9px; color: var(--color-text-tertiary); font-weight: 500; }
.cardio-ring-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.cardio-ring-title { font-size: 13px; font-weight: 600; color: var(--color-text); }
.cardio-ring-diff { font-size: 11px; color: var(--color-text-secondary); font-weight: 500; }

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

/* 补练标签 */
.makeup-tag {
  background: var(--color-accent-bg); color: var(--color-accent);
  padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;
  animation: pulse 2s ease-in-out infinite;
}

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
.adj-manual { border-color: var(--color-border); background: var(--color-primary-bg); }

/* 手动选日期 */
.slot-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.slot-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px;
  cursor: pointer; transition: all var(--duration-fast) var(--ease-out); }
.slot-item:active { transform: scale(0.98); background: var(--color-primary-bg); }
.slot-date { font-size: 15px; font-weight: 600; }
.slot-arrow { font-size: 16px; color: var(--color-primary); }

.empty-state { text-align: center; padding: 40px 20px; animation: fadeInUp 0.4s var(--ease-out); }
.empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; display: block; animation: float 3s ease-in-out infinite; }
.empty-state p { margin-bottom: 12px; font-size: 14px; color: var(--color-text-secondary); }
</style>
