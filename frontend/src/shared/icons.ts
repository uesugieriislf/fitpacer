// shared/icons.ts — emoji / 图标工具

/** 训练类型图标 */
export const typeIcons: Record<string, string> = {
  strength: '💪',
  cardio: '🏃',
  rest: '😴'
}

/** 训练类型标签 */
export const typeLabels: Record<string, string> = {
  strength: '力量',
  cardio: '有氧',
  rest: '休息'
}

/** 力量训练动作建议 */
export const strengthExercises = [
  '引体向上',
  '双杠臂屈伸',
  '下斜俯卧撑',
  '保加利亚分腿蹲'
]

/** 有氧训练动作 */
export const cardioExercises = [
  '慢跑',
  '跳绳',
  '骑行',
  '游泳',
  '快走',
  '划船机',
  '椭圆机',
  '爬楼梯'
]

/** 获取训练类型的 emoji */
export function getTypeIcon(type: string): string {
  return typeIcons[type] ?? '❓'
}

/** 获取训练类型的中文标签 */
export function getTypeLabel(type: string): string {
  return typeLabels[type] ?? type
}

/** 底部导航项 */
export const navItems = [
  { key: 'plan', icon: '📅', label: '计划' },
  { key: 'record', icon: '📝', label: '记录' },
  { key: 'dashboard', icon: '📊', label: '看板' },
  { key: 'settings', icon: '⚙️', label: '设置' }
] as const

export type NavKey = typeof navItems[number]['key']

/** 星期标签 */
export const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']

/** RPE 等级描述 */
export const rpeLabels: Record<number, string> = {
  1: '极轻', 2: '轻', 3: '中等偏轻', 4: '中等', 5: '中等偏重',
  6: '重', 7: '很重', 8: '非常重', 9: '极重', 10: '极限'
}
