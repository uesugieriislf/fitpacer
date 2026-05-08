import { onMounted, computed, ref, watch, defineComponent } from 'vue'
import './PlanView.css'
import { usePlan } from './usePlan'
import { useSettings } from '../settings/useSettings'
import { getTypeIcon, getTypeLabel, weekdayLabels } from '../shared/icons'
import { getAdjustOptions, findAvailableSlots } from './planEngine'
import type { DayPlan } from './storage'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ICONS, type MuscleGroup } from '../shared/exercises'
import CardioModal from './components/CardioModal/CardioModal'
import StrengthModal from './components/StrengthModal/StrengthModal'

export default defineComponent({
  setup() {
    const store = usePlan()
    const settingsStore = useSettings()

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

    /** 打开有氧弹窗 */
    function openCardioModal(date: string) {
      store.markCompleted(date)
    }

    /** 打开力量弹窗 */
    function openStrengthModal(date: string) {
      store.markCompleted(date)
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
          <CardioModal
            show={store.showCardioModal}
            date={store.cardioModalDate}
            onClose={() => store.cancelCardioModal()}
            onSubmit={(payload: any) => {
              store.saveCardioRecord(payload.date, payload.record, payload.warmupDone, payload.cooldownDone)
            }}
          />

          {/* 力量完成弹窗 */}
          <StrengthModal
            show={store.showStrengthModal}
            date={store.strengthModalDate}
            onClose={() => store.cancelStrengthModal()}
            onSubmit={(payload: any) => {
              store.saveStrengthCompletion(payload.date, payload.exercises, payload.warmupDone, payload.cooldownDone)
            }}
          />
        </div>
      </div>
    )
  }
})
