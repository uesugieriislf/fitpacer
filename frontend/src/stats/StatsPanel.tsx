import { defineComponent, ref, computed } from "vue";
import { getPeriodReport, type PeriodUnit } from "./statsEngine";
import type { TrainingRecord } from "../record/storage";
import "./StatsPanel.css";

export default defineComponent({
  props: {
    records: {
      type: Array as () => TrainingRecord[],
      required: true,
    },
  },
  setup(props) {
    const periodUnits = [
      { key: "week" as PeriodUnit, label: "周" },
      { key: "month" as PeriodUnit, label: "月" },
      { key: "quarter" as PeriodUnit, label: "季度" },
      { key: "year" as PeriodUnit, label: "年" },
    ];

    const activeUnit = ref<PeriodUnit>("month");
    const offset = ref(0);

    const report = computed(() => getPeriodReport(props.records, activeUnit.value, offset.value));

    function prevPeriod() {
      offset.value--;
    }
    function nextPeriod() {
      offset.value++;
    }
    function resetPeriod() {
      offset.value = 0;
    }

    return () => (
      <section class="stats-panel view">
        <div class="section-header">
          <h2 class="section-title">训练统计</h2>
        </div>

        <div class="stats-card card card-elevated">
          {/* 维度切换 */}
          <div class="st-dimension">
            {periodUnits.map((u) => (
              <button
                key={u.key}
                class={["st-dim-btn", { "st-dim-active": activeUnit.value === u.key }]}
                onClick={() => {
                  activeUnit.value = u.key;
                  offset.value = 0;
                }}
              >
                {u.label}
              </button>
            ))}
          </div>

          {/* 时段导航 */}
          <div class="st-nav">
            <button class="st-nav-btn" onClick={prevPeriod}>
              ‹
            </button>
            <button class="st-nav-title" onClick={resetPeriod} title="回到当前">
              {report.value.periodLabel}
            </button>
            <button class="st-nav-btn" onClick={nextPeriod}>
              ›
            </button>
          </div>

          {/* 概要 */}
          <div class="st-summary">
            <div class="st-summary-item">
              <span class="st-summary-num">{report.value.trainingDays}</span>
              <span class="st-summary-label">训练天</span>
            </div>
            <div class="st-summary-divider"></div>
            <div class="st-summary-item">
              <span class="st-summary-num">{report.value.totalSets}</span>
              <span class="st-summary-label">总组数</span>
            </div>
            <div class="st-summary-divider"></div>
            <div class="st-summary-item">
              <span class="st-summary-num">{report.value.totalReps}</span>
              <span class="st-summary-label">总次数</span>
            </div>
          </div>

          {/* 空状态 */}
          {report.value.exercises.length === 0 ? (
            <div class="st-empty">
              <span>该时段暂无训练记录</span>
            </div>
          ) : (
            /* 动作排名 */
            <div class="st-exercise-list">
              {report.value.exercises.map((ex, i) => (
                <div key={ex.name} class="st-exercise-item">
                  <span class="st-ex-rank">{i + 1}</span>
                  <div class="st-ex-info">
                    <span class="st-ex-name">{ex.name}</span>
                    <div class="st-ex-meta">
                      <span>{ex.totalSets} 组</span>
                      <span class="st-ex-dot">·</span>
                      <span>{ex.totalReps} 次</span>
                      <span class="st-ex-dot">·</span>
                      <span>{ex.totalSessions} 天</span>
                    </div>
                  </div>
                  {/* 迷你柱状条 */}
                  <div class="st-ex-bar-wrap">
                    <div
                      class="st-ex-bar"
                      style={{
                        width:
                          (ex.totalSets /
                            Math.max(...report.value.exercises.map((e) => e.totalSets))) *
                            100 +
                          "%",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  },
});
