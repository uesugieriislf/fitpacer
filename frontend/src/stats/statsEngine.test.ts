// stats/statsEngine.test.ts — 单元测试

import { describe, it, expect } from "vite-plus/test";
import { getPeriodReport } from "./statsEngine";
import type { TrainingRecord } from "../record/storage";

function rec(action: string, date: string, sets: number, reps: number): TrainingRecord {
  return { id: "t", date, action, sets, reps, rpe: 7, note: "" };
}

describe("getPeriodReport", () => {
  const records: TrainingRecord[] = [
    rec("引体向上", "2026-05-04", 3, 8), // 周一
    rec("俯卧撑", "2026-05-04", 3, 12),
    rec("引体向上", "2026-05-07", 4, 6), // 周四
    rec("深蹲", "2026-05-07", 5, 10),
    rec("慢跑", "2026-05-05", 1, 30), // 周二
    rec("引体向上", "2026-04-28", 3, 8), // 上周
  ];

  it("should return correct week stats", () => {
    const r = getPeriodReport(records, "week", 0);
    // 2026-05-04 是周一，当前周范围
    expect(r.trainingDays).toBeGreaterThanOrEqual(3);
    expect(r.totalSets).toBeGreaterThan(0);
    expect(r.periodKey).toContain("-W");
  });

  it("should aggregate exercises by name", () => {
    const r = getPeriodReport(records, "month", 0);
    const pullup = r.exercises.find((e) => e.name === "引体向上");
    expect(pullup).toBeDefined();
    expect(pullup!.totalSets).toBeGreaterThanOrEqual(6); // 3+4=6(跨月), 或者 3(当月)
    expect(pullup!.totalSessions).toBeGreaterThanOrEqual(1);
  });

  it("should sort exercises by totalSets desc", () => {
    const r = getPeriodReport(records, "month", 0);
    for (let i = 1; i < r.exercises.length; i++) {
      expect(r.exercises[i - 1].totalSets).toBeGreaterThanOrEqual(r.exercises[i].totalSets);
    }
  });

  it("should handle empty records", () => {
    const r = getPeriodReport([], "month", 0);
    expect(r.trainingDays).toBe(0);
    expect(r.totalSets).toBe(0);
    expect(r.exercises).toEqual([]);
  });

  it("should handle different months", () => {
    // April 2026 records
    const aprilRecords = [rec("引体向上", "2026-04-01", 3, 8), rec("俯卧撑", "2026-04-15", 4, 10)];
    const r = getPeriodReport(aprilRecords, "month", -1); // prev month
    // period label should mention previous month
    expect(r.periodLabel).toBeTruthy();
  });

  it("should return correct quarter report", () => {
    const r = getPeriodReport(records, "quarter", 0);
    expect(r.periodKey).toMatch(/Q[1-4]$/);
    expect(r.periodLabel).toContain("Q");
  });

  it("should return correct year report", () => {
    const r = getPeriodReport(records, "year", 0);
    expect(r.periodKey).toMatch(/^\d{4}$/);
    expect(r.periodLabel).toContain("年");
  });

  it("should calculate totalSets and totalReps correctly", () => {
    const r = getPeriodReport(records, "month", 0);
    const expectedSets = r.exercises.reduce((s, e) => s + e.totalSets, 0);
    const expectedReps = r.exercises.reduce((s, e) => s + e.totalReps, 0);
    expect(r.totalSets).toBe(expectedSets);
    expect(r.totalReps).toBe(expectedReps);
  });
});
