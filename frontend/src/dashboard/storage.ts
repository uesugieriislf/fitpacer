// dashboard/storage.ts — localStorage 读写 + 类型定义

export interface BodyData {
  id: string
  date: string        // 'YYYY-MM-DD'
  weight: number      // kg
  waist: number       // cm
  sleepHours: number  // 睡眠时长（小时）
  sleepQuality: number // 睡眠质量 1-5
  soreness: number    // 肌肉酸痛度 1-5
}

const BODY_DATA_KEY = 'fitpacer_body_data'

export function loadBodyData(): BodyData[] {
  try {
    const raw = localStorage.getItem(BODY_DATA_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data as BodyData[]
  } catch {
    return []
  }
}

export function saveBodyData(data: BodyData[]): void {
  localStorage.setItem(BODY_DATA_KEY, JSON.stringify(data))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
