// plan/storage.ts — localStorage 读写 + 类型定义

export type TrainingType = 'strength' | 'cardio' | 'rest'

/** 力量训练单项动作 */
export interface ExerciseItem {
  name: string          // "引体向上"
  prescription: string  // "3×8-12"
  completed: boolean
}

/** 有氧训练完成记录 */
export interface CardioRecord {
  durationMinutes: number   // 运动时长（分钟）
  avgHeartRate?: number     // 平均心率（可选）
  action?: string           // 有氧动作（可选）
}

export interface DayPlan {
  date: string        // 'YYYY-MM-DD'
  type: TrainingType
  completed: boolean
  missed: boolean
  details: string
  /** 力量训练的动作清单（空数组表示非力量日或未加载） */
  exercises: ExerciseItem[]
  /** 有氧训练完成时的记录（null 表示未记录） */
  cardioRecord: CardioRecord | null
}

export interface PlanConfig {
  startDate: string
  trainingDays: number[]  // 0=Sun, 1=Mon, ..., 6=Sat
}

const PLAN_KEY = 'fitpacer_training_plan'
const CONFIG_KEY = 'fitpacer_plan_config'

/** 从 localStorage 加载训练计划，兼容旧版数据（无 exercises/cardioRecord 字段） */
export function loadPlan(): DayPlan[] {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    // 迁移旧数据：补全 exercises 和 cardioRecord 字段
    return data.map((d: any) => ({
      ...d,
      exercises: Array.isArray(d.exercises) ? d.exercises : [],
      cardioRecord: d.cardioRecord ?? null
    })) as DayPlan[]
  } catch {
    return []
  }
}

/** 保存训练计划到 localStorage */
export function savePlan(plan: DayPlan[]): void {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
}

/** 加载计划配置 */
export function loadConfig(): PlanConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlanConfig
  } catch {
    return null
  }
}

/** 保存计划配置 */
export function saveConfig(config: PlanConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}
