<script setup lang="ts">
import { onMounted, computed, ref, reactive, watch } from 'vue'
import { usePlan } from './usePlan'
import { useSettings } from '../settings/useSettings'
import { getTypeIcon, getTypeLabel, weekdayLabels } from '../shared/icons'
import { getAdjustOptions, CARDIO_ACTIONS, ensureDayExercises, findAvailableSlots } from './planEngine'
import type { DayPlan, CardioRecord, ExerciseItem } from './storage'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ICONS, type ExerciseDef, type MuscleGroup } from '../shared/exercises'
import { useExercise } from '../exercise/useExercise'

const store = usePlan()
const settingsStore = useSettings()
const exerciseStore = useExercise()

onMounted(() => {
  store.ensurePlan()
  // 自动展开今天的卡片
  const _d = new Date()
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
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
const cardioWarmup = ref(false)
const cardioCooldown = ref(false)

function openCardioModal(date: string) {
  cardioForm.durationMinutes = 30
  cardioForm.avgHeartRate = undefined
  cardioForm.action = '慢跑'
  cardioWarmup.value = false
  cardioCooldown.value = false
  store.markCompleted(date)
}

function submitCardio() {
  if (!store.cardioModalDate) return
  const record: CardioRecord = {
    durationMinutes: cardioForm.durationMinutes,
    avgHeartRate: cardioForm.avgHeartRate || undefined,
    action: cardioForm.action
  }
  store.saveCardioRecord(store.cardioModalDate, record, cardioWarmup.value, cardioCooldown.value)
}

/**
 * 力量完成弹窗：按部位分组，用户自由选择动作
 */
interface ExerciseFormItem {
  name: string
  prescription: string
  completed: boolean
  custom: boolean
  actualSets: number
  actualReps: number
  actualRpe: number
}

const strengthForm = ref<Record<MuscleGroup, ExerciseFormItem[]>>({
  chest: [],
  shoulders_back: [],
  legs: []
})

const strengthWarmup = ref(false)
const strengthCooldown = ref(false)

// 自定义动作输入
const customName = ref<Record<MuscleGroup, string>>({
  chest: '',
  shoulders_back: '',
  legs: ''
})

/** 展开中的部位 */
const expandedGroups = ref<Set<MuscleGroup>>(new Set(['chest', 'shoulders_back', 'legs']))

function toggleGroup(mg: MuscleGroup) {
  const next = new Set(expandedGroups.value)
  if (next.has(mg)) next.delete(mg)
  else next.add(mg)
  expandedGroups.value = next
}

function isGroupExpanded(mg: MuscleGroup): boolean {
  return expandedGroups.value.has(mg)
}

/** 某个部位已选动作数 */
function groupCount(mg: MuscleGroup): number {
  return strengthForm.value[mg].filter(e => e.completed).length
}

/** 从 prescription 解析默认组数次数 */
function parsePrescription(p: string): { sets: number; reps: number } {
  const parts = p.split('×')
  const sets = parseInt(parts[0]) || 3
  const reps = parseInt(parts[1]?.split('-')[0]) || 8
  return { sets, reps }
}

function openStrengthModal(date: string) {
  let day = store.plan.find(p => p.date === date)
  if (!day) return
  // 初始化：全新空白表单
  for (const mg of MUSCLE_GROUPS) {
    strengthForm.value[mg] = []
    customName.value[mg] = ''
  }
  // 加载用户已保存的动作（跳过预生成的无实际值旧数据）
  day.exercises.forEach(e => {
    if (!e.actualSets) return // 无 actualSets = 预生成旧数据，跳过
    const mg: MuscleGroup = (e.muscleGroup && MUSCLE_GROUPS.includes(e.muscleGroup as any))
      ? (e.muscleGroup as MuscleGroup)
      : 'chest'
    strengthForm.value[mg].push({
      name: e.name,
      prescription: e.prescription,
      completed: e.completed,
      custom: false,
      actualSets: e.actualSets ?? 3,
      actualReps: e.actualReps ?? 8,
      actualRpe: e.actualRpe ?? 7
    })
  })
  expandedGroups.value = new Set(['chest', 'shoulders_back', 'legs'])
  // 加载上次的拉伸/放松状态
  strengthWarmup.value = day.warmupDone ?? false
  strengthCooldown.value = day.cooldownDone ?? false
  store.markCompleted(date)
}

/** 从数据库添加推荐动作 */
function addExerciseFromDb(mg: MuscleGroup, def: ExerciseDef) {
  // 避免重复添加
  if (strengthForm.value[mg].some(e => e.name === def.name)) return
  const { sets, reps } = parsePrescription(def.defaultPrescription)
  strengthForm.value[mg].push({
    name: def.name,
    prescription: def.defaultPrescription,
    completed: true,
    custom: false,
    actualSets: sets,
    actualReps: reps,
    actualRpe: 7
  })
}

/** 添加自定义动作 — 同时保存到动作库 */
function addCustomExercise(mg: MuscleGroup) {
  const name = customName.value[mg].trim()
  if (!name) return
  if (strengthForm.value[mg].some(e => e.name === name)) return
  // 保存到动作库（幂等：库中已存在则跳过）
  const existing = exerciseStore.allCustom.find(e => e.name === name && e.muscleGroup === mg)
  if (!existing) {
    exerciseStore.add(name, mg, '3×10')
  }
  strengthForm.value[mg].push({
    name,
    prescription: '3×10',
    completed: true,
    custom: true,
    actualSets: 3,
    actualReps: 10,
    actualRpe: 7
  })
  customName.value[mg] = ''
}

/** 移除动作 */
function removeExercise(mg: MuscleGroup, index: number) {
  strengthForm.value[mg] = strengthForm.value[mg].filter((_, i) => i !== index)
}

/** 切换某个动作的完成状态 */
function toggleExercise(mg: MuscleGroup, index: number) {
  const exs = [...strengthForm.value[mg]]
  exs[index] = { ...exs[index], completed: !exs[index].completed }
  strengthForm.value[mg] = exs
}

function allDone() {
  for (const mg of MUSCLE_GROUPS) {
    strengthForm.value[mg] = strengthForm.value[mg].map(e => ({ ...e, completed: true }))
  }
}

function submitStrength() {
  if (!store.strengthModalDate) return
  const exercises: ExerciseItem[] = []
  for (const mg of MUSCLE_GROUPS) {
    for (const ex of strengthForm.value[mg]) {
      exercises.push({
        name: ex.name,
        prescription: ex.prescription,
        completed: ex.completed,
        muscleGroup: mg,
        actualSets: ex.completed ? ex.actualSets : undefined,
        actualReps: ex.completed ? ex.actualReps : undefined,
        actualRpe: ex.completed ? ex.actualRpe : undefined
      })
    }
  }
  store.saveStrengthCompletion(store.strengthModalDate, exercises, strengthWarmup.value, strengthCooldown.value)
}

function isToday(date: string): boolean {
  const _d = new Date()
  return date === `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
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

// RPE 提示弹窗
const showRpeTip = ref(false)
const showWarmupTip = ref(false)
const rpeLabels: Record<number, string> = {
  1: '极轻', 2: '轻', 3: '中等偏轻', 4: '中等', 5: '中等偏重',
  6: '重', 7: '很重', 8: '非常重', 9: '极重', 10: '极限'
}
function rpeHint(v: number): string {
  return rpeLabels[v] ?? ''
}
function getRpeColor(v: number): string {
  if (v <= 3) return '#00B365'
  if (v <= 5) return '#3B82F6'
  if (v <= 7) return '#F59E0B'
  return '#FF6B35'
}

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
      <h1 class="view-title">训练计划</h1>

      <!-- 今日概览 + 有氧进度（紧凑合并） -->
      <div class="today-bar" v-if="store.hasPlan">
        <div class="today-bar-main">
          <span class="today-date-num">{{ new Date().getDate() }}</span>
          <span class="today-date-text">{{ weekdayName }} · {{ (new Date().getMonth()+1) }}月</span>
          <span class="today-badge" :style="{ background: todayAction.color + '20', color: todayAction.color }">
            {{ todayAction.icon }} {{ todayAction.label }}
          </span>
          <span class="today-sub">{{ todayAction.sub }}</span>
          <span class="today-streak" v-if="store.streakCount > 0">🔥 {{ store.streakCount }}天</span>
        </div>
        <div class="today-bar-cardio">
          <span class="cardio-text">{{ cardioLabel }}</span>
          <span class="cardio-diff">{{ cardioDiff }}</span>
          <div class="cardio-mini-bar">
            <div class="cardio-mini-fill" :style="{ width: cardioPct + '%' }"></div>
          </div>
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

          <!-- 热身与放松 -->
          <div class="rec-section">
            <div class="rec-section-title">热身与放松 <button class="rpe-tip-btn" @click="showWarmupTip = true">ℹ️ 为什么重要？</button></div>
            <label class="rec-check">
              <input type="checkbox" v-model="cardioWarmup" />
              <span>运动前拉伸（5-10 分钟）</span>
            </label>
            <label class="rec-check">
              <input type="checkbox" v-model="cardioCooldown" />
              <span>运动后放松（5-10 分钟）</span>
            </label>
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

          <!-- 按部位循环 -->
          <div v-for="mg in MUSCLE_GROUPS" :key="mg" class="mg-block">
            <!-- 部位头部 -->
            <div class="mg-head" @click="toggleGroup(mg)">
              <span class="mg-icon">{{ MUSCLE_GROUP_ICONS[mg] }}</span>
              <span class="mg-label">{{ MUSCLE_GROUP_LABELS[mg] }}</span>
              <span v-if="groupCount(mg) > 0" class="mg-count">{{ groupCount(mg) }} 项</span>
              <span class="mg-arrow">{{ isGroupExpanded(mg) ? '▼' : '▶' }}</span>
            </div>

            <!-- 部位展开面板 -->
            <div v-if="isGroupExpanded(mg)" class="mg-body">
              <!-- 推荐动作 chip -->
              <div class="mg-chips">
                <button
                  v-for="def in exerciseStore.getExercisesByGroup(mg)"
                  :key="def.name"
                  class="chip mg-chip"
                  :class="{ 'mg-chip-added': strengthForm[mg].some(e => e.name === def.name) }"
                  @click.stop="addExerciseFromDb(mg, def as ExerciseDef)"
                >{{ def.name }}<span v-if="'id' in def && (def as any).id" class="mg-chip-tag">自</span></button>
              </div>

              <!-- 已选动作列表 -->
              <div v-for="(ex, ei) in strengthForm[mg]" :key="ei" class="str-ex-block">
                <div class="str-ex-head" :class="{ 'str-ex-done': ex.completed }">
                  <span class="ex-check" @click.stop="toggleExercise(mg, ei)">
                    {{ ex.completed ? '✅' : '○' }}
                  </span>
                  <span class="ex-name">{{ ex.name }}</span>
                  <span class="ex-prescription">{{ ex.prescription }}</span>
                  <button class="str-ex-del" @click.stop="removeExercise(mg, ei)">✕</button>
                </div>
                <div v-if="ex.completed" class="str-ex-detail">
                  <div class="str-ex-detail-row">
                    <div class="str-ex-field">
                      <span class="str-ex-label">组数</span>
                      <div class="str-ex-stepper">
                        <button class="btn str-btn" @click.stop="ex.actualSets = Math.max(1, ex.actualSets - 1)">−</button>
                        <span class="str-ex-val">{{ ex.actualSets }}</span>
                        <button class="btn str-btn" @click.stop="ex.actualSets = Math.min(10, ex.actualSets + 1)">+</button>
                      </div>
                    </div>
                    <div class="str-ex-field">
                      <span class="str-ex-label">次数</span>
                      <div class="str-ex-stepper">
                        <button class="btn str-btn" @click.stop="ex.actualReps = Math.max(1, ex.actualReps - 1)">−</button>
                        <span class="str-ex-val">{{ ex.actualReps }}</span>
                        <button class="btn str-btn" @click.stop="ex.actualReps = Math.min(50, ex.actualReps + 1)">+</button>
                      </div>
                    </div>
                  </div>
                  <div class="str-ex-rpe-section">
                    <div class="str-ex-rpe-header">
                      <span class="str-ex-label">RPE {{ ex.actualRpe }}</span>
                      <span class="rpe-hint">— {{ rpeHint(ex.actualRpe) }}</span>
                      <button class="rpe-tip-btn" @click.stop="showRpeTip = true">ℹ️ 什么是 RPE？</button>
                    </div>
                    <div class="rpe-chips">
                      <button v-for="r in 10" :key="r"
                        :class="['rpe-chip', { 'rpe-chip-on': ex.actualRpe === r }]"
                        @click.stop="ex.actualRpe = r"
                      >{{ r }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 自定义动作 -->
              <div class="mg-custom">
                <input v-model="customName[mg]" class="text-input mg-custom-input" placeholder="输入自定义动作名称..." @keyup.enter="addCustomExercise(mg)" />
                <button class="btn btn-sm btn-outline" @click="addCustomExercise(mg)">+ 添加</button>
              </div>
            </div>
          </div>

          <!-- 热身与放松 -->
          <div class="rec-section">
            <div class="rec-section-title">热身与放松 <button class="rpe-tip-btn" @click="showWarmupTip = true">ℹ️ 为什么重要？</button></div>
            <label class="rec-check">
              <input type="checkbox" v-model="strengthWarmup" />
              <span>运动前拉伸（5-10 分钟）</span>
            </label>
            <label class="rec-check">
              <input type="checkbox" v-model="strengthCooldown" />
              <span>运动后放松（5-10 分钟）</span>
            </label>
          </div>

          <div class="form-actions">
            <button class="btn btn-ghost" @click="store.cancelStrengthModal">取消</button>
            <button class="btn btn-primary" @click="submitStrength">保存并完成</button>
          </div>
        </div>

        <!-- RPE 说明弹窗 -->
        <div v-if="showRpeTip" class="rpe-tip-overlay" @click.self="showRpeTip = false">
          <div class="rpe-tip-content">
            <h4>什么是 RPE？</h4>
            <p class="rpe-tip-desc">RPE（主观疲劳感知评分）是你对自己训练用力程度的主观评价，范围 1–10：</p>
            <div class="rpe-tip-list">
              <div v-for="r in 10" :key="r" class="rpe-tip-row">
                <span class="rpe-tip-num">{{ r }}</span>
                <span class="rpe-tip-bar" :style="{ background: getRpeColor(r), width: (r * 10) + '%' }"></span>
                <span class="rpe-tip-label">{{ rpeLabels[r] }}</span>
              </div>
            </div>
            <p class="rpe-tip-footer">数值越高，代表训练强度越大。结合组数次数使用，更准确评估训练量。</p>
            <div class="form-actions"><button class="btn btn-primary" @click="showRpeTip = false">知道了</button></div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 热身放松说明弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showWarmupTip" @click.self="showWarmupTip = false">
        <div class="modal-content">
          <h4>为什么热身和放松很重要？</h4>
          <div class="warmup-tip-body">
            <div class="warmup-tip-item">
              <strong>🏋️ 运动前拉伸（5-10 分钟）</strong>
              <p>激活肌肉、提高心率和体温、增加关节活动范围，有效预防运动损伤。动态拉伸（如摆腿、肩绕环、开合跳）比静态拉伸更适合热身。</p>
            </div>
            <div class="warmup-tip-item">
              <strong>🧘 运动后放松（5-10 分钟）</strong>
              <p>帮助心率逐渐回落、促进乳酸代谢、减少肌肉酸痛。建议进行静态拉伸（每个动作保持 15-30 秒）和深呼吸。</p>
            </div>
          </div>
          <div class="form-actions"><button class="btn btn-primary" @click="showWarmupTip = false">记住了</button></div>
        </div>
      </div>
    </Teleport>
    </div>
  </div>
</template>

<style scoped>
.week-nav { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 6px 0 8px; }
.week-arrow { font-size: 20px; font-weight: 400; color: var(--color-text); padding: 4px 12px; }
.week-label { font-size: 14px; font-weight: 650; min-width: 140px; text-align: center; color: var(--color-text); }

/* 今日紧凑概览条 */
.today-bar {
  margin: 8px 0 6px;
  padding: 10px 14px;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.today-bar-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.today-date-num {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.today-date-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.today-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.today-sub {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.today-streak {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  margin-left: auto;
}

.today-bar-cardio {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.cardio-text { font-weight: 500; }
.cardio-diff { color: var(--color-text-tertiary); }

.cardio-mini-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-light);
  overflow: hidden;
  max-width: 80px;
  margin-left: auto;
}

.cardio-mini-fill {
  height: 100%;
  background: var(--color-cardio);
  border-radius: 2px;
  transition: width 0.5s var(--ease-out);
  min-width: 0;
}

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
.exercise-done { opacity: 0.6; background: var(--color-primary-bg); }

.ex-check { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0;
  color: var(--color-text-tertiary); }
.ex-checked { color: var(--color-primary); }

.ex-name { font-size: 13px; font-weight: 550; flex: 1; }
.ex-prescription { font-size: 11px; color: var(--color-text-secondary); white-space: nowrap; }
.ex-warn { font-size: 10px; color: var(--color-accent); font-weight: 600; margin-left: 4px; }

/* RPE 说明弹窗 */
.rpe-tip-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: overlayIn 0.2s var(--ease-out);
}

.rpe-tip-content {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: 24px;
  margin: 24px;
  max-width: 360px;
  width: 100%;
  animation: scaleIn 0.25s var(--ease-out);
  box-shadow: var(--shadow-xl);
}

.rpe-tip-content h4 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}

.rpe-tip-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.rpe-tip-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 16px;
}

.rpe-tip-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rpe-tip-num {
  width: 16px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
  flex-shrink: 0;
}

.rpe-tip-bar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.3s var(--ease-out);
}

.rpe-tip-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.rpe-tip-footer {
  font-size: 12px;
  color: var(--color-text-tertiary);
  line-height: 1.5;
  margin-bottom: 8px;
}

.day-foot { display: flex; gap: 6px; align-items: center; }
.done-badge { font-size: 12px; color: var(--color-primary); font-weight: 600; }

/* 力量弹窗 */
.str-quick-row { display: flex; gap: 6px; margin-bottom: 12px; }

/* 力量弹窗 — 每个动作块 */
.str-ex-block {
  margin-bottom: 8px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: all var(--duration-fast) var(--ease-out);
}

.str-ex-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  border-radius: var(--radius-sm);
}

.str-ex-head:active {
  background: var(--color-surface-hover);
}

.str-ex-done {
  background: var(--color-primary-bg);
}

.str-ex-done .ex-name {
  text-decoration: line-through;
  opacity: 0.7;
}

/* 第二行：实际参数 */
.str-ex-detail {
  padding: 4px 12px 14px 42px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fadeInUp 0.2s var(--ease-out);
}

/* 组数+次数 并排 */
.str-ex-detail-row {
  display: flex;
  gap: 24px;
}

.str-ex-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.str-ex-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.str-ex-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.str-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 18px;
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1.5px solid var(--color-border);
  font-weight: 400;
  line-height: 1;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
}

.str-btn:active {
  background: var(--color-surface-hover);
  transform: scale(0.9);
}

.str-ex-val {
  font-size: 20px;
  font-weight: 700;
  min-width: 32px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* RPE 区域 — 独占一行 */
.str-ex-rpe-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.str-ex-rpe-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.str-ex-rpe-header .str-ex-label {
  font-size: 13px;
  font-weight: 600;
}

.rpe-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.rpe-tip-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 2px 6px;
  margin-left: auto;
  border-radius: 6px;
  transition: all var(--duration-fast) var(--ease-out);
  font-weight: 500;
}

.rpe-tip-btn:active {
  background: var(--color-primary-bg);
}

/* RPE 数字选择器 — 5×2 全宽排列 */
.rpe-chips {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.rpe-chip {
  height: 38px;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  text-align: center;
  line-height: 38px;
  padding: 0;
}

.rpe-chip:active {
  transform: scale(0.92);
  background: var(--color-surface-hover);
}

.rpe-chip-on {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 179, 101, 0.35);
}

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

/* 部位区块 */
.mg-block {
  margin-bottom: 10px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg);
}

.mg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  user-select: none;
}

.mg-head:active {
  background: var(--color-surface-hover);
}

.mg-icon { font-size: 16px; }
.mg-label { font-size: 14px; font-weight: 650; flex: 1; }
.mg-count { font-size: 11px; color: var(--color-primary); font-weight: 600; background: var(--color-primary-bg); padding: 2px 8px; border-radius: 10px; }
.mg-arrow { font-size: 10px; color: var(--color-text-tertiary); }

.mg-body {
  padding: 0 12px 12px;
  animation: fadeInUp 0.2s var(--ease-out);
}

/* 推荐动作 chip */
.mg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
}

.mg-chip {
  font-size: 11px;
  padding: 5px 10px;
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: transparent;
  border-radius: 14px;
}

.mg-chip:active {
  transform: scale(0.95);
  background: var(--color-primary-bg);
}

.mg-chip-added {
  opacity: 0.35;
  pointer-events: none;
}

.mg-chip-tag {
  font-size: 9px;
  background: var(--color-accent);
  color: #fff;
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 3px;
  font-weight: 700;
  vertical-align: middle;
}

/* 已选动作的删除按钮 */
.str-ex-del {
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
  flex-shrink: 0;
}

.str-ex-del:active {
  background: var(--color-surface-hover);
  color: var(--color-danger);
}

/* 自定义动作输入 */
.mg-custom {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.mg-custom-input {
  flex: 1;
  padding: 8px 10px;
  font-size: 13px;
}

/* 热身与放松 */
.rec-section {
  margin: 12px 0;
  padding: 10px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.rec-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rec-check {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}

.rec-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

/* 热身放松说明弹窗 */
.warmup-tip-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 14px 0;
}

.warmup-tip-item strong {
  font-size: 14px;
  display: block;
  margin-bottom: 4px;
}

.warmup-tip-item p {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
