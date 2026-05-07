// exercise/storage.test.ts — storage 层测试
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { loadCustomExercises, saveCustomExercises, generateId } from './storage'
import type { CustomExercise } from './storage'

const STORE_KEY = 'fitpacer_custom_exercises'

beforeEach(() => {
  const map = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => map.delete(k),
    clear: () => map.clear(),
    get length() { return map.size },
    key: (i: number) => [...map.keys()][i] ?? null
  })
})

function makeEx(overrides?: Partial<CustomExercise>): CustomExercise {
  return {
    id: generateId(),
    name: '测试动作',
    muscleGroup: 'chest',
    defaultPrescription: '3×10',
    ...overrides
  }
}

describe('generateId', () => {
  it('生成唯一 ID，前缀为 ce_', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^ce_/)
  })
})

describe('loadCustomExercises', () => {
  it('无数据时返回空数组', () => {
    expect(loadCustomExercises()).toEqual([])
  })

  it('返回已保存的数据', () => {
    const ex = makeEx()
    saveCustomExercises([ex])
    const loaded = loadCustomExercises()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]).toEqual(ex)
  })

  it('损坏的 JSON 返回空数组', () => {
    localStorage.setItem(STORE_KEY, '{bad json')
    expect(loadCustomExercises()).toEqual([])
  })

  it('非数组数据返回空数组', () => {
    localStorage.setItem(STORE_KEY, '{"name":"test"}')
    expect(loadCustomExercises()).toEqual([])
  })
})

describe('saveCustomExercises', () => {
  it('保存后可读取', () => {
    const list = [makeEx({ name: '动作A' }), makeEx({ name: '动作B' })]
    saveCustomExercises(list)
    expect(loadCustomExercises()).toHaveLength(2)
  })

  it('覆盖已有数据', () => {
    saveCustomExercises([makeEx({ name: '旧' })])
    saveCustomExercises([makeEx({ name: '新' })])
    const loaded = loadCustomExercises()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('新')
  })
})
