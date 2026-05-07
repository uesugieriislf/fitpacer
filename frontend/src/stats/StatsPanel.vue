<script setup lang="ts">
import { ref, computed } from 'vue'
import { getPeriodReport, type PeriodUnit } from './statsEngine'
import type { TrainingRecord } from '../record/storage'

const props = defineProps<{
  records: TrainingRecord[]
}>()

const periodUnits: { key: PeriodUnit; label: string }[] = [
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'quarter', label: '季度' },
  { key: 'year', label: '年' },
]

const activeUnit = ref<PeriodUnit>('month')
const offset = ref(0)

const report = computed(() =>
  getPeriodReport(props.records, activeUnit.value, offset.value)
)

function prevPeriod() { offset.value-- }
function nextPeriod() { offset.value++ }
function resetPeriod() { offset.value = 0 }
</script>

<template>
  <section class="section">
    <div class="section-header">
      <h2 class="section-title">训练统计</h2>
    </div>

    <div class="stats-card card card-elevated">
      <!-- 维度切换 -->
      <div class="st-dimension">
        <button
          v-for="u in periodUnits"
          :key="u.key"
          :class="['st-dim-btn', { 'st-dim-active': activeUnit === u.key }]"
          @click="activeUnit = u.key; offset = 0"
        >{{ u.label }}</button>
      </div>

      <!-- 时段导航 -->
      <div class="st-nav">
        <button class="st-nav-btn" @click="prevPeriod">‹</button>
        <button class="st-nav-title" @click="resetPeriod" :title="'回到当前'">
          {{ report.periodLabel }}
        </button>
        <button class="st-nav-btn" @click="nextPeriod">›</button>
      </div>

      <!-- 概要 -->
      <div class="st-summary">
        <div class="st-summary-item">
          <span class="st-summary-num">{{ report.trainingDays }}</span>
          <span class="st-summary-label">训练天</span>
        </div>
        <div class="st-summary-divider"></div>
        <div class="st-summary-item">
          <span class="st-summary-num">{{ report.totalSets }}</span>
          <span class="st-summary-label">总组数</span>
        </div>
        <div class="st-summary-divider"></div>
        <div class="st-summary-item">
          <span class="st-summary-num">{{ report.totalReps }}</span>
          <span class="st-summary-label">总次数</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="report.exercises.length === 0" class="st-empty">
        <span>该时段暂无训练记录</span>
      </div>

      <!-- 动作排名 -->
      <div v-else class="st-exercise-list">
        <div
          v-for="(ex, i) in report.exercises"
          :key="ex.name"
          class="st-exercise-item"
        >
          <span class="st-ex-rank">{{ i + 1 }}</span>
          <div class="st-ex-info">
            <span class="st-ex-name">{{ ex.name }}</span>
            <div class="st-ex-meta">
              <span>{{ ex.totalSets }} 组</span>
              <span class="st-ex-dot">·</span>
              <span>{{ ex.totalReps }} 次</span>
              <span class="st-ex-dot">·</span>
              <span>{{ ex.totalSessions }} 天</span>
            </div>
          </div>
          <!-- 迷你柱状条 -->
          <div class="st-ex-bar-wrap">
            <div
              class="st-ex-bar"
              :style="{ width: (ex.totalSets / Math.max(...report.exercises.map(e => e.totalSets)) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats-card {
  padding: 18px;
  animation: slideUp 0.35s var(--ease-out);
}

/* 维度切换 */
.st-dimension {
  display: flex;
  gap: 4px;
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 3px;
  margin-bottom: 14px;
}

.st-dim-btn {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 0;
  border-radius: 10px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.st-dim-active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-xs);
}

/* 时段导航 */
.st-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.st-nav-btn {
  background: transparent;
  border: none;
  font-size: 22px;
  color: var(--color-text);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  font-weight: 300;
  line-height: 1;
}

.st-nav-btn:active {
  background: var(--color-surface-hover);
  transform: scale(0.9);
}

.st-nav-title {
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 650;
  color: var(--color-text);
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--ease-out);
  letter-spacing: -0.2px;
}

.st-nav-title:active {
  background: var(--color-surface-hover);
}

/* 概要 */
.st-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 18px;
  padding: 12px;
  background: var(--color-primary-bg);
  border-radius: var(--radius-sm);
}

.st-summary-item {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.st-summary-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.st-summary-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.st-summary-divider {
  width: 1px;
  height: 36px;
  background: var(--color-border-light);
}

/* 空状态 */
.st-empty {
  text-align: center;
  padding: 24px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

/* 动作排名 */
.st-exercise-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.st-exercise-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-xs);
  background: var(--color-bg);
  transition: all var(--duration-fast) var(--ease-out);
}

.st-exercise-item:active {
  transform: scale(0.98);
}

.st-ex-rank {
  width: 20px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-tertiary);
  text-align: center;
}

.st-exercise-item:nth-child(1) .st-ex-rank { color: var(--color-primary); }
.st-exercise-item:nth-child(2) .st-ex-rank { color: var(--color-cardio); }
.st-exercise-item:nth-child(3) .st-ex-rank { color: var(--color-strength); }

.st-ex-info {
  flex: 1;
  min-width: 0;
}

.st-ex-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  display: block;
}

.st-ex-meta {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 1px;
  display: flex;
  gap: 4px;
  align-items: center;
}

.st-ex-dot {
  color: var(--color-text-tertiary);
}

/* 迷你柱状条 */
.st-ex-bar-wrap {
  width: 50px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-light);
  overflow: hidden;
  flex-shrink: 0;
}

.st-ex-bar {
  height: 100%;
  background: var(--color-primary-gradient);
  border-radius: 2px;
  transition: width var(--duration) var(--ease-out);
  min-width: 0;
}
</style>
