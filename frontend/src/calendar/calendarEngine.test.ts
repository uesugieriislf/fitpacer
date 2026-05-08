// calendar/calendarEngine.test.ts — 单元测试

import { describe, it, expect } from "vite-plus/test";
import { getMonthGrid, getDayStatus, getTodayStr } from "./calendarEngine";
import type { DayPlan } from "../plan/storage";

const makePlan = (
  date: string,
  type: DayPlan["type"],
  completed = false,
  missed = false,
): DayPlan => ({
  date,
  type,
  completed,
  missed,
  details: "",
  exercises: [],
  cardioRecord: null,
  warmupDone: false,
  cooldownDone: false,
});

describe("getMonthGrid", () => {
  it("should return 42 cells for any month", () => {
    const grid = getMonthGrid(2026, 5, [], new Set());
    expect(grid.length).toBe(42);
  });

  it("should have correct number of current-month days", () => {
    // May 2026 has 31 days
    const grid = getMonthGrid(2026, 5, [], new Set());
    const currentDays = grid.filter((c) => c.isCurrentMonth);
    expect(currentDays.length).toBe(31);
  });

  it("should have February 2024 with 29 days (leap year)", () => {
    const grid = getMonthGrid(2024, 2, [], new Set());
    const currentDays = grid.filter((c) => c.isCurrentMonth);
    expect(currentDays.length).toBe(29);
  });

  it("should start on correct weekday (May 1 2026 is Friday = 5)", () => {
    const grid = getMonthGrid(2026, 5, [], new Set());
    // 前 5 个格子应该是上个月的
    const prefix = grid.slice(0, 5);
    expect(prefix.every((c) => !c.isCurrentMonth)).toBe(true);
    // 第 6 个格子是 5 月 1 日
    expect(grid[5].day).toBe(1);
    expect(grid[5].isCurrentMonth).toBe(true);
    expect(grid[5].date).toBe("2026-05-01");
  });

  it("should mark non-current-month cells properly", () => {
    const grid = getMonthGrid(2026, 5, [], new Set());
    const nonCurrent = grid.filter((c) => !c.isCurrentMonth);
    expect(nonCurrent.length).toBeGreaterThan(0);
    nonCurrent.forEach((c) => {
      expect(c.status).toBe("none");
      expect(c.day).toBeGreaterThan(0);
    });
  });
});

describe("getDayStatus", () => {
  const recorded = new Set(["2026-05-10", "2026-05-15"]);

  it("should return completed when date has records", () => {
    const plan: DayPlan[] = [makePlan("2026-05-10", "strength", false)];
    expect(getDayStatus("2026-05-10", plan, recorded)).toBe("completed");
  });

  it("should return completed when plan day is completed", () => {
    const plan: DayPlan[] = [makePlan("2026-05-12", "cardio", true)];
    expect(getDayStatus("2026-05-12", plan, new Set())).toBe("completed");
  });

  it("should return cardio for planned but uncompleted cardio day", () => {
    const plan: DayPlan[] = [makePlan("2026-05-13", "cardio", false)];
    expect(getDayStatus("2026-05-13", plan, new Set())).toBe("cardio");
  });

  it("should return strength for planned but uncompleted strength day", () => {
    const plan: DayPlan[] = [makePlan("2026-05-14", "strength", false)];
    expect(getDayStatus("2026-05-14", plan, new Set())).toBe("strength");
  });

  it("should return rest for rest day", () => {
    const plan: DayPlan[] = [makePlan("2026-05-16", "rest")];
    expect(getDayStatus("2026-05-16", plan, new Set())).toBe("rest");
  });

  it("should return missed for missed training day", () => {
    const plan: DayPlan[] = [makePlan("2026-05-17", "strength", false, true)];
    expect(getDayStatus("2026-05-17", plan, new Set())).toBe("missed");
  });

  it("should return none when no plan and no record", () => {
    expect(getDayStatus("2026-05-20", [], new Set())).toBe("none");
  });
});

describe("getTodayStr", () => {
  it("should return a valid YYYY-MM-DD string", () => {
    const s = getTodayStr();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const now = new Date();
    expect(s).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );
  });
});
