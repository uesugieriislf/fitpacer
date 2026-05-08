// exercise/useExercise.ts — Pinia store：自定义动作库管理

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { CustomExercise } from "./storage";
import { loadCustomExercises, saveCustomExercises, generateId } from "./storage";
import { getExercisesByGroup as getBuiltinByGroup } from "../shared/exercises";
import type { MuscleGroup } from "../shared/exercises";

export const useExercise = defineStore("exercise", () => {
  // === 状态 ===
  const customExercises = ref<CustomExercise[]>(loadCustomExercises());

  // === 持久化辅助 ===
  function persist() {
    saveCustomExercises(customExercises.value);
  }

  // === CRUD ===
  function add(
    name: string,
    muscleGroup: MuscleGroup,
    defaultPrescription: string,
  ): CustomExercise {
    const ex: CustomExercise = { id: generateId(), name, muscleGroup, defaultPrescription };
    customExercises.value = [...customExercises.value, ex];
    persist();
    return ex;
  }

  function update(
    id: string,
    data: { name?: string; muscleGroup?: MuscleGroup; defaultPrescription?: string },
  ) {
    customExercises.value = customExercises.value.map((e) => (e.id === id ? { ...e, ...data } : e));
    persist();
  }

  function remove(id: string) {
    customExercises.value = customExercises.value.filter((e) => e.id !== id);
    persist();
  }

  // === 合并后的完整动作库（按部位） ===
  function getExercisesByGroup(mg: MuscleGroup) {
    const builtin = getBuiltinByGroup(mg);
    const custom = customExercises.value.filter((e) => e.muscleGroup === mg);
    // 自定义排在前面
    return [...custom, ...builtin];
  }

  /** 所有自定义动作（用于 Settings 管理） */
  const allCustom = computed(() => customExercises.value);

  return {
    customExercises,
    allCustom,
    add,
    update,
    remove,
    getExercisesByGroup,
  };
});
