// exercise/storage.ts — 自定义动作库 localStorage 读写

import type { ExerciseDef, MuscleGroup } from '../shared/exercises'

export interface CustomExercise extends ExerciseDef {
  id: string
}

const CUSTOM_KEY = 'fitpacer_custom_exercises'

export function loadCustomExercises(): CustomExercise[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data as CustomExercise[]
  } catch {
    return []
  }
}

export function saveCustomExercises(list: CustomExercise[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
}

export function generateId(): string {
  return 'ce_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
