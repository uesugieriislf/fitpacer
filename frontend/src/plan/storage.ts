// plan/storage.ts — localStorage 读写 + 类型定义

export type TrainingType = 'strength' | 'cardio' | 'rest'

export interface DayPlan {
  date: string        // 'YYYY-MM-DD'
  type: TrainingType
  completed: boolean
  missed: boolean
  details: string
}

export interface PlanConfig {
  startDate: string
  trainingDays: number[]  // 0=Sun, 1=Mon, ..., 6=Sat
}

const PLAN_KEY = 'fitpacer_training_plan'
const CONFIG_KEY = 'fitpacer_plan_config'

/** 从 localStorage 加载训练计划 */
export function loadPlan(): DayPlan[] {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data as DayPlan[]
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
