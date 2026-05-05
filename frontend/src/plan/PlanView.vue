<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { usePlan } from './usePlan'
import { getTypeIcon, getTypeLabel, weekdayLabels } from '../shared/icons'
import { getAdjustOptions } from './planEngine'
import type { DayPlan } from './storage'

const store = usePlan()

onMounted(() => {
  store.ensurePlan()
})

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

/** 获取当前调整日期的可选方案 */
function getAdjustOptionsForDate(plan: DayPlan[], date: string) {
  return getAdjustOptions(plan, date)
}
</script>

<template>
  <div class="plan-view view">
    <!-- 顶部操作栏 -->
    <div class="plan-header">
      <h1 class="plan-title">📅 训练计划</h1>
      <div class="plan-header-actions">
        <button class="btn btn-primary btn-sm" @click="store.handleOpenInCalendar">
          📅 添加到日历
        </button>
        <button class="btn btn-outline btn-sm" @click="store.handleExportICS">
          📲 导出 ICS
        </button>
      </div>
    </div>

    <!-- 周导航 -->
    <div class="week-nav">
      <button class="btn btn-sm nav-arrow" @click="store.goToWeek(-1)">◀</button>
      <span class="week-label">{{ weekLabel }}</span>
      <button class="btn btn-sm nav-arrow" @click="store.goToWeek(1)">▶</button>
    </div>

    <!-- 周日历 -->
    <div class="week-calendar card-stagger" v-if="weekInfo">
      <div
        v-for="day in weekInfo.days"
        :key="day.date"
        class="day-card card"
        :class="{
          'day-today': isToday(day.date),
          'day-completed': day.completed,
          'day-missed': day.missed,
          [`day-${day.type}`]: true
        }"
      >
        <div class="day-header">
          <span class="day-date">
            {{ new Date(day.date + 'T00:00:00').getDate() }}日
            {{ weekdayLabels[new Date(day.date + 'T00:00:00').getDay()] }}
          </span>
          <span v-if="isToday(day.date)" class="day-today-badge">今天</span>
          <span class="day-icon">{{ getTypeIcon(day.type) }}</span>
        </div>

        <div class="day-type">
          <span :class="['badge', getBadgeClass(day.type)]">{{ getTypeLabel(day.type) }}</span>
          <span v-if="day.completed" class="day-status">✅</span>
          <span v-if="day.missed" class="day-status">⏭️</span>
        </div>

        <div class="day-details" v-if="day.details">
          {{ day.details }}
        </div>

        <div class="day-actions" v-if="day.type !== 'rest' && !day.completed && !day.missed">
          <button class="btn btn-primary btn-sm day-action-btn" @click="store.markCompleted(day.date)">
            ✅ 完成
          </button>
          <button class="btn btn-sm day-action-btn day-skip-btn" @click="store.skipDay(day.date)">
            ⏭️ 跳过
          </button>
        </div>

        <div class="day-actions" v-if="day.completed">
          <button class="btn btn-sm day-action-btn" @click="store.markCompleted(day.date)">
            ↩️ 撤销
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!store.hasPlan" class="empty-state">
      <span class="empty-icon">📅</span>
      <p>还没有训练计划</p>
      <button class="btn btn-primary" @click="store.initPlan()">🎯 生成计划</button>
    </div>

    <!-- 调整弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="store.showAdjustModal" @click.self="store.cancelAdjust">
        <div class="modal-content card">
          <h3>调整计划</h3>
          <p class="modal-desc">你错过了 {{ store.adjustDate }} 的训练，如何调整？</p>
          <div
            v-for="(opt, i) in getAdjustOptionsForDate(store.plan, store.adjustDate!)"
            :key="i"
            class="adjust-option card"
            @click="store.applyAdjustOption(i)"
          >
            <strong>{{ opt.label }}</strong>
            <p>{{ opt.description }}</p>
          </div>
          <button class="btn btn-sm" @click="store.cancelAdjust" style="margin-top:8px">取消</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.plan-view {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.plan-header-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.plan-title {
  font-size: 22px;
  font-weight: 700;
}

.week-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.week-label {
  font-size: 15px;
  font-weight: 600;
  min-width: 120px;
  text-align: center;
}

.nav-arrow {
  transition: transform var(--duration-fast) var(--ease-out), background var(--duration-fast) ease;
}

.nav-arrow:active {
  transform: scale(0.9);
}

.week-calendar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-card {
  border-left: 4px solid var(--color-border);
  transition: all var(--duration) var(--ease-out);
}

.day-card:active {
  transform: scale(0.99);
  box-shadow: var(--shadow-sm);
}

.day-card.day-strength {
  border-left-color: var(--color-strength);
}

.day-card.day-cardio {
  border-left-color: var(--color-cardio);
}

.day-today {
  box-shadow: 0 0 0 2px var(--color-primary), 0 2px 8px rgba(46, 125, 81, 0.15);
}

.day-completed {
  opacity: 0.7;
  border-left-color: var(--color-primary) !important;
}

.day-missed {
  opacity: 0.5;
  border-left-color: #F44336 !important;
  background: var(--color-missed);
}

.day-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.day-date {
  font-size: 16px;
  font-weight: 700;
}

.day-today-badge {
  background: var(--color-primary-gradient);
  color: white;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  animation: bounceIn 0.4s var(--ease-bounce);
  box-shadow: 0 1px 4px rgba(46, 125, 81, 0.3);
}

.day-icon {
  margin-left: auto;
  font-size: 20px;
}

.day-type {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.day-status {
  font-size: 16px;
  animation: bounceIn 0.3s var(--ease-bounce);
}

.day-details {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.day-actions {
  display: flex;
  gap: 8px;
}

.day-action-btn {
  transition: all var(--duration-fast) var(--ease-out);
}

.day-action-btn:active {
  transform: scale(0.93);
}

.day-skip-btn {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
}

.empty-state p {
  margin-bottom: 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  border-radius: 16px 16px 0 0;
  padding: 24px;
}

.modal-desc {
  color: var(--color-text-secondary);
  margin: 8px 0 16px;
  font-size: 14px;
}

.adjust-option {
  cursor: pointer;
  margin-bottom: 8px;
  transition: all var(--duration-fast) var(--ease-out);
  border: 1px solid transparent;
}

.adjust-option:active {
  opacity: 0.7;
  transform: scale(0.98);
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.adjust-option p {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
</style>