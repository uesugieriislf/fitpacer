<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { usePlan } from './usePlan'
import { getTypeIcon, getTypeLabel, weekdayLabels } from '../shared/icons'
import { getAdjustOptions } from './planEngine'
import type { DayPlan } from './storage'

const store = usePlan()

onMounted(() => { store.ensurePlan() })

const weekInfo = computed(() => store.weekInfo)
const weekLabel = computed(() => weekInfo.value?.label ?? '')

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
        <div class="day-top">
          <div class="day-date-block">
            <span class="day-date-num">{{ new Date(day.date + 'T00:00:00').getDate() }}</span>
            <span class="day-date-wd">周{{ weekdayLabels[new Date(day.date + 'T00:00:00').getDay()] }}</span>
          </div>
          <span v-if="isToday(day.date)" class="today-tag">今天</span>
          <span :class="['badge', getBadgeClass(day.type)]">{{ getTypeLabel(day.type) }}</span>
        </div>

        <div class="day-detail" v-if="day.details">{{ day.details }}</div>

        <div class="day-foot" v-if="day.type !== 'rest' && !day.completed && !day.missed">
          <button class="btn btn-primary btn-sm" @click="store.markCompleted(day.date)">完成</button>
          <button class="btn btn-ghost btn-sm" @click="store.skipDay(day.date)">跳过</button>
        </div>
        <div class="day-foot" v-if="day.completed">
          <span class="done-badge">✅ 已完成</span>
          <button class="btn btn-ghost btn-sm" @click="store.markCompleted(day.date)">撤销</button>
        </div>
      </div>
    </div>

    <div v-if="!store.hasPlan" class="empty-state">
      <span class="empty-icon">📅</span>
      <p>还没有训练计划</p>
      <button class="btn btn-primary" @click="store.initPlan()">生成计划</button>
    </div>

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
    </div>
  </div>
</template>

<style scoped>
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.header-actions { display: flex; gap: 6px; }

.week-nav { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 8px 0 12px; }
.week-arrow { font-size: 20px; font-weight: 400; color: var(--color-text); padding: 4px 12px; }
.week-label { font-size: 14px; font-weight: 650; min-width: 140px; text-align: center; color: var(--color-text); }

.day-list { display: flex; flex-direction: column; gap: 8px; }

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

.day-detail { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; line-height: 1.5; }

.day-foot { display: flex; gap: 6px; align-items: center; }
.done-badge { font-size: 12px; color: var(--color-primary); font-weight: 600; }

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