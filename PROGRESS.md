# FitPacer 开发进度

> 项目状态快照 — 每次有意义的变更后更新。
> 新会话先读此文件，再读源代码。

## 总体状态

| 项目 | 值 |
|------|-----|
| 版本 | v1.0.0 |
| PWA 离线 | 已配置（vite-plugin-pwa + Workbox） |
| 后端 | 预留，当前无代码 |
| 最后验证时间 | 2026-05-05 |
| 最后验证会话 | #1 |

## 功能清单（按模块）

### plan/ — 训练计划 ✅ 已完成

| 文件 | 状态 | 说明 |
|------|------|------|
| `planEngine.ts` | ✅ 完成 | 纯函数：generatePlan / getAdjustOptions / findNextSlot / 周工具 |
| `usePlan.ts` | ✅ 完成 | Pinia store：计划 CRUD、跳过调整、周导航、ICS 导出 |
| `PlanView.vue` | ✅ 完成 | 周视图、完成/跳过/撤销、调整弹窗 |
| `storage.ts` | ✅ 完成 | DayPlan / PlanConfig 类型 + localStorage 读写 |
| `ics.ts` | ✅ 完成 | .ics 生成 + 三种导出策略（share / window.open / 下载） |

### record/ — 训练记录 ✅ 已完成

| 文件 | 状态 | 说明 |
|------|------|------|
| `useRecord.ts` | ✅ 完成 | Pinia store：CRUD + 日期选择 |
| `RecordView.vue` | ✅ 完成 | 日期导航、预设动作库（力量+有氧）、自定义动作、组数/次数/RPE 滑块、备注 |
| `storage.ts` | ✅ 完成 | TrainingRecord 类型 + localStorage 读写 |

### dashboard/ — 数据看板 ✅ 已完成

| 文件 | 状态 | 说明 |
|------|------|------|
| `useDashboard.ts` | ✅ 完成 | Pinia store：周报统计、身体数据 CRUD、Chart.js 数据格式 |
| `DashboardView.vue` | ✅ 完成 | 周报卡片、体重/腰围趋势折线图、身体数据录入弹窗、历史列表 |
| `storage.ts` | ✅ 完成 | BodyData 类型 + localStorage 读写 |

### settings/ — 设置 ✅ 已完成

| 文件 | 状态 | 说明 |
|------|------|------|
| `useSettings.ts` | ✅ 完成 | Pinia store：训练日切换、睡眠时间、自动持久化 |
| `SettingsView.vue` | ✅ 完成 | 训练日多选 toggle、睡眠时间选择、主题切换、应用设置并重生成计划 |
| `storage.ts` | ✅ 完成 | Settings 类型 + localStorage 读写 |

### shared/ — 跨功能复用

| 文件 | 状态 | 说明 |
|------|------|------|
| `useTheme.ts` | ✅ 完成 | 亮/暗主题切换，跟随系统偏好，持久化到 localStorage |
| `icons.ts` | ✅ 完成 | 类型图标/标签、动作库、导航项、星期标签、RPE 描述 |

### 基础设施

| 文件 | 状态 | 说明 |
|------|------|------|
| `App.vue` | ✅ 完成 | 底部导航条件渲染，4 个视图切换 |
| `main.ts` | ✅ 完成 | Vue 3 + Pinia 初始化 |
| `app.css` | ✅ 完成 | 全局样式、亮/暗 CSS 变量、utility class |
| `vite.config.ts` | ✅ 完成 | Vite + Vue + PWA 配置 |
| `index.html` | ✅ 完成 | PWA meta、移动端 viewport |
| `.gitignore` | ✅ 完成 | node_modules/ dist/ .vite/ |
| `package.json` | ✅ 完成 | 依赖：Vue3 / Pinia / Chart.js / vite-plugin-pwa |
| `README.md` | ✅ 完成 | 项目说明、快速开始、结构一览 |

## 需求对照（FITPACER.md）

| # | 需求 | 状态 | 备注 |
|---|------|------|------|
| 1 | 4 周训练计划生成（力量/有氧/休息） | ✅ | 力量周一四，有氧周三六，周六长有氧 |
| 2 | 计划跳过调整弹窗 | ✅ | 保持原计划 / 重新对齐（仅力量日） |
| 3 | 周视图导航（上下周） | ✅ | PlanView goToWeek |
| 4 | 标记完成 / 跳过 / 撤销 | ✅ | |
| 5 | 训练记录表单（动作/组数/次数/RPE/备注） | ✅ | 预设动作库 + 自定义动作 |
| 6 | 训练记录日期导航 | ✅ | 前后翻日期 |
| 7 | 周报（完成率/总时长/分类时长） | ✅ | Dashboard 卡片 |
| 8 | 体重/腰围趋势折线图 | ✅ | Chart.js |
| 9 | 身体数据录入（体重/腰围/睡眠/酸痛） | ✅ | 弹窗表单 |
| 10 | 训练日多选设置 | ✅ | Settings |
| 11 | 睡眠提醒时间设置 | ✅ | 已实现时间选择器，到点提示未实现 |
| 12 | 亮/暗主题切换 | ✅ | 跟随系统偏好 |
| 13 | .ics 日历导出（含 VALARM 15min） | ✅ | 三种导出策略 |
| 14 | PWA 离线支持 | ✅ | vite-plugin-pwa + Workbox |
| 15 | 训练偏好扩展 | ⏳ 预留 | 当前固定混合模式，后续可扩展 |

## 已知问题 / 待办

- 睡眠提醒设置了时间，但未实现到点页面提示
- 训练偏好当前固定"力量+有氧混合"，UI 层面可扩展其他模式
- RecordView 未从当天 plan 自动推断训练类型（当前手动选择）

## 变更记录

| 日期 | 变更 | 会话 |
|------|------|------|
| 2026-05-05 | 初始创建，所有功能已实现 | #1 |
| 2026-05-05 | 创建 README.md、PROGRESS.md，完善 RULES.md（进度跟踪+经验教训内化） | #1 |
