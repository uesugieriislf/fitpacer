// shared/exercises.ts — 部位定义 + 动作数据库

export type MuscleGroup = "chest" | "shoulders_back" | "legs" | "cardio";

/** 力量训练部位（不含有氧），用于 PlanView 力量弹窗迭代 */
export const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "shoulders_back", "legs"];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "胸",
  shoulders_back: "肩背",
  legs: "腿",
  cardio: "有氧",
};

export const MUSCLE_GROUP_ICONS: Record<MuscleGroup, string> = {
  chest: "🏋️",
  shoulders_back: "💪",
  legs: "🦵",
  cardio: "🏃",
};

export interface ExerciseDef {
  name: string;
  muscleGroup: MuscleGroup;
  defaultPrescription: string;
}

/** 力量动作数据库 */
export const EXERCISE_DATABASE: ExerciseDef[] = [
  // 胸
  { name: "标准俯卧撑", muscleGroup: "chest", defaultPrescription: "3×12" },
  { name: "宽距俯卧撑", muscleGroup: "chest", defaultPrescription: "3×10" },
  { name: "窄距俯卧撑", muscleGroup: "chest", defaultPrescription: "3×10" },
  { name: "下斜俯卧撑", muscleGroup: "chest", defaultPrescription: "3×10" },
  { name: "上斜俯卧撑", muscleGroup: "chest", defaultPrescription: "3×12" },
  // 肩背
  { name: "引体向上（宽距）", muscleGroup: "shoulders_back", defaultPrescription: "3×8" },
  { name: "引体向上（窄距）", muscleGroup: "shoulders_back", defaultPrescription: "3×8" },
  { name: "双杠臂屈伸", muscleGroup: "shoulders_back", defaultPrescription: "3×10" },
  { name: "反向划船", muscleGroup: "shoulders_back", defaultPrescription: "3×12" },
  { name: "俯身飞鸟", muscleGroup: "shoulders_back", defaultPrescription: "3×12" },
  // 腿
  { name: "深蹲", muscleGroup: "legs", defaultPrescription: "3×12" },
  { name: "保加利亚分腿蹲", muscleGroup: "legs", defaultPrescription: "3×10" },
  { name: "弓步蹲", muscleGroup: "legs", defaultPrescription: "3×10" },
  { name: "臀桥", muscleGroup: "legs", defaultPrescription: "3×12" },
  { name: "提踵", muscleGroup: "legs", defaultPrescription: "4×15" },
  // 有氧
  { name: "慢跑", muscleGroup: "cardio", defaultPrescription: "30分钟" },
  { name: "跳绳", muscleGroup: "cardio", defaultPrescription: "15分钟" },
  { name: "骑行", muscleGroup: "cardio", defaultPrescription: "30分钟" },
  { name: "游泳", muscleGroup: "cardio", defaultPrescription: "30分钟" },
  { name: "快走", muscleGroup: "cardio", defaultPrescription: "40分钟" },
  { name: "划船机", muscleGroup: "cardio", defaultPrescription: "20分钟" },
  { name: "椭圆机", muscleGroup: "cardio", defaultPrescription: "30分钟" },
  { name: "爬楼梯", muscleGroup: "cardio", defaultPrescription: "20分钟" },
];

/** 按部位筛选动作 */
export function getExercisesByGroup(mg: MuscleGroup): ExerciseDef[] {
  return EXERCISE_DATABASE.filter((e) => e.muscleGroup === mg);
}
