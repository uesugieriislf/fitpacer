<script setup lang="ts">
import { computed } from "vue";
import { useCalendar } from "./useCalendar";
import type { DayPlan } from "../plan/storage";
import type { CellStatus } from "./calendarEngine";

const props = defineProps<{
  plan: DayPlan[];
  recordedDates: Set<string>;
}>();

const { cells, monthLabel, todayStr, prevMonth, nextMonth, goToToday } = useCalendar(
  computed(() => props.plan),
  computed(() => props.recordedDates),
);

/** 状态对应的颜色和标签 */
const statusMeta: Record<CellStatus, { color: string; label: string }> = {
  completed: { color: "var(--color-primary)", label: "已完成" },
  missed: { color: "var(--color-danger)", label: "错过" },
  cardio: { color: "var(--color-cardio)", label: "有氧" },
  strength: { color: "var(--color-strength)", label: "力量" },
  rest: { color: "var(--color-rest)", label: "休息" },
  none: { color: "transparent", label: "" },
};

/** 今日是否是当前月份 */
const isTodayInView = computed(() => {
  return cells.value.some((c) => c.date === todayStr.value && c.isCurrentMonth);
});
</script>

<template>
  <section class="section">
    <div class="section-header">
      <h2 class="section-title">训练日历</h2>
    </div>

    <div class="cal-card card card-elevated">
      <!-- 月份导航 -->
      <div class="cal-nav">
        <button class="cal-nav-btn" @click="prevMonth">‹</button>
        <button class="cal-nav-title" @click="goToToday" :title="isTodayInView ? '回到今天' : ''">
          {{ monthLabel }}
        </button>
        <button class="cal-nav-btn" @click="nextMonth">›</button>
      </div>

      <!-- 星期行 -->
      <div class="cal-weekdays">
        <span v-for="wd in ['日', '一', '二', '三', '四', '五', '六']" :key="wd" class="cal-wd">{{
          wd
        }}</span>
      </div>

      <!-- 日期网格 -->
      <div class="cal-grid">
        <div
          v-for="(cell, i) in cells"
          :key="i"
          :class="[
            'cal-cell',
            { 'cal-cell-muted': !cell.isCurrentMonth },
            { 'cal-cell-today': cell.date === todayStr },
          ]"
        >
          <span class="cal-day-num">{{ cell.day || "" }}</span>
          <span
            v-if="cell.isCurrentMonth && cell.status !== 'none'"
            :class="['cal-dot', { 'cal-dot-ring': cell.status === 'missed' }]"
            :style="{
              background: cell.status === 'missed' ? 'transparent' : statusMeta[cell.status].color,
              borderColor: statusMeta[cell.status].color,
            }"
          ></span>
        </div>
      </div>

      <!-- 图例 -->
      <div class="cal-legend">
        <span
          v-for="meta in [
            statusMeta.completed,
            statusMeta.strength,
            statusMeta.cardio,
            statusMeta.rest,
            statusMeta.missed,
          ]"
          :key="meta.label"
          class="cal-legend-item"
        >
          <span
            class="cal-legend-dot"
            :class="{ 'cal-legend-dot-ring': meta.label === '错过' }"
            :style="{
              background: meta.label === '错过' ? 'transparent' : meta.color,
              borderColor: meta.color,
            }"
          ></span>
          <span class="cal-legend-label">{{ meta.label }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cal-card {
  padding: 18px;
  animation: slideUp 0.35s var(--ease-out);
}

/* 月份导航 */
.cal-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.cal-nav-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--color-text);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  font-weight: 300;
  line-height: 1;
}

.cal-nav-btn:active {
  background: var(--color-surface-hover);
  transform: scale(0.9);
}

.cal-nav-title {
  background: transparent;
  border: none;
  font-size: 16px;
  font-weight: 650;
  color: var(--color-text);
  cursor: pointer;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--ease-out);
  letter-spacing: -0.2px;
}

.cal-nav-title:active {
  background: var(--color-surface-hover);
}

/* 星期行 */
.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 6px;
}

.cal-wd {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 4px 0;
}

/* 日期网格 */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  min-height: 40px;
  border-radius: var(--radius-xs);
  position: relative;
}

.cal-cell-today .cal-day-num {
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
}

.cal-day-num {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.cal-cell-muted .cal-day-num {
  color: var(--color-text-tertiary);
  opacity: 0.4;
}

.cal-cell-today .cal-day-num {
  opacity: 1;
}

/* 状态指示点 */
.cal-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  margin-top: 2px;
  flex-shrink: 0;
}

.cal-dot-ring {
  width: 7px;
  height: 7px;
  border: 1.5px solid;
  background: transparent !important;
}

/* 图例 */
.cal-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 14px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-light);
}

.cal-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cal-legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.cal-legend-dot-ring {
  width: 8px;
  height: 8px;
  border: 1.5px solid;
  background: transparent !important;
}

.cal-legend-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 500;
}
</style>
