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

### goal/ — 目标追踪 ✅ 新增

| 文件 | 状态 | 说明 |
|------|------|------|
| `useGoal.ts` | ✅ 完成 | Pinia store：BMI 计算、减重进度百分比、剩余体重、目标达成检测 |
| `storage.ts` | ✅ 完成 | GoalConfig 类型（身高/目标体重/起始体重）+ localStorage 读写 |

### plan/ — 训练计划 ✅ 已完成

| 文件 | 状态 | 说明 |
|------|------|------|
| `planEngine.ts` | ✅ 完成 | 纯函数：generatePlan / getAdjustOptions / findNextSlot / 周工具 |
| | ✅ 更新 | CARDIO_DAYS [3,6]→[2,5,6]，有氧 3 次/周达 150min |
| `usePlan.ts` | ✅ 完成 | Pinia store：计划 CRUD、跳过调整、周导航、ICS 导出 |
| `PlanView.vue` | ✅ 完成 | 周视图、力量训练动作 todolist（展开/收起+进度条+跨周忽视高亮）、有氧完成弹窗（运动类型/时长/心率）、完成/跳过/撤销、调整弹窗、底部 padding |
| `storage.ts` | ✅ 完成 | DayPlan（+ExerciseItem/CardioRecord）/ PlanConfig 类型 + localStorage 读写 + 旧版迁移 |
| `ics.ts` | ✅ 完成 | .ics 生成 + 三种导出策略（share / window.open / 下载） |

### record/ — 训练记录 ✅ 已完成

| 文件 | 状态 | 说明 |
|------|------|------|
| `useRecord.ts` | ✅ 完成 | Pinia store：CRUD + 日期选择 |
| `RecordView.vue` | ✅ 完成 | 日期导航、预设动作库（按计划自动过滤力量/有氧）、自定义动作、组数/次数/RPE 滑块、备注 |
| `storage.ts` | ✅ 完成 | TrainingRecord 类型 + localStorage 读写 |

### dashboard/ — 数据看板 ✅ 已完成

| 文件 | 状态 | 说明 |
|------|------|------|
| `useDashboard.ts` | ✅ 完成 | Pinia store：周报统计、身体数据 CRUD、Chart.js 数据格式 |
| `DashboardView.vue` | ✅ 完成 | 周报卡片、🎯 目标进度卡片、BMI 显示、体重/腰围趋势折线图、身体数据录入弹窗（含睡眠时长）、历史列表 |
| `storage.ts` | ✅ 完成 | BodyData 类型 + sleepHours 字段 + localStorage 读写 |

### settings/ — 设置 ✅ 已完成

| 文件 | 状态 | 说明 |
|------|------|------|
| `useSettings.ts` | ✅ 完成 | Pinia store：训练日切换、睡眠时间、自动持久化 |
| `SettingsView.vue` | ✅ 完成 | 🎯 减重目标设定（身高/起始体重/目标体重）、训练日多选 toggle、睡眠时间选择、主题切换、应用设置并重生成计划 |
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
| `app.css` | ✅ 完成 | v3 Keep 设计系统：纯黑暗色背景、#00B365 主色、SF Pro 字体、Apple 风格卡片阴影层级 |
| `vite.config.ts` | ✅ 完成 | Vite + Vue + PWA 配置 |
| `index.html` | ✅ 完成 | PWA meta、移动端 viewport |
| `.gitignore` | ✅ 完成 | node_modules/ dist/ .vite/ |
| `package.json` | ✅ 完成 | 依赖：Vue3 / Pinia / Chart.js / vite-plugin-pwa |
| `README.md` | ✅ 完成 | 项目说明、快速开始、结构一览 |

## 需求对照（FITPACER.md）

