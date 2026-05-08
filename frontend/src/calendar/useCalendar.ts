// calendar/useCalendar.ts — Composable：月历状态管理
//
// 持有当前 year/month 响应式状态，调用 calendarEngine 生成网格数据。
// 不是 Pinia store——不管理持久状态，只做计算和导航。

import { ref, computed, type Ref } from "vue";
import { getMonthGrid, getTodayStr } from "./calendarEngine";
import type { DayPlan } from "../plan/storage";
import type { DayCell } from "./calendarEngine";

export function useCalendar(plan: Ref<DayPlan[]>, recordedDates: Ref<Set<string>>) {
  const year = ref(new Date().getFullYear());
  const month = ref(new Date().getMonth() + 1); // 1–12

  /** 今日日期（响应式：页面可见时自动刷新） */
  const todayStr = ref(getTodayStr());
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        todayStr.value = getTodayStr();
      }
    });
  }

  /** 月历网格数据 */
  const cells = computed<DayCell[]>(() =>
    getMonthGrid(year.value, month.value, plan.value, recordedDates.value),
  );

  /** 月份标签，如 "2026年5月" */
  const monthLabel = computed(() => `${year.value}年${month.value}月`);

  function prevMonth() {
    if (month.value === 1) {
      month.value = 12;
      year.value--;
    } else {
      month.value--;
    }
  }

  function nextMonth() {
    if (month.value === 12) {
      month.value = 1;
      year.value++;
    } else {
      month.value++;
    }
  }

  function goToToday() {
    const now = new Date();
    year.value = now.getFullYear();
    month.value = now.getMonth() + 1;
  }

  return {
    year,
    month,
    cells,
    monthLabel,
    todayStr,
    prevMonth,
    nextMonth,
    goToToday,
  };
}
