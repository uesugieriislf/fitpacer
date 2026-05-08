import { defineComponent, ref, watch, Teleport } from 'vue'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ICONS, type ExerciseDef, type MuscleGroup } from '../../../shared/exercises'
import { useExercise } from '../../../exercise/useExercise'
import { usePlan } from '../../usePlan'
import type { ExerciseItem, DayPlan } from '../../storage'
import './StrengthModal.css'

interface ExerciseFormItem {
  name: string
  prescription: string
  completed: boolean
  custom: boolean
  actualSets: number
  actualReps: number
  actualRpe: number
}

function parsePrescription(p: string): { sets: number; reps: number } {
  const parts = p.split('×')
  const sets = parseInt(parts[0]) || 3
  const reps = parseInt(parts[1]?.split('-')[0]) || 8
  return { sets, reps }
}

const rpeLabels: Record<number, string> = {
  1: '极轻', 2: '轻', 3: '中等偏轻', 4: '中等', 5: '中等偏重',
  6: '重', 7: '很重', 8: '非常重', 9: '极重', 10: '极限'
}

export default defineComponent({
  props: {
    show: { type: Boolean, default: false },
    date: { type: String, default: '' },
  },
  emits: {
    close: () => true,
    submit: (payload: { date: string; exercises: ExerciseItem[]; warmupDone: boolean; cooldownDone: boolean }) => true,
  },
  setup(props, { emit }) {
    const exerciseStore = useExercise()
    const planStore = usePlan()

    const strengthForm = ref<Record<MuscleGroup, ExerciseFormItem[]>>({
      chest: [],
      shoulders_back: [],
      legs: []
    })

    const strengthWarmup = ref(false)
    const strengthCooldown = ref(false)

    const customName = ref<Record<MuscleGroup, string>>({
      chest: '',
      shoulders_back: '',
      legs: ''
    })

    const expandedGroups = ref<Set<MuscleGroup>>(new Set(['chest', 'shoulders_back', 'legs']))
    const showRpeTip = ref(false)
    const showWarmupTip = ref(false)

    function toggleGroup(mg: MuscleGroup) {
      const next = new Set(expandedGroups.value)
      if (next.has(mg)) next.delete(mg)
      else next.add(mg)
      expandedGroups.value = next
    }

    function isGroupExpanded(mg: MuscleGroup): boolean {
      return expandedGroups.value.has(mg)
    }

    function groupCount(mg: MuscleGroup): number {
      return strengthForm.value[mg].filter(e => e.completed).length
    }

    function addExerciseFromDb(mg: MuscleGroup, def: ExerciseDef) {
      if (strengthForm.value[mg].some(e => e.name === def.name)) return
      const parsed = parsePrescription(def.defaultPrescription)
      strengthForm.value[mg].push({
        name: def.name,
        prescription: def.defaultPrescription,
        completed: true,
        custom: false,
        actualSets: parsed.sets,
        actualReps: parsed.reps,
        actualRpe: 7
      })
    }

    function addCustomExercise(mg: MuscleGroup) {
      const name = customName.value[mg].trim()
      if (!name) return
      if (strengthForm.value[mg].some(e => e.name === name)) return
      const existing = exerciseStore.allCustom.find(e => e.name === name && e.muscleGroup === mg)
      if (!existing) {
        exerciseStore.add(name, mg, '3×10')
      }
      strengthForm.value[mg].push({
        name,
        prescription: '3×10',
        completed: true,
        custom: true,
        actualSets: 3,
        actualReps: 10,
        actualRpe: 7
      })
      customName.value[mg] = ''
    }

    function removeExercise(mg: MuscleGroup, index: number) {
      strengthForm.value[mg] = strengthForm.value[mg].filter((_, i) => i !== index)
    }

    function toggleExercise(mg: MuscleGroup, index: number) {
      const exs = [...strengthForm.value[mg]]
      exs[index] = { ...exs[index], completed: !exs[index].completed }
      strengthForm.value[mg] = exs
    }

    function allDone() {
      for (const mg of MUSCLE_GROUPS) {
        strengthForm.value[mg] = strengthForm.value[mg].map(e => ({ ...e, completed: true }))
      }
    }

    function submitStrength() {
      if (!props.date) return
      const exercises: ExerciseItem[] = []
      for (const mg of MUSCLE_GROUPS) {
        for (const ex of strengthForm.value[mg]) {
          exercises.push({
            name: ex.name,
            prescription: ex.prescription,
            completed: ex.completed,
            muscleGroup: mg,
            actualSets: ex.completed ? ex.actualSets : undefined,
            actualReps: ex.completed ? ex.actualReps : undefined,
            actualRpe: ex.completed ? ex.actualRpe : undefined
          })
        }
      }
      emit('submit', { date: props.date, exercises, warmupDone: strengthWarmup.value, cooldownDone: strengthCooldown.value })
    }

    function closeModal() {
      emit('close')
    }

    function rpeHint(v: number): string {
      return rpeLabels[v] ?? ''
    }

    function getRpeColor(v: number): string {
      if (v <= 3) return '#00B365'
      if (v <= 5) return '#3B82F6'
      if (v <= 7) return '#F59E0B'
      return '#FF6B35'
    }

    // Reset internal state when modal opens, load existing exercises
    watch(() => props.show, (val) => {
      if (val) {
        for (const mg of MUSCLE_GROUPS) {
          strengthForm.value[mg] = []
          customName.value[mg] = ''
        }
        expandedGroups.value = new Set(['chest', 'shoulders_back', 'legs'])
        strengthWarmup.value = false
        strengthCooldown.value = false
        showRpeTip.value = false
        showWarmupTip.value = false

        // 加载已有的训练动作
        const day = planStore.plan.find((p: DayPlan) => p.date === props.date)
        if (day) {
          day.exercises.forEach((e: ExerciseItem) => {
            if (!e.actualSets) return
            const mg: MuscleGroup = (e.muscleGroup && MUSCLE_GROUPS.includes(e.muscleGroup as any))
              ? (e.muscleGroup as MuscleGroup)
              : 'chest'
            strengthForm.value[mg].push({
              name: e.name,
              prescription: e.prescription,
              completed: e.completed,
              custom: false,
              actualSets: e.actualSets ?? 3,
              actualReps: e.actualReps ?? 8,
              actualRpe: e.actualRpe ?? 7
            })
          })
          strengthWarmup.value = day.warmupDone ?? false
          strengthCooldown.value = day.cooldownDone ?? false
        }
      }
    })

    return () => (
      <Teleport to="body">
        {props.show && (
          <div class="strength-modal">
            <div class="modal-overlay pv-modal" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
              <div class="modal-content">
                <h3>💪 完成力量训练</h3>
                <p class="modal-desc">{props.date}</p>
                <div class="str-quick-row">
                  <button class="chip chip-sm" onClick={allDone}>全部完成</button>
                </div>

                {MUSCLE_GROUPS.map(mg => (
                  <div key={mg} class="mg-block">
                    <div class="mg-head" onClick={() => toggleGroup(mg)}>
                      <span class="mg-icon">{MUSCLE_GROUP_ICONS[mg]}</span>
                      <span class="mg-label">{MUSCLE_GROUP_LABELS[mg]}</span>
                      {groupCount(mg) > 0 && <span class="mg-count">{groupCount(mg)} 项</span>}
                      <span class="mg-arrow">{isGroupExpanded(mg) ? '▼' : '▶'}</span>
                    </div>

                    {isGroupExpanded(mg) && (
                      <div class="mg-body">
                        <div class="mg-chips">
                          {exerciseStore.getExercisesByGroup(mg).map((def: ExerciseDef) => (
                            <button key={def.name}
                              class={['chip mg-chip', strengthForm.value[mg].some(e => e.name === def.name) && 'mg-chip-added'].filter(Boolean).join(' ')}
                              onClick={(e) => { e.stopPropagation(); addExerciseFromDb(mg, def as ExerciseDef) }}
                            >{def.name}{'id' in def && (def as any).id && <span class="mg-chip-tag">自</span>}</button>
                          ))}
                        </div>

                        {strengthForm.value[mg].map((ex, ei) => (
                          <div key={ei} class="str-ex-block">
                            <div class={['str-ex-head', ex.completed && 'str-ex-done'].filter(Boolean).join(' ')}>
                              <span class="ex-check" onClick={(e) => { e.stopPropagation(); toggleExercise(mg, ei) }}>
                                {ex.completed ? '✅' : '○'}
                              </span>
                              <span class="ex-name">{ex.name}</span>
                              <span class="ex-prescription">{ex.prescription}</span>
                              <button class="str-ex-del" onClick={(e) => { e.stopPropagation(); removeExercise(mg, ei) }}>✕</button>
                            </div>
                            {ex.completed && (
                              <div class="str-ex-detail">
                                <div class="str-ex-detail-row">
                                  <div class="str-ex-field">
                                    <span class="str-ex-label">组数</span>
                                    <div class="str-ex-stepper">
                                      <button class="btn str-btn" onClick={(e) => { e.stopPropagation(); ex.actualSets = Math.max(1, ex.actualSets - 1) }}>−</button>
                                      <span class="str-ex-val">{ex.actualSets}</span>
                                      <button class="btn str-btn" onClick={(e) => { e.stopPropagation(); ex.actualSets = Math.min(10, ex.actualSets + 1) }}>+</button>
                                    </div>
                                  </div>
                                  <div class="str-ex-field">
                                    <span class="str-ex-label">次数</span>
                                    <div class="str-ex-stepper">
                                      <button class="btn str-btn" onClick={(e) => { e.stopPropagation(); ex.actualReps = Math.max(1, ex.actualReps - 1) }}>−</button>
                                      <span class="str-ex-val">{ex.actualReps}</span>
                                      <button class="btn str-btn" onClick={(e) => { e.stopPropagation(); ex.actualReps = Math.min(50, ex.actualReps + 1) }}>+</button>
                                    </div>
                                  </div>
                                </div>
                                <div class="str-ex-rpe-section">
                                  <div class="str-ex-rpe-header">
                                    <span class="str-ex-label">RPE {ex.actualRpe}</span>
                                    <span class="rpe-hint">— {rpeHint(ex.actualRpe)}</span>
                                    <button class="rpe-tip-btn" onClick={(e) => { e.stopPropagation(); showRpeTip.value = true }}>ℹ️ 什么是 RPE？</button>
                                  </div>
                                  <div class="rpe-chips">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                                      <button key={r}
                                        class={['rpe-chip', ex.actualRpe === r && 'rpe-chip-on'].filter(Boolean).join(' ')}
                                        onClick={(e) => { e.stopPropagation(); ex.actualRpe = r }}
                                      >{r}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        <div class="mg-custom">
                          <input v-model={customName.value[mg]} class="text-input mg-custom-input" placeholder="输入自定义动作名称..." onKeyup={(e) => { if (e.key === 'Enter') addCustomExercise(mg) }} />
                          <button class="btn btn-sm btn-outline" onClick={() => addCustomExercise(mg)}>+ 添加</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div class="rec-section">
                  <div class="rec-section-title">热身与放松 <button class="rpe-tip-btn" onClick={() => { showWarmupTip.value = true }}>ℹ️ 为什么重要？</button></div>
                  <label class="rec-check">
                    <input type="checkbox" checked={strengthWarmup.value} onChange={(e) => strengthWarmup.value = (e.target as HTMLInputElement).checked} />
                    <span>运动前拉伸（5-10 分钟）</span>
                  </label>
                  <label class="rec-check">
                    <input type="checkbox" checked={strengthCooldown.value} onChange={(e) => strengthCooldown.value = (e.target as HTMLInputElement).checked} />
                    <span>运动后放松（5-10 分钟）</span>
                  </label>
                </div>

                <div class="form-actions">
                  <button class="btn btn-ghost" onClick={closeModal}>取消</button>
                  <button class="btn btn-primary" onClick={submitStrength}>保存并完成</button>
                </div>
              </div>

              {/* RPE 说明弹窗 */}
              {showRpeTip.value && (
                <div class="rpe-tip-overlay" onClick={(e) => { if (e.target === e.currentTarget) showRpeTip.value = false }}>
                  <div class="rpe-tip-content">
                    <h4>什么是 RPE？</h4>
                    <p class="rpe-tip-desc">RPE（主观疲劳感知评分）是你对自己训练用力程度的主观评价，范围 1–10：</p>
                    <div class="rpe-tip-list">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                        <div key={r} class="rpe-tip-row">
                          <span class="rpe-tip-num">{r}</span>
                          <span class="rpe-tip-bar" style={{ background: getRpeColor(r), width: (r * 10) + '%' }}></span>
                          <span class="rpe-tip-label">{rpeLabels[r]}</span>
                        </div>
                      ))}
                    </div>
                    <p class="rpe-tip-footer">数值越高，代表训练强度越大。结合组数次数使用，更准确评估训练量。</p>
                    <div class="form-actions"><button class="btn btn-primary" onClick={() => { showRpeTip.value = false }}>知道了</button></div>
                  </div>
                </div>
              )}

              {/* 热身放松说明弹窗 */}
              {showWarmupTip.value && (
                <div class="rpe-tip-overlay" onClick={(e) => { if (e.target === e.currentTarget) showWarmupTip.value = false }}>
                  <div class="rpe-tip-content">
                    <h4>为什么热身和放松很重要？</h4>
                    <div class="warmup-tip-body">
                      <div class="warmup-tip-item">
                        <strong>🏋️ 运动前拉伸（5-10 分钟）</strong>
                        <p>激活肌肉、提高心率和体温、增加关节活动范围，有效预防运动损伤。动态拉伸（如摆腿、肩绕环、开合跳）比静态拉伸更适合热身。</p>
                      </div>
                      <div class="warmup-tip-item">
                        <strong>🧘 运动后放松（5-10 分钟）</strong>
                        <p>帮助心率逐渐回落、促进乳酸代谢、减少肌肉酸痛。建议进行静态拉伸（每个动作保持 15-30 秒）和深呼吸。</p>
                      </div>
                    </div>
                    <div class="form-actions"><button class="btn btn-primary" onClick={() => { showWarmupTip.value = false }}>记住了</button></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Teleport>
    )
  }
})
