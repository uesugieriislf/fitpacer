import { defineComponent, ref, Teleport } from "vue";
import { useSettings } from "./useSettings";
import { useGoal } from "../goal/useGoal";
import { useTheme } from "../shared/useTheme";
import { weekdayLabels } from "../shared/icons";
import { useExercise } from "../exercise/useExercise";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from "../shared/exercises";
import type { MuscleGroup } from "../shared/exercises";
import "./SettingsView.css";

const ALL_EXERCISE_GROUPS: MuscleGroup[] = [...MUSCLE_GROUPS, "cardio"];

export default defineComponent({
  setup() {
    const settingsStore = useSettings();
    const goalStore = useGoal();
    const exerciseStore = useExercise();
    const themeResult = useTheme();
    const allDays = [0, 1, 2, 3, 4, 5, 6];

    function onToggleDay(day: number) {
      settingsStore.toggleTrainingDay(day);
    }

    const showLibModal = ref(false);
    const libFormName = ref("");
    const libFormGroup = ref<MuscleGroup>("chest");
    const libFormPrescription = ref("3×10");
    const editingId = ref<string | null>(null);

    function openAddLib() {
      libFormName.value = "";
      libFormGroup.value = "chest";
      libFormPrescription.value = "3×10";
      editingId.value = null;
      showLibModal.value = true;
    }

    function openEditLib(id: string) {
      const ex = exerciseStore.allCustom.find((e) => e.id === id);
      if (!ex) return;
      libFormName.value = ex.name;
      libFormGroup.value = ex.muscleGroup;
      libFormPrescription.value = ex.defaultPrescription;
      editingId.value = id;
      showLibModal.value = true;
    }

    function submitLibForm() {
      const name = libFormName.value.trim();
      if (!name) return;
      if (editingId.value) {
        exerciseStore.update(editingId.value, {
          name,
          muscleGroup: libFormGroup.value,
          defaultPrescription: libFormPrescription.value,
        });
      } else {
        exerciseStore.add(name, libFormGroup.value, libFormPrescription.value);
      }
      showLibModal.value = false;
    }

    function confirmRemove(id: string) {
      const ex = exerciseStore.allCustom.find((e) => e.id === id);
      if (!ex) return;
      if (confirm(`删除「${ex.name}」？`)) {
        exerciseStore.remove(id);
      }
    }

    return () => (
      <div class="settings-view view">
        <div class="view-header">
          <h1 class="view-title">设置</h1>
        </div>

        <div class="view-body">
          <section class="section">
            <div class="section-title-row">
              <h2 class="section-title">减重目标</h2>
            </div>
            <p class="section-desc">设定目标参数，看板会实时追踪进度和 BMI</p>

            <div class="form-field">
              <div class="label">身高</div>
              <div class="input-with-unit">
                <input
                  type="number"
                  value={goalStore.config.height}
                  onInput={(e: Event) =>
                    goalStore.updateConfig({
                      height: parseFloat((e.target as HTMLInputElement).value) || 170,
                    })
                  }
                  class="text-input"
                  step="1"
                  min="100"
                  max="250"
                />
                <span class="unit">cm</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <div class="label">起始体重</div>
                <div class="input-with-unit">
                  <input
                    type="number"
                    value={goalStore.config.startWeight}
                    onInput={(e: Event) =>
                      goalStore.updateConfig({
                        startWeight: parseFloat((e.target as HTMLInputElement).value) || 80,
                      })
                    }
                    class="text-input"
                    step="0.1"
                    min="30"
                    max="200"
                  />
                  <span class="unit">kg</span>
                </div>
              </div>
              <div class="form-field">
                <div class="label">目标体重</div>
                <div class="input-with-unit">
                  <input
                    type="number"
                    value={goalStore.config.targetWeight}
                    onInput={(e: Event) =>
                      goalStore.updateConfig({
                        targetWeight: parseFloat((e.target as HTMLInputElement).value) || 65,
                      })
                    }
                    class="text-input"
                    step="0.1"
                    min="30"
                    max="200"
                  />
                  <span class="unit">kg</span>
                </div>
              </div>
            </div>

            {goalStore.currentWeight !== null && (
              <div class="preview-card card">
                <div class="preview-row">
                  <span>当前体重</span>
                  <span class="preview-val">{goalStore.currentWeight} kg</span>
                </div>
                <div class="preview-row">
                  <span>BMI</span>
                  <span class="preview-val">
                    {goalStore.bmi} — {goalStore.bmiCategory}
                  </span>
                </div>
                {goalStore.weightRemaining !== null && goalStore.weightRemaining > 0 && (
                  <div class="preview-row">
                    <span>还需减重</span>
                    <span class="preview-val remaining">{goalStore.weightRemaining} kg</span>
                  </div>
                )}
              </div>
            )}
          </section>

          <section class="section">
            <h2 class="section-title">训练日</h2>
            <p class="section-desc">选择允许安排训练的日期</p>
            <div class="day-toggles">
              {allDays.map((day) => (
                <button
                  key={day}
                  class={["day-toggle", { on: settingsStore.settings.trainingDays.includes(day) }]}
                  onClick={() => onToggleDay(day)}
                >
                  周{weekdayLabels[day]}
                </button>
              ))}
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">有氧目标</h2>
            <p class="section-desc">每周有氧运动的推荐时长（WHO 建议 150 分钟）</p>
            <div class="form-row">
              <div class="form-field">
                <div class="input-with-unit">
                  <input
                    type="number"
                    value={settingsStore.settings.cardioTargetMinutes}
                    onInput={(e: Event) =>
                      settingsStore.setCardioTarget(
                        parseInt((e.target as HTMLInputElement).value) || 150,
                      )
                    }
                    class="text-input"
                    step="10"
                    min="10"
                    max="600"
                  />
                  <span class="unit">分钟/周</span>
                </div>
              </div>
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">睡眠提醒</h2>
            <p class="section-desc">设定提醒时间（页面提示）</p>
            <div class="time-row">
              <input
                type="time"
                value={settingsStore.settings.sleepReminderTime}
                onChange={(e: Event) =>
                  settingsStore.setSleepReminderTime((e.target as HTMLInputElement).value)
                }
                class="text-input time-input"
              />
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">主题</h2>
            <div class="theme-row">
              <button
                class={["btn", themeResult.theme.value === "light" ? "btn-primary" : "btn-outline"]}
                onClick={themeResult.toggle}
              >
                {themeResult.theme.value === "dark" ? "🌙 深色" : "☀️ 浅色"}
              </button>
            </div>
          </section>

          <section class="section">
            <button class="btn btn-primary apply-btn" onClick={settingsStore.applySettings}>
              应用设置并重新生成计划
            </button>
          </section>

          <section class="section">
            <div class="section-header">
              <h2 class="section-title">动作库</h2>
              <button class="btn btn-primary btn-sm" onClick={openAddLib}>
                + 添加
              </button>
            </div>
            <p class="section-desc">管理自定义训练动作，添加后可在训练弹窗中直接选用</p>
            {exerciseStore.allCustom.length > 0 ? (
              <div class="ex-lib-list">
                {exerciseStore.allCustom.map((ex) => (
                  <div key={ex.id} class="ex-lib-item card">
                    <div class="ex-lib-info">
                      <span class="ex-lib-name">{ex.name}</span>
                      <span class="ex-lib-meta">
                        {MUSCLE_GROUP_LABELS[ex.muscleGroup]} · {ex.defaultPrescription}
                      </span>
                    </div>
                    <div class="ex-lib-actions">
                      <button class="btn btn-ghost btn-xs" onClick={() => openEditLib(ex.id)}>
                        编辑
                      </button>
                      <button
                        class="btn btn-ghost btn-xs ex-del"
                        onClick={() => confirmRemove(ex.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div class="ex-lib-empty">
                <p>暂无自定义动作，点击「+ 添加」创建一个</p>
              </div>
            )}
          </section>

          <Teleport to="body">
            {showLibModal.value && (
              <div
                class="modal-overlay pv-modal"
                onClick={(e: MouseEvent) => {
                  if (e.target === e.currentTarget) showLibModal.value = false;
                }}
              >
                <div class="modal-content">
                  <h3>{editingId.value ? "编辑动作" : "添加动作"}</h3>

                  <div class="form-field">
                    <div class="label">动作名称</div>
                    <input
                      v-model={libFormName.value}
                      class="text-input"
                      placeholder="如：哑铃弯举"
                    />
                  </div>

                  <div class="form-field">
                    <div class="label">部位</div>
                    <div class="lib-group-chips">
                      {ALL_EXERCISE_GROUPS.map((mg) => (
                        <button
                          key={mg}
                          class={["chip", { "chip-active": libFormGroup.value === mg }]}
                          onClick={() => (libFormGroup.value = mg)}
                        >
                          {MUSCLE_GROUP_LABELS[mg]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="form-field">
                    <div class="label">默认组数×次数</div>
                    <input
                      v-model={libFormPrescription.value}
                      class="text-input"
                      placeholder="如：3×10"
                    />
                  </div>

                  <div class="form-actions">
                    <button class="btn btn-ghost" onClick={() => (showLibModal.value = false)}>
                      取消
                    </button>
                    <button class="btn btn-primary" onClick={submitLibForm}>
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Teleport>

          <section class="section about">
            <p>FitPacer — 极简智能个人训练助手</p>
            <p class="version">v1.0 · PWA</p>
          </section>
        </div>
      </div>
    );
  },
});
