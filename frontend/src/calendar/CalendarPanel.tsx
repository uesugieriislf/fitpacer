import { computed, defineComponent, type PropType } from "vue";
import { useCalendar } from "./useCalendar";
import type { DayPlan } from "../plan/storage";
import type { CellStatus } from "./calendarEngine";
import "./CalendarPanel.css";

export default defineComponent({
  props: {
    plan: { type: Array as PropType<DayPlan[]>, required: true },
    recordedDates: { type: Object as PropType<Set<string>>, required: true },
  },
  setup(props) {
    const { cells, monthLabel, todayStr, prevMonth, nextMonth, goToToday } = useCalendar(
      computed(() => props.plan),
      computed(() => props.recordedDates),
    );

    const statusMeta: Record<CellStatus, { color: string; label: string }> = {
      completed: { color: "var(--color-primary)", label: "已完成" },
      missed: { color: "var(--color-danger)", label: "错过" },
      cardio: { color: "var(--color-cardio)", label: "有氧" },
      strength: { color: "var(--color-strength)", label: "力量" },
      rest: { color: "var(--color-rest)", label: "休息" },
      none: { color: "transparent", label: "" },
    };

    const isTodayInView = computed(() => {
      return cells.value.some((c) => c.date === todayStr.value && c.isCurrentMonth);
    });

    return () => (
      <section class="calendar-panel section">
        <div class="section-header">
          <h2 class="section-title">训练日历</h2>
        </div>

        <div class="cal-card card card-elevated">
          {/* 月份导航 */}
          <div class="cal-nav">
            <button class="cal-nav-btn" onClick={prevMonth}>
              ‹
            </button>
            <button
              class="cal-nav-title"
              onClick={goToToday}
              title={isTodayInView.value ? "回到今天" : ""}
            >
              {monthLabel.value}
            </button>
            <button class="cal-nav-btn" onClick={nextMonth}>
              ›
            </button>
          </div>

          {/* 星期行 */}
          <div class="cal-weekdays">
            {["日", "一", "二", "三", "四", "五", "六"].map((wd) => (
              <span key={wd} class="cal-wd">
                {wd}
              </span>
            ))}
          </div>

          {/* 日期网格 */}
          <div class="cal-grid">
            {cells.value.map((cell, i) => (
              <div
                key={i}
                class={[
                  "cal-cell",
                  { "cal-cell-muted": !cell.isCurrentMonth },
                  { "cal-cell-today": cell.date === todayStr.value },
                ]}
              >
                <span class="cal-day-num">{cell.day || ""}</span>
                {cell.isCurrentMonth && cell.status !== "none" && (
                  <span
                    class={["cal-dot", { "cal-dot-ring": cell.status === "missed" }]}
                    style={{
                      background:
                        cell.status === "missed" ? "transparent" : statusMeta[cell.status].color,
                      borderColor: statusMeta[cell.status].color,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 图例 */}
          <div class="cal-legend">
            {[
              statusMeta.completed,
              statusMeta.strength,
              statusMeta.cardio,
              statusMeta.rest,
              statusMeta.missed,
            ].map((meta) => (
              <span key={meta.label} class="cal-legend-item">
                <span
                  class={["cal-legend-dot", { "cal-legend-dot-ring": meta.label === "错过" }]}
                  style={{
                    background: meta.label === "错过" ? "transparent" : meta.color,
                    borderColor: meta.color,
                  }}
                />
                <span class="cal-legend-label">{meta.label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    );
  },
});
