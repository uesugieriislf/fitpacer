// plan/planEngine.test.ts — planEngine 纯函数测试
import { describe, it, expect } from 'vitest'
import {
  formatDate,
  parseDate,
  addDays,
  generatePlan,
  getAdjustOptions,
  getNeglectedExercises,
  getWeekInfo,
  getWeekMondayOffset,
  getCurrentWeekMonday,
  ensureDayExercises,
  getStrengthExercises,
  getCardioExercises,
  findNextSlot
} from './planEngine'
import type { DayPlan, PlanConfig } from './storage'

// === 日期工具 ===

describe('formatDate', () => {
  it('格式化为 yyyy-mm-dd', () => {
    expect(formatDate(new Date(2026, 4, 5))).toBe('2026-05-05')
    expect(formatDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('个位数月日补零', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('2026-01-01')
    expect(formatDate(new Date(2026, 2, 9))).toBe('2026-03-09')
  })
})

describe('parseDate', () => {
  it('解析 yyyy-mm-dd 为 Date', () => {
    const d = parseDate('2026-05-05')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4)  // 0-based
    expect(d.getDate()).toBe(5)
  })
})

describe('addDays', () => {
  it('加天数', () => {
    const d = parseDate('2026-05-05')
    expect(formatDate(addDays(d, 7))).toBe('2026-05-12')
    expect(formatDate(addDays(d, -1))).toBe('2026-05-04')
  })
})

// === 计划生成 ===

const baseConfig: PlanConfig = {
  startDate: '2026-05-04', // 周一
  trainingDays: [1, 2, 4, 5, 0], // 周一-周二-周四-周五-周日
  cardioTargetMinutes: 150
}

describe('generatePlan', () => {
  it('生成 28 天计划', () => {
    const plan = generatePlan(baseConfig)
    expect(plan.length).toBe(28)
  })

  it('周一为力量日', () => {
    const plan = generatePlan(baseConfig)
    expect(plan[0].date).toBe('2026-05-04')
    expect(plan[0].type).toBe('strength')
  })

  it('周二为有氧日', () => {
    const plan = generatePlan(baseConfig)
    expect(plan[1].type).toBe('cardio')
  })

  it('周三为休息日', () => {
    const plan = generatePlan(baseConfig)
    expect(plan[2].type).toBe('rest')
  })

  it('力量日包含 exercises', () => {
    const plan = generatePlan(baseConfig)
    const strengthDay = plan[0]
    expect(strengthDay.exercises!.length).toBeGreaterThan(0)
    expect(strengthDay.exercises![0]).toHaveProperty('completed', false)
  })

  it('周日为长有氧（60-70 分钟）', () => {
    const plan = generatePlan(baseConfig)
    // startDate 5/4(周一), 则 5/10 = plan[6] = 周日
    const sunday = plan[6]
    expect(sunday.type).toBe('cardio')
    expect(sunday.details).toContain('长有氧')
  })
})

// === 调整方案 ===

describe('getAdjustOptions', () => {
  it('错过力量日时提供两个选项', () => {
    const plan = generatePlan(baseConfig)
    const opts = getAdjustOptions(plan, '2026-05-04') // 周一力量日
    expect(opts.length).toBe(2)
    expect(opts[0].label).toBe('保持原计划')
    expect(opts[1].label).toBe('重新对齐')
  })

  it('选项1仅标记错过不改计划', () => {
    const plan = generatePlan(baseConfig)
    const opts = getAdjustOptions(plan, '2026-05-04')
    const adjusted = opts[0].apply(plan)
    expect(adjusted[0].missed).toBe(true)
    expect(adjusted[0].type).toBe('strength') // 类型不变
  })

  it('选项2顺延后续力量日', () => {
    const plan = generatePlan(baseConfig)
    const opts = getAdjustOptions(plan, '2026-05-04')
    const adjusted = opts[1].apply(plan)
    expect(adjusted[0].missed).toBe(true)
    // 第一个后续力量日（周四）应变为补练
    const thursday = adjusted[3] // 5/7 = 周四
    expect(thursday.details).toContain('补练')
  })

  it('不存在的日期返回空数组', () => {
    const plan = generatePlan(baseConfig)
    expect(getAdjustOptions(plan, '2099-01-01')).toEqual([])
  })

  it('有氧日没有重新对齐选项', () => {
    const plan = generatePlan(baseConfig)
    const opts = getAdjustOptions(plan, '2026-05-05') // 周二有氧日
    expect(opts.length).toBe(1) // 仅"保持原计划"
  })
})

// === 被忽视动作 ===

describe('getNeglectedExercises', () => {
  it('检测未完成动作', () => {
    const plan = generatePlan(baseConfig)
    // 手动将第一个力量日的动作标记为未完成（explicitly not completed）
    // 默认已是未完成，但 missed 为 false 时才会被统计
    const mon = plan[0]
    expect(mon.type).toBe('strength')
    
    const neglected = getNeglectedExercises(plan, '2026-05-11') // 下周一查看
    // 此时 plan[0] 在 7 天内，missed=false，exercises 全部 completed=false
    expect(neglected.size).toBeGreaterThan(0)
    expect(neglected.has('引体向上')).toBe(true)
  })

  it('已完成的动作不计入', () => {
    const plan = generatePlan(baseConfig)
    // 将第一个力量日（周一）的动作标记已完成
    plan[0] = {
      ...plan[0],
      exercises: plan[0].exercises!.map(e => ({ ...e, completed: true }))
    }
    // 以周四为界，只看周一这一个力量日
    const neglected = getNeglectedExercises(plan, '2026-05-07')
    expect(neglected.size).toBe(0)
  })
})

// === 周视图 ===

describe('getWeekInfo', () => {
  it('返回周信息', () => {
    const plan = generatePlan(baseConfig)
    const week = getWeekInfo(plan, '2026-05-04')
    expect(week).not.toBeNull()
    expect(week!.days.length).toBe(7)
    expect(week!.monday).toBe('2026-05-04')
    expect(week!.sunday).toBe('2026-05-10')
    expect(week!.label).toBe('5/4 - 5/10')
  })
})

describe('getWeekMondayOffset', () => {
  it('offset 0 返回本周一', () => {
    const mon = getCurrentWeekMonday()
    const offset0 = getWeekMondayOffset(0)
    expect(offset0).toBe(mon)
  })

  it('offset 1 返回下周一', () => {
    const mon = getCurrentWeekMonday()
    const next = getWeekMondayOffset(1)
    expect(daysBetweenStr(mon, next)).toBe(7)
  })
})

function daysBetweenStr(a: string, b: string): number {
  const da = parseDate(a).getTime()
  const db = parseDate(b).getTime()
  return Math.round((db - da) / (1000 * 60 * 60 * 24))
}

// === 数据兼容 ===

describe('ensureDayExercises', () => {
  it('已有 exercises 的不修改', () => {
    const day: DayPlan = {
      date: '2026-05-04', type: 'strength', completed: false,
      missed: false, details: '', exercises: [{ name: '测试', prescription: '3x10', completed: false }]
    }
    const result = ensureDayExercises(day)
    expect(result.exercises![0].name).toBe('测试')
  })

  it('旧力量日自动补全 exercises', () => {
    const day: DayPlan = {
      date: '2026-05-04', type: 'strength', completed: false,
      missed: false, details: ''
    }
    const result = ensureDayExercises(day)
    expect(result.exercises!.length).toBe(4) // 4 个力量动作
  })

  it('旧有氧日自动补全', () => {
    const day: DayPlan = {
      date: '2026-05-05', type: 'cardio', completed: false,
      missed: false, details: '有氧 35-40 分钟'
    }
    const result = ensureDayExercises(day)
    expect(result.exercises!.length).toBe(2)
    expect(result.exercises![0].name).toBe('慢跑')
  })

  it('旧休息日保持空', () => {
    const day: DayPlan = {
      date: '2026-05-06', type: 'rest', completed: false,
      missed: false, details: ''
    }
    const result = ensureDayExercises(day)
    // rest 日不创建 exercises 字段
    expect(result.exercises).toBeUndefined()
  })
})

// === 动作生成 ===

describe('getStrengthExercises', () => {
  it('返回 4 个力量动作', () => {
    const ex = getStrengthExercises()
    expect(ex.length).toBe(4)
    expect(ex.every(e => e.completed === false)).toBe(true)
  })
})

describe('getCardioExercises', () => {
  it('短有氧返回 2 个动作', () => {
    const ex = getCardioExercises(false)
    expect(ex.length).toBe(2)
    expect(ex[0].name).toBe('慢跑')
  })

  it('长有氧返回 1 个动作', () => {
    const ex = getCardioExercises(true)
    expect(ex.length).toBe(1)
    expect(ex[0].name).toContain('长有氧')
  })
})

// === 空档查找 ===

describe('findNextSlot', () => {
  it('找到下一个 rest 日', () => {
    const plan = generatePlan(baseConfig)
    // 星期一之后的下一个 rest 日是周三（5/6）
    const slot = findNextSlot(plan, '2026-05-04')
    expect(slot).toBe('2026-05-06') // 周三 = rest
  })

  it('超出范围返回 null', () => {
    const plan = generatePlan(baseConfig)
    const slot = findNextSlot(plan, '2026-05-31') // 最后一天
    expect(slot).toBeNull()
  })
})
