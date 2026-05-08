// goal/storage.ts — 目标设定 + BMI 相关类型与持久化

export interface GoalConfig {
  /** 身高 (cm) */
  height: number;
  /** 目标体重 (kg) */
  targetWeight: number;
  /** 起始体重 (kg) */
  startWeight: number;
  /** 起始日期 */
  startDate: string;
  /** 每周目标有氧分钟数 */
  weeklyCardioTarget: number;
  /** 每周目标力量次数 */
  weeklyStrengthTarget: number;
}

const GOAL_KEY = "fitpacer_goal_config";

const _now = new Date();
const _dateStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

const DEFAULT_GOAL: GoalConfig = {
  height: 170,
  targetWeight: 65,
  startWeight: 80,
  startDate: _dateStr,
  weeklyCardioTarget: 150,
  weeklyStrengthTarget: 2,
};

export function loadGoal(): GoalConfig {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (!raw) return { ...DEFAULT_GOAL };
    const data = JSON.parse(raw);
    return { ...DEFAULT_GOAL, ...data } as GoalConfig;
  } catch {
    return { ...DEFAULT_GOAL };
  }
}

export function saveGoal(goal: GoalConfig): void {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}
