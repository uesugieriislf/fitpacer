// plan/planEngine.ts — 计划生成与调整算法（纯函数）

import type { DayPlan, PlanConfig, TrainingType, ExerciseItem, CardioRecord } from './storage'

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

/** 力量训练动作定义（不再固��生成，保留仅供旧数据兼容） */
const STRENGTH_EXERCISE_DEFS: { name: string; prescription: string }[] = [
  { name: '引体向上', prescription: '3×8-12' },
  { name: '双杠臂屈伸', prescription: '3×8-12' },
  { name: '下斜俯卧撑', prescription: '3×10-15' },
  { name: '保加利亚分腿蹲', prescription: '3×10-12/侧' }
]

/** 力量日部位描述 */
const STRENGTH_DETAILS = '胸 / 肩背 / 腿'

/** 有氧训练动作定义 */
export const CARDIO_ACTIONS: string[] = ['慢跑', '跳绳', '骑行', '游泳', '快走', '划船机', '椭圆机', '爬楼梯']

/** 补全某一天缺失的 exercises（兼容旧数据） */
export function ensureDayExercises(day: DayPlan): DayPlan {
  if (day.exercises && day.exercises.length > 0) return day
  if (day.type === 'strength') {
    // 改为空列表，用户在弹窗中按部位自由选择动作
    return { ...day, exercises: [] }
  }
  if (day.type === 'cardio') {
    const isLong = day.details?.includes('长有氧') ?? false
    return { ...day, exercises: getCardioExercises(isLong) }
  }
  return day
}

export function getStrengthExercises(): ExerciseItem[] {
  // 用户按部位自由选择，不再预生成
  return []
}

function getStrengthDetails(): string {
  return STRENGTH_DETAILS
}

