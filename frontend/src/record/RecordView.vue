<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecord } from './useRecord'
import { usePlan } from '../plan/usePlan'
import { weekdayLabels, strengthExercises, cardioExercises, rpeLabels, getTypeIcon, getTypeLabel } from '../shared/icons'
import type { TrainingType } from '../plan/storage'

const recordStore = useRecord()
const planStore = usePlan()

const showForm = ref(false)
const formAction = ref('')
const formSets = ref(3)
const formReps = ref(10)
const formRpe = ref(5)
const formNote = ref('')
const customAction = ref('')
const useCustom = ref(false)

const dateStr = computed(() => recordStore.selectedDate)
const dateObj = computed(() => new Date(dateStr.value + 'T00:00:00'))

// === 选择器：从计划推断当天训练类型 ===
const planDay = computed(() =>
  planStore.plan.find(p => p.date === dateStr.value) ?? null
)

const planType = computed<TrainingType | null>(() =>
  planDay.value?.type ?? null
)

// 根据计划类型推荐的动作列表
const suggestedExercises = computed(() => {
  if (planType.value === 'strength') return strengthExercises
  if (planType.value === 'cardio') return cardioExercises
  return [...strengthExercises, ...cardioExercises]
})

function openForm() {
  formAction.value = ''
  formSets.value = 3
  formReps.value = planType.value === 'cardio' ? 1 : 10
  formRpe.value = 5
  formNote.value = ''
  customAction.value = ''
  useCustom.value = false
  showForm.value = true
}

function submitRecord() {
  const action = useCustom.value ? customAction.value.trim() : formAction.value
  if (!action) return
  recordStore.createRecord({
    date: recordStore.selectedDate,
    action,
    sets: formSets.value,
    reps: formReps.value,
    rpe: formRpe.value,
    note: formNote.value
  })
  showForm.value = false
}

function fmtLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function changeDate(days: number) {
  const d = new Date(dateStr.value + 'T00:00:00')
  d.setDate(d.getDate() + days)
  recordStore.selectDate(fmtLocalDate(d))
}

function isToday(d: string): boolean {
  return d === fmtLocalDate(new Date())
}

function goToday() {
  recordStore.selectDate(fmtLocalDate(new Date()))
}
</script>

<template>
  <div class="view">
    <div class="view-header">
      <h1 class="view-title">训练记录</h1>
    </div>

    <div class="view-body">
    <!-- 日期导航 -->
    <div class="date-nav">
      <button class="btn btn-ghost date-arrow" @click="changeDate(-1)">‹</button>
      <div class="date-display">
        <span class="date-main">{{ dateObj.getMonth() + 1 }}/{{ dateObj.getDate() }}</span>
        <span class="date-wd">周{{ weekdayLabels[dateObj.getDay()] }}</span>
        <span v-if="isToday(dateStr)" class="today-tag">今天</span>
      </div>
      <button class="btn btn-ghost date-arrow" @click="changeDate(1)">›</button>
      <button v-if="!isToday(dateStr)" class="btn btn-sm btn-outline today-jump" @click="goToday">回到今天</button>
    </div>

    <!-- 计划类型提示 -->
    <div v-if="planDay && planDay.type === 'strength'" class="plan-hint plan-hint-strength">
      <span>💪</span>
      <span>力量训练，加油！</span>
    </div>
    <div v-else-if="planDay && planDay.type === 'cardio'" class="plan-hint plan-hint-cardio">
      <span>🏃</span>
      <span>有氧训练，动起来！</span>
    </div>
    <div v-else-if="planDay && planDay.type === 'rest'" class="plan-hint plan-hint-rest">
      <span>😴</span>
      <span>休息日，好好恢复</span>
    </div>

    <!-- 训练记录列表 -->
    <div class="records-list card-stagger">
      <div v-if="recordStore.todayRecords.length === 0" class="empty-state">
        <span class="empty-icon">📝</span>
        <p>暂无记录</p>
        <p class="hint">点击下方按钮添加训练记录</p>
      </div>

      <div v-for="rec in recordStore.todayRecords" :key="rec.id" class="record-card card">
        <div class="rec-top">
          <span class="rec-action">{{ rec.action }}</span>
          <button class="btn btn-ghost rec-del" @click="recordStore.removeRecord(rec.id)">✕</button>
        </div>
        <div class="rec-meta">
          <span>{{ rec.sets }} 组 × {{ rec.reps }} 次</span>
          <span class="rec-rpe">RPE {{ rec.rpe }}</span>
        </div>
        <div class="rec-note" v-if="rec.note">{{ rec.note }}</div>
      </div>
    </div>

    </div>

    <!-- 悬浮添加按钮 -->
    <button class="fab" @click="openForm">+</button>

    <!-- 录入弹窗 -->
    <div v-if="showForm" class="modal-overlay" @click="showForm = false">
      <div class="modal-content" @click.stop>
        <h3>新训练记录</h3>

        <div class="form-field">
          <div class="label">训练动作</div>
          <div class="action-chips" v-if="!useCustom">
            <div class="chip-group">
              <button
                v-for="ex in suggestedExercises" :key="ex"
                :class="['chip', { on: formAction === ex }]"
                @click="formAction = ex"
              >{{ ex }}</button>
            </div>
            <button class="btn btn-ghost btn-sm chip-toggle" @click="useCustom = true">自定义动作</button>
          </div>
          <div v-else class="custom-area">
            <input v-model="customAction" class="text-input" placeholder="输入动作名称..." />
            <button class="btn btn-ghost btn-sm chip-toggle" @click="useCustom = false">使用预设</button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <div class="label">组数</div>
            <div class="stepper">
              <button class="btn btn-sm" @click="formSets = Math.max(1, formSets - 1)">−</button>
              <span class="stepper-val">{{ formSets }}</span>
              <button class="btn btn-sm" @click="formSets = Math.min(10, formSets + 1)">+</button>
            </div>
          </div>
          <div class="form-field">
            <div class="label">次数</div>
            <div class="stepper">
              <button class="btn btn-sm" @click="formReps = Math.max(1, formReps - 1)">−</button>
              <span class="stepper-val">{{ formReps }}</span>
              <button class="btn btn-sm" @click="formReps = Math.min(50, formReps + 1)">+</button>
            </div>
          </div>
        </div>

        <div class="form-field">
          <div class="label">RPE {{ formRpe }} — {{ rpeLabels[formRpe] ?? '' }}</div>
          <input type="range" min="1" max="10" v-model.number="formRpe" class="slider" />
          <div class="rpe-marks"><span>极轻</span><span>中等</span><span>极限</span></div>
        </div>

        <div class="form-field">
          <div class="label">备注</div>
          <input v-model="formNote" class="text-input" placeholder="感受、注意事项..." />
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" @click="showForm = false">取消</button>
          <button class="btn btn-primary" @click="submitRecord">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>


