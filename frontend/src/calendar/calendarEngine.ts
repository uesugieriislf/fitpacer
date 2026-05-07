// calendar/calendarEngine.ts — 纯函数：月历网格生成 + 日期状态判断
//
// 数据流：getMonthGrid(year, month, plan, recordedDates)
//   → DayCell[]（扁平数组，含前置空位填充）

import type { DayPlan } from "../plan/storage";

/** 日历中一个格子的状态 */
export type CellStatus = "completed" | "missed" | "cardio" | "strength" | "rest" | "none";

export interface DayCell {
  /** 日期字符串 'YYYY-MM-DD'，空位为 '' */
  date: string;
  /** 该月第几天（1–31），空位为 0 */
  day: number;
  /** 状态 */
  status: CellStatus;
  /** 是否属于当前月份 */
  isCurrentMonth: boolean;
}

/**
 * 给定年份和月份，生成 42 格（6 行 × 7 列）月历网格。
 * 前置填充上月末日期（status=none, isCurrentMonth=false），后置填充下月初日期。
 */
export function getMonthGrid(
  year: number,
  month: number, // 1–12
  plan: DayPlan[],
  recordedDates: Set<string>,
): DayCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0); // 当月最后一天
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  const cells: DayCell[] = [];

  // 1. 前置填充：上月末日期
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    cells.push({
      date: fmtDate(y, m, d),
      day: d,
      status: "none",
      isCurrentMonth: false,
    });
  }

  // 2. 当月日期
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = fmtDate(year, month, d);
    cells.push({
      date: dateStr,
      day: d,
      status: getDayStatus(dateStr, plan, recordedDates),
      isCurrentMonth: true,
    });
  }

  // 3. 后置填充：下月初日期
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    cells.push({
      date: fmtDate(y, m, d),
      day: d,
      status: "none",
      isCurrentMonth: false,
    });
  }

  return cells;
}

/** 判断某一天的状态 */
export function getDayStatus(
  dateStr: string,
  plan: DayPlan[],
  recordedDates: Set<string>,
): CellStatus {
  const planDay = plan.find((p) => p.date === dateStr);
  const hasRecord = recordedDates.has(dateStr);

  // 有记录或计划已完成 → green
  if (hasRecord || (planDay && planDay.completed)) return "completed";

  if (!planDay) return "none";

  // 有计划但未完成且已标记错过
  if (planDay.missed) return "missed";

  // 计划类型
  if (planDay.type === "cardio") return "cardio";
  if (planDay.type === "strength") return "strength";
  if (planDay.type === "rest") return "rest";

  return "none";
}

/** 格式化 YYYY-MM-DD */
function fmtDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** 获取今日日期字符串 */
export function getTodayStr(): string {
  const now = new Date();
  return fmtDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
