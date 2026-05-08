// record/storage.ts — localStorage 读写 + 类型定义

export interface TrainingRecord {
  id: string;
  date: string; // 'YYYY-MM-DD'
  action: string; // 动作名称
  sets: number;
  reps: number;
  rpe: number; // 1-10
  note: string;
}

const RECORDS_KEY = "fitpacer_training_records";

export function loadRecords(): TrainingRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data as TrainingRecord[];
  } catch {
    return [];
  }
}

export function saveRecords(records: TrainingRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function addRecord(record: TrainingRecord): TrainingRecord[] {
  const records = loadRecords();
  records.push(record);
  saveRecords(records);
  return records;
}

export function deleteRecord(id: string): TrainingRecord[] {
  const records = loadRecords().filter((r) => r.id !== id);
  saveRecords(records);
  return records;
}

export function getRecordsByDate(date: string): TrainingRecord[] {
  return loadRecords().filter((r) => r.date === date);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