.date-nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
.date-arrow { font-size: 28px; font-weight: 300; color: var(--color-text); padding: 4px 12px; }
.date-display { display: flex; align-items: center; gap: 10px; min-width: 130px; justify-content: center; }
.date-main { font-size: 24px; font-weight: 800; }
.date-wd { font-size: 14px; color: var(--color-text-secondary); }
.today-tag { background: var(--color-primary-gradient); color: #fff; padding: 2px 10px; border-radius: 10px;
  font-size: 11px; font-weight: 700; animation: bounceIn 0.4s var(--ease-bounce); }
.today-jump { font-size: 11px; padding: 4px 10px; flex-shrink: 0; }

/* 计划提示 */
.plan-hint {
  display: flex; align-items: center; gap: 6px; padding: 8px 14px; margin-bottom: 16px;
  border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 600;
  animation: fadeInUp 0.35s var(--ease-out);
}
.plan-hint-strength { background: var(--color-strength-bg); color: var(--color-strength); }
.plan-hint-cardio { background: var(--color-cardio-bg); color: var(--color-cardio); }
.plan-hint-rest { background: rgba(148, 163, 184, 0.08); color: var(--color-rest); }

.records-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }

.record-card { padding: 16px; transition: all var(--duration-fast) var(--ease-out); }
.record-card:active { transform: scale(0.99); box-shadow: var(--shadow-xs); }
.rec-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.rec-action { font-size: 16px; font-weight: 700; }
.rec-del { font-size: 16px; color: var(--color-text-tertiary); padding: 2px 6px; }
.rec-meta { display: flex; gap: 18px; font-size: 14px; color: var(--color-text-secondary); }
.rec-rpe { color: var(--color-primary); font-weight: 600; }
.rec-note { margin-top: 6px; font-size: 13px; color: var(--color-text-secondary); font-style: italic; }

/* 悬浮添加按钮 */
.fab {
  position: fixed; bottom: calc(var(--safe-bottom) + 80px); right: 20px; z-index: 20;
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--color-primary-gradient); color: #fff;
  font-size: 28px; font-weight: 400; line-height: 56px; text-align: center;
  border: none; cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 179, 101, 0.4);
  transition: all var(--duration-fast) var(--ease-out);
  animation: scaleInBounce 0.35s var(--ease-bounce);
}
.fab:active { transform: scale(0.9); box-shadow: 0 2px 12px rgba(0, 179, 101, 0.3); }

.form-field { margin-bottom: 18px; }
.form-row { display: flex; gap: 14px; }
.form-row .form-field { flex: 1; }

.action-chips { display: flex; flex-direction: column; gap: 6px; }
.chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 8px 16px; border: 1.5px solid var(--color-border); border-radius: 20px; background: var(--color-bg);
  font-size: 14px; font-weight: 500; cursor: pointer; transition: all var(--duration-fast) var(--ease-out); }
.chip:active { transform: scale(0.95); }
.chip.on { background: var(--color-primary-gradient); color: #fff; border-color: transparent;
  box-shadow: var(--color-primary-glow); font-weight: 600; }
.chip-toggle { margin-top: 4px; color: var(--color-primary); }
.custom-area { display: flex; flex-direction: column; gap: 6px; }

.stepper { display: flex; align-items: center; gap: 8px; }
.stepper-val { font-size: 22px; font-weight: 700; min-width: 32px; text-align: center; font-variant-numeric: tabular-nums; }

.empty-state { text-align: center; padding: 40px 20px; animation: fadeInUp 0.4s var(--ease-out); }
.empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; display: block; animation: float 3s ease-in-out infinite; }
.empty-state p { font-size: 14px; color: var(--color-text-secondary); }
.hint { font-size: 12px !important; margin-top: 4px; opacity: 0.6; }
</style>
