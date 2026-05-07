// exercise/useExercise.test.ts — Pinia store 测试
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { useExercise } from './useExercise'
import type { CustomExercise } from './storage'

/** 自定义动作库的 localStorage key（与 storage.ts 同步） */
const STORE_KEY = 'fitpacer_custom_exercises'

beforeEach(() => {
  setActivePinia(createPinia())
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

describe('useExercise', () => {
  describe('add', () => {
    it('添加自定义动作', () => {
      const store = useExercise()
      const ex = store.add('测试动作', 'chest', '3×10')
      expect(ex.name).toBe('测试动作')
      expect(ex.muscleGroup).toBe('chest')
      expect(ex.defaultPrescription).toBe('3×10')
      expect(ex.id).toMatch(/^ce_/)
      expect(store.allCustom).toHaveLength(1)
    })

    it('添加到不同部位', () => {
      const store = useExercise()
      store.add('深蹲', 'legs', '4×12')
      store.add('俯卧撑', 'chest', '3×10')
      expect(store.allCustom).toHaveLength(2)
    })

    it('持久化到 localStorage', () => {
      const store = useExercise()
      store.add('哑铃弯举', 'shoulders_back', '3×12')
      const saved = JSON.parse(localStorage.getItem(STORE_KEY)!)
      expect(saved).toHaveLength(1)
      expect(saved[0].name).toBe('哑铃弯举')
    })
  })

  describe('update', () => {
    it('更新动作名称', () => {
      const store = useExercise()
      const ex = store.add('旧名', 'chest', '3×10')
      store.update(ex.id, { name: '新名' })
      expect(store.allCustom[0].name).toBe('新名')
    })

    it('更新部位和 prescription', () => {
      const store = useExercise()
      const ex = store.add('动作', 'chest', '3×10')
      store.update(ex.id, { muscleGroup: 'legs', defaultPrescription: '4×12' })
      expect(store.allCustom[0].muscleGroup).toBe('legs')
      expect(store.allCustom[0].defaultPrescription).toBe('4×12')
    })

    it('不存在的 ID 不报错', () => {
      const store = useExercise()
      store.update('nonexistent', { name: '新' })
      expect(store.allCustom).toHaveLength(0)
    })
  })

  describe('remove', () => {
    it('删除自定义动作', () => {
      const store = useExercise()
      const ex = store.add('动作', 'chest', '3×10')
      store.remove(ex.id)
      expect(store.allCustom).toHaveLength(0)
    })

    it('同步更新 localStorage', () => {
      const store = useExercise()
      const ex = store.add('动作', 'chest', '3×10')
      store.remove(ex.id)
      const saved = JSON.parse(localStorage.getItem(STORE_KEY)!)
      expect(saved).toHaveLength(0)
    })
  })

  describe('getExercisesByGroup', () => {
    it('返回内置 + 自定义混合列表', () => {
      const store = useExercise()
      store.add('自定义俯卧撑', 'chest', '4×15')
      const result = store.getExercisesByGroup('chest')
      // 自定义排前面
      expect(result[0].name).toBe('自定义俯卧撑')
      // 后面的都是内置动作
      expect(result.length).toBeGreaterThan(1)
      expect(result.some(e => e.name === '标准俯卧撑')).toBe(true)
    })

    it('无自定义时只返回内置动作', () => {
      const store = useExercise()
      const result = store.getExercisesByGroup('legs')
      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result.every(e => !('id' in e) || !(e as CustomExercise).id)).toBe(true)
    })

    it('自定义动作仅出现在对应部位', () => {
      const store = useExercise()
      store.add('腿举', 'legs', '3×10')
      const chest = store.getExercisesByGroup('chest')
      expect(chest.every(e => e.name !== '腿举')).toBe(true)
    })
  })
})
