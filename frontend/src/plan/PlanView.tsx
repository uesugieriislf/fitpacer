import { onMounted, computed, ref, watch, defineComponent, Teleport } from 'vue'
import { usePlan } from './usePlan'
import { useSettings } from '../settings/useSettings'
import { getTypeIcon, getTypeLabel, weekdayLabels } from '../shared/icons'
import { getAdjustOptions, CARDIO_ACTIONS, ensureDayExercises, findAvailableSlots } from './planEngine'
import type { DayPlan, CardioRecord, ExerciseItem } from './storage'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ICONS, type ExerciseDef, type MuscleGroup } from '../shared/exercises'
import { useExercise } from '../exercise/useExercise'

export default defineComponent({
  setup() {
    const store = usePlan()
    const settingsStore = useSettings()
    const exerciseStore = useExercise()

    onMounted(() => {
      store.ensurePlan()
      // 自动展开今天的卡片
      const _d = new Date()
      const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
      expandedDates.value.add(today)
    })

    const weekInfo = computed(() => store.weekInfo)
    const weekLabel = computed(() => weekInfo.value?.label ?? '')

    /** 展开中的日期集合 */
    const expandedDates = ref(new Set<string>())

    function toggleExpand(date: string) {
      const next = new Set(expandedDates.value)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      expandedDates.value = next
    }

    function isExpanded(date: string): boolean {
      return expandedDates.value.has(date)
    }

    /** 有氧完成弹窗表单 */
    const cardioForm = ref({
      durationMinutes: 30,
      avgHeartRate: undefined as number | undefined,
      action: '慢跑'
    })
    const cardioWarmup = ref(false)
    const cardioCooldown = ref(false)

    function openCardioModal(date: string) {
      cardioForm.value.durationMinutes = 30
      cardioForm.value.avgHeartRate = undefined
      cardioForm.value.action = '慢跑'
      cardioWarmup.value = false
      cardioCooldown.value = false
      store.markCompleted(date)
    }

    function submitCardio() {
      if (!store.cardioModalDate) return
      const record: CardioRecord = {
        durationMinutes: cardioForm.value.durationMinutes,
        avgHeartRate: cardioForm.value.avgHeartRate || undefined,
        action: cardioForm.value.action
      }
      store.saveCardioRecord(store.cardioModalDate, record, cardioWarmup.value, cardioCooldown.value)
    }

    /**
     * 力量完成弹窗：按部位分组，用户自由选择动作
     */
    interface ExerciseFormItem {
      name: string
      prescription: string
      completed: boolean
      custom: boolean
      actualSets: number
      actualReps: number
      actualRpe: number
    }

    const strengthForm = ref<Record<MuscleGroup, ExerciseFormItem[]>>({
      chest: [],
      shoulders_back: [],
      legs: []
    })

    const strengthWarmup = ref(false)
    const strengthCooldown = ref(false)

    // 自定义动作输入
    const customName = ref<Record<MuscleGroup, string>>({
      chest: '',
      shoulders_back: '',
      legs: ''
    })

    /** 展开中的部位 */
    const expandedGroups = ref<Set<MuscleGroup>>(new Set(['chest', 'shoulders_back', 'legs']))

    function toggleGroup(mg: MuscleGroup) {
      const next = new Set(expandedGroups.value)
      if (next.has(mg)) next.delete(mg)
      else next.add(mg)
      expandedGroups.value = next
    }

    function isGroupExpanded(mg: MuscleGroup): boolean {
      return expandedGroups.value.has(mg)
    }

    /** 某个部位已选动作数 */
    function groupCount(mg: MuscleGroup): number {
      return strengthForm.value[mg].filter(e => e.completed).length
    }

    /** 从 prescription 解析默认组数次数 */
    function parsePrescription(p: string): { sets: number; reps: number } {
      const parts = p.split('×')
      const sets = parseInt(parts[0]) || 3
      const reps = parseInt(parts[1]?.split('-')[0]) || 8
      return { sets, reps }
    }

    function openStrengthModal(date: string) {
      const day = store.plan.find((p: DayPlan) => p.date === date)
      if (!day) return
      // 初始化：全新空白表单
      for (const mg of MUSCLE_GROUPS) {
        strengthForm.value[mg] = []
        customName.value[mg] = ''
      }
      // 加载用户已保存的动作（跳过预生成的无实际值旧数据）
      day.exercises.forEach(e => {
        if (!e.actualSets) return // 无 actualSets = 预生成旧数据，跳过
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
      expandedGroups.value = new Set(['chest', 'shoulders_back', 'legs'])
      // 加载上次的拉伸/放松状态
      strengthWarmup.value = day.warmupDone ?? false
      strengthCooldown.value = day.cooldownDone ?? false
      store.markCompleted(date)
    }

    /** 从数据库添加推荐动作 */
    function addExerciseFromDb(mg: MuscleGroup, def: ExerciseDef) {
      // 避免重复添加
      if (strengthForm.value[mg].some(e => e.name === def.name)) return
      const parsed = parsePrescription(def.defaultPrescription)
      const sets = parsed.sets
      const reps = parsed.reps
      strengthForm.value[mg].push({
        name: def.name,
        prescription: def.defaultPrescription,
        completed: true,
        custom: false,
        actualSets: sets,
        actualReps: reps,
        actualRpe: 7
      })
    }

    /** 添加自定义动作 — 同时保存到动作库 */
    function addCustomExercise(mg: MuscleGroup) {
      const name = customName.value[mg].trim()
      if (!name) return
      if (strengthForm.value[mg].some(e => e.name === name)) return
      // 保存到动作库（幂等：库中已存在则跳过）
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

    /** 移除动作 */
    function removeExercise(mg: MuscleGroup, index: number) {
      strengthForm.value[mg] = strengthForm.value[mg].filter((_, i) => i !== index)
    }

    /** 切换某个动作的完成状态 */
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
      if (!store.strengthModalDate) return
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
      store.saveStrengthCompletion(store.strengthModalDate, exercises, strengthWarmup.value, strengthCooldown.value)
    }

    function isToday(date: string): boolean {
      const _d = new Date()
      return date === `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
    }

    function getBadgeClass(type: string): string {
      if (type === 'strength') return 'badge-strength'
      if (type === 'cardio') return 'badge-cardio'
      return 'badge-rest'
    }

    function getAdjustOptionsForDate(plan: DayPlan[], date: string) {
      return getAdjustOptions(plan, date)
    }

    function isNeglected(name: string): boolean {
      return store.neglectedExercises.has(name)
    }

    // 手动选日期推迟
    const showDatePicker = ref(false)
    const datePickerSlots = ref<{ date: string; label: string }[]>([])

    // RPE 提示弹窗
    const showRpeTip = ref(false)
    const showWarmupTip = ref(false)
    const rpeLabels: Record<number, string> = {
      1: '极轻', 2: '轻', 3: '中等偏轻', 4: '中等', 5: '中等偏重',
      6: '重', 7: '很重', 8: '非常重', 9: '极重', 10: '极限'
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

    function openDatePicker() {
      if (!store.adjustDate) return
      const slots = findAvailableSlots(store.plan, store.adjustDate)
      datePickerSlots.value = slots.map(s => ({
        date: s,
        label: `${s.slice(5)} 周${['日', '一', '二', '三', '四', '五', '六'][new Date(s + 'T00:00:00').getDay()]}`
      }))
      showDatePicker.value = true
    }

    function applyDatePick(slotDate: string) {
      if (!store.adjustDate) return
      store.postponeToDate(store.adjustDate, slotDate)
      showDatePicker.value = false
    }

    function completionPct(day: DayPlan): number {
      if (!day.exercises || day.exercises.length === 0) return 0
      return Math.round((day.exercises.filter(e => e.completed).length / day.exercises.length) * 100)
    }

    /** 按部位统计完成情况 */
    function mgCompletion(day: DayPlan) {
      const stats: Record<MuscleGroup, { total: number; done: number }> = {
        chest: { total: 0, done: 0 },
        shoulders_back: { total: 0, done: 0 },
        legs: { total: 0, done: 0 }
      }
      day.exercises.forEach(ex => {
        const mg = ex.muscleGroup
        if (mg && MUSCLE_GROUPS.includes(mg)) {
          stats[mg].total++
          if (ex.completed) stats[mg].done++
        }
      })
      return stats
    }

    /** 有氧进度 */
    const cardioTarget = computed(() => settingsStore.settings.cardioTargetMinutes)
    const cardioPct = computed(() => Math.min(100, Math.round((store.weekCardioMinutes / cardioTarget.value) * 100)))
    const cardioLabel = computed(() => {
      const done = store.weekCardioMinutes
      const target = cardioTarget.value
      if (done >= target) {
        return `🎉 本周有氧已超 ${done} 分钟`
      }
      return `🏃 本周有氧 ${done} / ${target} 分钟`
    })
    const cardioDiff = computed(() => {
      const diff = cardioTarget.value - store.weekCardioMinutes
      return diff > 0 ? `还差 ${diff} 分钟` : `已超过 ${-diff} 分钟`
    })

    /** 今日看板数据 */
    const weekdayName = computed(() => {
      const d = new Date()
      return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
    })

    const todayAction = computed<{
      icon: string
      label: string
      color: string
      sub: string
    }>(() => {
      const tp = store.todayPlan
      if (!tp) return { icon: '📅', label: '暂无计划', color: 'var(--color-rest)', sub: '' }
      if (tp.type === 'rest') return { icon: '😴', label: '休息日', color: 'var(--color-rest)', sub: '恢复身体，明天继续' }
      if (tp.type === 'strength') {
        const done = tp.exercises.filter(e => e.completed).length
        const total = tp.exercises.length
        const pct = total > 0 ? Math.round(done / total * 100) : 0
        return { icon: '💪', label: '力量训练', color: 'var(--color-strength)', sub: `${done}/${total}  · ${pct}%` }
      }
      if (tp.type === 'cardio') {
        const done = tp.completed
        return { icon: '🏃', label: '有氧训练', color: 'var(--color-cardio)', sub: done ? '已完成' : (tp.details || '35-40 分钟') }
      }
      return { icon: '📅', label: '—', color: 'var(--color-rest)', sub: '' }
    })

    const todayPct = computed(() => {
      const tp = store.todayPlan
      if (!tp || tp.type === 'rest') return 0
      if (tp.type === 'strength') {
        const total = tp.exercises.length
        const done = tp.exercises.filter(e => e.completed).length
        return total > 0 ? Math.round(done / total * 100) : 0
      }
      return tp.completed ? 100 : 0
    })

    const todayDone = computed(() => {
      const tp = store.todayPlan
      return tp ? tp.completed : false
    })

    return () => (
      <div class="plan-view view">
        <div class="view-header">
          <h1 class="view-title">训练计划</h1>

          {/* 今日概览 + 有氧进度（紧凑合并） */}
          {store.hasPlan && (
            <div class="today-bar">
              <div class="today-bar-main">
                <span class="today-date-num">{new Date().getDate()}</span>
                <span class="today-date-text">{weekdayName.value} · {new Date().getMonth() + 1}月</span>
                <span class="today-badge" style={{ background: todayAction.value.color + '20', color: todayAction.value.color }}>
                  {todayAction.value.icon} {todayAction.value.label}
                </span>
                <span class="today-sub">{todayAction.value.sub}</span>
                {store.streakCount > 0 && (
                  <span class="today-streak">🔥 {store.streakCount}天</span>
                )}
              </div>
              <div class="today-bar-cardio">
                <span class="cardio-text">{cardioLabel.value}</span>
                <span class="cardio-diff">{cardioDiff.value}</span>
                <div class="cardio-mini-bar">
                  <div class="cardio-mini-fill" style={{ width: cardioPct.value + '%' }}></div>
                </div>
              </div>
            </div>
          )}

          <div class="week-nav">
            <button class="btn btn-ghost week-arrow" onClick={() => store.goToWeek(-1)}>‹</button>
            <span class="week-label">{weekLabel.value}</span>
            <button class="btn btn-ghost week-arrow" onClick={() => store.goToWeek(1)}>›</button>
          </div>
        </div>

        <div class="view-body">
          {weekInfo.value && (
            <div class="day-list card-stagger">
              {weekInfo.value.days.map((day: DayPlan) => (
                <div key={day.date}
                  class={['day-card card', `day-${day.type}`, isToday(day.date) && 'day-today', day.completed && 'day-done', day.missed && 'day-skipped'].filter(Boolean).join(' ')}>
                  {/* 顶部：日期 + 标签 */}
                  <div class="day-top">
                    <div class="day-date-block">
                      <span class="day-date-num">{new Date(day.date + 'T00:00:00').getDate()}</span>
                      <span class="day-date-wd">周{weekdayLabels[new Date(day.date + 'T00:00:00').getDay()]}</span>
                    </div>
                    {isToday(day.date) && <span class="today-tag">今天</span>}
                    {day.details?.startsWith('📌') && <span class="makeup-tag">补练</span>}
                    {day.missed && <span class="status-tag status-skipped">⏭️ 已跳过</span>}
                    {day.completed && <span class="status-tag status-done">✅ 已完成</span>}
                    <span class={['badge', getBadgeClass(day.type)].join(' ')}>{getTypeLabel(day.type)}</span>
                  </div>

                  {/* 摘要 + 展开指示器（足够的点击区域） */}
                  {day.type !== 'rest' && (
                    <div class="day-detail-area" onClick={() => toggleExpand(day.date)}>
                      <div class="day-detail-text">
                        <span class="detail-icon">📋</span>
                        {day.type === 'strength' && day.exercises.length > 0 && (
                          <span>
                            {completionPct(day) > 0 ? `${completionPct(day)}% 已完成` : `${day.exercises.length} 个动作`}
                          </span>
                        )}
                        {day.type === 'cardio' && <span>{day.details}</span>}
                      </div>
                      <span class={['expand-chevron', isExpanded(day.date) && 'chevron-open'].filter(Boolean).join(' ')}>▸</span>
                    </div>
                  )}

                  {/* 有氧记录概要（已完成且有 cardioRecord） */}
                  {day.type === 'cardio' && day.completed && day.cardioRecord && (
                    <div class="day-cardio-summary">
                      <span class="cardio-stat">🕐 {day.cardioRecord.durationMinutes}分钟</span>
                      {day.cardioRecord.avgHeartRate && (
                        <span class="cardio-stat">💓 {day.cardioRecord.avgHeartRate} bpm</span>
                      )}
                      {day.cardioRecord.action && (
                        <span class="cardio-stat">{day.cardioRecord.action}</span>
                      )}
                    </div>
                  )}

                  {/* 已展开：按部位展示完成情况 + 热身放松 */}
                  {isExpanded(day.date) && day.type === 'strength' && (
                    <div class="exercise-list">
                      <div class="exercise-progress">
                        <div class="progress-bar-mini">
                          <div class="progress-fill-mini" style={{ width: completionPct(day) + '%' }}></div>
                        </div>
                        <span class="progress-label">{completionPct(day)}%</span>
                      </div>
                      {MUSCLE_GROUPS.map(mg => (
                        <div key={mg}
                          class={['mg-summary-item', mgCompletion(day)[mg].done > 0 && 'mg-summary-done'].filter(Boolean).join(' ')}>
                          <span class="mg-summary-icon">{MUSCLE_GROUP_ICONS[mg]}</span>
                          <span class="mg-summary-label">{MUSCLE_GROUP_LABELS[mg]}</span>
                          <span class="mg-summary-count">{mgCompletion(day)[mg].done}/{mgCompletion(day)[mg].total}</span>
                          {mgCompletion(day)[mg].total > 0 ? (
                            <span class="mg-summary-badge">
                              {mgCompletion(day)[mg].done === mgCompletion(day)[mg].total ? '✅' : '⚠️'}
                            </span>
                          ) : (
                            <span class="mg-summary-badge">○</span>
                          )}
                        </div>
                      ))}

                      {/* 热身与放松 */}
                      <div class={['mg-summary-item', (day.warmupDone || day.cooldownDone) && 'mg-summary-done'].filter(Boolean).join(' ')}>
                        <span class="mg-summary-icon">🧘</span>
                        <span class="mg-summary-label">热身与放松</span>
                        <span class="mg-summary-count"></span>
                        <span class="mg-summary-badge">
                          {day.warmupDone && day.cooldownDone ? '✅' : day.warmupDone || day.cooldownDone ? '⚠️' : '○'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 底部操作栏 */}
                  {day.type !== 'rest' && !day.completed && !day.missed && (
                    <div class="day-foot">
                      <button class="btn btn-primary btn-sm" onClick={() => day.type === 'cardio' ? openCardioModal(day.date) : openStrengthModal(day.date)}>
                        {day.type === 'cardio' ? '完成' : '完成'}
                      </button>
                      <button class="btn btn-ghost btn-sm" onClick={() => store.skipDay(day.date)}>跳过</button>
                    </div>
                  )}
                  {day.completed && (
                    <div class="day-foot">
                      <span class="done-badge">
                        ✅ 已完成
                        {day.type === 'cardio' && day.cardioRecord && <span> · {day.cardioRecord.durationMinutes}分钟</span>}
                        {day.type === 'strength' && <span> · {completionPct(day)}%</span>}
                      </span>
                      <button class="btn btn-ghost btn-sm" onClick={() => store.markCompleted(day.date)}>撤销</button>
                    </div>
                  )}
                  {day.missed && (
                    <div class="day-foot">
                      <span class="skipped-badge">⏭️ 已跳过</span>
                      <button class="btn btn-ghost btn-sm" onClick={() => store.undoSkip(day.date)}>撤回</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!store.hasPlan && (
            <div class="empty-state">
              <span class="empty-icon">📅</span>
              <p>还没有训练计划</p>
              <button class="btn btn-primary" onClick={() => store.initPlan()}>生成计划</button>
            </div>
          )}

          {/* 调整弹窗 */}
          <Teleport to="body">
            {store.showAdjustModal && (
              <div class="modal-overlay pv-modal" onClick={(e) => { if (e.target === e.currentTarget) store.cancelAdjust() }}>
                <div class="modal-content">
                  <h3>调整计划</h3>
                  <p class="modal-desc">你错过了 {store.adjustDate} 的训练，如何调整？</p>
                  {getAdjustOptionsForDate(store.plan, store.adjustDate!).map((opt, i) => (
                    <div key={i} class="adj-option card" onClick={() => store.applyAdjustOption(i)}>
                      <strong>{opt.label}</strong>
                      <p>{opt.description}</p>
                    </div>
                  ))}
                  <div class="adj-option card adj-manual" onClick={openDatePicker}>
                    <strong>📅 手动选日期推迟</strong>
                    <p>从后续休息日中选一天推迟训练</p>
                  </div>
                  <button class="btn btn-ghost" style={{ marginTop: '12px' }} onClick={() => store.cancelAdjust()}>取消</button>
                </div>
              </div>
            )}
          </Teleport>

          {/* 手动选日期弹窗 */}
          <Teleport to="body">
            {showDatePicker.value && (
              <div class="modal-overlay pv-modal" onClick={(e) => { if (e.target === e.currentTarget) showDatePicker.value = false }}>
                <div class="modal-content">
                  <h3>选择推迟日期</h3>
                  <p class="modal-desc">将 {store.adjustDate} 的训练推迟到：</p>
                  <div class="slot-list">
                    {datePickerSlots.value.map(slot => (
                      <div key={slot.date} class="slot-item card" onClick={() => applyDatePick(slot.date)}>
                        <span class="slot-date">{slot.label}</span>
                        <span class="slot-arrow">→</span>
                      </div>
                    ))}
                    {datePickerSlots.value.length === 0 && (
                      <div class="empty-state" style={{ padding: '24px' }}>
                        <p>没有可用的休息日</p>
                      </div>
                    )}
                  </div>
                  <div class="form-actions">
                    <button class="btn btn-ghost" onClick={() => { showDatePicker.value = false }}>取消</button>
                  </div>
                </div>
              </div>
            )}
          </Teleport>

          {/* 有氧完成弹窗 */}
          <Teleport to="body">
            {store.showCardioModal && (
              <div class="modal-overlay pv-modal" onClick={(e) => { if (e.target === e.currentTarget) store.cancelCardioModal() }}>
                <div class="modal-content">
                  <h3>🏃 记录有氧训练</h3>
                  <p class="modal-desc">{store.cardioModalDate}</p>

                  <div class="form-group">
                    <label class="label">运动类型</label>
                    <div class="cardio-action-grid">
                      {CARDIO_ACTIONS.map(act => (
                        <button key={act}
                          class={['chip', cardioForm.value.action === act && 'chip-active'].filter(Boolean).join(' ')}
                          onClick={() => { cardioForm.value.action = act }}
                        >{act}</button>
                      ))}
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="label">运动时长</label>
                    <div class="stepper-row">
                      <button class="btn btn-ghost btn-sm" onClick={() => { cardioForm.value.durationMinutes = Math.max(5, cardioForm.value.durationMinutes - 5) }}>−</button>
                      <span class="stepper-value">{cardioForm.value.durationMinutes} 分钟</span>
                      <button class="btn btn-ghost btn-sm" onClick={() => { cardioForm.value.durationMinutes = Math.min(180, cardioForm.value.durationMinutes + 5) }}>+</button>
                    </div>
                    <div class="duration-quick">
                      {[20, 30, 40, 60, 90].map(d => (
                        <button key={d}
                          class={['chip chip-sm', cardioForm.value.durationMinutes === d && 'chip-active'].filter(Boolean).join(' ')}
                          onClick={() => { cardioForm.value.durationMinutes = d }}>{d}分钟</button>
                      ))}
                      <button class="chip chip-sm"
                        onClick={() => { const d = store.plan.find((p: DayPlan) => p.date === store.cardioModalDate); cardioForm.value.durationMinutes = d?.details?.includes('长有氧') ? 65 : 38 }}>
                        计划量
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="label">平均心率 <span class="label-optional">（可选）</span></label>
                    <div class="stepper-row">
                      <button class="btn btn-ghost btn-sm" onClick={() => { cardioForm.value.avgHeartRate = (cardioForm.value.avgHeartRate || 120) > 60 ? (cardioForm.value.avgHeartRate || 120) - 5 : 60 }}>−</button>
                      <span class="stepper-value">{cardioForm.value.avgHeartRate ? cardioForm.value.avgHeartRate + ' bpm' : '未设置'}</span>
                      <button class="btn btn-ghost btn-sm" onClick={() => { cardioForm.value.avgHeartRate = Math.min(220, (cardioForm.value.avgHeartRate || 120) + 5) }}>+</button>
                    </div>
                  </div>

                  {/* 热身与放松 */}
                  <div class="rec-section">
                    <div class="rec-section-title">热身与放松 <button class="rpe-tip-btn" onClick={() => { showWarmupTip.value = true }}>ℹ️ 为什么重要？</button></div>
                    <label class="rec-check">
                      <input type="checkbox" checked={cardioWarmup.value} onChange={(e) => cardioWarmup.value = (e.target as HTMLInputElement).checked} />
                      <span>运动前拉伸（5-10 分钟）</span>
                    </label>
                    <label class="rec-check">
                      <input type="checkbox" checked={cardioCooldown.value} onChange={(e) => cardioCooldown.value = (e.target as HTMLInputElement).checked} />
                      <span>运动后放松（5-10 分钟）</span>
                    </label>
                  </div>

                  <div class="form-actions">
                    <button class="btn btn-ghost" onClick={() => store.cancelCardioModal()}>取消</button>
                    <button class="btn btn-primary" onClick={submitCardio}>保存并完成</button>
                  </div>
                </div>
              </div>
            )}
          </Teleport>

          {/* 力量完成弹窗 */}
          <Teleport to="body">
            {store.showStrengthModal && (
              <div class="modal-overlay pv-modal" onClick={(e) => { if (e.target === e.currentTarget) store.cancelStrengthModal() }}>
                <div class="modal-content">
                  <h3>💪 完成力量训练</h3>
                  <p class="modal-desc">{store.strengthModalDate}</p>
                  <div class="str-quick-row">
                    <button class="chip chip-sm" onClick={allDone}>全部完成</button>
                  </div>

                  {/* 按部位循环 */}
                  {MUSCLE_GROUPS.map(mg => (
                    <div key={mg} class="mg-block">
                      {/* 部位头部 */}
                      <div class="mg-head" onClick={() => toggleGroup(mg)}>
                        <span class="mg-icon">{MUSCLE_GROUP_ICONS[mg]}</span>
                        <span class="mg-label">{MUSCLE_GROUP_LABELS[mg]}</span>
                        {groupCount(mg) > 0 && <span class="mg-count">{groupCount(mg)} 项</span>}
                        <span class="mg-arrow">{isGroupExpanded(mg) ? '▼' : '▶'}</span>
                      </div>

                      {/* 部位展开面板 */}
                      {isGroupExpanded(mg) && (
                        <div class="mg-body">
                          {/* 推荐动作 chip */}
                          <div class="mg-chips">
                            {exerciseStore.getExercisesByGroup(mg).map((def: ExerciseDef) => (
                              <button key={def.name}
                                class={['chip mg-chip', strengthForm.value[mg].some(e => e.name === def.name) && 'mg-chip-added'].filter(Boolean).join(' ')}
                                onClick={(e) => { e.stopPropagation(); addExerciseFromDb(mg, def as ExerciseDef) }}
                              >{def.name}{'id' in def && (def as any).id && <span class="mg-chip-tag">自</span>}</button>
                            ))}
                          </div>

                          {/* 已选动作列表 */}
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

                          {/* 自定义动作 */}
                          <div class="mg-custom">
                            <input v-model={customName.value[mg]} class="text-input mg-custom-input" placeholder="输入自定义动作名称..." onKeyup={(e) => { if (e.key === 'Enter') addCustomExercise(mg) }} />
                            <button class="btn btn-sm btn-outline" onClick={() => addCustomExercise(mg)}>+ 添加</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 热身与放松 */}
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
                    <button class="btn btn-ghost" onClick={() => store.cancelStrengthModal()}>取消</button>
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
              </div>
            )}
          </Teleport>

          {/* 热身放松说明弹窗 */}
          <Teleport to="body">
            {showWarmupTip.value && (
              <div class="modal-overlay pv-modal" onClick={(e) => { if (e.target === e.currentTarget) showWarmupTip.value = false }}>
                <div class="modal-content">
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
          </Teleport>
        </div>
      </div>
    )
  }
})
