// record/useRecord.ts — Pinia defineStore：训练记录 CRUD

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { TrainingRecord } from "./storage";
import {
  loadRecords,
  saveRecords,
  generateId,
} from "./storage";

export const useRecord = defineStore("record", () => {
  const records = ref<TrainingRecord[]>(loadRecords());
  const selectedDate = ref<string>(getDateStr());

  function getDateStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // 当前选中日期的记录
  const todayRecords = computed(() => records.value.filter((r) => r.date === selectedDate.value));

  // 有记录的日期集合（用于日历标记）
  const recordedDates = computed(() => {
    const set = new Set<string>();
    records.value.forEach((r) => set.add(r.date));
    return set;
  });

  // 更新选中日期
  function selectDate(date: string) {
    selectedDate.value = date;
  }

  // 添加记录
  function createRecord(data: Omit<TrainingRecord, "id">) {
    const record: TrainingRecord = {
      id: generateId(),
      ...data,
    };
    records.value = [...records.value, record];
    saveRecords(records.value);
    return record;
  }

  // 删除记录
  function removeRecord(id: string) {
    records.value = records.value.filter((r) => r.id !== id);
    saveRecords(records.value);
  }

  return {
    records,
    selectedDate,
    todayRecords,
    recordedDates,
    selectDate,
    createRecord,
    removeRecord,
  };
});