| # | 需求 | 状态 | 备注 |
|---|------|------|------|
| 1 | 4 周训练计划生成（力量/有氧/休息） | ✅ | 力量周一四，有氧周二五+周六长有氧，共 150min/周 |
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
| 16 | 🎯 减重目标设定（身高/起始/目标体重） | ✅ | Settings 输入，Dashboard 显示进度 |
| 17 | BMI 计算与分类 | ✅ | 看板顶部显示 BMI 值及偏瘦/正常/偏胖/肥胖判定 |
| 18 | 进度条显示减重百分比 | ✅ | Dashboard 进度卡片 + 进度条 |
| 19 | 睡眠时长记录 | ✅ | BodyData 增加 sleepHours 字段，表单 stepper 输入 |

## 已知问题 / 待办

- 睡眠提醒设置了时间，但未实现到点页面提示
- 训练偏好当前固定"力量+有氧混合"，UI 层面可扩展其他模式
## 变更记录

| 日期 | 变更 | 会话 |
|------|------|------|
| 2026-05-05 | 初始创建，所有功能已实现 | #1 |
| 2026-05-05 | 创建 README.md、PROGRESS.md，完善 RULES.md（进度跟踪+经验教训内化） | #1 |
| 2026-05-05 | 训练计划调整为 3 次有氧（周二/周五/周六），总时长 150min/周；新增 goal/ 模块（目标设定+BMI+进度条）；BodyData 增加 sleepHours；Settings 增加身高/目标体重设定；Dashboard 增加目标进度卡片 | #1 |
| 2026-05-05 | **动画与样式大升级**：新增 16 个 CSS 动画关键帧（slideInLeft/Right, scaleInBounce, bounceIn, shimmer, float, ripple, overlayIn, listItemIn 等）；玻璃态模态框（backdrop-filter）；按钮涟漪动效；卡片按压缩放；标签切换左右滑入过渡；底部导航弹跳效果；仪表盘统计数字滚动动画（requestAnimationFrame）；图表渐入显示；睡眠步进器从 0.25h 精确至 0.1h（6 分钟），显示格式改为"X小时Y分钟" | #2 |
| 2026-05-05 | **选择器 + Keep 风格升级**：RecordView 接入 usePlan，根据当天计划自动推断训练类型并只显示对应动作组（力量日显示力量动作，有氧日显示有氧动作，休息日可自由记录）；设计系统全面参考 Keep：主色修订为 #00B365（更鲜亮的 Keep 绿）、暗色主题背景改为纯黑 (#000)、卡片去除边框改用柔和阴影、圆角半径阶梯增大、字体使用 SF Pro 原生栈、底部导航简化去除顶部指示条、排版层级重新校准 | #3 |
| 2026-05-05 | **标题固定 + 睡眠选择器修复**：所有视图改为标题固定+内容区独立滚动（flex column 布局）；睡眠选择器从10分钟一档改为5分钟一档（0-55）；修复 scroll 事件中间状态导致值不准（改为 scrollend 事件）；修正 openBodyForm 的 snap 逻辑（Math.round(m/5)*5） | #3 |
| 2026-05-05 | **BMI 颜色区分 + 说明弹窗**：BMI 数值按区间显示不同颜色（偏瘦蓝/正常绿/偏胖橙/肥胖红）；BMI 卡片可点击，弹出说明弹窗展示 BMI 计算公式和各区间标准；背景色跟随分级动态变化 | #3 |
| 2026-05-05 | **week-nav 固定 + 全局间距收紧**：PlanView 的 week-nav 移入固定头部区域不再跟随滚动；所有视图 padding 收紧（24/20/100→16/16/88）；标题字号缩小（28→24）；section 间距缩减（32→24）；卡片内边距、gap 等全面收窄 | #3 |
| 2026-05-05 | **计划面板细化**：力量训练动作拆分为 todolist（展开/收起+进度条+跨周忽视高亮⚠️）；有氧训练完成弹窗（运动类型/时长/心率）；DayPlan 新增 exercises/CardioRecord 字段；getNeglectedExercises 跨周追踪；底部 100px padding | #3 |
