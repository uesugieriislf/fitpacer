import { defineComponent, ref, watch, Teleport } from 'vue'
import { CARDIO_ACTIONS } from '../../planEngine'
import './CardioModal.css'

export default defineComponent({
  props: {
    show: { type: Boolean, default: false },
    date: { type: String, default: '' },
  },
  emits: {
    close: () => true,
    submit: (_payload: {
      date: string
      record: { durationMinutes: number; avgHeartRate?: number; action: string }
      warmupDone: boolean
      cooldownDone: boolean
    }) => true,
  },
  setup(props, { emit }) {
    const cardioForm = ref({
      durationMinutes: 30,
      avgHeartRate: undefined as number | undefined,
      action: '慢跑',
    })
    const cardioWarmup = ref(false)
    const cardioCooldown = ref(false)
    const showWarmupTip = ref(false)

    // 打开时重置表单
    watch(() => props.show, (val) => {
      if (val) {
        cardioForm.value.durationMinutes = 30
        cardioForm.value.avgHeartRate = undefined
        cardioForm.value.action = '慢跑'
        cardioWarmup.value = false
        cardioCooldown.value = false
        showWarmupTip.value = false
      }
    })

    function submitCardio() {
      if (!props.date) return
      emit('submit', {
        date: props.date,
        record: {
          durationMinutes: cardioForm.value.durationMinutes,
          avgHeartRate: cardioForm.value.avgHeartRate || undefined,
          action: cardioForm.value.action,
        },
        warmupDone: cardioWarmup.value,
        cooldownDone: cardioCooldown.value,
      })
    }

    function close() {
      emit('close')
    }

    return () => (
      <div class="cardio-modal">
        <Teleport to="body">
          {props.show && (
            <div class="modal-overlay cardio-modal" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
              <div class="modal-content">
                <h3>🏃 记录有氧训练</h3>
                <p class="modal-desc">{props.date}</p>

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
                      onClick={() => { cardioForm.value.durationMinutes = 38 }}>
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
                  <button class="btn btn-ghost" onClick={() => close()}>取消</button>
                  <button class="btn btn-primary" onClick={submitCardio}>保存并完成</button>
                </div>
              </div>
            </div>
          )}
        </Teleport>

        <Teleport to="body">
          {showWarmupTip.value && (
            <div class="modal-overlay cardio-modal" onClick={(e) => { if (e.target === e.currentTarget) showWarmupTip.value = false }}>
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
    )
  },
})