export function getCardioExercises(isLong: boolean): ExerciseItem[] {
  const names = isLong
    ? ['慢跑（长有氧）']
    : ['慢跑', '跳绳']
  return names.map(name => ({ name, prescription: isLong ? '60-70分钟' : '35-40分钟', completed: false }))
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
    let exercises: ExerciseItem[] = []
    let cardioRecord: CardioRecord | null = null
    if (type === 'strength') {
      details = getStrengthDetails()
      exercises = []
    } else if (type === 'cardio') {
      details = getCardioDetails(dow === LONG_CARDIO_DAY)
      exercises = getCardioExercises(dow === LONG_CARDIO_DAY)
    }

    plan.push({
      date: dateStr,
      type,
      completed: false,
      missed: false,
      details,
      exercises,
      cardioRecord,
      warmupDone: false,
      cooldownDone: false,
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
  options.push(<AdjustOption>{
    label: '保持原计划',
    description: '仅标记本次错过，后续计划不变',
    apply: (plan: DayPlan[]) => {
      return plan.map(p =>
        p.date === missedDate ? { ...p, missed: true } : p
      )
    }
  })

  // 选项 2：推迟到最近空档（有可用休息日时才提供）
  const nextSlot = findNextSlot(plan, missedDate)
  if (nextSlot) {
    options.push(<AdjustOption>{
      label: '推迟到最近空档',
      description: `将本次训练推迟到 ${nextSlot.slice(5)}，不改后续计划`,
      apply: (plan: DayPlan[]) => moveToSlot(plan, missedDate, nextSlot)
    })
  }

  // 选项 3：重新对齐（级联调整后续同类型训练，维持合理间隔）
  if (day.type === 'strength') {
    options.push(<AdjustOption>{
      label: '重新对齐',
      description: '将力量训练顺延至最近空档，并重排后续力量日，维持 72 小时间隔',
      apply: (plan: DayPlan[]) => realignStrength(plan, missedDate)
    })
  } else if (day.type === 'cardio' && nextSlot) {
    options.push(<AdjustOption>{
      label: '重新对齐',
      description: '推迟到最近空档，并顺延后续有氧日，保持每周训练节奏',
      apply: (plan: DayPlan[]) => realignCardio(plan, missedDate, nextSlot)
    })
  }

  return options
}

/** 将某天的训练内容整体移动到另一个空档日，并标注来源 */
export function moveToSlot(plan: DayPlan[], fromDate: string, toDate: string): DayPlan[] {
  const fromDay = plan.find(p => p.date === fromDate)
  const toDay = plan.find(p => p.date === toDate)
  if (!fromDay || !toDay || toDay.type !== 'rest') return plan

  const sourceLabel = fromDate.slice(5, 10) // MM-DD

  return plan.map(p => {
    if (p.date === fromDate) {
      return {
        ...p,
        type: 'rest',
        missed: true,
        completed: false,
        details: '',
        exercises: [],
        cardioRecord: null
      }
    }
    if (p.date === toDate) {
      // 目标日期继承原训练内容，标注来源
      const baseDetails = fromDay.type === 'strength'
        ? getStrengthDetails()
        : (fromDay.details || '')
      const exercises = fromDay.type === 'strength'
        ? []
        : getCardioExercises(fromDay.details?.includes('长有氧') ?? false)
      return {
        ...toDay,
        type: fromDay.type,
        completed: false,
        missed: false,
        details: `📌 从 ${sourceLabel} 补练：${baseDetails}`,
        exercises: exercises.map(e => ({ ...e, completed: false })),
        cardioRecord: null
      }
    }
    return { ...p }
  })
}

/** 有氧日重新对齐：推到最近空档并顺延后续有氧日 */
function realignCardio(plan: DayPlan[], missedDate: string, firstSlot: string): DayPlan[] {
  let current = moveToSlot(plan, missedDate, firstSlot)

  // 找到后续有氧日并顺延
  const missedIdx = plan.findIndex(p => p.date === missedDate)
  const cardioIndices: number[] = []
  for (let i = missedIdx + 1; i < plan.length; i++) {
    if (current[i]?.type === 'cardio' && !current[i].completed) {
      cardioIndices.push(i)
    }
  }

  // 顺延：每个有氧日向后推一天，找到空档
  for (const ci of cardioIndices) {
    const date = current[ci].date
    const nextRest = findNextSlot(current, date)
    if (nextRest) {
      current = moveToSlot(current, date, nextRest)
    }
  }

  return current
}

/** 重新对齐：插入补练并顺延后续力量日，保持非连续原则 */
function realignStrength(plan: DayPlan[], missedDate: string): DayPlan[] {
  // 先用 moveToSlot 把错过的训练推到下一个空档
  const firstSlot = findNextSlot(plan, missedDate)
  if (!firstSlot) {
    // 没有空档，仅标记错过
    return plan.map(p => p.date === missedDate ? { ...p, missed: true } : { ...p })
  }

  let newPlan = moveToSlot(plan, missedDate, firstSlot)

  // 找到后续所有力量日（未完成的）— 排除已移到 firstSlot 的补练日
  const strengthIndices: number[] = []
  for (let i = 0; i < newPlan.length; i++) {
    if (newPlan[i].type === 'strength' && !newPlan[i].completed && newPlan[i].date > firstSlot) {
      strengthIndices.push(i)
    }
  }

  // 顺延后续力量日：每个力量日向后推到下一个 rest 日（至少隔一天）
  for (let si = 0; si < strengthIndices.length; si++) {
    const prevDate = si === 0
      ? firstSlot
      : newPlan[strengthIndices[si - 1]].date

    // 在 + 3 天后找最近的 rest 日
    let targetDate = addDays(parseDate(prevDate), 3)
    let targetIdx = newPlan.findIndex(p => p.date === formatDate(targetDate))

    while (targetIdx >= 0 && targetIdx < newPlan.length) {
      if (newPlan[targetIdx].type === 'rest') break
      targetDate = addDays(targetDate, 1)
      targetIdx = newPlan.findIndex(p => p.date === formatDate(targetDate))
    }

    if (targetIdx >= 0 && targetIdx < newPlan.length) {
      const origDate = newPlan[strengthIndices[si]].date
      const targetDate = newPlan[targetIdx].date
      newPlan = moveToSlot(newPlan, origDate, targetDate)
    }
  }

  return newPlan
}

/** 获取过去一周内被忽视的力量训练动作名称集合
 *  - 扫描指定日期之前 7 天内的所有力量训练日
 *  - 返回那些分配到但未完成的动作 name 集合
 */
export function getNeglectedExercises(plan: DayPlan[], currentMonday: string): Set<string> {
  const fromDate = formatDate(addDays(parseDate(currentMonday), -7))
  const neglected = new Set<string>()

  for (const day of plan) {
    if (day.date < fromDate || day.date >= currentMonday) continue
    if (day.type !== 'strength') continue
    if (day.missed || day.exercises.length === 0) continue

    for (const ex of day.exercises) {
      if (!ex.completed) {
        neglected.add(ex.name)
      }
    }
  }

  return neglected
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

/** 查找某日期之后所有可用空档（最多返回 N 个） */
export function findAvailableSlots(plan: DayPlan[], fromDate: string, maxCount = 7): string[] {
  const fromIdx = plan.findIndex(p => p.date === fromDate)
  if (fromIdx === -1) return []

  const slots: string[] = []
  for (let i = fromIdx + 1; i < plan.length && slots.length < maxCount; i++) {
    if (plan[i].type === 'rest' && !plan[i].completed) {
      slots.push(plan[i].date)
    }
  }
  return slots
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
