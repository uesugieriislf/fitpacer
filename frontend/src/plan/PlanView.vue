<script setup lang="ts">
import { onMounted, computed, ref, reactive } from 'vue'
import { usePlan } from './usePlan'
import { getTypeIcon, getTypeLabel, weekdayLabels } from '../shared/icons'
import { getAdjustOptions, CARDIO_ACTIONS } from './planEngine'
import type { DayPlan, CardioRecord } from './storage'

const store = usePlan()

onMounted(() => { store.ensurePlan() })

const weekInfo = computed(() => store.weekInfo)
const weekLabel = computed(() => weekInfo.value?.label ?? '')

/** 展开中的日期集合（点击中间区域切换） */
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

/** 有氧完成弹窗的本地表单数据 */
const cardioForm = reactive({
  durationMinutes: 30,
  avgHeartRate: undefined as number | undefined,
  action: '慢跑'
})

function openCardioModal(date: string) {
  cardioForm.durationMinutes = 30
  cardioForm.avgHeartRate = undefined
  cardioForm.action = '慢跑'
  store.markCompleted(date) // 触发打开弹窗
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

/** 检查动作是否被忽视 */
function isNeglected(name: string): boolean {
  return store.neglectedExercises.has(name)
}

/** 计算当天力量训练完成进度 */
function completionPct(day: DayPlan): number {
  if (!day.exercises || day.exercises.length === 0) return 0
  return Math.round((day.exercises.filter(e => e.completed).length / day.exercises.length) * 100)
}

/** 所有动作完成才算这一天完成 */
function areAllExercisesDone(day: DayPlan): boolean {
  if (day.type === 'rest') return true
  if (!day.exercises || day.exercises.length === 0) return true
  return day.exercises.every(e => e.completed)
}
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

        <!-- 摘要：可点击展开 -->
        <div class="day-detail" v-if="day.details"
          @click="day.type !== 'rest' && toggleExpand(day.date)">
          <span>{{ day.details }}</span>
          <span v-if="day.type !== 'rest'" class="expand-hint">{{ isExpanded(day.date) ? '收起 ▲' : '展开 ▼' }}</span>
        </div>

        <!-- 有氧记录概要（已完成且有 cardioRecord） -->
        <div class="day-cardio-summary" v-if="day.type === 'cardio' && day.completed && day.cardioRecord">
          <span class="cardio-stat">🕐 {{ day.cardioRecord.durationMinutes }}分钟</span>
          <span class="cardio-stat" v-if="day.cardioRecord.avgHeartRate">💓 {{ day.cardioRecord.avgHeartRate }} bpm</span>
          <span class="cardio-stat" v-if="day.cardioRecord.action">{{ day.cardioRecord.action }}</span>
        </div>

        <!-- 力量训练：动作清单（展开时显示） -->
        <div class="exercise-list" v-if="isExpanded(day.date) && day.exercises && day.exercises.length > 0">
          <div class="exercise-progress">
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
            @click.stop="store.toggleExercise(day.date, ei)"
          >
            <span :class="['ex-check', ex.completed ? 'ex-checked' : '']">
              {{ ex.completed ? '✅' : '○' }}
            </span>
            <span class="ex-name">{{ ex.name }}</span>
            <span class="ex-prescription">{{ ex.prescription }}</span>
            <span v-if="!ex.completed && isNeglected(ex.name) && !day.completed" class="ex-warn">⚠️ 上周未做</span>
          </div>
        </div>

        <!-- 有氧训练：动作清单（展开时显示） -->
        <div class="exercise-list" v-if="isExpanded(day.date) && day.type === 'cardio' && day.exercises && day.exercises.length > 0 && !day.completed">
          <div
            v-for="(ex, ei) in day.exercises"
            :key="ei"
            :class="['exercise-item exercise-item-info']"
          >
            <span class="ex-name">{{ ex.name }}</span>
            <span class="ex-prescription">{{ ex.prescription }}</span>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="day-foot" v-if="day.type !== 'rest' && !day.completed && !day.missed">
          <button class="btn btn-primary btn-sm" @click="day.type === 'cardio' ? openCardioModal(day.date) : store.markCompleted(day.date)">
            {{ day.type === 'cardio' ? '完成（记录详情）' : '完成' }}
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
          <p class="modal-desc">完成 {{ store.cardioModalDate }} 的有氧训练，记录你的表现</p>

          <!-- 运动类型 -->
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

          <!-- 运动时长 -->
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
            </div>
          </div>

          <!-- 平均心率 -->
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
    </div>
  </div>
</template>

<style scoped>
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.header-actions { display: flex; gap: 6px; }

.week-nav { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 8px 0 12px; }
.week-arrow { font-size: 20px; font-weight: 400; color: var(--color-text); padding: 4px 12px; }
.week-label { font-size: 14px; font-weight: 650; min-width: 140px; text-align: center; color: var(--color-text); }

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

.day-detail { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; line-height: 1.5;
  cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.expand-hint { font-size: 10px; color: var(--color-primary); white-space: nowrap; margin-left: 8px; opacity: 0.7; }

/* 有氧记录概要 */
.day-cardio-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.cardio-stat { font-size: 11px; background: var(--color-cardio-bg); color: var(--color-cardio);
  padding: 3px 8px; border-radius: 8px; font-weight: 550; }

/* 动作清单 */
.exercise-list { margin-bottom: 8px; animation: fadeInUp 0.3s var(--ease-out); }

.exercise-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.progress-bar-mini { flex: 1; height: 4px; background: var(--color-border-light); border-radius: 2px; overflow: hidden; }
.progress-fill-mini { height: 100%; background: var(--color-primary); border-radius: 2px; transition: width var(--duration-fast) var(--ease-out); }
.progress-label { font-size: 11px; font-weight: 600; color: var(--color-primary); min-width: 32px; text-align: right; }

.exercise-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 8px;
  cursor: pointer; transition: all var(--duration-fast) var(--ease-out);
  background: var(--color-bg); margin-bottom: 4px; }
.exercise-item:active { transform: scale(0.98); background: var(--color-surface-hover); }
.exercise-item-info { cursor: default; background: transparent !important; }
.exercise-done { opacity: 0.6; background: var(--color-primary-bg); }
.exercise-neglected { background: rgba(255, 107, 53, 0.08); border: 1px solid rgba(255, 107, 53, 0.2); }

.ex-check { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0;
  color: var(--color-text-tertiary); }
.ex-checked { color: var(--color-primary); }

.ex-name { font-size: 13px; font-weight: 550; flex: 1; }
.exercise-done .ex-name { text-decoration: line-through; }
.ex-prescription { font-size: 11px; color: var(--color-text-secondary); white-space: nowrap; }
.ex-warn { font-size: 10px; color: var(--color-accent); font-weight: 600; margin-left: 4px; }

.day-foot { display: flex; gap: 6px; align-items: center; }
.done-badge { font-size: 12px; color: var(--color-primary); font-weight: 600; }

/* 有氧完成弹窗 */
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
.modal-desc { color: var(--color-text-secondary); margin: 8px 0 16px; font-size: 14px; }
.adj-option { cursor: pointer; margin-bottom: 8px; border: 1px solid transparent; border-radius: var(--radius);
  transition: all var(--duration-fast) var(--ease-out); }
.adj-option:active { transform: scale(0.98); border-color: var(--color-primary); background: var(--color-primary-bg); }
.adj-option p { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }

.empty-state { text-align: center; padding: 40px 20px; animation: fadeInUp 0.4s var(--ease-out); }
.empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; display: block; animation: float 3s ease-in-out infinite; }
.empty-state p { margin-bottom: 12px; font-size: 14px; color: var(--color-text-secondary); }
</style>
