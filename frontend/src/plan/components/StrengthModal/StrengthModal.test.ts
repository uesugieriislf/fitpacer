// plan/StrengthModal.test.ts — StrengthModal 组件测试
import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { usePlan } from "../../usePlan";
import StrengthModal from "./StrengthModal";

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  // 清理 Teleport 到 body 的内容
  document.body.innerHTML = "";
});

describe("StrengthModal", () => {
  it("不渲染当 show=false", () => {
    mount(StrengthModal, { props: { show: false, date: "2026-05-08" } });
    expect(document.body.querySelector(".modal-overlay")).toBeNull();
  });

  it("渲染当 show=true", () => {
    mount(StrengthModal, { props: { show: true, date: "2026-05-08" } });
    const overlay = document.body.querySelector(".modal-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay!.textContent).toContain("2026-05-08");
  });

  it("取消按钮触发 close", async () => {
    const wrapper = mount(StrengthModal, { props: { show: true, date: "2026-05-08" } });
    const cancelBtn = document.body.querySelector(".form-actions .btn-ghost") as HTMLElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("提交空表单触发 submit 并带空 exercises 数组", async () => {
    const wrapper = mount(StrengthModal, { props: { show: true, date: "2026-05-08" } });
    const submitBtn = document.body.querySelector(".btn-primary") as HTMLElement;
    expect(submitBtn).not.toBeNull();
    submitBtn.click();
    const emitted = wrapper.emitted("submit");
    expect(emitted).toBeTruthy();
    const payload = emitted![0][0] as any;
    expect(payload.date).toBe("2026-05-08");
    expect(payload.exercises).toEqual([]);
    expect(payload.warmupDone).toBe(false);
    expect(payload.cooldownDone).toBe(false);
  });

  it("全部完成按钮存在", () => {
    mount(StrengthModal, { props: { show: true, date: "2026-05-08" } });
    const allDoneBtn = document.body.querySelector(".chip.chip-sm") as HTMLElement;
    expect(allDoneBtn).not.toBeNull();
    expect(allDoneBtn.textContent).toContain("全部完成");
  });

  it("从已有训练数据加载动作", async () => {
    const planStore = usePlan();
    planStore.plan = [
      {
        date: "2026-05-08",
        type: "strength" as const,
        completed: false,
        missed: false,
        details: "力量训练",
        exercises: [
          {
            name: "俯卧撑",
            prescription: "3×12",
            completed: true,
            muscleGroup: "chest" as any,
            actualSets: 3,
            actualReps: 12,
            actualRpe: 7,
          },
        ],
        cardioRecord: null,
        warmupDone: false,
        cooldownDone: false,
      },
    ];

    mount(StrengthModal, { props: { show: true, date: "2026-05-08" } });
    // watch 是异步的，等待微任务队列
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.body.textContent).toContain("俯卧撑");
  });

  it("热身与放松复选框存在", () => {
    mount(StrengthModal, { props: { show: true, date: "2026-05-08" } });
    const checkboxes = document.body.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
  });
});
