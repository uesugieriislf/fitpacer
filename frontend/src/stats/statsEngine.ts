// stats/statsEngine.ts — 纯函数：按时间段聚合训练记录

import type { TrainingRecord } from '../record/storage'

/** 单个动作的统计汇总 */
export interface ExerciseAgg {
  name: string
  totalSets: number
  totalReps: number
  totalSessions: number   // 该动作出现的训练天数
}

/** 一个时间段的统计报告 */
export interface PeriodReport {
  periodKey: string       // "2026-W19", "2026-05", "2026-Q2", "2026"
  periodLabel: string     // "第19周", "2026年5月", "2026年Q2", "2026年"
  trainingDays: number    // 有记录的天数
  totalSets: number       // 该时间段内总组数
  totalReps: number       // 总次数
  exercises: ExerciseAgg[]// 按总组数降序排列
}

export type PeriodUnit = 'week' | 'month' | 'quarter' | 'year'

/**
 * 按时间段聚合训练记录。
 * @param records - 全部训练记录
 * @param unit - 时间粒度
 * @param offset - 0=当前时段, -1=前一时段, 1=下一时段
 */
export function getPeriodReport(
  records: TrainingRecord[],
  unit: PeriodUnit,
  offset: number
): PeriodReport {
  const now = new Date()
  const { since, until, key, label } = getPeriodBounds(now, unit, offset)

  const filtered = records.filter(r => r.date >= since && r.date < until)

  // 统计训练天数
  const daySet = new Set(filtered.map(r => r.date))

  // 按动作聚合
  const aggMap = new Map<string, ExerciseAgg>()
  filtered.forEach(r => {
    if (!aggMap.has(r.action)) {
      aggMap.set(r.action, { name: r.action, totalSets: 0, totalReps: 0, totalSessions: 0 })
    }
    const agg = aggMap.get(r.action)!
    agg.totalSets += r.sets
    agg.totalReps += r.reps
  })
  // 统计每个动作出现的天数
  const actionDayMap = new Map<string, Set<string>>()
  filtered.forEach(r => {
    if (!actionDayMap.has(r.action)) actionDayMap.set(r.action, new Set())
    actionDayMap.get(r.action)!.add(r.date)
  })
  actionDayMap.forEach((days, name) => {
    if (aggMap.has(name)) aggMap.get(name)!.totalSessions = days.size
  })

  const exercises = Array.from(aggMap.values()).sort((a, b) => b.totalSets - a.totalSets)

  const totalSets = exercises.reduce((s, e) => s + e.totalSets, 0)
  const totalReps = exercises.reduce((s, e) => s + e.totalReps, 0)

  return { periodKey: key, periodLabel: label, trainingDays: daySet.size, totalSets, totalReps, exercises }
}

/**
 * 获取时间段的起止边界 + 标签。
 * since/until 为 "YYYY-MM-DD" 格式，范围是 [since, until)
 */
function getPeriodBounds(
  date: Date,
  unit: PeriodUnit,
  offset: number
): { since: string; until: string; key: string; label: string } {
  const y = date.getFullYear()
  const m = date.getMonth() + 1

  if (unit === 'week') {
    return getWeekBounds(date, offset)
  }
  if (unit === 'month') {
    const targetMonth = m + offset
    return getMonthBounds(y, targetMonth)
  }
  if (unit === 'quarter') {
    const q = Math.ceil(m / 3) + offset
    return getQuarterBounds(y, q)
  }
  // year
  return getYearBounds(y + offset)
}

function getWeekBounds(date: Date, offset: number): { since: string; until: string; key: string; label: string } {
  const d = new Date(date)
  d.setDate(d.getDate() + offset * 7)
  // 找到周一
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 7)

  const since = fmtDate(mon)
  const until = fmtDate(sun)

  // 计算 ISO 周数
  const weekNum = getISOWeek(mon)
  const yearLabel = mon.getFullYear()
  return {
    since, until,
    key: `${yearLabel}-W${String(weekNum).padStart(2, '0')}`,
    label: `第${weekNum}周`
  }
}

function getMonthBounds(year: number, month: number): { since: string; until: string; key: string; label: string } {
  // 处理跨年
  let y = year
  let m = month
  while (m < 1) { m += 12; y-- }
  while (m > 12) { m -= 12; y++ }

  const since = `${y}-${String(m).padStart(2, '0')}-01`
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const until = `${nextY}-${String(nextM).padStart(2, '0')}-01`

  return {
    since, until,
    key: `${y}-${String(m).padStart(2, '0')}`,
    label: `${y}年${m}月`
  }
}

function getQuarterBounds(year: number, quarter: number): { since: string; until: string; key: string; label: string } {
  let y = year
  let q = quarter
  while (q < 1) { q += 4; y-- }
  while (q > 4) { q -= 4; y++ }

  const startMonth = (q - 1) * 3 + 1
  const since = `${y}-${String(startMonth).padStart(2, '0')}-01`
  const endMonth = startMonth + 3
  const endY = endMonth > 12 ? y + 1 : y
  const em = endMonth > 12 ? endMonth - 12 : endMonth
  const until = `${endY}-${String(em).padStart(2, '0')}-01`

  return {
    since, until,
    key: `${y}-Q${q}`,
    label: `${y}年Q${q}`
  }
}

function getYearBounds(year: number): { since: string; until: string; key: string; label: string } {
  return {
    since: `${year}-01-01`,
    until: `${year + 1}-01-01`,
    key: `${year}`,
    label: `${year}年`
  }
}

/** 计算 ISO 周数 */
function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
