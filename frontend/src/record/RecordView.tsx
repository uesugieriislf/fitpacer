import { ref, computed, defineComponent } from 'vue'
import { useRecord } from './useRecord'
import { usePlan } from '../plan/usePlan'
import { useExercise } from '../exercise/useExercise'
import { weekdayLabels, rpeLabels } from '../shared/icons'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ICONS } from '../shared/exercises'
import type { MuscleGroup } from '../shared/exercises'
import type { TrainingType } from '../plan/storage'
import './RecordView.css'

export default defineComponent({
  setup() {
    const recordStore = useRecord()
    const planStore = usePlan()
    const exerciseStore = useExercise()

    const showForm = ref(false)
    const formAction = ref('')
    const formSets = ref(3)
    const formReps = ref(10)
    const formRpe = ref(5)
    const formNote = ref('')
    const customAction = ref('')
    // 有氧专用字段
    const cardioDuration = ref(30)
    const cardioHeartRate = ref<number | undefined>(undefined)

    // 判断选中动作是否为有氧
    const selectedIsCardio = computed(() => {
      if (!formAction.value) return false
      const all = exerciseStore.getExercisesByGroup('cardio')
      return all.some(e => e.name === formAction.value)
    })

    const dateStr = computed(() => recordStore.selectedDate)
    const dateObj = computed(() => new Date(dateStr.value + 'T00:00:00'))

    // === 选择器：从计划推断当天训练类型 ===
    const planDay = computed(() =>
      planStore.plan.find(p => p.date === dateStr.value) ?? null
    )

    const planType = computed<TrainingType | null>(() =>
      planDay.value?.type ?? null
    )

    // 展示全部分组（力量+有氧+自定义）
    const ALL_GROUPS: (MuscleGroup | 'custom')[] = [...MUSCLE_GROUPS, 'cardio', 'custom']

    function openForm() {
      formAction.value = ''
      formSets.value = 3
      formReps.value = 10
      formRpe.value = 5
      formNote.value = ''
      customAction.value = ''
      cardioDuration.value = 30
      cardioHeartRate.value = undefined
      showForm.value = true
    }

    function submitRecord() {
      const action = formAction.value || customAction.value.trim()
      if (!action) return

      if (selectedIsCardio.value) {
        // 有氧：时长=reps，组数固定1
        recordStore.createRecord({
          date: recordStore.selectedDate,
          action,
          sets: 1,
          reps: cardioDuration.value,
          rpe: 7,
          note: cardioHeartRate.value
            ? `❤️ ${cardioHeartRate.value} bpm` + (formNote.value ? ' · ' + formNote.value : '')
            : formNote.value
        })
      } else {
        recordStore.createRecord({
          date: recordStore.selectedDate,
          action,
          sets: formSets.value,
          reps: formReps.value,
          rpe: formRpe.value,
          note: formNote.value
        })
      }
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

    /** 检查某条记录是否为有氧记录 */
    function isCardioRecord(action: string): boolean {
      const all = exerciseStore.getExercisesByGroup('cardio')
      return all.some(e => e.name === action)
    }

    return () => (
      <div class="record-view view">
        <div class="view-header">
          <h1 class="view-title">训练记录</h1>
        </div>

        <div class="view-body">
          {/* 日期导航 */}
          <div class="date-nav">
            <button class="btn btn-ghost date-arrow" onClick={() => changeDate(-1)}>‹</button>
            <div class="date-display">
              <span class="date-main">{dateObj.value.getMonth() + 1}/{dateObj.value.getDate()}</span>
              <span class="date-wd">周{weekdayLabels[dateObj.value.getDay()]}</span>
              {isToday(dateStr.value) && <span class="today-tag">今天</span>}
            </div>
            <button class="btn btn-ghost date-arrow" onClick={() => changeDate(1)}>›</button>
            {!isToday(dateStr.value) && <button class="btn btn-sm btn-outline today-jump" onClick={goToday}>回到今天</button>}
          </div>

          {/* 计划类型提示 */}
          {planDay.value && planDay.value.type === 'strength' && (
            <div class="plan-hint plan-hint-strength">
              <span>💪</span>
              <span>力量训练，加油！</span>
            </div>
          )}
          {planDay.value && planDay.value.type === 'cardio' && (
            <div class="plan-hint plan-hint-cardio">
              <span>🏃</span>
              <span>有氧训练，动起来！</span>
            </div>
          )}
          {planDay.value && planDay.value.type === 'rest' && (
            <div class="plan-hint plan-hint-rest">
              <span>😴</span>
              <span>休息日，好好恢复</span>
            </div>
          )}

          {/* 训练记录列表 */}
          <div class="records-list card-stagger">
            {recordStore.todayRecords.length === 0 && (
              <div class="empty-state">
                <span class="empty-icon">📝</span>
                <p>暂无记录</p>
                <p class="hint">点击下方按钮添加训练记录</p>
              </div>
            )}

            {recordStore.todayRecords.map(rec => (
              <div class="record-card card" key={rec.id}>
                <div class="rec-top">
                  <span class="rec-action">{rec.action}</span>
                  <button class="btn btn-ghost rec-del" onClick={() => recordStore.removeRecord(rec.id)}>✕</button>
                </div>
                <div class="rec-meta">
                  {isCardioRecord(rec.action) ? (
                    <>
                      <span>🕐 {rec.reps} 分钟</span>
                      {rec.note?.startsWith('❤️') && <span class="rec-hr">{rec.note.split('❤️')[1]?.split(' ·')[0]?.trim()} bpm</span>}
                    </>
                  ) : (
                    <>
                      <span>{rec.sets} 组 × {rec.reps} 次</span>
                      <span class="rec-rpe">RPE {rec.rpe}</span>
                    </>
                  )}
                </div>
                {rec.note && !rec.note.startsWith('❤️') && <div class="rec-note">{rec.note}</div>}
                {rec.note?.startsWith('❤️') && rec.note.includes('·') && <div class="rec-note">{rec.note.split(' · ')[1]}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* 悬浮添加按钮 */}
        <button class="fab" onClick={openForm}>+</button>

        {/* 录入弹窗 */}
        {showForm.value && (
          <div class="modal-overlay" onClick={() => { showForm.value = false }}>
            <div class="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>新训练记录</h3>

              <div class="form-field">
                <div class="label">训练动作</div>

                {/* 按分组展示（参考计划页风格） */}
                {ALL_GROUPS.map(g => (
                  <div class="rec-group" key={g}>
                    <div class="rec-group-head">
                      <span class="rec-group-icon">{g === 'custom' ? '✏️' : MUSCLE_GROUP_ICONS[g]}</span>
                      <span class="rec-group-label">{g === 'custom' ? '自定义' : MUSCLE_GROUP_LABELS[g]}</span>
                    </div>

                    {g === 'custom' ? (
                      <div class="rec-custom-area">
                        <input v-model={customAction.value} class="text-input" placeholder="输入动作名称，回车添加..." onKeyup={(e: KeyboardEvent) => { if (e.key === 'Enter') submitRecord() }} />
                      </div>
                    ) : (
                      <div class="rec-chip-grid">
                        {exerciseStore.getExercisesByGroup(g).map(ex => (
                          <button
                            key={ex.name}
                            class={['rec-chip', { 'rec-chip-on': formAction.value === ex.name }]}
                            onClick={() => { formAction.value = ex.name; customAction.value = '' }}
                          >
                            {ex.name}{'id' in ex && (ex as any).id && <span class="rec-chip-tag">自</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 有氧专用：时长 + 心率 */}
              {selectedIsCardio.value && (
                <>
                  <div class="form-field">
                    <div class="label">运动时长</div>
                    <div class="stepper-row">
                      <button class="btn btn-ghost btn-sm" onClick={() => { cardioDuration.value = Math.max(5, cardioDuration.value - 5) }}>−</button>
                      <span class="stepper-value">{cardioDuration.value} 分钟</span>
                      <button class="btn btn-ghost btn-sm" onClick={() => { cardioDuration.value = Math.min(180, cardioDuration.value + 5) }}>+</button>
                    </div>
                    <div class="duration-quick">
                      {[15, 20, 30, 40, 60].map(d => (
                        <button key={d}
                          class={['chip chip-sm', { 'chip-active': cardioDuration.value === d }]}
                          onClick={() => { cardioDuration.value = d }}
                        >{d}分钟</button>
                      ))}
                    </div>
                  </div>
                  <div class="form-field">
                    <div class="label">平均心率 <span class="label-optional">（可选）</span></div>
                    <div class="stepper-row">
                      <button class="btn btn-ghost btn-sm" onClick={() => { cardioHeartRate.value = (cardioHeartRate.value || 120) > 60 ? (cardioHeartRate.value || 120) - 5 : 60 }}>−</button>
                      <span class="stepper-value">{cardioHeartRate.value ? cardioHeartRate.value + ' bpm' : '未设置'}</span>
                      <button class="btn btn-ghost btn-sm" onClick={() => { cardioHeartRate.value = Math.min(220, (cardioHeartRate.value || 120) + 5) }}>+</button>
                    </div>
                  </div>
                </>
              )}

              {/* 力量专用：组数 + 次数 + RPE */}
              {!selectedIsCardio.value && (
                <>
                  <div class="form-row">
                    <div class="form-field">
                      <div class="label">组数</div>
                      <div class="stepper">
                        <button class="btn btn-sm" onClick={() => { formSets.value = Math.max(1, formSets.value - 1) }}>−</button>
                        <span class="stepper-val">{formSets.value}</span>
                        <button class="btn btn-sm" onClick={() => { formSets.value = Math.min(10, formSets.value + 1) }}>+</button>
                      </div>
                    </div>
                    <div class="form-field">
                      <div class="label">次数</div>
                      <div class="stepper">
                        <button class="btn btn-sm" onClick={() => { formReps.value = Math.max(1, formReps.value - 1) }}>−</button>
                        <span class="stepper-val">{formReps.value}</span>
                        <button class="btn btn-sm" onClick={() => { formReps.value = Math.min(50, formReps.value + 1) }}>+</button>
                      </div>
                    </div>
                  </div>
                  <div class="form-field">
                    <div class="label">RPE {formRpe.value} — {rpeLabels[formRpe.value] ?? ''}</div>
                    <input type="range" min="1" max="10" v-model={[formRpe.value, ['number']]} class="slider" />
                    <div class="rpe-marks"><span>极轻</span><span>中等</span><span>极限</span></div>
                  </div>
                </>
              )}

              <div class="form-field">
                <div class="label">备注</div>
                <input v-model={formNote.value} class="text-input" placeholder="感受、注意事项..." />
              </div>

              <div class="form-actions">
                <button class="btn btn-ghost" onClick={() => { showForm.value = false }}>取消</button>
                <button class="btn btn-primary" onClick={submitRecord}>保存</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
})
