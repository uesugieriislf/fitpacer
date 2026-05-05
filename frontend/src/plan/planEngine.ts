// plan/planEngine.ts — 计划生成与调整算法（纯函数）

import type { DayPlan, PlanConfig, TrainingType } from './storage'

// === 日期工具函数 ===

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getDayOfWeek(dateStr: string): number {
  return parseDate(dateStr).getDay() // 0=Sun, 1=Mon, ..., 6=Sat
}

/** 获取某日期所在周的周一 */
function getMonday(dateStr: string): string {
  const d = parseDate(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // if Sunday, go back 6 days
  d.setDate(d.getDate() + diff)
  return formatDate(d)
}

/** 获取某日期所在周的周日 */
function getSunday(dateStr: string): string {
  const mon = parseDate(getMonday(dateStr))
  return formatDate(addDays(mon, 6))
}

function daysBetween(a: string, b: string): number {
  const da = parseDate(a).getTime()
  const db = parseDate(b).getTime()
  return Math.round((db - da) / (1000 * 60 * 60 * 24))
}

// === 计划生成 ===
// 规则：同类型训练不连续安排，中间至少隔一天休息
const STRENGTH_DAYS = [1, 4] // 周一、周四
const CARDIO_DAYS = [2, 5, 0] // 周二、周五、周日（3次有氧，不连续）
const LONG_CARDIO_DAY = 0    // 周日 = 长有氧

const STRENGTH_EXERCISES = [
  '引体向上 3×8-12',
  '双杠臂屈伸 3×8-12',
  '下斜俯卧撑 3×10-15',
  '保加利亚分腿蹲 3×10-12/侧'
]

function getStrengthDetails(): string {
  return STRENGTH_EXERCISES.join(' | ')
}

function getCardioDetails(isLong: boolean): string {
  // 周二 40min + 周五 40min + 周日长有氧 70min = 150min/周（符合 WHO 推荐）
  return isLong ? '长有氧 60-70 分钟' : '有氧 35-40 分钟'
}

function getTrainingType(dayOfWeek: number, trainingDays: number[]): TrainingType {
  if (!trainingDays.includes(dayOfWeek)) return 'rest'
  if (STRENGTH_DAYS.includes(dayOfWeek)) return 'strength'
  if (CARDIO_DAYS.includes(dayOfWeek)) return 'cardio'
  return 'rest'
}

/** 生成未来 4 周（28 天）训练计划 */
export function generatePlan(config: PlanConfig): DayPlan[] {
  const { startDate, trainingDays } = config
  const start = parseDate(startDate)
  const plan: DayPlan[] = []

  for (let i = 0; i < 28; i++) {
    const date = addDays(start, i)
    const dateStr = formatDate(date)
    const dow = date.getDay()
    const type = getTrainingType(dow, trainingDays)

    let details = ''
    if (type === 'strength') {
      details = getStrengthDetails()
    } else if (type === 'cardio') {
      details = getCardioDetails(dow === LONG_CARDIO_DAY)
    }

    plan.push({
      date: dateStr,
      type,
      completed: false,
      missed: false,
      details
    })
  }

  return plan
}

// === 计划调整 ===

export interface AdjustOption {
  label: string
  description: string
  /** 应用此选项后返回新的计划 */
  apply: (plan: DayPlan[]) => DayPlan[]
}

/** 当用户错过某天训练时，返回可选的调整方案 */
export function getAdjustOptions(plan: DayPlan[], missedDate: string): AdjustOption[] {
  const idx = plan.findIndex(p => p.date === missedDate)
  if (idx === -1) return []

  const day = plan[idx]
  const options: AdjustOption[] = []

  // 选项 1：保持原计划
  options.push({
    label: '保持原计划',
    description: '仅标记本次错过，后续计划不变',
    apply: (plan: DayPlan[]) => {
      return plan.map(p =>
        p.date === missedDate ? { ...p, missed: true } : p
      )
    }
  })

  // 选项 2：重新对齐（仅力量日有效）
  if (day.type === 'strength') {
    options.push({
      label: '重新对齐',
      description: '将错过的力量训练顺延至最近空档，维持 72 小时间隔',
      apply: (plan: DayPlan[]) => realignStrength(plan, missedDate)
    })
  }

  return options
}

/** 重新对齐：插入补练并顺延后续力量日，保持非连续原则 */
function realignStrength(plan: DayPlan[], missedDate: string): DayPlan[] {
  const newPlan = plan.map(p => ({ ...p }))

  // 标记错过
  const missedIdx = newPlan.findIndex(p => p.date === missedDate)
  if (missedIdx !== -1) {
    newPlan[missedIdx] = { ...newPlan[missedIdx], missed: true }
  }

  // 找到后续所有的力量日（未完成的）
  const strengthIndices: number[] = []
  for (let i = missedIdx + 1; i < newPlan.length; i++) {
    if (newPlan[i].type === 'strength' && !newPlan[i].completed) {
      strengthIndices.push(i)
    }
  }

  if (strengthIndices.length === 0) return newPlan

  // 将第一个后续力量日变为补练日
  const firstStrengthIdx = strengthIndices[0]
  newPlan[firstStrengthIdx] = {
    ...newPlan[firstStrengthIdx],
    details: '⚠️ 补练：' + getStrengthDetails()
  }

  // 顺延后续力量日：每个力量日向后推到下一个 rest 日（至少隔一天）
  for (let si = 1; si < strengthIndices.length; si++) {
    const prevDate = strengthIndices[si - 1]
    const prevNewDate = newPlan[prevDate].date

    // 在原力量日 + 3 天后找最近的 rest 日
    let targetDate = addDays(parseDate(prevNewDate), 3)
    let targetIdx = newPlan.findIndex(p => p.date === formatDate(targetDate))

    while (targetIdx >= 0 && targetIdx < newPlan.length) {
      if (newPlan[targetIdx].type === 'rest') break
      targetDate = addDays(targetDate, 1)
      targetIdx = newPlan.findIndex(p => p.date === formatDate(targetDate))
    }

    if (targetIdx >= 0 && targetIdx < newPlan.length) {
      const orig = newPlan[strengthIndices[si]]
      newPlan[targetIdx] = {
        date: newPlan[targetIdx].date,
        type: 'strength',
        completed: false,
        missed: false,
        details: getStrengthDetails()
      }
      newPlan[strengthIndices[si]] = {
        date: orig.date,
        type: 'rest',
        completed: false,
        missed: false,
        details: ''
      }
    }
  }

  return newPlan
}

/** 在计划中查找某个日期之后的下一个可用空档 */
export function findNextSlot(plan: DayPlan[], fromDate: string): string | null {
  const fromIdx = plan.findIndex(p => p.date === fromDate)
  if (fromIdx === -1) return null

  for (let i = fromIdx + 1; i < plan.length; i++) {
    if (plan[i].type === 'rest' && !plan[i].completed) {
      return plan[i].date
    }
  }
  return null
}

// === 周视图工具 ===

export interface WeekInfo {
  monday: string
  sunday: string
  days: DayPlan[]
  label: string
}

/** 获取某日期所在周的周信息 */
export function getWeekInfo(plan: DayPlan[], dateStr: string): WeekInfo | null {
  const mon = getMonday(dateStr)
  const sun = getSunday(dateStr)

  const days = plan.filter(p => p.date >= mon && p.date <= sun)

  const monDate = parseDate(mon)
  const label = `${monDate.getMonth() + 1}/${monDate.getDate()} - ${parseDate(sun).getMonth() + 1}/${parseDate(sun).getDate()}`

  return { monday: mon, sunday: sun, days, label }
}

/** 获取当前周（包含今天的周）的周一 */
export function getCurrentWeekMonday(): string {
  return getMonday(formatDate(new Date()))
}

/** 向前或向后获取 n 周的周一 */
export function getWeekMondayOffset(offset: number): string {
  const mon = parseDate(getCurrentWeekMonday())
  return formatDate(addDays(mon, offset * 7))
}
